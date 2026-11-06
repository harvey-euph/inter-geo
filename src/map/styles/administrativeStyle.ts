import type { LayerSpecification } from 'maplibre-gl';

/**
 * Administrative Layer Styles for MapLibre GL JS.
 * Shared across 2D and 3D Globe modes.
 */
export const administrativeLayers: LayerSpecification[] = [
  // 1. ADM0 Country Fill
  {
    id: 'adm0-fill',
    type: 'fill',
    source: 'adm0-source',
    paint: {
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#f59e0b',
        ['boolean', ['feature-state', 'hover'], false],
        '#38bdf8',
        ['to-color', ['get', 'fillColor'], '#1e293b']
      ],
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        0.75,
        ['boolean', ['feature-state', 'hover'], false],
        0.6,
        0.45
      ]
    }
  },

  // 2. ADM1 Subdivision Fill
  {
    id: 'adm1-fill',
    type: 'fill',
    source: 'adm1-source',
    paint: {
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#f59e0b',
        ['boolean', ['feature-state', 'hover'], false],
        '#38bdf8',
        ['to-color', ['get', 'fillColor'], '#1e293b']
      ],
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        0.75,
        ['boolean', ['feature-state', 'hover'], false],
        0.6,
        0.45
      ]
    }
  },

  // 3. ADM2 Municipality Fill
  {
    id: 'adm2-fill',
    type: 'fill',
    source: 'adm2-source',
    paint: {
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#f59e0b',
        ['boolean', ['feature-state', 'hover'], false],
        '#38bdf8',
        ['to-color', ['get', 'fillColor'], '#1e293b']
      ],
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        0.8,
        ['boolean', ['feature-state', 'hover'], false],
        0.65,
        0.5
      ]
    }
  },

  // 4. ADM2 Municipality Boundaries
  {
    id: 'adm2-boundary',
    type: 'line',
    source: 'adm2-source',
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#fbbf24',
        ['boolean', ['feature-state', 'hover'], false],
        '#67e8f9',
        '#64748b'
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        2.0,
        ['boolean', ['feature-state', 'hover'], false],
        1.5,
        0.8
      ],
      'line-opacity': 0.7
    }
  },

  // 5. ADM1 Subdivision Boundaries
  {
    id: 'adm1-boundary',
    type: 'line',
    source: 'adm1-source',
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#fbbf24',
        ['boolean', ['feature-state', 'hover'], false],
        '#67e8f9',
        '#94a3b8'
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        2.5,
        ['boolean', ['feature-state', 'hover'], false],
        2.0,
        1.2
      ],
      'line-opacity': 0.85
    }
  },

  // 6. ADM0 Country Boundaries
  {
    id: 'adm0-boundary',
    type: 'line',
    source: 'adm0-source',
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#fbbf24',
        ['boolean', ['feature-state', 'hover'], false],
        '#67e8f9',
        '#cbd5e1'
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        3.0,
        ['boolean', ['feature-state', 'hover'], false],
        2.5,
        1.5
      ],
      'line-opacity': 0.95
    }
  },

  // 7. Roads
  {
    id: 'roads-line',
    type: 'line',
    source: 'roads-source',
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#f43f5e',
        '#38bdf8'
      ],
      'line-width': 2.0,
      'line-opacity': 0.8
    }
  },

  // 8. Administrative Labels (Symbol Layer)
  {
    id: 'admin-labels',
    type: 'symbol',
    source: 'admin-labels-source',
    layout: {
      'text-field': ['get', 'displayName'],
      'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        1,
        9,
        4,
        11,
        7,
        14,
        10,
        16
      ],
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
      'text-anchor': 'center',
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-padding': 4
    },
    paint: {
      'text-color': '#f8fafc',
      'text-halo-color': '#090d16',
      'text-halo-width': 1.5
    }
  },

  // 9. Image Markers (e.g. Pedestrian crossing signs, flags)
  {
    id: 'image-markers-layer',
    type: 'symbol',
    source: 'image-markers-source',
    layout: {
      'icon-image': ['get', 'icon'],
      'icon-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        1,
        0.45,
        4,
        0.65,
        7,
        0.85,
        10,
        1.1
      ],
      'icon-allow-overlap': false,
      'icon-ignore-placement': false,
      'icon-padding': 4
    }
  },

  // 10. Text Badges (Calling code, tld, currency, area codes)
  {
    id: 'text-markers-layer',
    type: 'symbol',
    source: 'text-markers-source',
    layout: {
      'text-field': ['get', 'text'],
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        1,
        10,
        4,
        11,
        7,
        13,
        10,
        15
      ],
      'text-anchor': 'center',
      'text-allow-overlap': false,
      'text-ignore-placement': false,
      'text-padding': 3
    },
    paint: {
      'text-color': ['to-color', ['get', 'textColor'], '#f8fafc'],
      'text-halo-color': '#020617',
      'text-halo-width': 2.5,
      'text-halo-blur': 0.5
    }
  }
];
