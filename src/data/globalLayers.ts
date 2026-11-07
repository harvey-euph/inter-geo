import type { CountryData } from '../types/geo';
import {
  getRegisteredCsvLayers,
  getCsvLayerValue,
  getCsvLayerById,
  onLayersIndexLoaded
} from '../layers/csvLayerRegistry';

export interface TextLayerDef {
  /** Unique layer identifier */
  id: string;
  /** Display name in Traditional Chinese */
  nameZh: string;
  /** Display name in English */
  nameEn: string;
  /** Compact badge label (e.g. '📞 國碼', '🌐 網域') */
  shortBadge: string;
  /** Description in Traditional Chinese */
  descriptionZh: string;
  /** Theme accent color */
  accentColor: string;
  /** Function to extract text string from country data */
  getText: (country: CountryData) => string | null;
}

import { ADM0_CENTER_ANCHORS } from '../map/geo/adminCenterAnchors';

/**
 * Visual Mainland Geographic Centroid Overrides [Longitude, Latitude].
 * Corrects geometric centroids distorted by far-off polar islands or overseas territories.
 */
export const COUNTRY_LABEL_CENTROIDS: Record<string, [number, number]> = new Proxy(
  {},
  {
    get(_target, prop: string) {
      const clean = prop.toUpperCase();
      if (ADM0_CENTER_ANCHORS[clean]) {
        return ADM0_CENTER_ANCHORS[clean].coordinates;
      }
      return undefined;
    },
    has(_target, prop: string) {
      return prop.toUpperCase() in ADM0_CENTER_ANCHORS;
    },
    ownKeys() {
      return Object.keys(ADM0_CENTER_ANCHORS);
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      const clean = prop.toUpperCase();
      if (clean in ADM0_CENTER_ANCHORS) {
        return {
          enumerable: true,
          configurable: true,
          value: ADM0_CENTER_ANCHORS[clean].coordinates
        };
      }
      return undefined;
    }
  }
);

/**
 * Dynamically builds `GLOBAL_TEXT_LAYERS` from all `International` + `Text` layers
 * registered from CSV files in `/layers/`.
 */
export const GLOBAL_TEXT_LAYERS: TextLayerDef[] = getRegisteredCsvLayers()
  .filter((f) => f.rangeKind === 'International' && (f.type === 'Text' || f.type === 'TextWithStyle'))
  .map((f) => ({
    id: f.id,
    nameZh: f.nameZh,
    nameEn: f.nameEn,
    shortBadge: f.shortBadge,
    descriptionZh: f.descriptionZh,
    accentColor: f.accentColor,
    getText: (c: CountryData) => getCsvLayerValue(f.id, c.iso2)
  }));

export const GLOBAL_TEXT_LAYERS_BY_ID = new Map<string, TextLayerDef>(
  GLOBAL_TEXT_LAYERS.map((f) => [f.id, f])
);

if (typeof window !== 'undefined') {
  onLayersIndexLoaded(() => {
    for (const f of getRegisteredCsvLayers()) {
      if (f.rangeKind === 'International' && (f.type === 'Text' || f.type === 'TextWithStyle')) {
        const def: TextLayerDef = {
          id: f.id,
          nameZh: f.nameZh,
          nameEn: f.nameEn,
          shortBadge: f.shortBadge || f.nameZh,
          descriptionZh: f.descriptionZh,
          accentColor: f.accentColor,
          getText: (c: CountryData) => getCsvLayerValue(f.id, c.iso2)
        };
        GLOBAL_TEXT_LAYERS_BY_ID.set(f.id, def);
      }
    }
  });
}

/**
 * Retrieves a global text layer definition by ID, supporting dynamic CSV registry lookup.
 */
export function getGlobalTextLayerById(id: string): TextLayerDef | undefined {
  const existing = GLOBAL_TEXT_LAYERS_BY_ID.get(id);
  if (existing) return existing;
  const csvF = getCsvLayerById(id);
  if (csvF && (csvF.type === 'Text' || csvF.type === 'TextWithStyle')) {
    const dynamicDef: TextLayerDef = {
      id: csvF.id,
      nameZh: csvF.nameZh,
      nameEn: csvF.nameEn,
      shortBadge: csvF.shortBadge || csvF.nameZh,
      descriptionZh: csvF.descriptionZh,
      accentColor: csvF.accentColor || '#38bdf8',
      getText: (c: CountryData) => getCsvLayerValue(csvF.id, c.iso2)
    };
    GLOBAL_TEXT_LAYERS_BY_ID.set(id, dynamicDef);
    return dynamicDef;
  }
  return undefined;
}

export function getCombinedTextOverlay(country: CountryData, activeLayerIds: Set<string>): string | null {
  const parts: string[] = [];
  for (const id of activeLayerIds) {
    const def = getGlobalTextLayerById(id) || GLOBAL_TEXT_LAYERS_BY_ID.get(id);
    const val = def ? def.getText(country) : getCsvLayerValue(id, country.iso2);
    if (val) parts.push(val);
  }
  return parts.length > 0 ? parts.join('  ') : null;
}
