import React, { useState, useMemo } from 'react';
import { View, Text, Input, Button, ScrollView, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { usePartStore } from '@/store/usePartStore';
import StatusBadge from '@/components/StatusBadge';
import { LIFE_UNIT_LABEL, RETURN_REASON_LABEL } from '@/types/part';
import type { OutboundRecord, ReturnReason } from '@/types/part';
import { formatDateTime } from '@/utils/status';
import styles from './index.module.scss';

const reasonOptions: { key: ReturnReason; desc: string }[] = [
  { key: 'life_expired', desc: '航材达到使用寿命限制，正常拆下' },
  { key: 'fault', desc: '使用过程中出现故障或性能异常' },
  { key: 'wrong_delivery', desc: '发料错误或型号不符退回' },
  { key: 'for_repair', desc: '按计划拆下送修或送检' }
];

const ReturnPage: React.FC = () => {
  const { outboundRecords, recordReturn, setHighlightedPartId } = usePartStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedOutboundId, setSelectedOutboundId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<ReturnReason | null>(null);
  const [remark, setRemark] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const returnableOutbounds = useMemo(() => {
    return outboundRecords.filter((r) => !r.returned);
  }, [outboundRecords]);

  const filteredOutbounds = useMemo(() => {
    if (!searchKeyword.trim()) return returnableOutbounds;
    const kw = searchKeyword.toLowerCase().trim();
    return returnableOutbounds.filter(
      (r) =>
        r.partNumber.toLowerCase().includes(kw) ||
        r.serialNumber.toLowerCase().includes(kw) ||
        r.batchNumber.toLowerCase().includes(kw) ||
        (r.partName || '').toLowerCase().includes(kw) ||
        (r.workOrder || '').toLowerCase().includes(kw) ||
        (r.aircraftReg || '').toLowerCase().includes(kw) ||
        (r.receiver || '').toLowerCase().includes(kw)
    );
  }, [returnableOutbounds, searchKeyword]);

  const selectedOutbound = useMemo(() => {
    return outboundRecords.find((r) => r.id === selectedOutboundId) || null;
  }, [outboundRecords, selectedOutboundId]);

  const canSubmit = useMemo(() => {
    return selectedOutboundId !== null && selectedReason !== null;
  }, [selectedOutboundId, selectedReason]);

  const handleSelectOutbound = (record: OutboundRecord) => {
    setSelectedOutboundId(record.id);
    setSearchKeyword('');
  };

  const handleCancel = () => {
    Taro.navigateBack();
  };

  const handleSubmit = () => {
    if (!selectedOutbound || !selectedReason) {
      Taro.showToast({ title: '请选择航材并填写拆下原因', icon: 'none' });
      return;
    }

    Taro.showModal({
      title: '确认退库？',
      content: `航材: ${selectedOutbound.partName || selectedOutbound.partNumber}\n原因: ${RETURN_REASON_LABEL[selectedReason]}${remark ? `\n备注: ${remark}` : ''}\n\n退库后将回归在库列表，状态显示为待处理。`,
      confirmText: '确认退库',
      success: (res) => {
        if (res.confirm) {
          doSubmit();
        }
      }
    });
  };

  const doSubmit = () => {
    if (!selectedOutbound || !selectedReason) return;

    try {
      const result = recordReturn({
        outboundRecordId: selectedOutbound.id,
        reason: selectedReason,
        remark: remark.trim() || undefined,
        operator: '当前收发员'
      });

      if (result.success) {
        console.log('[Return] 退库成功, returnedPartId=', result.returnedPartId);
        if (result.returnedPartId) {
          setHighlightedPartId(result.returnedPartId);
        }
        Taro.showToast({
          title: '退库成功',
          icon: 'success',
          duration: 1200
        });
        setTimeout(() => {
          Taro.switchTab({
            url: '/pages/query/index',
            success: () => {
              console.log('[Return] 已跳转到查询页');
            },
            fail: (err) => {
              console.warn('[Return] switchTab 失败，尝试 navigateBack:', err);
              Taro.navigateBack({ delta: 1 });
            }
          });
        }, 1200);
      } else {
        Taro.showToast({ title: '该出库记录不可退库', icon: 'none' });
      }
    } catch (error) {
      console.error('[Return] 退库失败:', error);
      Taro.showToast({ title: '退库失败，请重试', icon: 'none' });
    }
  };

  return (
    <ScrollView className={styles.container} scrollY>
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>选择退库航材（已出库）</Text>
        <View className={styles.formCard}>
          {selectedOutbound ? (
            <View className={classnames(styles.partItem, styles.selected)}>
              <View className={styles.partItemHeader}>
                <Text className={styles.partItemName}>
                  {selectedOutbound.partName || selectedOutbound.partNumber}
                </Text>
                <StatusBadge status="pending" size="sm" />
              </View>
              <Text className={styles.partItemMeta}>
                {selectedOutbound.partNumber} · {selectedOutbound.serialNumber}
              </Text>
              <View style={{ marginTop: 8 }}>
                <Text className={styles.partItemLife}>
                  剩余: {selectedOutbound.remainingLife} {LIFE_UNIT_LABEL[selectedOutbound.lifeUnit]}
                </Text>
              </View>
              <View className={styles.outboundMeta}>
                <Text className={styles.outboundMetaText}>
                  发料: {formatDateTime(selectedOutbound.createTime)}
                </Text>
                <Text className={styles.outboundMetaText}>
                  {selectedOutbound.workOrder || selectedOutbound.aircraftReg || '-'}
                </Text>
                <Text className={styles.outboundMetaText}>
                  领料人: {selectedOutbound.receiver}
                </Text>
              </View>
              <View style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <Text
                  style={{ fontSize: 24, color: '#94A3B8' }}
                  onClick={() => setSelectedOutboundId(null)}
                >
                  更换
                </Text>
              </View>
            </View>
          ) : (
            <View>
              <View className={styles.inputRow}>
                <Text className={styles.inputLabel}>搜索已出库航材</Text>
                <View
                  className={classnames(
                    styles.inputWrapper,
                    focusedField === 'search' && styles.focused
                  )}
                >
                  <Input
                    className={styles.inputField}
                    value={searchKeyword}
                    placeholder="件号/序号/工单/领料人"
                    placeholderClass={styles.placeholder}
                    onInput={(e) => setSearchKeyword(e.detail.value)}
                    onFocus={() => setFocusedField('search')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
              <Text className={styles.searchHint}>
                共 {returnableOutbounds.length} 件已出库可退航材
              </Text>
              <View className={styles.partList}>
                {filteredOutbounds.length === 0 ? (
                  <View className={styles.emptyParts}>
                    <Text className={styles.emptyText}>
                      {searchKeyword
                        ? '未找到匹配的出库记录'
                        : returnableOutbounds.length === 0
                        ? '暂无可退库的出库记录，请先出库'
                        : '暂无出库记录'}
                    </Text>
                  </View>
                ) : (
                  filteredOutbounds.slice(0, 8).map((record) => (
                    <View
                      key={record.id}
                      className={styles.partItem}
                      onClick={() => handleSelectOutbound(record)}
                    >
                      <View className={styles.partItemHeader}>
                        <Text className={styles.partItemName}>
                          {record.partName || record.partNumber}
                        </Text>
                        <Text className={styles.partItemTime}>
                          {formatDateTime(record.createTime)}
                        </Text>
                      </View>
                      <Text className={styles.partItemMeta}>
                        {record.partNumber} · {record.serialNumber}
                      </Text>
                      <Text className={styles.partItemLife}>
                        剩余: {record.remainingLife} {LIFE_UNIT_LABEL[record.lifeUnit]}
                        {' · '}
                        {record.workOrder || record.aircraftReg || '无关联'}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>拆下原因</Text>
        <View className={styles.formCard}>
          <View className={styles.reasonGrid}>
            {reasonOptions.map((option) => (
              <View
                key={option.key}
                className={classnames(
                  styles.reasonOption,
                  selectedReason === option.key && styles.selected
                )}
                onClick={() => setSelectedReason(option.key)}
              >
                <View className={styles.reasonRadio}>
                  <View
                    className={classnames(
                      styles.reasonRadioInner,
                      selectedReason === option.key && styles.selected
                    )}
                  />
                </View>
                <View className={styles.reasonContent}>
                  <Text className={styles.reasonLabel}>
                    {RETURN_REASON_LABEL[option.key]}
                  </Text>
                  <Text className={styles.reasonDesc}>{option.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>备注信息</Text>
        <View className={styles.formCard}>
          <View className={styles.inputRow}>
            <Text className={styles.inputLabel}>退库备注（选填）</Text>
            <View
              className={classnames(
                styles.textareaWrapper,
                focusedField === 'remark' && styles.focused
              )}
            >
              <Textarea
                className={styles.textareaField}
                value={remark}
                placeholder="请输入备注信息，如拆下位置、故障现象等"
                placeholderClass={styles.placeholder}
                onInput={(e) => setRemark(e.detail.value)}
                onFocus={() => setFocusedField('remark')}
                onBlur={() => setFocusedField(null)}
                maxlength={200}
              />
            </View>
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        <Button className={styles.btnCancel} onClick={handleCancel}>
          取消
        </Button>
        <Button
          className={styles.btnConfirm}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          确认退库
        </Button>
      </View>
    </ScrollView>
  );
};

export default ReturnPage;
