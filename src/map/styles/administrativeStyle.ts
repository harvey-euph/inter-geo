import type { LayerSpecification } from 'maplibre-gl';
import { MAP_COLORS } from '../theme';

/**
 * Administrative Layer Styles for MapLibre GL JS.
 * Shared across 2D and 3D Globe modes.
 *
 * Strict parity with InterGeo main theme colors:
 * - Solid 1.0 opacity fill for all landmass polygons & layer colors
 * - MAP_COLORS.defaultFill (#232a38)
 * - MAP_COLORS.hovered (#f97316)
 * - MAP_COLORS.selected (#38bdf8)
 * - Crisp black (#000000) ADM0 country borders
 * - Subtle white (rgba(255, 255, 255, 0.22)) ADM1 subdivision borders
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
        ['boolean', ['feature-state', 'hover'], false],
        MAP_COLORS.hovered,
        ['boolean', ['feature-state', 'selected'], false],
        MAP_COLORS.selected,
        ['to-color', ['get', 'fillColor'], MAP_COLORS.defaultFill]
      ],
      'fill-opacity': 1.0
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
        ['boolean', ['feature-state', 'hover'], false],
        MAP_COLORS.hovered,
        ['boolean', ['feature-state', 'selected'], false],
        MAP_COLORS.selected,
        ['to-color', ['get', 'fillColor'], MAP_COLORS.defaultFill]
      ],
      'fill-opacity': 1.0
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
        ['boolean', ['feature-state', 'hover'], false],
        MAP_COLORS.hovered,
        ['boolean', ['feature-state', 'selected'], false],
        MAP_COLORS.selected,
        ['to-color', ['get', 'fillColor'], MAP_COLORS.defaultFill]
      ],
      'fill-opacity': 1.0
    }
  },

  // 4. ADM2 Municipality Inner Boundary (Dual-sided inner stroke)
  {
    id: 'adm2-boundary-inner',
    type: 'line',
    source: 'adm2-source',
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        MAP_COLORS.selected,
        ['boolean', ['feature-state', 'hover'], false],
        '#ffffff',
        ['to-color', ['get', 'boundaryColor'], 'transparent']
      ],
      'line-width': [
        'case',
        ['!=', ['coalesce', ['get', 'boundaryColor'], ''], ''],
        [
          'interpolate',
          ['linear'],
          ['zoom'],
          6,
          2.0,
          10,
          3.6
        ],
        0
      ],
      'line-offset': [
        'case',
        ['!=', ['coalesce', ['get', 'boundaryColor'], ''], ''],
        [
          'interpolate',
          ['linear'],
          ['zoom'],
          6,
          1.0,
          10,
          1.8
        ],
        0
      ],
      'line-opacity': 1.0
    }
  },

  // 5. ADM2 Municipality Boundaries (Center Hairline)
  {
    id: 'adm2-boundary',
    type: 'line',
    source: 'adm2-source',
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        MAP_COLORS.selected,
        ['boolean', ['feature-state', 'hover'], false],
        '#ffffff',
        'rgba(255, 255, 255, 0.15)'
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        1.8,
        ['boolean', ['feature-state', 'hover'], false],
        1.4,
        0.8
      ],
      'line-opacity': 1.0
    }
  },

  // 6. ADM1 Subdivision Inner Boundary (Dual-sided inner stroke)
  {
    id: 'adm1-boundary-inner',
    type: 'line',
    source: 'adm1-source',
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        MAP_COLORS.selected,
        ['boolean', ['feature-state', 'hover'], false],
        '#ffffff',
        ['to-color', ['get', 'boundaryColor'], 'transparent']
      ],
      'line-width': [
        'case',
        ['!=', ['coalesce', ['get', 'boundaryColor'], ''], ''],
        [
          'interpolate',
          ['linear'],
          ['zoom'],
          3,
          2.2,
          8,
          4.4
        ],
        0
      ],
      'line-offset': [
        'case',
        ['!=', ['coalesce', ['get', 'boundaryColor'], ''], ''],
        [
          'interpolate',
          ['linear'],
          ['zoom'],
          3,
          1.1,
          8,
          2.2
        ],
        0
      ],
      'line-opacity': 1.0
    }
  },

  // 7. ADM1 Subdivision Boundaries (Center Hairline)
  {
    id: 'adm1-boundary',
    type: 'line',
    source: 'adm1-source',
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        MAP_COLORS.selected,
        ['boolean', ['feature-state', 'hover'], false],
        '#ffffff',
        'rgba(255, 255, 255, 0.22)'
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        2.0,
        ['boolean', ['feature-state', 'hover'], false],
        1.8,
        1.0
      ],
      'line-opacity': 1.0
    }
  },

  // 8. ADM0 Country Inner Boundary (Dual-sided inner stroke)
  {
    id: 'adm0-boundary-inner',
    type: 'line',
    source: 'adm0-source',
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        MAP_COLORS.selected,
        ['boolean', ['feature-state', 'hover'], false],
        '#ffffff',
        ['to-color', ['get', 'boundaryColor'], 'transparent']
      ],
      'line-width': [
        'case',
        ['!=', ['coalesce', ['get', 'boundaryColor'], ''], ''],
        [
          'interpolate',
          ['linear'],
          ['zoom'],
          1,
          2.6,
          4,
          4.0,
          8,
          5.5
        ],
        0
      ],
      'line-offset': [
        'case',
        ['!=', ['coalesce', ['get', 'boundaryColor'], ''], ''],
        [
          'interpolate',
          ['linear'],
          ['zoom'],
          1,
          1.3,
          4,
          2.0,
          8,
          2.75
        ],
        0
      ],
      'line-opacity': 1.0
    }
  },

  // 9. ADM0 Country Boundaries (Center Hairline)
  {
    id: 'adm0-boundary',
    type: 'line',
    source: 'adm0-source',
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        MAP_COLORS.selected,
        ['boolean', ['feature-state', 'hover'], false],
        '#ffffff',
        '#000000'
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        3.0,
        ['boolean', ['feature-state', 'hover'], false],
        2.5,
        1.4
      ],
      'line-opacity': 1.0
    }
  },

  // 9. External Feature Overlay (e.g. Taiwan Taipower Grid)
  {
    id: 'ext-fill',
    type: 'fill',
    source: 'ext-fill-source',
    paint: {
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        ['to-color', ['get', 'hoverFillColor'], 'rgba(56, 189, 248, 0.45)'],
        ['to-color', ['get', 'fillColor'], 'rgba(56, 189, 248, 0.22)']
      ],
      'fill-opacity': 1.0
    }
  },
  {
    id: 'ext-inner-grid',
    type: 'line',
    source: 'ext-inner-grid-source',
    minzoom: 6.0,
    paint: {
      'line-color': 'rgba(255, 255, 255, 0.35)',
      'line-width': 0.9,
      'line-dasharray': [3, 3]
    }
  },
  {
    id: 'ext-boundary',
    type: 'line',
    source: 'ext-fill-source',
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        '#ffffff',
        ['to-color', ['get', 'borderColor'], '#38bdf8']
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        2.8,
        1.6
      ],
      'line-opacity': 0.95
    }
  },

  // 10. Roads
  {
    id: 'roads-line',
    type: 'line',
    source: 'roads-source',
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#f43f5e',
        ['==', ['get', 'class'], 'Interstate'],
        MAP_COLORS.selected,
        '#fbbf24'
      ],
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        2,
        1.0,
        5,
        1.8,
        8,
        2.5,
        12,
        3.8
      ],
      'line-opacity': 0.95
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
      'text-halo-color': MAP_COLORS.oceanBg,
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
        0.75,
        4,
        1.0,
        7,
        1.25,
        10,
        1.5
      ],
      'icon-allow-overlap': false,
      'icon-ignore-placement': false,
      'icon-padding': 6
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
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      'text-padding': 3
    },
    paint: {
      'text-color': ['to-color', ['get', 'textColor'], '#f8fafc'],
      'text-halo-color': '#020617',
      'text-halo-width': 2.5,
      'text-halo-blur': 0.5
    }
  },

  // 14. External Feature Labels (e.g. Taiwan Taipower Grid Letters A, B, C...)
  {
    id: 'ext-labels-layer',
    type: 'symbol',
    source: 'ext-labels-source',
    layout: {
      'text-field': ['get', 'label'],
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        4,
        14,
        6,
        22,
        8,
        34,
        10,
        48,
        13,
        64
      ],
      'text-anchor': 'center',
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      'text-padding': 2
    },
    paint: {
      'text-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        '#ffffff',
        ['to-color', ['get', 'textColor'], '#ffffff']
      ],
      'text-halo-color': 'rgba(15, 23, 42, 0.92)',
      'text-halo-width': 3.0,
      'text-halo-blur': 0.5
    }
  }
];
