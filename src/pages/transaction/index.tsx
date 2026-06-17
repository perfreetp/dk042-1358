import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { usePartStore } from '@/store/usePartStore';
import { formatDateTime } from '@/utils/status';
import type { TransactionType, InboundRecord, OutboundRecord, ReturnRecord } from '@/types/part';
import { RETURN_REASON_LABEL } from '@/types/part';
import styles from './index.module.scss';

type TabType = 'all' | TransactionType;

type AnyRecord =
  | (InboundRecord & { type: 'inbound' })
  | (OutboundRecord & { type: 'outbound' })
  | (ReturnRecord & { type: 'return' });

interface FilterState {
  keyword: string;
  partNumber: string;
  serialNumber: string;
  workOrder: string;
  dateFrom: string;
  dateTo: string;
  showAdvanced: boolean;
}

const emptyFilter: FilterState = {
  keyword: '',
  partNumber: '',
  serialNumber: '',
  workOrder: '',
  dateFrom: '',
  dateTo: '',
  showAdvanced: false
};

const TransactionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [filter, setFilter] = useState<FilterState>(emptyFilter);
  const [draft, setDraft] = useState<FilterState>(emptyFilter);
  const [applied, setApplied] = useState<FilterState>(emptyFilter);

  const { parts, inboundRecords, outboundRecords, returnRecords } = usePartStore();

  const stats = useMemo(() => {
    const available = parts.filter((p) => p.status === 'available').length;
    const pending = parts.filter((p) => p.status === 'pending').length;
    const unavailable = parts.filter((p) => p.status === 'unavailable').length;
    return { available, pending, unavailable, total: parts.length };
  }, [parts]);

  const allRecords = useMemo<AnyRecord[]>(() => {
    const records = [
      ...inboundRecords.map((r) => ({ ...r, type: 'inbound' as const })),
      ...outboundRecords.map((r) => ({ ...r, type: 'outbound' as const })),
      ...returnRecords.map((r) => ({ ...r, type: 'return' as const }))
    ];
    records.sort((a, b) => (a.createTime < b.createTime ? 1 : -1));
    return records;
  }, [inboundRecords, outboundRecords, returnRecords]);

  const filteredRecords = useMemo(() => {
    let list = allRecords;

    if (activeTab !== 'all') {
      list = list.filter((r) => r.type === activeTab);
    }

    const kw = applied.keyword.trim();
    if (kw) {
      const lower = kw.toLowerCase();
      list = list.filter((r) => {
        return (
          (r.partNumber || '').toLowerCase().includes(lower) ||
          (r.serialNumber || '').toLowerCase().includes(lower) ||
          (r.partName || '').toLowerCase().includes(lower) ||
          ('workOrder' in r && r.workOrder && r.workOrder.toLowerCase().includes(lower)) ||
          ('aircraftReg' in r && r.aircraftReg && r.aircraftReg.toLowerCase().includes(lower)) ||
          ('receiver' in r && r.receiver && r.receiver.toLowerCase().includes(lower))
        );
      });
    }

    if (applied.partNumber) {
      const lower = applied.partNumber.toLowerCase();
      list = list.filter((r) => (r.partNumber || '').toLowerCase().includes(lower));
    }
    if (applied.serialNumber) {
      const lower = applied.serialNumber.toLowerCase();
      list = list.filter((r) => (r.serialNumber || '').toLowerCase().includes(lower));
    }
    if (applied.workOrder) {
      const lower = applied.workOrder.toLowerCase();
      list = list.filter(
        (r) =>
          ('workOrder' in r && r.workOrder && r.workOrder.toLowerCase().includes(lower)) ||
          ('aircraftReg' in r && r.aircraftReg && r.aircraftReg.toLowerCase().includes(lower))
      );
    }
    if (applied.dateFrom) {
      const from = dayjs(applied.dateFrom).startOf('day').valueOf();
      list = list.filter((r) => dayjs(r.createTime).valueOf() >= from);
    }
    if (applied.dateTo) {
      const to = dayjs(applied.dateTo).endOf('day').valueOf();
      list = list.filter((r) => dayjs(r.createTime).valueOf() <= to);
    }

    return list;
  }, [allRecords, activeTab, applied]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (applied.keyword) chips.push({ key: 'keyword', label: `关键词: ${applied.keyword}` });
    if (applied.partNumber) chips.push({ key: 'partNumber', label: `件号: ${applied.partNumber}` });
    if (applied.serialNumber) chips.push({ key: 'serialNumber', label: `序号: ${applied.serialNumber}` });
    if (applied.workOrder) chips.push({ key: 'workOrder', label: `工单/飞机: ${applied.workOrder}` });
    if (applied.dateFrom || applied.dateTo) {
      const range = `${applied.dateFrom || '不限'} ~ ${applied.dateTo || '不限'}`;
      chips.push({ key: 'date', label: `日期: ${range}` });
    }
    return chips;
  }, [applied]);

  const hasAppliedFilters = activeChips.length > 0;

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

  const handleRecordClick = (record: AnyRecord) => {
    Taro.navigateTo({
      url: `/pages/part-detail/index?partNumber=${encodeURIComponent(record.partNumber)}&serialNumber=${encodeURIComponent(record.serialNumber)}`
    });
  };

  const handleClearKeyword = () => {
    const next = { ...applied, keyword: '' };
    setApplied(next);
    setDraft(next);
    setFilter(next);
  };

  const handleKeywordInput = (val: string) => {
    const next = { ...applied, keyword: val };
    setApplied(next);
    setDraft(next);
    setFilter(next);
  };

  const openAdvanced = () => {
    setDraft({ ...applied, showAdvanced: true });
    setFilter({ ...applied, showAdvanced: true });
  };

  const closeAdvanced = () => {
    const next = { ...filter, showAdvanced: false };
    setFilter(next);
    setDraft({ ...applied, showAdvanced: false });
  };

  const applyFilters = () => {
    const next: FilterState = {
      ...draft,
      showAdvanced: false
    };
    setApplied(next);
    setFilter(next);
    const total = allRecords.filter((r) => activeTab === 'all' || r.type === activeTab).length;
    const matched = filteredRecordsPreview(next).length;
    Taro.showToast({ title: `筛选出 ${matched}/${total} 条`, icon: 'none' });
  };

  const filteredRecordsPreview = (f: FilterState) => {
    let list = allRecords;
    if (activeTab !== 'all') list = list.filter((r) => r.type === activeTab);
    if (f.keyword) {
      const lower = f.keyword.toLowerCase();
      list = list.filter((r) =>
        (r.partNumber || '').toLowerCase().includes(lower) ||
        (r.serialNumber || '').toLowerCase().includes(lower)
      );
    }
    return list;
  };

  const resetFilters = () => {
    const next: FilterState = {
      ...emptyFilter,
      keyword: applied.keyword,
      showAdvanced: draft.showAdvanced
    };
    setDraft(next);
    setFilter(next);
  };

  const removeChip = (key: string) => {
    const resetValue = (k: string) => {
      if (k === 'date') {
        return { dateFrom: '', dateTo: '' };
      }
      return { [k]: '' };
    };
    const next: FilterState = { ...applied, ...resetValue(key), keyword: key === 'keyword' ? '' : applied.keyword };
    setApplied(next);
    setDraft({ ...next, showAdvanced: draft.showAdvanced });
    setFilter({ ...next, showAdvanced: filter.showAdvanced });
  };

  const pickDate = (field: 'dateFrom' | 'dateTo', initVal: string) => {
    Taro.showActionSheet({
      itemList: ['选择今天', '选择7天前', '选择30天前', '清空日期', '手动选择'],
      success: (res) => {
        let val = initVal;
        switch (res.tapIndex) {
          case 0:
            val = dayjs().format('YYYY-MM-DD');
            break;
          case 1:
            val = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
            break;
          case 2:
            val = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
            break;
          case 3:
            val = '';
            break;
          case 4:
            Taro.showModal({
              title: field === 'dateFrom' ? '起始日期' : '结束日期',
              editable: true,
              placeholderText: 'YYYY-MM-DD',
              content: initVal,
              success: (mres) => {
                if (mres.confirm && mres.content) {
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(mres.content)) {
                    Taro.showToast({ title: '格式 YYYY-MM-DD', icon: 'none' });
                    return;
                  }
                  const next = { ...draft, [field]: mres.content };
                  setDraft(next);
                }
              }
            });
            return;
        }
        const next = { ...draft, [field]: val };
        setDraft(next);
      }
    });
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
          <Text className={styles.sectionMore}>
            {filteredRecords.length} / {allRecords.length} 条
          </Text>
        </View>

        <View className={styles.filterBar}>
          <View className={styles.searchRow}>
            <Text className={styles.searchIcon}>🔍</Text>
            <Input
              className={styles.searchInput}
              value={applied.keyword}
              placeholder="件号/序号/工单/领料人 搜索"
              placeholderClass={styles.placeholder}
              onInput={(e) => handleKeywordInput(e.detail.value)}
              confirmType="search"
            />
            {applied.keyword && (
              <View className={styles.searchClear} onClick={handleClearKeyword}>
                <Text>✕</Text>
              </View>
            )}
          </View>

          <View className={styles.togglesRow}>
            <View
              className={classnames(styles.chipToggle, filter.showAdvanced && styles.on)}
              onClick={() => (filter.showAdvanced ? closeAdvanced() : openAdvanced())}
            >
              <Text>筛选 {hasAppliedFilters ? `(${activeChips.length})` : ''}</Text>
            </View>
            {hasAppliedFilters && (
              <View
                className={classnames(styles.chipToggle, styles.on)}
                onClick={() => {
                  setApplied(emptyFilter);
                  setDraft(emptyFilter);
                  setFilter(emptyFilter);
                }}
              >
                <Text>清空</Text>
              </View>
            )}
          </View>

          {filter.showAdvanced && (
            <View className={styles.filterPanel}>
              <View className={styles.filterRow}>
                <Text className={styles.filterLabel}>件号</Text>
                <View className={styles.filterField}>
                  <Input
                    className={styles.filterFieldInput}
                    value={draft.partNumber}
                    placeholder="按件号过滤"
                    placeholderClass={styles.placeholder}
                    onInput={(e) => setDraft({ ...draft, partNumber: e.detail.value })}
                  />
                </View>
              </View>
              <View className={styles.filterRow}>
                <Text className={styles.filterLabel}>序号</Text>
                <View className={styles.filterField}>
                  <Input
                    className={styles.filterFieldInput}
                    value={draft.serialNumber}
                    placeholder="按序号过滤"
                    placeholderClass={styles.placeholder}
                    onInput={(e) => setDraft({ ...draft, serialNumber: e.detail.value })}
                  />
                </View>
              </View>
              <View className={styles.filterRow}>
                <Text className={styles.filterLabel}>工单/飞机</Text>
                <View className={styles.filterField}>
                  <Input
                    className={styles.filterFieldInput}
                    value={draft.workOrder}
                    placeholder="工单号或飞机注册号"
                    placeholderClass={styles.placeholder}
                    onInput={(e) => setDraft({ ...draft, workOrder: e.detail.value })}
                  />
                </View>
              </View>

              <View className={styles.filterRowDouble}>
                <View className={styles.filterRowDoubleItem}>
                  <Text className={styles.filterLabel}>起始</Text>
                  <View
                    className={styles.filterField}
                    onClick={() => pickDate('dateFrom', draft.dateFrom)}
                  >
                    <Text
                      className={classnames(
                        styles.filterFieldInput,
                        !draft.dateFrom && styles.placeholder
                      )}
                    >
                      {draft.dateFrom || '选择日期'}
                    </Text>
                  </View>
                </View>
                <View className={styles.filterRowDoubleItem}>
                  <Text className={styles.filterLabel}>结束</Text>
                  <View
                    className={styles.filterField}
                    onClick={() => pickDate('dateTo', draft.dateTo)}
                  >
                    <Text
                      className={classnames(
                        styles.filterFieldInput,
                        !draft.dateTo && styles.placeholder
                      )}
                    >
                      {draft.dateTo || '选择日期'}
                    </Text>
                  </View>
                </View>
              </View>

              <View className={styles.filterActions}>
                <View className={classnames(styles.filterBtn, styles.btnGhost)} onClick={resetFilters}>
                  <Text>重置</Text>
                </View>
                <View className={classnames(styles.filterBtn, styles.btnPrimary)} onClick={applyFilters}>
                  <Text>应用筛选</Text>
                </View>
              </View>
            </View>
          )}

          {activeChips.length > 0 && (
            <View className={styles.filterChips}>
              {activeChips.map((chip) => (
                <View
                  key={chip.key}
                  className={styles.chipActive}
                  onClick={() => removeChip(chip.key)}
                >
                  <Text>{chip.label}</Text>
                  <Text className={styles.chipClose}>✕</Text>
                </View>
              ))}
            </View>
          )}
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
            <View className={styles.emptyHint}>
              <Text className={styles.emptyHintIcon}>�</Text>
              <Text className={styles.emptyHintTitle}>
                {hasAppliedFilters ? '没有符合条件的记录' : '暂无收发记录'}
              </Text>
              <Text className={styles.emptyHintDesc}>
                {hasAppliedFilters ? '请尝试放宽筛选条件或清空关键词' : '执行入库/出库/退库后记录将显示在此'}
              </Text>
            </View>
          ) : (
            filteredRecords.map((record) => (
              <View
                key={record.id}
                className={styles.recordItem}
                onClick={() => handleRecordClick(record)}
              >
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
                    `领料: ${record.receiver} · ${record.workOrder || record.aircraftReg || '无关联'}`}
                  {record.type === 'return' &&
                    `原因: ${RETURN_REASON_LABEL[record.reason] || record.reason}`}
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
