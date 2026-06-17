import { create } from 'zustand';
import Taro from '@tarojs/taro';
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
import { RETURN_REASON_LABEL } from '@/types/part';
import {
  mockParts,
  mockInboundRecords,
  mockOutboundRecords,
  mockReturnRecords,
  mockExceptionRecords
} from '@/data/mockParts';
import { generateId, evaluatePartStatus } from '@/utils/status';

const STORAGE_KEY = 'life_part_store_v1';

interface PersistedState {
  parts: LifePart[];
  inboundRecords: InboundRecord[];
  outboundRecords: OutboundRecord[];
  returnRecords: ReturnRecord[];
  exceptionRecords: ExceptionRecord[];
}

function loadState(): PersistedState | null {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (
      !parsed ||
      !Array.isArray(parsed.parts) ||
      !Array.isArray(parsed.inboundRecords) ||
      !Array.isArray(parsed.outboundRecords) ||
      !Array.isArray(parsed.returnRecords) ||
      !Array.isArray(parsed.exceptionRecords)
    ) {
      return null;
    }
    return parsed;
  } catch (e) {
    console.error('[store] 读取本地缓存失败:', e);
    return null;
  }
}

function saveState(state: PersistedState) {
  try {
    Taro.setStorageSync(
      STORAGE_KEY,
      JSON.stringify({
        parts: state.parts,
        inboundRecords: state.inboundRecords,
        outboundRecords: state.outboundRecords,
        returnRecords: state.returnRecords,
        exceptionRecords: state.exceptionRecords
      })
    );
  } catch (e) {
    console.error('[store] 写入本地缓存失败:', e);
  }
}

interface PartState extends PersistedState {
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
    outboundRecordId: string;
    reason: ReturnReason;
    remark?: string;
    operator: string;
  }) => boolean;

  handleException: (id: string, handler: string, remark: string) => void;

  resetData: () => void;

  getPartById: (id: string) => LifePart | undefined;

  getAvailableParts: () => LifePart[];

  getReturnableOutbounds: () => OutboundRecord[];
}

const persisted = loadState();
const initialState: PersistedState = persisted ?? {
  parts: [...mockParts],
  inboundRecords: [...mockInboundRecords],
  outboundRecords: [...mockOutboundRecords],
  returnRecords: [...mockReturnRecords],
  exceptionRecords: [...mockExceptionRecords]
};

export const usePartStore = create<PartState>((set, get) => ({
  ...initialState,

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
    set((state) => {
      const next = { parts: [newPart, ...state.parts] };
      return next;
    });
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
      workOrder: data.workOrder,
      aircraftReg: data.aircraftReg,
      remainingLife: part.remainingLife,
      lifeUnit: part.lifeUnit,
      certificateNumber: part.certificateNumber,
      storageExpiryDate: part.storageExpiryDate,
      receiver: data.receiver,
      cabinet: data.cabinet,
      withCertificate: data.withCertificate,
      operator: data.operator,
      createTime: now,
      returned: false
    };

    set((state) => ({
      outboundRecords: [record, ...state.outboundRecords],
      parts: state.parts.filter((p) => p.id !== part.id)
    }));
    return true;
  },

  recordReturn: (data) => {
    const { outboundRecords } = get();
    const ob = outboundRecords.find(
      (r) => r.id === data.outboundRecordId && !r.returned
    );
    if (!ob) return false;

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

    const returnRecord: ReturnRecord = {
      id: generateId('rt'),
      outboundRecordId: ob.id,
      partNumber: ob.partNumber,
      serialNumber: ob.serialNumber,
      batchNumber: ob.batchNumber,
      partName: ob.partName,
      reason: data.reason,
      remark: data.remark,
      operator: data.operator,
      createTime: now
    };

    const returnedPart: LifePart = {
      id: generateId('part'),
      partNumber: ob.partNumber,
      serialNumber: ob.serialNumber,
      batchNumber: ob.batchNumber,
      partName: ob.partName,
      remainingLife: ob.remainingLife,
      lifeUnit: ob.lifeUnit,
      certificateNumber: ob.certificateNumber,
      storageExpiryDate: ob.storageExpiryDate,
      status: 'pending',
      statusRemark: `退库待处理（${RETURN_REASON_LABEL[data.reason]}）`,
      location: ob.cabinet,
      createTime: now,
      updateTime: now
    };

    set((state) => ({
      returnRecords: [returnRecord, ...state.returnRecords],
      outboundRecords: state.outboundRecords.map((r) =>
        r.id === ob.id ? { ...r, returned: true, returnTime: now } : r
      ),
      parts: [returnedPart, ...state.parts]
    }));
    return true;
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

  resetData: () => {
    set({
      parts: [...mockParts],
      inboundRecords: [...mockInboundRecords],
      outboundRecords: [...mockOutboundRecords],
      returnRecords: [...mockReturnRecords],
      exceptionRecords: [...mockExceptionRecords]
    });
  },

  getPartById: (id: string) => {
    return get().parts.find((p) => p.id === id);
  },

  getAvailableParts: () => {
    return get().parts.filter((p) => p.status === 'available');
  },

  getReturnableOutbounds: () => {
    return get().outboundRecords.filter((r) => !r.returned);
  }
}));

usePartStore.subscribe((state) => {
  saveState({
    parts: state.parts,
    inboundRecords: state.inboundRecords,
    outboundRecords: state.outboundRecords,
    returnRecords: state.returnRecords,
    exceptionRecords: state.exceptionRecords
  });
});
