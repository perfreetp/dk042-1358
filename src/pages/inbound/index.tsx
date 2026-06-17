import React, { useState, useMemo } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import dayjs from 'dayjs';
import ScanInput from '@/components/ScanInput';
import StatusBadge from '@/components/StatusBadge';
import { usePartStore } from '@/store/usePartStore';
import { evaluatePartStatus, formatDate } from '@/utils/status';
import { parsePackagingLabel } from '@/utils/labelParser';
import type { LifeUnit, PartStatus } from '@/types/part';
import { LIFE_UNIT_LABEL } from '@/types/part';
import styles from './index.module.scss';

const InboundPage: React.FC = () => {
  const { addPart, recordInbound } = usePartStore();

  const [partNumber, setPartNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [partName, setPartName] = useState('');
  const [remainingLife, setRemainingLife] = useState('');
  const [lifeUnit, setLifeUnit] = useState<LifeUnit>('hour');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [storageExpiryDate, setStorageExpiryDate] = useState('');

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [labelParsed, setLabelParsed] = useState(false);

  const evaluation = useMemo(() => {
    const life = parseFloat(remainingLife);
    if (!life || life <= 0 || !storageExpiryDate) {
      return null;
    }
    return evaluatePartStatus(life, lifeUnit, storageExpiryDate);
  }, [remainingLife, lifeUnit, storageExpiryDate]);

  const canSubmit = useMemo(() => {
    return (
      partNumber.trim() !== '' &&
      serialNumber.trim() !== '' &&
      batchNumber.trim() !== '' &&
      parseFloat(remainingLife) > 0 &&
      certificateNumber.trim() !== '' &&
      storageExpiryDate !== ''
    );
  }, [partNumber, serialNumber, batchNumber, remainingLife, certificateNumber, storageExpiryDate]);

  const applyParsedLabel = (parsed: ReturnType<typeof parsePackagingLabel>) => {
    let changed = false;
    if (parsed.partNumber) {
      setPartNumber(parsed.partNumber);
      changed = true;
    }
    if (parsed.serialNumber) {
      setSerialNumber(parsed.serialNumber);
      changed = true;
    }
    if (parsed.batchNumber) {
      setBatchNumber(parsed.batchNumber);
      changed = true;
    }
    if (parsed.partName) {
      setPartName(parsed.partName);
      changed = true;
    }
    setLabelParsed(changed);
    return changed;
  };

  const handleScanLabel = async () => {
    try {
      const res = await Taro.scanCode({
        onlyFromCamera: false,
        scanType: ['barCode', 'qrCode']
      });
      if (!res.result) {
        Taro.showToast({ title: '未识别到内容', icon: 'none' });
        return;
      }
      const parsed = parsePackagingLabel(res.result);
      const ok = applyParsedLabel(parsed);
      if (ok) {
        Taro.showToast({
          title: '已自动填充标签',
          icon: 'success'
        });
      } else {
        Taro.showModal({
          title: '标签格式未识别',
          content: `扫码内容：\n${res.result}\n\n未能解析出件号/序号/批次号，请手动补录。`,
          showCancel: false,
          confirmText: '去补录'
        });
      }
    } catch (error) {
      console.error('[Inbound] 包装标签扫码失败:', error);
      Taro.showToast({ title: '扫码失败，请手动录入', icon: 'none' });
    }
  };

  const handleDateSelect = () => {
    const defaultDate = storageExpiryDate || dayjs().add(90, 'day').format('YYYY-MM-DD');
    Taro.showActionSheet({
      itemList: ['30天后', '90天后', '180天后', '365天后', '手动选择'],
      success: (res) => {
        const daysMap = [30, 90, 180, 365];
        if (res.tapIndex < 4) {
          setStorageExpiryDate(dayjs().add(daysMap[res.tapIndex], 'day').format('YYYY-MM-DD'));
        } else {
          Taro.showModal({
            title: '输入封存到期日',
            editable: true,
            placeholderText: defaultDate,
            success: (modalRes) => {
              if (modalRes.confirm && modalRes.content) {
                setStorageExpiryDate(modalRes.content);
              }
            }
          });
        }
      }
    });
  };

  const handleCancel = () => {
    Taro.navigateBack();
  };

  const handleSubmit = () => {
    if (!canSubmit || !evaluation) {
      Taro.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    const life = parseFloat(remainingLife);

    if (evaluation.status === 'unavailable') {
      Taro.showModal({
        title: '确认入库？',
        content: `该航材状态为"不可发料"\n${evaluation.remark}\n\n是否仍要入库？`,
        confirmText: '继续入库',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            doSubmit(life, evaluation.status, evaluation.remark);
          }
        }
      });
    } else {
      doSubmit(life, evaluation.status, evaluation.remark);
    }
  };

  const doSubmit = (life: number, status: PartStatus, remark: string) => {
    try {
      const result = addPart({
        partNumber: partNumber.trim(),
        serialNumber: serialNumber.trim(),
        batchNumber: batchNumber.trim(),
        partName: partName.trim() || undefined,
        remainingLife: life,
        lifeUnit,
        certificateNumber: certificateNumber.trim(),
        storageExpiryDate
      });

      recordInbound({
        partNumber: partNumber.trim(),
        serialNumber: serialNumber.trim(),
        batchNumber: batchNumber.trim(),
        partName: partName.trim() || undefined,
        remainingLife: life,
        lifeUnit,
        certificateNumber: certificateNumber.trim(),
        storageExpiryDate,
        status,
        operator: '当前收发员'
      });

      console.log('[Inbound] 入库成功:', result);
      Taro.showToast({
        title: '入库成功',
        icon: 'success',
        duration: 1500
      });

      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('[Inbound] 入库失败:', error);
      Taro.showToast({ title: '入库失败，请重试', icon: 'none' });
    }
  };

  const statusClass = (status?: PartStatus) => {
    if (!status) return '';
    return {
      available: styles.statusAvailable,
      pending: styles.statusPending,
      unavailable: styles.statusUnavailable
    }[status];
  };

  const statusIcon = (status?: PartStatus) => {
    if (!status) return '';
    return { available: '✅', pending: '⚠️', unavailable: '⛔' }[status];
  };

  return (
    <View className={styles.container}>
      <View className={styles.labelScanCard} onClick={handleScanLabel}>
        <View className={styles.labelScanIcon}>
          <Text>⌖</Text>
        </View>
        <View className={styles.labelScanContent}>
          <Text className={styles.labelScanTitle}>扫描包装标签</Text>
          <Text className={styles.labelScanDesc}>
            {labelParsed
              ? '已自动填充件号/序号/批次号，请补全寿命信息'
              : '扫码自动识别件号、序号、批次号，扫不出可手动补录'}
          </Text>
        </View>
        <Text className={styles.labelScanArrow}>›</Text>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>基础信息</Text>
        <View className={styles.formCard}>
          <ScanInput
            label="件号"
            value={partNumber}
            onChange={setPartNumber}
            placeholder="扫描或输入件号"
            required
          />
          <ScanInput
            label="序号"
            value={serialNumber}
            onChange={setSerialNumber}
            placeholder="扫描或输入序号"
            required
          />
          <ScanInput
            label="批次号"
            value={batchNumber}
            onChange={setBatchNumber}
            placeholder="扫描或输入批次号"
            required
          />
          <View className={styles.inputRow}>
            <Text className={styles.inputLabel}>航材名称</Text>
            <View
              className={classnames(
                styles.inputWrapper,
                focusedField === 'partName' && styles.focused
              )}
            >
              <Input
                className={styles.inputField}
                value={partName}
                placeholder="请输入航材名称（选填）"
                placeholderClass={styles.placeholder}
                onInput={(e) => setPartName(e.detail.value)}
                onFocus={() => setFocusedField('partName')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>寿命信息</Text>
        <View className={styles.formCard}>
          <View className={styles.inputRow}>
            <Text className={classnames(styles.inputLabel, styles.required)}>剩余寿命</Text>
            <View
              className={classnames(
                styles.inputWrapper,
                focusedField === 'remainingLife' && styles.focused
              )}
            >
              <Input
                className={styles.inputField}
                type="digit"
                value={remainingLife}
                placeholder="请输入剩余寿命数值"
                placeholderClass={styles.placeholder}
                onInput={(e) => setRemainingLife(e.detail.value)}
                onFocus={() => setFocusedField('remainingLife')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View className={styles.inputRow}>
            <Text className={classnames(styles.inputLabel, styles.required)}>计量单位</Text>
            <View className={styles.unitSelector}>
              {(['hour', 'cycle', 'day'] as LifeUnit[]).map((unit) => (
                <View
                  key={unit}
                  className={classnames(styles.unitOption, lifeUnit === unit && styles.active)}
                  onClick={() => setLifeUnit(unit)}
                >
                  <Text>{LIFE_UNIT_LABEL[unit]}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className={styles.inputRow}>
            <Text className={classnames(styles.inputLabel, styles.required)}>随件证书号</Text>
            <View
              className={classnames(
                styles.inputWrapper,
                focusedField === 'certificateNumber' && styles.focused
              )}
            >
              <Input
                className={styles.inputField}
                value={certificateNumber}
                placeholder="请输入证书编号"
                placeholderClass={styles.placeholder}
                onInput={(e) => setCertificateNumber(e.detail.value)}
                onFocus={() => setFocusedField('certificateNumber')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View className={styles.inputRow}>
            <Text className={classnames(styles.inputLabel, styles.required)}>封存到期日</Text>
            <View
              className={classnames(styles.inputWrapper, styles.datePicker)}
              onClick={handleDateSelect}
            >
              <Text
                className={classnames(
                  styles.inputField,
                  !storageExpiryDate && styles.placeholder
                )}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                {storageExpiryDate ? formatDate(storageExpiryDate) : '点击选择封存到期日'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {evaluation && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>状态判定</Text>
          <View
            className={classnames(
              styles.statusCard,
              statusClass(evaluation.status)
            )}
          >
            <View className={styles.statusHeader}>
              <Text className={styles.statusIcon}>{statusIcon(evaluation.status)}</Text>
              <StatusBadge status={evaluation.status} />
            </View>
            <Text className={styles.statusRemark}>{evaluation.remark}</Text>
          </View>
        </View>
      )}

      <View className={styles.bottomBar}>
        <Button className={styles.btnCancel} onClick={handleCancel}>
          取消
        </Button>
        <Button
          className={styles.btnConfirm}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          确认入库
        </Button>
      </View>
    </View>
  );
};

export default InboundPage;
