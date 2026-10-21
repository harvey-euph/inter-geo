import {
  COUNTRY_CALLING_CODES,
  COUNTRY_LABEL_CENTROIDS,
  GLOBAL_TEXT_FILTERS,
  GLOBAL_TEXT_FILTERS_BY_ID,
  getCountryCallingCode,
  getCombinedTextOverlay
} from './globalFilters';

export {
  COUNTRY_CALLING_CODES,
  COUNTRY_LABEL_CENTROIDS,
  GLOBAL_TEXT_FILTERS as INTERNATIONAL_TEXT_FILTERS,
  GLOBAL_TEXT_FILTERS_BY_ID as INTERNATIONAL_TEXT_FILTERS_BY_ID,
  getCountryCallingCode,
  getCombinedTextOverlay
};

export interface InternationalImageFilterDef {
  /** Unique filter identifier */
  id: 'pedestrian-crossing';
  /** Display name in Traditional Chinese */
  nameZh: string;
  /** Display name in English */
  nameEn: string;
  /** Compact button badge text/icon label */
  shortBadge: string;
  /** Description in Traditional Chinese */
  descriptionZh: string;
  /** Theme accent color */
  accentColor: string;
}

export const INTERNATIONAL_IMAGE_FILTERS: InternationalImageFilterDef[] = [
  {
    id: 'pedestrian-crossing',
    nameZh: '人行道告示',
    nameEn: 'Pedestrian Crossing Signs',
    shortBadge: '🚸 人行道告示',
    descriptionZh: '顯示歐洲各國行人穿越道告示牌特色（斑馬線條數、行人走向、圖標邊框顏色）',
    accentColor: '#38bdf8'
  }
];

export const INTERNATIONAL_IMAGE_FILTERS_BY_ID = new Map<string, InternationalImageFilterDef>(
  INTERNATIONAL_IMAGE_FILTERS.map((f) => [f.id, f])
);
