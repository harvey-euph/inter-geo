/**
 * Nationwide Layers Registry (國內專屬圖層)
 *
 * Surfaced ONLY when the user is at L2 zoom and the target country
 * is actively within the viewport.
 */

import { ROADS_MANIFEST } from './roadsManifest';
import type { RoadShieldType } from './roadsMeta';
import { findCountry } from './countries';
import { getRegisteredCsvLayers, getCsvLayerById } from '../layers/csvLayerRegistry';

export interface NationwideLayerDef {
  /** Unique layer identifier */
  id: string;
  /** Primary country ISO-2 code or '*' for all viewport-supported countries */
  targetIso2: string;
  /** Multi-country ISO-2 list if applicable */
  targetIso2s?: string[];
  /** Country ISO-2 code for road layers */
  countryIso2?: string;
  /** Road classification if layerType is 'roads' */
  roadClass?: 'Interstate' | 'Federal';
  /** Authentic road shield type for button rendering */
  shieldType?: RoadShieldType;
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
  /** Optional multiple custom bounding boxes (e.g. mainland + islands) */
  customBBoxes?: Array<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }>;
  descriptionZh: string;
}

export type NationwideFilterDef = NationwideLayerDef;

export const COUNTRIES_WITH_AREA_CODES = ['BR', 'JP', 'FR', 'RU', 'TH', 'ID', 'AU', 'MX', 'AR', 'GB', 'US'];

export const COUNTRIES_WITH_CAPITALS = [
  'US', 'JP', 'BR', 'FR', 'GB', 'DE', 'IT', 'ES', 'IN', 'AU',
  'CA', 'MX', 'AR', 'RU', 'TH', 'ID', 'TW', 'KR', 'PL', 'SE',
  'NO', 'FI', 'PE', 'CL', 'CO'
];

export const COUNTRIES_WITH_ROADS = Object.keys(ROADS_MANIFEST);

/**
 * Generates country-specific, authentic road filter buttons with their respective
 * official highway shields (Interstate shield, US route cutout, Autobahn blue sign,
 * Japan green expressway, Taiwan plum blossom, UK motorway, etc.).
 */
export function getRoadLayersForCountry(iso2: string): NationwideLayerDef[] {
  const upper = iso2.toUpperCase();
  const cMeta = findCountry(upper);
  const nameZh = cMeta?.nameZh || upper;

  if (upper === 'US') {
    return [
      {
        id: 'roads-US-interstates',
        countryIso2: 'US',
        targetIso2: 'US',
        roadClass: 'Interstate',
        shieldType: 'interstate',
        nameZh: '美國州際公路',
        nameEn: 'Interstate Highways',
        shortBadge: 'I-',
        titleZh: '美國艾森豪州際公路網 (Interstate Highways)',
        titleEn: 'Interstate Highway System',
        activeColor: '#38bdf8',
        layerType: 'roads',
        customBBoxes: [
          // Conterminous / Mainland United States
          { minX: 150, maxX: 320, minY: 340, maxY: 440 },
          // Hawaii (Interstate H-1, H-2, H-3)
          { minX: 55, maxX: 68, minY: 435, maxY: 448 }
        ],
        descriptionZh: '美國艾森豪州際公路網，雙位數幹線與三位數環線/支線'
      },
      {
        id: 'roads-US-routes',
        countryIso2: 'US',
        targetIso2: 'US',
        roadClass: 'Federal',
        shieldType: 'us-route',
        nameZh: '美國編號國道',
        nameEn: 'U.S. Numbered Routes',
        shortBadge: 'US',
        titleZh: '美國編號國道 (U.S. Routes)',
        titleEn: 'United States Numbered Highway System',
        activeColor: '#fbbf24',
        layerType: 'roads',
        customBBox: { minX: 150, maxX: 320, minY: 340, maxY: 440 },
        descriptionZh: '美國編號國道系統（US 66、US 101、US 1、US 40 等歷史名路）'
      }
    ];
  }

  if (upper === 'DE') {
    return [
      {
        id: 'roads-DE-autobahn',
        countryIso2: 'DE',
        targetIso2: 'DE',
        roadClass: 'Interstate',
        shieldType: 'autobahn',
        nameZh: '德國聯邦高速',
        nameEn: 'Autobahn',
        shortBadge: 'A',
        titleZh: '德國聯邦高速公路 (Bundesautobahn)',
        titleEn: 'German Autobahn Network',
        activeColor: '#38bdf8',
        layerType: 'roads',
        customBBox: { minX: 516, maxX: 542, minY: 310, maxY: 338 },
        descriptionZh: '德國無速限聯邦高速公路網，A1~A9 全國骨幹與二三位數區域線'
      },
      {
        id: 'roads-DE-bundesstrasse',
        countryIso2: 'DE',
        targetIso2: 'DE',
        roadClass: 'Federal',
        shieldType: 'bundesstrasse',
        nameZh: '德國聯邦公路',
        nameEn: 'Bundesstraße',
        shortBadge: 'B',
        titleZh: '德國聯邦公路 (Bundesstraße)',
        titleEn: 'German Federal Highway System',
        activeColor: '#fbbf24',
        layerType: 'roads',
        customBBox: { minX: 516, maxX: 542, minY: 310, maxY: 338 },
        descriptionZh: '德國黃底黑字聯邦公路（B1~B500 等一級國家幹道）'
      }
    ];
  }

  if (upper === 'JP') {
    return [
      {
        id: 'roads-JP-expressway',
        countryIso2: 'JP',
        targetIso2: 'JP',
        roadClass: 'Interstate',
        shieldType: 'jp-expressway',
        nameZh: '日本高速道路',
        nameEn: 'Expressways',
        shortBadge: 'E',
        titleZh: '日本高速自動車國道 (Expressways)',
        titleEn: 'Japan Expressway Network',
        activeColor: '#38bdf8',
        layerType: 'roads',
        customBBox: { minX: 860, maxX: 905, minY: 355, maxY: 410 },
        descriptionZh: '日本綠底高速自動車國道與都市高速道路（E1 東名、E4 東北等）'
      },
      {
        id: 'roads-JP-national',
        countryIso2: 'JP',
        targetIso2: 'JP',
        roadClass: 'Federal',
        shieldType: 'jp-national',
        nameZh: '日本一般國道',
        nameEn: 'National Routes',
        shortBadge: '国',
        titleZh: '日本一般國道 (National Highways)',
        titleEn: 'Japan National Routes System',
        activeColor: '#fbbf24',
        layerType: 'roads',
        customBBox: { minX: 860, maxX: 905, minY: 355, maxY: 410 },
        descriptionZh: '日本藍底倒三角盾牌一般國道（國道 1 號至 507 號幹道）'
      }
    ];
  }

  if (upper === 'TW') {
    return [
      {
        id: 'roads-TW-freeway',
        countryIso2: 'TW',
        targetIso2: 'TW',
        roadClass: 'Interstate',
        shieldType: 'tw-freeway',
        nameZh: '台灣國道高速',
        nameEn: 'Freeways',
        shortBadge: '國',
        titleZh: '台灣國道高速公路 (梅花號誌)',
        titleEn: 'Taiwan National Freeway System',
        activeColor: '#38bdf8',
        layerType: 'roads',
        customBBox: { minX: 833, maxX: 840, minY: 426, maxY: 440 },
        descriptionZh: '台灣梅花標誌國道高速公路（國 1 中山高、國 3 福高、國 5 蔣渭水高等）'
      },
      {
        id: 'roads-TW-provincial',
        countryIso2: 'TW',
        targetIso2: 'TW',
        roadClass: 'Federal',
        shieldType: 'tw-provincial',
        nameZh: '台灣省道幹道',
        nameEn: 'Provincial Highways',
        shortBadge: '台',
        titleZh: '台灣省道公路系統 (盾牌號誌)',
        titleEn: 'Taiwan Provincial Highway System',
        activeColor: '#fbbf24',
        layerType: 'roads',
        customBBox: { minX: 833, maxX: 840, minY: 426, maxY: 440 },
        descriptionZh: '台灣紅藍盾牌省道公路與東西向快速公路（台 1 線、台 9 線、台 61 線等）'
      }
    ];
  }

  if (upper === 'GB') {
    return [
      {
        id: 'roads-GB-motorway',
        countryIso2: 'GB',
        targetIso2: 'GB',
        roadClass: 'Interstate',
        shieldType: 'gb-motorway',
        nameZh: '英國高速公路',
        nameEn: 'Motorways',
        shortBadge: 'M',
        titleZh: '英國高速公路 (Motorways)',
        titleEn: 'United Kingdom Motorway System',
        activeColor: '#38bdf8',
        layerType: 'roads',
        customBBox: { minX: 475, maxX: 506, minY: 295, maxY: 350 },
        descriptionZh: '英國藍底 M 級高速公路網（M1、M4、M6、M25 倫敦外環等）'
      },
      {
        id: 'roads-GB-aroad',
        countryIso2: 'GB',
        targetIso2: 'GB',
        roadClass: 'Federal',
        shieldType: 'gb-aroad',
        nameZh: '英國主要幹道',
        nameEn: 'A-Roads',
        shortBadge: 'A',
        titleZh: '英國主要幹道與主幹線 (A-Roads)',
        titleEn: 'United Kingdom Primary Route Network',
        activeColor: '#fbbf24',
        layerType: 'roads',
        customBBox: { minX: 475, maxX: 506, minY: 295, maxY: 350 },
        descriptionZh: '英國綠底金字 A 級主要幹線（A1、A38、A40 等歷史骨幹）'
      }
    ];
  }

  if (upper === 'FR') {
    return [
      {
        id: 'roads-FR-autoroute',
        countryIso2: 'FR',
        targetIso2: 'FR',
        roadClass: 'Interstate',
        shieldType: 'fr-autoroute',
        nameZh: '法國高速公路',
        nameEn: 'Autoroutes',
        shortBadge: 'A',
        titleZh: '法國高速公路 (Autoroutes)',
        titleEn: 'French Autoroute System',
        activeColor: '#38bdf8',
        layerType: 'roads',
        customBBox: { minX: 485, maxX: 526, minY: 334, maxY: 386 },
        descriptionZh: '法國藍底 A 級高速公路網絡（A1、A6 太陽高速、A8 普羅旺斯等）'
      },
      {
        id: 'roads-FR-national',
        countryIso2: 'FR',
        targetIso2: 'FR',
        roadClass: 'Federal',
        shieldType: 'generic-route',
        nameZh: '法國國家國道',
        nameEn: 'Routes Nationales',
        shortBadge: 'N',
        titleZh: '法國國家國道幹道 (Routes Nationales)',
        titleEn: 'French National Route Network',
        activeColor: '#fbbf24',
        layerType: 'roads',
        customBBox: { minX: 485, maxX: 526, minY: 334, maxY: 386 },
        descriptionZh: '法國紅框 N 級國家幹道公路網絡'
      }
    ];
  }

  // European countries fallback
  const isEurope = ['IT', 'ES', 'NL', 'BE', 'PL', 'AT', 'CH', 'CZ', 'PT', 'SE', 'NO', 'FI', 'DK'].includes(upper);

  return [
    {
      id: `roads-${upper}-expressway`,
      countryIso2: upper,
      targetIso2: upper,
      roadClass: 'Interstate',
      shieldType: isEurope ? 'e-road' : 'generic-expressway',
      nameZh: `${nameZh}高速公路`,
      nameEn: 'Expressways',
      shortBadge: isEurope ? 'E' : 'EXP',
      titleZh: `${nameZh}主要高速公路與快速道路網`,
      titleEn: `${cMeta?.name || upper} Expressway & Highway Network`,
      activeColor: '#38bdf8',
      layerType: 'roads',
      descriptionZh: `${nameZh}的主要封閉式高速公路與快速道路幹線`
    },
    {
      id: `roads-${upper}-primary`,
      countryIso2: upper,
      targetIso2: upper,
      roadClass: 'Federal',
      shieldType: 'generic-route',
      nameZh: `${nameZh}主要幹道`,
      nameEn: 'Primary Routes',
      shortBadge: 'RT',
      titleZh: `${nameZh}國家編號公路與主要幹道`,
      titleEn: `${cMeta?.name || upper} Primary National Highway Network`,
      activeColor: '#fbbf24',
      layerType: 'roads',
      descriptionZh: `${nameZh}的一級主要幹道與編號公路系統`
    }
  ];
}

export const BASE_NATIONWIDE_FILTERS: NationwideFilterDef[] = [
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

  // 2. Text Layers: Domestic Area Codes (individually controllable per country)
  ...COUNTRIES_WITH_AREA_CODES.map((iso2): NationwideFilterDef => {
    const country = findCountry(iso2);
    const countryName = country?.name || iso2;
    const countryNameZh = country?.nameZh || iso2;
    return {
      id: `area-codes-${iso2}`,
      targetIso2: iso2,
      nameZh: `${countryNameZh}國內區域碼`,
      nameEn: `${countryName} Domestic Area Codes`,
      shortBadge: `📞 ${iso2} 區碼`,
      titleZh: `${countryNameZh}各一級行政區國內電話區碼`,
      titleEn: `${countryName} Domestic Area Codes`,
      activeColor: '#10b981',
      layerType: 'text',
      descriptionZh: `顯示${countryNameZh}各一級行政區之國內電話區號`
    };
  }),

  // 3. Dynamically registered Nationwide CSV Layers
  ...getRegisteredCsvLayers()
    .filter((f) => f.rangeKind === 'Nationwide')
    .map(
      (f): NationwideLayerDef => ({
        id: f.id,
        targetIso2: f.targetIso2,
        targetIso2s: f.targetIso2s,
        nameZh: f.nameZh,
        nameEn: f.nameEn,
        shortBadge: f.shortBadge,
        titleZh: f.descriptionZh,
        titleEn: f.nameEn,
        activeColor: f.accentColor,
        layerType:
          f.type === 'FillWithColor'
            ? 'coloring'
            : f.type === 'Image'
              ? 'image'
              : 'text',
        descriptionZh: f.descriptionZh
      })
    )
];

export const BASE_NATIONWIDE_LAYERS = BASE_NATIONWIDE_FILTERS;

export const NATIONWIDE_LAYERS: NationwideLayerDef[] = [
  ...BASE_NATIONWIDE_LAYERS
];
export const NATIONWIDE_FILTERS = NATIONWIDE_LAYERS;

/**
 * Complete catalog of all Nationwide layers across all supported countries
 * (used when "Hide outside window ones" is unchecked in the Layer Selector).
 */
export const ALL_NATIONWIDE_LAYERS: NationwideLayerDef[] = [
  ...BASE_NATIONWIDE_LAYERS,
  ...COUNTRIES_WITH_ROADS.flatMap((iso2) => getRoadLayersForCountry(iso2))
];
export const ALL_NATIONWIDE_FILTERS = ALL_NATIONWIDE_LAYERS;

export const NATIONWIDE_LAYERS_BY_ID = new Map<string, NationwideLayerDef>(
  ALL_NATIONWIDE_LAYERS.map((f) => [f.id, f])
);
export const NATIONWIDE_FILTERS_BY_ID = NATIONWIDE_LAYERS_BY_ID;

/**
 * Resolves a nationwide layer definition by ID, dynamically retrieving
 * country-specific highway shield layers when requested.
 */
export function getNationwideLayerById(id: string): NationwideLayerDef | undefined {
  if (NATIONWIDE_LAYERS_BY_ID.has(id)) {
    return NATIONWIDE_LAYERS_BY_ID.get(id);
  }
  if (id.startsWith('roads-')) {
    const parts = id.split('-');
    const iso2 = parts[1];
    if (iso2) {
      const layers = getRoadLayersForCountry(iso2);
      const match = layers.find((f) => f.id === id);
      if (match) {
        NATIONWIDE_LAYERS_BY_ID.set(id, match);
        return match;
      }
    }
  }
  const csvF = getCsvLayerById(id);
  if (csvF) {
    const dynamicDef: NationwideLayerDef = {
      id: csvF.id,
      targetIso2: csvF.targetIso2,
      targetIso2s: csvF.targetIso2s,
      nameZh: csvF.nameZh,
      nameEn: csvF.nameEn,
      shortBadge: csvF.shortBadge || csvF.nameZh,
      titleZh: csvF.descriptionZh,
      titleEn: csvF.nameEn,
      activeColor: csvF.accentColor || '#10b981',
      layerType: 'text',
      descriptionZh: csvF.descriptionZh
    };
    NATIONWIDE_LAYERS_BY_ID.set(id, dynamicDef);
    return dynamicDef;
  }
  return undefined;
}
export const getNationwideFilterById = getNationwideLayerById;

/**
 * Returns available nationwide layers for a country visible in viewport,
 * including country-specific highway shield layers if roads data exists.
 */
export function getNationwideLayersForCountry(iso2: string): NationwideLayerDef[] {
  const upper = iso2.toUpperCase();
  const layers = BASE_NATIONWIDE_LAYERS.filter(
    (f) =>
      f.targetIso2 === '*' ||
      f.targetIso2 === upper ||
      (f.targetIso2s && f.targetIso2s.includes(upper))
  );

  if (COUNTRIES_WITH_ROADS.includes(upper)) {
    layers.push(...getRoadLayersForCountry(upper));
  }

  return layers;
}
export const getNationwideFiltersForCountry = getNationwideLayersForCountry;
export const getRoadFiltersForCountry = getRoadLayersForCountry;
