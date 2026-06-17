import React, { useState, useMemo } from 'react';
import { View, Text, Input, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import { usePartStore } from '@/store/usePartStore';
import { parsePackagingLabel } from '@/utils/labelParser';
import { formatDateTime } from '@/utils/status';
import type { StocktakeRecord } from '@/types/part';
import { LIFE_UNIT_LABEL } from '@/types/part';
import styles from './index.module.scss';

type ViewMode = 'setup' | 'work' | 'history';
type ItemsTab = 'all' | 'scanned' | 'missing';

const StocktakePage: React.FC = () => {
  const {
    stocktakeRecords,
    createStocktake,
    getStocktakeItems,
    scanStocktakeItem,
    finishStocktake
  } = usePartStore();

  const [viewMode, setViewMode] = useState<ViewMode>('history');
  const [activeStocktakeId, setActiveStocktakeId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [locationScope, setLocationScope] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [itemsTab, setItemsTab] = useState<ItemsTab>('all');
  const [manualCode, setManualCode] = useState('');

  const activeRecord = useMemo(() => {
    return stocktakeRecords.find((r) => r.id === activeStocktakeId) || null;
  }, [stocktakeRecords, activeStocktakeId]);

  const stocktakeItems = useMemo(() => {
    return activeStocktakeId ? getStocktakeItems(activeStocktakeId) : [];
  }, [stocktakeRecords, activeStocktakeId, getStocktakeItems]);

  const filteredItems = useMemo(() => {
    if (itemsTab === 'scanned') return stocktakeItems.filter((i) => i.scanned);
    if (itemsTab === 'missing') return stocktakeItems.filter((i) => !i.scanned);
    return stocktakeItems;
  }, [stocktakeItems, itemsTab]);

  const inProgressRecord = useMemo(() => {
    return stocktakeRecords.find((r) => r.status === 'in_progress');
  }, [stocktakeRecords]);

  const progress = useMemo(() => {
    if (!activeRecord || activeRecord.totalCount === 0) return 0;
    return Math.round((activeRecord.scannedCount / activeRecord.totalCount) * 100);
  }, [activeRecord]);

  const handleStart = () => {
    if (inProgressRecord) {
      Taro.showModal({
        title: '存在进行中的盘点',
        content: `盘点：${inProgressRecord.title}\n已完成 ${inProgressRecord.scannedCount}/${inProgressRecord.totalCount}\n是否继续该盘点？`,
        confirmText: '继续盘点',
        cancelText: '新建',
        success: (res) => {
          if (res.confirm) {
            setActiveStocktakeId(inProgressRecord.id);
            setViewMode('work');
          } else {
            doCreate();
          }
        }
      });
    } else {
      doCreate();
    }
  };

  const doCreate = () => {
    if (locationScope && locationScope.trim()) {
      const record = createStocktake({
        title: title.trim() || `盘点 ${locationScope}`,
        locationScope: locationScope.trim(),
        operator: '当前收发员'
      });
      setActiveStocktakeId(record.id);
    } else {
      const record = createStocktake({
        title: title.trim() || undefined,
        operator: '当前收发员'
      });
      setActiveStocktakeId(record.id);
    }
    setTitle('');
    setLocationScope('');
    setViewMode('work');
    Taro.showToast({ title: '已创建盘点任务', icon: 'success' });
  };

  const handleScan = async () => {
    if (!activeStocktakeId) return;
    try {
      const res = await Taro.scanCode({
        onlyFromCamera: false,
        scanType: ['barCode', 'qrCode']
      });
      if (!res.result) {
        Taro.showToast({ title: '未识别到内容', icon: 'none' });
        return;
      }
      applyScanCode(res.result);
    } catch (e) {
      console.error('[stocktake] 扫码失败:', e);
      Taro.showToast({ title: '扫码失败，请手动输入', icon: 'none' });
    }
  };

  const applyScanCode = (rawCode: string) => {
    if (!activeStocktakeId) return;
    if (activeRecord?.status === 'completed') {
      Taro.showToast({ title: '该盘点已完成，只读', icon: 'none' });
      return;
    }
    const parsed = parsePackagingLabel(rawCode);
    const code =
      parsed.partNumber ||
      parsed.serialNumber ||
      parsed.batchNumber ||
      rawCode.trim();

    const result = scanStocktakeItem({
      stocktakeId: activeStocktakeId,
      partNumber: parsed.partNumber,
      serialNumber: parsed.serialNumber,
      batchNumber: parsed.batchNumber,
      code
    });

    if (!result) {
      Taro.showModal({
        title: '未匹配到盘点项',
        content: `扫码内容：\n${rawCode}\n\n未找到对应在库航材，或该盘点已结束。`,
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }

    const { item, alreadyScanned } = result;
    if (alreadyScanned) {
      Taro.showToast({
        title: `已盘过：${item.partName || item.partNumber}`,
        icon: 'none',
        duration: 1500
      });
      return;
    }

    Taro.showToast({
      title: item.remark ? '盘外件已录入' : '✓ 已核对',
      icon: 'success'
    });
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      Taro.showToast({ title: '请输入件号/序号/批次号', icon: 'none' });
      return;
    }
    applyScanCode(manualCode.trim());
    setManualCode('');
  };

  const handleFinish = () => {
    if (!activeStocktakeId || !activeRecord) return;
    Taro.showModal({
      title: '确认结束盘点？',
      content: `盘点：${activeRecord.title}\n已盘 ${activeRecord.scannedCount} 件，未盘 ${activeRecord.missingCount} 件。\n结束后将生成盘点记录，不可继续扫码。`,
      confirmText: '确认结束',
      success: (res) => {
        if (res.confirm) {
          const finished = finishStocktake(activeStocktakeId);
          if (finished) {
            Taro.showToast({ title: '盘点记录已生成', icon: 'success' });
            setTimeout(() => {
              setViewMode('history');
            }, 1200);
          }
        }
      }
    });
  };

  const handleContinue = (rec: StocktakeRecord) => {
    setActiveStocktakeId(rec.id);
    setItemsTab('all');
    setViewMode('work');
  };

  const handleViewHistory = (rec: StocktakeRecord) => {
    setActiveStocktakeId(rec.id);
    setItemsTab('missing');
    setViewMode('work');
  };

  const renderSetup = () => (
    <View>
      <View className={styles.setupHeader}>
        <Text className={styles.setupTitle}>创建盘点任务</Text>
        <Text className={styles.setupDesc}>按库位逐件扫码核对，完成后生成盘点记录</Text>
      </View>
      <View className={styles.setupForm}>
        <View className={styles.setupCard}>
          <View className={styles.setupRow}>
            <Text className={styles.setupLabel}>盘点名称（选填）</Text>
            <View
              className={classnames(
                styles.setupWrapper,
                focusedField === 'title' && styles.focused
              )}
            >
              <Input
                className={styles.setupInput}
                value={title}
                placeholder={`盘点 ${dayjs().format('YYYY-MM-DD')}`}
                placeholderClass={styles.placeholder}
                onInput={(e) => setTitle(e.detail.value)}
                onFocus={() => setFocusedField('title')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View className={styles.setupRow}>
            <Text className={styles.setupLabel}>库位范围（选填，留空盘全部）</Text>
            <View
              className={classnames(
                styles.setupWrapper,
                focusedField === 'location' && styles.focused
              )}
            >
              <Input
                className={styles.setupInput}
                value={locationScope}
                placeholder="如 A-03 或 A ，按前缀筛选"
                placeholderClass={styles.placeholder}
                onInput={(e) => setLocationScope(e.detail.value)}
                onFocus={() => setFocusedField('location')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <View className={styles.quickScopes}>
              {['A', 'B', 'C', 'A-03'].map((s) => (
                <View
                  key={s}
                  className={styles.scopeTag}
                  onClick={() => setLocationScope(s)}
                >
                  <Text>{s}</Text>
                </View>
              ))}
            </View>
          </View>

          <Button className={styles.startBtn} onClick={handleStart}>
            开始盘点
          </Button>
        </View>
      </View>
    </View>
  );

  const renderWork = () => (
    <ScrollView scrollY>
      <View className={styles.progressHeader}>
        <Text className={styles.progressTitle}>
          {activeRecord?.status === 'completed' ? '✓ 已完成：' : ''}
          {activeRecord?.title || '盘点中'}
        </Text>
        <View className={styles.progressStats}>
          <View className={styles.progressStat}>
            <Text className={styles.progressValue}>{activeRecord?.totalCount || 0}</Text>
            <Text className={styles.progressLabel}>合计</Text>
          </View>
          <View className={styles.progressStat}>
            <Text className={styles.progressValue} style={{ color: '#A7F3D0' }}>
              {activeRecord?.scannedCount || 0}
            </Text>
            <Text className={styles.progressLabel}>已盘</Text>
          </View>
          <View className={styles.progressStat}>
            <Text className={styles.progressValue} style={{ color: '#FCA5A5' }}>
              {activeRecord?.missingCount || 0}
            </Text>
            <Text className={styles.progressLabel}>差异</Text>
          </View>
        </View>
        <View className={styles.progressBar}>
          <View
            className={styles.progressInner}
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>

      <View className={styles.scanSection}>
        <View className={styles.scanCard}>
          <View
            className={classnames(
              styles.scanPrimaryBtn,
              activeRecord?.status === 'completed' && styles.disabled
            )}
            onClick={() => {
              if (activeRecord?.status === 'completed') {
                Taro.showToast({ title: '该盘点已完成，只读', icon: 'none' });
                return;
              }
              handleScan();
            }}
          >
            <Text className={styles.scanIcon}>⌖</Text>
            <Text className={styles.scanText}>
              {activeRecord?.status === 'completed' ? '盘点已完成（只读）' : '扫描下一件'}
            </Text>
          </View>
          <Text className={styles.scanSub}>
            {activeRecord?.status === 'completed'
              ? '盘点记录已归档，明细不可修改'
              : '扫包装标签或序号码，自动识别已核对；支持手动输入件号/序号/批次号'}
          </Text>
          <View className={styles.manualRow}>
            <View className={styles.manualInput}>
              <Input
                className={styles.manualInputField}
                value={manualCode}
                placeholder={activeRecord?.status === 'completed' ? '已完成，无法输入' : '手动输入件号/序号/批次号'}
                placeholderClass={styles.placeholder}
                disabled={activeRecord?.status === 'completed'}
                onInput={(e) => setManualCode(e.detail.value)}
                confirmType="done"
                onConfirm={() => {
                  if (activeRecord?.status !== 'completed') handleManualSubmit();
                }}
              />
            </View>
            <Button
              className={classnames(
                styles.manualBtn,
                activeRecord?.status === 'completed' && styles.disabled
              )}
              disabled={activeRecord?.status === 'completed'}
              onClick={handleManualSubmit}
            >
              标记
            </Button>
          </View>
        </View>
      </View>

      <View className={styles.listSection}>
        <View className={styles.tabsRow}>
          <View
            className={classnames(styles.tabItem, itemsTab === 'all' && styles.active)}
            onClick={() => setItemsTab('all')}
          >
            <Text>全部 {activeRecord?.totalCount || 0}</Text>
          </View>
          <View
            className={classnames(styles.tabItem, itemsTab === 'scanned' && styles.active)}
            onClick={() => setItemsTab('scanned')}
          >
            <Text>已盘 {activeRecord?.scannedCount || 0}</Text>
          </View>
          <View
            className={classnames(styles.tabItem, itemsTab === 'missing' && styles.active)}
            onClick={() => setItemsTab('missing')}
          >
            <Text>差异 {activeRecord?.missingCount || 0}</Text>
          </View>
        </View>

        <View className={styles.itemList}>
          {filteredItems.length === 0 ? (
            <View style={{ padding: 80, textAlign: 'center' }}>
              <Text style={{ fontSize: 28, color: '#94A3B8' }}>暂无可显示项</Text>
            </View>
          ) : (
            filteredItems.map((item) => {
              const partInfo = usePartStore
                .getState()
                .parts.find((p) => p.id === item.partId);
              return (
                <View key={item.id} className={styles.stItem}>
                  <View
                    className={classnames(
                      styles.stCheck,
                      item.scanned && styles.scanned
                    )}
                  >
                    {item.scanned && (
                      <Text className={styles.stCheckIcon}>✓</Text>
                    )}
                  </View>
                  <View className={styles.stInfo}>
                    <View style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text className={styles.stPartName}>
                        {item.partName || item.partNumber}
                      </Text>
                      {item.remark && (
                        <Text className={styles.stRemark}>{item.remark}</Text>
                      )}
                    </View>
                    <Text className={styles.stMeta}>
                      {item.partNumber} · {item.serialNumber}
                    </Text>
                    {partInfo && (
                      <Text className={styles.stLife}>
                        剩余: {partInfo.remainingLife}{' '}
                        {LIFE_UNIT_LABEL[partInfo.lifeUnit]} · 库位:{' '}
                        {item.location || '-'}
                      </Text>
                    )}
                  </View>
                  {item.scanTime && (
                    <Text className={styles.stScanTime}>
                      {formatDateTime(item.scanTime).substring(11)}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      </View>

      <View className={styles.bottomBar}>
        <Button
          className={classnames(
            styles.btnSecondary,
            activeRecord?.status === 'completed' && styles.btnFull
          )}
          onClick={() => {
            setViewMode('history');
            setActiveStocktakeId(null);
          }}
        >
          {activeRecord?.status === 'completed' ? '返回列表' : '返回'}
        </Button>
        {activeRecord?.status !== 'completed' && (
          <Button
            className={styles.btnPrimary}
            onClick={handleFinish}
          >
            结束盘点 · 生成记录
          </Button>
        )}
      </View>
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView scrollY>
      <View className={styles.setupHeader}>
        <Text className={styles.setupTitle}>库存盘点</Text>
        <Text className={styles.setupDesc}>
          共 {stocktakeRecords.length} 次盘点，{' '}
          {stocktakeRecords.filter((r) => r.status === 'completed').length} 次已完成
        </Text>
      </View>

      <View className={styles.setupForm}>
        <View style={{ marginTop: 0 }}>
          <Button className={styles.startBtn} onClick={() => setViewMode('setup')}>
            + 新建盘点任务
          </Button>
        </View>
      </View>

      <View className={styles.historySection}>
        <Text className={styles.historyTitle}>盘点历史</Text>
        {stocktakeRecords.length === 0 ? (
          <View
            style={{
              padding: 80,
              textAlign: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              boxShadow: '0 2rpx 12rpx rgba(0,0,0,0.06)'
            }}
          >
            <Text style={{ fontSize: 48, opacity: 0.3, marginBottom: 16 }}>📋</Text>
            <Text style={{ fontSize: 28, color: '#94A3B8' }}>暂无盘点历史</Text>
            <Text style={{ fontSize: 24, color: '#CBD5E1', marginTop: 8, display: 'block' }}>
              点击上方创建第一次盘点任务
            </Text>
          </View>
        ) : (
          stocktakeRecords.map((rec) => (
            <View
              key={rec.id}
              className={styles.historyItem}
              onClick={() => {
                if (rec.status === 'in_progress') {
                  handleContinue(rec);
                } else {
                  handleViewHistory(rec);
                }
              }}
            >
              <View className={styles.historyHeader}>
                <Text className={styles.historyName}>{rec.title}</Text>
                <View
                  className={classnames(
                    styles.historyStatus,
                    rec.status === 'in_progress' ? styles.progress : styles.done
                  )}
                >
                  <Text>
                    {rec.status === 'in_progress' ? '进行中' : '已完成'}
                  </Text>
                </View>
              </View>
              <Text className={styles.historyMeta}>
                合计 {rec.totalCount} · 已盘 {rec.scannedCount} · 差异{' '}
                {rec.missingCount}
              </Text>
              <Text className={styles.historyMeta}>
                {formatDateTime(rec.createTime)} · {rec.operator}
                {rec.locationScope && ` · 范围：${rec.locationScope}`}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  return (
    <View className={styles.container}>
      {viewMode === 'setup' && renderSetup()}
      {viewMode === 'work' && activeRecord && renderWork()}
      {viewMode === 'history' && renderHistory()}
    </View>
  );
};

export default StocktakePage;
