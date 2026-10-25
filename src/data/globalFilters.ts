import type { CountryData } from '../types/geo';
import {
  getRegisteredCsvFilters,
  getCsvFilterValue
} from '../filters/csvFilterRegistry';

export interface TextFilterDef {
  /** Unique filter identifier (loaded dynamically from filter-reg.csv) */
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
 * Dynamically builds `GLOBAL_TEXT_FILTERS` from all `International` + `Text` filters
 * registered from CSV files in `/layers/`.
 */
export const GLOBAL_TEXT_FILTERS: TextFilterDef[] = getRegisteredCsvFilters()
  .filter((f) => f.rangeKind === 'International' && f.type === 'Text')
  .map((f) => ({
    id: f.id,
    nameZh: f.nameZh,
    nameEn: f.nameEn,
    shortBadge: f.shortBadge,
    descriptionZh: f.descriptionZh,
    accentColor: f.accentColor,
    getText: (c: CountryData) => getCsvFilterValue(f.id, c.iso2)
  }));

export const GLOBAL_TEXT_FILTERS_BY_ID = new Map<string, TextFilterDef>(
  GLOBAL_TEXT_FILTERS.map((f) => [f.id, f])
);

export function getCombinedTextOverlay(country: CountryData, activeFilterIds: Set<string>): string | null {
  const parts: string[] = [];
  for (const id of activeFilterIds) {
    const def = GLOBAL_TEXT_FILTERS_BY_ID.get(id);
    const val = def ? def.getText(country) : getCsvFilterValue(id, country.iso2);
    if (val) parts.push(val);
  }
  return parts.length > 0 ? parts.join('  ') : null;
}
