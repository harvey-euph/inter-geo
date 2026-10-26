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

export type TextFilterDef = TextLayerDef;

/**
 * Visual Mainland Centroid Overrides [Mercator X, Mercator Y] on a 1000x1000 canvas.
 * Corrects geometric centroids distorted by far-off polar islands or overseas territories.
 */
export const COUNTRY_LABEL_CENTROIDS: Record<string, [number, number]> = {
  US: [228, 382], // Contiguous 48 States mainland
  CA: [222, 311], // Southern populous Canada
  FR: [506, 354], // Metropolitan France (excluding French Guiana/Reunion)
  NO: [524, 285], // Mainland Norway (excluding Svalbard)
  ES: [490, 379], // Iberian Peninsula (excluding Canary Islands)
  PT: [478, 380], // Mainland Portugal (excluding Azores/Madeira)
  NL: [515, 329], // European Netherlands (excluding Caribbean islands)
  DK: [526, 311], // Mainland Denmark
  NZ: [979, 625], // North & South Island
  MY: [783, 490], // Peninsular Malaysia
  RU: [661, 301], // Central/European Russia
  GB: [494, 321], // Great Britain
  JP: [883, 391], // Honshu
  IT: [535, 371], // Italian Peninsula
  GR: [561, 382], // Mainland Greece
  CL: [303, 599], // Central Chile
  AR: [319, 604], // Central Argentina
  BR: [367, 539], // Central Brazil
  AU: [869, 572], // Central Australia
  ZA: [568, 584]  // South Africa
};

/**
 * Dynamically builds `GLOBAL_TEXT_LAYERS` from all `International` + `Text` layers
 * registered from CSV files in `/layers/`.
 */
export const GLOBAL_TEXT_LAYERS: TextLayerDef[] = getRegisteredCsvLayers()
  .filter((f) => f.rangeKind === 'International' && f.type === 'Text')
  .map((f) => ({
    id: f.id,
    nameZh: f.nameZh,
    nameEn: f.nameEn,
    shortBadge: f.shortBadge,
    descriptionZh: f.descriptionZh,
    accentColor: f.accentColor,
    getText: (c: CountryData) => getCsvLayerValue(f.id, c.iso2)
  }));
export const GLOBAL_TEXT_FILTERS = GLOBAL_TEXT_LAYERS;

export const GLOBAL_TEXT_LAYERS_BY_ID = new Map<string, TextLayerDef>(
  GLOBAL_TEXT_LAYERS.map((f) => [f.id, f])
);
export const GLOBAL_TEXT_FILTERS_BY_ID = GLOBAL_TEXT_LAYERS_BY_ID;

if (typeof window !== 'undefined') {
  onLayersIndexLoaded(() => {
    for (const f of getRegisteredCsvLayers()) {
      if (f.rangeKind === 'International' && f.type === 'Text') {
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
  if (csvF && csvF.type === 'Text') {
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
export const getGlobalTextFilterById = getGlobalTextLayerById;

export function getCombinedTextOverlay(country: CountryData, activeLayerIds: Set<string>): string | null {
  const parts: string[] = [];
  for (const id of activeLayerIds) {
    const def = getGlobalTextLayerById(id) || GLOBAL_TEXT_LAYERS_BY_ID.get(id);
    const val = def ? def.getText(country) : getCsvLayerValue(id, country.iso2);
    if (val) parts.push(val);
  }
  return parts.length > 0 ? parts.join('  ') : null;
}
