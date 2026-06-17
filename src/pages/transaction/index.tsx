import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { usePartStore } from '@/store/usePartStore';
import { formatDateTime } from '@/utils/status';
import type { TransactionType } from '@/types/part';
import styles from './index.module.scss';

type TabType = 'all' | TransactionType;

const TransactionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const { parts, inboundRecords, outboundRecords, returnRecords } = usePartStore();

  const stats = useMemo(() => {
    const available = parts.filter((p) => p.status === 'available').length;
    const pending = parts.filter((p) => p.status === 'pending').length;
    const unavailable = parts.filter((p) => p.status === 'unavailable').length;
    return { available, pending, unavailable, total: parts.length };
  }, [parts]);

  const allRecords = useMemo(() => {
    const records = [
      ...inboundRecords.map((r) => ({ ...r, type: 'inbound' as const })),
      ...outboundRecords.map((r) => ({ ...r, type: 'outbound' as const })),
      ...returnRecords.map((r) => ({ ...r, type: 'return' as const }))
    ];
    records.sort((a, b) => (a.createTime < b.createTime ? 1 : -1));
    return records;
  }, [inboundRecords, outboundRecords, returnRecords]);

  const filteredRecords = useMemo(() => {
    if (activeTab === 'all') return allRecords;
    return allRecords.filter((r) => r.type === activeTab);
  }, [allRecords, activeTab]);

  const handleAction = (action: TransactionType) => {
    const routes = {
      inbound: '/pages/inbound/index',
      outbound: '/pages/outbound/index',
      return: '/pages/return/index'
    };
    Taro.navigateTo({ url: routes[action] });
  };

  const getTypeLabel = (type: TransactionType) => {
    const labels = { inbound: '入库', outbound: '出库', return: '退库' };
    return labels[type];
  };

  return (
    <ScrollView className={styles.container} scrollY>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>收发作业</Text>
        <Text className={styles.headerSubtitle}>航材寿命件收发管理</Text>
        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.available}</Text>
            <Text className={styles.statLabel}>可用</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.pending}</Text>
            <Text className={styles.statLabel}>待判定</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.unavailable}</Text>
            <Text className={styles.statLabel}>不可发</Text>
          </View>
        </View>
      </View>

      <View className={styles.actionSection}>
        <View className={styles.actionGrid}>
          <View className={styles.actionCard} onClick={() => handleAction('inbound')}>
            <View className={classnames(styles.actionIcon, styles.inbound)}>
              <Text>↓</Text>
            </View>
            <Text className={styles.actionTitle}>入库</Text>
            <Text className={styles.actionDesc}>扫码录入寿命信息</Text>
          </View>
          <View className={styles.actionCard} onClick={() => handleAction('outbound')}>
            <View className={classnames(styles.actionIcon, styles.outbound)}>
              <Text>↑</Text>
            </View>
            <Text className={styles.actionTitle}>出库</Text>
            <Text className={styles.actionDesc}>寿命校验发料确认</Text>
          </View>
          <View className={styles.actionCard} onClick={() => handleAction('return')}>
            <View className={classnames(styles.actionIcon, styles.returnPart)}>
              <Text>↺</Text>
            </View>
            <Text className={styles.actionTitle}>退库</Text>
            <Text className={styles.actionDesc}>拆下原因分类登记</Text>
          </View>
        </View>
      </View>

      <View className={styles.recordsSection}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>收发记录</Text>
          <Text className={styles.sectionMore}>共 {filteredRecords.length} 条</Text>
        </View>

        <View className={styles.tabRow}>
          {(['all', 'inbound', 'outbound', 'return'] as TabType[]).map((tab) => (
            <View
              key={tab}
              className={classnames(styles.tabItem, activeTab === tab && styles.active)}
              onClick={() => setActiveTab(tab)}
            >
              <Text>
                {tab === 'all' ? '全部' : getTypeLabel(tab)}
              </Text>
            </View>
          ))}
        </View>

        <View className={styles.recordList}>
          {filteredRecords.length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>📋</Text>
              <Text className={styles.emptyText}>暂无记录</Text>
            </View>
          ) : (
            filteredRecords.slice(0, 10).map((record) => (
              <View key={record.id} className={styles.recordItem}>
                <View className={styles.recordHeader}>
                  <View
                    className={classnames(
                      styles.recordTypeTag,
                      record.type === 'inbound' && styles.typeInbound,
                      record.type === 'outbound' && styles.typeOutbound,
                      record.type === 'return' && styles.typeReturn
                    )}
                  >
                    <Text>{getTypeLabel(record.type)}</Text>
                  </View>
                  <Text className={styles.recordTime}>{formatDateTime(record.createTime)}</Text>
                </View>
                <Text className={styles.recordPartInfo}>
                  {record.partName || record.partNumber} · {record.serialNumber}
                </Text>
                <Text className={styles.recordMeta}>
                  {record.type === 'inbound' && `操作员: ${record.operator}`}
                  {record.type === 'outbound' &&
                    `领料: ${record.receiver} · ${record.workOrder || record.aircraftReg || ''}`}
                  {record.type === 'return' && `原因: ${record.reason}`}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default TransactionPage;
