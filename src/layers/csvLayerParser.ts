import {
  getAssignableRegionList,
  type AssignableRegionList
} from './assignableRegions';

export type CsvLoadedTiming = 'init' | 'on-demand';
export type CsvLayerType = 'FillWithColor' | 'TextWithStyle' | 'Text' | 'Image' | 'Special' | 'ExtObject';

export interface ParsedTextStyle {
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  padding?: [number, number];
  rawStyle?: string;
}

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
  defaultStyle?: string;
  goto?: string;
  group?: string;
  legend?: Array<{ key: string; color: string; labelZh: string }>;
  fgb?: string;
  innerGrid?: string;
  targetKeys?: string[];
  [key: string]: unknown;
}

/**
 * Lightweight index entry extracted from the top comment lines of a `.csv` layer file
 */
export interface CsvLayerStub {
  id: string;
  path: string;
  loadedTiming?: CsvLoadedTiming;
  effectiveRange?: string;
  type: CsvLayerType;
  order?: number;
  meta: CsvLayerMetadata;
}

export interface CsvLayerRegistryEntry {
  /** Derived or explicit unique layer ID */
  id: string;
  /** When the CSV data should be loaded (always 'on-demand') */
  loadedTiming: CsvLoadedTiming;
  /** Optional Raw Effective Range string if defined */
  effectiveRange?: string;
  /** Parsed range kind: 'International' or 'Nationwide' */
  rangeKind: 'International' | 'Nationwide';
  /** Target ISO-2 country code ('*' for International, or e.g. 'JP', 'TW', 'US') */
  targetIso2: string;
  /** Target ISO-2 country code list */
  targetIso2s: string[];
  /** Resolved assignable region list for validating and normalizing region-ids */
  assignableList: AssignableRegionList;
  /** Public URL path to the CSV file (e.g. 'layers/global-label/country-code.csv') */
  path: string;
  /** Layer visualization type */
  type: CsvLayerType;
  /** Optional UI metadata from registry columns */
  meta: CsvLayerMetadata;
}

export interface CsvLayerKVRow {
  /** Original region-id written in the CSV */
  regionId: string;
  /** Value (color hex/rgba, text string, image path, or special payload) */
  value: string;
  /** Text string if TextWithStyle */
  text?: string;
  /** Optional custom or inherited style description */
  style?: string;
  /** Parsed CSS style properties */
  parsedStyle?: ParsedTextStyle;
  /** Optional label/note for legend or tooltip */
  label?: string;
  /** All parsed column attributes as a key-value dictionary */
  attributes: Record<string, string>;
  [key: string]: unknown;
}

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
  if (
    norm === 'textwithstyle' ||
    norm === 'text' ||
    norm === 'extobject' ||
    norm === 'badge' ||
    norm === 'label'
  ) {
    return 'TextWithStyle';
  }
  if (norm === 'image' || norm === 'icon' || norm === 'img') return 'Image';
  return 'Special';
}

/**
 * Parses CSS-like style declarations or preset keyword into structured style properties.
 */
export function parseCssStyle(rawStyle?: string, fallbackPreset?: string): ParsedTextStyle {
  const result: ParsedTextStyle = { rawStyle: rawStyle || fallbackPreset };
  const str = (rawStyle || fallbackPreset || '').trim();
  if (!str || str === 'plain') {
    return result;
  }

  // Presets
  if (str === 'badge') {
    result.backgroundColor = 'rgba(15, 23, 42, 0.78)';
    result.borderColor = 'rgba(16, 185, 129, 0.5)';
    result.borderRadius = 4;
    result.fontWeight = 'bold';
    result.fontSize = 13;
    result.color = '#10b981';
    return result;
  }

  if (str === 'grid-letter') {
    result.fontWeight = '800';
    result.fontSize = 24;
    result.color = '#ffffff';
    return result;
  }

  // Single hex/color shorthand (e.g. #0ea5e9 or #10b981)
  if (/^#(?:[0-9a-fA-F]{3,8})$/.test(str)) {
    result.color = str;
    return result;
  }

  // Parse CSS-like declarations: `color: #fff; background: #000; border-radius: 4px;`
  const declarations = str.split(';').map((s) => s.trim()).filter(Boolean);
  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim().toLowerCase();
    const val = decl.slice(colonIdx + 1).trim();

    if (prop === 'color') {
      result.color = val;
    } else if (prop === 'background' || prop === 'background-color') {
      result.backgroundColor = val;
    } else if (prop === 'border-color') {
      result.borderColor = val;
    } else if (prop === 'border') {
      const colorMatch = val.match(/#(?:[0-9a-fA-F]{3,8})|rgba?\([^)]+\)|[a-zA-Z]+/);
      if (colorMatch) result.borderColor = colorMatch[0];
    } else if (prop === 'border-radius') {
      const num = parseInt(val, 10);
      if (!isNaN(num)) result.borderRadius = num;
    } else if (prop === 'font-size') {
      const num = parseInt(val, 10);
      if (!isNaN(num)) result.fontSize = num;
    } else if (prop === 'font-weight') {
      result.fontWeight = val;
    } else if (prop === 'font-family') {
      result.fontFamily = val;
    }
  }

  return result;
}

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
  let styleCol = -1;
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
        else if (key === 'defaultStyle' || key === 'default-style') meta.defaultStyle = val;
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
        normFirst === 'roadid' ||
        normFirst === 'road' ||
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
        let foundRegionCol = false;
        let foundValueCol = false;
        for (let cIdx = 0; cIdx < rawCols.length; cIdx++) {
          const normCol = rawCols[cIdx].toLowerCase().replace(/[\s_-]+/g, '');
          if (
            normCol === 'regionid' ||
            normCol === 'region' ||
            normCol === 'roadid' ||
            normCol === 'road' ||
            normCol === 'iso2' ||
            normCol === 'subdivision' ||
            normCol === 'state'
          ) {
            regionIdCol = cIdx;
            foundRegionCol = true;
          } else if (
            normCol === 'color' ||
            normCol === 'value' ||
            normCol === 'val' ||
            normCol === 'text' ||
            normCol === 'image' ||
            normCol === 'areacode' ||
            normCol === 'ddd' ||
            normCol === 'prefix' ||
            normCol === 'dialing' ||
            normCol === 'phonecode'
          ) {
            valueCol = cIdx;
            foundValueCol = true;
          } else if (normCol === 'code') {
            if (!foundRegionCol && cIdx === 0) {
              regionIdCol = cIdx;
              foundRegionCol = true;
            } else if (!foundValueCol) {
              valueCol = cIdx;
            }
          } else if (
            normCol === 'id' ||
            normCol === 'key' ||
            normCol === 'letter'
          ) {
            if (!foundRegionCol) {
              regionIdCol = cIdx;
              foundRegionCol = true;
            }
          } else if (normCol === 'style') {
            styleCol = cIdx;
          } else if (
            normCol === 'label' ||
            normCol === 'namezh' ||
            normCol === 'nameen' ||
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

    const rawRegionId = (cells[regionIdCol] || cells[0] || '').replace(/^"|"$/g, '').trim();
    const rawValue = (cells[valueCol] || cells[1] || '').replace(/^"|"$/g, '').trim();
    if (!rawRegionId || !rawValue) continue;

    const attributes: Record<string, string> = {};
    for (let cIdx = 0; cIdx < cells.length; cIdx++) {
      const colName = columns[cIdx] || `col${cIdx}`;
      attributes[colName] = (cells[cIdx] || '').replace(/^"|"$/g, '').trim();
    }

    const rawLabel = (
      cells[labelCol] ||
      attributes.label ||
      attributes.nameZh ||
      attributes.subdivisions ||
      cells[2] ||
      ''
    ).replace(/^"|"$/g, '').trim();

    if (assignableList.validIds.size > 0 && !assignableList.isValid(rawRegionId)) {
      invalidRegionIds.push(rawRegionId);
    }

    const rawStyle = attributes.style || (styleCol !== -1 ? (cells[styleCol] || '').replace(/^"|"$/g, '').trim() : undefined) || meta.defaultStyle;
    const parsedStyle = parseCssStyle(rawStyle, meta.defaultStyle);
    const rowText = attributes.text || rawValue;

    const row: CsvLayerKVRow = {
      regionId: rawRegionId,
      value: rawValue,
      text: rowText,
      style: rawStyle,
      parsedStyle,
      label: rawLabel || undefined,
      attributes
    };
    rows.push(row);

    valueMap.set(rawRegionId, rawValue);
    valueMap.set(rawRegionId.toUpperCase(), rawValue);
    rowMap.set(rawRegionId, row);
    rowMap.set(rawRegionId.toUpperCase(), row);

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
