import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { usePartStore, TimelineEvent } from '@/store/usePartStore';
import StatusBadge from '@/components/StatusBadge';
import { formatDate, formatDateTime } from '@/utils/status';
import { LIFE_UNIT_LABEL, RETURN_REASON_LABEL } from '@/types/part';
import styles from './index.module.scss';

type FilterKind = 'all' | TimelineEvent['kind'];

const KIND_LABELS: Record<Exclude<FilterKind, 'all'>, string> = {
  create: '建档',
  inbound: '入库',
  outbound: '出库',
  return: '退库',
  exception: '异常',
  stocktake: '盘点'
};

const KIND_ICONS: Record<Exclude<FilterKind, 'all'>, string> = {
  create: '＋',
  inbound: '↓',
  outbound: '↑',
  return: '↺',
  exception: '!',
  stocktake: '☐'
};

const PartDetailPage: React.FC = () => {
  const router = useRouter();
  const partId = router.params.partId as string | undefined;
  const partNumberFromQuery = router.params.partNumber as string | undefined;
  const serialNumberFromQuery = router.params.serialNumber as string | undefined;

  const [activeKind, setActiveKind] = useState<FilterKind>('all');

  const { parts, getTimelineForPart } = usePartStore();

  const part = useMemo(() => {
    if (partId) return parts.find((p) => p.id === partId);
    if (partNumberFromQuery || serialNumberFromQuery) {
      return parts.find(
        (p) =>
          (partNumberFromQuery ? p.partNumber === partNumberFromQuery : true) &&
          (serialNumberFromQuery ? p.serialNumber === serialNumberFromQuery : true)
      );
    }
    return undefined;
  }, [parts, partId, partNumberFromQuery, serialNumberFromQuery]);

  const timeline = useMemo(() => {
    return getTimelineForPart({
      partId,
      partNumber: partNumberFromQuery,
      serialNumber: serialNumberFromQuery
    });
  }, [getTimelineForPart, partId, partNumberFromQuery, serialNumberFromQuery]);

  const filteredTimeline = useMemo(() => {
    if (activeKind === 'all') return timeline;
    return timeline.filter((e) => e.kind === activeKind);
  }, [timeline, activeKind]);

  const kindCounts = useMemo(() => {
    const counts: Partial<Record<Exclude<FilterKind, 'all'>, number>> = {};
    timeline.forEach((e) => {
      counts[e.kind as Exclude<FilterKind, 'all'>] =
        (counts[e.kind as Exclude<FilterKind, 'all'>] || 0) + 1;
    });
    return counts;
  }, [timeline]);

  const tabs: { key: FilterKind; label: string; count?: number }[] = [
    { key: 'all', label: '全部', count: timeline.length },
    { key: 'inbound', label: KIND_LABELS.inbound, count: kindCounts.inbound },
    { key: 'outbound', label: KIND_LABELS.outbound, count: kindCounts.outbound },
    { key: 'return', label: KIND_LABELS.return, count: kindCounts.return },
    { key: 'exception', label: KIND_LABELS.exception, count: kindCounts.exception },
    { key: 'stocktake', label: KIND_LABELS.stocktake, count: kindCounts.stocktake }
  ];

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.breadcrumb}>航材履历</Text>
        <Text className={styles.headerTitle}>
          {part?.partName || partNumberFromQuery || '航材详情'}
        </Text>
        <Text className={styles.headerSub}>
          {part?.partNumber || partNumberFromQuery || '件号未知'} ·{' '}
          {part?.serialNumber || serialNumberFromQuery || '序号未知'}
        </Text>
      </View>

      {part && (
        <View className={styles.infoCard}>
          <View className={styles.statusRow}>
            <Text className={styles.statusLeft}>当前在库状态</Text>
            <StatusBadge status={part.status} size="md" />
          </View>
          <View className={styles.infoGrid}>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>件号</Text>
              <Text className={styles.infoValue}>{part.partNumber}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>序号</Text>
              <Text className={styles.infoValue}>{part.serialNumber}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>批次号</Text>
              <Text className={styles.infoValue}>{part.batchNumber}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>剩余寿命</Text>
              <Text className={classnames(styles.infoValue, styles.life)}>
                {part.remainingLife} {LIFE_UNIT_LABEL[part.lifeUnit]}
              </Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>证书号</Text>
              <Text className={styles.infoValue}>{part.certificateNumber || '-'}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>封存到期</Text>
              <Text className={styles.infoValue}>{formatDate(part.storageExpiryDate)}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>库位</Text>
              <Text className={styles.infoValue}>{part.location || '-'}</Text>
            </View>
            <View className={styles.infoItem}>
              <Text className={styles.infoLabel}>建档时间</Text>
              <Text className={styles.infoValue}>{formatDate(part.createTime)}</Text>
            </View>
          </View>
          {part.statusRemark && (
            <View style={{ marginTop: 16 }}>
              <Text className={styles.infoLabel}>状态说明</Text>
              <Text
                className={styles.infoValue}
                style={{ marginTop: 4, color: '#F59E0B', fontWeight: 500 }}
              >
                ⚠ {part.statusRemark}
              </Text>
            </View>
          )}
        </View>
      )}

      <View className={styles.sectionTitle}>
        <View className={styles.sectionLeft}>
          <View className={styles.sectionIcon}>
            <Text>≡</Text>
          </View>
          <Text className={styles.sectionName}>流转履历</Text>
        </View>
        <Text className={styles.sectionCount}>共 {timeline.length} 条</Text>
      </View>

      <ScrollView className={styles.tabs} scrollX showScrollbar={false}>
        {tabs.map((t) => (
          <View
            key={t.key}
            className={classnames(styles.tab, activeKind === t.key && styles.active)}
            onClick={() => setActiveKind(t.key)}
          >
            <Text>
              {t.label}
              {t.count !== undefined ? ` ${t.count}` : ''}
            </Text>
          </View>
        ))}
      </ScrollView>

      {filteredTimeline.length === 0 ? (
        <View className={styles.emptyTimeline}>
          <Text className={styles.emptyIcon}>🕘</Text>
          <Text className={styles.emptyTitle}>暂无相关记录</Text>
          <Text className={styles.emptyDesc}>
            该件的操作记录会按时间线展示在此处
          </Text>
        </View>
      ) : (
        <View className={styles.timeline}>
          {filteredTimeline.map((evt, idx) => (
            <View key={evt.id} className={styles.tlItem}>
              <View className={styles.tlDots}>
                <View className={classnames(styles.tlDot, styles[evt.kind])} />
                {idx < filteredTimeline.length - 1 && <View className={styles.tlLine} />}
              </View>
              <View className={styles.tlContent}>
                <View className={styles.tlTopRow}>
                  <Text className={styles.tlTitle}>
                    {KIND_ICONS[evt.kind]} {evt.title}
                  </Text>
                  <View
                    className={classnames(
                      styles.tlBadge,
                      styles[`kind-${evt.kind}`]
                    )}
                  >
                    <Text>{KIND_LABELS[evt.kind]}</Text>
                  </View>
                </View>
                <Text className={styles.tlTime}>{formatDateTime(evt.time)}</Text>
                {evt.desc && (
                  <Text className={styles.tlDesc}>{evt.desc}</Text>
                )}
                <View className={styles.tlMeta}>
                  {'operator' in evt && evt.operator && (
                    <View className={styles.tlMetaItem}>
                      <Text>经手人</Text>
                      <Text className={styles.tlMetaValue}>{evt.operator}</Text>
                    </View>
                  )}
                  {'level' in evt && (
                    <View className={styles.tlMetaItem}>
                      <Text>告警</Text>
                      <Text
                        className={styles.tlMetaValue}
                        style={{
                          color:
                            evt.level === 'high'
                              ? '#DC2626'
                              : evt.level === 'medium'
                                ? '#F59E0B'
                                : '#1E40AF'
                        }}
                      >
                        {evt.level === 'high'
                          ? '高'
                          : evt.level === 'medium'
                            ? '中'
                            : '低'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default PartDetailPage;
