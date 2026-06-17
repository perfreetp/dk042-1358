import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { usePartStore } from '@/store/usePartStore';
import PartCard from '@/components/PartCard';
import { matchesSearch } from '@/utils/status';
import type { PartStatus } from '@/types/part';
import { STATUS_LABEL } from '@/types/part';
import styles from './index.module.scss';

type FilterType = 'all' | PartStatus;

const QueryPage: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { parts } = usePartStore();

  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const matchesKeyword = matchesSearch(part, keyword);
      const matchesFilter = activeFilter === 'all' ? true : part.status === activeFilter;
      return matchesKeyword && matchesFilter;
    });
  }, [parts, keyword, activeFilter]);

  const handleClear = () => {
    setKeyword('');
  };

  const handlePartClick = (partId: string) => {
    const part = parts.find((p) => p.id === partId);
    if (part) {
      Taro.showModal({
        title: part.partName || part.partNumber,
        content: `件号: ${part.partNumber}\n序号: ${part.serialNumber}\n剩余寿命: ${part.remainingLife}\n状态: ${STATUS_LABEL[part.status]}\n${part.statusRemark || ''}`,
        showCancel: false,
        confirmText: '确定'
      });
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'available', label: '可用' },
    { key: 'pending', label: '待判定' },
    { key: 'unavailable', label: '不可发' }
  ];

  return (
    <View className={styles.container}>
      <View className={styles.searchBar}>
        <View className={styles.searchInputWrapper}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            value={keyword}
            placeholder="输入件号、序号、批次号搜索"
            placeholderClass={styles.placeholder}
            onInput={(e) => setKeyword(e.detail.value)}
            confirmType="search"
          />
          {keyword && (
            <View className={styles.clearBtn} onClick={handleClear}>
              <Text>✕</Text>
            </View>
          )}
        </View>
        <View className={styles.filterRow}>
          {filters.map((f) => (
            <View
              key={f.key}
              className={classnames(styles.filterTag, activeFilter === f.key && styles.active)}
              onClick={() => setActiveFilter(f.key)}
            >
              <Text>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView className={styles.resultsSection} scrollY>
        <View className={styles.resultsHeader}>
          <Text className={styles.resultsTitle}>查询结果</Text>
          <Text className={styles.resultsCount}>{filteredParts.length} 件</Text>
        </View>

        {filteredParts.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📦</Text>
            <Text className={styles.emptyTitle}>
              {keyword ? '未找到匹配的航材' : '暂无库存数据'}
            </Text>
            <Text className={styles.emptyDesc}>
              {keyword ? '请检查关键词或调整筛选条件' : '入库后可在此查询寿命件库存'}
            </Text>
          </View>
        ) : (
          <View className={styles.partList}>
            {filteredParts.map((part) => (
              <PartCard
                key={part.id}
                part={part}
                onClick={() => handlePartClick(part.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default QueryPage;
