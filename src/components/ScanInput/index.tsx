import React, { useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import styles from './index.module.scss';

interface ScanInputProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const ScanInput: React.FC<ScanInputProps> = ({
  label,
  value,
  placeholder,
  onChange,
  required = false
}) => {
  const [focused, setFocused] = useState(false);

  const handleScan = async () => {
    try {
      const res = await Taro.scanCode({
        onlyFromCamera: false,
        scanType: ['barCode', 'qrCode']
      });
      if (res.result) {
        onChange(res.result);
        Taro.showToast({ title: '扫码成功', icon: 'success' });
      }
    } catch (error) {
      console.error('[ScanInput] 扫码失败:', error);
      Taro.showToast({ title: '扫码失败，请手动输入', icon: 'none' });
    }
  };

  return (
    <View className={classnames(styles.wrapper, focused && styles.focused)}>
      <View className={styles.labelRow}>
        <Text className={styles.label}>
          {label}
          {required && <Text className={styles.required}> *</Text>}
        </Text>
        <View className={styles.scanBtn} onClick={handleScan}>
          <Text className={styles.scanIcon}>⌖</Text>
          <Text className={styles.scanText}>扫码</Text>
        </View>
      </View>
      <View className={styles.inputContainer}>
        <Input
          className={styles.input}
          value={value}
          placeholder={placeholder || `请输入${label}`}
          placeholderClass={styles.placeholder}
          onInput={(e) => onChange(e.detail.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
};

export default ScanInput;
