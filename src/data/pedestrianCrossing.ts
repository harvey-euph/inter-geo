/**
 * European Pedestrian Crossing Signs
 *
 * Dynamically queries inter-geo-data's layers/area-feature/pedestrian-crossing.csv
 * via csvLayerRegistry.
 */

import { getCsvLayerById } from '../layers/csvLayerRegistry';

export interface CrossingSignMeta {
  iso2: string;
  nameZh: string;
  nameEn: string;
  imagePath: string;
  stripes: number;
  direction: 'left' | 'right';
  shape: 'blue_square' | 'yellow_diamond' | 'red_triangle' | 'yellow_triangle';
  descriptionZh: string;
}

export const EUROPEAN_CROSSING_SIGNS: Record<string, CrossingSignMeta> = {};

export function getCrossingSign(iso2: string): CrossingSignMeta | null {
  const upper = iso2.toUpperCase();
  const layer = getCsvLayerById('pedestrian-crossing') || getCsvLayerById('eu-pedestrian-crossing');
  if (layer?.data?.rowMap) {
    const row = layer.data.rowMap.get(upper);
    if (row) {
      return {
        iso2: upper,
        nameZh: row.attributes.nameZh || row.label || '',
        nameEn: row.attributes.nameEn || '',
        imagePath: row.value || row.attributes.image || '',
        stripes: parseInt(row.attributes.stripes || '0', 10),
        direction: (row.attributes.direction as 'left' | 'right') || 'left',
        shape: (row.attributes.shape as CrossingSignMeta['shape']) || 'blue_square',
        descriptionZh: row.attributes.descriptionZh || row.label || ''
      };
    }
  }
  return null;
}
