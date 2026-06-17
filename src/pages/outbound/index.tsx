import React, { useState, useMemo } from 'react';
import { View, Text, Input, Button, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { usePartStore } from '@/store/usePartStore';
import StatusBadge from '@/components/StatusBadge';
import { LIFE_UNIT_LABEL } from '@/types/part';
import type { LifePart } from '@/types/part';
import { checkLifeSufficient, matchesSearch } from '@/utils/status';
import styles from './index.module.scss';

type RefMode = 'workOrder' | 'aircraftReg';

const OutboundPage: React.FC = () => {
  const { parts, recordOutbound } = usePartStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [refMode, setRefMode] = useState<RefMode>('workOrder');
  const [workOrder, setWorkOrder] = useState('');
  const [aircraftReg, setAircraftReg] = useState('');
  const [plannedUsage, setPlannedUsage] = useState('');
  const [receiver, setReceiver] = useState('');
  const [cabinet, setCabinet] = useState('');
  const [withCertificate, setWithCertificate] = useState(true);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const availableParts = useMemo(() => {
    return parts.filter((p) => p.status === 'available');
  }, [parts]);

  const filteredParts = useMemo(() => {
    if (!searchKeyword.trim()) return availableParts;
    return availableParts.filter((p) => matchesSearch(p, searchKeyword));
  }, [availableParts, searchKeyword]);

  const selectedPart = useMemo(() => {
    return parts.find((p) => p.id === selectedPartId) || null;
  }, [parts, selectedPartId]);

  const lifeCheck = useMemo(() => {
    if (!selectedPart || !plannedUsage) return null;
    const planned = parseFloat(plannedUsage);
    if (!planned || planned <= 0) return null;

    const sufficient = checkLifeSufficient(selectedPart.remainingLife, planned);
    const ratio = selectedPart.remainingLife / planned;

    if (sufficient) {
      return {
        level: 'ok',
        icon: '✅',
        title: '寿命充足',
        desc: `剩余寿命 ${selectedPart.remainingLife}${LIFE_UNIT_LABEL[selectedPart.lifeUnit]}，计划使用 ${planned}${LIFE_UNIT_LABEL[selectedPart.lifeUnit]}，满足使用要求（${ratio.toFixed(1)}倍余量）`
      };
    } else if (selectedPart.remainingLife >= planned) {
      return {
        level: 'warning',
        icon: '⚠️',
        title: '寿命余量不足',
        desc: `剩余寿命 ${selectedPart.remainingLife}${LIFE_UNIT_LABEL[selectedPart.lifeUnit]}，计划使用 ${planned}${LIFE_UNIT_LABEL[selectedPart.lifeUnit]}，建议工程确认后发放`
      };
    } else {
      return {
        level: 'fail',
        icon: '⛔',
        title: '寿命不足',
        desc: `剩余寿命 ${selectedPart.remainingLife}${LIFE_UNIT_LABEL[selectedPart.lifeUnit]}，少于计划使用 ${planned}${LIFE_UNIT_LABEL[selectedPart.lifeUnit]}，不可发料`
      };
    }
  }, [selectedPart, plannedUsage]);

  const canSubmit = useMemo(() => {
    const refValid =
      (refMode === 'workOrder' && workOrder.trim() !== '') ||
      (refMode === 'aircraftReg' && aircraftReg.trim() !== '');

    const planned = parseFloat(plannedUsage);
    const plannedValid = !isNaN(planned) && planned > 0;

    return (
      selectedPartId !== null &&
      refValid &&
      plannedValid &&
      lifeCheck !== null &&
      lifeCheck.level !== 'fail' &&
      receiver.trim() !== '' &&
      cabinet.trim() !== ''
    );
  }, [selectedPartId, refMode, workOrder, aircraftReg, plannedUsage, lifeCheck, receiver, cabinet]);

  const handleSelectPart = (part: LifePart) => {
    setSelectedPartId(part.id);
    setSearchKeyword('');
  };

  const handleCancel = () => {
    Taro.navigateBack();
  };

  const handleSubmit = () => {
    if (!selectedPart) {
      Taro.showToast({ title: '请先选择航材', icon: 'none' });
      return;
    }

    const planned = parseFloat(plannedUsage);
    if (isNaN(planned) || planned <= 0) {
      Taro.showToast({ title: '请填写计划使用量', icon: 'none' });
      return;
    }

    if (!lifeCheck) {
      Taro.showToast({ title: '请完成寿命校验', icon: 'none' });
      return;
    }

    if (lifeCheck.level === 'fail') {
      Taro.showModal({
        title: '不可发料',
        content: `${lifeCheck.title}\n${lifeCheck.desc}\n\n剩余寿命无法满足计划使用窗口，禁止发放。`,
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }

    const refValid =
      (refMode === 'workOrder' && workOrder.trim() !== '') ||
      (refMode === 'aircraftReg' && aircraftReg.trim() !== '');
    if (!refValid) {
      Taro.showToast({ title: '请填写关联信息', icon: 'none' });
      return;
    }
    if (receiver.trim() === '' || cabinet.trim() === '') {
      Taro.showToast({ title: '请填写发料确认信息', icon: 'none' });
      return;
    }

    if (lifeCheck.level === 'warning') {
      Taro.showModal({
        title: '寿命余量不足确认',
        content: `${lifeCheck.title}\n${lifeCheck.desc}\n\n该航材寿命余量低于安全阈值，需确认后再放行。是否仍要发放？`,
        confirmText: '确认放行',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            doSubmit();
          }
        }
      });
    } else {
      doSubmit();
    }
  };

  const doSubmit = () => {
    if (!selectedPart) return;

    try {
      const success = recordOutbound({
        partId: selectedPart.id,
        workOrder: refMode === 'workOrder' ? workOrder.trim() : undefined,
        aircraftReg: refMode === 'aircraftReg' ? aircraftReg.trim() : undefined,
        receiver: receiver.trim(),
        cabinet: cabinet.trim(),
        withCertificate,
        operator: '当前收发员'
      });

      if (success) {
        console.log('[Outbound] 出库成功');
        Taro.showToast({
          title: '出库成功',
          icon: 'success',
          duration: 1500
        });
        setTimeout(() => {
          Taro.navigateBack();
        }, 1500);
      } else {
        Taro.showToast({ title: '该航材不可发料', icon: 'none' });
      }
    } catch (error) {
      console.error('[Outbound] 出库失败:', error);
      Taro.showToast({ title: '出库失败，请重试', icon: 'none' });
    }
  };

  return (
    <ScrollView className={styles.container} scrollY>
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>选择航材</Text>
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
                  剩余寿命: {selectedPart.remainingLife} {LIFE_UNIT_LABEL[selectedPart.lifeUnit]}
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
                <Text className={styles.inputLabel}>搜索可发航材</Text>
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
                共 {availableParts.length} 件可发航材
              </Text>
              <View className={styles.partList}>
                {filteredParts.length === 0 ? (
                  <View className={styles.emptyParts}>
                    <Text className={styles.emptyText}>
                      {searchKeyword ? '未找到匹配的航材' : '暂无可发航材'}
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
                        剩余: {part.remainingLife} {LIFE_UNIT_LABEL[part.lifeUnit]} · 库位: {part.location || '-'}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {selectedPart && (
            <View className={styles.inputRow} style={{ marginTop: 24 }}>
              <Text className={classnames(styles.inputLabel, styles.required)}>
                计划使用量
              </Text>
              <View
                className={classnames(
                  styles.inputWrapper,
                  focusedField === 'plannedUsage' && styles.focused
                )}
              >
                <Input
                  className={styles.inputField}
                  type="digit"
                  value={plannedUsage}
                  placeholder={`预计使用 ${LIFE_UNIT_LABEL[selectedPart.lifeUnit]} 数（必填）`}
                  placeholderClass={styles.placeholder}
                  onInput={(e) => setPlannedUsage(e.detail.value)}
                  onFocus={() => setFocusedField('plannedUsage')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <Text className={styles.usageHint}>
                填写后将自动校验剩余寿命是否满足计划使用窗口
              </Text>
            </View>
          )}

          {selectedPart && !plannedUsage && (
            <View className={styles.lifeCheckHint}>
              <Text className={styles.lifeCheckHintText}>
                ⏳ 请填写计划使用量以进行寿命校验，未校验前不可发料
              </Text>
            </View>
          )}

          {lifeCheck && (
            <View
              className={classnames(
                styles.lifeCheckCard,
                lifeCheck.level === 'ok' && styles.lifeOk,
                lifeCheck.level === 'warning' && styles.lifeWarning,
                lifeCheck.level === 'fail' && styles.lifeFail
              )}
            >
              <View className={styles.lifeHeader}>
                <Text className={styles.lifeIcon}>{lifeCheck.icon}</Text>
                <Text className={styles.lifeTitle}>{lifeCheck.title}</Text>
              </View>
              <Text className={styles.lifeDesc}>{lifeCheck.desc}</Text>
            </View>
          )}
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>发料关联</Text>
        <View className={styles.formCard}>
          <View className={styles.inputRow}>
            <Text className={classnames(styles.inputLabel, styles.required)}>关联方式</Text>
            <View className={styles.modeSelector}>
              <View
                className={classnames(
                  styles.modeOption,
                  refMode === 'workOrder' && styles.active
                )}
                onClick={() => setRefMode('workOrder')}
              >
                <Text>维修工单</Text>
              </View>
              <View
                className={classnames(
                  styles.modeOption,
                  refMode === 'aircraftReg' && styles.active
                )}
                onClick={() => setRefMode('aircraftReg')}
              >
                <Text>飞机注册号</Text>
              </View>
            </View>
          </View>

          {refMode === 'workOrder' && (
            <View className={styles.inputRow}>
              <Text className={classnames(styles.inputLabel, styles.required)}>工单编号</Text>
              <View
                className={classnames(
                  styles.inputWrapper,
                  focusedField === 'workOrder' && styles.focused
                )}
              >
                <Input
                  className={styles.inputField}
                  value={workOrder}
                  placeholder="如 WO-2024-0512-001"
                  placeholderClass={styles.placeholder}
                  onInput={(e) => setWorkOrder(e.detail.value)}
                  onFocus={() => setFocusedField('workOrder')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          )}

          {refMode === 'aircraftReg' && (
            <View className={styles.inputRow}>
              <Text className={classnames(styles.inputLabel, styles.required)}>飞机注册号</Text>
              <View
                className={classnames(
                  styles.inputWrapper,
                  focusedField === 'aircraftReg' && styles.focused
                )}
              >
                <Input
                  className={styles.inputField}
                  value={aircraftReg}
                  placeholder="如 B-1234"
                  placeholderClass={styles.placeholder}
                  onInput={(e) => setAircraftReg(e.detail.value)}
                  onFocus={() => setFocusedField('aircraftReg')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          )}
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>发料确认</Text>
        <View className={styles.formCard}>
          <View className={styles.inputRow}>
            <Text className={classnames(styles.inputLabel, styles.required)}>领料人</Text>
            <View
              className={classnames(
                styles.inputWrapper,
                focusedField === 'receiver' && styles.focused
              )}
            >
              <Input
                className={styles.inputField}
                value={receiver}
                placeholder="请输入领料人姓名"
                placeholderClass={styles.placeholder}
                onInput={(e) => setReceiver(e.detail.value)}
                onFocus={() => setFocusedField('receiver')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View className={styles.inputRow}>
            <Text className={classnames(styles.inputLabel, styles.required)}>发料柜位</Text>
            <View
              className={classnames(
                styles.inputWrapper,
                focusedField === 'cabinet' && styles.focused
              )}
            >
              <Input
                className={styles.inputField}
                value={cabinet}
                placeholder="如 A-03-12"
                placeholderClass={styles.placeholder}
                onInput={(e) => setCabinet(e.detail.value)}
                onFocus={() => setFocusedField('cabinet')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View className={styles.checkboxRow}>
            <Text className={styles.checkboxLabel}>证书随附</Text>
            <View
              className={classnames(styles.checkbox, withCertificate && styles.checked)}
              onClick={() => setWithCertificate(!withCertificate)}
            >
              {withCertificate && <Text className={styles.checkboxIcon}>✓</Text>}
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
          确认出库
        </Button>
      </View>
    </ScrollView>
  );
};

export default OutboundPage;
