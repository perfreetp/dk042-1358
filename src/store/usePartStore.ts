import { create } from 'zustand';
import dayjs from 'dayjs';
import type {
  LifePart,
  InboundRecord,
  OutboundRecord,
  ReturnRecord,
  ExceptionRecord,
  PartStatus,
  LifeUnit,
  ReturnReason
} from '@/types/part';
import {
  mockParts,
  mockInboundRecords,
  mockOutboundRecords,
  mockReturnRecords,
  mockExceptionRecords
} from '@/data/mockParts';
import { generateId, evaluatePartStatus } from '@/utils/status';

interface PartState {
  parts: LifePart[];
  inboundRecords: InboundRecord[];
  outboundRecords: OutboundRecord[];
  returnRecords: ReturnRecord[];
  exceptionRecords: ExceptionRecord[];

  addPart: (data: {
    partNumber: string;
    serialNumber: string;
    batchNumber: string;
    partName?: string;
    remainingLife: number;
    lifeUnit: LifeUnit;
    certificateNumber: string;
    storageExpiryDate: string;
  }) => { part: LifePart; status: PartStatus; remark: string };

  recordInbound: (data: {
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
  }) => void;

  recordOutbound: (data: {
    partId: string;
    workOrder?: string;
    aircraftReg?: string;
    receiver: string;
    cabinet: string;
    withCertificate: boolean;
    operator: string;
  }) => boolean;

  recordReturn: (data: {
    partId: string;
    reason: ReturnReason;
    remark?: string;
    operator: string;
  }) => void;

  handleException: (id: string, handler: string, remark: string) => void;

  getPartById: (id: string) => LifePart | undefined;

  getAvailableParts: () => LifePart[];
}

export const usePartStore = create<PartState>((set, get) => ({
  parts: [...mockParts],
  inboundRecords: [...mockInboundRecords],
  outboundRecords: [...mockOutboundRecords],
  returnRecords: [...mockReturnRecords],
  exceptionRecords: [...mockExceptionRecords],

  addPart: (data) => {
    const { status, remark } = evaluatePartStatus(
      data.remainingLife,
      data.lifeUnit,
      data.storageExpiryDate
    );
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const newPart: LifePart = {
      id: generateId('part'),
      ...data,
      status,
      statusRemark: remark,
      createTime: now,
      updateTime: now
    };
    set((state) => ({ parts: [newPart, ...state.parts] }));
    return { part: newPart, status, remark };
  },

  recordInbound: (data) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const record: InboundRecord = {
      id: generateId('ib'),
      ...data,
      createTime: now
    };
    set((state) => ({ inboundRecords: [record, ...state.inboundRecords] }));
  },

  recordOutbound: (data) => {
    const { parts } = get();
    const part = parts.find((p) => p.id === data.partId);
    if (!part) return false;
    if (part.status !== 'available') return false;

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const record: OutboundRecord = {
      id: generateId('ob'),
      partId: part.id,
      partNumber: part.partNumber,
      serialNumber: part.serialNumber,
      batchNumber: part.batchNumber,
      partName: part.partName,
      remainingLife: part.remainingLife,
      lifeUnit: part.lifeUnit,
      ...data,
      operator: data.operator,
      createTime: now
    };

    set((state) => ({
      outboundRecords: [record, ...state.outboundRecords],
      parts: state.parts.filter((p) => p.id !== part.id)
    }));
    return true;
  },

  recordReturn: (data) => {
    const { parts } = get();
    const part = parts.find((p) => p.id === data.partId);
    if (!part) return;

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const record: ReturnRecord = {
      id: generateId('rt'),
      partId: part.id,
      partNumber: part.partNumber,
      serialNumber: part.serialNumber,
      batchNumber: part.batchNumber,
      partName: part.partName,
      reason: data.reason,
      remark: data.remark,
      operator: data.operator,
      createTime: now
    };

    const updatedPart: LifePart = {
      ...part,
      status: 'pending',
      statusRemark: '退库待处理',
      updateTime: now
    };

    set((state) => ({
      returnRecords: [record, ...state.returnRecords],
      parts: state.parts.map((p) => (p.id === part.id ? updatedPart : p))
    }));
  },

  handleException: (id: string, handler: string, remark: string) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    set((state) => ({
      exceptionRecords: state.exceptionRecords.map((ex) =>
        ex.id === id
          ? { ...ex, handled: true, handler, handleRemark: remark, handleTime: now }
          : ex
      )
    }));
  },

  getPartById: (id: string) => {
    return get().parts.find((p) => p.id === id);
  },

  getAvailableParts: () => {
    return get().parts.filter((p) => p.status === 'available');
  }
}));
