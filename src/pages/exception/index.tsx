import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { usePartStore } from '@/store/usePartStore';
import { formatDateTime } from '@/utils/status';
import type { ExceptionRecord } from '@/types/part';
import styles from './index.module.scss';

type TabType = 'pending' | 'handled';

const ExceptionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const { exceptionRecords, handleException } = usePartStore();

  const summary = useMemo(() => {
    const pending = exceptionRecords.filter((e) => !e.handled);
    const handled = exceptionRecords.filter((e) => e.handled);
    const high = pending.filter((e) => e.level === 'high');
    return {
      pending: pending.length,
      handled: handled.length,
      high: high.length,
      total: exceptionRecords.length
    };
  }, [exceptionRecords]);

  const filteredRecords = useMemo(() => {
    const list = exceptionRecords.filter((r) =>
      activeTab === 'pending' ? !r.handled : r.handled
    );
    list.sort((a, b) => (a.createTime < b.createTime ? 1 : -1));
    return list;
  }, [exceptionRecords, activeTab]);

  const getLevelLabel = (level: ExceptionRecord['level']) => {
    const labels = { high: '高危', medium: '中危', low: '低危' };
    return labels[level];
  };

  const getTypeLabel = (type: ExceptionRecord['type']) => {
    const labels = {
      life_low: '寿命偏低',
      status_abnormal: '状态异常',
      expiry_near: '临期告警'
    };
    return labels[type];
  };

  const handleProcess = (record: ExceptionRecord) => {
    Taro.showModal({
      title: '处理异常',
      content: `确认处理该异常？\n\n航材: ${record.partNumber}\n描述: ${record.description}`,
      confirmText: '确认处理',
      success: (res) => {
        if (res.confirm) {
          handleException(record.id, '当前收发员', '已确认处理完成');
          Taro.showToast({ title: '处理成功', icon: 'success' });
        }
      }
    });
  };

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>异常管理</Text>
        <Text className={styles.headerSubtitle}>寿命件异常告警与处理</Text>
        <View className={styles.summaryRow}>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{summary.pending}</Text>
            <Text className={styles.summaryLabel}>待处理</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{summary.high}</Text>
            <Text className={styles.summaryLabel}>高危</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{summary.handled}</Text>
            <Text className={styles.summaryLabel}>已处理</Text>
          </View>
        </View>
      </View>

      <ScrollView className={styles.content} scrollY>
        <View className={styles.tabRow}>
          <View
            className={classnames(styles.tabItem, activeTab === 'pending' && styles.active)}
            onClick={() => setActiveTab('pending')}
          >
            <Text>待处理 {summary.pending > 0 && `(${summary.pending})`}</Text>
          </View>
          <View
            className={classnames(styles.tabItem, activeTab === 'handled' && styles.active)}
            onClick={() => setActiveTab('handled')}
          >
            <Text>已处理 ({summary.handled})</Text>
          </View>
        </View>

        {filteredRecords.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>✅</Text>
            <Text className={styles.emptyTitle}>
              {activeTab === 'pending' ? '暂无待处理异常' : '暂无处理记录'}
            </Text>
            <Text className={styles.emptyDesc}>
              {activeTab === 'pending' ? '所有异常均已处理完成' : '处理后的异常将在此处展示'}
            </Text>
          </View>
        ) : (
          <View className={styles.exceptionList}>
            {filteredRecords.map((record) => (
              <View key={record.id} className={styles.exceptionItem}>
                <View className={styles.exceptionHeader}>
                  <View
                    className={classnames(
                      styles.levelBadge,
                      record.level === 'high' && styles.levelHigh,
                      record.level === 'medium' && styles.levelMedium,
                      record.level === 'low' && styles.levelLow
                    )}
                  >
                    <Text>{getLevelLabel(record.level)}</Text>
                  </View>
                  {record.handled && (
                    <View className={styles.handledBadge}>
                      <Text>已处理</Text>
                    </View>
                  )}
                </View>
                <Text className={styles.exceptionPart}>
                  {record.partName || record.partNumber} · {getTypeLabel(record.type)}
                </Text>
                <Text className={styles.exceptionDesc}>{record.description}</Text>
                <View className={styles.exceptionMeta}>
                  <Text className={styles.exceptionTime}>
                    {formatDateTime(record.createTime)}
                  </Text>
                  {!record.handled && (
                    <View className={styles.handleBtn} onClick={() => handleProcess(record)}>
                      <Text>立即处理</Text>
                    </View>
                  )}
                </View>
                {record.handled && record.handler && (
                  <View className={styles.handledInfo}>
                    <Text className={styles.handledText}>
                      处理人: {record.handler} · {record.handleRemark || '已确认'}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ExceptionPage;
