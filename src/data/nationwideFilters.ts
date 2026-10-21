/**
 * Nationwide Filters Registry (國內專屬濾鏡)
 *
 * Surfaced ONLY when the user is at L2 zoom and the target country
 * is actively within the viewport.
 */

export interface NationwideFilterDef {
  /** Unique filter identifier */
  id: string;
  /** Primary country ISO-2 code or '*' for all viewport-supported countries */
  targetIso2: string;
  /** Multi-country ISO-2 list if applicable */
  targetIso2s?: string[];
  /** Display name in Traditional Chinese */
  nameZh: string;
  /** Display name in English */
  nameEn: string;
  /** Compact button badge text/icon label */
  shortBadge: string;
  /** Tooltip text in Traditional Chinese */
  titleZh: string;
  /** Tooltip text in English */
  titleEn: string;
  /** Accent color when active */
  activeColor: string;
  /** Category layer */
  layerType: 'coloring' | 'text' | 'image' | 'roads';
  /** Optional minimum zoom level before button appears (default: 1.0) */
  minZoomK?: number;
  /** Optional custom bounding box */
  customBBox?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  descriptionZh: string;
}

export const COUNTRIES_WITH_AREA_CODES = ['BR', 'JP', 'FR', 'RU', 'TH', 'ID', 'AU', 'MX', 'AR', 'GB', 'US'];

export const COUNTRIES_WITH_CAPITALS = [
  'US', 'JP', 'BR', 'FR', 'GB', 'DE', 'IT', 'ES', 'IN', 'AU',
  'CA', 'MX', 'AR', 'RU', 'TH', 'ID', 'TW', 'KR', 'PL', 'SE',
  'NO', 'FI', 'PE', 'CL', 'CO'
];

export const NATIONWIDE_FILTERS: NationwideFilterDef[] = [
  // 1. Coloring Layer: Capital Subdivision Highlight
  {
    id: 'nationwide-capital',
    targetIso2: '*',
    targetIso2s: COUNTRIES_WITH_CAPITALS,
    nameZh: '首都所在區域',
    nameEn: 'Capital Subdivision',
    shortBadge: '👑 首都',
    titleZh: '首都所在行政區特別著色 (Capital Region Highlight)',
    titleEn: 'Capital Subdivision Highlight',
    activeColor: '#f59e0b',
    layerType: 'coloring',
    descriptionZh: '特別凸顯標記當前國家之首都所在一級行政區（如東京、華盛頓DC、巴西利亞、巴黎大區、德里、柏林等）'
  },
  // Taiwan Power Pole Coordinate Grid (台電電力座標網格 - 著色/透明方格)
  {
    id: 'taiwan-power-poles',
    targetIso2: 'TW',
    nameZh: '電線桿電力座標',
    nameEn: 'Taipower Pole Grid',
    shortBadge: '⚡ 電力網格',
    titleZh: '台灣電線桿電力圖號座標網格 (Taipower Pole Coordinate Grid)',
    titleEn: 'Taipower Pole Coordinate Grid',
    activeColor: '#3b82f6',
    layerType: 'coloring',
    customBBox: { minX: 824, maxX: 844, minY: 422, maxY: 443 },
    descriptionZh: '台灣電線桿/變電箱藍牌電力座標：首碼字母代表 80km×50km 大分區，後 4 碼數字代表西/南邊界的百分比座標 (00~99)'
  },

  // 2. Text Layer: Domestic Area Codes
  {
    id: 'nationwide-area-codes',
    targetIso2: '*',
    targetIso2s: COUNTRIES_WITH_AREA_CODES,
    nameZh: '國內區域碼',
    nameEn: 'Domestic Area Codes',
    shortBadge: '📞 區碼',
    titleZh: '各邦/都道府縣國內電話區碼 (Domestic Area Codes)',
    titleEn: 'Domestic Area Telephone Codes',
    activeColor: '#10b981',
    layerType: 'text',
    descriptionZh: '顯示當前國家各一級行政區之國內電話區號（巴西 1x~9x、日本 01~09、法國 01~05、泰國 02~07、俄羅斯 495 等）'
  },

  // 3. Image / Road Network Layer: US Highway Systems
  {
    id: 'us-interstates',
    targetIso2: 'US',
    nameZh: '州際公路',
    nameEn: 'Interstate Highways',
    shortBadge: 'I-',
    titleZh: '美國州際公路 (Interstate Highways)',
    titleEn: 'Interstate Highway System',
    activeColor: '#38bdf8',
    layerType: 'roads',
    customBBox: { minX: 50, maxX: 330, minY: 280, maxY: 480 },
    descriptionZh: '美國艾森豪州際公路網，雙位數幹線與三位數環線/支線'
  },
  {
    id: 'us-numbered-routes',
    targetIso2: 'US',
    nameZh: '編號國道',
    nameEn: 'U.S. Numbered Routes',
    shortBadge: 'US',
    titleZh: '美國編號國道 (U.S. Routes)',
    titleEn: 'United States Numbered Highway System',
    activeColor: '#fbbf24',
    layerType: 'roads',
    customBBox: { minX: 50, maxX: 330, minY: 280, maxY: 480 },
    descriptionZh: '美國編號國道系統（US 66、US 101、US 1、US 40 等歷史名路）'
  }
];

export const NATIONWIDE_FILTERS_BY_ID = new Map<string, NationwideFilterDef>(
  NATIONWIDE_FILTERS.map((f) => [f.id, f])
);

/**
 * Returns available nationwide filters for a country visible in viewport
 */
export function getNationwideFiltersForCountry(iso2: string): NationwideFilterDef[] {
  const upper = iso2.toUpperCase();
  return NATIONWIDE_FILTERS.filter(
    (f) =>
      f.targetIso2 === '*' ||
      f.targetIso2 === upper ||
      (f.targetIso2s && f.targetIso2s.includes(upper))
  );
}
