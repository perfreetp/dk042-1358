export interface ParsedLabel {
  partNumber?: string;
  serialNumber?: string;
  batchNumber?: string;
  partName?: string;
  raw: string;
  matched: boolean;
}

const PART_NUMBER_KEYS = ['p/n', 'pn', 'partno', 'partno', 'partnumber', '件号', '件号', '零件号'];
const SERIAL_NUMBER_KEYS = ['s/n', 'sn', 'serialno', 'serialnumber', 'serial', '序号', '序列号'];
const BATCH_NUMBER_KEYS = ['b/n', 'bn', 'batchno', 'batchnumber', 'batch', 'lot', '批次号', '批号'];
const PART_NAME_KEYS = ['name', 'desc', 'description', 'partname', '名称', '品名'];

const ALL_KEYS = [
  ...PART_NUMBER_KEYS,
  ...SERIAL_NUMBER_KEYS,
  ...BATCH_NUMBER_KEYS,
  ...PART_NAME_KEYS
];

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[\s_-]/g, '');
}

function buildKeyMap(): Record<string, 'partNumber' | 'serialNumber' | 'batchNumber' | 'partName'> {
  const map: Record<string, 'partNumber' | 'serialNumber' | 'batchNumber' | 'partName'> = {};
  PART_NUMBER_KEYS.forEach((k) => (map[normalizeKey(k)] = 'partNumber'));
  SERIAL_NUMBER_KEYS.forEach((k) => (map[normalizeKey(k)] = 'serialNumber'));
  BATCH_NUMBER_KEYS.forEach((k) => (map[normalizeKey(k)] = 'batchNumber'));
  PART_NAME_KEYS.forEach((k) => (map[normalizeKey(k)] = 'partName'));
  return map;
}

const KEY_MAP = buildKeyMap();

function tryJson(raw: string): ParsedLabel | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    const obj = JSON.parse(trimmed);
    const src: Record<string, unknown> =
      Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'object'
        ? (obj[0] as Record<string, unknown>)
        : (obj as Record<string, unknown>);
    const result: ParsedLabel = { raw, matched: false };
    for (const [k, v] of Object.entries(src)) {
      const field = KEY_MAP[normalizeKey(k)];
      if (field && typeof v === 'string' && v.trim()) {
        (result[field] as string) = v.trim();
        result.matched = true;
      }
    }
    return result.matched ? result : null;
  } catch {
    return null;
  }
}

function tryKeyValue(raw: string): ParsedLabel | null {
  const separators = /[;,\n\r|]+/;
  const segments = raw.split(separators).map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return null;

  const result: ParsedLabel = { raw, matched: false };
  const keyPattern = new RegExp(
    `^(${ALL_KEYS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*[:：=]\\s*(.+)$`,
    'i'
  );

  for (const seg of segments) {
    const m = seg.match(keyPattern);
    if (m) {
      const field = KEY_MAP[normalizeKey(m[1])];
      if (field) {
        (result[field] as string) = m[2].trim();
        result.matched = true;
      }
    }
  }
  return result.matched ? result : null;
}

function tryPositional(raw: string): ParsedLabel | null {
  const segments = raw.split(/[|,\n\r;]+/).map((s) => s.trim()).filter(Boolean);
  if (segments.length < 2) return null;
  const result: ParsedLabel = {
    raw,
    partNumber: segments[0],
    serialNumber: segments[1],
    batchNumber: segments[2],
    matched: segments.length >= 2
  };
  return result;
}

export function parsePackagingLabel(raw: string): ParsedLabel {
  const cleaned = (raw || '').trim();
  if (!cleaned) {
    return { raw: '', matched: false };
  }

  const jsonResult = tryJson(cleaned);
  if (jsonResult) return jsonResult;

  const kvResult = tryKeyValue(cleaned);
  if (kvResult) return kvResult;

  const posResult = tryPositional(cleaned);
  if (posResult) return posResult;

  return { raw: cleaned, matched: false };
}
