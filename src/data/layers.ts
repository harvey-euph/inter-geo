import type { CountryData, LayerCategory, LegendItem } from '../types/geo';

export interface LayerDefinition {
  id: string;
  category: LayerCategory;
  nameZh: string;
  descriptionZh: string;
  iconName?: string;
  legend: LegendItem[];
  getColor: (country: CountryData) => string | null;
}

export type FilterDefinition = LayerDefinition;

/**
 * All layers are dynamically managed and loaded from CSV files in inter-geo-data.
 * This array is retained for type compatibility only.
 */
export const LAYERS: LayerDefinition[] = [];
export const FILTERS = LAYERS;
