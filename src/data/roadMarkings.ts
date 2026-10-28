/**
 * Worldwide Road Markings Specification
 *
 * Dynamically queries inter-geo-data's layers/fill-region-with-color/road-markings.csv
 * via csvLayerRegistry.
 */

import { getCsvLayerById } from '../layers/csvLayerRegistry';

export interface CountryRoadMarking {
  iso2: string;
  nameZh: string;
  outerColor: string;
  centerColor: string;
  outerType: 'white' | 'yellow' | 'none';
  centerType: 'white' | 'yellow' | 'none';
  summaryZh: string;
  descriptionZh: string;
}

export const ROAD_COLOR_WHITE = '#f1f5f9';
export const ROAD_COLOR_YELLOW = '#f59e0b';

export const ROAD_MARKINGS: Record<string, CountryRoadMarking> = {};

/**
 * Returns road marking color spec for a country, dynamically looked up
 * from the road-markings CSV layer.
 */
export function getCountryRoadMarking(iso2: string): CountryRoadMarking {
  const upper = iso2.toUpperCase();
  const layer = getCsvLayerById('road-markings') || getCsvLayerById('roadMarkings');
  if (layer?.data?.rowMap) {
    const row = layer.data.rowMap.get(upper);
    if (row) {
      const colorSpec = String(row.color || row.value || '');
      let outerColor = ROAD_COLOR_WHITE;
      let centerColor = ROAD_COLOR_WHITE;
      if (colorSpec.includes(':')) {
        const parts = colorSpec.split(':');
        outerColor = parts[0].trim();
        centerColor = (parts[1] || parts[0]).trim();
      } else if (colorSpec) {
        outerColor = colorSpec.trim();
        centerColor = colorSpec.trim();
      }

      const outerType =
        outerColor.toLowerCase().includes('f59e0b') || outerColor.toLowerCase().includes('yellow') ? 'yellow' : 'white';
      const centerType =
        centerColor.toLowerCase().includes('f59e0b') || centerColor.toLowerCase().includes('yellow') ? 'yellow' : 'white';

      return {
        iso2: upper,
        nameZh: row.attributes.nameZh || row.label || upper,
        outerColor,
        centerColor,
        outerType,
        centerType,
        summaryZh: row.label || '道路標線規格',
        descriptionZh: row.attributes.descriptionZh || row.label || '標準道路標線規範。'
      };
    }
  }

  // Default fallback for streetview countries
  return {
    iso2: upper,
    nameZh: upper,
    outerColor: ROAD_COLOR_WHITE,
    centerColor: ROAD_COLOR_WHITE,
    outerType: 'white',
    centerType: 'white',
    summaryZh: '左右白邊線 + 中央白線',
    descriptionZh: '標準全白道路標線。'
  };
}
