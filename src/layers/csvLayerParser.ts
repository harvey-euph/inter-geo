import {
  getAssignableRegionList,
  type AssignableRegionList
} from './assignableRegions';

export type CsvLoadedTiming = 'init' | 'on-demand';
export type CsvLayerType = 'FillWithColor' | 'Text' | 'Image' | 'Special' | 'ExtObject';
export type CsvFilterType = CsvLayerType;

export interface CsvLayerMetadata {
  id?: string;
  nameZh?: string;
  nameEn?: string;
  shortBadge?: string;
  accentColor?: string;
  descriptionZh?: string;
  focusTarget?: string;
  effectiveRange?: string;
  type?: CsvLayerType;
  loadedTiming?: CsvLoadedTiming;
  order?: number;
  defaultColor?: string;
  goto?: string;
  group?: string;
  legend?: Array<{ key: string; color: string; labelZh: string }>;
  fgb?: string;
  innerGrid?: string;
  [key: string]: unknown;
}
export type CsvFilterMetadata = CsvLayerMetadata;

/**
 * Lightweight index entry extracted from the top comment lines of a `.csv` layer file
 */
export interface CsvLayerStub {
  id: string;
  path: string;
  loadedTiming: CsvLoadedTiming;
  effectiveRange: string;
  type: CsvLayerType;
  order?: number;
  meta: CsvLayerMetadata;
}
export type CsvFilterStub = CsvLayerStub;

export interface CsvLayerRegistryEntry {
  /** Derived or explicit unique layer ID */
  id: string;
  /** When the CSV data should be loaded ('init' at startup or 'on-demand' when activated) */
  loadedTiming: CsvLoadedTiming;
  /** Raw Effective Range string (e.g. 'International' or 'Nationwide:JP') */
  effectiveRange: string;
  /** Parsed range kind: 'International' or 'Nationwide' */
  rangeKind: 'International' | 'Nationwide';
  /** Target ISO-2 country code ('*' for International, or e.g. 'JP', 'TW', 'US') */
  targetIso2: string;
  /** Target ISO-2 country code list (supports multi-country Nationwide layers like 'Nationwide:IN|LK|BD') */
  targetIso2s: string[];
  /** Resolved assignable region list for validating and normalizing region-ids */
  assignableList: AssignableRegionList;
  /** Public URL path to the CSV file (e.g. 'layers/country-code.csv') */
  path: string;
  /** Layer visualization type */
  type: CsvLayerType;
  /** Optional UI metadata from registry columns */
  meta: CsvLayerMetadata;
}
export type CsvFilterRegistryEntry = CsvLayerRegistryEntry;

export interface CsvLayerKVRow {
  /** Original region-id written in the CSV */
  regionId: string;
  /** Value (color hex/rgba, text string, image path, or special payload) */
  value: string;
  /** Optional 3rd column label/note for legend or tooltip */
  label?: string;
  /** All parsed column attributes as a key-value dictionary */
  attributes: Record<string, string>;
  [key: string]: unknown;
}
export type CsvFilterKVRow = CsvLayerKVRow;

export interface ParsedCsvLayerData {
  /** Metadata parsed from `// @key: value` header directives inside the CSV */
  meta: CsvLayerMetadata;
  /** Column names from CSV header row */
  columns: string[];
  /** Ordered K-V rows from the CSV */
  rows: CsvLayerKVRow[];
  /** O(1) lookup map from normalized region-id (and its aliases) to value */
  valueMap: Map<string, string>;
  /** O(1) lookup map from normalized region-id to optional 3rd-column label */
  labelMap: Map<string, string>;
  /** O(1) lookup map from normalized region-id to full row object with all attributes */
  rowMap: Map<string, CsvLayerKVRow>;
  /** Region IDs that did not match the assignable list for the layer's Effective Range */
  invalidRegionIds: string[];
}
export type ParsedCsvFilterData = ParsedCsvLayerData;

/**
 * Splits a single CSV line into cells, respecting double-quoted fields and escaped quotes (`""`).
 */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseLoadedTiming(raw: string): CsvLoadedTiming {
  const norm = raw.trim().toLowerCase();
  if (norm === 'init' || norm === 'eager' || norm === 'startup') {
    return 'init';
  }
  return 'on-demand';
}

export function parseLayerType(raw: string): CsvLayerType {
  const norm = raw.trim().toLowerCase();
  if (norm === 'fillwithcolor' || norm === 'fillcolor' || norm === 'fill' || norm === 'color') return 'FillWithColor';
  if (norm === 'text' || norm === 'label' || norm === 'badge') return 'Text';
  if (norm === 'image' || norm === 'icon' || norm === 'img') return 'Image';
  return 'Special';
}
export const parseFilterType = parseLayerType;

/**
 * Parses a layer K-V CSV file (`region-id, color code/text/image path`).
 * Validates each `region-id` against the assignable list corresponding to `effectiveRange`.
 */
export function parseLayerDataCsv(
  csvText: string,
  effectiveRange = 'International'
): ParsedCsvLayerData {
  const assignableList = getAssignableRegionList(effectiveRange);
  const lines = csvText.split(/\r?\n/);

  const meta: CsvLayerMetadata = {};
  const rows: CsvLayerKVRow[] = [];
  const valueMap = new Map<string, string>();
  const labelMap = new Map<string, string>();
  const rowMap = new Map<string, CsvLayerKVRow>();
  const invalidRegionIds: string[] = [];

  let columns: string[] = [];
  let regionIdCol = 0;
  let valueCol = 1;
  let labelCol = 2;
  let hasCheckedHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Parse metadata directives in comments: e.g. `// @id: callingCode` or `# @nameZh: 電話國碼`
    if (rawLine.startsWith('//') || rawLine.startsWith('#')) {
      const directiveMatch = rawLine.match(/^(?:\/\/|#)\s*@([a-zA-Z0-9_-]+)\s*[:=]\s*(.+)$/);
      if (directiveMatch) {
        const key = directiveMatch[1].trim();
        const val = directiveMatch[2].trim();
        if (key === 'id') meta.id = val;
        else if (key === 'nameZh') meta.nameZh = val;
        else if (key === 'nameEn') meta.nameEn = val;
        else if (key === 'shortBadge') meta.shortBadge = val;
        else if (key === 'accentColor') meta.accentColor = val;
        else if (key === 'default-color' || key === 'defaultcolor') meta.defaultColor = val;
        else if (key === 'goto') meta.goto = val;
        else if (key === 'group') meta.group = val;
        else if (key === 'fgb') meta.fgb = val;
        else if (key === 'innerGrid' || key === 'inner-grid') meta.innerGrid = val;
        else if (key === 'descriptionZh') meta.descriptionZh = val;
        else if (key === 'focusTarget') meta.focusTarget = val;
        else if (key === 'effectiveRange' || key === 'range') meta.effectiveRange = val;
        else if (key === 'type') meta.type = parseLayerType(val);
        else if (key === 'loadedTiming' || key === 'timing') meta.loadedTiming = parseLoadedTiming(val);
        else if (key === 'order' || key === 'priority') {
          const n = parseInt(val, 10);
          if (!isNaN(n)) meta.order = n;
        } else if (key === 'legend') {
          const sep = val.includes(':') ? ':' : ',';
          const parts = val.split(sep);
          const color = parts[0].trim();
          const labelZh = parts.slice(1).join(sep).trim();
          if (!meta.legend) meta.legend = [];
          meta.legend.push({ key: color, color, labelZh });
        }
      }
      continue;
    }

    const cells = splitCsvLine(rawLine);
    if (cells.length < 2) continue;

    // Check if first non-comment row is a column header row
    if (!hasCheckedHeader) {
      hasCheckedHeader = true;
      const rawCols = cells.map((c) => c.trim().replace(/^"|"$/g, ''));
      const normFirst = (rawCols[0] || '').toLowerCase().replace(/[\s_-]+/g, '');
      const isHeader =
        normFirst === 'regionid' ||
        normFirst === 'region' ||
        normFirst === 'iso2' ||
        normFirst === 'id' ||
        normFirst === 'key' ||
        normFirst === 'code' ||
        normFirst === 'letter' ||
        rawCols.some((c) =>
          ['color', 'value', 'label', 'namezh', 'nameen', 'examplepolecode', 'subdivisions'].includes(
            c.toLowerCase().replace(/[\s_-]+/g, '')
          )
        );

      if (isHeader) {
        columns = rawCols;
        for (let cIdx = 0; cIdx < rawCols.length; cIdx++) {
          const normCol = rawCols[cIdx].toLowerCase().replace(/[\s_-]+/g, '');
          if (
            normCol === 'regionid' ||
            normCol === 'region' ||
            normCol === 'iso2' ||
            normCol === 'id' ||
            normCol === 'code' ||
            normCol === 'key' ||
            normCol === 'letter'
          ) {
            regionIdCol = cIdx;
          } else if (
            normCol === 'color' ||
            normCol === 'value' ||
            normCol === 'val' ||
            normCol === 'text' ||
            normCol === 'image'
          ) {
            valueCol = cIdx;
          } else if (
            normCol === 'label' ||
            normCol === 'namezh' ||
            normCol === 'desc' ||
            normCol === 'description' ||
            normCol === 'subdivisions'
          ) {
            if (labelCol === 2 || normCol === 'label') {
              labelCol = cIdx;
            }
          }
        }
        continue;
      } else {
        columns = ['regionId', 'value', 'label'];
      }
    }

    const rawRegionId = cells[regionIdCol] || cells[0] || '';
    const rawValue = cells[valueCol] || cells[1] || '';
    if (!rawRegionId || !rawValue) continue;

    const attributes: Record<string, string> = {};
    for (let cIdx = 0; cIdx < cells.length; cIdx++) {
      const colName = columns[cIdx] || `col${cIdx}`;
      attributes[colName] = cells[cIdx];
    }

    const rawLabel =
      cells[labelCol] ||
      attributes.label ||
      attributes.nameZh ||
      attributes.subdivisions ||
      cells[2] ||
      '';

    if (assignableList.validIds.size > 0 && !assignableList.isValid(rawRegionId)) {
      invalidRegionIds.push(rawRegionId);
    }

    const row: CsvLayerKVRow = {
      regionId: rawRegionId,
      value: rawValue,
      label: rawLabel || undefined,
      attributes
    };
    rows.push(row);

    const normalizedKeys = assignableList.normalizeId(rawRegionId);
    for (const k of normalizedKeys) {
      valueMap.set(k, rawValue);
      if (rawLabel) {
        labelMap.set(k, rawLabel);
      }
      rowMap.set(k, row);
    }
  }

  return {
    meta,
    columns,
    rows,
    valueMap,
    labelMap,
    rowMap,
    invalidRegionIds
  };
}
export const parseFilterDataCsv = parseLayerDataCsv;
