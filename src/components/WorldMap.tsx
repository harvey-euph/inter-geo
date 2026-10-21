import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import type { Feature, Geometry } from 'geojson';
import * as flatgeobuf from 'flatgeobuf';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { CountryData } from '../types/geo';
import { FILTERS } from '../data/filters';
import type { FilterDefinition } from '../data/filters';
import { findCountry, COUNTRIES_DATA } from '../data/countries';
import { getLODLevel, DEFAULT_LOD_THRESHOLDS, MAX_ZOOM_K } from '../types/lod';
import type { LODLevel, PrefectureDetail, MunicipalityDetail, CustomLODThresholds, L2SubdivisionDetail } from '../types/lod';
import { JAPAN_PREFECTURES } from '../data/japanData';
import { PrecisionHUD } from './PrecisionHUD';
import { L2_MANIFEST } from '../data/l2Manifest';
import { L3_MANIFEST, L3_PARTITIONS_BY_KEY } from '../data/l3Manifest';
import type { L3PartitionMeta } from '../data/l3Manifest';
import { ROADS_MANIFEST } from '../data/roadsManifest';
import { NATIONWIDE_FILTERS, COUNTRIES_WITH_AREA_CODES, NATIONWIDE_FILTERS_BY_ID } from '../data/nationwideFilters';
import type { NationwideFilterDef } from '../data/nationwideFilters';
import { getSubdivisionAreaCodeBadge } from '../data/domesticAreaCodes';
import { EUROPEAN_CROSSING_SIGNS, getCrossingSign } from '../data/pedestrianCrossing';
import { getCountryRoadMarking } from '../data/roadMarkings';
import { isCapitalSubdivision } from '../data/capitalSubdivisions';
import { queryLore } from '../lore/loreRegistry';
import { TAIWAN_POWER_POLE_ZONES } from '../data/taiwanPowerPoles';
import type { TaipowerZoneDef } from '../data/taiwanPowerPoles';
import {
  GLOBAL_TEXT_FILTERS_BY_ID,
  COUNTRY_CALLING_CODES,
  COUNTRY_LABEL_CENTROIDS
} from '../data/globalFilters';

type RegionalFilterDef = NationwideFilterDef;
const REGIONAL_FILTERS = NATIONWIDE_FILTERS;

const L2_COUNTRY_BBOX_MAP = new Map<string, { minX: number; maxX: number; minY: number; maxY: number }>();
for (let i = 0; i < L2_MANIFEST.length; i++) {
  const c = L2_MANIFEST[i];
  L2_COUNTRY_BBOX_MAP.set(c.iso2, c.bbox);
}

function getCountryBBox(iso2: string): { minX: number; maxX: number; minY: number; maxY: number } | null {
  if (ROADS_MANIFEST[iso2]?.bbox) return ROADS_MANIFEST[iso2].bbox;
  return L2_COUNTRY_BBOX_MAP.get(iso2) || null;
}

export interface WorldCountryProperties {
  id?: string;
  name: string;
}

type GeoFeature = Feature<Geometry, WorldCountryProperties> & { id: string };

export interface CountryPathData {
  pathD: string;
  path2D: Path2D;
  bbox: [number, number, number, number];
  countryMeta: CountryData | undefined;
  id: string;
  name: string;
  centroid: [number, number];
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

export type { L2SubdivisionDetail };

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

export interface ActiveL3ParentInfo {
  iso2: string;
  id: string | number;
  name: string;
  code?: string;
  bbox: [number, number, number, number];
  path2D: Path2D;
}

function normParentKey(iso2: string, text: string): string {
  return `${(iso2 || '').toLowerCase()}-${String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s\-_~]+/g, '')}`;
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
  | { type: 'activeParentInterior'; data: ActiveL3ParentInfo }
  | { type: 'l2Subdivision'; data: L2SubdivisionPathData }
  | { type: 'country'; data: CountryPathData }
  | { type: 'taipowerZone'; data: TaipowerZoneDef };

interface WorldMapProps {
  activeFilterId: string;
  activeTextFilters?: Set<string>;
  activeInternationalImageFilter?: string | null;
  isFilterExpanded?: boolean;
  selectedCountry: CountryData | null;
  onSelectCountry: (country: CountryData | null) => void;
  selectedSubdivision?: L2SubdivisionDetail | null;
  onSelectSubdivision?: (sub: L2SubdivisionDetail | null) => void;
  selectedPrefecture?: PrefectureDetail | null;
  onSelectPrefecture?: (pref: PrefectureDetail | null) => void;
  selectedMunicipality?: MunicipalityDetail | null;
  onSelectMunicipality?: (muni: MunicipalityDetail | null) => void;
  hoveredCountry: CountryData | null;
  setHoveredCountry: (country: CountryData | null) => void;
  zoomToPrefectureRef?: React.MutableRefObject<((prefId: number) => void) | null>;
  showRoads?: boolean;
  onToggleRoads?: () => void;
  showInterstates?: boolean;
  onToggleInterstates?: () => void;
  showNumberedRoutes?: boolean;
  onToggleNumberedRoutes?: () => void;
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
  activeTextFilters,
  activeInternationalImageFilter,
  isFilterExpanded = false,
  selectedCountry,
  onSelectCountry,
  selectedSubdivision,
  onSelectSubdivision,
  selectedPrefecture,
  onSelectPrefecture,
  selectedMunicipality,
  onSelectMunicipality,
  hoveredCountry,
  setHoveredCountry,
  zoomToPrefectureRef,
  showRoads: showRoadsProp,
  showInterstates: showInterstatesProp,
  onToggleInterstates: onToggleInterstatesProp,
  showNumberedRoutes: showNumberedRoutesProp,
  onToggleNumberedRoutes: onToggleNumberedRoutesProp,
  selectedRoad,
  onSelectRoad
}) => {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<{ loaded: number; total: number }>({
    loaded: 0,
    total: L2_MANIFEST.length
  });

  // Level of Detail (LOD) tracking: L1 (Country), L2 (Subdivision), L3 (Local Unit)
  const [lodLevel, setLodLevel] = useState<LODLevel>('L1');
  const [lodThresholds, setLodThresholds] = useState<CustomLODThresholds>(DEFAULT_LOD_THRESHOLDS);
  const lodThresholdsRef = useRef<CustomLODThresholds>(lodThresholds);
  const [zoomK, setZoomK] = useState<number>(1.0);

  // Sub-national hover states
  const [hoveredMunicipality, setHoveredMunicipality] = useState<MunicipalityDetail | null>(null);

  // L2 preloaded paths (loaded up-front during initial startup)
  const loadedL2DataRef = useRef<Map<string, L2SubdivisionPathData[]>>(new Map());
  const [l2PathsByCountry, setL2PathsByCountry] = useState<Record<string, L2SubdivisionPathData[]>>({});
  const l2PathsByCountryRef = useRef<Record<string, L2SubdivisionPathData[]>>({});
  const allL2SubdivisionsRef = useRef<L2SubdivisionPathData[]>([]);
  const [hoveredL2Subdivision, setHoveredL2Subdivision] = useState<L2SubdivisionDetail | null>(null);

  // L3 regional partition packs
  const visibleL3PacksRef = useRef<Set<string>>(new Set());
  const [visibleL3Packs, setVisibleL3Packs] = useState<Set<string>>(new Set());
  const inFlightL3PacksRef = useRef<Set<string>>(new Set());
  const loadedL3PacksRef = useRef<Set<string>>(new Set());

  // Road network overlay state and refs
  const [internalShowInterstates, setInternalShowInterstates] = useState<boolean>(false);
  const [internalShowNumberedRoutes, setInternalShowNumberedRoutes] = useState<boolean>(false);

  const showInterstates = showInterstatesProp !== undefined
    ? showInterstatesProp
    : (showRoadsProp !== undefined ? showRoadsProp : internalShowInterstates);

  const showNumberedRoutes = showNumberedRoutesProp !== undefined
    ? showNumberedRoutesProp
    : (showRoadsProp !== undefined ? showRoadsProp : internalShowNumberedRoutes);

  const showRoads = showInterstates || showNumberedRoutes;
  const showRoadsRef = useRef<boolean>(showRoads);
  const showInterstatesRef = useRef<boolean>(showInterstates);
  const showNumberedRoutesRef = useRef<boolean>(showNumberedRoutes);
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

  // Dynamic Regional Filters state (surfaced only when target region is visible in viewport)
  const [visibleRegionalFilters, setVisibleRegionalFilters] = useState<RegionalFilterDef[]>([]);
  const visibleRegionalFiltersRef = useRef<RegionalFilterDef[]>([]);
  const [activeRegionalFilters, setActiveRegionalFilters] = useState<Set<string>>(new Set());
  const activeRegionalFiltersRef = useRef<Set<string>>(activeRegionalFilters);
  const [hoveredRegionalFilterId, setHoveredRegionalFilterId] = useState<string | null>(null);

  // Taiwan Power Pole Grid hover state
  const [hoveredTaipowerZone, setHoveredTaipowerZone] = useState<TaipowerZoneDef | null>(null);
  const hoveredTaipowerZoneRef = useRef<TaipowerZoneDef | null>(null);

  // Feature Regional Filter: European Pedestrian Crossing Signs image cache & hit-testing boxes
  const crossingImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const renderedCrossingBadgesRef = useRef<
    Array<{ x1: number; y1: number; x2: number; y2: number; iso2: string }>
  >([]);

  // Global Text Overlay Filters ref
  const activeTextFiltersRef = useRef<Set<string>>(activeTextFilters || new Set());
  const activeInternationalImageFilterRef = useRef<string | null>(activeInternationalImageFilter || null);

  // Unified Canvas and Container Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const animRafId = useRef<number | null>(null);

  // Real-time synchronization refs for 120fps render loop
  const hoveredCountryRef = useRef<CountryData | null>(hoveredCountry || null);
  const selectedCountryRef = useRef<CountryData | null>(selectedCountry || null);
  const hoveredMunicipalityRef = useRef<MunicipalityDetail | null>(hoveredMunicipality || null);
  const selectedMunicipalityRef = useRef<MunicipalityDetail | null>(selectedMunicipality || null);
  const hoveredL2SubdivisionRef = useRef<L2SubdivisionDetail | null>(hoveredL2Subdivision || null);
  const selectedL2SubdivisionRef = useRef<{ iso2: string; id: number | string } | null>(null);
  const lodLevelRef = useRef<LODLevel>(lodLevel);
  const activeL3ParentRef = useRef<ActiveL3ParentInfo | null>(null);
  const l3PathsByParentRef = useRef<Map<string, L3SubdivisionPathData[]>>(new Map());

  // Performance batching & spatial index refs
  const l2CountryCombinedPathsRef = useRef<Record<string, Path2D>>({});
  const l2AllOutlinesPathRef = useRef<Path2D>(new Path2D());
  const countryBBoxesRef = useRef<Record<string, [number, number, number, number]>>({});
  const countryDataMapRef = useRef<Map<string, CountryData>>(new Map());
  const hoverRafId = useRef<number | null>(null);

  // Scheme A: Offscreen Canvas Base Layer Cache (Texture Blit)
  const OFFSCREEN_BASE_SIZE = 2048;
  const offscreenBaseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenBaseValidRef = useRef<boolean>(false);

  // Store container dimensions
  const viewportSize = useRef({ w: 1200, h: 800 });

  // Transform stored in ref for direct 120fps GPU manipulation
  const transformRef = useRef({ k: 1, x: 0, y: 0 });
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStart = useRef({ clientX: 0, clientY: 0, x: 0, y: 0 });
  const rafId = useRef<number | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const isMouseInsideRef = useRef(false);
  const pressedArrowKeys = useRef<Set<string>>(new Set());
  const isShiftPressedRef = useRef(false);
  const panVelocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const panRafIdRef = useRef<number | null>(null);
  const lastPanTimeRef = useRef<number>(0);
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

  interface TaipowerZoneRenderItem {
    zone: TaipowerZoneDef;
    polygonPath2D: Path2D;
    innerGridPath2D: Path2D;
    pSW: [number, number];
    pSE: [number, number];
    pNE: [number, number];
    pNW: [number, number];
    pCenter: [number, number];
    bbox: [number, number, number, number];
  }

  const taipowerZoneRenderItems = useMemo<TaipowerZoneRenderItem[]>(() => {
    return TAIWAN_POWER_POLE_ZONES.map((z) => {
      const pSW = projection(z.sw) || [0, 0];
      const pSE = projection(z.se) || [0, 0];
      const pNE = projection(z.ne) || [0, 0];
      const pNW = projection(z.nw) || [0, 0];
      const pCenter = projection(z.center) || [0, 0];

      const polygonPath2D = new Path2D();
      polygonPath2D.moveTo(pSW[0], pSW[1]);
      polygonPath2D.lineTo(pSE[0], pSE[1]);
      polygonPath2D.lineTo(pNE[0], pNE[1]);
      polygonPath2D.lineTo(pNW[0], pNW[1]);
      polygonPath2D.closePath();

      const innerGridPath2D = new Path2D();
      for (const pct of [0.2, 0.4, 0.6, 0.8]) {
        // Vertical lines (South to North)
        const bX = (1 - pct) * pSW[0] + pct * pSE[0];
        const bY = (1 - pct) * pSW[1] + pct * pSE[1];
        const tX = (1 - pct) * pNW[0] + pct * pNE[0];
        const tY = (1 - pct) * pNW[1] + pct * pNE[1];
        innerGridPath2D.moveTo(bX, bY);
        innerGridPath2D.lineTo(tX, tY);

        // Horizontal lines (West to East)
        const lX = (1 - pct) * pSW[0] + pct * pNW[0];
        const lY = (1 - pct) * pSW[1] + pct * pNW[1];
        const rX = (1 - pct) * pSE[0] + pct * pNE[0];
        const rY = (1 - pct) * pSE[1] + pct * pNE[1];
        innerGridPath2D.moveTo(lX, lY);
        innerGridPath2D.lineTo(rX, rY);
      }

      const xs = [pSW[0], pSE[0], pNE[0], pNW[0]];
      const ys = [pSW[1], pSE[1], pNE[1], pNW[1]];
      const bbox: [number, number, number, number] = [
        Math.min(...xs),
        Math.min(...ys),
        Math.max(...xs),
        Math.max(...ys)
      ];

      return {
        zone: z,
        polygonPath2D,
        innerGridPath2D,
        pSW,
        pSE,
        pNE,
        pNW,
        pCenter,
        bbox
      };
    });
  }, [projection]);
  const taipowerZoneRenderItemsRef = useRef(taipowerZoneRenderItems);
  useEffect(() => {
    taipowerZoneRenderItemsRef.current = taipowerZoneRenderItems;
  }, [taipowerZoneRenderItems]);

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
      let centroid: [number, number] = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
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
        countryMeta,
        id: feature.id,
        name: feature.properties?.name || 'Unknown',
        centroid
      };
    });
  }, [features, pathGenerator]);

  // O(1) map of CountryPathData by iso2 and id for rapid lookups
  const countryPathMap = useMemo(() => {
    const map = new Map<string, CountryPathData>();
    for (let i = 0; i < countryPathData.length; i++) {
      const item = countryPathData[i];
      if (item.countryMeta?.iso2) map.set(item.countryMeta.iso2, item);
      if (item.id) map.set(item.id, item);
    }
    return map;
  }, [countryPathData]);

  // Deterministic ordered list of countries for keyboard cycling
  const deterministicCountries = useMemo(() => {
    return [...countryPathData]
      .filter((c) => !!c.countryMeta)
      .sort((a, b) => a.countryMeta!.name.localeCompare(b.countryMeta!.name) || a.countryMeta!.iso2.localeCompare(b.countryMeta!.iso2));
  }, [countryPathData]);

  // All pre-loaded L2 subdivisions flattened
  const allL2Subdivisions = useMemo(() => {
    const list: L2SubdivisionPathData[] = [];
    for (const iso2 in l2PathsByCountry) {
      const paths = l2PathsByCountry[iso2];
      if (paths) {
        for (let i = 0; i < paths.length; i++) {
          list.push(paths[i]);
        }
      }
    }
    return list;
  }, [l2PathsByCountry]);

  // Active L2 subdivision paths
  const activeL2SubdivisionPaths = allL2Subdivisions;

  // Helper to fetch L3 child subdivisions for a specific parent (O(1) Map lookup)
  const getL3SubdivisionsForParent = useCallback(
    (iso2: string, name?: string, code?: string, id?: string | number): L3SubdivisionPathData[] => {
      const map = l3PathsByParentRef.current;
      if (name) {
        const list = map.get(normParentKey(iso2, name));
        if (list && list.length > 0) return list;
      }
      if (code) {
        const list = map.get(normParentKey(iso2, code));
        if (list && list.length > 0) return list;
      }
      if (id !== undefined) {
        const list = map.get(normParentKey(iso2, String(id)));
        if (list && list.length > 0) return list;
      }
      return [];
    },
    []
  );

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

  // Synchronize visible L3 regional packs across viewport (only if L3 mode is active)
  const syncL3Viewport = useCallback(
    (k: number, x: number, y: number, vw: number, vh: number, currentLOD: LODLevel) => {
      if (currentLOD !== 'L3' || !isFinite(lodThresholdsRef.current.l3Threshold)) {
        if (visibleL3PacksRef.current.size > 0) {
          visibleL3PacksRef.current = new Set();
          setVisibleL3Packs(new Set());
        }
        return;
      }

      const nextVisible = new Set<string>();
      for (let i = 0; i < L3_MANIFEST.length; i++) {
        const c = L3_MANIFEST[i];
        if (!isCountryInViewport(c.bbox, k, x, y, vw, vh, 150)) continue;

        const partitions = c.partitions;
        for (let pIdx = 0; pIdx < partitions.length; pIdx++) {
          const p = partitions[pIdx];
          if (isCountryInViewport(p.bbox, k, x, y, vw, vh, 100)) {
            nextVisible.add(p.file);
          }
        }
      }

      let changed = false;
      if (nextVisible.size !== visibleL3PacksRef.current.size) {
        changed = true;
      } else {
        for (const file of nextVisible) {
          if (!visibleL3PacksRef.current.has(file)) {
            changed = true;
            break;
          }
        }
      }

      if (changed) {
        visibleL3PacksRef.current = nextVisible;
        setVisibleL3Packs(nextVisible);
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

  // Synchronize visible nationwide filter buttons across viewport (only surfaces when L2 data is displayed)
  const syncRegionalFiltersViewport = useCallback(
    (k: number, x: number, y: number, vw: number, vh: number, currentLOD: LODLevel = lodLevelRef.current) => {
      const isL2Active = currentLOD === 'L2' || currentLOD === 'L3';
      const nextVisible: RegionalFilterDef[] = [];

      // Nationwide filters only surface when L2 subdivision data is actively displayed
      if (isL2Active) {
        for (let i = 0; i < REGIONAL_FILTERS.length; i++) {
          const filter = REGIONAL_FILTERS[i];
          if (filter.minZoomK && k < filter.minZoomK) continue;

          if (filter.targetIso2 === '*') {
            // Filter applies globally to supported countries if ANY is in viewport
            const anyVisible = filter.targetIso2s?.some((iso) => {
              const b = getCountryBBox(iso);
              return b && isCountryInViewport(b, k, x, y, vw, vh, 30);
            });
            if (anyVisible) {
              nextVisible.push(filter);
            }
          } else {
            const targetBBox = filter.customBBox || getCountryBBox(filter.targetIso2);
            if (!targetBBox) continue;

            // Check if country/region is inside the current screen viewport (with 30px margin)
            if (isCountryInViewport(targetBBox, k, x, y, vw, vh, 30)) {
              nextVisible.push(filter);
            }
          }
        }
      }

      const prev = visibleRegionalFiltersRef.current;
      const changed =
        nextVisible.length !== prev.length ||
        nextVisible.some((f, idx) => f.id !== prev[idx]?.id);

      if (changed) {
        visibleRegionalFiltersRef.current = nextVisible;
        setVisibleRegionalFilters(nextVisible);
      }
    },
    [isCountryInViewport]
  );

  // Unified viewport synchronizer for L3, Road networks, and Regional Filters
  const syncAllViewports = useCallback(
    (k: number, x: number, y: number, vw: number, vh: number, currentLOD: LODLevel) => {
      syncL3Viewport(k, x, y, vw, vh, currentLOD);
      syncRoadsViewport(k, x, y, vw, vh, showRoadsRef.current);
      syncRegionalFiltersViewport(k, x, y, vw, vh, currentLOD);
    },
    [syncL3Viewport, syncRoadsViewport, syncRegionalFiltersViewport]
  );

  // Toggle highway and route overlay layers
  const handleToggleInterstates = useCallback(() => {
    setHoveredRoad(null);
    hoveredRoadRef.current = null;
    if (onToggleInterstatesProp) {
      onToggleInterstatesProp();
    } else {
      setInternalShowInterstates((prev) => !prev);
    }
  }, [onToggleInterstatesProp]);

  const handleToggleNumberedRoutes = useCallback(() => {
    setHoveredRoad(null);
    hoveredRoadRef.current = null;
    if (onToggleNumberedRoutesProp) {
      onToggleNumberedRoutesProp();
    } else {
      setInternalShowNumberedRoutes((prev) => !prev);
    }
  }, [onToggleNumberedRoutesProp]);

  const isRegionalFilterActive = useCallback(
    (filterId: string): boolean => {
      if (filterId === 'us-interstates') return showInterstates;
      if (filterId === 'us-numbered-routes') return showNumberedRoutes;
      return activeRegionalFilters.has(filterId);
    },
    [showInterstates, showNumberedRoutes, activeRegionalFilters]
  );

  const handleToggleRegionalFilter = useCallback(
    (filterId: string) => {
      if (filterId === 'us-interstates') {
        // Activating highway closes nationwide text
        setActiveRegionalFilters((prev) => {
          const next = new Set(prev);
          next.delete('nationwide-area-codes');
          return next;
        });
        handleToggleInterstates();
      } else if (filterId === 'us-numbered-routes') {
        // Activating highway closes nationwide text
        setActiveRegionalFilters((prev) => {
          const next = new Set(prev);
          next.delete('nationwide-area-codes');
          return next;
        });
        handleToggleNumberedRoutes();
      } else if (filterId === 'nationwide-area-codes') {
        // Activating nationwide area codes closes highways/routes
        if (showInterstates) handleToggleInterstates();
        if (showNumberedRoutes) handleToggleNumberedRoutes();
        setActiveRegionalFilters((prev) => {
          const next = new Set(prev);
          if (next.has(filterId)) next.delete(filterId);
          else next.add(filterId);
          return next;
        });
      } else {
        setActiveRegionalFilters((prev) => {
          const next = new Set(prev);
          if (next.has(filterId)) next.delete(filterId);
          else next.add(filterId);
          return next;
        });
      }
    },
    [handleToggleInterstates, handleToggleNumberedRoutes, showInterstates, showNumberedRoutes]
  );

  // ==========================================
  // SCHEME A: OFFSCREEN BASE LAYER (TEXTURE BLIT)
  // Pre-renders the entire static world (91 countries + global outlines)
  // onto a 2048x2048 offscreen texture once. Panning executes in 0.05ms with 0 vector points!
  // ==========================================
  const ensureOffscreenBase = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (offscreenBaseValidRef.current && offscreenBaseCanvasRef.current) return;

    const combinedByCountry = l2CountryCombinedPathsRef.current;
    if (countryPathData.length === 0 || Object.keys(combinedByCountry).length === 0) return;

    if (!offscreenBaseCanvasRef.current) {
      const c = document.createElement('canvas');
      c.width = OFFSCREEN_BASE_SIZE;
      c.height = OFFSCREEN_BASE_SIZE;
      offscreenBaseCanvasRef.current = c;
    }

    const offCanvas = offscreenBaseCanvasRef.current;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    offCtx.imageSmoothingEnabled = true;
    offCtx.imageSmoothingQuality = 'high';
    offCtx.clearRect(0, 0, OFFSCREEN_BASE_SIZE, OFFSCREEN_BASE_SIZE);

    const scale = OFFSCREEN_BASE_SIZE / MAP_W;
    offCtx.setTransform(scale, 0, 0, scale, 0, 0);

    const activeFilter = activeFilterDefRef.current;
    const countryMap = countryDataMapRef.current;
    const l2ByCountry = l2PathsByCountryRef.current;

    // 1. Draw non-L2 countries (Layer 1)
    for (let i = 0; i < countryPathData.length; i++) {
      const item = countryPathData[i];
      if (!item.path2D) continue;
      const iso2 = item.countryMeta?.iso2;
      if (iso2 && l2ByCountry[iso2]) continue;

      if (activeFilter.id === 'roadLines' && item.countryMeta) {
        const rm = getCountryRoadMarking(item.countryMeta.iso2);
        const bbox = item.bbox;
        if (bbox && bbox[2] > bbox[0]) {
          const grad = offCtx.createLinearGradient(bbox[0], 0, bbox[2], 0);
          grad.addColorStop(0.00, rm.outerColor);
          grad.addColorStop(0.33, rm.outerColor);
          grad.addColorStop(0.331, rm.centerColor);
          grad.addColorStop(0.669, rm.centerColor);
          grad.addColorStop(0.67, rm.outerColor);
          grad.addColorStop(1.00, rm.outerColor);
          offCtx.fillStyle = grad;
        } else {
          offCtx.fillStyle = rm.centerColor;
        }
      } else {
        const fillColor = !item.countryMeta ? '#1a1f2b' : (activeFilter.getColor(item.countryMeta) || '#232a38');
        offCtx.fillStyle = fillColor;
      }
      offCtx.fill(item.path2D);

      offCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      offCtx.lineWidth = 0.5;
      offCtx.stroke(item.path2D);
    }

    // 2. Draw all 91 L2 country default fills
    for (const iso2 in combinedByCountry) {
      if (activeFilter.id === 'roadLines') {
        const rm = getCountryRoadMarking(iso2);
        const bbox = countryBBoxesRef.current[iso2];
        if (bbox && bbox[2] > bbox[0]) {
          const grad = offCtx.createLinearGradient(bbox[0], 0, bbox[2], 0);
          grad.addColorStop(0.00, rm.outerColor);
          grad.addColorStop(0.33, rm.outerColor);
          grad.addColorStop(0.331, rm.centerColor);
          grad.addColorStop(0.669, rm.centerColor);
          grad.addColorStop(0.67, rm.outerColor);
          grad.addColorStop(1.00, rm.outerColor);
          offCtx.fillStyle = grad;
        } else {
          offCtx.fillStyle = rm.centerColor;
        }
      } else {
        const cMeta = countryMap.get(iso2);
        const fill = (cMeta && activeFilter.getColor(cMeta)) || '#232a38';
        offCtx.fillStyle = fill;
      }
      offCtx.fill(combinedByCountry[iso2]);
    }

    // 3. Stroke all L2 outlines in one single pass
    if (l2AllOutlinesPathRef.current) {
      offCtx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      offCtx.lineWidth = 0.5;
      offCtx.stroke(l2AllOutlinesPathRef.current);
    }

    offscreenBaseValidRef.current = true;
  }, [countryPathData]);

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
    const hoveredM = hoveredMunicipalityRef.current;
    const selectedM = selectedMunicipalityRef.current;
    const hoveredL2 = hoveredL2SubdivisionRef.current;
    const selectedL2 = selectedL2SubdivisionRef.current;
    const roadsEnabled = showRoadsRef.current;

    const activeFilter = activeFilterDefRef.current;
    const currentLod = lodLevelRef.current;
    const isL2RegionMode = currentLod === 'L2' || currentLod === 'L3';

    // Scheme A: Ensure offscreen base texture is rendered
    ensureOffscreenBase();
    const offCanvas = offscreenBaseCanvasRef.current;
    const useOffscreenBase = !isL2RegionMode && offscreenBaseValidRef.current && !!offCanvas;

    const highlightHoverPaths: Path2D[] = [];
    const highlightSelectPaths: Path2D[] = [];

    const combinedByCountry = l2CountryCombinedPathsRef.current;
    const countryBBoxes = countryBBoxesRef.current;
    const countryMap = countryDataMapRef.current;
    const l2ByCountry = l2PathsByCountryRef.current;

    for (const copyIdx of visibleCopies) {
      ctx.setTransform(
        k * dpr,
        0,
        0,
        k * dpr,
        (x + copyIdx * MAP_W * k) * dpr,
        y * dpr
      );

      const copyOffset = copyIdx * MAP_W;

      if (useOffscreenBase && offCanvas) {
        // ========================================================
        // SCHEME A: Offscreen Canvas Base Layer Blit (0 vertices!)
        // Pre-rendered 2048x2048 base texture drawn via GPU in 0.05ms
        // ========================================================
        ctx.drawImage(offCanvas, 0, 0, MAP_W, MAP_H);

        // Overlay Selected Country (if any)
        if (selectedC && !selectedL2) {
          const iso2 = selectedC.iso2;
          const combinedPath = iso2 ? combinedByCountry[iso2] : undefined;
          if (combinedPath) {
            ctx.fillStyle = '#38bdf8';
            ctx.fill(combinedPath);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.2 / k;
            ctx.stroke(combinedPath);
            highlightSelectPaths.push(combinedPath);
          } else {
            const item = countryPathMap.get(iso2) || (selectedC.id ? countryPathMap.get(selectedC.id) : undefined);
            if (item?.path2D) {
              ctx.fillStyle = '#38bdf8';
              ctx.fill(item.path2D);
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 1.2 / k;
              ctx.stroke(item.path2D);
              highlightSelectPaths.push(item.path2D);
            }
          }
        }

        // Overlay Hovered Country (if any and not selected)
        if (hoveredC && (!selectedC || hoveredC.iso2 !== selectedC.iso2 || selectedL2)) {
          const iso2 = hoveredC.iso2;
          const combinedPath = iso2 ? combinedByCountry[iso2] : undefined;
          if (combinedPath) {
            ctx.fillStyle = '#f97316';
            ctx.fill(combinedPath);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1.0 / k;
            ctx.stroke(combinedPath);
            highlightHoverPaths.push(combinedPath);
          } else {
            const item = countryPathMap.get(iso2) || (hoveredC.id ? countryPathMap.get(hoveredC.id) : undefined);
            if (item?.path2D) {
              ctx.fillStyle = '#f97316';
              ctx.fill(item.path2D);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.lineWidth = 1.0 / k;
              ctx.stroke(item.path2D);
              highlightHoverPaths.push(item.path2D);
            }
          }
        }
      } else {
        // ========================================================
        // Fallback or L2/L3 Region Mode: Vector Paths + Scheme C Sub-pixel Culling
        // ========================================================
        // 1. Layer 1: Background Landmass (ONLY for countries without L2 data)
        for (let i = 0; i < countryPathData.length; i++) {
          const item = countryPathData[i];
          if (!item.path2D) continue;

          const iso2 = item.countryMeta?.iso2;
          // If this country is covered by L2 datasets, skip it completely!
          if (iso2 && l2ByCountry[iso2]) continue;

          // Viewport culling
          const [minX, minY, maxX, maxY] = item.bbox;
          const sMinY = y + minY * k;
          const sMaxY = y + maxY * k;
          if (sMaxY < -50 || sMinY > vh + 50) continue;
          const sMinX = x + (minX + copyOffset) * k;
          const sMaxX = x + (maxX + copyOffset) * k;
          if (sMaxX < -50 || sMinX > vw + 50) continue;

          const isHovered =
            hoveredC &&
            (hoveredC.id === item.countryMeta?.id || (item.countryMeta && hoveredC.iso2 === item.countryMeta.iso2));
          const isSelected =
            !selectedL2 &&
            selectedC &&
            (selectedC.id === item.countryMeta?.id || (item.countryMeta && selectedC.iso2 === item.countryMeta.iso2));

          // Scheme C: Sub-pixel screen-space culling
          const screenW = (maxX - minX) * k;
          const screenH = (maxY - minY) * k;
          if (!isSelected && !isHovered && screenW < 1.5 && screenH < 1.5) continue;

          let fillColor: string | CanvasGradient;
          if (isSelected) {
            fillColor = '#38bdf8';
          } else if (isHovered) {
            fillColor = '#f97316';
          } else if (activeFilter.id === 'roadLines' && item.countryMeta) {
            const rm = getCountryRoadMarking(item.countryMeta.iso2);
            const sMinX = minX + copyOffset;
            const sMaxX = maxX + copyOffset;
            if (sMaxX > sMinX) {
              const grad = ctx.createLinearGradient(sMinX, 0, sMaxX, 0);
              grad.addColorStop(0.00, rm.outerColor);
              grad.addColorStop(0.33, rm.outerColor);
              grad.addColorStop(0.331, rm.centerColor);
              grad.addColorStop(0.669, rm.centerColor);
              grad.addColorStop(0.67, rm.outerColor);
              grad.addColorStop(1.00, rm.outerColor);
              fillColor = grad;
            } else {
              fillColor = rm.centerColor;
            }
          } else if (!item.countryMeta) {
            fillColor = '#1a1f2b';
          } else {
            fillColor = activeFilter.getColor(item.countryMeta) || '#232a38';
          }

          ctx.fillStyle = fillColor;
          ctx.fill(item.path2D);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 0.5 / k;
          ctx.stroke(item.path2D);

          if (isSelected) {
            highlightSelectPaths.push(item.path2D);
          } else if (isHovered) {
            highlightHoverPaths.push(item.path2D);
          }
        }

        // 2. Layer 2: Admin-1 Subdivisions (Worldwide L2 Base Layer)
        if (copyIdx === 0 || copyIdx === 1) {
          if (!isL2RegionMode && Object.keys(combinedByCountry).length > 0) {
            // L1 Ultra-Fast Mode fallback before offscreen canvas is ready
            for (const iso2 in combinedByCountry) {
              const bbox = countryBBoxes[iso2];
              if (bbox) {
                const [minX, minY, maxX, maxY] = bbox;
                const sMinY = y + minY * k;
                const sMaxY = y + maxY * k;
                if (sMaxY < -50 || sMinY > vh + 50) continue;
                const sMinX = x + (minX + copyOffset) * k;
                const sMaxX = x + (maxX + copyOffset) * k;
                if (sMaxX < -50 || sMinX > vw + 50) continue;
              }

              const isSelectedCountry = !selectedL2 && selectedC && selectedC.iso2 === iso2;
              const isHoveredCountry = hoveredC && hoveredC.iso2 === iso2;

              let fill: string | CanvasGradient;
              if (isSelectedCountry) {
                fill = '#38bdf8';
              } else if (isHoveredCountry) {
                fill = '#f97316';
              } else if (activeFilter.id === 'roadLines') {
                const rm = getCountryRoadMarking(iso2);
                if (bbox && bbox[2] > bbox[0]) {
                  const sMinX = bbox[0] + copyOffset;
                  const sMaxX = bbox[2] + copyOffset;
                  const grad = ctx.createLinearGradient(sMinX, 0, sMaxX, 0);
                  grad.addColorStop(0.00, rm.outerColor);
                  grad.addColorStop(0.33, rm.outerColor);
                  grad.addColorStop(0.331, rm.centerColor);
                  grad.addColorStop(0.669, rm.centerColor);
                  grad.addColorStop(0.67, rm.outerColor);
                  grad.addColorStop(1.00, rm.outerColor);
                  fill = grad;
                } else {
                  fill = rm.centerColor;
                }
              } else {
                const cMeta = countryMap.get(iso2);
                fill = (cMeta && activeFilter.getColor(cMeta)) || '#232a38';
              }

              ctx.fillStyle = fill;
              ctx.fill(combinedByCountry[iso2]);
            }

            // Single global outline stroke for all L2 borders in the visible world
            if (l2AllOutlinesPathRef.current) {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
              ctx.lineWidth = 0.5 / k;
              ctx.stroke(l2AllOutlinesPathRef.current);
            }

            // Prominent stroke for hovered or selected country
            if (hoveredC && combinedByCountry[hoveredC.iso2]) {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.lineWidth = 1.0 / k;
              ctx.stroke(combinedByCountry[hoveredC.iso2]);
            }
            if (selectedC && combinedByCountry[selectedC.iso2]) {
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 1.2 / k;
              ctx.stroke(combinedByCountry[selectedC.iso2]);
            }
          } else {
            // ========================================================
            // L2/L3 Region Mode: Batched Country Fill & Stroke + Dynamic Overlays
            // Reduces draw calls from hundreds down to ~5 per frame! (120 FPS)
            // ========================================================
            for (const iso2 in l2ByCountry) {
              const bbox = countryBBoxes[iso2];
              if (bbox) {
                const [minX, minY, maxX, maxY] = bbox;
                const sMinY = y + minY * k;
                const sMaxY = y + maxY * k;
                if (sMaxY < -50 || sMinY > vh + 50) continue;
                const sMinX = x + (minX + copyOffset) * k;
                const sMaxX = x + (maxX + copyOffset) * k;
                if (sMaxX < -50 || sMinX > vw + 50) continue;
              }

              const countryCombined = combinedByCountry[iso2];
              if (!countryCombined) continue;

              const cMeta = countryMap.get(iso2);
              const isCapitalFilterActive = activeRegionalFiltersRef.current?.has('nationwide-capital');

              if (isCapitalFilterActive) {
                const subs = l2ByCountry[iso2];
                if (subs) {
                  for (let sIdx = 0; sIdx < subs.length; sIdx++) {
                    const sub = subs[sIdx];
                    const isCapital = isCapitalSubdivision(iso2, sub);
                    if (isCapital) {
                      ctx.fillStyle = '#f59e0b';
                      ctx.fill(sub.path2D);
                      ctx.strokeStyle = '#fef08a';
                      ctx.lineWidth = 1.6 / k;
                      ctx.stroke(sub.path2D);
                    } else {
                      ctx.fillStyle = 'rgba(20, 26, 38, 0.75)';
                      ctx.fill(sub.path2D);
                      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                      ctx.lineWidth = 0.5 / k;
                      ctx.stroke(sub.path2D);
                    }
                  }
                }
              } else {
                let defaultFill: string | CanvasGradient;
                if (activeFilter.id === 'roadLines') {
                  const rm = getCountryRoadMarking(iso2);
                  if (bbox && bbox[2] > bbox[0]) {
                    const sMinX = bbox[0] + copyOffset;
                    const sMaxX = bbox[2] + copyOffset;
                    const grad = ctx.createLinearGradient(sMinX, 0, sMaxX, 0);
                    grad.addColorStop(0.00, rm.outerColor);
                    grad.addColorStop(0.33, rm.outerColor);
                    grad.addColorStop(0.331, rm.centerColor);
                    grad.addColorStop(0.669, rm.centerColor);
                    grad.addColorStop(0.67, rm.outerColor);
                    grad.addColorStop(1.00, rm.outerColor);
                    defaultFill = grad;
                  } else {
                    defaultFill = rm.centerColor;
                  }
                } else {
                  defaultFill = (cMeta && activeFilter.getColor(cMeta)) || '#232a38';
                }

                const isSiblingHovered =
                  (hoveredL2 && hoveredL2.iso2 === iso2) ||
                  (hoveredM && hoveredM.iso2 === iso2) ||
                  (activeL3ParentRef.current && activeL3ParentRef.current.iso2 === iso2);

                // 1. Fill all subdivisions of this country in 1 draw call
                ctx.fillStyle = isSiblingHovered ? 'rgba(251, 146, 60, 0.16)' : defaultFill;
                ctx.fill(countryCombined);

                // 2. Stroke all subdivision borders of this country in 1 draw call
                ctx.strokeStyle = isSiblingHovered ? 'rgba(251, 146, 60, 0.4)' : 'rgba(255, 255, 255, 0.22)';
                ctx.lineWidth = 0.6 / k;
                ctx.stroke(countryCombined);
              }
            }

            // 3. Highlight Selected L2 Subdivision on top
            if (selectedL2) {
              const subs = l2ByCountry[selectedL2.iso2];
              const selSub = subs?.find((s) => String(s.id) === String(selectedL2.id));
              if (selSub?.path2D) {
                ctx.fillStyle = '#38bdf8';
                ctx.fill(selSub.path2D);
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 1.2 / k;
                ctx.stroke(selSub.path2D);
                highlightSelectPaths.push(selSub.path2D);
              }
            }

            // 4. Highlight Hovered L2 Subdivision on top
            if (
              hoveredL2 &&
              (!selectedL2 || hoveredL2.iso2 !== selectedL2.iso2 || String(hoveredL2.id) !== String(selectedL2.id))
            ) {
              const subs = l2ByCountry[hoveredL2.iso2];
              const hovSub = subs?.find((s) => String(s.id) === String(hoveredL2.id));
              if (hovSub?.path2D) {
                ctx.fillStyle = '#f97316';
                ctx.fill(hovSub.path2D);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.4 / k;
                ctx.stroke(hovSub.path2D);
                highlightHoverPaths.push(hovSub.path2D);
              }
            }
          }
        }
      }

      // ----------------------------------------------------
      // 3. Layer 3: L3 Subdivisions (Municipalities, Counties, Landkreise, etc.)
      // ----------------------------------------------------
      if (currentLod === 'L3' && (copyIdx === 0 || copyIdx === 1)) {
        const activeParent = activeL3ParentRef.current;
        if (activeParent) {
          const children = getL3SubdivisionsForParent(activeParent.iso2, activeParent.name, activeParent.code, activeParent.id);
          for (let cIdx = 0; cIdx < children.length; cIdx++) {
            const item = children[cIdx];
            if (!item.path2D) continue;

            const [minX, minY, maxX, maxY] = item.bbox;
            const sMinY = y + minY * k;
            const sMaxY = y + maxY * k;
            if (sMaxY < -50 || sMinY > vh + 50) continue;
            const sMinX = x + (minX + copyOffset) * k;
            const sMaxX = x + (maxX + copyOffset) * k;
            if (sMaxX < -50 || sMinX > vw + 50) continue;

            const isHovered =
              hoveredM &&
              hoveredM.iso2 === item.iso2 &&
              (hoveredM.code === item.id || hoveredM.code === item.code);
            const isSelected =
              selectedM &&
              selectedM.iso2 === item.iso2 &&
              (selectedM.code === item.id || selectedM.code === item.code);

            // Scheme C: Sub-pixel screen-space culling
            const screenW = (maxX - minX) * k;
            const screenH = (maxY - minY) * k;
            if (!isSelected && !isHovered && screenW < 1.5 && screenH < 1.5) continue;

            let fill = 'rgba(234, 88, 12, 0.25)';
            let stroke = 'rgba(251, 146, 60, 0.45)';
            let strokeWidth = 0.35 / k;

            if (isSelected) {
              fill = '#38bdf8';
              stroke = '#38bdf8';
              strokeWidth = 0.8 / k;
            } else if (isHovered) {
              fill = '#f97316';
              stroke = '#ffffff';
              strokeWidth = 0.8 / k;
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
      // Layer 3b: Taiwan Taipower Pole Grid Overlay (Nationwide Coloring Filter)
      // ----------------------------------------------------
      const isTaipowerGridActive = isL2RegionMode && activeRegionalFiltersRef.current?.has('taiwan-power-poles');
      if (isTaipowerGridActive) {
        const tpItems = taipowerZoneRenderItemsRef.current;
        const hoveredZ = hoveredTaipowerZoneRef.current;

        for (let i = 0; i < tpItems.length; i++) {
          const item = tpItems[i];
          const minMapX = item.bbox[0] + copyOffset;
          const maxMapX = item.bbox[2] + copyOffset;
          const minMapY = item.bbox[1];
          const maxMapY = item.bbox[3];

          if (x + maxMapX * k < 0 || x + minMapX * k > vw || y + maxMapY * k < 0 || y + minMapY * k > vh) continue;

          const isHovered = hoveredZ?.letter === item.zone.letter;

          // 1. Transparent fill
          ctx.fillStyle = isHovered
            ? item.zone.fillColor.replace('0.28', '0.45').replace('0.25', '0.42').replace('0.22', '0.38').replace('0.18', '0.35')
            : item.zone.fillColor;
          ctx.fill(item.polygonPath2D);

          // 2. Dashed inner percentage grid lines (20%, 40%, 60%, 80%) - ONLY in L3 state
          if (currentLod === 'L3') {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 0.9 / k;
            ctx.setLineDash([3 / k, 3 / k]);
            ctx.stroke(item.innerGridPath2D);
            ctx.restore();
          }

          // 3. Perimeter border
          ctx.strokeStyle = isHovered ? '#ffffff' : item.zone.color;
          ctx.lineWidth = (isHovered ? 2.5 : 1.4) / k;
          ctx.stroke(item.polygonPath2D);
        }
      }

      // ----------------------------------------------------
      // 4. Layer 4: Highway and Route Network Overlay
      // ----------------------------------------------------
      if (roadsEnabled) {
        for (const iso2 of visibleRoadIso2sRef.current) {
          const bundle = roadBundlesRef.current.get(iso2);
          if (!bundle) continue;

          // ========================================================
          // FULL SPIDERWEB HIGHWAY NETWORK (Optimized 23,000 vertices)
          // Always use instant 2-call batch stroke (L1 method, 0.25ms) across all LOD levels
          // ========================================================
          // 4a. US Federal Routes (Gold / Amber, 1.0px spiderweb mesh)
          if (showNumberedRoutesRef.current) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 1.0 / k;
            ctx.globalAlpha = 0.75;
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'miter';
            ctx.stroke(bundle.usRoutesPath2D);
          }

          // 4b. Interstates (Sky Blue, 1.6px arterial corridors)
          if (showInterstatesRef.current) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.6 / k;
            ctx.globalAlpha = 0.92;
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'miter';
            ctx.stroke(bundle.interstatesPath2D);
          }
          ctx.globalAlpha = 1.0;
        }

        // 4c. Highlight selected highway with prominent glowing neon orange outline
        const selectedRoadItem = selectedRoadRef.current;
        if (
          selectedRoadItem &&
          selectedRoadItem.path2D &&
          ((selectedRoadItem.class === 'Interstate' && showInterstatesRef.current) ||
            (selectedRoadItem.class !== 'Interstate' && showNumberedRoutesRef.current))
        ) {
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
        if (
          hoveredRoadItem &&
          hoveredRoadItem.path2D &&
          hoveredRoadItem.name !== selectedRoadItem?.name &&
          ((hoveredRoadItem.class === 'Interstate' && showInterstatesRef.current) ||
            (hoveredRoadItem.class !== 'Interstate' && showNumberedRoutesRef.current))
        ) {
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

    // ----------------------------------------------------
    // 6. Layer 6: Global Text Overlays (Calling Code / Domain / ccTLD)
    // ----------------------------------------------------
    const activeText = activeTextFiltersRef.current;
    if (activeText && activeText.size > 0 && countryPathData.length > 0) {
      const hasPhone = activeText.has('callingCode');
      const hasTld = activeText.has('tld');

      ctx.save();
      // Render in crisp 1:1 CSS screen space
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const placedBoxes: { x1: number; y1: number; x2: number; y2: number }[] = [];
      const isCrowded = k < 1.7;

      for (let i = 0; i < countryPathData.length; i++) {
        const item = countryPathData[i];
        const cMeta = item.countryMeta;
        if (!cMeta) continue;

        let badgeText = '';
        if (hasPhone && hasTld) {
          const tld = cMeta.tld || (cMeta.iso2 ? `.${cMeta.iso2.toLowerCase()}` : '');
          const phone = cMeta.callingCode || COUNTRY_CALLING_CODES[cMeta.iso2] || '';
          if (tld && phone) badgeText = `${tld}  ${phone}`;
          else badgeText = tld || phone;
        } else if (hasPhone) {
          badgeText = cMeta.callingCode || COUNTRY_CALLING_CODES[cMeta.iso2] || '';
        } else if (hasTld) {
          badgeText = cMeta.tld || (cMeta.iso2 ? `.${cMeta.iso2.toLowerCase()}` : '');
        }

        if (!badgeText) continue;

        const override = COUNTRY_LABEL_CENTROIDS[cMeta.iso2];
        const cx = override ? override[0] : item.centroid[0];
        const cy = override ? override[1] : item.centroid[1];

        for (const copyIdx of visibleCopies) {
          const screenX = (cx + copyIdx * MAP_W) * k + x;
          const screenY = cy * k + y;

          // Viewport culling
          if (screenX < -60 || screenX > vw + 60 || screenY < -30 || screenY > vh + 30) continue;

          const isHovered = hoveredC && hoveredC.iso2 === cMeta.iso2;
          const isSelected = selectedC && selectedC.iso2 === cMeta.iso2;

          // Culling check for small crowded countries at low zoom
          if (!isHovered && !isSelected && isCrowded) {
            const [minX, minY, maxX, maxY] = item.bbox;
            const screenW = (maxX - minX) * k;
            const screenH = (maxY - minY) * k;
            if (screenW < 14 && screenH < 14) continue;
          }

          ctx.font = 'bold 11px ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace';
          const textMetrics = ctx.measureText(badgeText);
          const textWidth = textMetrics.width;
          const badgeW = Math.round(textWidth + 10);
          const badgeH = 18;
          const badgeX = Math.round(screenX - badgeW / 2);
          const badgeY = Math.round(screenY - badgeH / 2);

          // Overlap prevention (unless hovered or selected)
          if (!isHovered && !isSelected) {
            let collides = false;
            for (let b = 0; b < placedBoxes.length; b++) {
              const pb = placedBoxes[b];
              if (
                badgeX < pb.x2 + 2 &&
                badgeX + badgeW > pb.x1 - 2 &&
                badgeY < pb.y2 + 2 &&
                badgeY + badgeH > pb.y1 - 2
              ) {
                collides = true;
                break;
              }
            }
            if (collides) continue;
          }

          placedBoxes.push({
            x1: badgeX,
            y1: badgeY,
            x2: badgeX + badgeW,
            y2: badgeY + badgeH
          });

          // Draw pill background
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);

          if (isSelected) {
            ctx.fillStyle = 'rgba(14, 165, 233, 0.95)';
            ctx.fill();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else if (isHovered) {
            ctx.fillStyle = 'rgba(249, 115, 22, 0.95)';
            ctx.fill();
            ctx.strokeStyle = '#fb923c';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Draw text
          ctx.fillStyle = (isSelected || isHovered) ? '#ffffff' : (hasPhone && !hasTld ? '#34d399' : (hasTld && !hasPhone ? '#38bdf8' : '#f8fafc'));
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, screenX, screenY + 0.5);
        }
      }
      ctx.restore();
    }

    // ----------------------------------------------------
    // 7. Layer 7: Nationwide Domestic Area Codes
    // ----------------------------------------------------
    const activeReg = activeRegionalFiltersRef.current;
    const isAreaCodeActive =
      activeReg &&
      (activeReg.has('nationwide-area-codes') ||
        activeReg.has('br-ddd-codes') ||
        activeReg.has('jp-area-codes') ||
        activeReg.has('au-area-codes') ||
        activeReg.has('fr-area-codes'));

    if (isAreaCodeActive && isL2RegionMode) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (const iso2 of COUNTRIES_WITH_AREA_CODES) {
        const subs = l2PathsByCountryRef.current[iso2];
        if (!subs || subs.length === 0) continue;

        for (let i = 0; i < subs.length; i++) {
          const sub = subs[i];
          const badgeText = getSubdivisionAreaCodeBadge(iso2, sub);
          if (!badgeText) continue;

          for (const copyIdx of visibleCopies) {
            const screenX = (sub.centroid[0] + copyIdx * MAP_W) * k + x;
            const screenY = sub.centroid[1] * k + y;

            if (screenX < -70 || screenX > vw + 70 || screenY < -30 || screenY > vh + 30) continue;

            const isSubHovered =
              hoveredL2 &&
              hoveredL2.iso2 === sub.iso2 &&
              (String(hoveredL2.id) === String(sub.id) || hoveredL2.name === sub.name);
            const isSubSelected =
              selectedL2 &&
              selectedL2.iso2 === sub.iso2 &&
              String(selectedL2.id) === String(sub.id);

            ctx.font = 'bold 11px ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace';
            const textMetrics = ctx.measureText(badgeText);
            const textWidth = textMetrics.width;
            const badgeW = Math.round(textWidth + 12);
            const badgeH = 20;
            const badgeX = Math.round(screenX - badgeW / 2);
            const badgeY = Math.round(screenY - badgeH / 2);

            // Draw rounded pill background
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5);

            if (isSubSelected) {
              ctx.fillStyle = 'rgba(14, 165, 233, 0.96)';
              ctx.fill();
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 1.6;
              ctx.stroke();
            } else if (isSubHovered) {
              ctx.fillStyle = 'rgba(249, 115, 22, 0.96)';
              ctx.fill();
              ctx.strokeStyle = '#fb923c';
              ctx.lineWidth = 1.6;
              ctx.stroke();
            } else {
              ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
              ctx.fill();
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = 1.2;
              ctx.stroke();
            }

            // Draw badge text
            ctx.fillStyle = (isSubSelected || isSubHovered) ? '#ffffff' : '#34d399';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badgeText, screenX, screenY + 0.5);
          }
        }
      }
      ctx.restore();
    }

    // ----------------------------------------------------
    // 8. Layer 8: European Pedestrian Crossing Signs (International Image Filter)
    // ----------------------------------------------------
    const activeCrossingSign =
      activeInternationalImageFilterRef.current === 'pedestrian-crossing' ||
      (activeReg && activeReg.has('eu-pedestrian-crossing'));
    const currentRenderedBadges: Array<{ x1: number; y1: number; x2: number; y2: number; iso2: string }> = [];

    if (activeCrossingSign) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const placedCrossingBoxes: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

      for (let i = 0; i < countryPathData.length; i++) {
        const item = countryPathData[i];
        const cMeta = item.countryMeta;
        if (!cMeta || !cMeta.iso2) continue;

        const signMeta = EUROPEAN_CROSSING_SIGNS[cMeta.iso2];
        if (!signMeta) continue;

        const img = crossingImagesRef.current.get(cMeta.iso2);
        if (!img || !img.complete || img.naturalWidth === 0) continue;

        const override = COUNTRY_LABEL_CENTROIDS[cMeta.iso2];
        const cx = override ? override[0] : item.centroid[0];
        const cy = override ? override[1] : item.centroid[1];

        for (const copyIdx of visibleCopies) {
          const screenX = (cx + copyIdx * MAP_W) * k + x;
          const screenY = cy * k + y;

          // Viewport culling (with margin)
          if (screenX < -70 || screenX > vw + 70 || screenY < -70 || screenY > vh + 70) continue;

          const isHovered =
            (hoveredC && hoveredC.iso2 === cMeta.iso2) ||
            (hoveredL2 && hoveredL2.iso2 === cMeta.iso2);
          const isSelected =
            (selectedC && selectedC.iso2 === cMeta.iso2) ||
            (selectedL2 && selectedL2.iso2 === cMeta.iso2);

          const imgSize = (isHovered || isSelected) ? 38 : 32;
          const cardW = (isHovered || isSelected) ? 64 : 56;
          const cardH = imgSize + 22;
          const cardX = Math.round(screenX - cardW / 2);
          const cardY = Math.round(screenY - cardH / 2);

          // Overlap prevention (hovered or selected always renders)
          if (!isHovered && !isSelected) {
            let collides = false;
            for (let b = 0; b < placedCrossingBoxes.length; b++) {
              const pb = placedCrossingBoxes[b];
              if (
                cardX < pb.x2 + 4 &&
                cardX + cardW > pb.x1 - 4 &&
                cardY < pb.y2 + 4 &&
                cardY + cardH > pb.y1 - 4
              ) {
                collides = true;
                break;
              }
            }
            if (collides) continue;
          }

          placedCrossingBoxes.push({
            x1: cardX,
            y1: cardY,
            x2: cardX + cardW,
            y2: cardY + cardH
          });

          currentRenderedBadges.push({
            x1: cardX,
            y1: cardY,
            x2: cardX + cardW,
            y2: cardY + cardH,
            iso2: cMeta.iso2
          });

          // Draw card background
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardW, cardH, 7);

          if (isSelected) {
            ctx.fillStyle = 'rgba(14, 165, 233, 0.96)';
            ctx.fill();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (isHovered) {
            ctx.fillStyle = 'rgba(249, 115, 22, 0.96)';
            ctx.fill();
            ctx.strokeStyle = '#fb923c';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          // Draw SVG icon
          const imgX = Math.round(cardX + (cardW - imgSize) / 2);
          const imgY = Math.round(cardY + 5);
          ctx.drawImage(img, imgX, imgY, imgSize, imgSize);

          // Draw stripe count / shape tag with direction arrow
          const dirArrow = signMeta.direction === 'left' ? '←' : '→';
          let detail: string;
          if (signMeta.iso2 === 'IS') {
            detail = '黃△';
          } else if (signMeta.shape === 'yellow_diamond') {
            detail = '菱形';
          } else if (signMeta.shape === 'red_triangle') {
            detail = '三角';
          } else if (signMeta.stripes > 0) {
            detail = `${signMeta.stripes}條`;
          } else if (signMeta.iso2 === 'PL') {
            detail = '橫道';
          } else {
            detail = '虛線';
          }

          const stripeTag = `${signMeta.iso2} · ${detail} ${dirArrow}`;

          ctx.font = 'bold 9px ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = (isSelected || isHovered) ? '#ffffff' : '#94a3b8';
          ctx.fillText(stripeTag, screenX, cardY + imgSize + 12);
        }
      }
      ctx.restore();
    }

    // ----------------------------------------------------
    // Layer 7b: Taiwan Taipower Grid Letters & L3 Percentage Coordinate Markers
    // ----------------------------------------------------
    const isTaipowerGridActive = isL2RegionMode && activeRegionalFiltersRef.current?.has('taiwan-power-poles');
    if (isTaipowerGridActive) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const tpItems = taipowerZoneRenderItemsRef.current;
      const hoveredZ = hoveredTaipowerZoneRef.current;
      const currentLod = lodLevelRef.current;

      for (let i = 0; i < tpItems.length; i++) {
        const item = tpItems[i];
        for (const copyIdx of visibleCopies) {
          const copyOffset = copyIdx * MAP_W;
          const scrX = (item.pCenter[0] + copyOffset) * k + x;
          const scrY = item.pCenter[1] * k + y;

          if (scrX < -100 || scrX > vw + 100 || scrY < -60 || scrY > vh + 60) continue;

          const isHovered = hoveredZ?.letter === item.zone.letter;

          // Render ONLY the Letter (larger, bold, no box)
          ctx.save();
          ctx.translate(scrX, scrY);

          const letterText = item.zone.letter;
          const fontSize = Math.min(36, Math.max(22, Math.round(18 + k * 1.5)));
          ctx.font = `900 ${fontSize}px ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Dark halo stroke for readability without an intrusive background box
          ctx.lineJoin = 'round';
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(10, 15, 26, 0.90)';
          ctx.strokeText(letterText, 0, 0);

          // Fill letter
          ctx.fillStyle = isHovered ? '#ffffff' : item.zone.color;
          ctx.fillText(letterText, 0, 0);

          ctx.restore();

          // Percentage coordinate marks on borders: ONLY in L3 mode
          if (currentLod === 'L3') {
            const pSWScr = [(item.pSW[0] + copyOffset) * k + x, item.pSW[1] * k + y];
            const pSEScr = [(item.pSE[0] + copyOffset) * k + x, item.pSE[1] * k + y];
            const pNWScr = [(item.pNW[0] + copyOffset) * k + x, item.pNW[1] * k + y];

            ctx.font = 'bold 10px ui-monospace, "JetBrains Mono", monospace';
            ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';

            // X axis percentage marks along South border
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            for (const pct of [0.2, 0.4, 0.6, 0.8]) {
              const tickX = (1 - pct) * pSWScr[0] + pct * pSEScr[0];
              const tickY = (1 - pct) * pSWScr[1] + pct * pSEScr[1];
              ctx.fillText(`${Math.round(pct * 100)}%`, tickX, tickY + 3);
            }

            // Y axis percentage marks along West border
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (const pct of [0.2, 0.4, 0.6, 0.8]) {
              const tickX = (1 - pct) * pSWScr[0] + pct * pNWScr[0];
              const tickY = (1 - pct) * pSWScr[1] + pct * pNWScr[1];
              ctx.fillText(`${Math.round(pct * 100)}%`, tickX - 4, tickY);
            }
          }
        }
      }
      ctx.restore();
    }

    renderedCrossingBadgesRef.current = currentRenderedBadges;
  }, [countryPathData, countryPathMap, ensureOffscreenBase, getL3SubdivisionsForParent]);

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

  // Helper to fetch an individual L3 regional partition pack
  const fetchL3Pack = useCallback(
    async (filePath: string) => {
      if (loadedL3PacksRef.current.has(filePath) || inFlightL3PacksRef.current.has(filePath)) {
        return;
      }
      inFlightL3PacksRef.current.add(filePath);

      try {
        const res = await fetch(filePath);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();

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
          const iso2 = String(p.iso2 || '');
          const item: L3SubdivisionPathData = {
            pathD,
            path2D,
            bbox,
            id: String(p.id || feature.id || ''),
            iso2,
            name: String(p.name || ''),
            nameEn: String(p.name_en || p.name || ''),
            nameZh: String(p.name_zh || p.name || ''),
            typeEn: String(p.type_en || ''),
            parentName: String(p.parent_name || ''),
            parentCode: String(p.parent_code || ''),
            code: String(p.code || '')
          };
          paths.push(item);
        }

        // Index paths by parent name and code
        for (let pIdx = 0; pIdx < paths.length; pIdx++) {
          const item = paths[pIdx];
          const k1 = normParentKey(item.iso2, item.parentName);
          let l1 = l3PathsByParentRef.current.get(k1);
          if (!l1) {
            l1 = [];
            l3PathsByParentRef.current.set(k1, l1);
          }
          l1.push(item);
          if (item.parentCode) {
            const k2 = normParentKey(item.iso2, item.parentCode);
            if (k2 !== k1) {
              let l2 = l3PathsByParentRef.current.get(k2);
              if (!l2) {
                l2 = [];
                l3PathsByParentRef.current.set(k2, l2);
              }
              l2.push(item);
            }
          }
        }

        loadedL3PacksRef.current.add(filePath);
        if (lodLevelRef.current !== 'L1') {
          renderCanvas();
        }
      } catch (err) {
        console.warn(`[L3] Failed to load pack ${filePath}:`, err);
      } finally {
        inFlightL3PacksRef.current.delete(filePath);
      }
    },
    [pathGenerator, renderCanvas]
  );

  // Helper to load L3 pack on-demand for a given L2 subdivision
  const loadL3PackForSubdivision = useCallback(
    (iso2: string, code?: string, name?: string, id?: string | number) => {
      if (lodLevelRef.current !== 'L3') return;
      const normIso2 = (iso2 || '').toUpperCase();
      const normLookup = (t: string): string =>
        String(t || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[\s\-_~]+/g, '');

      let partition: L3PartitionMeta | undefined;
      if (code) {
        partition = L3_PARTITIONS_BY_KEY[`${normIso2}:${code}`] || L3_PARTITIONS_BY_KEY[`${normIso2}:${normLookup(code)}`];
      }
      if (!partition && name) {
        partition = L3_PARTITIONS_BY_KEY[`${normIso2}:${normLookup(name)}`];
      }
      if (!partition && id !== undefined) {
        partition = L3_PARTITIONS_BY_KEY[`${normIso2}:${String(id)}`];
      }

      if (
        partition &&
        !loadedL3PacksRef.current.has(partition.file) &&
        !inFlightL3PacksRef.current.has(partition.file)
      ) {
        fetchL3Pack(partition.file);
      }
    },
    [fetchL3Pack]
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

    // 0. European Pedestrian Crossing Sign Badges (Direct click / hover on floating badge)
    if (
      activeInternationalImageFilterRef.current === 'pedestrian-crossing' ||
      activeRegionalFiltersRef.current?.has('eu-pedestrian-crossing')
    ) {
      for (let b = 0; b < renderedCrossingBadgesRef.current.length; b++) {
        const badge = renderedCrossingBadgesRef.current[b];
        if (mx >= badge.x1 && mx <= badge.x2 && my >= badge.y1 && my <= badge.y2) {
          const c = countryPathMap.get(badge.iso2);
          if (c) {
            return { type: 'country', data: c };
          }
        }
      }
    }

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
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';

        for (const iso2 of visibleRoadIso2sRef.current) {
          const entry = ROADS_MANIFEST[iso2];
          if (entry) {
            const b = entry.bbox;
            if (
              mapX < b.minX - toleranceMap ||
              mapX > b.maxX + toleranceMap ||
              mapY < b.minY - toleranceMap ||
              mapY > b.maxY + toleranceMap
            ) {
              continue;
            }
          }
          const roads = loadedRoadsRef.current.get(iso2);
          if (!roads) continue;

          for (let i = 0; i < roads.length; i++) {
            const road = roads[i];
            const isInterstate = road.class === 'Interstate';
            if (isInterstate && !showInterstatesRef.current) continue;
            if (!isInterstate && !showNumberedRoutesRef.current) continue;

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
        const activeParent = activeL3ParentRef.current;
        if (activeParent) {
          const children = getL3SubdivisionsForParent(
            activeParent.iso2,
            activeParent.name,
            activeParent.code,
            activeParent.id
          );
          for (let pIdx = 0; pIdx < children.length; pIdx++) {
            const item = children[pIdx];
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

          // Check if cursor is over water/gap within active parent
          if (activeParent.path2D) {
            const [minX, minY, maxX, maxY] = activeParent.bbox;
            if (mapX >= minX && mapX <= maxX && mapY >= minY && mapY <= maxY) {
              if (ctx.isPointInPath(activeParent.path2D, mx * dpr, my * dpr)) {
                return {
                  type: 'activeParentInterior',
                  data: activeParent
                };
              }
            }
          }
        }
      }

      // 2a-2. Check Taipower Grid Zones (if filter active at L2/L3)
      const isL2RegionMode = lodLevelRef.current === 'L2' || lodLevelRef.current === 'L3';
      if (isL2RegionMode && activeRegionalFiltersRef.current?.has('taiwan-power-poles') && (copyIdx === 0 || copyIdx === 1)) {
        const tpItems = taipowerZoneRenderItemsRef.current;
        for (let i = 0; i < tpItems.length; i++) {
          const item = tpItems[i];
          const [minX, minY, maxX, maxY] = item.bbox;
          if (mapX < minX || mapX > maxX || mapY < minY || mapY > maxY) continue;
          if (ctx.isPointInPath(item.polygonPath2D, mx * dpr, my * dpr)) {
            return {
              type: 'taipowerZone',
              data: item.zone
            };
          }
        }
      }

      // 2b. Check L2 Admin-1 Subdivisions with Hierarchical Country BBox Index
      if (copyIdx === 0 || copyIdx === 1) {
        const countryBBoxes = countryBBoxesRef.current;
        const l2ByCountry = l2PathsByCountryRef.current;

        for (const iso2 in l2ByCountry) {
          const cBox = countryBBoxes[iso2];
          if (cBox) {
            // Fast reject: If cursor is not inside country bbox, skip all its subdivisions!
            if (mapX < cBox[0] || mapX > cBox[2] || mapY < cBox[1] || mapY > cBox[3]) continue;
          }

          const subs = l2ByCountry[iso2];
          if (!subs) continue;
          for (let i = 0; i < subs.length; i++) {
            const sub = subs[i];
            const [minX, minY, maxX, maxY] = sub.bbox;
            if (mapX < minX || mapX > maxX || mapY < minY || mapY > maxY) continue;
            if (ctx.isPointInPath(sub.path2D, mx * dpr, my * dpr)) {
              return { type: 'l2Subdivision', data: sub };
            }
          }
        }
      }

      // 2c. Check L1 Countries (only for countries NOT covered by L2)
      for (let i = 0; i < countryPathData.length; i++) {
        const c = countryPathData[i];
        const iso2 = c.countryMeta?.iso2;
        if (iso2 && l2PathsByCountryRef.current[iso2]) continue;

        const [minX, minY, maxX, maxY] = c.bbox;
        if (mapX < minX || mapX > maxX || mapY < minY || mapY > maxY) continue;
        if (ctx.isPointInPath(c.path2D, mx * dpr, my * dpr)) {
          return { type: 'country', data: c };
        }
      }
    }

    return null;
  }, [countryPathData, countryPathMap, getL3SubdivisionsForParent]);

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
        selectedL2SubdivisionRef.current = null;
        if (onSelectSubdivision) onSelectSubdivision(null);
        onSelectCountry(null);
        if (onSelectPrefecture) onSelectPrefecture(null);
        if (onSelectMunicipality) onSelectMunicipality(null);
        renderCanvas();
        return;
      }

      if (hit.type === 'municipality') {
        const m = hit.data;
        if (m.iso2) {
          loadL3PackForSubdivision(m.iso2, m.parentCode, m.parentName, m.prefId);
        }
        if (onSelectMunicipality) {
          onSelectMunicipality(m);
          onSelectCountry(null);
          if (onSelectSubdivision) onSelectSubdivision(null);
          if (onSelectPrefecture) onSelectPrefecture(null);
        }
      } else if (hit.type === 'l2Subdivision') {
        const sub = hit.data;
        const currentLod = lodLevelRef.current;

        if (currentLod === 'L1') {
          // L1 Mode: Click selects the parent Country and displays L1 Country card
          const cMeta = findCountry(sub.iso2);
          selectedL2SubdivisionRef.current = null;
          if (onSelectSubdivision) onSelectSubdivision(null);
          if (onSelectPrefecture) onSelectPrefecture(null);
          if (onSelectMunicipality) onSelectMunicipality(null);
          if (cMeta) {
            onSelectCountry(cMeta);
          } else {
            onSelectCountry(null);
          }
        } else {
          // L2 / L3 Mode: Click selects the L2 Subdivision and displays L2 Subdivision card
          const selObj = { iso2: sub.iso2, id: sub.id };
          selectedL2SubdivisionRef.current = selObj;
          loadL3PackForSubdivision(sub.iso2, sub.code, sub.name, sub.id);
          if (currentLod === 'L3') {
            activeL3ParentRef.current = {
              iso2: sub.iso2,
              id: sub.id,
              name: sub.name,
              code: sub.code,
              bbox: sub.bbox,
              path2D: sub.path2D
            };
          }
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
          if (onSelectSubdivision) {
            onSelectSubdivision(subDetail);
          }
          if (onSelectCountry) {
            onSelectCountry(null);
          }
          if (onSelectPrefecture) {
            if (sub.iso2 === 'JP') {
              const prefMeta = JAPAN_PREFECTURES[Number(sub.id)];
              onSelectPrefecture(prefMeta || null);
            } else {
              onSelectPrefecture(null);
            }
          }
          if (onSelectMunicipality) onSelectMunicipality(null);
        }
      } else if (hit.type === 'country') {
        const c = hit.data;
        selectedL2SubdivisionRef.current = null;
        if (onSelectSubdivision) onSelectSubdivision(null);
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
    [onSelectRoad, onSelectCountry, onSelectSubdivision, onSelectPrefecture, onSelectMunicipality, getFeatureAtPoint, loadL3PackForSubdivision, renderCanvas]
  );

  // Mouse Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as Element | null;
    if (target?.closest('.map-controls, .regional-controls-section, .filter-legend-card, .precision-hud')) {
      return;
    }
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

  const updateHoverAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!isMouseInsideRef.current) return;
      if (isDragging.current) return;

      const hit = getFeatureAtPoint(clientX, clientY);

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
        if (hoveredTaipowerZoneRef.current) {
          hoveredTaipowerZoneRef.current = null;
          setHoveredTaipowerZone(null);
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

      if (hit.type === 'activeParentInterior') {
        if (hoveredMunicipalityRef.current) {
          hoveredMunicipalityRef.current = null;
          setHoveredMunicipality(null);
          renderCanvas();
        }
        if (hoveredTaipowerZoneRef.current) {
          hoveredTaipowerZoneRef.current = null;
          setHoveredTaipowerZone(null);
          renderCanvas();
        }
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
        return;
      }

      if (hit.type === 'taipowerZone') {
        const z = hit.data;
        if (hoveredTaipowerZoneRef.current?.letter !== z.letter) {
          hoveredTaipowerZoneRef.current = z;
          setHoveredTaipowerZone(z);
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
      } else if (hit.type === 'road') {
        const road = hit.data;
        if (hoveredRoadRef.current?.name !== road.name) {
          hoveredRoadRef.current = road;
          setHoveredRoad(road);
          hoveredCountryRef.current = null;
          setHoveredCountry(null);
          hoveredMunicipalityRef.current = null;
          setHoveredMunicipality(null);
          hoveredL2SubdivisionRef.current = null;
          setHoveredL2Subdivision(null);
          hoveredTaipowerZoneRef.current = null;
          setHoveredTaipowerZone(null);
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
          hoveredL2SubdivisionRef.current = null;
          setHoveredL2Subdivision(null);
          hoveredTaipowerZoneRef.current = null;
          setHoveredTaipowerZone(null);
          renderCanvas();
        }
      } else if (hit.type === 'l2Subdivision') {
        const sub = hit.data;
        const currentLod = lodLevelRef.current;

        if (currentLod === 'L1') {
          // L1 Mode: Map detected L2 subdivision to its parent L1 Country!
          const cMeta = findCountry(sub.iso2) || {
            id: sub.iso2,
            iso2: sub.iso2,
            iso3: '',
            name: sub.nameEn || sub.iso2,
            nameZh: sub.nameZh || sub.iso2,
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
            keyHints: []
          };

          if (hoveredCountryRef.current?.iso2 !== cMeta.iso2) {
            hoveredCountryRef.current = cMeta;
            setHoveredCountry(cMeta);
            hoveredRoadRef.current = null;
            setHoveredRoad(null);
            hoveredMunicipalityRef.current = null;
            setHoveredMunicipality(null);
            hoveredL2SubdivisionRef.current = null;
            setHoveredL2Subdivision(null);
            renderCanvas();
          }
        } else {
          // L2 / L3 Mode: Hover target is the L2 subdivision itself!
          if (currentLod === 'L3') {
            if (activeL3ParentRef.current?.iso2 !== sub.iso2 || activeL3ParentRef.current?.id !== sub.id) {
              activeL3ParentRef.current = {
                iso2: sub.iso2,
                id: sub.id,
                name: sub.name,
                code: sub.code,
                bbox: sub.bbox,
                path2D: sub.path2D
              };
            }
          }
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
            hoveredMunicipalityRef.current = null;
            setHoveredMunicipality(null);
            renderCanvas();
          }
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
        if (lodLevelRef.current === 'L3' && activeL3ParentRef.current && activeL3ParentRef.current.iso2 !== cMeta.iso2) {
          activeL3ParentRef.current = null;
        }
        if (hoveredCountryRef.current?.id !== cMeta.id) {
          hoveredCountryRef.current = cMeta;
          setHoveredCountry(cMeta);
          hoveredRoadRef.current = null;
          setHoveredRoad(null);
          hoveredMunicipalityRef.current = null;
          setHoveredMunicipality(null);
          hoveredL2SubdivisionRef.current = null;
          setHoveredL2Subdivision(null);
          renderCanvas();
        }
      }

      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'flex';
        tooltipRef.current.style.left = `${clientX}px`;
        tooltipRef.current.style.top = `${clientY - 12}px`;
      }
    },
    [getFeatureAtPoint, renderCanvas, setHoveredCountry]
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    isMouseInsideRef.current = true;
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

      transformRef.current.x = wrapX(rawX, k);
      transformRef.current.y = clampY(rawY, k, vh);

      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          renderCanvas();
          syncRegionalFiltersViewport(k, transformRef.current.x, transformRef.current.y, viewportSize.current.w, vh, lodLevelRef.current);
          rafId.current = null;
        });
      }
      return;
    }

    // When hovering over UI controls, shield canvas from penetration
    const target = e.target as Element | null;
    const isOverControl = !!target?.closest('.map-controls, .regional-controls-section, .filter-legend-card, .precision-hud');

    if (isOverControl) {
      if (hoverRafId.current !== null) {
        cancelAnimationFrame(hoverRafId.current);
        hoverRafId.current = null;
      }
      if (containerRef.current) {
        containerRef.current.style.cursor = 'default';
      }
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }
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
      if (hadHover) {
        renderCanvas();
      }
      return;
    }

    if (!hoverRafId.current) {
      hoverRafId.current = requestAnimationFrame(() => {
        hoverRafId.current = null;
        updateHoverAtPoint(mousePos.current.x, mousePos.current.y);
      });
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
    updateHoverAtPoint(mousePos.current.x, mousePos.current.y);
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
    if (nextLOD !== lodLevelRef.current) {
      setLodLevel(nextLOD);
      lodLevelRef.current = nextLOD;
      if (nextLOD !== 'L3') {
        activeL3ParentRef.current = null;
        hoveredMunicipalityRef.current = null;
        setHoveredMunicipality(null);
      }
      if (nextLOD === 'L1') {
        hoveredL2SubdivisionRef.current = null;
        setHoveredL2Subdivision(null);
        selectedL2SubdivisionRef.current = null;
        if (onSelectSubdivision) onSelectSubdivision(null);
        hoveredTaipowerZoneRef.current = null;
        setHoveredTaipowerZone(null);
      }
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
    if (nextLOD !== lodLevelRef.current) {
      setLodLevel(nextLOD);
      lodLevelRef.current = nextLOD;
      if (nextLOD !== 'L3') {
        activeL3ParentRef.current = null;
        hoveredMunicipalityRef.current = null;
        setHoveredMunicipality(null);
      }
      if (nextLOD === 'L1') {
        hoveredL2SubdivisionRef.current = null;
        setHoveredL2Subdivision(null);
        selectedL2SubdivisionRef.current = null;
        if (onSelectSubdivision) onSelectSubdivision(null);
        hoveredTaipowerZoneRef.current = null;
        setHoveredTaipowerZone(null);
      }
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
    if (targetLOD !== 'L3') {
      activeL3ParentRef.current = null;
      hoveredMunicipalityRef.current = null;
      setHoveredMunicipality(null);
    }
    if (targetLOD === 'L1') {
      hoveredL2SubdivisionRef.current = null;
      setHoveredL2Subdivision(null);
      selectedL2SubdivisionRef.current = null;
      if (onSelectSubdivision) onSelectSubdivision(null);
      hoveredTaipowerZoneRef.current = null;
      setHoveredTaipowerZone(null);
    }
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
        if (nextLOD !== 'L3') {
          activeL3ParentRef.current = null;
          hoveredMunicipalityRef.current = null;
          setHoveredMunicipality(null);
        }
        if (nextLOD === 'L1') {
          hoveredL2SubdivisionRef.current = null;
          setHoveredL2Subdivision(null);
          selectedL2SubdivisionRef.current = null;
          if (onSelectSubdivision) onSelectSubdivision(null);
          hoveredTaipowerZoneRef.current = null;
          setHoveredTaipowerZone(null);
        }
      }
      setZoomK(Number(newK.toFixed(1)));
      syncAllViewports(newK, transformRef.current.x, transformRef.current.y, vw, vh, nextLOD);
      renderCanvas();
    },
    [wrapX, clampY, renderCanvas, lodThresholds, syncAllViewports, onSelectSubdivision]
  );

  // Update dynamic custom LOD thresholds
  const handleUpdateThresholds = useCallback(
    (newThresholds: CustomLODThresholds) => {
      setLodThresholds(newThresholds);
      lodThresholdsRef.current = newThresholds;
      const currentK = transformRef.current.k;
      const nextLOD = getLODLevel(currentK, newThresholds);
      if (nextLOD !== lodLevelRef.current) {
        setLodLevel(nextLOD);
        lodLevelRef.current = nextLOD;
        if (nextLOD !== 'L3') {
          activeL3ParentRef.current = null;
          hoveredMunicipalityRef.current = null;
          setHoveredMunicipality(null);
        }
        if (nextLOD === 'L1') {
          hoveredL2SubdivisionRef.current = null;
          setHoveredL2Subdivision(null);
          selectedL2SubdivisionRef.current = null;
          if (onSelectSubdivision) onSelectSubdivision(null);
          hoveredTaipowerZoneRef.current = null;
          setHoveredTaipowerZone(null);
        }
        syncAllViewports(
          currentK,
          transformRef.current.x,
          transformRef.current.y,
          viewportSize.current.w,
          viewportSize.current.h,
          nextLOD
        );
      }
      renderCanvas();
    },
    [syncAllViewports, renderCanvas, onSelectSubdivision]
  );

  // Synchronize state and prop changes into render refs
  useEffect(() => {
    selectedCountryRef.current = selectedCountry;
    if (selectedCountry && selectedL2SubdivisionRef.current && selectedL2SubdivisionRef.current.iso2 !== selectedCountry.iso2) {
      selectedL2SubdivisionRef.current = null;
    }
    renderCanvas();
  }, [selectedCountry, renderCanvas]);

  useEffect(() => {
    if (selectedSubdivision) {
      selectedL2SubdivisionRef.current = { iso2: selectedSubdivision.iso2, id: selectedSubdivision.id };
    } else if (selectedPrefecture) {
      selectedL2SubdivisionRef.current = { iso2: 'JP', id: selectedPrefecture.id };
    } else {
      selectedL2SubdivisionRef.current = null;
    }
    renderCanvas();
  }, [selectedSubdivision, selectedPrefecture, renderCanvas]);

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
    offscreenBaseValidRef.current = false;
    renderCanvas();
  }, [activeFilterDef, renderCanvas]);

  useEffect(() => {
    activeTextFiltersRef.current = activeTextFilters || new Set();
    renderCanvas();
  }, [activeTextFilters, renderCanvas]);

  useEffect(() => {
    activeInternationalImageFilterRef.current = activeInternationalImageFilter || null;
    renderCanvas();
  }, [activeInternationalImageFilter, renderCanvas]);

  useEffect(() => {
    activeRegionalFiltersRef.current = activeRegionalFilters;
    renderCanvas();
  }, [activeRegionalFilters, renderCanvas]);

  // Preload European pedestrian crossing sign images when filter is activated
  useEffect(() => {
    const isCrossingActive =
      activeInternationalImageFilter === 'pedestrian-crossing' ||
      activeRegionalFilters.has('eu-pedestrian-crossing');
    if (!isCrossingActive) return;

    let hasUnloaded = false;
    for (const [iso2, meta] of Object.entries(EUROPEAN_CROSSING_SIGNS)) {
      if (!crossingImagesRef.current.has(iso2)) {
        const img = new Image();
        img.src = meta.imagePath;
        img.onload = () => {
          renderCanvas();
        };
        crossingImagesRef.current.set(iso2, img);
        hasUnloaded = true;
      }
    }
    if (!hasUnloaded) {
      renderCanvas();
    }
  }, [activeInternationalImageFilter, activeRegionalFilters, renderCanvas]);

  useEffect(() => {
    offscreenBaseValidRef.current = false;
    renderCanvas();
  }, [countryPathData, renderCanvas]);

  useEffect(() => {
    lodLevelRef.current = lodLevel;
    syncRegionalFiltersViewport(
      transformRef.current.k,
      transformRef.current.x,
      transformRef.current.y,
      viewportSize.current.w,
      viewportSize.current.h,
      lodLevel
    );
    renderCanvas();
  }, [lodLevel, renderCanvas, syncRegionalFiltersViewport]);

  // Synchronize initial selected parents into activeL3ParentRef
  useEffect(() => {
    if (lodLevelRef.current !== 'L3') return;
    if (selectedSubdivision) {
      const sub = activeL2SubdivisionPaths.find(
        (s) => s.iso2 === selectedSubdivision.iso2 && String(s.id) === String(selectedSubdivision.id)
      );
      if (sub) {
        loadL3PackForSubdivision(sub.iso2, sub.code, sub.name, sub.id);
        activeL3ParentRef.current = {
          iso2: sub.iso2,
          id: sub.id,
          name: sub.name,
          code: sub.code,
          bbox: sub.bbox,
          path2D: sub.path2D
        };
        renderCanvas();
      }
    }
  }, [selectedSubdivision, activeL2SubdivisionPaths, loadL3PackForSubdivision, renderCanvas]);

  useEffect(() => {
    lodThresholdsRef.current = lodThresholds;
  }, [lodThresholds]);

  useEffect(() => {
    l2PathsByCountryRef.current = l2PathsByCountry;
    allL2SubdivisionsRef.current = Object.values(l2PathsByCountry).flat();
    renderCanvas();
  }, [l2PathsByCountry, renderCanvas]);

  useEffect(() => {
    showRoadsRef.current = showRoads;
    showInterstatesRef.current = showInterstates;
    showNumberedRoutesRef.current = showNumberedRoutes;
    if (showRoads && tooltipRef.current) {
      tooltipRef.current.style.display = 'none';
    }
    const { k, x, y } = transformRef.current;
    syncRoadsViewport(k, x, y, viewportSize.current.w, viewportSize.current.h, showRoads);
    renderCanvas();
  }, [showRoads, showInterstates, showNumberedRoutes, syncRoadsViewport, renderCanvas]);

  // Load FlatGeobuf datasets: L1 World and ALL 91 L2 datasets up-front before setting loading to false
  useEffect(() => {
    let isMounted = true;

    // 1. Load L1 World Countries via FlatGeobuf binary
    const loadL1 = async (): Promise<GeoFeature[]> => {
      try {
        const res = await fetch('/data/countries-110m.fgb');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        if (!isMounted) return [];

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
        return loadedFeatures;
      } catch (err) {
        console.error('L1 Countries FlatGeobuf loading error:', err);
        return [];
      }
    };

    // 2. Load ALL 91 L2 Country datasets up-front with a worker concurrency pool
    const loadAllL2 = async (): Promise<Record<string, L2SubdivisionPathData[]>> => {
      const allPaths: Record<string, L2SubdivisionPathData[]> = {};
      const queue = [...L2_MANIFEST];
      let loadedCount = 0;
      const CONCURRENCY = 12;

      const worker = async () => {
        while (queue.length > 0) {
          if (!isMounted) return;
          const c = queue.shift();
          if (!c) break;
          const iso2 = c.iso2;
          try {
            const res = await fetch(`/data/l2/${iso2}.fgb`);
            if (res.ok) {
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
                let centroid: [number, number] = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
                try {
                  const c = pathGenerator.centroid(feature);
                  if (c && !isNaN(c[0]) && !isNaN(c[1])) {
                    centroid = c;
                  }
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
              allPaths[iso2] = paths;
              loadedL2DataRef.current.set(iso2, paths);
            }
          } catch (err) {
            console.warn(`[L2] Failed to preload /data/l2/${iso2}.fgb:`, err);
          } finally {
            loadedCount++;
            if (isMounted) {
              setLoadingProgress({ loaded: loadedCount, total: L2_MANIFEST.length });
            }
          }
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
      return allPaths;
    };

    (async () => {
      try {
        const [loadedL1, loadedL2] = await Promise.all([loadL1(), loadAllL2()]);
        if (!isMounted) return;
        const flattened = Object.values(loadedL2).flat();
        allL2SubdivisionsRef.current = flattened;

        // Build 1-pass fast rendering indexes and spatial index
        const combinedByCountry: Record<string, Path2D> = {};
        const bboxesByCountry: Record<string, [number, number, number, number]> = {};
        const globalOutline = new Path2D();

        for (const [iso2, subs] of Object.entries(loadedL2)) {
          const countryPath = new Path2D();
          let cMinX = Infinity, cMinY = Infinity, cMaxX = -Infinity, cMaxY = -Infinity;
          for (let i = 0; i < subs.length; i++) {
            const s = subs[i];
            if (s.path2D) {
              countryPath.addPath(s.path2D);
              globalOutline.addPath(s.path2D);
              if (s.bbox[0] < cMinX) cMinX = s.bbox[0];
              if (s.bbox[1] < cMinY) cMinY = s.bbox[1];
              if (s.bbox[2] > cMaxX) cMaxX = s.bbox[2];
              if (s.bbox[3] > cMaxY) cMaxY = s.bbox[3];
            }
          }
          combinedByCountry[iso2] = countryPath;
          bboxesByCountry[iso2] = [cMinX, cMinY, cMaxX, cMaxY];
        }
        l2CountryCombinedPathsRef.current = combinedByCountry;
        l2AllOutlinesPathRef.current = globalOutline;
        countryBBoxesRef.current = bboxesByCountry;
        offscreenBaseValidRef.current = false;

        // Populate countryDataMapRef for O(1) metadata lookups
        const cMap = new Map<string, CountryData>();
        for (const c of COUNTRIES_DATA) {
          cMap.set(c.iso2, c);
          cMap.set(c.id, c);
        }
        countryDataMapRef.current = cMap;

        setFeatures(loadedL1);
        setL2PathsByCountry(loadedL2);
        l2PathsByCountryRef.current = loadedL2;
        setLoading(false);
      } catch (err) {
        console.error('Initial map data loading error:', err);
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (animRafId.current) cancelAnimationFrame(animRafId.current);
      if (hoverRafId.current) cancelAnimationFrame(hoverRafId.current);
    };
  }, [pathGenerator]);

  // On-demand loader for visible L3 regional FlatGeobuf packs (only when L3 mode is active)
  useEffect(() => {
    if (lodLevel !== 'L3') return;

    for (const filePath of visibleL3Packs) {
      fetchL3Pack(filePath);
    }
  }, [visibleL3Packs, lodLevel, fetchL3Pack]);

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

  // Zoom directly into a prefecture (called from Drawer)
  useEffect(() => {
    if (zoomToPrefectureRef) {
      zoomToPrefectureRef.current = (prefId: number) => {
        const target =
          l2PathsByCountryRef.current['JP']?.find((p) => Number(p.id) === prefId) ||
          activeL2SubdivisionPaths.find((p) => p.iso2 === 'JP' && Number(p.id) === prefId);
        if (target) {
          const [cx, cy] = target.centroid;
          const targetK = 7.8;
          const vh = viewportSize.current.h;
          const vw = viewportSize.current.w;
          const targetX = wrapX(vw / 2 - cx * targetK, targetK);
          const targetY = clampY(vh / 2 - cy * targetK, targetK, vh);

          const targetLOD = getLODLevel(targetK, lodThresholdsRef.current);
          setZoomK(Number(targetK.toFixed(1)));
          setLodLevel(targetLOD);
          lodLevelRef.current = targetLOD;
          selectedL2SubdivisionRef.current = { iso2: 'JP', id: target.id };

          if (targetLOD === 'L3') {
            loadL3PackForSubdivision('JP', target.code, target.name, target.id);
            activeL3ParentRef.current = {
              iso2: 'JP',
              id: target.id,
              name: target.name,
              code: target.code,
              bbox: target.bbox,
              path2D: target.path2D
            };
          }
          animateTo(targetK, targetX, targetY, 380, () => {
            syncAllViewports(targetK, targetX, targetY, vw, vh, targetLOD);
          });
        }
      };
    }
  }, [zoomToPrefectureRef, activeL2SubdivisionPaths, wrapX, clampY, animateTo, syncAllViewports, loadL3PackForSubdivision]);

  // Arrow key navigation: Panning when unclicked, circular iteration when clicked
  useEffect(() => {
    const startSmoothPan = () => {
      if (panRafIdRef.current !== null) return;
      lastPanTimeRef.current = performance.now();

      const loop = (now: number) => {
        const dt = Math.min((now - lastPanTimeRef.current) / 1000, 0.05);
        lastPanTimeRef.current = now;

        const keys = pressedArrowKeys.current;
        let targetVx = 0;
        let targetVy = 0;
        const speed = isShiftPressedRef.current ? 1700 : 800;

        if (keys.has('ArrowUp')) targetVy += speed;
        if (keys.has('ArrowDown')) targetVy -= speed;
        if (keys.has('ArrowLeft')) targetVx += speed;
        if (keys.has('ArrowRight')) targetVx -= speed;

        // Normalize diagonal speed
        if (targetVx !== 0 && targetVy !== 0) {
          targetVx *= 0.7071;
          targetVy *= 0.7071;
        }

        const isHolding = targetVx !== 0 || targetVy !== 0;
        const accelRate = isHolding ? 14 : 9;
        const blend = Math.min(1, accelRate * dt);

        const v = panVelocityRef.current;
        v.vx += (targetVx - v.vx) * blend;
        v.vy += (targetVy - v.vy) * blend;

        const currentK = transformRef.current.k;
        const vh = viewportSize.current.h;
        const vw = viewportSize.current.w;

        const newX = wrapX(transformRef.current.x + v.vx * dt, currentK);
        const newY = clampY(transformRef.current.y + v.vy * dt, currentK, vh);

        transformRef.current.x = newX;
        transformRef.current.y = newY;

        renderCanvas();
        updateHoverAtPoint(mousePos.current.x, mousePos.current.y);
        syncAllViewports(currentK, newX, newY, vw, vh, lodLevelRef.current);

        if (!isHolding && Math.abs(v.vx) < 1.5 && Math.abs(v.vy) < 1.5) {
          v.vx = 0;
          v.vy = 0;
          panRafIdRef.current = null;
          updateHoverAtPoint(mousePos.current.x, mousePos.current.y);
          return;
        }

        panRafIdRef.current = requestAnimationFrame(loop);
      };

      panRafIdRef.current = requestAnimationFrame(loop);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in form controls or a modal is open
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable ||
        document.querySelector('.modal-overlay')
      ) {
        return;
      }

      const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
      if (!isArrowKey) return;

      // Prevent window scroll
      e.preventDefault();
      isShiftPressedRef.current = e.shiftKey;

      const isForward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
      const dir = isForward ? 1 : -1;

      // Stop any unclicked smooth panning if entering clicked iteration
      const isClicked =
        !!selectedRoadRef.current ||
        !!selectedMunicipalityRef.current ||
        !!selectedL2SubdivisionRef.current ||
        !!selectedCountryRef.current;

      if (isClicked && panRafIdRef.current) {
        cancelAnimationFrame(panRafIdRef.current);
        panRafIdRef.current = null;
        panVelocityRef.current = { vx: 0, vy: 0 };
        pressedArrowKeys.current.clear();
      }

      // 1. Road Selected: Iterate through highways/routes
      if (selectedRoadRef.current) {
        const roadList: RoadPathData[] = [];
        const seenNames = new Set<string>();
        for (const bundle of roadBundlesRef.current.values()) {
          for (const r of bundle.roads) {
            if (!seenNames.has(r.name)) {
              seenNames.add(r.name);
              roadList.push(r);
            }
          }
        }

        if (roadList.length > 0) {
          roadList.sort((a, b) => {
            if (a.class !== b.class) {
              return a.class === 'Interstate' ? -1 : 1;
            }
            const numA = parseInt(a.number, 10);
            const numB = parseInt(b.number, 10);
            if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
              return numA - numB;
            }
            return a.name.localeCompare(b.name);
          });

          const currentIdx = roadList.findIndex((r) => r.name === selectedRoadRef.current?.name);
          const nextIdx = currentIdx === -1 ? 0 : (currentIdx + dir + roadList.length) % roadList.length;
          const nextRoad = roadList[nextIdx];

          if (onSelectRoad) onSelectRoad(nextRoad);
          selectedRoadRef.current = nextRoad;

          const cx = (nextRoad.bbox[0] + nextRoad.bbox[2]) / 2;
          const cy = (nextRoad.bbox[1] + nextRoad.bbox[3]) / 2;
          const targetK = transformRef.current.k;
          const vh = viewportSize.current.h;
          const vw = viewportSize.current.w;
          const targetX = wrapX(vw / 2 - cx * targetK, targetK);
          const targetY = clampY(vh / 2 - cy * targetK, targetK, vh);

          animateTo(targetK, targetX, targetY, 250, () => {
            syncAllViewports(targetK, targetX, targetY, vw, vh, lodLevelRef.current);
            updateHoverAtPoint(mousePos.current.x, mousePos.current.y);
          });
          renderCanvas();
        }
        return;
      }

      // 2. L3 Region Selected: Iterate through siblings in the same L2 parent
      if (selectedMunicipalityRef.current) {
        const currentM = selectedMunicipalityRef.current;
        const iso2 = currentM.iso2 || activeL3ParentRef.current?.iso2 || '';
        const parentName = currentM.parentName || currentM.pref || activeL3ParentRef.current?.name;
        const parentCode = currentM.parentCode || (currentM.prefId ? String(currentM.prefId) : undefined) || activeL3ParentRef.current?.code;
        const parentId = currentM.prefId || activeL3ParentRef.current?.id;

        const siblings = getL3SubdivisionsForParent(iso2, parentName, parentCode, parentId);

        if (siblings.length > 0) {
          const sortedChildren = [...siblings].sort((a, b) =>
            (a.code || a.id).localeCompare(b.code || b.id) || a.name.localeCompare(b.name)
          );

          const currentIdx = sortedChildren.findIndex(
            (c) => c.id === currentM.code || c.code === currentM.code || c.name === currentM.city
          );
          const nextIdx = currentIdx === -1 ? 0 : (currentIdx + dir + sortedChildren.length) % sortedChildren.length;
          const nextChild = sortedChildren[nextIdx];

          const cMeta = findCountry(nextChild.iso2);
          const newMuni: MunicipalityDetail = {
            code: nextChild.id || nextChild.code,
            pref: nextChild.parentName,
            city: nextChild.name,
            nameZh: nextChild.nameZh || `${nextChild.parentName} ${nextChild.name}`,
            iso2: nextChild.iso2,
            countryName: cMeta?.name || '',
            countryNameZh: cMeta?.nameZh || '',
            countryFlag: cMeta?.flag || '🌐',
            typeEn: nextChild.typeEn || 'District',
            parentName: nextChild.parentName,
            parentCode: nextChild.parentCode
          };
          if (nextChild.iso2 === 'JP' && (nextChild.parentCode || activeL3ParentRef.current?.id)) {
            newMuni.prefId = Number(nextChild.parentCode || activeL3ParentRef.current?.id);
          }

          if (onSelectMunicipality) onSelectMunicipality(newMuni);
          selectedMunicipalityRef.current = newMuni;

          const cx = (nextChild.bbox[0] + nextChild.bbox[2]) / 2;
          const cy = (nextChild.bbox[1] + nextChild.bbox[3]) / 2;
          const targetK = transformRef.current.k;
          const vh = viewportSize.current.h;
          const vw = viewportSize.current.w;
          const targetX = wrapX(vw / 2 - cx * targetK, targetK);
          const targetY = clampY(vh / 2 - cy * targetK, targetK, vh);

          animateTo(targetK, targetX, targetY, 200, () => {
            syncAllViewports(targetK, targetX, targetY, vw, vh, lodLevelRef.current);
            updateHoverAtPoint(mousePos.current.x, mousePos.current.y);
          });
          renderCanvas();
        }
        return;
      }

      // 3. L2 Subdivision Selected: Iterate through subdivisions in current country
      if (selectedL2SubdivisionRef.current) {
        const iso2 = selectedL2SubdivisionRef.current.iso2;
        const list = l2PathsByCountryRef.current[iso2] || activeL2SubdivisionPaths.filter((s) => s.iso2 === iso2);

        if (list.length > 0) {
          const sortedL2 = [...list].sort((a, b) =>
            (a.code || a.name).localeCompare(b.code || b.name) || String(a.id).localeCompare(String(b.id))
          );

          const currentIdx = sortedL2.findIndex(
            (s) => String(s.id) === String(selectedL2SubdivisionRef.current?.id)
          );
          const nextIdx = currentIdx === -1 ? 0 : (currentIdx + dir + sortedL2.length) % sortedL2.length;
          const nextSub = sortedL2[nextIdx];

          const selObj = { iso2: nextSub.iso2, id: nextSub.id };
          selectedL2SubdivisionRef.current = selObj;

          const cMeta = findCountry(nextSub.iso2);
          const nextSubDetail: L2SubdivisionDetail = {
            id: nextSub.id,
            iso2: nextSub.iso2,
            name: nextSub.name,
            nameEn: nextSub.nameEn,
            nameZh: nextSub.nameZh,
            typeEn: nextSub.typeEn,
            code: nextSub.code,
            postal: nextSub.postal,
            countryName: cMeta?.name || nextSub.nameEn,
            countryNameZh: cMeta?.nameZh || nextSub.nameZh,
            countryFlag: cMeta?.flag || '🌐'
          };
          if (onSelectSubdivision) onSelectSubdivision(nextSubDetail);
          if (onSelectCountry) onSelectCountry(null);

          if (nextSub.iso2 === 'JP' && onSelectPrefecture) {
            onSelectPrefecture(JAPAN_PREFECTURES[Number(nextSub.id)] || null);
          } else if (onSelectPrefecture) {
            onSelectPrefecture(null);
          }

          if (lodLevelRef.current === 'L3') {
            loadL3PackForSubdivision(nextSub.iso2, nextSub.code, nextSub.name, nextSub.id);
            activeL3ParentRef.current = {
              iso2: nextSub.iso2,
              id: nextSub.id,
              name: nextSub.name,
              code: nextSub.code,
              bbox: nextSub.bbox,
              path2D: nextSub.path2D
            };
          }

          const [cx, cy] = nextSub.centroid;
          const targetK = transformRef.current.k;
          const vh = viewportSize.current.h;
          const vw = viewportSize.current.w;
          const targetX = wrapX(vw / 2 - cx * targetK, targetK);
          const targetY = clampY(vh / 2 - cy * targetK, targetK, vh);

          animateTo(targetK, targetX, targetY, 250, () => {
            syncAllViewports(targetK, targetX, targetY, vw, vh, lodLevelRef.current);
            updateHoverAtPoint(mousePos.current.x, mousePos.current.y);
          });
          renderCanvas();
        }
        return;
      }

      // 4. L1 Country Selected: Iterate through countries
      if (selectedCountryRef.current) {
        if (deterministicCountries.length > 0) {
          const currentC = selectedCountryRef.current;
          const currentIdx = deterministicCountries.findIndex(
            (c) => c.countryMeta?.id === currentC.id || c.countryMeta?.iso2 === currentC.iso2
          );
          const nextIdx = currentIdx === -1 ? 0 : (currentIdx + dir + deterministicCountries.length) % deterministicCountries.length;
          const nextCountry = deterministicCountries[nextIdx];

          if (nextCountry.countryMeta) {
            onSelectCountry(nextCountry.countryMeta);
            selectedCountryRef.current = nextCountry.countryMeta;
            selectedL2SubdivisionRef.current = null;
            if (onSelectSubdivision) onSelectSubdivision(null);
            if (onSelectPrefecture) onSelectPrefecture(null);
            if (onSelectMunicipality) onSelectMunicipality(null);
            selectedMunicipalityRef.current = null;

            const [cx, cy] = nextCountry.centroid;
            const currentK = transformRef.current.k;
            const targetK = currentK > 2.8 ? 2.2 : currentK;
            const vh = viewportSize.current.h;
            const vw = viewportSize.current.w;
            const targetX = wrapX(vw / 2 - cx * targetK, targetK);
            const targetY = clampY(vh / 2 - cy * targetK, targetK, vh);

            animateTo(targetK, targetX, targetY, 300, () => {
              syncAllViewports(targetK, targetX, targetY, vw, vh, lodLevelRef.current);
              updateHoverAtPoint(mousePos.current.x, mousePos.current.y);
            });
            renderCanvas();
          }
        }
        return;
      }

      // 5. Unclicked State: Continuous smooth physics pan loop
      pressedArrowKeys.current.add(e.key);
      startSmoothPan();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedArrowKeys.current.delete(e.key);
      isShiftPressedRef.current = e.shiftKey;
    };

    const handleBlur = () => {
      pressedArrowKeys.current.clear();
      if (panRafIdRef.current) {
        cancelAnimationFrame(panRafIdRef.current);
        panRafIdRef.current = null;
        panVelocityRef.current = { vx: 0, vy: 0 };
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (panRafIdRef.current) {
        cancelAnimationFrame(panRafIdRef.current);
        panRafIdRef.current = null;
      }
    };
  }, [
    deterministicCountries,
    onSelectCountry,
    onSelectSubdivision,
    onSelectPrefecture,
    onSelectMunicipality,
    onSelectRoad,
    getL3SubdivisionsForParent,
    loadL3PackForSubdivision,
    activeL2SubdivisionPaths,
    wrapX,
    clampY,
    animateTo,
    syncAllViewports,
    renderCanvas,
    updateHoverAtPoint
  ]);

  return (
    <div
      ref={containerRef}
      className={`svg-map-wrapper ${showRoads ? 'roads-mode-active' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onMouseEnter={(e) => {
        isMouseInsideRef.current = true;
        mousePos.current = { x: e.clientX, y: e.clientY };
      }}
      onMouseLeave={() => {
        isMouseInsideRef.current = false;
        isDragging.current = false;
        if (hoveredCountryRef.current) {
          hoveredCountryRef.current = null;
          setHoveredCountry(null);
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
        if (hoveredTaipowerZoneRef.current) {
          hoveredTaipowerZoneRef.current = null;
          setHoveredTaipowerZone(null);
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
            gap: 16,
            backgroundColor: '#0a0d14',
            zIndex: 50
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: '3px solid rgba(56, 189, 248, 0.2)',
              borderTopColor: '#38bdf8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#38bdf8', fontSize: 15, fontWeight: 500, letterSpacing: '0.02em', marginBottom: 6 }}>
              正在載入世界高精度向量圖資
            </div>
            <div style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: 13 }}>
              {loadingProgress.total > 0
                ? `正在載入全球一級行政區 (${loadingProgress.loaded} / ${loadingProgress.total})`
                : '正在連線中...'}
            </div>
          </div>
          {loadingProgress.total > 0 && (
            <div
              style={{
                width: 220,
                height: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.round((loadingProgress.loaded / loadingProgress.total) * 100))}%`,
                  backgroundColor: '#38bdf8',
                  transition: 'width 0.15s ease-out'
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="world-map-canvas"
        />
      )}

      {/* Dynamic Floating Hover Tooltip */}
      {(hoveredRoad || (!showRoads && (hoveredCountry || hoveredMunicipality || hoveredL2Subdivision || hoveredTaipowerZone))) && (
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
          {/* Taiwan Taipower Pole Grid Tooltip */}
          {!showRoads && hoveredTaipowerZone && (
            <>
              <div className="tooltip-header">
                <span className="tooltip-flag" role="img" aria-label="grid">⚡</span>
                <div>
                  <div className="tooltip-name" style={{ color: hoveredTaipowerZone.color }}>
                    台電電力座標 · {hoveredTaipowerZone.letter} 區
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {hoveredTaipowerZone.nameZh}
                  </div>
                </div>
              </div>
              <div className="tooltip-meta" style={{ flexWrap: 'wrap', gap: 4 }}>
                <span className="tooltip-badge" style={{ color: '#fbbf24', fontFamily: 'monospace', fontWeight: 700 }}>
                  電桿範例: {hoveredTaipowerZone.examplePoleCode}
                </span>
                <span className="tooltip-badge" style={{ color: '#38bdf8' }}>
                  80km × 50km 大分區
                </span>
              </div>
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                <div style={{ color: '#38bdf8', fontWeight: 600, marginBottom: 2 }}>【GeoGuessr 百分比座標解讀】</div>
                <div>• 首字「<strong style={{ color: hoveredTaipowerZone.color }}>{hoveredTaipowerZone.letter}</strong>」：代表本 80km × 50km 大分區</div>
                <div>• 前兩碼數字：由西向東橫向百分比（X% · 00~99）</div>
                <div>• 後兩碼數字：由南向北縱向百分比（Y% · 00~99）</div>
                <div style={{ marginTop: 4, color: '#cbd5e1' }}>涵蓋：{hoveredTaipowerZone.subdivisionsZh.join('、')}</div>
              </div>
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
              {activeRegionalFilters.has('eu-pedestrian-crossing') && (() => {
                const cSign = getCrossingSign(hoveredL2Subdivision.iso2);
                if (!cSign) return null;
                return (
                  <div
                    style={{
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <img
                      src={cSign.imagePath}
                      alt="crossing"
                      style={{ width: 24, height: 24, objectFit: 'contain' }}
                    />
                    <div style={{ fontSize: 11, color: '#38bdf8', lineHeight: 1.25 }}>
                      <strong>行人告示：</strong>{cSign.descriptionZh}
                    </div>
                  </div>
                );
              })()}
              {activeRegionalFilters.has('nationwide-capital') &&
                isCapitalSubdivision(hoveredL2Subdivision.iso2, hoveredL2Subdivision) && (
                  <div
                    style={{
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: '#f59e0b',
                      fontSize: 11,
                      fontWeight: 600
                    }}
                  >
                    <span>👑 國家首都所在一級行政區</span>
                  </div>
                )}
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
          {!showRoads && hoveredCountry && !hoveredMunicipality && !hoveredL2Subdivision && !hoveredRoad && (
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
              {(() => {
                const mdCards = queryLore({ countryIso2: hoveredCountry.iso2 });
                if (mdCards && mdCards.length > 0) {
                  const card = mdCards[0];
                  const firstItem = card.items[0];
                  return (
                    <div
                      style={{
                        fontSize: 11,
                        color: card.accentColor || '#fbbf24',
                        marginTop: 4,
                        lineHeight: 1.3,
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: 4
                      }}
                    >
                      {card.icon || '💡'} <strong>{card.title}</strong>
                      {firstItem && (
                        <div style={{ color: '#cbd5e1', marginTop: 2, fontSize: 10.5 }}>
                          {firstItem.label ? `${firstItem.label} ` : ''}
                          {firstItem.content.length > 75 ? `${firstItem.content.slice(0, 75)}...` : firstItem.content}
                        </div>
                      )}
                    </div>
                  );
                }
                if (hoveredCountry.keyHints && hoveredCountry.keyHints.length > 0) {
                  return (
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
                  );
                }
                return null;
              })()}
              {activeRegionalFilters.has('eu-pedestrian-crossing') && (() => {
                const cSign = getCrossingSign(hoveredCountry.iso2);
                if (!cSign) return null;
                return (
                  <div
                    style={{
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <img
                      src={cSign.imagePath}
                      alt="crossing"
                      style={{ width: 24, height: 24, objectFit: 'contain' }}
                    />
                    <div style={{ fontSize: 11, color: '#38bdf8', lineHeight: 1.25 }}>
                      <strong>行人告示：</strong>{cSign.descriptionZh}
                    </div>
                  </div>
                );
              })()}
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
        <div className="legend-items-list legend-items">
          {activeFilterDef.legend.map((item) => (
            <div key={item.key} className="legend-item-row legend-item">
              <span className="legend-color-dot" style={{ backgroundColor: item.color }} />
              <span className="legend-label">{item.labelZh}</span>
            </div>
          ))}
        </div>

        {/* Text / Image Overlay Status in Legend */}
        {((activeTextFilters && activeTextFilters.size > 0) || activeInternationalImageFilter) && (
          <div className="legend-text-overlays-section">
            <div className="legend-divider" />
            <div className="legend-text-overlays-header">
              <span>已疊加標籤：</span>
            </div>
            <div className="legend-text-overlays-pills">
              {activeTextFilters &&
                Array.from(activeTextFilters).map((id) => {
                  const tf = GLOBAL_TEXT_FILTERS_BY_ID.get(id);
                  if (!tf) return null;
                  return (
                    <span
                      key={id}
                      className="legend-text-pill"
                      style={{
                        borderColor: tf.accentColor,
                        color: tf.accentColor,
                        backgroundColor: `${tf.accentColor}18`
                      }}
                    >
                      {tf.shortBadge}
                    </span>
                  );
                })}
              {activeInternationalImageFilter === 'pedestrian-crossing' && (
                <span
                  className="legend-text-pill"
                  style={{
                    borderColor: '#38bdf8',
                    color: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.12)'
                  }}
                >
                  🚸 人行道告示
                </span>
              )}
            </div>
          </div>
        )}

        {/* Nationwide Overlay Status in Legend (surfaced only at L2/L3) */}
        {(lodLevel === 'L2' || lodLevel === 'L3') && activeRegionalFilters.size > 0 && (
          <div className="legend-text-overlays-section">
            <div className="legend-divider" />
            <div className="legend-text-overlays-header">
              <span>國內專屬圖層：</span>
            </div>
            <div className="legend-text-overlays-pills">
              {Array.from(activeRegionalFilters).map((id) => {
                const rf = NATIONWIDE_FILTERS_BY_ID.get(id);
                if (!rf) return null;
                return (
                  <span
                    key={id}
                    className="legend-text-pill"
                    style={{
                      borderColor: rf.activeColor,
                      color: rf.activeColor,
                      backgroundColor: `${rf.activeColor}18`
                    }}
                  >
                    {rf.shortBadge} {rf.nameZh}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Map Control Buttons */}
      <div className="map-controls-panel map-controls">
        {/* Dynamic Nationwide Filters (Surfaced only when target region is in viewport at L2) */}
        {visibleRegionalFilters.length > 0 && (
          <div className="regional-controls-section" title="Nationwide Filter (國內專屬濾鏡 · 僅於 L2 且國家在視野內顯示)">
            {visibleRegionalFilters.map((filter) => {
              const isActive = isRegionalFilterActive(filter.id);
              const isHovered = hoveredRegionalFilterId === filter.id;
              return (
                <div
                  key={filter.id}
                  style={{ position: 'relative' }}
                  onMouseEnter={() => setHoveredRegionalFilterId(filter.id)}
                  onMouseLeave={() => setHoveredRegionalFilterId(null)}
                >
                  <button
                    className={`map-control-btn regional-control-btn ${isActive ? 'active' : ''} ${isHovered ? 'hovered' : ''}`}
                    onClick={() => handleToggleRegionalFilter(filter.id)}
                    style={
                      isActive
                        ? {
                            borderColor: filter.activeColor,
                            backgroundColor: isHovered ? `${filter.activeColor}38` : `${filter.activeColor}24`,
                            color: filter.activeColor,
                            boxShadow: isHovered
                              ? `0 0 16px ${filter.activeColor}66`
                              : `0 0 10px ${filter.activeColor}40`,
                            transform: isHovered ? 'scale(1.08)' : undefined
                          }
                        : isHovered
                        ? {
                            borderColor: filter.activeColor,
                            backgroundColor: `${filter.activeColor}20`,
                            color: filter.activeColor,
                            boxShadow: `0 0 14px ${filter.activeColor}45`,
                            transform: 'scale(1.08)'
                          }
                        : undefined
                    }
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: isActive || isHovered ? filter.activeColor : 'inherit'
                      }}
                    >
                      {filter.shortBadge}
                    </span>
                  </button>

                  {/* Enhanced floating tooltip reflecting on the button */}
                  {isHovered && (
                    <div
                      className="regional-btn-floating-tooltip"
                      style={{
                        position: 'absolute',
                        right: 'calc(100% + 12px)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        backgroundColor: 'rgba(15, 23, 42, 0.96)',
                        backdropFilter: 'blur(8px)',
                        border: `1px solid ${filter.activeColor}60`,
                        borderRadius: 8,
                        padding: '6px 12px',
                        whiteSpace: 'nowrap',
                        color: '#f8fafc',
                        boxShadow: `0 4px 16px rgba(0, 0, 0, 0.5), 0 0 10px ${filter.activeColor}30`,
                        pointerEvents: 'none',
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                        <span>{filter.shortBadge}</span>
                        <span style={{ color: filter.activeColor }}>{filter.nameZh}</span>
                        <span style={{ fontSize: 10, fontWeight: 500, color: isActive ? '#38bdf8' : '#94a3b8' }}>
                          {isActive ? '● 已啟用 (點擊關閉)' : '○ 點擊啟用'}
                        </span>
                      </div>
                      {filter.descriptionZh && (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#94a3b8',
                            fontWeight: 400,
                            maxWidth: 280,
                            whiteSpace: 'normal',
                            lineHeight: 1.35
                          }}
                        >
                          {filter.descriptionZh}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="map-controls-divider" />
          </div>
        )}

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
