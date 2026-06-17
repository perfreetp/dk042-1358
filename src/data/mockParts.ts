import dayjs from 'dayjs';
import type { LifePart, InboundRecord, OutboundRecord, ReturnRecord, ExceptionRecord } from '@/types/part';

export const mockParts: LifePart[] = [
  {
    id: 'part_001',
    partNumber: 'CFM56-7B-BLB',
    serialNumber: 'SN-2024-00123',
    batchNumber: 'BATCH-2024-015',
    partName: '燃烧室衬套',
    remainingLife: 320,
    lifeUnit: 'hour',
    certificateNumber: 'EASA-2024-01234',
    storageExpiryDate: dayjs().add(180, 'day').format('YYYY-MM-DD'),
    status: 'available',
    statusRemark: '状态正常',
    location: 'A-03-12',
    createTime: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updateTime: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'part_002',
    partNumber: 'CFM56-7B-FAN',
    serialNumber: 'SN-2024-00456',
    batchNumber: 'BATCH-2024-008',
    partName: '风扇叶片组件',
    remainingLife: 45,
    lifeUnit: 'hour',
    certificateNumber: 'FAA-2024-05678',
    storageExpiryDate: dayjs().add(90, 'day').format('YYYY-MM-DD'),
    status: 'pending',
    statusRemark: '剩余寿命偏低，需工程判定',
    location: 'A-02-08',
    createTime: dayjs().subtract(10, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updateTime: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'part_003',
    partNumber: 'B737NG-HYD-01',
    serialNumber: 'SN-2023-09876',
    batchNumber: 'BATCH-2023-112',
    partName: '液压泵',
    remainingLife: 8,
    lifeUnit: 'hour',
    certificateNumber: 'CAAC-2023-09999',
    storageExpiryDate: dayjs().add(60, 'day').format('YYYY-MM-DD'),
    status: 'unavailable',
    statusRemark: '剩余寿命不足，不可发料',
    location: 'B-01-05',
    createTime: dayjs().subtract(30, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updateTime: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'part_004',
    partNumber: 'A320-APU-002',
    serialNumber: 'SN-2024-00789',
    batchNumber: 'BATCH-2024-022',
    partName: 'APU燃油喷嘴',
    remainingLife: 1500,
    lifeUnit: 'cycle',
    certificateNumber: 'EASA-2024-02222',
    storageExpiryDate: dayjs().add(365, 'day').format('YYYY-MM-DD'),
    status: 'available',
    statusRemark: '状态正常',
    location: 'C-04-15',
    createTime: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updateTime: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'part_005',
    partNumber: 'B787-AVIO-015',
    serialNumber: 'SN-2024-01001',
    batchNumber: 'BATCH-2024-030',
    partName: '导航传感器',
    remainingLife: 85,
    lifeUnit: 'cycle',
    certificateNumber: 'FAA-2024-03333',
    storageExpiryDate: dayjs().add(15, 'day').format('YYYY-MM-DD'),
    status: 'pending',
    statusRemark: '封存期剩余15天，需工程判定',
    location: 'D-02-20',
    createTime: dayjs().subtract(20, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updateTime: dayjs().subtract(20, 'day').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'part_006',
    partNumber: 'CFM56-7B-NOZ',
    serialNumber: 'SN-2024-01123',
    batchNumber: 'BATCH-2024-035',
    partName: '燃油喷嘴',
    remainingLife: 2800,
    lifeUnit: 'cycle',
    certificateNumber: 'CAAC-2024-04444',
    storageExpiryDate: dayjs().add(200, 'day').format('YYYY-MM-DD'),
    status: 'available',
    statusRemark: '状态正常',
    location: 'A-05-03',
    createTime: dayjs().subtract(8, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updateTime: dayjs().subtract(8, 'day').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'part_007',
    partNumber: 'B737NG-LDG-008',
    serialNumber: 'SN-2022-05555',
    batchNumber: 'BATCH-2022-090',
    partName: '主轮轴承',
    remainingLife: 45,
    lifeUnit: 'day',
    certificateNumber: 'CAAC-2022-07777',
    storageExpiryDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    status: 'unavailable',
    statusRemark: '封存期已过',
    location: 'E-01-10',
    createTime: dayjs().subtract(100, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updateTime: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'part_008',
    partNumber: 'A320-AIR-025',
    serialNumber: 'SN-2024-01456',
    batchNumber: 'BATCH-2024-042',
    partName: '空调压缩机',
    remainingLife: 18,
    lifeUnit: 'day',
    certificateNumber: 'EASA-2024-05555',
    storageExpiryDate: dayjs().add(45, 'day').format('YYYY-MM-DD'),
    status: 'pending',
    statusRemark: '剩余寿命偏低，需工程判定',
    location: 'B-03-18',
    createTime: dayjs().subtract(15, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updateTime: dayjs().subtract(15, 'day').format('YYYY-MM-DD HH:mm:ss')
  }
];

export const mockInboundRecords: InboundRecord[] = [
  {
    id: 'ib_001',
    partNumber: 'CFM56-7B-BLB',
    serialNumber: 'SN-2024-00123',
    batchNumber: 'BATCH-2024-015',
    partName: '燃烧室衬套',
    remainingLife: 320,
    lifeUnit: 'hour',
    certificateNumber: 'EASA-2024-01234',
    storageExpiryDate: dayjs().add(180, 'day').format('YYYY-MM-DD'),
    status: 'available',
    operator: '张工',
    createTime: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'ib_002',
    partNumber: 'A320-APU-002',
    serialNumber: 'SN-2024-00789',
    batchNumber: 'BATCH-2024-022',
    partName: 'APU燃油喷嘴',
    remainingLife: 1500,
    lifeUnit: 'cycle',
    certificateNumber: 'EASA-2024-02222',
    storageExpiryDate: dayjs().add(365, 'day').format('YYYY-MM-DD'),
    status: 'available',
    operator: '李工',
    createTime: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss')
  }
];

export const mockOutboundRecords: OutboundRecord[] = [
  {
    id: 'ob_001',
    partId: 'part_001',
    partNumber: 'CFM56-7B-BLB',
    serialNumber: 'SN-2024-00123',
    batchNumber: 'BATCH-2024-015',
    partName: '燃烧室衬套',
    workOrder: 'WO-2024-0512-001',
    aircraftReg: 'B-1234',
    remainingLife: 320,
    lifeUnit: 'hour',
    certificateNumber: 'EASA-2024-01234',
    storageExpiryDate: dayjs().add(180, 'day').format('YYYY-MM-DD'),
    receiver: '王师傅',
    cabinet: 'A-03-12',
    withCertificate: true,
    operator: '张工',
    createTime: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    returned: false
  },
  {
    id: 'ob_002',
    partId: 'part_old_002',
    partNumber: 'B737NG-HYD-01',
    serialNumber: 'SN-2023-09876',
    batchNumber: 'BATCH-2023-112',
    partName: '液压泵',
    workOrder: 'WO-2024-0420-008',
    aircraftReg: 'B-5678',
    remainingLife: 8,
    lifeUnit: 'hour',
    certificateNumber: 'CAAC-2023-09999',
    storageExpiryDate: dayjs().add(60, 'day').format('YYYY-MM-DD'),
    receiver: '刘师傅',
    cabinet: 'B-01-05',
    withCertificate: true,
    operator: '李工',
    createTime: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    returned: false
  }
];

export const mockReturnRecords: ReturnRecord[] = [
  {
    id: 'rt_001',
    outboundRecordId: 'ob_old_001',
    partNumber: 'A320-AVIO-020',
    serialNumber: 'SN-2023-04444',
    batchNumber: 'BATCH-2023-060',
    partName: '航向传感器',
    reason: 'fault',
    remark: '输出信号漂移拆下',
    operator: '李工',
    createTime: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss')
  }
];

export const mockExceptionRecords: ExceptionRecord[] = [
  {
    id: 'ex_001',
    type: 'life_low',
    partNumber: 'CFM56-7B-FAN',
    serialNumber: 'SN-2024-00456',
    partName: '风扇叶片组件',
    description: '剩余寿命仅45小时，低于警戒值',
    level: 'medium',
    handled: false,
    createTime: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'ex_002',
    type: 'expiry_near',
    partNumber: 'B787-AVIO-015',
    serialNumber: 'SN-2024-01001',
    partName: '导航传感器',
    description: '封存期剩余15天，即将到期',
    level: 'medium',
    handled: false,
    createTime: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'ex_003',
    type: 'status_abnormal',
    partNumber: 'B737NG-LDG-008',
    serialNumber: 'SN-2022-05555',
    partName: '主轮轴承',
    description: '封存期已过期，请立即隔离',
    level: 'high',
    handled: false,
    createTime: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss')
  },
  {
    id: 'ex_004',
    type: 'life_low',
    partNumber: 'A320-AIR-025',
    serialNumber: 'SN-2024-01456',
    partName: '空调压缩机',
    description: '剩余寿命仅18天，低于警戒值',
    level: 'low',
    handled: true,
    handler: '工程组',
    handleRemark: '已评估可继续使用至到期',
    createTime: dayjs().subtract(15, 'day').format('YYYY-MM-DD HH:mm:ss'),
    handleTime: dayjs().subtract(10, 'day').format('YYYY-MM-DD HH:mm:ss')
  }
];
