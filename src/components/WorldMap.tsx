import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { geoMercator, geoPath, geoArea } from 'd3-geo';
import * as topojson from 'topojson-client';
import type { Topology, Objects } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import { ZoomIn, ZoomOut, RotateCcw, Compass, Phone } from 'lucide-react';
import type { CountryData } from '../types/geo';
import { FILTERS } from '../data/filters';
import type { FilterDefinition } from '../data/filters';
import { findCountry } from '../data/countries';
import { getLODLevel, LOD_LEVEL_ORDER } from '../types/lod';
import type { LODLevel, PrefectureDetail, MunicipalityDetail } from '../types/lod';
import { JAPAN_PREFECTURES } from '../data/japanData';
import { PrecisionHUD } from './PrecisionHUD';

interface WorldMapProps {
  activeFilterId: string;
  isFilterExpanded?: boolean;
  selectedCountry: CountryData | null;
  onSelectCountry: (country: CountryData | null) => void;
  selectedPrefecture?: PrefectureDetail | null;
  onSelectPrefecture?: (pref: PrefectureDetail | null) => void;
  selectedMunicipality?: MunicipalityDetail | null;
  onSelectMunicipality?: (muni: MunicipalityDetail | null) => void;
  hoveredCountry: CountryData | null;
  setHoveredCountry: (country: CountryData | null) => void;
  zoomToPrefectureRef?: React.MutableRefObject<((prefId: number) => void) | null>;
}

type GeoFeature = Feature<Geometry, { name: string }> & { id: string };

// Region centers in local Mercator coordinates (W=1000, H=1000)
interface RegionPreset {
  nameZh: string;
  cx: number;
  cy: number;
  zoomMultiplier: number;
}

const REGION_PRESETS: Record<string, RegionPreset> = {
  world: { nameZh: '全球', cx: 500, cy: 450, zoomMultiplier: 1.0 },
  europe: { nameZh: '歐洲', cx: 542, cy: 330, zoomMultiplier: 2.8 },
  asia: { nameZh: '亞洲', cx: 764, cy: 396, zoomMultiplier: 2.2 },
  americas: { nameZh: '美洲', cx: 264, cy: 458, zoomMultiplier: 1.8 },
  africa: { nameZh: '非洲', cx: 556, cy: 494, zoomMultiplier: 2.0 },
  oceania: { nameZh: '大洋洲', cx: 889, cy: 572, zoomMultiplier: 2.4 }
};

// Base map dimensions (Standard Web Mercator square)
const MAP_W = 1000;
const MAP_H = 1000;
const MERCATOR_SCALE = MAP_W / (2 * Math.PI); // 159.15494309

// World copies rendered side-by-side for infinite continuous periodic wrapping
const WORLD_COPIES = [-1, 0, 1, 2, 3];

// Safeguard to ensure any inverted polygon winding (which causes D3 to project the entire globe) is corrected
function normalizeFeatureWinding<P>(feature: Feature<Geometry, P>): Feature<Geometry, P> {
  if (!feature.geometry) return feature;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const area = geoArea(feature as any);
    if (area > 2 * Math.PI) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geom = feature.geometry as any;
      if (geom.type === 'Polygon') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geom.coordinates = geom.coordinates.map((ring: any) => ring.slice().reverse());
      } else if (geom.type === 'MultiPolygon') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geom.coordinates = geom.coordinates.map((poly: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (geoArea({ type: 'Polygon', coordinates: poly } as any) > 2 * Math.PI) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return poly.map((ring: any) => ring.slice().reverse());
          }
          return poly;
        });
      }
    }
  } catch {
    // fallback gracefully
  }
  return feature;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  activeFilterId,
  isFilterExpanded = false,
  selectedCountry,
  onSelectCountry,
  selectedPrefecture,
  onSelectPrefecture,
  selectedMunicipality,
  onSelectMunicipality,
  hoveredCountry,
  setHoveredCountry,
  zoomToPrefectureRef
}) => {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [japanPrefectureFeatures, setJapanPrefectureFeatures] = useState<Feature<Geometry, { id: number; nam: string; nam_ja: string }>[]>([]);
  const [japanMunicipalityFeatures, setJapanMunicipalityFeatures] = useState<Feature<Geometry, { code: string; pref: string; city: string; gun?: string }>[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState('world');

  // Level of Detail (LOD) tracking: L1 (Country), L2 (Prefecture), L3 (Municipality)
  const [lodLevel, setLodLevel] = useState<LODLevel>('L1');
  const [maxLODLevel, setMaxLODLevel] = useState<LODLevel>('L3');
  const [zoomK, setZoomK] = useState<number>(1.0);

  // Sub-national hover states
  const [hoveredPrefecture, setHoveredPrefecture] = useState<PrefectureDetail | null>(null);
  const [hoveredMunicipality, setHoveredMunicipality] = useState<MunicipalityDetail | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Store container dimensions
  const viewportSize = useRef({ w: 1200, h: 800 });

  // Transform stored in ref for direct 120fps GPU manipulation
  const transformRef = useRef({ k: 1, x: 0, y: 0 });
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStart = useRef({ clientX: 0, clientY: 0, x: 0, y: 0 });
  const rafId = useRef<number | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  // Active filter definition
  const activeFilterDef = useMemo<FilterDefinition>(() => {
    return FILTERS.find((f) => f.id === activeFilterId) || FILTERS[0];
  }, [activeFilterId]);

  // Periodic horizontal wrap: ensures x is always continuously periodic within [-worldW, 0)
  const wrapX = useCallback((rawX: number, k: number) => {
    const worldW = MAP_W * k;
    if (worldW <= 0) return 0;
    return ((rawX % worldW) + worldW) % worldW - worldW;
  }, []);

  // Strict vertical clamping: map edges stick flush to top (North Pole) and bottom (South Pole)
  const clampY = useCallback((rawY: number, k: number, vh: number) => {
    const worldH = MAP_H * k;
    const minY = vh - worldH;
    const maxY = 0;
    if (minY >= maxY) return 0; // If map is exactly flush or smaller
    return Math.min(maxY, Math.max(minY, rawY));
  }, []);

  // Apply GPU hardware-accelerated transform directly to SVG group element
  const applyTransform = useCallback((animate = false) => {
    if (!gRef.current) return;
    const { k, x, y } = transformRef.current;
    if (animate) {
      gRef.current.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    } else {
      gRef.current.style.transition = 'none';
    }
    gRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${k})`;
  }, []);

  // Set up Web Mercator Projection
  const projection = useMemo(() => {
    return geoMercator()
      .scale(MERCATOR_SCALE)
      .translate([MAP_W / 2, MAP_H / 2]);
  }, []);

  const pathGenerator = useMemo(() => {
    return geoPath().projection(projection);
  }, [projection]);

  // Pre-calculate paths for L1 Countries
  const countryPathData = useMemo(() => {
    return features.map((feature) => {
      const pathD = pathGenerator(feature) || '';
      const countryMeta = findCountry(feature.id) || findCountry(feature.properties?.name);
      return {
        pathD,
        countryMeta,
        id: feature.id,
        name: feature.properties?.name || 'Unknown'
      };
    });
  }, [features, pathGenerator]);

  // Pre-calculate paths for L2 Japan 47 Prefectures (都道府縣)
  const prefecturePathData = useMemo(() => {
    return japanPrefectureFeatures.map((feature) => {
      const pathD = pathGenerator(feature) || '';
      const prefId = Number(feature.properties?.id);
      const prefMeta = JAPAN_PREFECTURES[prefId];
      let centroid: [number, number] = [882, 392];
      try {
        const c = pathGenerator.centroid(feature);
        if (c && !isNaN(c[0]) && !isNaN(c[1])) {
          centroid = c;
        }
      } catch {
        // fallback
      }

      return {
        pathD,
        prefMeta,
        id: prefId,
        nameJa: feature.properties?.nam_ja || prefMeta?.nameJa || '',
        nameEn: feature.properties?.nam || prefMeta?.nameEn || '',
        centroid
      };
    });
  }, [japanPrefectureFeatures, pathGenerator]);

  // Pre-calculate paths for L3 Japan 1906 Municipalities (市區町村)
  const municipalityPathData = useMemo(() => {
    return japanMunicipalityFeatures.map((feature) => {
      const pathD = pathGenerator(feature) || '';
      const code = String(feature.properties?.code || feature.id || '');
      const pref = String(feature.properties?.pref || '');
      const city = String(feature.properties?.city || '');
      const gun = String(feature.properties?.gun || '');
      return {
        pathD,
        code,
        pref,
        city,
        gun
      };
    });
  }, [japanMunicipalityFeatures, pathGenerator]);

  // Load TopoJSON datasets (L1 World, L2 Japan Prefectures, L3 Japan Municipalities)
  useEffect(() => {
    let isMounted = true;

    // 1. Load L1 World Countries
    fetch('/data/countries-110m.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load map data');
        return res.json();
      })
      .then((topology: Topology<Objects>) => {
        if (!isMounted) return;
        const countriesGeo = topojson.feature(
          topology,
          topology.objects.countries
        ) as unknown as { features: GeoFeature[] };
        if (countriesGeo && countriesGeo.features) {
          setFeatures(countriesGeo.features);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('L1 Map loading error:', err);
      });

    // 2. Load L2 Japan 47 Prefectures
    fetch('/data/japan-prefectures.json')
      .then((res) => res.json())
      .then((topology: Topology<Objects>) => {
        if (!isMounted) return;
        const prefsGeo = topojson.feature(
          topology,
          topology.objects.japan
        ) as unknown as { features: Feature<Geometry, { id: number; nam: string; nam_ja: string }>[] };
        if (prefsGeo && prefsGeo.features) {
          const sanitized = prefsGeo.features.map(normalizeFeatureWinding);
          setJapanPrefectureFeatures(sanitized);
        }
      })
      .catch((err) => {
        console.warn('L2 Prefectures loading notice:', err);
      });

    // 3. Load L3 Japan Municipalities
    fetch('/data/japan-municipalities.json')
      .then((res) => res.json())
      .then((topology: Topology<Objects>) => {
        if (!isMounted) return;
        const munisGeo = topojson.feature(
          topology,
          topology.objects.municipalities
        ) as unknown as { features: Feature<Geometry, { code: string; pref: string; city: string; gun?: string }>[] };
        if (munisGeo && munisGeo.features) {
          const sanitized = munisGeo.features.map(normalizeFeatureWinding);
          setJapanMunicipalityFeatures(sanitized);
        }
      })
      .catch((err) => {
        console.warn('L3 Municipalities loading notice:', err);
      });

    return () => {
      isMounted = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // Update container size on resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          viewportSize.current = { w: width, h: height };

          const kMin = height / MAP_H;
          const currentK = transformRef.current.k;
          const newK = Math.max(currentK, kMin);
          transformRef.current.k = newK;

          transformRef.current.y = clampY(transformRef.current.y, newK, height);
          transformRef.current.x = wrapX(transformRef.current.x, newK);
          applyTransform(false);
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [clampY, wrapX, applyTransform]);

  // Initial map positioning once loaded
  useEffect(() => {
    if (!loading && containerRef.current) {
      const vh = containerRef.current.clientHeight || 800;
      const vw = containerRef.current.clientWidth || 1200;
      viewportSize.current = { w: vw, h: vh };

      const kMin = vh / MAP_H;
      const initialK = Math.max(kMin, 1.0);
      transformRef.current.k = initialK;

      const initialX = wrapX(vw / 2 - (MAP_W / 2) * initialK, initialK);
      const initialY = clampY((vh - MAP_H * initialK) / 2, initialK, vh);

      transformRef.current.x = initialX;
      transformRef.current.y = initialY;
      setZoomK(Number(initialK.toFixed(1)));
      setLodLevel(getLODLevel(initialK, maxLODLevel));
      applyTransform(false);
    }
  }, [loading, wrapX, clampY, applyTransform, maxLODLevel]);

  // Zoom directly into a prefecture at L3 (called from Drawer)
  useEffect(() => {
    if (zoomToPrefectureRef) {
      zoomToPrefectureRef.current = (prefId: number) => {
        const target = prefecturePathData.find((p) => p.id === prefId);
        if (target) {
          const [cx, cy] = target.centroid;
          const targetK = 7.8;
          const vh = viewportSize.current.h;
          const vw = viewportSize.current.w;
          const targetX = vw / 2 - cx * targetK;
          const targetY = vh / 2 - cy * targetK;

          transformRef.current.k = targetK;
          transformRef.current.x = wrapX(targetX, targetK);
          transformRef.current.y = clampY(targetY, targetK, vh);

          setZoomK(Number(targetK.toFixed(1)));
          setMaxLODLevel('L3');
          setLodLevel('L3');
          applyTransform(true);
        }
      };
    }
  }, [zoomToPrefectureRef, prefecturePathData, wrapX, clampY, applyTransform]);

  // Mouse Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    hasDragged.current = false;
    dragStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      x: transformRef.current.x,
      y: transformRef.current.y
    };

    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'none';
    }
    if (hoveredCountry) setHoveredCountry(null);
    if (hoveredPrefecture) setHoveredPrefecture(null);
    if (hoveredMunicipality) setHoveredMunicipality(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };

    if (isDragging.current) {
      const dx = e.clientX - dragStart.current.clientX;
      const dy = e.clientY - dragStart.current.clientY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDragged.current = true;
      }

      const rawX = dragStart.current.x + dx;
      const rawY = dragStart.current.y + dy;

      const k = transformRef.current.k;
      const vh = viewportSize.current.h;

      // Continuous periodic horizontal wrapping
      transformRef.current.x = wrapX(rawX, k);
      // Strict vertical clamping: sticks flush to container borders
      transformRef.current.y = clampY(rawY, k, vh);

      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          applyTransform(false);
          rafId.current = null;
        });
      }

      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }
      if (hoveredCountry) setHoveredCountry(null);
      if (hoveredPrefecture) setHoveredPrefecture(null);
      if (hoveredMunicipality) setHoveredMunicipality(null);
      return;
    }

    // Verify if pointer is directly over a country, prefecture, or municipality path
    const target = e.target as Element | null;
    const isOverShape = Boolean(
      target?.classList &&
      (target.classList.contains('country-path') ||
       target.classList.contains('prefecture-path') ||
       target.classList.contains('municipality-path'))
    );

    if (!isOverShape) {
      if (hoveredCountry) setHoveredCountry(null);
      if (hoveredPrefecture) setHoveredPrefecture(null);
      if (hoveredMunicipality) setHoveredMunicipality(null);
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }
      return;
    }

    // Direct DOM tooltip update
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'flex';
      tooltipRef.current.style.left = `${e.clientX}px`;
      tooltipRef.current.style.top = `${e.clientY - 12}px`;
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  };

  // Wheel zoom centered on mouse pointer with Level of Detail (LOD) tracking
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { k, x, y } = transformRef.current;
    const vh = viewportSize.current.h;
    const kMin = vh / MAP_H;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newK = Math.min(Math.max(k * zoomFactor, kMin), 14);

    // Zoom anchored to mouse position
    const ratio = newK / k;
    const newX = mx - (mx - x) * ratio;
    const newY = my - (my - y) * ratio;

    transformRef.current.k = newK;
    transformRef.current.x = wrapX(newX, newK);
    transformRef.current.y = clampY(newY, newK, vh);

    const nextLOD = getLODLevel(newK, maxLODLevel);
    if (nextLOD !== lodLevel) {
      setLodLevel(nextLOD);
    }
    setZoomK(Number(newK.toFixed(1)));

    applyTransform(false);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 1.35 : 0.74;
    const { k, x, y } = transformRef.current;
    const vh = viewportSize.current.h;
    const vw = viewportSize.current.w;
    const kMin = vh / MAP_H;
    const newK = Math.min(Math.max(k * factor, kMin), 14);

    const cx = vw / 2;
    const cy = vh / 2;
    const newX = cx - (cx - x) * (newK / k);
    const newY = cy - (cy - y) * (newK / k);

    transformRef.current.k = newK;
    transformRef.current.x = wrapX(newX, newK);
    transformRef.current.y = clampY(newY, newK, vh);

    const nextLOD = getLODLevel(newK, maxLODLevel);
    if (nextLOD !== lodLevel) {
      setLodLevel(nextLOD);
    }
    setZoomK(Number(newK.toFixed(1)));

    applyTransform(true);
  };

  const handleResetZoom = () => {
    const vh = viewportSize.current.h;
    const vw = viewportSize.current.w;
    const kMin = vh / MAP_H;

    transformRef.current.k = kMin;
    transformRef.current.x = wrapX(vw / 2 - (MAP_W / 2) * kMin, kMin);
    transformRef.current.y = clampY((vh - MAP_H * kMin) / 2, kMin, vh);

    setActiveRegion('world');
    setZoomK(Number(kMin.toFixed(1)));
    setLodLevel(getLODLevel(kMin, maxLODLevel));
    applyTransform(true);
  };

  // Draggable continuous slider zoom adjustment
  const handleSliderZoom = useCallback(
    (targetK: number) => {
      const { k, x, y } = transformRef.current;
      const vh = viewportSize.current.h;
      const vw = viewportSize.current.w;
      const kMin = vh / MAP_H;
      const newK = Math.min(Math.max(targetK, kMin), 14);

      const cx = vw / 2;
      const cy = vh / 2;
      const ratio = newK / k;
      const newX = cx - (cx - x) * ratio;
      const newY = cy - (cy - y) * ratio;

      transformRef.current.k = newK;
      transformRef.current.x = wrapX(newX, newK);
      transformRef.current.y = clampY(newY, newK, vh);

      const nextLOD = getLODLevel(newK, maxLODLevel);
      if (nextLOD !== lodLevel) {
        setLodLevel(nextLOD);
      }
      setZoomK(Number(newK.toFixed(1)));
      applyTransform(false);
    },
    [wrapX, clampY, applyTransform, lodLevel, maxLODLevel]
  );

  // Set maximum allowed LOD level (最細層級限制)
  const handleSetMaxLOD = (level: LODLevel) => {
    setMaxLODLevel(level);
    const currentK = transformRef.current.k;
    const nextLOD = getLODLevel(currentK, level);
    setLodLevel(nextLOD);
  };

  // One-click Jump to specific Level of Detail (LOD)
  const handleJumpToLOD = (targetLevel: LODLevel) => {
    const vh = viewportSize.current.h;
    const vw = viewportSize.current.w;
    const kMin = vh / MAP_H;

    let targetK = 1.0;
    let cx = MAP_W / 2;
    let cy = MAP_H / 2;

    if (targetLevel === 'L1') {
      targetK = Math.max(kMin, 1.0);
      cx = MAP_W / 2;
      cy = MAP_H / 2;
    } else if (targetLevel === 'L2') {
      targetK = 4.2;
      cx = 882.0; // Center of Japan
      cy = 392.0;
    } else if (targetLevel === 'L3') {
      targetK = 7.8;
      cx = 888.2; // Tokyo & Kanto Region
      cy = 393.7;
    }

    const targetX = vw / 2 - cx * targetK;
    const targetY = vh / 2 - cy * targetK;

    transformRef.current.k = targetK;
    transformRef.current.x = wrapX(targetX, targetK);
    transformRef.current.y = clampY(targetY, targetK, vh);

    setZoomK(Number(targetK.toFixed(1)));
    // If jumping to higher level than current max, elevate max to respect user intent
    if (LOD_LEVEL_ORDER[targetLevel] > LOD_LEVEL_ORDER[maxLODLevel]) {
      setMaxLODLevel(targetLevel);
    }
    setLodLevel(targetLevel);
    applyTransform(true);
  };

  const handleSelectRegion = (key: string) => {
    const preset = REGION_PRESETS[key];
    if (!preset) return;
    setActiveRegion(key);

    const vh = viewportSize.current.h;
    const vw = viewportSize.current.w;
    const kMin = vh / MAP_H;
    const targetK = Math.max(kMin * preset.zoomMultiplier, preset.zoomMultiplier);

    const targetX = vw / 2 - preset.cx * targetK;
    const targetY = vh / 2 - preset.cy * targetK;

    transformRef.current.k = targetK;
    transformRef.current.x = wrapX(targetX, targetK);
    transformRef.current.y = clampY(targetY, targetK, vh);

    setZoomK(Number(targetK.toFixed(1)));
    setLodLevel(getLODLevel(targetK, maxLODLevel));
    applyTransform(true);
  };

  // Color fill resolver
  const getCountryFill = useCallback(
    (countryMeta: CountryData | undefined, isHovered: boolean, isSelected: boolean) => {
      if (isHovered) return '#38bdf8';
      if (isSelected) return '#f59e0b';

      if (!countryMeta) {
        return '#1a1f2b';
      }

      const filterColor = activeFilterDef.getColor(countryMeta);
      return filterColor || '#232a38';
    },
    [activeFilterDef]
  );

  return (
    <div
      ref={containerRef}
      className="svg-map-wrapper"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onMouseLeave={() => {
        isDragging.current = false;
        if (hoveredCountry) setHoveredCountry(null);
        if (hoveredPrefecture) setHoveredPrefecture(null);
        if (hoveredMunicipality) setHoveredMunicipality(null);
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
      }}
      onClick={(e) => {
        if (hasDragged.current) return;
        const target = e.target as Element | null;
        if (target?.closest('.map-controls, .region-presets, .filter-legend-card, .precision-hud')) {
          return;
        }
        onSelectCountry(null);
        if (onSelectPrefecture) onSelectPrefecture(null);
        if (onSelectMunicipality) onSelectMunicipality(null);
      }}
    >
      {loading ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            color: '#38bdf8',
            fontSize: 14
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid rgba(56, 189, 248, 0.2)',
              borderTopColor: '#38bdf8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>正在載入世界高精度向量圖資...</span>
        </div>
      ) : (
        <svg
          ref={svgRef}
          className="world-svg"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          {/* Map Group with Direct GPU CSS Transform */}
          <g
            ref={gRef}
            style={{
              transformOrigin: '0 0',
              willChange: 'transform'
            }}
          >
            {/* Seamless ocean backdrop across all periodic world cycles */}
            <rect
              x={-2 * MAP_W}
              y={0}
              width={7 * MAP_W}
              height={MAP_H}
              fill="#0b0e14"
              onMouseEnter={() => {
                if (hoveredCountry) setHoveredCountry(null);
                if (hoveredPrefecture) setHoveredPrefecture(null);
                if (hoveredMunicipality) setHoveredMunicipality(null);
                if (tooltipRef.current) tooltipRef.current.style.display = 'none';
              }}
              onClick={() => {
                if (!hasDragged.current) {
                  onSelectCountry(null);
                  if (onSelectPrefecture) onSelectPrefecture(null);
                  if (onSelectMunicipality) onSelectMunicipality(null);
                }
              }}
            />

            {/* Continuous periodic world copies */}
            {WORLD_COPIES.map((copyIdx) => (
              <g key={copyIdx} transform={`translate(${copyIdx * MAP_W}, 0)`}>
                {/* 1. L1 Layer: Countries (Japan is replaced at L2 & L3 for higher precision) */}
                {countryPathData.map(({ pathD, countryMeta, id, name }) => {
                  if (!pathD) return null;
                  const isJapan = String(id) === '392' || name === 'Japan' || countryMeta?.id === '392';
                  if (isJapan && lodLevel !== 'L1') return null;

                  const isHovered =
                    hoveredCountry &&
                    (hoveredCountry.id === countryMeta?.id ||
                      (countryMeta && hoveredCountry.iso2 === countryMeta.iso2));
                  const isSelected =
                    selectedCountry &&
                    (selectedCountry.id === countryMeta?.id ||
                      (countryMeta && selectedCountry.iso2 === countryMeta.iso2));

                  const fillColor = getCountryFill(countryMeta, !!isHovered, !!isSelected);

                  return (
                    <path
                      key={`${copyIdx}-${id || name}`}
                      d={pathD}
                      className={`country-path ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
                      fill={fillColor}
                      onMouseEnter={(e) => {
                        if (isDragging.current) return;
                        mousePos.current = { x: e.clientX, y: e.clientY };
                        setHoveredPrefecture(null);
                        setHoveredMunicipality(null);
                        if (countryMeta) {
                          setHoveredCountry(countryMeta);
                        } else {
                          setHoveredCountry({
                            id: String(id),
                            iso2: '',
                            iso3: '',
                            name,
                            nameZh: name,
                            flag: '🌐',
                            continent: 'Asia',
                            region: '無官方街景覆蓋',
                            drivingSide: 'right',
                            coverage: 'none',
                            cameraGens: [],
                            plateType: 'white',
                            plateDesc: '無街景',
                            roadLines: ['white_dashed'],
                            roadLinesDesc: '無街景',
                            carMeta: ['none'],
                            carMetaDesc: '無街景',
                            poleDesc: '無資料',
                            bollardDesc: '無資料',
                            language: '當地語言',
                            tld: '',
                            keyHints: ['此地區目前尚無 Google 街景官方車載覆蓋。']
                          });
                        }
                        if (tooltipRef.current) {
                          tooltipRef.current.style.display = 'flex';
                          tooltipRef.current.style.left = `${e.clientX}px`;
                          tooltipRef.current.style.top = `${e.clientY - 12}px`;
                        }
                      }}
                      onMouseLeave={() => {
                        if (isDragging.current) return;
                        if (hoveredCountry) {
                          setHoveredCountry(null);
                        }
                        if (tooltipRef.current) {
                          tooltipRef.current.style.display = 'none';
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasDragged.current) return;
                        if (countryMeta) {
                          onSelectCountry(countryMeta);
                          if (onSelectPrefecture) onSelectPrefecture(null);
                          if (onSelectMunicipality) onSelectMunicipality(null);
                        } else {
                          onSelectCountry(null);
                        }
                      }}
                    />
                  );
                })}

                {/* 2. L2 Layer: Japan 47 都道府縣 (Prefectures) High-Precision Outlines */}
                {lodLevel === 'L2' &&
                  prefecturePathData.map(({ pathD, prefMeta, id, nameJa, nameEn }) => {
                    if (!pathD) return null;
                    const isHovered = hoveredPrefecture && hoveredPrefecture.id === id;
                    const isSelected = selectedPrefecture && selectedPrefecture.id === id;

                    // Hierarchical Hover: 當前縣深橘，其餘日本縣淺橘
                    let fill = '#1e293b';
                    let pathClass = 'prefecture-path';
                    let stroke = '#475569';
                    let strokeWidth = 0.6;

                    if (isSelected) {
                      fill = '#38bdf8';
                      pathClass += ' selected';
                      stroke = '#38bdf8';
                      strokeWidth = 1.2;
                    } else if (isHovered) {
                      // 深橘 (Deep Orange)
                      fill = '#f97316';
                      pathClass += ' hovered hovered-deep';
                      stroke = '#ffffff';
                      strokeWidth = 1.4;
                    } else if (hoveredPrefecture) {
                      // 淺橘 (Light Orange) - 日本其他都道府縣
                      fill = 'rgba(251, 146, 60, 0.16)';
                      pathClass += ' parent-l1-hovered';
                      stroke = 'rgba(251, 146, 60, 0.35)';
                      strokeWidth = 0.6;
                    }

                    return (
                      <path
                        key={`${copyIdx}-pref-${id}`}
                        d={pathD}
                        className={pathClass}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        onMouseEnter={(e) => {
                          if (isDragging.current) return;
                          mousePos.current = { x: e.clientX, y: e.clientY };
                          setHoveredCountry(null);
                          setHoveredMunicipality(null);
                          if (prefMeta) {
                            setHoveredPrefecture(prefMeta);
                          } else {
                            setHoveredPrefecture({
                              id,
                              nameJa,
                              nameZh: nameJa,
                              nameEn,
                              region: '日本',
                              capital: '',
                              areaCode: '0x',
                              plates: [],
                              proClues: ['日本都道府縣行政區'],
                              landscapeDesc: ''
                            });
                          }
                          if (tooltipRef.current) {
                            tooltipRef.current.style.display = 'flex';
                            tooltipRef.current.style.left = `${e.clientX}px`;
                            tooltipRef.current.style.top = `${e.clientY - 12}px`;
                          }
                        }}
                        onMouseLeave={() => {
                          if (isDragging.current) return;
                          if (hoveredPrefecture) setHoveredPrefecture(null);
                          if (tooltipRef.current) tooltipRef.current.style.display = 'none';
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasDragged.current) return;
                          if (prefMeta && onSelectPrefecture) {
                            onSelectPrefecture(prefMeta);
                            onSelectCountry(null);
                            if (onSelectMunicipality) onSelectMunicipality(null);
                          }
                        }}
                      />
                    );
                  })}

                {/* 3. L3 Layer: Japan 1,906 市區町村 (Municipalities) Ultra-Precision Outlines */}
                {lodLevel === 'L3' &&
                  municipalityPathData.map(({ pathD, code, pref, city, gun }) => {
                    if (!pathD) return null;
                    const isHovered = hoveredMunicipality && hoveredMunicipality.code === code;
                    const isSelected = selectedMunicipality && selectedMunicipality.code === code;
                    const isParentPref = hoveredMunicipality && hoveredMunicipality.pref === pref;

                    // Hierarchical Hover: 深橘 (Hovered) -> 中橘 (Parent Prefecture) -> 淺橘 (Parent Country / Japan)
                    let fill = '#1e2433';
                    let pathClass = 'municipality-path';
                    let stroke = 'rgba(255, 255, 255, 0.2)';
                    let strokeWidth = 0.35;

                    if (isSelected) {
                      fill = '#38bdf8';
                      pathClass += ' selected';
                      stroke = '#38bdf8';
                      strokeWidth = 0.8;
                    } else if (isHovered) {
                      // 1. 深橘 (Deep Orange) - 當前懸停的市區町村
                      fill = '#f97316';
                      pathClass += ' hovered hovered-deep';
                      stroke = '#ffffff';
                      strokeWidth = 0.8;
                    } else if (isParentPref) {
                      // 2. 中橘 (Medium Orange) - 所屬都道府縣內其他市區町村
                      fill = 'rgba(234, 88, 12, 0.35)';
                      pathClass += ' parent-l2-hovered';
                      stroke = 'rgba(251, 146, 60, 0.5)';
                      strokeWidth = 0.35;
                    } else if (hoveredMunicipality) {
                      // 3. 淺橘 (Light Orange) - 所屬國家（日本）內其他都道府縣
                      fill = 'rgba(251, 146, 60, 0.13)';
                      pathClass += ' parent-l1-hovered';
                      stroke = 'rgba(251, 146, 60, 0.22)';
                      strokeWidth = 0.35;
                    }

                    return (
                      <path
                        key={`${copyIdx}-muni-${code}`}
                        d={pathD}
                        className={pathClass}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        onMouseEnter={(e) => {
                          if (isDragging.current) return;
                          mousePos.current = { x: e.clientX, y: e.clientY };
                          setHoveredCountry(null);
                          setHoveredPrefecture(null);
                          setHoveredMunicipality({ code, pref, gun, city, nameZh: `${pref} ${city}` });
                          if (tooltipRef.current) {
                            tooltipRef.current.style.display = 'flex';
                            tooltipRef.current.style.left = `${e.clientX}px`;
                            tooltipRef.current.style.top = `${e.clientY - 12}px`;
                          }
                        }}
                        onMouseLeave={() => {
                          if (isDragging.current) return;
                          if (hoveredMunicipality) setHoveredMunicipality(null);
                          if (tooltipRef.current) tooltipRef.current.style.display = 'none';
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasDragged.current) return;
                          if (onSelectMunicipality) {
                            onSelectMunicipality({ code, pref, gun, city, nameZh: `${pref} ${city}` });
                            onSelectCountry(null);
                            if (onSelectPrefecture) onSelectPrefecture(null);
                          }
                        }}
                      />
                    );
                  })}
              </g>
            ))}
          </g>
        </svg>
      )}

      {/* Dynamic Floating Hover Tooltip (Adapts to Country, Prefecture, and Municipality) */}
      {(hoveredCountry || hoveredPrefecture || hoveredMunicipality) && (
        <div
          ref={(node) => {
            tooltipRef.current = node;
            if (node) {
              node.style.left = `${mousePos.current.x}px`;
              node.style.top = `${mousePos.current.y - 12}px`;
            }
          }}
          className="map-tooltip"
        >
          {/* L2 Prefecture Tooltip */}
          {hoveredPrefecture && (
            <>
              <div className="tooltip-header">
                <span className="tooltip-flag" role="img" aria-label="pref">🗾</span>
                <div>
                  <div className="tooltip-name">{hoveredPrefecture.nameZh} ({hoveredPrefecture.nameJa})</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {hoveredPrefecture.nameEn} · {hoveredPrefecture.region}
                  </div>
                </div>
              </div>
              <div className="tooltip-meta">
                <span className="tooltip-badge" style={{ color: '#34d399', borderColor: '#10b981' }}>
                  <Phone size={10} style={{ display: 'inline', marginRight: 3 }} />
                  市外局番: {hoveredPrefecture.areaCode}
                </span>
                <span className="tooltip-badge" style={{ color: '#60a5fa' }}>
                  首府: {hoveredPrefecture.capital}
                </span>
              </div>
              {hoveredPrefecture.proClues && hoveredPrefecture.proClues.length > 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: '#93c5fd',
                    marginTop: 4,
                    lineHeight: 1.3,
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: 4
                  }}
                >
                  💡 {hoveredPrefecture.proClues[0]}
                </div>
              )}
            </>
          )}

          {/* L3 Municipality Tooltip */}
          {hoveredMunicipality && (
            <>
              <div className="tooltip-header">
                <span className="tooltip-flag" role="img" aria-label="muni">🏙️</span>
                <div>
                  <div className="tooltip-name">{hoveredMunicipality.pref} · {hoveredMunicipality.city}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {hoveredMunicipality.gun ? `${hoveredMunicipality.gun} · ` : ''}JIS #{hoveredMunicipality.code}
                  </div>
                </div>
              </div>
              <div className="tooltip-meta">
                <span className="tooltip-badge" style={{ color: '#fbbf24' }}>
                  市區町村
                </span>
                <span className="tooltip-badge" style={{ color: '#38bdf8' }}>
                  點擊展開詳細
                </span>
              </div>
            </>
          )}

          {/* L1 Country Tooltip */}
          {hoveredCountry && !hoveredPrefecture && !hoveredMunicipality && (
            <>
              <div className="tooltip-header">
                <span className="tooltip-flag">{hoveredCountry.flag}</span>
                <div>
                  <div className="tooltip-name">{hoveredCountry.nameZh}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hoveredCountry.name}</div>
                </div>
              </div>
              <div className="tooltip-meta">
                <span className="tooltip-badge">
                  {hoveredCountry.drivingSide === 'left' ? '🚗 靠左行駛' : '🚙 靠右行駛'}
                </span>
                {hoveredCountry.coverage === 'official' ? (
                  <span className="tooltip-badge" style={{ color: '#10b981' }}>官方街景</span>
                ) : (
                  <span className="tooltip-badge" style={{ color: '#94a3b8' }}>無官方街景</span>
                )}
              </div>
              {hoveredCountry.keyHints && hoveredCountry.keyHints.length > 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: '#93c5fd',
                    marginTop: 4,
                    lineHeight: 1.3,
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: 4
                  }}
                >
                  💡 {hoveredCountry.keyHints[0]}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Floating Precision LOD Tracker HUD */}
      <PrecisionHUD
        currentLOD={lodLevel}
        currentZoomK={zoomK}
        maxLOD={maxLODLevel}
        onSetMaxLOD={handleSetMaxLOD}
        onJumpToLOD={handleJumpToLOD}
        onZoomChange={handleSliderZoom}
      />

      {/* Filter Legend Card */}
      <div className={`filter-legend-card ${isFilterExpanded ? 'with-filter-bar' : ''}`}>
        <div className="legend-title">
          <span>{activeFilterDef.nameZh}</span>
        </div>
        <div className="legend-items">
          {activeFilterDef.legend.map((item) => (
            <div key={item.key} className="legend-item">
              <span className="legend-color-dot" style={{ backgroundColor: item.color }} />
              <span className="legend-label">{item.labelZh}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map Control Buttons */}
      <div className="map-controls">
        <button
          className="map-control-btn"
          onClick={() => handleZoom('in')}
          title="放大地圖 (Zoom In)"
        >
          <ZoomIn size={18} />
        </button>
        <button
          className="map-control-btn"
          onClick={() => handleZoom('out')}
          title="縮小地圖 (Zoom Out)"
        >
          <ZoomOut size={18} />
        </button>
        <button
          className="map-control-btn"
          onClick={handleResetZoom}
          title="還原縮放比例 (Reset View)"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Region Presets Floating Navigation */}
      <div className="region-presets">
        <div className="region-presets-label">
          <Compass size={13} style={{ display: 'inline', marginRight: 4 }} />
          大洲視野
        </div>
        {Object.entries(REGION_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            className={`region-btn ${activeRegion === key ? 'active' : ''}`}
            onClick={() => handleSelectRegion(key)}
          >
            {preset.nameZh}
          </button>
        ))}
      </div>
    </div>
  );
};
