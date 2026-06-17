export type PartStatus = 'available' | 'pending' | 'unavailable';

export type LifeUnit = 'hour' | 'cycle' | 'day';

export type ReturnReason = 'life_expired' | 'fault' | 'wrong_delivery' | 'for_repair';

export type TransactionType = 'inbound' | 'outbound' | 'return';

export interface LifePart {
  id: string;
  partNumber: string;
  serialNumber: string;
  batchNumber: string;
  partName?: string;
  remainingLife: number;
  lifeUnit: LifeUnit;
  certificateNumber: string;
  storageExpiryDate: string;
  status: PartStatus;
  statusRemark?: string;
  location?: string;
  createTime: string;
  updateTime: string;
}

export interface InboundRecord {
  id: string;
  partNumber: string;
  serialNumber: string;
  batchNumber: string;
  partName?: string;
  remainingLife: number;
  lifeUnit: LifeUnit;
  certificateNumber: string;
  storageExpiryDate: string;
  status: PartStatus;
  operator: string;
  createTime: string;
}

export interface OutboundRecord {
  id: string;
  partId: string;
  partNumber: string;
  serialNumber: string;
  batchNumber: string;
  partName?: string;
  workOrder?: string;
  aircraftReg?: string;
  remainingLife: number;
  lifeUnit: LifeUnit;
  receiver: string;
  cabinet: string;
  withCertificate: boolean;
  operator: string;
  createTime: string;
}

export interface ReturnRecord {
  id: string;
  partId: string;
  partNumber: string;
  serialNumber: string;
  batchNumber: string;
  partName?: string;
  reason: ReturnReason;
  remark?: string;
  operator: string;
  createTime: string;
}

export interface ExceptionRecord {
  id: string;
  type: 'life_low' | 'status_abnormal' | 'expiry_near';
  partNumber: string;
  serialNumber: string;
  partName?: string;
  description: string;
  level: 'high' | 'medium' | 'low';
  handled: boolean;
  handler?: string;
  handleRemark?: string;
  createTime: string;
  handleTime?: string;
}

export const LIFE_UNIT_LABEL: Record<LifeUnit, string> = {
  hour: '小时',
  cycle: '循环',
  day: '天'
};

export const STATUS_LABEL: Record<PartStatus, string> = {
  available: '可用',
  pending: '待工程判定',
  unavailable: '不可发料'
};

export const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
  life_expired: '正常寿命到限',
  fault: '故障拆下',
  wrong_delivery: '错发退回',
  for_repair: '待送修'
};
