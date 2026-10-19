import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';
import * as flatgeobuf from 'flatgeobuf';
import { ZoomIn, ZoomOut, RotateCcw, Phone, Route } from 'lucide-react';
import type { CountryData } from '../types/geo';
import { FILTERS } from '../data/filters';
import type { FilterDefinition } from '../data/filters';
import { findCountry } from '../data/countries';
import { getLODLevel, DEFAULT_LOD_THRESHOLDS, MAX_ZOOM_K } from '../types/lod';
import type { LODLevel, PrefectureDetail, MunicipalityDetail, CustomLODThresholds } from '../types/lod';
import { JAPAN_PREFECTURES } from '../data/japanData';
import { PrecisionHUD } from './PrecisionHUD';
import { L2_MANIFEST } from '../data/l2Manifest';
import { L3_MANIFEST } from '../data/l3Manifest';
import { ROADS_MANIFEST } from '../data/roadsManifest';

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

export interface CountryPathData {
  pathD: string;
  path2D: Path2D;
  bbox: [number, number, number, number];
  countryMeta: CountryData | undefined;
  id: string;
  name: string;
}

export interface PrefecturePathData {
  pathD: string;
  path2D: Path2D;
  bbox: [number, number, number, number];
  prefMeta: PrefectureDetail | undefined;
  id: number;
  nameJa: string;
  nameEn: string;
  centroid: [number, number];
}

export interface MunicipalityPathData {
  pathD: string;
  path2D: Path2D;
  bbox: [number, number, number, number];
  code: string;
  prefId: number;
  pref: string;
  city: string;
  gun: string;
}

export interface L2SubdivisionPathData {
  pathD: string;
  path2D: Path2D;
  bbox: [number, number, number, number];
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

export interface L3SubdivisionPathData {
  pathD: string;
  path2D: Path2D;
  bbox: [number, number, number, number];
  id: string;
  iso2: string;
  name: string;
  nameEn: string;
  nameZh: string;
  typeEn: string;
  parentName: string;
  parentCode: string;
  code: string;
}

export interface RoadPathData {
  pathD: string;
  name: string;
  class: 'Interstate' | 'Federal';
  number: string;
  prefix: string;
  type: string;
  scalerank: number;
  bbox: [number, number, number, number];
  path2D?: Path2D;
}

type HitFeature =
  | { type: 'road'; data: RoadPathData }
  | { type: 'municipality'; data: MunicipalityDetail }
  | { type: 'prefecture'; data: PrefecturePathData }
  | { type: 'l2Subdivision'; data: L2SubdivisionPathData }
  | { type: 'country'; data: CountryPathData };

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
  showRoads?: boolean;
  onToggleRoads?: () => void;
  selectedRoad?: RoadPathData | null;
  onSelectRoad?: (road: RoadPathData | null) => void;
}

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
  zoomToPrefectureRef,
  showRoads: showRoadsProp,
  onToggleRoads: onToggleRoadsProp,
  selectedRoad,
  onSelectRoad
}) => {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [japanPrefectureFeatures, setJapanPrefectureFeatures] = useState<Feature<Geometry, JapanPrefectureProperties>[]>([]);
  const [japanMunicipalityFeatures, setJapanMunicipalityFeatures] = useState<Feature<Geometry, JapanMunicipalityProperties>[]>([]);
  
  const [loading, setLoading] = useState(true);

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
  const l2PathsByCountryRef = useRef<Record<string, L2SubdivisionPathData[]>>({});
  const [hoveredL2Subdivision, setHoveredL2Subdivision] = useState<L2SubdivisionDetail | null>(null);
  const [selectedL2Subdivision, setSelectedL2Subdivision] = useState<{ iso2: string; id: number | string } | null>(null);

  // Worldwide L3 active states and paths
  const visibleL3Iso2sRef = useRef<Set<string>>(new Set());
  const [visibleL3Iso2s, setVisibleL3Iso2s] = useState<Set<string>>(new Set());
  const inFlightL3FetchesRef = useRef<Set<string>>(new Set());
  const loadedL3DataRef = useRef<Map<string, L3SubdivisionPathData[]>>(new Map());
  const [l3PathsByCountry, setL3PathsByCountry] = useState<Record<string, L3SubdivisionPathData[]>>({});
  const l3PathsByCountryRef = useRef<Record<string, L3SubdivisionPathData[]>>({});

  // Road network overlay state and refs
  const [internalShowRoads, setInternalShowRoads] = useState<boolean>(false);
  const showRoads = showRoadsProp !== undefined ? showRoadsProp : internalShowRoads;
  const showRoadsRef = useRef<boolean>(showRoads);
  const visibleRoadIso2sRef = useRef<Set<string>>(new Set());
  const [visibleRoadIso2s, setVisibleRoadIso2s] = useState<Set<string>>(new Set());
  const visibleRoadCopiesRef = useRef<number[]>([0]);
  const inFlightRoadFetchesRef = useRef<Set<string>>(new Set());
  const loadedRoadsRef = useRef<Map<string, RoadPathData[]>>(new Map());
  const roadBundlesRef = useRef<
    Map<string, { roads: RoadPathData[]; interstatesPath2D: Path2D; usRoutesPath2D: Path2D }>
  >(new Map());
  const [hoveredRoad, setHoveredRoad] = useState<RoadPathData | null>(null);
  const hoveredRoadRef = useRef<RoadPathData | null>(null);
  const selectedRoadRef = useRef<RoadPathData | null>(selectedRoad || null);

  // Unified Canvas and Container Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const animRafId = useRef<number | null>(null);

  // Real-time synchronization refs for 120fps render loop
  const hoveredCountryRef = useRef<CountryData | null>(hoveredCountry || null);
  const selectedCountryRef = useRef<CountryData | null>(selectedCountry || null);
  const hoveredPrefectureRef = useRef<PrefectureDetail | null>(hoveredPrefecture || null);
  const selectedPrefectureRef = useRef<PrefectureDetail | null>(selectedPrefecture || null);
  const hoveredMunicipalityRef = useRef<MunicipalityDetail | null>(hoveredMunicipality || null);
  const selectedMunicipalityRef = useRef<MunicipalityDetail | null>(selectedMunicipality || null);
  const hoveredL2SubdivisionRef = useRef<L2SubdivisionDetail | null>(hoveredL2Subdivision || null);
  const selectedL2SubdivisionRef = useRef<{ iso2: string; id: number | string } | null>(selectedL2Subdivision || null);
  const lodLevelRef = useRef<LODLevel>(lodLevel);
  const activeL3ParentKeysRef = useRef<Set<string>>(new Set());

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
  const activeFilterDefRef = useRef<FilterDefinition>(activeFilterDef);

  // Web Mercator Projection & GeoPath
  const projection = useMemo(() => {
    return geoMercator()
      .scale(MERCATOR_SCALE)
      .translate([MAP_W / 2, MAP_H / 2]);
  }, []);

  const pathGenerator = useMemo(() => {
    return geoPath().projection(projection);
  }, [projection]);

  // Pre-calculate paths, Path2D and AABB bounding boxes for L1 Countries
  const countryPathData = useMemo<CountryPathData[]>(() => {
    return features.map((feature) => {
      const pathD = pathGenerator(feature) || '';
      let bbox: [number, number, number, number] = [0, 0, 0, 0];
      try {
        const bounds = pathGenerator.bounds(feature);
        if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
          bbox = [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]];
        }
      } catch {
        // fallback
      }
      const path2D = new Path2D(pathD);
      const countryMeta = findCountry(feature.id) || findCountry(feature.properties?.name);
      return {
        pathD,
        path2D,
        bbox,
        countryMeta,
        id: feature.id,
        name: feature.properties?.name || 'Unknown'
      };
    });
  }, [features, pathGenerator]);

  // Pre-calculate paths, Path2D and AABB bounding boxes for L2 Japan 47 Prefectures
  const prefecturePathData = useMemo<PrefecturePathData[]>(() => {
    return japanPrefectureFeatures.map((feature) => {
      const pathD = pathGenerator(feature) || '';
      let bbox: [number, number, number, number] = [0, 0, 0, 0];
      try {
        const bounds = pathGenerator.bounds(feature);
        if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
          bbox = [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]];
        }
      } catch {
        // fallback
      }
      const path2D = new Path2D(pathD);
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
        path2D,
        bbox,
        prefMeta,
        id: prefId,
        nameJa: feature.properties?.nam_ja || prefMeta?.nameJa || '',
        nameEn: feature.properties?.nam || prefMeta?.nameEn || '',
        centroid
      };
    });
  }, [japanPrefectureFeatures, pathGenerator]);

  // Pre-calculate paths, Path2D and AABB bounding boxes for L3 Japan 1,906 Municipalities
  const municipalityPathData = useMemo<MunicipalityPathData[]>(() => {
    return japanMunicipalityFeatures.map((feature) => {
      const pathD = pathGenerator(feature) || '';
      let bbox: [number, number, number, number] = [0, 0, 0, 0];
      try {
        const bounds = pathGenerator.bounds(feature);
        if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
          bbox = [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]];
        }
      } catch {
        // fallback
      }
      const path2D = new Path2D(pathD);
      const code = String(feature.properties?.code || feature.id || '');
      const prefId = Number(feature.properties?.pref_id) || 0;
      const pref = String(feature.properties?.pref || (prefId ? JAPAN_PREFECTURES[prefId]?.nameJa : '') || '');
      const city = String(feature.properties?.city || '');
      const gun = String(feature.properties?.gun || '');
      return {
        pathD,
        path2D,
        bbox,
        code,
        prefId,
        pref,
        city,
        gun
      };
    });
  }, [japanMunicipalityFeatures, pathGenerator]);

  // Group Japan municipality paths by prefecture ID for O(1) active retrieval
  const municipalitiesByPrefId = useMemo(() => {
    const map = new Map<number, MunicipalityPathData[]>();
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

  // Active L3 parent keys (Japan prefectures + Worldwide states/regions) that should expand to L3
  const activeL3ParentKeys = useMemo(() => {
    const set = new Set<string>();

    if (pinnedPrefId) {
      set.add(`jp-${pinnedPrefId}`);
      set.add(`jp-${JAPAN_PREFECTURES[pinnedPrefId]?.nameJa}`.toLowerCase());
    }

    if (selectedMunicipality) {
      const iso = (selectedMunicipality.iso2 || 'JP').toLowerCase();
      if (selectedMunicipality.prefId) set.add(`jp-${selectedMunicipality.prefId}`);
      if (selectedMunicipality.pref) set.add(`${iso}-${selectedMunicipality.pref.toLowerCase()}`);
      if (selectedMunicipality.parentCode) set.add(`${iso}-${selectedMunicipality.parentCode.toLowerCase()}`);
    }

    if (selectedPrefecture?.id) {
      set.add(`jp-${selectedPrefecture.id}`);
      set.add(`jp-${selectedPrefecture.nameJa}`.toLowerCase());
    }

    if (selectedL2Subdivision) {
      set.add(`${selectedL2Subdivision.iso2}-${selectedL2Subdivision.id}`.toLowerCase());
    }

    if (hoveredPrefecture?.id) {
      set.add(`jp-${hoveredPrefecture.id}`);
      set.add(`jp-${hoveredPrefecture.nameJa}`.toLowerCase());
    }

    if (hoveredL2Subdivision) {
      const iso = hoveredL2Subdivision.iso2.toLowerCase();
      set.add(`${iso}-${hoveredL2Subdivision.id}`.toLowerCase());
      set.add(`${iso}-${hoveredL2Subdivision.name}`.toLowerCase());
      if (hoveredL2Subdivision.code) set.add(`${iso}-${hoveredL2Subdivision.code}`.toLowerCase());
    }

    if (hoveredMunicipality) {
      const iso = (hoveredMunicipality.iso2 || 'JP').toLowerCase();
      if (hoveredMunicipality.prefId) set.add(`jp-${hoveredMunicipality.prefId}`);
      if (hoveredMunicipality.pref) set.add(`${iso}-${hoveredMunicipality.pref.toLowerCase()}`);
      if (hoveredMunicipality.parentCode) set.add(`${iso}-${hoveredMunicipality.parentCode.toLowerCase()}`);
    }

    return set;
  }, [pinnedPrefId, selectedMunicipality, selectedPrefecture, selectedL2Subdivision, hoveredPrefecture, hoveredL2Subdivision, hoveredMunicipality]);

  // Fast helper to check if an L2 parent is currently expanded into L3 units
  const isParentActiveInL3 = useCallback((iso2: string, name?: string, code?: string, id?: string | number): boolean => {
    const normIso = (iso2 || '').toLowerCase();
    const set = activeL3ParentKeysRef.current;
    if (id !== undefined && set.has(`${normIso}-${String(id).toLowerCase()}`)) return true;
    if (code && set.has(`${normIso}-${code.toLowerCase()}`)) return true;
    if (name && set.has(`${normIso}-${name.toLowerCase()}`)) return true;
    return false;
  }, []);

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
    if (minY >= maxY) return 0;
    return Math.min(maxY, Math.max(minY, rawY));
  }, []);

  // Check if a bounding box intersects the screen viewport across any world copy
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

  // Synchronize visible L2 countries across viewport
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

  // Synchronize visible L3 countries across viewport
  const syncL3Viewport = useCallback(
    (k: number, x: number, y: number, vw: number, vh: number, currentLOD: LODLevel) => {
      if (currentLOD !== 'L3') {
        if (visibleL3Iso2sRef.current.size > 0) {
          visibleL3Iso2sRef.current = new Set();
          setVisibleL3Iso2s(new Set());
        }
        return;
      }

      const nextVisible = new Set<string>();
      for (let i = 0; i < L3_MANIFEST.length; i++) {
        const c = L3_MANIFEST[i];
        if (isCountryInViewport(c.bbox, k, x, y, vw, vh, 100)) {
          nextVisible.add(c.iso2);
        }
      }

      let changed = false;
      if (nextVisible.size !== visibleL3Iso2sRef.current.size) {
        changed = true;
      } else {
        for (const iso of nextVisible) {
          if (!visibleL3Iso2sRef.current.has(iso)) {
            changed = true;
            break;
          }
        }
      }

      if (changed) {
        visibleL3Iso2sRef.current = nextVisible;
        setVisibleL3Iso2s(nextVisible);
      }
    },
    [isCountryInViewport]
  );

  // Synchronize visible road network countries across viewport
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

      const nextCopies: number[] = [];
      const usBbox = ROADS_MANIFEST.US?.bbox || { minX: 50, maxX: 330, minY: 280, maxY: 480 };
      const sMinY = y + usBbox.minY * k;
      const sMaxY = y + usBbox.maxY * k;
      if (sMaxY >= -50 && sMinY <= vh + 50) {
        for (const c of [0, 1]) {
          const sMinX = x + (usBbox.minX + c * MAP_W) * k;
          const sMaxX = x + (usBbox.maxX + c * MAP_W) * k;
          if (sMaxX >= -50 && sMinX <= vw + 50) {
            nextCopies.push(c);
          }
        }
      }
      if (nextCopies.length === 0) nextCopies.push(0);

      const copiesChanged =
        nextCopies.length !== visibleRoadCopiesRef.current.length ||
        nextCopies.some((c, idx) => c !== visibleRoadCopiesRef.current[idx]);

      if (copiesChanged) {
        visibleRoadCopiesRef.current = nextCopies;
      }
    },
    [isCountryInViewport]
  );

  // Unified viewport synchronizer for L2, L3, and Road networks
  const syncAllViewports = useCallback(
    (k: number, x: number, y: number, vw: number, vh: number, currentLOD: LODLevel) => {
      syncL2Viewport(k, x, y, vw, vh, currentLOD);
      syncL3Viewport(k, x, y, vw, vh, currentLOD);
      syncRoadsViewport(k, x, y, vw, vh, showRoadsRef.current);
    },
    [syncL2Viewport, syncL3Viewport, syncRoadsViewport]
  );

  // Toggle highway and route overlay layer
  const handleToggleRoads = useCallback(() => {
    setHoveredRoad(null);
    hoveredRoadRef.current = null;
    if (onToggleRoadsProp) {
      onToggleRoadsProp();
    } else {
      setInternalShowRoads((prev) => !prev);
    }
  }, [onToggleRoadsProp]);

  // ==========================================
  // UNIFIED CANVAS RENDER LOOP (GPU Accelerated)
  // ==========================================
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vw = viewportSize.current.w;
    const vh = viewportSize.current.h;
    if (vw <= 0 || vh <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(vw * dpr);
    const targetH = Math.round(vh * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const { k, x, y } = transformRef.current;

    // Reset transform & clear frame with seamless ocean backdrop
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Compute visible world copies
    const visibleCopies: number[] = [];
    for (const c of WORLD_COPIES) {
      const left = x + c * MAP_W * k;
      const right = left + MAP_W * k;
      if (right >= -100 && left <= vw + 100) {
        visibleCopies.push(c);
      }
    }
    if (visibleCopies.length === 0) visibleCopies.push(0);

    const hoveredC = hoveredCountryRef.current;
    const selectedC = selectedCountryRef.current;
    const hoveredP = hoveredPrefectureRef.current;
    const selectedP = selectedPrefectureRef.current;
    const hoveredM = hoveredMunicipalityRef.current;
    const selectedM = selectedMunicipalityRef.current;
    const hoveredL2 = hoveredL2SubdivisionRef.current;
    const selectedL2 = selectedL2SubdivisionRef.current;
    const roadsEnabled = showRoadsRef.current;

    const activeFilter = activeFilterDefRef.current;
    const currentLod = lodLevelRef.current;
    const visibleL2Set = visibleL2Iso2sRef.current;

    const highlightHoverPaths: Path2D[] = [];
    const highlightSelectPaths: Path2D[] = [];

    for (const copyIdx of visibleCopies) {
      ctx.setTransform(
        k * dpr,
        0,
        0,
        k * dpr,
        (x + copyIdx * MAP_W * k) * dpr,
        y * dpr
      );

      // ----------------------------------------------------
      // 1. Layer 1: L1 Countries
      // ----------------------------------------------------
      for (let i = 0; i < countryPathData.length; i++) {
        const item = countryPathData[i];
        if (!item.path2D) continue;

        const iso2 = item.countryMeta?.iso2;
        const isJapan = String(item.id) === '392' || item.name === 'Japan' || iso2 === 'JP' || item.countryMeta?.id === '392';
        const isJapanL2Active = isJapan && (currentLod === 'L2' || currentLod === 'L3') && visibleL2Set.has('JP');
        if (isJapanL2Active) continue;

        const isWorldwideL2Active =
          iso2 &&
          iso2 !== 'JP' &&
          (currentLod === 'L2' || currentLod === 'L3') &&
          visibleL2Set.has(iso2) &&
          !!l2PathsByCountryRef.current[iso2];
        if (isWorldwideL2Active) continue;

        const isHovered =
          hoveredC &&
          (hoveredC.id === item.countryMeta?.id || (item.countryMeta && hoveredC.iso2 === item.countryMeta.iso2));
        const isSelected =
          selectedC &&
          (selectedC.id === item.countryMeta?.id || (item.countryMeta && selectedC.iso2 === item.countryMeta.iso2));

        let fillColor: string;
        if (isSelected) {
          fillColor = '#38bdf8';
        } else if (isHovered) {
          fillColor = '#f97316';
        } else if (!item.countryMeta) {
          fillColor = '#1a1f2b';
        } else {
          fillColor = activeFilter.getColor(item.countryMeta) || '#232a38';
        }

        ctx.fillStyle = fillColor;
        ctx.fill(item.path2D);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 0.5 / k;
        ctx.stroke(item.path2D);

        if (isSelected) {
          highlightSelectPaths.push(item.path2D);
        } else if (isHovered) {
          highlightHoverPaths.push(item.path2D);
        }
      }

      // ----------------------------------------------------
      // 2a. Layer 2a: Japan 47 Prefectures (都道府縣)
      // ----------------------------------------------------
      if (((currentLod === 'L2' && visibleL2Set.has('JP')) || currentLod === 'L3') && (copyIdx === 0 || copyIdx === 1)) {
        for (let i = 0; i < prefecturePathData.length; i++) {
          const pref = prefecturePathData[i];
          if (!pref.path2D) continue;

          // If L3 mode and this prefecture is expanded into municipalities, skip L2 drawing
          const isExpanded = currentLod === 'L3' && isParentActiveInL3('JP', pref.nameJa, String(pref.id), pref.id);
          if (isExpanded) continue;

          const isHovered = hoveredP && hoveredP.id === pref.id;
          const isSelected = selectedP && selectedP.id === pref.id;

          let fill = '#1e293b';
          let stroke = '#475569';
          let strokeWidth = 0.6 / k;

          if (isSelected) {
            fill = '#38bdf8';
            stroke = '#38bdf8';
            strokeWidth = 1.2 / k;
          } else if (isHovered) {
            fill = '#f97316';
            stroke = '#ffffff';
            strokeWidth = 1.4 / k;
          } else if (hoveredP || (hoveredM && (!hoveredM.iso2 || hoveredM.iso2 === 'JP'))) {
            fill = 'rgba(251, 146, 60, 0.16)';
            stroke = 'rgba(251, 146, 60, 0.35)';
            strokeWidth = 0.6 / k;
          }

          ctx.fillStyle = fill;
          ctx.fill(pref.path2D);
          ctx.strokeStyle = stroke;
          ctx.lineWidth = strokeWidth;
          ctx.stroke(pref.path2D);

          if (isSelected) {
            highlightSelectPaths.push(pref.path2D);
          } else if (isHovered) {
            highlightHoverPaths.push(pref.path2D);
          }
        }
      }

      // ----------------------------------------------------
      // 2b. Layer 2b: Worldwide Admin-1 Subdivisions
      // ----------------------------------------------------
      if ((currentLod === 'L2' || currentLod === 'L3') && (copyIdx === 0 || copyIdx === 1)) {
        for (let i = 0; i < activeL2SubdivisionPaths.length; i++) {
          const sub = activeL2SubdivisionPaths[i];
          if (!sub.path2D) continue;

          // If L3 mode and this subdivision is expanded into L3 units, skip L2 drawing
          const isExpanded = currentLod === 'L3' && isParentActiveInL3(sub.iso2, sub.name, sub.code, sub.id);
          if (isExpanded) continue;

          const isSelected = selectedL2 && selectedL2.iso2 === sub.iso2 && selectedL2.id === sub.id;
          const isHovered = hoveredL2 && hoveredL2.iso2 === sub.iso2 && hoveredL2.id === sub.id;
          const isSiblingHovered =
            (hoveredL2 && hoveredL2.iso2 === sub.iso2) ||
            (hoveredM && hoveredM.iso2 === sub.iso2);

          let fill = '#1e293b';
          let stroke = '#475569';
          let strokeWidth = 0.6 / k;

          if (isSelected) {
            fill = '#38bdf8';
            stroke = '#38bdf8';
            strokeWidth = 1.2 / k;
          } else if (isHovered) {
            fill = '#f97316';
            stroke = '#ffffff';
            strokeWidth = 1.4 / k;
          } else if (isSiblingHovered) {
            fill = 'rgba(251, 146, 60, 0.16)';
            stroke = 'rgba(251, 146, 60, 0.35)';
            strokeWidth = 0.6 / k;
          }

          ctx.fillStyle = fill;
          ctx.fill(sub.path2D);
          ctx.strokeStyle = stroke;
          ctx.lineWidth = strokeWidth;
          ctx.stroke(sub.path2D);

          if (isSelected) {
            highlightSelectPaths.push(sub.path2D);
          } else if (isHovered) {
            highlightHoverPaths.push(sub.path2D);
          }
        }
      }

      // ----------------------------------------------------
      // 3a. Layer 3a: Japan Municipalities (市區町村)
      // ----------------------------------------------------
      if (currentLod === 'L3' && (copyIdx === 0 || copyIdx === 1)) {
        // Japan legacy features
        for (let i = 0; i < prefecturePathData.length; i++) {
          const pref = prefecturePathData[i];
          if (!isParentActiveInL3('JP', pref.nameJa, String(pref.id), pref.id)) continue;

          const munis = municipalitiesByPrefId.get(pref.id) || [];
          for (let mIdx = 0; mIdx < munis.length; mIdx++) {
            const m = munis[mIdx];
            if (!m.path2D) continue;

            const isHovered = hoveredM && hoveredM.code === m.code && (!hoveredM.iso2 || hoveredM.iso2 === 'JP');
            const isSelected = selectedM && selectedM.code === m.code && (!selectedM.iso2 || selectedM.iso2 === 'JP');
            const isParentPref =
              hoveredM &&
              (!hoveredM.iso2 || hoveredM.iso2 === 'JP') &&
              (hoveredM.prefId ? hoveredM.prefId === m.prefId : hoveredM.pref === m.pref);

            let fill = '#1e2433';
            let stroke = 'rgba(255, 255, 255, 0.2)';
            let strokeWidth = 0.35 / k;

            if (isSelected) {
              fill = '#38bdf8';
              stroke = '#38bdf8';
              strokeWidth = 0.8 / k;
            } else if (isHovered) {
              fill = '#f97316';
              stroke = '#ffffff';
              strokeWidth = 0.8 / k;
            } else if (isParentPref) {
              fill = 'rgba(234, 88, 12, 0.35)';
              stroke = 'rgba(251, 146, 60, 0.5)';
              strokeWidth = 0.35 / k;
            } else if (hoveredM && (!hoveredM.iso2 || hoveredM.iso2 === 'JP')) {
              fill = 'rgba(251, 146, 60, 0.13)';
              stroke = 'rgba(251, 146, 60, 0.22)';
              strokeWidth = 0.35 / k;
            }

            ctx.fillStyle = fill;
            ctx.fill(m.path2D);
            ctx.strokeStyle = stroke;
            ctx.lineWidth = strokeWidth;
            ctx.stroke(m.path2D);

            if (isSelected) {
              highlightSelectPaths.push(m.path2D);
            } else if (isHovered) {
              highlightHoverPaths.push(m.path2D);
            }
          }
        }

        // ----------------------------------------------------
        // 3b. Layer 3b: Worldwide L3 Subdivisions (US Counties, FR Departments, DE Landkreise, etc.)
        // ----------------------------------------------------
        for (const [iso2, paths] of Object.entries(l3PathsByCountryRef.current)) {
          if (iso2 === 'JP') continue; // Handled above

          for (let pIdx = 0; pIdx < paths.length; pIdx++) {
            const item = paths[pIdx];
            if (!item.path2D) continue;

            const isExpanded = isParentActiveInL3(item.iso2, item.parentName, item.parentCode);
            if (!isExpanded) continue;

            const isHovered = hoveredM && hoveredM.iso2 === item.iso2 && hoveredM.code === item.id;
            const isSelected = selectedM && selectedM.iso2 === item.iso2 && selectedM.code === item.id;
            const isParentSub =
              hoveredM &&
              hoveredM.iso2 === item.iso2 &&
              (hoveredM.pref === item.parentName || hoveredM.parentCode === item.parentCode);

            let fill = '#1e2433';
            let stroke = 'rgba(255, 255, 255, 0.2)';
            let strokeWidth = 0.35 / k;

            if (isSelected) {
              fill = '#38bdf8';
              stroke = '#38bdf8';
              strokeWidth = 0.8 / k;
            } else if (isHovered) {
              fill = '#f97316';
              stroke = '#ffffff';
              strokeWidth = 0.8 / k;
            } else if (isParentSub) {
              fill = 'rgba(234, 88, 12, 0.35)';
              stroke = 'rgba(251, 146, 60, 0.5)';
              strokeWidth = 0.35 / k;
            } else if (hoveredM && hoveredM.iso2 === item.iso2) {
              fill = 'rgba(251, 146, 60, 0.13)';
              stroke = 'rgba(251, 146, 60, 0.22)';
              strokeWidth = 0.35 / k;
            }

            ctx.fillStyle = fill;
            ctx.fill(item.path2D);
            ctx.strokeStyle = stroke;
            ctx.lineWidth = strokeWidth;
            ctx.stroke(item.path2D);

            if (isSelected) {
              highlightSelectPaths.push(item.path2D);
            } else if (isHovered) {
              highlightHoverPaths.push(item.path2D);
            }
          }
        }
      }

      // ----------------------------------------------------
      // 4. Layer 4: Highway and Route Network Overlay
      // ----------------------------------------------------
      if (roadsEnabled) {
        for (const iso2 of visibleRoadIso2sRef.current) {
          const bundle = roadBundlesRef.current.get(iso2);
          if (!bundle) continue;

          // 4a. US Routes (Gold / Amber, 1.1px screen thickness)
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.1 / k;
          ctx.globalAlpha = 0.75;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke(bundle.usRoutesPath2D);

          // 4b. Interstates (Sky Blue, 1.6px screen thickness)
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.6 / k;
          ctx.globalAlpha = 0.9;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke(bundle.interstatesPath2D);
          ctx.globalAlpha = 1.0;
        }

        // 4c. Highlight selected highway with prominent glowing neon orange outline
        const selectedRoadItem = selectedRoadRef.current;
        if (selectedRoadItem && selectedRoadItem.path2D) {
          ctx.save();
          const isInterstate = selectedRoadItem.class === 'Interstate';
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = (isInterstate ? 4.2 : 3.4) / k;
          ctx.globalAlpha = 1.0;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = 'rgba(249, 115, 22, 1.0)';
          ctx.shadowBlur = 12 * dpr;
          ctx.stroke(selectedRoadItem.path2D);
          ctx.restore();
        }

        // 4d. Highlight currently hovered highway with vibrant neon orange and soft shadow glow
        const hoveredRoadItem = hoveredRoadRef.current;
        if (hoveredRoadItem && hoveredRoadItem.path2D && hoveredRoadItem.name !== selectedRoadItem?.name) {
          ctx.save();
          const isInterstate = hoveredRoadItem.class === 'Interstate';
          ctx.strokeStyle = '#fb923c';
          ctx.lineWidth = (isInterstate ? 3.4 : 2.8) / k;
          ctx.globalAlpha = 0.95;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = 'rgba(249, 115, 22, 0.8)';
          ctx.shadowBlur = 8 * dpr;
          ctx.stroke(hoveredRoadItem.path2D);
          ctx.restore();
        }
      }

      // ----------------------------------------------------
      // 5. Layer 5: Glowing Highlights on top of all borders
      // ----------------------------------------------------
      for (const p of highlightHoverPaths) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / k;
        ctx.shadowColor = 'rgba(249, 115, 22, 0.8)';
        ctx.shadowBlur = 8 * dpr;
        ctx.stroke(p);
        ctx.restore();
      }

      for (const p of highlightSelectPaths) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.0 / k;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.9)';
        ctx.shadowBlur = 10 * dpr;
        ctx.stroke(p);
        ctx.restore();
      }

      highlightHoverPaths.length = 0;
      highlightSelectPaths.length = 0;
    }
  }, [countryPathData, prefecturePathData, activeL2SubdivisionPaths, municipalitiesByPrefId, isParentActiveInL3]);

  // Smooth animation tween using requestAnimationFrame
  const animateTo = useCallback(
    (targetK: number, targetX: number, targetY: number, duration = 350, onComplete?: () => void) => {
      if (animRafId.current) {
        cancelAnimationFrame(animRafId.current);
        animRafId.current = null;
      }
      const startK = transformRef.current.k;
      const startX = transformRef.current.x;
      const startY = transformRef.current.y;
      const startTime = performance.now();

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const eased = easeOutCubic(progress);

        const currentK = startK + (targetK - startK) * eased;
        const currentX = startX + (targetX - startX) * eased;
        const currentY = startY + (targetY - startY) * eased;

        transformRef.current = { k: currentK, x: currentX, y: currentY };
        renderCanvas();

        if (progress < 1) {
          animRafId.current = requestAnimationFrame(step);
        } else {
          animRafId.current = null;
          if (onComplete) onComplete();
        }
      };

      animRafId.current = requestAnimationFrame(step);
    },
    [renderCanvas]
  );

  // ==========================================
  // UNIFIED HIT-TESTING PIPELINE (Canvas 2D)
  // ==========================================
  const getFeatureAtPoint = useCallback((clientX: number, clientY: number): HitFeature | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    const { k, x, y } = transformRef.current;
    const dpr = window.devicePixelRatio || 1;
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. In Highway Exploration Mode: Hit test roads with 10px stroke tolerance
    if (showRoadsRef.current) {
      const tolerancePx = 10;
      const toleranceMap = tolerancePx / k;
      let candidateFederal: RoadPathData | null = null;

      for (const copyIdx of visibleRoadCopiesRef.current) {
        const mapX = (mx - x) / k - copyIdx * MAP_W;
        const mapY = (my - y) / k;

        ctx.setTransform(
          k * dpr,
          0,
          0,
          k * dpr,
          (x + copyIdx * MAP_W * k) * dpr,
          y * dpr
        );
        ctx.lineWidth = (tolerancePx * 2) / k;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const iso2 of visibleRoadIso2sRef.current) {
          const roads = loadedRoadsRef.current.get(iso2);
          if (!roads) continue;

          for (let i = 0; i < roads.length; i++) {
            const road = roads[i];
            const [minX, minY, maxX, maxY] = road.bbox;
            if (
              mapX < minX - toleranceMap ||
              mapX > maxX + toleranceMap ||
              mapY < minY - toleranceMap ||
              mapY > maxY + toleranceMap
            ) {
              continue;
            }

            if (road.path2D && ctx.isPointInStroke(road.path2D, mx * dpr, my * dpr)) {
              if (road.class === 'Interstate') {
                return { type: 'road', data: road };
              }
              if (!candidateFederal) {
                candidateFederal = road;
              }
            }
          }
        }
      }
      if (candidateFederal) {
        return { type: 'road', data: candidateFederal };
      }
      return null;
    }

    // 2. Normal Mode: Hierarchical Polygon Hit-Testing (L3 -> L2 Prefectures -> L2 Subdivisions -> L1 Countries)
    for (const copyIdx of WORLD_COPIES) {
      const mapX = (mx - x) / k - copyIdx * MAP_W;
      const mapY = (my - y) / k;

      if (mapX < 0 || mapX > MAP_W || mapY < 0 || mapY > MAP_H) {
        continue;
      }

      ctx.setTransform(
        k * dpr,
        0,
        0,
        k * dpr,
        (x + copyIdx * MAP_W * k) * dpr,
        y * dpr
      );

      // 2a. Check L3 Municipalities / Subdivisions (if L3 mode and copy 0 or 1)
      if (lodLevelRef.current === 'L3' && (copyIdx === 0 || copyIdx === 1)) {
        // Japan municipalities
        for (let i = 0; i < prefecturePathData.length; i++) {
          const pref = prefecturePathData[i];
          if (!isParentActiveInL3('JP', pref.nameJa, String(pref.id), pref.id)) continue;
          const munis = municipalitiesByPrefId.get(pref.id);
          if (!munis) continue;

          for (let mIdx = 0; mIdx < munis.length; mIdx++) {
            const m = munis[mIdx];
            const [minX, minY, maxX, maxY] = m.bbox;
            if (mapX < minX || mapX > maxX || mapY < minY || mapY > maxY) continue;
            if (ctx.isPointInPath(m.path2D, mx * dpr, my * dpr)) {
              return {
                type: 'municipality',
                data: {
                  code: m.code,
                  pref: m.pref,
                  prefId: m.prefId,
                  gun: m.gun,
                  city: m.city,
                  nameZh: `${m.pref} ${m.city}`,
                  iso2: 'JP',
                  countryName: 'Japan',
                  countryNameZh: '日本',
                  countryFlag: '🇯🇵',
                  typeEn: 'Municipality',
                  parentName: m.pref,
                  parentCode: String(m.prefId)
                }
              };
            }
          }
        }

        // Worldwide L3 Subdivisions
        for (const [iso2, paths] of Object.entries(l3PathsByCountryRef.current)) {
          if (iso2 === 'JP') continue;

          for (let pIdx = 0; pIdx < paths.length; pIdx++) {
            const item = paths[pIdx];
            if (!isParentActiveInL3(item.iso2, item.parentName, item.parentCode)) continue;

            const [minX, minY, maxX, maxY] = item.bbox;
            if (mapX < minX || mapX > maxX || mapY < minY || mapY > maxY) continue;

            if (ctx.isPointInPath(item.path2D, mx * dpr, my * dpr)) {
              const cMeta = findCountry(item.iso2);
              return {
                type: 'municipality',
                data: {
                  code: item.id || item.code,
                  pref: item.parentName,
                  city: item.name,
                  nameZh: item.nameZh || `${item.parentName} ${item.name}`,
                  iso2: item.iso2,
                  countryName: cMeta?.name || '',
                  countryNameZh: cMeta?.nameZh || '',
                  countryFlag: cMeta?.flag || '🌐',
                  typeEn: item.typeEn || 'District',
                  parentName: item.parentName,
                  parentCode: item.parentCode
                }
              };
            }
          }
        }
      }

      // 2b. Check L2 Japan Prefectures (if L2 or L3 mode, and copy 0 or 1)
      if (
        ((lodLevelRef.current === 'L2' && visibleL2Iso2sRef.current.has('JP')) || lodLevelRef.current === 'L3') &&
        (copyIdx === 0 || copyIdx === 1)
      ) {
        for (let i = 0; i < prefecturePathData.length; i++) {
          const pref = prefecturePathData[i];
          if (lodLevelRef.current === 'L3' && isParentActiveInL3('JP', pref.nameJa, String(pref.id), pref.id)) continue;
          const [minX, minY, maxX, maxY] = pref.bbox;
          if (mapX < minX || mapX > maxX || mapY < minY || mapY > maxY) continue;
          if (ctx.isPointInPath(pref.path2D, mx * dpr, my * dpr)) {
            return { type: 'prefecture', data: pref };
          }
        }
      }

      // 2c. Check L2 Worldwide Subdivisions (if L2 or L3 mode, and copy 0 or 1)
      if ((lodLevelRef.current === 'L2' || lodLevelRef.current === 'L3') && (copyIdx === 0 || copyIdx === 1)) {
        for (let i = 0; i < activeL2SubdivisionPaths.length; i++) {
          const sub = activeL2SubdivisionPaths[i];
          if (lodLevelRef.current === 'L3' && isParentActiveInL3(sub.iso2, sub.name, sub.code, sub.id)) continue;
          const [minX, minY, maxX, maxY] = sub.bbox;
          if (mapX < minX || mapX > maxX || mapY < minY || mapY > maxY) continue;
          if (ctx.isPointInPath(sub.path2D, mx * dpr, my * dpr)) {
            return { type: 'l2Subdivision', data: sub };
          }
        }
      }

      // 2d. Check L1 Countries
      for (let i = 0; i < countryPathData.length; i++) {
        const c = countryPathData[i];
        const iso2 = c.countryMeta?.iso2;
        const isJapan = String(c.id) === '392' || c.name === 'Japan' || iso2 === 'JP' || c.countryMeta?.id === '392';
        const isJapanL2Active = isJapan && (lodLevelRef.current === 'L2' || lodLevelRef.current === 'L3') && visibleL2Iso2sRef.current.has('JP');
        if (isJapanL2Active) continue;

        const isWorldwideL2Active =
          iso2 &&
          iso2 !== 'JP' &&
          (lodLevelRef.current === 'L2' || lodLevelRef.current === 'L3') &&
          visibleL2Iso2sRef.current.has(iso2) &&
          !!l2PathsByCountryRef.current[iso2];
        if (isWorldwideL2Active) continue;

        const [minX, minY, maxX, maxY] = c.bbox;
        if (mapX < minX || mapX > maxX || mapY < minY || mapY > maxY) continue;
        if (ctx.isPointInPath(c.path2D, mx * dpr, my * dpr)) {
          return { type: 'country', data: c };
        }
      }
    }

    return null;
  }, [prefecturePathData, activeL2SubdivisionPaths, countryPathData, municipalitiesByPrefId, isParentActiveInL3]);

  // Map Click Handler: selects feature or deselects when clicking empty space
  const handleMapClick = useCallback(
    (e: React.MouseEvent) => {
      if (hasDragged.current) return;
      const target = e.target as Element | null;
      if (target?.closest('.map-controls, .filter-legend-card, .precision-hud')) {
        return;
      }

      const hit = getFeatureAtPoint(e.clientX, e.clientY);

      if (showRoadsRef.current) {
        if (hit && hit.type === 'road') {
          if (onSelectRoad) onSelectRoad(hit.data);
        } else {
          if (onSelectRoad) onSelectRoad(null);
        }
        return;
      }

      if (!hit) {
        setSelectedL2Subdivision(null);
        selectedL2SubdivisionRef.current = null;
        setPinnedPrefId(null);
        onSelectCountry(null);
        if (onSelectPrefecture) onSelectPrefecture(null);
        if (onSelectMunicipality) onSelectMunicipality(null);
        renderCanvas();
        return;
      }

      if (hit.type === 'municipality') {
        const m = hit.data;
        if (m.prefId) setPinnedPrefId(m.prefId);
        if (onSelectMunicipality) {
          onSelectMunicipality(m);
          onSelectCountry(null);
          if (onSelectPrefecture) onSelectPrefecture(null);
        }
      } else if (hit.type === 'prefecture') {
        const pref = hit.data;
        setPinnedPrefId(pref.id);
        if (pref.prefMeta && onSelectPrefecture) {
          onSelectPrefecture(pref.prefMeta);
          onSelectCountry(null);
          if (onSelectMunicipality) onSelectMunicipality(null);
        }
      } else if (hit.type === 'l2Subdivision') {
        const sub = hit.data;
        const selObj = { iso2: sub.iso2, id: sub.id };
        setSelectedL2Subdivision(selObj);
        selectedL2SubdivisionRef.current = selObj;
        const cMeta = findCountry(sub.iso2);
        if (cMeta) {
          onSelectCountry(cMeta);
          if (onSelectPrefecture) onSelectPrefecture(null);
          if (onSelectMunicipality) onSelectMunicipality(null);
        }
      } else if (hit.type === 'country') {
        const c = hit.data;
        setSelectedL2Subdivision(null);
        selectedL2SubdivisionRef.current = null;
        setPinnedPrefId(null);
        if (c.countryMeta) {
          onSelectCountry(c.countryMeta);
          if (onSelectPrefecture) onSelectPrefecture(null);
          if (onSelectMunicipality) onSelectMunicipality(null);
        } else {
          onSelectCountry(null);
        }
      }
      renderCanvas();
    },
    [onSelectRoad, onSelectCountry, onSelectPrefecture, onSelectMunicipality, getFeatureAtPoint, renderCanvas]
  );

  // Mouse Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (animRafId.current) {
      cancelAnimationFrame(animRafId.current);
      animRafId.current = null;
    }
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

      transformRef.current.x = wrapX(rawX, k);
      transformRef.current.y = clampY(rawY, k, vh);

      if (lodLevelRef.current !== 'L1' || showRoadsRef.current) {
        syncAllViewports(k, transformRef.current.x, transformRef.current.y, vw, vh, lodLevelRef.current);
      }

      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          renderCanvas();
          rafId.current = null;
        });
      }
      return;
    }

    const hit = getFeatureAtPoint(e.clientX, e.clientY);

    if (containerRef.current) {
      containerRef.current.style.cursor = hit ? 'pointer' : 'grab';
    }

    if (!hit) {
      let hadHover = false;
      if (hoveredRoadRef.current) {
        hoveredRoadRef.current = null;
        setHoveredRoad(null);
        hadHover = true;
      }
      if (hoveredCountryRef.current) {
        hoveredCountryRef.current = null;
        setHoveredCountry(null);
        hadHover = true;
      }
      if (hoveredPrefectureRef.current) {
        hoveredPrefectureRef.current = null;
        setHoveredPrefecture(null);
        hadHover = true;
      }
      if (hoveredMunicipalityRef.current) {
        hoveredMunicipalityRef.current = null;
        setHoveredMunicipality(null);
        hadHover = true;
      }
      if (hoveredL2SubdivisionRef.current) {
        hoveredL2SubdivisionRef.current = null;
        setHoveredL2Subdivision(null);
        hadHover = true;
      }
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }
      if (hadHover) {
        renderCanvas();
      }
      return;
    }

    if (hit.type === 'road') {
      const road = hit.data;
      if (hoveredRoadRef.current?.name !== road.name) {
        hoveredRoadRef.current = road;
        setHoveredRoad(road);
        hoveredCountryRef.current = null;
        setHoveredCountry(null);
        hoveredPrefectureRef.current = null;
        setHoveredPrefecture(null);
        hoveredMunicipalityRef.current = null;
        setHoveredMunicipality(null);
        hoveredL2SubdivisionRef.current = null;
        setHoveredL2Subdivision(null);
        renderCanvas();
      }
    } else if (hit.type === 'municipality') {
      const m = hit.data;
      if (hoveredMunicipalityRef.current?.code !== m.code || hoveredMunicipalityRef.current?.iso2 !== m.iso2) {
        hoveredMunicipalityRef.current = m;
        setHoveredMunicipality(m);
        hoveredRoadRef.current = null;
        setHoveredRoad(null);
        hoveredCountryRef.current = null;
        setHoveredCountry(null);
        hoveredPrefectureRef.current = null;
        setHoveredPrefecture(null);
        hoveredL2SubdivisionRef.current = null;
        setHoveredL2Subdivision(null);
        renderCanvas();
      }
    } else if (hit.type === 'prefecture') {
      const pref = hit.data;
      if (hoveredPrefectureRef.current?.id !== pref.id) {
        const prefDetail: PrefectureDetail = pref.prefMeta || {
          id: pref.id,
          nameJa: pref.nameJa,
          nameZh: pref.nameJa,
          nameEn: pref.nameEn,
          region: '日本',
          capital: '',
          areaCode: '0x',
          plates: [],
          proClues: ['日本都道府縣行政區'],
          landscapeDesc: ''
        };
        hoveredPrefectureRef.current = prefDetail;
        setHoveredPrefecture(prefDetail);
        hoveredRoadRef.current = null;
        setHoveredRoad(null);
        hoveredCountryRef.current = null;
        setHoveredCountry(null);
        hoveredMunicipalityRef.current = null;
        setHoveredMunicipality(null);
        hoveredL2SubdivisionRef.current = null;
        setHoveredL2Subdivision(null);
        renderCanvas();
      }
    } else if (hit.type === 'l2Subdivision') {
      const sub = hit.data;
      if (
        hoveredL2SubdivisionRef.current?.iso2 !== sub.iso2 ||
        hoveredL2SubdivisionRef.current?.id !== sub.id
      ) {
        const cMeta = findCountry(sub.iso2);
        const subDetail: L2SubdivisionDetail = {
          id: sub.id,
          iso2: sub.iso2,
          name: sub.name,
          nameEn: sub.nameEn,
          nameZh: sub.nameZh,
          typeEn: sub.typeEn,
          code: sub.code,
          postal: sub.postal,
          countryName: cMeta?.name || sub.nameEn,
          countryNameZh: cMeta?.nameZh || sub.nameZh,
          countryFlag: cMeta?.flag || '🌐'
        };
        hoveredL2SubdivisionRef.current = subDetail;
        setHoveredL2Subdivision(subDetail);
        hoveredRoadRef.current = null;
        setHoveredRoad(null);
        hoveredCountryRef.current = null;
        setHoveredCountry(null);
        hoveredPrefectureRef.current = null;
        setHoveredPrefecture(null);
        hoveredMunicipalityRef.current = null;
        setHoveredMunicipality(null);
        renderCanvas();
      }
    } else if (hit.type === 'country') {
      const c = hit.data;
      const cMeta = c.countryMeta || {
        id: String(c.id),
        iso2: '',
        iso3: '',
        name: c.name,
        nameZh: c.name,
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
      };
      if (hoveredCountryRef.current?.id !== cMeta.id) {
        hoveredCountryRef.current = cMeta;
        setHoveredCountry(cMeta);
        hoveredRoadRef.current = null;
        setHoveredRoad(null);
        hoveredPrefectureRef.current = null;
        setHoveredPrefecture(null);
        hoveredMunicipalityRef.current = null;
        setHoveredMunicipality(null);
        hoveredL2SubdivisionRef.current = null;
        setHoveredL2Subdivision(null);
        renderCanvas();
      }
    }

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
    const { k, x, y } = transformRef.current;
    syncAllViewports(k, x, y, viewportSize.current.w, viewportSize.current.h, lodLevelRef.current);
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

    const ratio = newK / k;
    const newX = mx - (mx - x) * ratio;
    const newY = my - (my - y) * ratio;

    transformRef.current.k = newK;
    transformRef.current.x = wrapX(newX, newK);
    transformRef.current.y = clampY(newY, newK, vh);

    const nextLOD = getLODLevel(newK, lodThresholds);
    if (nextLOD !== lodLevel) {
      setLodLevel(nextLOD);
      lodLevelRef.current = nextLOD;
    }
    setZoomK(Number(newK.toFixed(1)));
    syncAllViewports(newK, transformRef.current.x, transformRef.current.y, viewportSize.current.w, vh, nextLOD);

    renderCanvas();
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
    const newX = wrapX(cx - (cx - x) * (newK / k), newK);
    const newY = clampY(cy - (cy - y) * (newK / k), newK, vh);

    const nextLOD = getLODLevel(newK, lodThresholds);
    if (nextLOD !== lodLevel) {
      setLodLevel(nextLOD);
      lodLevelRef.current = nextLOD;
    }
    setZoomK(Number(newK.toFixed(1)));
    animateTo(newK, newX, newY, 280, () => {
      syncAllViewports(newK, newX, newY, vw, vh, nextLOD);
    });
  };

  const handleResetZoom = () => {
    const vh = viewportSize.current.h;
    const vw = viewportSize.current.w;
    const kMin = vh / MAP_H;

    const targetX = wrapX(vw / 2 - (MAP_W / 2) * kMin, kMin);
    const targetY = clampY((vh - MAP_H * kMin) / 2, kMin, vh);

    const targetLOD = getLODLevel(kMin, lodThresholds);

    setZoomK(Number(kMin.toFixed(1)));
    setLodLevel(targetLOD);
    lodLevelRef.current = targetLOD;
    animateTo(kMin, targetX, targetY, 320, () => {
      syncAllViewports(kMin, targetX, targetY, vw, vh, targetLOD);
    });
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
      if (nextLOD !== lodLevelRef.current) {
        setLodLevel(nextLOD);
        lodLevelRef.current = nextLOD;
      }
      setZoomK(Number(newK.toFixed(1)));
      syncAllViewports(newK, transformRef.current.x, transformRef.current.y, vw, vh, nextLOD);
      renderCanvas();
    },
    [wrapX, clampY, renderCanvas, lodThresholds, syncAllViewports]
  );

  // Update dynamic custom LOD thresholds
  const handleUpdateThresholds = useCallback(
    (newThresholds: CustomLODThresholds) => {
      setLodThresholds(newThresholds);
      const currentK = transformRef.current.k;
      const nextLOD = getLODLevel(currentK, newThresholds);
      if (nextLOD !== lodLevelRef.current) {
        setLodLevel(nextLOD);
        lodLevelRef.current = nextLOD;
        syncAllViewports(
          currentK,
          transformRef.current.x,
          transformRef.current.y,
          viewportSize.current.w,
          viewportSize.current.h,
          nextLOD
        );
        renderCanvas();
      }
    },
    [syncAllViewports, renderCanvas]
  );

  // Synchronize state and prop changes into render refs
  useEffect(() => {
    selectedCountryRef.current = selectedCountry;
    renderCanvas();
  }, [selectedCountry, renderCanvas]);

  useEffect(() => {
    selectedPrefectureRef.current = selectedPrefecture || null;
    renderCanvas();
  }, [selectedPrefecture, renderCanvas]);

  useEffect(() => {
    selectedMunicipalityRef.current = selectedMunicipality || null;
    renderCanvas();
  }, [selectedMunicipality, renderCanvas]);

  useEffect(() => {
    selectedRoadRef.current = selectedRoad || null;
    renderCanvas();
  }, [selectedRoad, renderCanvas]);

  useEffect(() => {
    activeFilterDefRef.current = activeFilterDef;
    renderCanvas();
  }, [activeFilterDef, renderCanvas]);

  useEffect(() => {
    lodLevelRef.current = lodLevel;
    renderCanvas();
  }, [lodLevel, renderCanvas]);

  useEffect(() => {
    activeL3ParentKeysRef.current = activeL3ParentKeys;
    renderCanvas();
  }, [activeL3ParentKeys, renderCanvas]);

  useEffect(() => {
    l2PathsByCountryRef.current = l2PathsByCountry;
    renderCanvas();
  }, [l2PathsByCountry, renderCanvas]);

  useEffect(() => {
    l3PathsByCountryRef.current = l3PathsByCountry;
    renderCanvas();
  }, [l3PathsByCountry, renderCanvas]);

  useEffect(() => {
    visibleL2Iso2sRef.current = visibleL2Iso2s;
    renderCanvas();
  }, [visibleL2Iso2s, renderCanvas]);

  useEffect(() => {
    showRoadsRef.current = showRoads;
    if (showRoads && tooltipRef.current) {
      tooltipRef.current.style.display = 'none';
    }
    const { k, x, y } = transformRef.current;
    syncRoadsViewport(k, x, y, viewportSize.current.w, viewportSize.current.h, showRoads);
    renderCanvas();
  }, [showRoads, syncRoadsViewport, renderCanvas]);

  // Load FlatGeobuf datasets (L1 World, L2 Japan Prefectures, L3 Japan Municipalities)
  useEffect(() => {
    let isMounted = true;

    // 1. Load L1 World Countries via FlatGeobuf binary
    (async () => {
      try {
        const res = await fetch('/data/countries-110m.fgb');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        if (!isMounted) return;

        const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));
        const loadedFeatures: GeoFeature[] = [];
        for await (const feature of it) {
          const props = (feature.properties || {}) as WorldCountryProperties;
          const countryId = String(props.id || feature.id || '');
          loadedFeatures.push({
            ...feature,
            id: countryId,
            properties: props
          } as unknown as GeoFeature);
        }
        if (isMounted) {
          setFeatures(loadedFeatures);
          setLoading(false);
        }
      } catch (err) {
        console.error('L1 Countries FlatGeobuf loading error:', err);
      }
    })();

    // 2. Load L2 Japan 47 Prefectures via FlatGeobuf binary
    (async () => {
      try {
        const res = await fetch('/data/l2/JP.fgb');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        if (!isMounted) return;

        const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));
        const loadedFeatures: Feature<Geometry, JapanPrefectureProperties>[] = [];
        for await (const feature of it) {
          loadedFeatures.push(feature as unknown as Feature<Geometry, JapanPrefectureProperties>);
        }
        if (isMounted) {
          setJapanPrefectureFeatures(loadedFeatures);
        }
      } catch (err) {
        console.warn('L2 Prefectures FlatGeobuf loading notice:', err);
      }
    })();

    // 3. Load L3 Japan Municipalities via FlatGeobuf binary
    (async () => {
      try {
        const res = await fetch('/data/japan-municipalities.fgb');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        if (!isMounted) return;

        const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));
        const loadedFeatures: Feature<Geometry, JapanMunicipalityProperties>[] = [];
        for await (const feature of it) {
          loadedFeatures.push(feature as unknown as Feature<Geometry, JapanMunicipalityProperties>);
        }
        if (isMounted) {
          setJapanMunicipalityFeatures(loadedFeatures);
        }
      } catch (err) {
        console.warn('L3 Municipalities FlatGeobuf loading notice:', err);
      }
    })();

    return () => {
      isMounted = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (animRafId.current) cancelAnimationFrame(animRafId.current);
    };
  }, []);

  // On-demand loader for visible countries' L2 FlatGeobuf datasets
  useEffect(() => {
    if (lodLevel === 'L1') return;

    let isMounted = true;
    for (const iso2 of visibleL2Iso2s) {
      if (iso2 === 'JP') continue;
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
            let bbox: [number, number, number, number] = [0, 0, 0, 0];
            try {
              const bounds = pathGenerator.bounds(feature);
              if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
                bbox = [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]];
              }
            } catch {
              // fallback
            }
            const path2D = new Path2D(pathD);
            let centroid: [number, number] = [0, 0];
            try {
              const c = pathGenerator.centroid(feature);
              if (c && !isNaN(c[0]) && !isNaN(c[1])) centroid = c;
            } catch {
              // fallback
            }
            paths.push({
              pathD,
              path2D,
              bbox,
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

  // On-demand loader for visible countries' L3 FlatGeobuf datasets
  useEffect(() => {
    if (lodLevel !== 'L3') return;

    let isMounted = true;
    for (const iso2 of visibleL3Iso2s) {
      if (iso2 === 'JP') continue; // Japan is handled by japanMunicipalityFeatures
      if (loadedL3DataRef.current.has(iso2) || inFlightL3FetchesRef.current.has(iso2)) continue;

      inFlightL3FetchesRef.current.add(iso2);

      (async () => {
        try {
          const res = await fetch(`/data/l3/${iso2}.fgb`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buffer = await res.arrayBuffer();
          if (!isMounted) return;

          const it = flatgeobuf.geojson.deserialize(new Uint8Array(buffer));
          const paths: L3SubdivisionPathData[] = [];
          for await (const feature of it) {
            const p = (feature.properties || {}) as Record<string, unknown>;
            const pathD = pathGenerator(feature) || '';
            let bbox: [number, number, number, number] = [0, 0, 0, 0];
            try {
              const bounds = pathGenerator.bounds(feature);
              if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
                bbox = [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]];
              }
            } catch {
              // fallback
            }
            const path2D = new Path2D(pathD);
            paths.push({
              pathD,
              path2D,
              bbox,
              id: String(p.id || feature.id || ''),
              iso2: String(p.iso2 || iso2),
              name: String(p.name || ''),
              nameEn: String(p.name_en || p.name || ''),
              nameZh: String(p.name_zh || p.name || ''),
              typeEn: String(p.type_en || ''),
              parentName: String(p.parent_name || ''),
              parentCode: String(p.parent_code || ''),
              code: String(p.code || '')
            });
          }

          if (isMounted) {
            loadedL3DataRef.current.set(iso2, paths);
            setL3PathsByCountry((prev) => ({ ...prev, [iso2]: paths }));
            l3PathsByCountryRef.current[iso2] = paths;
            renderCanvas();
          }
        } catch (err) {
          console.warn(`[L3] Failed to load /data/l3/${iso2}.fgb:`, err);
        } finally {
          inFlightL3FetchesRef.current.delete(iso2);
        }
      })();
    }

    return () => {
      isMounted = false;
    };
  }, [visibleL3Iso2s, lodLevel, pathGenerator, renderCanvas]);

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
          const interstatesPath2D = new Path2D();
          const usRoutesPath2D = new Path2D();

          for await (const feature of it) {
            const p = (feature.properties || {}) as Record<string, unknown>;
            const pathD = pathGenerator(feature) || '';
            if (!pathD) continue;

            let bbox: [number, number, number, number] = [0, 0, 0, 0];
            try {
              const bounds = pathGenerator.bounds(feature);
              if (bounds && !isNaN(bounds[0][0]) && !isNaN(bounds[0][1])) {
                bbox = [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]];
              }
            } catch {
              // fallback
            }

            const roadClass = p.class === 'Interstate' ? 'Interstate' : 'Federal';
            const path2D = new Path2D(pathD);

            if (roadClass === 'Interstate') {
              interstatesPath2D.addPath(path2D);
            } else {
              usRoutesPath2D.addPath(path2D);
            }

            paths.push({
              pathD,
              name: String(p.name || ''),
              class: roadClass,
              number: String(p.number || ''),
              prefix: String(p.prefix || ''),
              type: String(p.type || ''),
              scalerank: Number(p.scalerank || 0),
              bbox,
              path2D
            });
          }

          if (isMounted) {
            loadedRoadsRef.current.set(iso2, paths);
            roadBundlesRef.current.set(iso2, {
              roads: paths,
              interstatesPath2D,
              usRoutesPath2D
            });
            renderCanvas();
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
  }, [visibleRoadIso2s, showRoads, pathGenerator, renderCanvas]);

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
          syncAllViewports(newK, transformRef.current.x, transformRef.current.y, width, height, lodLevelRef.current);
          renderCanvas();
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [clampY, wrapX, renderCanvas, syncAllViewports]);

  // Initial map positioning once loaded
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
      lodLevelRef.current = initialLOD;
      renderCanvas();
    }
  }, [loading, wrapX, clampY, renderCanvas, lodThresholds, syncAllViewports]);

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
          const targetX = wrapX(vw / 2 - cx * targetK, targetK);
          const targetY = clampY(vh / 2 - cy * targetK, targetK, vh);

          setZoomK(Number(targetK.toFixed(1)));
          setLodLevel('L3');
          lodLevelRef.current = 'L3';
          setPinnedPrefId(prefId);
          animateTo(targetK, targetX, targetY, 380, () => {
            syncAllViewports(targetK, targetX, targetY, vw, vh, 'L3');
          });
        }
      };
    }
  }, [zoomToPrefectureRef, prefecturePathData, wrapX, clampY, animateTo, syncAllViewports]);

  return (
    <div
      ref={containerRef}
      className={`svg-map-wrapper ${showRoads ? 'roads-mode-active' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onMouseLeave={() => {
        isDragging.current = false;
        if (hoveredCountryRef.current) {
          hoveredCountryRef.current = null;
          setHoveredCountry(null);
        }
        if (hoveredPrefectureRef.current) {
          hoveredPrefectureRef.current = null;
          setHoveredPrefecture(null);
        }
        if (hoveredMunicipalityRef.current) {
          hoveredMunicipalityRef.current = null;
          setHoveredMunicipality(null);
        }
        if (hoveredL2SubdivisionRef.current) {
          hoveredL2SubdivisionRef.current = null;
          setHoveredL2Subdivision(null);
        }
        if (hoveredRoadRef.current) {
          hoveredRoadRef.current = null;
          setHoveredRoad(null);
        }
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
        renderCanvas();
      }}
      onClick={handleMapClick}
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
        <canvas
          ref={canvasRef}
          className="world-map-canvas"
        />
      )}

      {/* Dynamic Floating Hover Tooltip */}
      {(hoveredRoad || (!showRoads && (hoveredCountry || hoveredPrefecture || hoveredMunicipality || hoveredL2Subdivision))) && (
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
          {!showRoads && hoveredPrefecture && (
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

          {/* L3 Municipality / Subdivision Tooltip */}
          {!showRoads && hoveredMunicipality && (
            <>
              <div className="tooltip-header">
                <span className="tooltip-flag" role="img" aria-label="muni">{hoveredMunicipality.countryFlag || '🏙️'}</span>
                <div>
                  <div className="tooltip-name">{hoveredMunicipality.city}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {hoveredMunicipality.pref} · {hoveredMunicipality.countryNameZh || '日本'}
                  </div>
                </div>
              </div>
              <div className="tooltip-meta">
                <span className="tooltip-badge" style={{ color: '#fbbf24' }}>
                  {hoveredMunicipality.typeEn || '市區町村'}
                </span>
                {hoveredMunicipality.code && (
                  <span className="tooltip-badge" style={{ color: '#38bdf8' }}>
                    #{hoveredMunicipality.code}
                  </span>
                )}
                <span className="tooltip-badge" style={{ color: '#34d399' }}>
                  點擊展開詳細
                </span>
              </div>
            </>
          )}

          {/* L2 Worldwide Subdivision Tooltip */}
          {!showRoads && hoveredL2Subdivision && (
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
          {!showRoads && hoveredCountry && !hoveredPrefecture && !hoveredMunicipality && !hoveredL2Subdivision && !hoveredRoad && (
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
      <div className="map-controls-panel map-controls">
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
    </div>
  );
};
