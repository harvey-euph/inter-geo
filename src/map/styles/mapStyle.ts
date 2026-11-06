import type { StyleSpecification } from 'maplibre-gl';

/**
 * Baseline MapLibre Style Specification for InterGeo.
 * Dark theme matching InterGeo's design language.
 */
export const baseMapStyle: StyleSpecification = {
  version: 8,
  name: 'InterGeo Dark Base',
  sources: {
    'adm0-source': {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'feature_id'
    },
    'adm1-source': {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'feature_id'
    },
    'adm2-source': {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'feature_id'
    },
    'roads-source': {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'id'
    },
    'admin-labels-source': {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'feature_id'
    },
    'markers-source': {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'id'
    },
    'text-markers-source': {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    },
    'image-markers-source': {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    }
  },
  sky: {
    'sky-color': '#030712',
    'horizon-color': '#0f172a',
    'fog-color': '#020617'
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#090d16'
      }
    }
  ]
};
