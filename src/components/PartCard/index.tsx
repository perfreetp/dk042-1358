import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import type { LifePart } from '@/types/part';
import { LIFE_UNIT_LABEL } from '@/types/part';
import StatusBadge from '@/components/StatusBadge';
import { formatDate } from '@/utils/status';
import styles from './index.module.scss';

interface PartCardProps {
  part: LifePart;
  onClick?: () => void;
  showLocation?: boolean;
  highlighted?: boolean;
}

const PartCard: React.FC<PartCardProps> = ({
  part,
  onClick,
  showLocation = true,
  highlighted = false
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.showToast({ title: part.partName || part.partNumber, icon: 'none' });
    }
  };

  return (
    <View
      className={classnames(styles.card, highlighted && styles.highlighted)}
      onClick={handleClick}
    >
      <View className={styles.header}>
        <View className={styles.titleRow}>
          <Text className={styles.partName}>{part.partName || part.partNumber}</Text>
          <StatusBadge status={part.status} size="sm" />
        </View>
        <Text className={styles.partNumber}>件号: {part.partNumber}</Text>
      </View>

      <View className={styles.divider} />

      <View className={styles.infoGrid}>
        <View className={styles.infoItem}>
          <Text className={styles.label}>序号</Text>
          <Text className={styles.value}>{part.serialNumber}</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.label}>批次号</Text>
          <Text className={styles.value}>{part.batchNumber}</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.label}>剩余寿命</Text>
          <Text className={classnames(styles.value, styles.lifeValue)}>
            {part.remainingLife} {LIFE_UNIT_LABEL[part.lifeUnit]}
          </Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.label}>封存到期</Text>
          <Text className={styles.value}>{formatDate(part.storageExpiryDate)}</Text>
        </View>
      </View>

      {showLocation && part.location && (
        <View className={styles.footer}>
          <Text className={styles.locationText}>库位: {part.location}</Text>
          {part.statusRemark && (
            <Text className={styles.remarkText}>{part.statusRemark}</Text>
          )}
        </View>
      )}
    </View>
  );
};

export default PartCard;
