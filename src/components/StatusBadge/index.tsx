import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { PartStatus } from '@/types/part';
import { STATUS_LABEL } from '@/types/part';
import styles from './index.module.scss';

interface StatusBadgeProps {
  status: PartStatus;
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  return (
    <View
      className={classnames(
        styles.badge,
        styles[status],
        size === 'sm' && styles.sm
      )}
    >
      <Text className={styles.text}>{STATUS_LABEL[status]}</Text>
    </View>
  );
};

export default StatusBadge;
