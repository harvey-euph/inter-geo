import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';
import * as flatgeobuf from 'flatgeobuf';
import { ZoomIn, ZoomOut, RotateCcw, Compass, Phone, Route } from 'lucide-react';
import type { CountryData } from '../types/geo';
import { FILTERS } from '../data/filters';
import type { FilterDefinition } from '../data/filters';
import { findCountry } from '../data/countries';
import { getLODLevel, DEFAULT_LOD_THRESHOLDS, MAX_ZOOM_K } from '../types/lod';
import type { LODLevel, PrefectureDetail, MunicipalityDetail, CustomLODThresholds } from '../types/lod';
import { JAPAN_PREFECTURES } from '../data/japanData';
import { PrecisionHUD } from './PrecisionHUD';
import { L2_MANIFEST } from '../data/l2Manifest';
import { ROADS_MANIFEST } from '../data/roadsManifest';

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

export interface WorldCountryProperties {
  id?: string;
  name: string;
}

type GeoFeature = Feature<Geometry, WorldCountryProperties> & { id: string };

export interface JapanPrefectureProperties {
  id: number;
  nam: string;
  nam_ja: string;
}

export interface JapanMunicipalityProperties {
  code: string;
  code_int?: number;
  pref_id: number;
  pref: string;
  city: string;
  gun?: string;
}

export interface L2SubdivisionPathData {
  pathD: string;
  id: number | string;
  iso2: string;
  name: string;
  nameEn: string;
  nameZh: string;
  typeEn: string;
  code: string;
  postal: string;
  centroid: [number, number];
}

export interface L2SubdivisionDetail {
  id: number | string;
  iso2: string;
  name: string;
  nameEn: string;
  nameZh: string;
  typeEn: string;
  code: string;
  postal: string;
  countryName: string;
  countryNameZh: string;
  countryFlag: string;
}

export interface RoadPathData {
  pathD: string;
  name: string;
  class: 'Interstate' | 'Federal';
  number: string;
  prefix: string;
  type: string;
  scalerank: number;
}

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
  const [japanPrefectureFeatures, setJapanPrefectureFeatures] = useState<Feature<Geometry, JapanPrefectureProperties>[]>([]);
  const [japanMunicipalityFeatures, setJapanMunicipalityFeatures] = useState<Feature<Geometry, JapanMunicipalityProperties>[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState('world');

  // Level of Detail (LOD) tracking: L1 (Country), L2 (Prefecture), L3 (Municipality)
  const [lodLevel, setLodLevel] = useState<LODLevel>('L1');
  const [lodThresholds, setLodThresholds] = useState<CustomLODThresholds>(DEFAULT_LOD_THRESHOLDS);
  const [zoomK, setZoomK] = useState<number>(1.0);

  // Sub-national hover states
  const [hoveredPrefecture, setHoveredPrefecture] = useState<PrefectureDetail | null>(null);
  const [hoveredMunicipality, setHoveredMunicipality] = useState<MunicipalityDetail | null>(null);
  const [pinnedPrefId, setPinnedPrefId] = useState<number | null>(null);

  // Worldwide L2 active states and paths
  const visibleL2Iso2sRef = useRef<Set<string>>(new Set());
  const [visibleL2Iso2s, setVisibleL2Iso2s] = useState<Set<string>>(new Set());
  const inFlightFetchesRef = useRef<Set<string>>(new Set());
  const loadedL2DataRef = useRef<Map<string, L2SubdivisionPathData[]>>(new Map());
  const [l2PathsByCountry, setL2PathsByCountry] = useState<Record<string, L2SubdivisionPathData[]>>({});
  const [hoveredL2Subdivision, setHoveredL2Subdivision] = useState<L2SubdivisionDetail | null>(null);
  const [selectedL2Subdivision, setSelectedL2Subdivision] = useState<{ iso2: string; id: number | string } | null>(null);

  // Road network overlay state and refs
  const [showRoads, setShowRoads] = useState<boolean>(false);
  const showRoadsRef = useRef<boolean>(false);
  const visibleRoadIso2sRef = useRef<Set<string>>(new Set());
  const [visibleRoadIso2s, setVisibleRoadIso2s] = useState<Set<string>>(new Set());
  const inFlightRoadFetchesRef = useRef<Set<string>>(new Set());
  const loadedRoadsRef = useRef<Map<string, RoadPathData[]>>(new Map());
  const [roadsByCountry, setRoadsByCountry] = useState<Record<string, RoadPathData[]>>({});
  const [hoveredRoad, setHoveredRoad] = useState<RoadPathData | null>(null);

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
  const isInitializedRef = useRef(false);

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

  // Check if a country's bounding box intersects the screen viewport across any world copy
  const isCountryInViewport = useCallback(
    (
      bbox: { minX: number; maxX: number; minY: number; maxY: number },
      k: number,
      x: number,
      y: number,
      vw: number,
      vh: number,
      margin = 100
    ): boolean => {
      const sMinY = y + bbox.minY * k;
      const sMaxY = y + bbox.maxY * k;
      if (sMaxY < -margin || sMinY > vh + margin) return false;

      for (const c of WORLD_COPIES) {
        const sMinX = x + (bbox.minX + c * MAP_W) * k;
        const sMaxX = x + (bbox.maxX + c * MAP_W) * k;
        if (sMaxX >= -margin && sMinX <= vw + margin) {
          return true;
        }
      }
      return false;
    },
    []
  );

  // Synchronize visible L2 countries across viewport with zero re-renders unless boundary is crossed
  const syncL2Viewport = useCallback(
    (k: number, x: number, y: number, vw: number, vh: number, currentLOD: LODLevel) => {
      if (currentLOD === 'L1') {
        if (visibleL2Iso2sRef.current.size > 0) {
          visibleL2Iso2sRef.current = new Set();
          setVisibleL2Iso2s(new Set());
        }
        return;
      }

      const nextVisible = new Set<string>();
      for (let i = 0; i < L2_MANIFEST.length; i++) {
        const c = L2_MANIFEST[i];
        if (isCountryInViewport(c.bbox, k, x, y, vw, vh, 100)) {
          nextVisible.add(c.iso2);
        }
      }

      let changed = false;
      if (nextVisible.size !== visibleL2Iso2sRef.current.size) {
        changed = true;
      } else {
        for (const iso of nextVisible) {
          if (!visibleL2Iso2sRef.current.has(iso)) {
            changed = true;
            break;
          }
        }
      }

      if (changed) {
        visibleL2Iso2sRef.current = nextVisible;
        setVisibleL2Iso2s(nextVisible);
      }
    },
    [isCountryInViewport]
  );

  // Synchronize visible road network countries across viewport when roads layer is enabled
  const syncRoadsViewport = useCallback(
    (k: number, x: number, y: number, vw: number, vh: number, roadsEnabled: boolean) => {
      if (!roadsEnabled) {
        if (visibleRoadIso2sRef.current.size > 0) {
          visibleRoadIso2sRef.current = new Set();
          setVisibleRoadIso2s(new Set());
        }
        return;
      }

      const nextVisible = new Set<string>();
      for (const [iso2, entry] of Object.entries(ROADS_MANIFEST)) {
        if (isCountryInViewport(entry.bbox, k, x, y, vw, vh, 150)) {
          nextVisible.add(iso2);
        }
      }

      let changed = false;
      if (nextVisible.size !== visibleRoadIso2sRef.current.size) {
        changed = true;
      } else {
        for (const iso of nextVisible) {
          if (!visibleRoadIso2sRef.current.has(iso)) {
            changed = true;
            break;
          }
        }
      }

      if (changed) {
        visibleRoadIso2sRef.current = nextVisible;
        setVisibleRoadIso2s(nextVisible);
      }
    },
    [isCountryInViewport]
  );

  // Unified viewport synchronizer for both L2 subdivisions and Road networks
  const syncAllViewports = useCallback(
    (k: number, x: number, y: number, vw: number, vh: number, currentLOD: LODLevel) => {
      syncL2Viewport(k, x, y, vw, vh, currentLOD);
      syncRoadsViewport(k, x, y, vw, vh, showRoadsRef.current);
    },
    [syncL2Viewport, syncRoadsViewport]
  );

  // Toggle highway and route overlay layer
  const handleToggleRoads = useCallback(() => {
    setShowRoads((prev) => {
      const next = !prev;
      showRoadsRef.current = next;
      const { k, x, y } = transformRef.current;
      syncRoadsViewport(k, x, y, viewportSize.current.w, viewportSize.current.h, next);
      return next;
    });
  }, [syncRoadsViewport]);

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
      const prefId = Number(feature.properties?.pref_id) || 0;
      const pref = String(feature.properties?.pref || (prefId ? JAPAN_PREFECTURES[prefId]?.nameJa : '') || '');
      const city = String(feature.properties?.city || '');
      const gun = String(feature.properties?.gun || '');
      return {
        pathD,
        code,
        prefId,
        pref,
        city,
        gun
      };
    });
  }, [japanMunicipalityFeatures, pathGenerator]);

  // Group municipality paths by prefecture ID for O(1) active retrieval
  const municipalitiesByPrefId = useMemo(() => {
    const map = new Map<number, typeof municipalityPathData>();
    for (const item of municipalityPathData) {
      const list = map.get(item.prefId);
      if (list) {
        list.push(item);
      } else {
        map.set(item.prefId, [item]);
      }
    }
    return map;
  }, [municipalityPathData]);

  // Currently active prefecture IDs that should expand to L3 when in L3 mode:
  // 1. The last clicked prefecture (from selectedMunicipality or selectedPrefecture)
  // 2. The currently hovered prefecture (from hoveredMunicipality or hoveredPrefecture)
  const lastClickedPrefId = useMemo(() => {
    if (selectedMunicipality) {
      if (selectedMunicipality.prefId) return selectedMunicipality.prefId;
      const parsed = parseInt(selectedMunicipality.code?.slice(0, 2), 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 47) return parsed;
    }
    if (selectedPrefecture?.id) return selectedPrefecture.id;
    return null;
  }, [selectedMunicipality, selectedPrefecture]);

  const hoveredPrefId = useMemo(() => {
    if (hoveredMunicipality?.prefId) return hoveredMunicipality.prefId;
    if (hoveredPrefecture?.id) return hoveredPrefecture.id;
    return null;
  }, [hoveredMunicipality, hoveredPrefecture]);

  const activeL3PrefIds = useMemo(() => {
    const set = new Set<number>();
    if (pinnedPrefId) set.add(pinnedPrefId);
    if (lastClickedPrefId) set.add(lastClickedPrefId);
    if (hoveredPrefId) set.add(hoveredPrefId);
    return set;
  }, [pinnedPrefId, lastClickedPrefId, hoveredPrefId]);

  // Active worldwide L2 subdivision paths flattened for rendering
  const activeL2SubdivisionPaths = useMemo(() => {
    if (lodLevel === 'L1') return [];
    const list: L2SubdivisionPathData[] = [];
    for (const iso2 of visibleL2Iso2s) {
      if (iso2 === 'JP') continue;
      const paths = l2PathsByCountry[iso2];
      if (paths) {
        for (let i = 0; i < paths.length; i++) {
          list.push(paths[i]);
        }
      }
    }
    return list;
  }, [visibleL2Iso2s, l2PathsByCountry, lodLevel]);

  // Active highway & route paths flattened for rendering
  const activeRoadPaths = useMemo(() => {
    if (!showRoads) return [];
    const list: RoadPathData[] = [];
    for (const iso2 of visibleRoadIso2s) {
      const paths = roadsByCountry[iso2];
      if (paths) {
        for (let i = 0; i < paths.length; i++) {
          list.push(paths[i]);
        }
      }
    }
    return list;
  }, [showRoads, visibleRoadIso2s, roadsByCountry]);

  // Load FlatGeobuf datasets (L1 World, L2 Japan Prefectures, L3 Japan Municipalities)
  useEffect(() => {
    let isMounted = true;

    // 1. Load L1 World Countries via FlatGeobuf binary (Zero-copy IEEE 754 floats)
    (async () => {
      try {
        const res = await fetch('/data/countries-110m.fgb');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        if (!isMounted) return;

        const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));
        const features: GeoFeature[] = [];
        for await (const feature of it) {
          const props = (feature.properties || {}) as WorldCountryProperties;
          const countryId = String(props.id || feature.id || '');
          features.push({
            ...feature,
            id: countryId,
            properties: props
          } as unknown as GeoFeature);
        }
        if (isMounted) {
          setFeatures(features);
          setLoading(false);
        }
      } catch (err) {
        console.error('L1 Countries FlatGeobuf loading error:', err);
      }
    })();

    // 2. Load L2 Japan 47 Prefectures via FlatGeobuf binary (Zero-copy IEEE 754 floats)
    (async () => {
      try {
        const res = await fetch('/data/l2/JP.fgb');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        if (!isMounted) return;

        const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));
        const features: Feature<Geometry, JapanPrefectureProperties>[] = [];
        for await (const feature of it) {
          features.push(feature as unknown as Feature<Geometry, JapanPrefectureProperties>);
        }
        if (isMounted) {
          setJapanPrefectureFeatures(features);
        }
      } catch (err) {
        console.warn('L2 Prefectures FlatGeobuf loading notice:', err);
      }
    })();

    // 3. Load L3 Japan Municipalities via FlatGeobuf binary (Zero-copy IEEE 754 floats)
    (async () => {
      try {
        const res = await fetch('/data/japan-municipalities.fgb');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        if (!isMounted) return;

        const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));
        const features: Feature<Geometry, JapanMunicipalityProperties>[] = [];
        for await (const feature of it) {
          features.push(feature as unknown as Feature<Geometry, JapanMunicipalityProperties>);
        }
        if (isMounted) {
          setJapanMunicipalityFeatures(features);
        }
      } catch (err) {
        console.warn('L3 Municipalities FlatGeobuf loading notice:', err);
      }
    })();

    return () => {
      isMounted = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // On-demand loader for visible countries' L2 FlatGeobuf datasets
  useEffect(() => {
    if (lodLevel === 'L1') return;

    let isMounted = true;
    for (const iso2 of visibleL2Iso2s) {
      if (iso2 === 'JP') continue; // Japan is handled by japanPrefectureFeatures
      if (loadedL2DataRef.current.has(iso2) || inFlightFetchesRef.current.has(iso2)) continue;

      inFlightFetchesRef.current.add(iso2);

      (async () => {
        try {
          const res = await fetch(`/data/l2/${iso2}.fgb`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buffer = await res.arrayBuffer();
          if (!isMounted) return;

          const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));
          const paths: L2SubdivisionPathData[] = [];
          for await (const feature of it) {
            const p = (feature.properties || {}) as Record<string, unknown>;
            const pathD = pathGenerator(feature) || '';
            let centroid: [number, number] = [0, 0];
            try {
              const c = pathGenerator.centroid(feature);
              if (c && !isNaN(c[0]) && !isNaN(c[1])) centroid = c;
            } catch {
              // fallback to centroid [0, 0] if calculation fails
            }
            paths.push({
              pathD,
              id: (p.id as string | number) || (p.code as string) || (p.name as string) || '',
              iso2: (p.iso2 as string) || iso2,
              name: String(p.name || ''),
              nameEn: String(p.name_en || p.name || ''),
              nameZh: String(p.name_zh || p.name || ''),
              typeEn: String(p.type_en || ''),
              code: String(p.code || ''),
              postal: String(p.postal || ''),
              centroid
            });
          }

          if (isMounted) {
            loadedL2DataRef.current.set(iso2, paths);
            setL2PathsByCountry((prev) => ({ ...prev, [iso2]: paths }));
          }
        } catch (err) {
          console.warn(`[L2] Failed to load /data/l2/${iso2}.fgb:`, err);
        } finally {
          inFlightFetchesRef.current.delete(iso2);
        }
      })();
    }

    return () => {
      isMounted = false;
    };
  }, [visibleL2Iso2s, lodLevel, pathGenerator]);

  // On-demand loader for visible countries' Road FlatGeobuf datasets
  useEffect(() => {
    if (!showRoads) return;

    let isMounted = true;
    for (const iso2 of visibleRoadIso2s) {
      if (loadedRoadsRef.current.has(iso2) || inFlightRoadFetchesRef.current.has(iso2)) continue;

      inFlightRoadFetchesRef.current.add(iso2);

      (async () => {
        try {
          const res = await fetch(`/data/roads/${iso2}.fgb`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buffer = await res.arrayBuffer();
          if (!isMounted) return;

          const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));
          const paths: RoadPathData[] = [];
          for await (const feature of it) {
            const p = (feature.properties || {}) as Record<string, unknown>;
            const pathD = pathGenerator(feature) || '';
            if (!pathD) continue;
            paths.push({
              pathD,
              name: String(p.name || ''),
              class: p.class === 'Interstate' ? 'Interstate' : 'Federal',
              number: String(p.number || ''),
              prefix: String(p.prefix || ''),
              type: String(p.type || ''),
              scalerank: Number(p.scalerank || 0)
            });
          }

          if (isMounted) {
            loadedRoadsRef.current.set(iso2, paths);
            setRoadsByCountry((prev) => ({ ...prev, [iso2]: paths }));
          }
        } catch (err) {
          console.warn(`[Roads] Failed to load /data/roads/${iso2}.fgb:`, err);
        } finally {
          inFlightRoadFetchesRef.current.delete(iso2);
        }
      })();
    }

    return () => {
      isMounted = false;
    };
  }, [visibleRoadIso2s, showRoads, pathGenerator]);

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
          syncAllViewports(newK, transformRef.current.x, transformRef.current.y, width, height, lodLevel);
          applyTransform(false);
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [clampY, wrapX, applyTransform, syncAllViewports, lodLevel]);

  // Initial map positioning once loaded (runs only once upon initial load)
  useEffect(() => {
    if (!loading && containerRef.current && !isInitializedRef.current) {
      isInitializedRef.current = true;
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
      const initialLOD = getLODLevel(initialK, lodThresholds);
      syncAllViewports(initialK, initialX, initialY, vw, vh, initialLOD);
      setZoomK(Number(initialK.toFixed(1)));
      setLodLevel(initialLOD);
      applyTransform(false);
    }
  }, [loading, wrapX, clampY, applyTransform, lodThresholds, syncAllViewports]);

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

          syncAllViewports(targetK, transformRef.current.x, transformRef.current.y, vw, vh, 'L3');
          setZoomK(Number(targetK.toFixed(1)));
          setLodLevel('L3');
          setPinnedPrefId(prefId);
          applyTransform(true);
        }
      };
    }
  }, [zoomToPrefectureRef, prefecturePathData, wrapX, clampY, applyTransform, syncAllViewports]);

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
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };

    if (isDragging.current) {
      const dx = e.clientX - dragStart.current.clientX;
      const dy = e.clientY - dragStart.current.clientY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDragged.current = true;
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
      }

      const rawX = dragStart.current.x + dx;
      const rawY = dragStart.current.y + dy;

      const k = transformRef.current.k;
      const vh = viewportSize.current.h;
      const vw = viewportSize.current.w;

      // Continuous periodic horizontal wrapping
      transformRef.current.x = wrapX(rawX, k);
      // Strict vertical clamping: sticks flush to container borders
      transformRef.current.y = clampY(rawY, k, vh);

      if (lodLevel !== 'L1' || showRoadsRef.current) {
        syncAllViewports(k, transformRef.current.x, transformRef.current.y, vw, vh, lodLevel);
      }

      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          applyTransform(false);
          rafId.current = null;
        });
      }
      return;
    }

    // Direct DOM tooltip position update when hovering
    if (tooltipRef.current && (hoveredCountry || hoveredPrefecture || hoveredMunicipality || hoveredL2Subdivision || hoveredRoad)) {
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
    const { k, x, y } = transformRef.current;
    syncAllViewports(k, x, y, viewportSize.current.w, viewportSize.current.h, lodLevel);
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
    const newK = Math.min(Math.max(k * zoomFactor, kMin), MAX_ZOOM_K);

    // Zoom anchored to mouse position
    const ratio = newK / k;
    const newX = mx - (mx - x) * ratio;
    const newY = my - (my - y) * ratio;

    transformRef.current.k = newK;
    transformRef.current.x = wrapX(newX, newK);
    transformRef.current.y = clampY(newY, newK, vh);

    const nextLOD = getLODLevel(newK, lodThresholds);
    if (nextLOD !== lodLevel) {
      setLodLevel(nextLOD);
    }
    setZoomK(Number(newK.toFixed(1)));
    syncAllViewports(newK, transformRef.current.x, transformRef.current.y, viewportSize.current.w, vh, nextLOD);

    applyTransform(false);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 1.35 : 0.74;
    const { k, x, y } = transformRef.current;
    const vh = viewportSize.current.h;
    const vw = viewportSize.current.w;
    const kMin = vh / MAP_H;
    const newK = Math.min(Math.max(k * factor, kMin), MAX_ZOOM_K);

    const cx = vw / 2;
    const cy = vh / 2;
    const newX = cx - (cx - x) * (newK / k);
    const newY = cy - (cy - y) * (newK / k);

    transformRef.current.k = newK;
    transformRef.current.x = wrapX(newX, newK);
    transformRef.current.y = clampY(newY, newK, vh);

    const nextLOD = getLODLevel(newK, lodThresholds);
    if (nextLOD !== lodLevel) {
      setLodLevel(nextLOD);
    }
    setZoomK(Number(newK.toFixed(1)));
    syncAllViewports(newK, transformRef.current.x, transformRef.current.y, vw, vh, nextLOD);

    applyTransform(true);
  };

  const handleResetZoom = () => {
    const vh = viewportSize.current.h;
    const vw = viewportSize.current.w;
    const kMin = vh / MAP_H;

    transformRef.current.k = kMin;
    transformRef.current.x = wrapX(vw / 2 - (MAP_W / 2) * kMin, kMin);
    transformRef.current.y = clampY((vh - MAP_H * kMin) / 2, kMin, vh);

    const targetLOD = getLODLevel(kMin, lodThresholds);
    syncAllViewports(kMin, transformRef.current.x, transformRef.current.y, vw, vh, targetLOD);

    setActiveRegion('world');
    setZoomK(Number(kMin.toFixed(1)));
    setLodLevel(targetLOD);
    applyTransform(true);
  };

  // Draggable continuous slider zoom adjustment
  const handleSliderZoom = useCallback(
    (targetK: number) => {
      const { k, x, y } = transformRef.current;
      const vh = viewportSize.current.h;
      const vw = viewportSize.current.w;
      const kMin = vh / MAP_H;
      const newK = Math.min(Math.max(targetK, kMin), MAX_ZOOM_K);

      const cx = vw / 2;
      const cy = vh / 2;
      const ratio = newK / k;
      const newX = cx - (cx - x) * ratio;
      const newY = cy - (cy - y) * ratio;

      transformRef.current.k = newK;
      transformRef.current.x = wrapX(newX, newK);
      transformRef.current.y = clampY(newY, newK, vh);

      const nextLOD = getLODLevel(newK, lodThresholds);
      if (nextLOD !== lodLevel) {
        setLodLevel(nextLOD);
      }
      setZoomK(Number(newK.toFixed(1)));
      syncAllViewports(newK, transformRef.current.x, transformRef.current.y, vw, vh, nextLOD);
      applyTransform(false);
    },
    [wrapX, clampY, applyTransform, lodLevel, lodThresholds, syncAllViewports]
  );

  // Update dynamic custom LOD thresholds
  const handleUpdateThresholds = useCallback(
    (newThresholds: CustomLODThresholds) => {
      setLodThresholds(newThresholds);
      const currentK = transformRef.current.k;
      const nextLOD = getLODLevel(currentK, newThresholds);
      if (nextLOD !== lodLevel) {
        setLodLevel(nextLOD);
        syncAllViewports(
          currentK,
          transformRef.current.x,
          transformRef.current.y,
          viewportSize.current.w,
          viewportSize.current.h,
          nextLOD
        );
      }
    },
    [lodLevel, syncAllViewports]
  );


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

    const targetLOD = getLODLevel(targetK, lodThresholds);
    syncAllViewports(targetK, transformRef.current.x, transformRef.current.y, vw, vh, targetLOD);

    setZoomK(Number(targetK.toFixed(1)));
    setLodLevel(targetLOD);
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

  const activeSelectedL2 = selectedCountry ? selectedL2Subdivision : null;

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
        if (hoveredL2Subdivision) setHoveredL2Subdivision(null);
        if (hoveredRoad) setHoveredRoad(null);
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
        setPinnedPrefId(null);
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
                if (hoveredL2Subdivision) setHoveredL2Subdivision(null);
                if (hoveredRoad) setHoveredRoad(null);
                if (tooltipRef.current) tooltipRef.current.style.display = 'none';
              }}
              onClick={() => {
                if (!hasDragged.current) {
                  setPinnedPrefId(null);
                  onSelectCountry(null);
                  if (onSelectPrefecture) onSelectPrefecture(null);
                  if (onSelectMunicipality) onSelectMunicipality(null);
                }
              }}
            />

            {/* Continuous periodic world copies */}
            {WORLD_COPIES.map((copyIdx) => (
              <g key={copyIdx} transform={`translate(${copyIdx * MAP_W}, 0)`}>
                {/* 1. L1 Layer: Countries (Japan and worldwide L2 countries are replaced when active and in viewport) */}
                {countryPathData.map(({ pathD, countryMeta, id, name }) => {
                  if (!pathD) return null;
                  const iso2 = countryMeta?.iso2;
                  const isJapan = String(id) === '392' || name === 'Japan' || iso2 === 'JP' || countryMeta?.id === '392';
                  const isJapanL2Active = isJapan && (lodLevel === 'L2' || lodLevel === 'L3') && visibleL2Iso2s.has('JP');
                  if (isJapanL2Active) return null;

                  const isWorldwideL2Active =
                    iso2 &&
                    iso2 !== 'JP' &&
                    (lodLevel === 'L2' || lodLevel === 'L3') &&
                    visibleL2Iso2s.has(iso2) &&
                    !!l2PathsByCountry[iso2];
                  if (isWorldwideL2Active) return null;

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
                        setHoveredL2Subdivision(null);
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

                {/* 2a. L2 Layer: Japan 47 都道府縣 (Prefectures) High-Precision Outlines */}
                {((lodLevel === 'L2' && visibleL2Iso2s.has('JP')) || lodLevel === 'L3') &&
                  (copyIdx === 0 || copyIdx === 1) &&
                  prefecturePathData
                    .filter(({ id }) => lodLevel === 'L2' || !activeL3PrefIds.has(id))
                    .map(({ pathD, prefMeta, id, nameJa, nameEn }) => {
                      if (!pathD) return null;
                      const isHovered = hoveredPrefecture && hoveredPrefecture.id === id;
                      const isSelected = selectedPrefecture && selectedPrefecture.id === id;

                      // Hierarchical Hover: 當前縣深橘，其餘日本縣淺橘
                      let fill = '#1e293b';
                      let pathClass = 'prefecture-path';
                      let stroke: string | undefined = '#475569';
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
                      } else if (hoveredPrefecture || hoveredMunicipality) {
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
                          style={{ pointerEvents: 'all' }}
                          onMouseEnter={(e) => {
                            if (isDragging.current) return;
                            mousePos.current = { x: e.clientX, y: e.clientY };
                            setHoveredCountry(null);
                            setHoveredMunicipality(null);
                            setHoveredL2Subdivision(null);
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
                          onMouseMove={(e) => {
                            if (isDragging.current) return;
                            if (!hoveredPrefecture || hoveredPrefecture.id !== id) {
                              mousePos.current = { x: e.clientX, y: e.clientY };
                              setHoveredCountry(null);
                              setHoveredMunicipality(null);
                              setHoveredL2Subdivision(null);
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
                            }
                          }}
                          onMouseLeave={() => {
                            if (isDragging.current) return;
                            if (lodLevel !== 'L3' && hoveredPrefecture) {
                              setHoveredPrefecture(null);
                              if (tooltipRef.current) tooltipRef.current.style.display = 'none';
                            }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasDragged.current) return;
                            setPinnedPrefId(id);
                            if (prefMeta && onSelectPrefecture) {
                              onSelectPrefecture(prefMeta);
                              onSelectCountry(null);
                              if (onSelectMunicipality) onSelectMunicipality(null);
                            }
                          }}
                        />
                      );
                    })}

                {/* 2b. L2 Layer: Worldwide Admin-1 First-Level Subdivisions */}
                {(lodLevel === 'L2' || lodLevel === 'L3') &&
                  (copyIdx === 0 || copyIdx === 1) &&
                  activeL2SubdivisionPaths.map(({ pathD, id, iso2, name, nameEn, nameZh, typeEn, code, postal }) => {
                    if (!pathD) return null;
                    const isSelected = activeSelectedL2 && activeSelectedL2.iso2 === iso2 && activeSelectedL2.id === id;
                    const isHovered = hoveredL2Subdivision && hoveredL2Subdivision.iso2 === iso2 && hoveredL2Subdivision.id === id;
                    const isSiblingHovered = hoveredL2Subdivision && hoveredL2Subdivision.iso2 === iso2;

                    let fill = '#1e293b';
                    let pathClass = 'l2-subdivision-path';
                    let stroke = '#475569';
                    let strokeWidth = 0.6;

                    if (isSelected) {
                      fill = '#38bdf8';
                      pathClass += ' selected';
                      stroke = '#38bdf8';
                      strokeWidth = 1.2;
                    } else if (isHovered) {
                      fill = '#f97316';
                      pathClass += ' hovered hovered-deep';
                      stroke = '#ffffff';
                      strokeWidth = 1.4;
                    } else if (isSiblingHovered) {
                      fill = 'rgba(251, 146, 60, 0.16)';
                      pathClass += ' sibling-l2-hovered';
                      stroke = 'rgba(251, 146, 60, 0.35)';
                      strokeWidth = 0.6;
                    }

                    return (
                      <path
                        key={`${copyIdx}-${iso2}-${id}`}
                        d={pathD}
                        className={pathClass}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        style={{ pointerEvents: 'all' }}
                        onMouseEnter={() => {
                          if (isDragging.current) return;
                          setHoveredCountry(null);
                          setHoveredPrefecture(null);
                          setHoveredMunicipality(null);
                          const cMeta = findCountry(iso2);
                          setHoveredL2Subdivision({
                            id,
                            iso2,
                            name,
                            nameEn,
                            nameZh,
                            typeEn,
                            code,
                            postal,
                            countryName: cMeta?.name || nameEn,
                            countryNameZh: cMeta?.nameZh || nameZh,
                            countryFlag: cMeta?.flag || '🌐'
                          });
                        }}
                        onMouseMove={() => {
                          if (isDragging.current) return;
                          if (!hoveredL2Subdivision || hoveredL2Subdivision.iso2 !== iso2 || hoveredL2Subdivision.id !== id) {
                            setHoveredCountry(null);
                            setHoveredPrefecture(null);
                            setHoveredMunicipality(null);
                            const cMeta = findCountry(iso2);
                            setHoveredL2Subdivision({
                              id,
                              iso2,
                              name,
                              nameEn,
                              nameZh,
                              typeEn,
                              code,
                              postal,
                              countryName: cMeta?.name || nameEn,
                              countryNameZh: cMeta?.nameZh || nameZh,
                              countryFlag: cMeta?.flag || '🌐'
                            });
                          }
                        }}
                        onMouseLeave={() => {
                          if (isDragging.current) return;
                          if (hoveredL2Subdivision?.iso2 === iso2 && hoveredL2Subdivision?.id === id) {
                            setHoveredL2Subdivision(null);
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasDragged.current) return;
                          setSelectedL2Subdivision({ iso2, id });
                          const cMeta = findCountry(iso2);
                          if (cMeta) {
                            onSelectCountry(cMeta);
                            if (onSelectPrefecture) onSelectPrefecture(null);
                            if (onSelectMunicipality) onSelectMunicipality(null);
                          }
                        }}
                      />
                    );
                  })}

                {/* 3. L3 Layer: Japan 市區町村 (Municipalities) - Only loaded for active (hovered & last clicked) prefectures */}
                {lodLevel === 'L3' &&
                  (copyIdx === 0 || copyIdx === 1) &&
                  Array.from(activeL3PrefIds).flatMap((pId) => {
                    const munis = municipalitiesByPrefId.get(pId) || [];
                    return munis.map(({ pathD, code, prefId: mPrefId, pref, city, gun }) => {
                      if (!pathD) return null;
                      const isHovered = hoveredMunicipality && hoveredMunicipality.code === code;
                      const isSelected = selectedMunicipality && selectedMunicipality.code === code;
                      // Fast integer comparison for parent prefecture with string fallback
                      const isParentPref =
                        (hoveredMunicipality &&
                          (hoveredMunicipality.prefId ? hoveredMunicipality.prefId === mPrefId : hoveredMunicipality.pref === pref)) ||
                        (hoveredPrefecture && hoveredPrefecture.id === mPrefId);

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
                      } else if (hoveredMunicipality || hoveredPrefecture) {
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
                            setHoveredL2Subdivision(null);
                            setHoveredMunicipality({ code, prefId: mPrefId, pref, gun, city, nameZh: `${pref} ${city}` });
                            if (tooltipRef.current) {
                              tooltipRef.current.style.display = 'flex';
                              tooltipRef.current.style.left = `${e.clientX}px`;
                              tooltipRef.current.style.top = `${e.clientY - 12}px`;
                            }
                          }}
                          onMouseMove={(e) => {
                            if (isDragging.current) return;
                            if (!hoveredMunicipality || hoveredMunicipality.code !== code) {
                              mousePos.current = { x: e.clientX, y: e.clientY };
                              setHoveredCountry(null);
                              setHoveredPrefecture(null);
                              setHoveredL2Subdivision(null);
                              setHoveredMunicipality({ code, prefId: mPrefId, pref, gun, city, nameZh: `${pref} ${city}` });
                              if (tooltipRef.current) {
                                tooltipRef.current.style.display = 'flex';
                                tooltipRef.current.style.left = `${e.clientX}px`;
                                tooltipRef.current.style.top = `${e.clientY - 12}px`;
                              }
                            }
                          }}
                          onMouseLeave={() => {
                            if (isDragging.current) return;
                            // Ocean backdrop and wrapper manage clearing to maintain smooth inter-polygon cursor transitions
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasDragged.current) return;
                            setPinnedPrefId(mPrefId);
                            if (onSelectMunicipality) {
                              onSelectMunicipality({ code, prefId: mPrefId, pref, gun, city, nameZh: `${pref} ${city}` });
                              onSelectCountry(null);
                              if (onSelectPrefecture) onSelectPrefecture(null);
                            }
                          }}
                        />
                      );
                    });
                  })}

                {/* 4. Highway & Route Overlay Layer */}
                {showRoads && (copyIdx === 0 || copyIdx === 1) && (
                  <g className="road-network-overlay" style={{ pointerEvents: 'stroke' }}>
                    {activeRoadPaths.map((road, rIdx) => {
                      const isInterstate = road.class === 'Interstate';
                      const isHovered = hoveredRoad && hoveredRoad.name === road.name;

                      let stroke = isInterstate ? '#38bdf8' : '#fbbf24';
                      let strokeWidth = isInterstate ? 1.6 : 1.1;
                      let strokeOpacity = isInterstate ? 0.9 : 0.75;

                      if (isHovered) {
                        stroke = '#f97316';
                        strokeWidth = isInterstate ? 3.0 : 2.4;
                        strokeOpacity = 1;
                      }

                      return (
                        <path
                          key={`${copyIdx}-road-${road.name}-${rIdx}`}
                          d={road.pathD}
                          fill="none"
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                          strokeOpacity={strokeOpacity}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                          onMouseEnter={() => {
                            if (isDragging.current) return;
                            setHoveredCountry(null);
                            setHoveredPrefecture(null);
                            setHoveredMunicipality(null);
                            setHoveredL2Subdivision(null);
                            setHoveredRoad(road);
                          }}
                          onMouseLeave={() => {
                            if (isDragging.current) return;
                            if (hoveredRoad?.name === road.name) {
                              setHoveredRoad(null);
                            }
                          }}
                        />
                      );
                    })}
                  </g>
                )}
              </g>
            ))}
          </g>
        </svg>
      )}

      {/* Dynamic Floating Hover Tooltip (Adapts to Country, Prefecture, Municipality, Worldwide L2, and Roads) */}
      {(hoveredCountry || hoveredPrefecture || hoveredMunicipality || hoveredL2Subdivision || hoveredRoad) && (
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

          {/* L2 Worldwide Subdivision Tooltip */}
          {hoveredL2Subdivision && (
            <>
              <div className="tooltip-header">
                <span className="tooltip-flag">{hoveredL2Subdivision.countryFlag}</span>
                <div>
                  <div className="tooltip-name">
                    {hoveredL2Subdivision.nameZh}
                    {hoveredL2Subdivision.nameEn && hoveredL2Subdivision.nameEn !== hoveredL2Subdivision.nameZh
                      ? ` (${hoveredL2Subdivision.nameEn})`
                      : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {hoveredL2Subdivision.countryNameZh} ({hoveredL2Subdivision.countryName})
                    {hoveredL2Subdivision.typeEn ? ` · ${hoveredL2Subdivision.typeEn}` : ''}
                  </div>
                </div>
              </div>
              <div className="tooltip-meta">
                <span className="tooltip-badge" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                  L2 · 第一級行政區
                </span>
                {hoveredL2Subdivision.code && (
                  <span className="tooltip-badge" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                    {hoveredL2Subdivision.code}
                  </span>
                )}
                {hoveredL2Subdivision.postal && (
                  <span className="tooltip-badge" style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
                    郵區: {hoveredL2Subdivision.postal}
                  </span>
                )}
              </div>
            </>
          )}

          {/* Road Network Tooltip */}
          {hoveredRoad && (
            <>
              <div className="tooltip-header">
                <span className="tooltip-flag">🛣️</span>
                <div>
                  <div className="tooltip-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        background: hoveredRoad.class === 'Interstate' ? '#0284c7' : '#d97706',
                        color: '#ffffff'
                      }}
                    >
                      {hoveredRoad.name}
                    </span>
                    <span>
                      {hoveredRoad.class === 'Interstate' ? '美國州際公路' : '美國國道系統'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {hoveredRoad.class === 'Interstate'
                      ? 'Interstate Highway System'
                      : 'U.S. Numbered Highway System'}
                  </div>
                </div>
              </div>
              <div className="tooltip-meta">
                <span
                  className="tooltip-badge"
                  style={{
                    color: hoveredRoad.class === 'Interstate' ? '#38bdf8' : '#fbbf24',
                    borderColor: hoveredRoad.class === 'Interstate' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(251, 191, 36, 0.3)'
                  }}
                >
                  {hoveredRoad.class === 'Interstate' ? 'Interstate' : 'U.S. Route'}
                </span>
                {hoveredRoad.number && (
                  <span className="tooltip-badge">
                    {Number(hoveredRoad.number) % 2 === 0 ? '東西走向 (E-W)' : '南北走向 (N-S)'}
                  </span>
                )}
                {hoveredRoad.class === 'Interstate' && hoveredRoad.number && (
                  <span className="tooltip-badge" style={{ color: '#94a3b8' }}>
                    {hoveredRoad.number.length <= 2 ? '主要跨州幹線' : '輔助/環城支線'}
                  </span>
                )}
              </div>
            </>
          )}

          {/* L1 Country Tooltip */}
          {hoveredCountry && !hoveredPrefecture && !hoveredMunicipality && !hoveredL2Subdivision && !hoveredRoad && (
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
        lodThresholds={lodThresholds}
        onUpdateThresholds={handleUpdateThresholds}
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
          className={`map-control-btn ${showRoads ? 'active' : ''}`}
          onClick={handleToggleRoads}
          title={showRoads ? '關閉公路系統圖層 (Hide Highways)' : '開啟公路系統圖層 (Show Highways)'}
        >
          <Route size={18} />
        </button>
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
