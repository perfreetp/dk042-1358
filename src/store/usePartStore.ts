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
  ReturnReason,
  StocktakeRecord,
  StocktakeItem
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

const STORAGE_KEY = 'life_part_store_v2';

export type TimelineEvent =
  | { kind: 'create'; id: string; time: string; title: string; desc: string }
  | { kind: 'inbound'; id: string; time: string; title: string; desc: string; operator: string }
  | { kind: 'outbound'; id: string; time: string; title: string; desc: string; operator: string }
  | { kind: 'return'; id: string; time: string; title: string; desc: string; operator: string }
  | { kind: 'exception'; id: string; time: string; title: string; desc: string; level: 'high' | 'medium' | 'low'; handled: boolean }
  | { kind: 'stocktake'; id: string; time: string; title: string; desc: string; operator: string };

interface PersistedState {
  parts: LifePart[];
  inboundRecords: InboundRecord[];
  outboundRecords: OutboundRecord[];
  returnRecords: ReturnRecord[];
  exceptionRecords: ExceptionRecord[];
  stocktakeRecords: StocktakeRecord[];
  stocktakeItems: StocktakeItem[];
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
    return {
      parts: parsed.parts,
      inboundRecords: parsed.inboundRecords,
      outboundRecords: parsed.outboundRecords,
      returnRecords: parsed.returnRecords,
      exceptionRecords: parsed.exceptionRecords,
      stocktakeRecords: Array.isArray(parsed.stocktakeRecords) ? parsed.stocktakeRecords : [],
      stocktakeItems: Array.isArray(parsed.stocktakeItems) ? parsed.stocktakeItems : []
    };
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
        exceptionRecords: state.exceptionRecords,
        stocktakeRecords: state.stocktakeRecords,
        stocktakeItems: state.stocktakeItems
      })
    );
  } catch (e) {
    console.error('[store] 写入本地缓存失败:', e);
  }
}

interface PartState extends PersistedState {
  highlightedPartId: string | null;
  setHighlightedPartId: (id: string) => void;
  clearHighlightedPartId: () => void;

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
  }) => { success: boolean; returnedPartId?: string };

  handleException: (id: string, handler: string, remark: string) => void;

  resetData: () => void;

  getPartById: (id: string) => LifePart | undefined;

  getAvailableParts: () => LifePart[];

  getReturnableOutbounds: () => OutboundRecord[];

  createStocktake: (data: {
    title?: string;
    locationScope?: string;
    operator: string;
  }) => StocktakeRecord;

  getStocktake: (id: string) => StocktakeRecord | undefined;

  getStocktakeItems: (stocktakeId: string) => StocktakeItem[];

  scanStocktakeItem: (data: {
    stocktakeId: string;
    partNumber?: string;
    serialNumber?: string;
    batchNumber?: string;
    code: string;
  }) => StocktakeItem | null;

  finishStocktake: (id: string, remark?: string) => StocktakeRecord | null;

  getTimelineForPart: (query: { partId?: string; partNumber?: string; serialNumber?: string }) => TimelineEvent[];
}

const persisted = loadState();
const initialState: PersistedState = persisted ?? {
  parts: [...mockParts],
  inboundRecords: [...mockInboundRecords],
  outboundRecords: [...mockOutboundRecords],
  returnRecords: [...mockReturnRecords],
  exceptionRecords: [...mockExceptionRecords],
  stocktakeRecords: [],
  stocktakeItems: []
};

export const usePartStore = create<PartState>((set, get) => ({
  ...initialState,

  highlightedPartId: null,
  setHighlightedPartId: (id) => set({ highlightedPartId: id }),
  clearHighlightedPartId: () => set({ highlightedPartId: null }),

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
    if (!ob) return { success: false };

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
    return { success: true, returnedPartId: returnedPart.id };
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
      exceptionRecords: [...mockExceptionRecords],
      stocktakeRecords: [],
      stocktakeItems: []
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
  },

  createStocktake: (data) => {
    const { parts } = get();
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const title = data.title || `盘点 ${dayjs().format('YYYY-MM-DD HH:mm')}`;

    const scopeParts = data.locationScope
      ? parts.filter(
          (p) =>
            !p.location ||
            p.location.toUpperCase().startsWith(data.locationScope!.toUpperCase())
        )
      : parts;

    const stocktakeId = generateId('st');
    const items: StocktakeItem[] = scopeParts.map((p) => ({
      id: generateId('sti'),
      stocktakeId,
      partId: p.id,
      partNumber: p.partNumber,
      serialNumber: p.serialNumber,
      batchNumber: p.batchNumber,
      partName: p.partName,
      location: p.location,
      scanned: false
    }));

    const record: StocktakeRecord = {
      id: stocktakeId,
      title,
      locationScope: data.locationScope,
      totalCount: items.length,
      scannedCount: 0,
      missingCount: items.length,
      status: 'in_progress',
      operator: data.operator,
      createTime: now
    };

    set((state) => ({
      stocktakeRecords: [record, ...state.stocktakeRecords],
      stocktakeItems: [...items, ...state.stocktakeItems]
    }));
    return record;
  },

  getStocktake: (id) => {
    return get().stocktakeRecords.find((r) => r.id === id);
  },

  getStocktakeItems: (stocktakeId) => {
    return get().stocktakeItems.filter((i) => i.stocktakeId === stocktakeId);
  },

  scanStocktakeItem: (data) => {
    const { stocktakeItems, parts } = get();
    const code = data.code.trim().toLowerCase();

    const items = stocktakeItems.filter((i) => i.stocktakeId === data.stocktakeId);
    if (items.length === 0) return null;

    let found: StocktakeItem | undefined;

    for (const item of items) {
      if (item.scanned) continue;
      if (
        (data.partNumber && item.partNumber.toLowerCase() === data.partNumber.toLowerCase()) ||
        (data.serialNumber && item.serialNumber.toLowerCase() === data.serialNumber.toLowerCase()) ||
        (data.batchNumber && item.batchNumber.toLowerCase() === data.batchNumber.toLowerCase())
      ) {
        found = item;
        break;
      }
      if (
        item.partNumber.toLowerCase() === code ||
        item.serialNumber.toLowerCase() === code ||
        item.batchNumber.toLowerCase() === code
      ) {
        found = item;
        break;
      }
    }

    if (!found) {
      // 扫到一个不在盘点范围的件（可能是当前盘库外的在库件）
      const loosePart =
        parts.find(
          (p) =>
            p.partNumber.toLowerCase() === code ||
            p.serialNumber.toLowerCase() === code ||
            p.batchNumber.toLowerCase() === code
        ) || null;
      if (!loosePart) return null;
      const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
      const extra: StocktakeItem = {
        id: generateId('sti'),
        stocktakeId: data.stocktakeId,
        partId: loosePart.id,
        partNumber: loosePart.partNumber,
        serialNumber: loosePart.serialNumber,
        batchNumber: loosePart.batchNumber,
        partName: loosePart.partName,
        location: loosePart.location,
        scanned: true,
        scanTime: now,
        remark: '盘外发现件'
      };
      set((state) => {
        const updatedItems = [extra, ...state.stocktakeItems];
        const stItems = updatedItems.filter((i) => i.stocktakeId === data.stocktakeId);
        const scannedCount = stItems.filter((i) => i.scanned).length;
        const totalCount = stItems.length;
        return {
          stocktakeItems: updatedItems,
          stocktakeRecords: state.stocktakeRecords.map((r) =>
            r.id === data.stocktakeId
              ? {
                  ...r,
                  totalCount,
                  scannedCount,
                  missingCount: Math.max(0, totalCount - scannedCount)
                }
              : r
          )
        };
      });
      return extra;
    }

    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const updated = { ...found, scanned: true, scanTime: now };
    set((state) => {
      const newItems = state.stocktakeItems.map((i) =>
        i.id === found!.id ? updated : i
      );
      const stItems = newItems.filter((i) => i.stocktakeId === data.stocktakeId);
      const scannedCount = stItems.filter((i) => i.scanned).length;
      const totalCount = stItems.length;
      return {
        stocktakeItems: newItems,
        stocktakeRecords: state.stocktakeRecords.map((r) =>
          r.id === data.stocktakeId
            ? {
                ...r,
                totalCount,
                scannedCount,
                missingCount: Math.max(0, totalCount - scannedCount)
              }
            : r
        )
      };
    });
    return updated;
  },

  finishStocktake: (id: string, remark?: string) => {
    const { stocktakeItems } = get();
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const items = stocktakeItems.filter((i) => i.stocktakeId === id);
    const scannedCount = items.filter((i) => i.scanned).length;
    const totalCount = items.length;
    const missingCount = Math.max(0, totalCount - scannedCount);

    let updatedRecord: StocktakeRecord | null = null;
    set((state) => {
      const records = state.stocktakeRecords.map((r) => {
        if (r.id !== id) return r;
        const merged: StocktakeRecord = {
          ...r,
          totalCount,
          scannedCount,
          missingCount,
          status: 'completed',
          finishTime: now,
          remark: remark || r.remark
        };
        updatedRecord = merged;
        return merged;
      });
      return { stocktakeRecords: records };
    });
    return updatedRecord;
  },

  getTimelineForPart: (query) => {
    const state = get();
    const events: TimelineEvent[] = [];

    const partNumber = query.partNumber;
    const serialNumber = query.serialNumber;
    const part =
      (query.partId && state.parts.find((p) => p.id === query.partId)) ||
      state.parts.find(
        (p) =>
          (partNumber ? p.partNumber === partNumber : true) &&
          (serialNumber ? p.serialNumber === serialNumber : true)
      );

    if (part) {
      events.push({
        kind: 'create',
        id: `c-${part.id}`,
        time: part.createTime,
        title: '入库建档',
        desc: `${part.partName || part.partNumber} 录入系统 · 初始状态：${RETURN_REASON_LABEL[0] || ''}`.slice(0, 60)
      });
    }

    state.inboundRecords.forEach((r) => {
      if (partNumber && r.partNumber !== partNumber) return;
      if (serialNumber && r.serialNumber !== serialNumber) return;
      events.push({
        kind: 'inbound',
        id: `ib-${r.id}`,
        time: r.createTime,
        title: '入库完成',
        desc: `件号 ${r.partNumber} · 序号 ${r.serialNumber} · 批次 ${r.batchNumber}`,
        operator: r.operator
      });
    });

    state.outboundRecords.forEach((r) => {
      if (partNumber && r.partNumber !== partNumber) return;
      if (serialNumber && r.serialNumber !== serialNumber) return;
      events.push({
        kind: 'outbound',
        id: `ob-${r.id}`,
        time: r.createTime,
        title: '出库发料',
        desc: `${r.workOrder || r.aircraftReg || '无关联'} · 领料 ${r.receiver} · 发料 ${r.cabinet}${
          r.returned ? ' · 已退库' : ''
        }`,
        operator: r.operator
      });
    });

    state.returnRecords.forEach((r) => {
      if (partNumber && r.partNumber !== partNumber) return;
      if (serialNumber && r.serialNumber !== serialNumber) return;
      events.push({
        kind: 'return',
        id: `rt-${r.id}`,
        time: r.createTime,
        title: `退库 · ${RETURN_REASON_LABEL[r.reason]}`,
        desc: r.remark || '退回待处理',
        operator: r.operator
      });
    });

    state.exceptionRecords.forEach((r) => {
      if (partNumber && r.partNumber !== partNumber) return;
      if (serialNumber && r.serialNumber !== serialNumber) return;
      events.push({
        kind: 'exception',
        id: `ex-${r.id}`,
        time: r.createTime,
        title: r.handled ? '异常已处理' : '异常告警',
        desc: r.description + (r.handler ? ` · 处理：${r.handler}` : ''),
        level: r.level,
        handled: r.handled
      });
    });

    state.stocktakeItems.forEach((si) => {
      if (partNumber && si.partNumber !== partNumber) return;
      if (serialNumber && si.serialNumber !== serialNumber) return;
      const st = state.stocktakeRecords.find((r) => r.id === si.stocktakeId);
      if (!st) return;
      events.push({
        kind: 'stocktake',
        id: `st-${st.id}-${si.id}`,
        time: si.scanTime || st.createTime,
        title: `盘点 · ${st.title}`,
        desc: si.scanned ? '已核对' : '存在差异（未扫到）',
        operator: st.operator
      });
    });

    events.sort((a, b) => (a.time < b.time ? 1 : -1));
    return events;
  }
}));

usePartStore.subscribe((state) => {
  saveState({
    parts: state.parts,
    inboundRecords: state.inboundRecords,
    outboundRecords: state.outboundRecords,
    returnRecords: state.returnRecords,
    exceptionRecords: state.exceptionRecords,
    stocktakeRecords: state.stocktakeRecords,
    stocktakeItems: state.stocktakeItems
  });
});
