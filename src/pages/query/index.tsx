import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  const scrollRef = useRef<any>(null);
  const {
    parts,
    highlightedPartId,
    queryHighlightedOnly,
    setHighlightedPartId,
    clearHighlightedPartId,
    stocktakeRecords
  } = usePartStore();

  const highlightedPart = useMemo(() => {
    if (!highlightedPartId) return null;
    return parts.find((p) => p.id === highlightedPartId) || null;
  }, [parts, highlightedPartId]);

  const filteredParts = useMemo(() => {
    const inStock = parts.filter((p) => p.status !== 'outbound');
    if (queryHighlightedOnly && highlightedPart) {
      return inStock.filter((p) => p.id === highlightedPart.id);
    }
    return inStock.filter((part) => {
      const matchesKeyword = matchesSearch(part, keyword);
      const matchesFilter = activeFilter === 'all' ? true : part.status === activeFilter;
      return matchesKeyword && matchesFilter;
    });
  }, [parts, keyword, activeFilter, queryHighlightedOnly, highlightedPart]);

  useEffect(() => {
    if (highlightedPartId) {
      setTimeout(() => {
        const el = Taro.createSelectorQuery().select('#part-card-' + highlightedPartId);
        el &&
          el.boundingClientRect().exec((res: any[]) => {
            if (res && res[0]) {
              const top = res[0].top - 160;
              Taro.pageScrollTo &&
                Taro.pageScrollTo({ scrollTop: top, duration: 400 });
            }
          });
      }, 300);
    }
  }, [highlightedPartId]);

  const handleClear = () => {
    setKeyword('');
  };

  const handlePartClick = (partId: string) => {
    Taro.navigateTo({
      url: `/pages/part-detail/index?partId=${partId}`
    });
  };

  const handleGoStocktake = () => {
    Taro.navigateTo({ url: '/pages/stocktake/index' });
  };

  const handleGoHistory = () => {
    Taro.navigateTo({ url: '/pages/stocktake/index?tab=history' });
  };

  const handleLocateHighlighted = () => {
    if (!highlightedPartId) return;
    const el = Taro.createSelectorQuery().select('#part-card-' + highlightedPartId);
    el &&
      el.boundingClientRect().exec((res: any[]) => {
        if (res && res[0]) {
          const top = res[0].top - 160;
          Taro.pageScrollTo && Taro.pageScrollTo({ scrollTop: top, duration: 400 });
        } else {
          Taro.showToast({ title: '请先切换到全部tab', icon: 'none' });
        }
      });
  };

  const inProgressStocktake = useMemo(
    () => stocktakeRecords.find((r) => r.status === 'in_progress'),
    [stocktakeRecords]
  );

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'available', label: '可用' },
    { key: 'pending', label: '待判定' },
    { key: 'unavailable', label: '不可发' }
  ];

  return (
    <View className={styles.container}>
      <View className={styles.searchBar}>
        <View
          className={classnames(
            styles.searchInputWrapper,
            queryHighlightedOnly && styles.disabled
          )}
        >
          <Text className={styles.searchIcon}>
            {queryHighlightedOnly ? '✦' : '🔍'}
          </Text>
          <Input
            className={styles.searchInput}
            value={queryHighlightedOnly ? '' : keyword}
            placeholder={queryHighlightedOnly ? '已定位退库件，点击关闭恢复搜索' : '输入件号、序号、批次号搜索'}
            placeholderClass={styles.placeholder}
            disabled={queryHighlightedOnly}
            onInput={(e) => !queryHighlightedOnly && setKeyword(e.detail.value)}
            confirmType="search"
          />
          {!queryHighlightedOnly && keyword && (
            <View className={styles.clearBtn} onClick={handleClear}>
              <Text>✕</Text>
            </View>
          )}
        </View>
        {!queryHighlightedOnly && (
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
        )}
      </View>

      {!queryHighlightedOnly && (
        <View className={styles.toolsRow}>
          <View className={styles.toolCard} onClick={handleGoStocktake}>
            <View className={styles.toolIcon}>
              <Text>📋</Text>
            </View>
            <View className={styles.toolText}>
              <Text className={styles.toolTitle}>库存盘点</Text>
              <Text className={styles.toolDesc}>
                {inProgressStocktake
                  ? `进行中：${inProgressStocktake.scannedCount}/${inProgressStocktake.totalCount}`
                  : '扫码逐件核对，生成差异报告'}
              </Text>
            </View>
          </View>
          <View className={classnames(styles.toolCard, styles.secondary)} onClick={handleGoHistory}>
            <View className={styles.toolIcon}>
              <Text>📒</Text>
            </View>
            <View className={styles.toolText}>
              <Text className={styles.toolTitle}>盘点历史</Text>
              <Text className={styles.toolDesc}>
                {stocktakeRecords.length} 次记录
              </Text>
            </View>
          </View>
        </View>
      )}

      {highlightedPart && (
        <View className={styles.highlightBanner} onClick={handleLocateHighlighted}>
          <View className={styles.highlightText}>
            <Text className={styles.highlightTitle}>
              ✦ 退库成功 · 已定位到刚退回的航材
            </Text>
            <Text className={styles.highlightDesc}>
              {highlightedPart.partName || highlightedPart.partNumber} · {highlightedPart.serialNumber}
              {' '}· 状态：{STATUS_LABEL[highlightedPart.status]}
              {highlightedPart.status === 'pending' && highlightedPart.statusRemark
                ? ` · ${highlightedPart.statusRemark}`
                : ''}
            </Text>
          </View>
          <View
            className={styles.highlightClear}
            onClick={(e) => {
              e.stopPropagation();
              clearHighlightedPartId();
              Taro.showToast({ title: '已恢复正常查询', icon: 'none' });
            }}
          >
            <Text>关闭</Text>
          </View>
        </View>
      )}

      <ScrollView ref={scrollRef} className={styles.resultsSection} scrollY>
        <View className={styles.resultsHeader}>
          <Text className={styles.resultsTitle}>在库航材</Text>
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
              <View key={part.id} id={`part-card-${part.id}`}>
                <PartCard
                  part={part}
                  onClick={() => handlePartClick(part.id)}
                  highlighted={part.id === highlightedPartId}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default QueryPage;
