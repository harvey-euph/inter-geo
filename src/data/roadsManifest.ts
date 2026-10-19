/**
 * Worldwide Roads & Highway System Manifest
 * Precomputed bounding boxes and country metadata for on-demand viewport loading
 */

export interface RoadCountryManifest {
  iso2: string;
  name: string;
  nameZh: string;
  bbox: { minX: number; maxX: number; minY: number; maxY: number };
  featureCount: number;
}

export const ROADS_MANIFEST: Record<string, RoadCountryManifest> = {
  US: {
    iso2: 'US',
    name: 'United States',
    nameZh: '美國',
    bbox: { minX: 50, maxX: 330, minY: 280, maxY: 480 },
    featureCount: 564
  }
};
