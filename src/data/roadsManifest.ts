import {
  getRoadsManifestSync,
  onDataIndexLoaded,
  type RoadCountryManifest
} from './geoIndexClient';

export type { RoadCountryManifest };

export const ROADS_MANIFEST: Record<string, RoadCountryManifest> = {};

function syncRoads() {
  const map = getRoadsManifestSync();
  if (Object.keys(map).length > 0) {
    for (const key of Object.keys(ROADS_MANIFEST)) {
      delete ROADS_MANIFEST[key];
    }
    Object.assign(ROADS_MANIFEST, map);
  }
}

syncRoads();
onDataIndexLoaded(syncRoads);
