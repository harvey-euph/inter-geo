import {
  COUNTRY_LABEL_CENTROIDS,
  GLOBAL_TEXT_LAYERS,
  GLOBAL_TEXT_LAYERS_BY_ID,
  getCombinedTextOverlay
} from './globalLayers';

export {
  COUNTRY_LABEL_CENTROIDS,
  GLOBAL_TEXT_LAYERS as INTERNATIONAL_TEXT_LAYERS,
  GLOBAL_TEXT_LAYERS as INTERNATIONAL_TEXT_FILTERS,
  GLOBAL_TEXT_LAYERS_BY_ID as INTERNATIONAL_TEXT_LAYERS_BY_ID,
  GLOBAL_TEXT_LAYERS_BY_ID as INTERNATIONAL_TEXT_FILTERS_BY_ID,
  getCombinedTextOverlay
};

export interface InternationalImageLayerDef {
  /** Unique layer identifier */
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

export type InternationalImageFilterDef = InternationalImageLayerDef;

export const INTERNATIONAL_IMAGE_LAYERS: InternationalImageLayerDef[] = [
  {
    id: 'pedestrian-crossing',
    nameZh: '人行道告示',
    nameEn: 'Pedestrian Crossing Signs',
    shortBadge: '🚸 人行道告示',
    descriptionZh: '顯示歐洲各國行人穿越道告示牌特色（斑馬線條數、行人走向、圖標邊框顏色）',
    accentColor: '#38bdf8'
  }
];
export const INTERNATIONAL_IMAGE_FILTERS = INTERNATIONAL_IMAGE_LAYERS;

export const INTERNATIONAL_IMAGE_LAYERS_BY_ID = new Map<string, InternationalImageLayerDef>(
  INTERNATIONAL_IMAGE_LAYERS.map((f) => [f.id, f])
);
export const INTERNATIONAL_IMAGE_FILTERS_BY_ID = INTERNATIONAL_IMAGE_LAYERS_BY_ID;
