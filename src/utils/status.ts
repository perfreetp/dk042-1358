import dayjs from 'dayjs';
import type { PartStatus, LifePart } from '@/types/part';

export function evaluatePartStatus(
  remainingLife: number,
  lifeUnit: 'hour' | 'cycle' | 'day',
  storageExpiryDate: string
): { status: PartStatus; remark: string } {
  const now = dayjs();
  const expiry = dayjs(storageExpiryDate);
  const daysToExpiry = expiry.diff(now, 'day');

  if (daysToExpiry <= 0) {
    return { status: 'unavailable', remark: '封存期已过' };
  }

  if (daysToExpiry <= 30) {
    return { status: 'pending', remark: `封存期剩余${daysToExpiry}天，需工程判定` };
  }

  const lifeThresholds = {
    hour: { low: 50, min: 10 },
    cycle: { low: 100, min: 20 },
    day: { low: 30, min: 7 }
  };

  const threshold = lifeThresholds[lifeUnit];

  if (remainingLife <= threshold.min) {
    return { status: 'unavailable', remark: '剩余寿命不足，不可发料' };
  }

  if (remainingLife <= threshold.low) {
    return { status: 'pending', remark: '剩余寿命偏低，需工程判定' };
  }

  return { status: 'available', remark: '状态正常，可上架发料' };
}

export function checkLifeSufficient(
  remainingLife: number,
  requiredLife: number
): boolean {
  return remainingLife >= requiredLife * 1.2;
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('YYYY-MM-DD');
}

export function daysRemaining(dateStr: string): number {
  return dayjs(dateStr).diff(dayjs(), 'day');
}

export function getStatusColor(status: PartStatus): string {
  const colors = {
    available: '#059669',
    pending: '#D97706',
    unavailable: '#DC2626'
  };
  return colors[status];
}

export function getStatusBgColor(status: PartStatus): string {
  const colors = {
    available: 'rgba(5, 150, 105, 0.1)',
    pending: 'rgba(217, 119, 6, 0.1)',
    unavailable: 'rgba(220, 38, 38, 0.1)'
  };
  return colors[status];
}

export function matchesSearch(part: LifePart, keyword: string): boolean {
  if (!keyword) return true;
  const kw = keyword.toLowerCase().trim();
  return (
    part.partNumber.toLowerCase().includes(kw) ||
    part.serialNumber.toLowerCase().includes(kw) ||
    part.batchNumber.toLowerCase().includes(kw) ||
    (part.partName || '').toLowerCase().includes(kw)
  );
}
