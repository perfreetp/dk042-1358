import React, { useState, useMemo } from 'react';
import { View, Text, Input, Button, ScrollView, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { usePartStore } from '@/store/usePartStore';
import StatusBadge from '@/components/StatusBadge';
import { LIFE_UNIT_LABEL, RETURN_REASON_LABEL } from '@/types/part';
import type { LifePart, ReturnReason } from '@/types/part';
import { matchesSearch } from '@/utils/status';
import styles from './index.module.scss';

const reasonOptions: { key: ReturnReason; desc: string }[] = [
  { key: 'life_expired', desc: '航材达到使用寿命限制，正常拆下' },
  { key: 'fault', desc: '使用过程中出现故障或性能异常' },
  { key: 'wrong_delivery', desc: '发料错误或型号不符退回' },
  { key: 'for_repair', desc: '按计划拆下送修或送检' }
];

const ReturnPage: React.FC = () => {
  const { parts, recordReturn } = usePartStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<ReturnReason | null>(null);
  const [remark, setRemark] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const allParts = useMemo(() => parts, [parts]);

  const filteredParts = useMemo(() => {
    if (!searchKeyword.trim()) return allParts;
    return allParts.filter((p) => matchesSearch(p, searchKeyword));
  }, [allParts, searchKeyword]);

  const selectedPart = useMemo(() => {
    return parts.find((p) => p.id === selectedPartId) || null;
  }, [parts, selectedPartId]);

  const canSubmit = useMemo(() => {
    return selectedPartId !== null && selectedReason !== null;
  }, [selectedPartId, selectedReason]);

  const handleSelectPart = (part: LifePart) => {
    setSelectedPartId(part.id);
    setSearchKeyword('');
  };

  const handleCancel = () => {
    Taro.navigateBack();
  };

  const handleSubmit = () => {
    if (!canSubmit || !selectedPart || !selectedReason) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    Taro.showModal({
      title: '确认退库？',
      content: `航材: ${selectedPart.partName || selectedPart.partNumber}\n原因: ${RETURN_REASON_LABEL[selectedReason]}\n${remark ? `备注: ${remark}` : ''}`,
      confirmText: '确认退库',
      success: (res) => {
        if (res.confirm) {
          doSubmit();
        }
      }
    });
  };

  const doSubmit = () => {
    if (!selectedPart || !selectedReason) return;

    try {
      recordReturn({
        partId: selectedPart.id,
        reason: selectedReason,
        remark: remark.trim() || undefined,
        operator: '当前收发员'
      });

      console.log('[Return] 退库成功');
      Taro.showToast({
        title: '退库成功',
        icon: 'success',
        duration: 1500
      });

      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('[Return] 退库失败:', error);
      Taro.showToast({ title: '退库失败，请重试', icon: 'none' });
    }
  };

  return (
    <ScrollView className={styles.container} scrollY>
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>选择退库航材</Text>
        <View className={styles.formCard}>
          {selectedPart ? (
            <View className={classnames(styles.partItem, styles.selected)}>
              <View className={styles.partItemHeader}>
                <Text className={styles.partItemName}>
                  {selectedPart.partName || selectedPart.partNumber}
                </Text>
                <StatusBadge status={selectedPart.status} size="sm" />
              </View>
              <Text className={styles.partItemMeta}>
                {selectedPart.partNumber} · {selectedPart.serialNumber}
              </Text>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text className={styles.partItemLife}>
                  剩余: {selectedPart.remainingLife} {LIFE_UNIT_LABEL[selectedPart.lifeUnit]}
                </Text>
                <Text
                  style={{ fontSize: 24, color: '#94A3B8' }}
                  onClick={() => setSelectedPartId(null)}
                >
                  更换
                </Text>
              </View>
            </View>
          ) : (
            <View>
              <View className={styles.inputRow}>
                <Text className={styles.inputLabel}>搜索航材</Text>
                <View
                  className={classnames(
                    styles.inputWrapper,
                    focusedField === 'search' && styles.focused
                  )}
                >
                  <Input
                    className={styles.inputField}
                    value={searchKeyword}
                    placeholder="输入件号、序号、批次号搜索"
                    placeholderClass={styles.placeholder}
                    onInput={(e) => setSearchKeyword(e.detail.value)}
                    onFocus={() => setFocusedField('search')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
              <Text className={styles.searchHint}>
                共 {allParts.length} 件在库航材
              </Text>
              <View className={styles.partList}>
                {filteredParts.length === 0 ? (
                  <View className={styles.emptyParts}>
                    <Text className={styles.emptyText}>
                      {searchKeyword ? '未找到匹配的航材' : '暂无航材记录'}
                    </Text>
                  </View>
                ) : (
                  filteredParts.slice(0, 5).map((part) => (
                    <View
                      key={part.id}
                      className={styles.partItem}
                      onClick={() => handleSelectPart(part)}
                    >
                      <View className={styles.partItemHeader}>
                        <Text className={styles.partItemName}>
                          {part.partName || part.partNumber}
                        </Text>
                        <StatusBadge status={part.status} size="sm" />
                      </View>
                      <Text className={styles.partItemMeta}>
                        {part.partNumber} · {part.serialNumber}
                      </Text>
                      <Text className={styles.partItemLife}>
                        剩余: {part.remainingLife} {LIFE_UNIT_LABEL[part.lifeUnit]}
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
