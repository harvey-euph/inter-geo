import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as flatgeobuf from 'flatgeobuf';
import type { CountryData } from '../types/geo';
import { FILTERS } from '../data/filters';
import type { FilterDefinition } from '../data/filters';
import { findCountry, COUNTRIES_DATA } from '../data/countries';
import { getLODLevel, DEFAULT_LOD_THRESHOLDS, MAX_ZOOM_K } from '../types/lod';
import type {
  LODLevel,
  PrefectureDetail,
  MunicipalityDetail,
  CustomLODThresholds,
  L2SubdivisionDetail
} from '../types/lod';
import { JAPAN_PREFECTURES } from '../data/japanData';
import { PrecisionHUD } from './PrecisionHUD';
import { L2_MANIFEST } from '../data/l2Manifest';
import { L3_MANIFEST, L3_PARTITIONS_BY_KEY } from '../data/l3Manifest';
import type { L3PartitionMeta } from '../data/l3Manifest';
import { ROADS_MANIFEST } from '../data/roadsManifest';
import type { RoadPathData } from '../data/roadsMeta';
import {
  NATIONWIDE_FILTERS,
  COUNTRIES_WITH_ROADS,
  getRoadFiltersForCountry
} from '../data/nationwideFilters';
import type { NationwideFilterDef } from '../data/nationwideFilters';
import { EUROPEAN_CROSSING_SIGNS } from '../data/pedestrianCrossing';
import { TAIWAN_POWER_POLE_ZONES } from '../data/taiwanPowerPoles';
import type { TaipowerZoneDef } from '../data/taiwanPowerPoles';
import { MAP_W, MAP_H, createProjection, createPathGenerator } from '../map/geo';
import { decodeGeo } from '../map/geoWorkerClient';
import {
  getCsvFilterById,
  loadOnDemandCsvFilter
} from '../filters/csvFilterRegistry';
import {
  WORLD_COPIES,
  getCountryBBox,
  normParentKey,
  makeUnknownCountry,
  toL2Detail,
  type WorldCountryProperties,
  type GeoFeature,
  type CountryPathData,
  type L2SubdivisionPathData,
  type L3SubdivisionPathData,
  type ActiveL3ParentInfo,
  type TaipowerZoneRenderItem,
  type RoadBundle,
  type CrossingBadgeBox,
  type HitFeature
} from '../map/types';
import {
  drawWorldCopyLayers,
  drawGlobalTextBadges,
  drawAreaCodeBadges,
  drawCrossingSignBadges,
  drawTaipowerLabels,
  type RenderContext
} from '../map/render/renderLayers';
import { hitTestMapFeature } from '../map/hitTest';
import { useKeyboardNav } from '../map/hooks/useKeyboardNav';
import { MapTooltip } from '../map/MapTooltip';
import { MapLegend } from '../map/MapLegend';
import { MapControls } from '../map/MapControls';

export type {
  RoadPathData,
  L2SubdivisionDetail,
  WorldCountryProperties,
  CountryPathData,
  L2SubdivisionPathData,
  L3SubdivisionPathData,
  ActiveL3ParentInfo
};

type RegionalFilterDef = NationwideFilterDef;
const REGIONAL_FILTERS = NATIONWIDE_FILTERS;

interface WorldMapProps {
  activeFilterId: string;
  activeTextFilters?: Set<string>;
  activeInternationalImageFilter?: string | null;
  activeRegionalFilters?: Set<string>;
  onVisibleRegionalFiltersChange?: (filters: NationwideFilterDef[]) => void;
  isFilterExpanded?: boolean;
  selectedCountry: CountryData | null;
  onSelectCountry: (country: CountryData | null) => void;
  selectedSubdivision?: L2SubdivisionDetail | null;
  onSelectSubdivision?: (sub: L2SubdivisionDetail | null) => void;
  selectedPrefecture?: PrefectureDetail | null;
  onSelectPrefecture?: (pref: PrefectureDetail | null) => void;
  selectedMunicipality?: MunicipalityDetail | null;
  onSelectMunicipality?: (muni: MunicipalityDetail | null) => void;
  hoveredCountry?: CountryData | null;
  setHoveredCountry?: (country: CountryData | null) => void;
  zoomToPrefectureRef?: React.MutableRefObject<((prefId: number) => void) | null>;
  showRoads?: boolean;
  showInterstates?: boolean;
  onToggleInterstates?: () => void;
  showNumberedRoutes?: boolean;
  onToggleNumberedRoutes?: () => void;
  selectedRoad?: RoadPathData | null;
  onSelectRoad?: (road: RoadPathData | null) => void;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  activeFilterId,
  activeTextFilters,
  activeInternationalImageFilter,
  activeRegionalFilters: activeRegionalFiltersProp,
  onVisibleRegionalFiltersChange,
  isFilterExpanded = false,
  selectedCountry,
  onSelectCountry,
  selectedSubdivision,
  onSelectSubdivision,
  selectedPrefecture,
  onSelectPrefecture,
  selectedMunicipality,
  onSelectMunicipality,
  hoveredCountry: hoveredCountryProp,
  setHoveredCountry: setHoveredCountryProp,
  zoomToPrefectureRef,
  showRoads: showRoadsProp,
  showInterstates: showInterstatesProp,
  showNumberedRoutes: showNumberedRoutesProp,
  selectedRoad,
  onSelectRoad
}) => {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [loading, setLoading] = useState(true);

  // Level of Detail (LOD) tracking: L1 (Country), L2 (Subdivision), L3 (Local Unit)
  const [lodLevel, setLodLevel] = useState<LODLevel>('L1');
  const [lodThresholds, setLodThresholds] = useState<CustomLODThresholds>(DEFAULT_LOD_THRESHOLDS);
  const lodThresholdsRef = useRef<CustomLODThresholds>(lodThresholds);
  const [zoomK, setZoomK] = useState<number>(1.0);

  // Hover state (managed locally inside WorldMap to avoid re-rendering siblings in App)
  const [internalHoveredCountry, setInternalHoveredCountry] = useState<CountryData | null>(null);
  const hoveredCountry = hoveredCountryProp !== undefined ? hoveredCountryProp : internalHoveredCountry;
  const setHoveredCountry = useCallback(
    (c: CountryData | null) => {
      if (setHoveredCountryProp) {
        setHoveredCountryProp(c);
      } else {
        setInternalHoveredCountry(c);
      }
    },
    [setHoveredCountryProp]
  );

  // Sub-national hover states
  const [hoveredMunicipality, setHoveredMunicipality] = useState<MunicipalityDetail | null>(null);

  // L2 subdivision paths (streamed in background via Web Workers)
  const l2PathsByCountryRef = useRef<Record<string, L2SubdivisionPathData[]>>({});
  const [hoveredL2Subdivision, setHoveredL2Subdivision] = useState<L2SubdivisionDetail | null>(null);

  // L3 regional partition packs
  const visibleL3PacksRef = useRef<Set<string>>(new Set());
  const [visibleL3Packs, setVisibleL3Packs] = useState<Set<string>>(new Set());
  const inFlightL3PacksRef = useRef<Set<string>>(new Set());
  const loadedL3PacksRef = useRef<Set<string>>(new Set());

  // Road network overlay state and refs
  const showInterstates = showInterstatesProp ?? false;
  const showNumberedRoutes = showNumberedRoutesProp ?? false;
  const showRoads = showRoadsProp !== undefined ? showRoadsProp : showInterstates || showNumberedRoutes;
  const showRoadsRef = useRef<boolean>(showRoads);
  const showInterstatesRef = useRef<boolean>(showInterstates);
  const showNumberedRoutesRef = useRef<boolean>(showNumberedRoutes);
  const visibleRoadIso2sRef = useRef<Set<string>>(new Set());
  const [visibleRoadIso2s, setVisibleRoadIso2s] = useState<Set<string>>(new Set());
  const visibleRoadCopiesRef = useRef<number[]>([0]);
  const inFlightRoadFetchesRef = useRef<Set<string>>(new Set());
  const loadedRoadsRef = useRef<Map<string, RoadPathData[]>>(new Map());
  const roadBundlesRef = useRef<Map<string, RoadBundle>>(new Map());
  const [hoveredRoad, setHoveredRoad] = useState<RoadPathData | null>(null);
  const hoveredRoadRef = useRef<RoadPathData | null>(null);
  const selectedRoadRef = useRef<RoadPathData | null>(selectedRoad || null);

  // Dynamic Regional Filters state (surfaced only when target region is visible in viewport)
  const visibleRegionalFiltersRef = useRef<RegionalFilterDef[]>([]);
  const [internalActiveRegionalFilters] = useState<Set<string>>(new Set());
  const activeRegionalFilters = activeRegionalFiltersProp ?? internalActiveRegionalFilters;
  const activeRegionalFiltersRef = useRef<Set<string>>(activeRegionalFilters);

  // Taiwan Power Pole Grid hover state
  const [hoveredTaipowerZone, setHoveredTaipowerZone] = useState<TaipowerZoneDef | null>(null);
  const hoveredTaipowerZoneRef = useRef<TaipowerZoneDef | null>(null);

  // Feature Regional Filter: European Pedestrian Crossing Signs image cache & hit-testing boxes
  const crossingImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const renderedCrossingBadgesRef = useRef<CrossingBadgeBox[]>([]);

  // Global Text Overlay Filters ref
  const activeTextFiltersRef = useRef<Set<string>>(activeTextFilters || new Set());
  const activeInternationalImageFilterRef = useRef<string | null>(activeInternationalImageFilter || null);

  // Unified Canvas and Container Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
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
  const l2CountryDissolvedPathsRef = useRef<Record<string, Path2D>>({});
  const countryBBoxesRef = useRef<Record<string, [number, number, number, number]>>({});
  const countryDataMapRef = useRef<Map<string, CountryData>>(
    new Map(COUNTRIES_DATA.flatMap((c) => [[c.iso2, c], [c.id, c]] as Array<[string, CountryData]>))
  );
  const badgeWidthCacheRef = useRef<Map<string, number>>(new Map());
  const hoverRafId = useRef<number | null>(null);
  const renderRafIdRef = useRef<number | null>(null);
  const zoomKRafIdRef = useRef<number | null>(null);
  const renderCanvasRef = useRef<() => void>(() => {});

  // Store container dimensions
  const viewportSize = useRef({ w: 1200, h: 800 });

  // Transform stored in ref for direct 120fps GPU manipulation
  const transformRef = useRef({ k: 1, x: 0, y: 0 });
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStart = useRef({ clientX: 0, clientY: 0, x: 0, y: 0 });
  const lastDragSyncTime = useRef(0);
  const rafId = useRef<number | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const isMouseInsideRef = useRef(false);
  const isInitializedRef = useRef(false);

  const requestRender = useCallback(() => {
    if (renderRafIdRef.current !== null) return;
    renderRafIdRef.current = requestAnimationFrame(() => {
      renderRafIdRef.current = null;
      renderCanvasRef.current();
    });
  }, []);

  const scheduleZoomKState = useCallback((nextK: number) => {
    if (zoomKRafIdRef.current !== null) return;
    zoomKRafIdRef.current = requestAnimationFrame(() => {
      zoomKRafIdRef.current = null;
      setZoomK(Number(transformRef.current.k.toFixed(1)));
    });
    void nextK;
  }, []);

  const setTooltipNode = useCallback((node: HTMLDivElement | null) => {
    tooltipRef.current = node;
    if (node) {
      node.style.left = `${mousePos.current.x}px`;
      node.style.top = `${mousePos.current.y - 12}px`;
    }
  }, []);

  // Active filter definition
  const activeFilterDef = useMemo<FilterDefinition>(() => {
    return FILTERS.find((f) => f.id === activeFilterId) || FILTERS[0];
  }, [activeFilterId]);
  const activeFilterDefRef = useRef<FilterDefinition>(activeFilterDef);

  // Web Mercator Projection & GeoPath
  const projection = useMemo(() => createProjection(), []);
  const pathGenerator = useMemo(() => createPathGenerator(projection), [projection]);

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
        const bX = (1 - pct) * pSW[0] + pct * pSE[0];
        const bY = (1 - pct) * pSW[1] + pct * pSE[1];
        const tX = (1 - pct) * pNW[0] + pct * pNE[0];
        const tY = (1 - pct) * pNW[1] + pct * pNE[1];
        innerGridPath2D.moveTo(bX, bY);
        innerGridPath2D.lineTo(tX, tY);

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

      const hoverFillColor = z.fillColor
        .replace('0.28', '0.45')
        .replace('0.25', '0.42')
        .replace('0.22', '0.38')
        .replace('0.18', '0.35');

      return {
        zone: z,
        polygonPath2D,
        innerGridPath2D,
        pSW,
        pSE,
        pNE,
        pNW,
        pCenter,
        bbox,
        hoverFillColor
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

  // Aggregated world borders Path2D for ultra-fast single-pass stroke at overview zoom (k < 1.8)
  const l1WorldBordersPath = useMemo(() => {
    const path = new Path2D();
    for (let i = 0; i < countryPathData.length; i++) {
      if (countryPathData[i].path2D) {
        path.addPath(countryPathData[i].path2D);
      }
    }
    return path;
  }, [countryPathData]);

  // Deterministic ordered list of countries for keyboard cycling
  const deterministicCountries = useMemo(() => {
    return [...countryPathData]
      .filter((c) => !!c.countryMeta)
      .sort(
        (a, b) =>
          a.countryMeta!.name.localeCompare(b.countryMeta!.name) ||
          a.countryMeta!.iso2.localeCompare(b.countryMeta!.iso2)
      );
  }, [countryPathData]);

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

  // Strict screen visibility check: requires positive, meaningful physical overlap on screen
  const isCountryVisibleOnScreen = useCallback(
    (
      bbox: { minX: number; maxX: number; minY: number; maxY: number },
      k: number,
      x: number,
      y: number,
      vw: number,
      vh: number,
      minOverlapPx = 20
    ): boolean => {
      const sMinY = y + bbox.minY * k;
      const sMaxY = y + bbox.maxY * k;
      const overlapY = Math.min(vh, sMaxY) - Math.max(0, sMinY);
      if (overlapY < minOverlapPx) return false;

      for (const c of WORLD_COPIES) {
        const copyLeft = x + c * MAP_W * k;
        const copyRight = copyLeft + MAP_W * k;
        if (copyRight < 0 || copyLeft > vw) continue;

        const sMinX = x + (bbox.minX + c * MAP_W) * k;
        const sMaxX = x + (bbox.maxX + c * MAP_W) * k;
        const overlapX = Math.min(vw, sMaxX) - Math.max(0, sMinX);
        if (overlapX >= minOverlapPx) {
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

  const isCountryRoadClassActive = useCallback(
    (iso2: string, roadClass: 'Interstate' | 'Federal'): boolean => {
      const upper = (iso2 || '').toUpperCase();
      const set = activeRegionalFiltersRef.current;
      if (!set) return false;

      for (const id of set) {
        if (!id.startsWith(`roads-${upper}-`)) continue;
        if (
          roadClass === 'Interstate' &&
          (id.includes('interstate') ||
            id.includes('autobahn') ||
            id.includes('expressway') ||
            id.includes('freeway') ||
            id.includes('motorway') ||
            id.includes('autoroute'))
        ) {
          return true;
        }
        if (
          roadClass === 'Federal' &&
          (id.includes('route') ||
            id.includes('routes') ||
            id.includes('bundesstrasse') ||
            id.includes('national') ||
            id.includes('provincial') ||
            id.includes('aroad') ||
            id.includes('primary'))
        ) {
          return true;
        }
      }

      if (upper === 'US') {
        if (
          roadClass === 'Interstate' &&
          (set.has('us-interstates') || (showRoadsRef.current && showInterstatesRef.current))
        ) {
          return true;
        }
        if (
          roadClass === 'Federal' &&
          (set.has('us-numbered-routes') || (showRoadsRef.current && showNumberedRoutesRef.current))
        ) {
          return true;
        }
      }

      return false;
    },
    []
  );

  const isCountryAnyRoadActive = useCallback(
    (iso2: string): boolean => {
      return isCountryRoadClassActive(iso2, 'Interstate') || isCountryRoadClassActive(iso2, 'Federal');
    },
    [isCountryRoadClassActive]
  );

  const isAnyRoadActive = useCallback((): boolean => {
    const set = activeRegionalFiltersRef.current;
    if (set) {
      for (const id of set) {
        if (id.startsWith('roads-') || id === 'us-interstates' || id === 'us-numbered-routes') return true;
      }
    }
    return showRoadsRef.current && (showInterstatesRef.current || showNumberedRoutesRef.current);
  }, []);

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
        if (isCountryAnyRoadActive(iso2) && isCountryInViewport(entry.bbox, k, x, y, vw, vh, 150)) {
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
      for (const c of WORLD_COPIES) {
        const left = x + c * MAP_W * k;
        const right = left + MAP_W * k;
        if (right >= -100 && left <= vw + 100) {
          nextCopies.push(c);
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
    [isCountryInViewport, isCountryAnyRoadActive]
  );

  // Synchronize visible nationwide filter buttons across viewport (only surfaces when L2 data is displayed)
  const syncRegionalFiltersViewport = useCallback(
    (k: number, x: number, y: number, vw: number, vh: number, currentLOD: LODLevel = lodLevelRef.current) => {
      const isL2Active = currentLOD === 'L2' || currentLOD === 'L3';
      const nextVisible: RegionalFilterDef[] = [];

      if (isL2Active) {
        for (let i = 0; i < REGIONAL_FILTERS.length; i++) {
          const filter = REGIONAL_FILTERS[i];
          if (filter.minZoomK && k < filter.minZoomK) continue;

          if (filter.targetIso2 === '*') {
            const anyVisible = filter.targetIso2s?.some((iso) => {
              const b = getCountryBBox(iso);
              return b && isCountryVisibleOnScreen(b, k, x, y, vw, vh, 20);
            });
            if (anyVisible) {
              nextVisible.push(filter);
            }
          } else {
            const hasVisibility = filter.customBBoxes
              ? filter.customBBoxes.some((b) => isCountryVisibleOnScreen(b, k, x, y, vw, vh, 20))
              : (() => {
                  const targetBBox = filter.customBBox || getCountryBBox(filter.targetIso2);
                  return targetBBox ? isCountryVisibleOnScreen(targetBBox, k, x, y, vw, vh, 20) : false;
                })();

            if (hasVisibility) {
              nextVisible.push(filter);
            }
          }
        }

        // Surface country-specific road filters for visible countries with road data
        for (let i = 0; i < COUNTRIES_WITH_ROADS.length; i++) {
          const iso2 = COUNTRIES_WITH_ROADS[i];
          const b = getCountryBBox(iso2);
          if (b && isCountryVisibleOnScreen(b, k, x, y, vw, vh, 20)) {
            const roadFilters = getRoadFiltersForCountry(iso2);
            for (let rIdx = 0; rIdx < roadFilters.length; rIdx++) {
              const filter = roadFilters[rIdx];
              const filterVisible = filter.customBBoxes
                ? filter.customBBoxes.some((box) => isCountryVisibleOnScreen(box, k, x, y, vw, vh, 20))
                : filter.customBBox
                ? isCountryVisibleOnScreen(filter.customBBox, k, x, y, vw, vh, 20)
                : true;

              if (filterVisible) {
                nextVisible.push(filter);
              }
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
        if (onVisibleRegionalFiltersChange) {
          onVisibleRegionalFiltersChange(nextVisible);
        }
      }
    },
    [isCountryVisibleOnScreen, onVisibleRegionalFiltersChange]
  );

  // Unified viewport synchronizer for L3, Road networks, and Regional Filters
  const syncAllViewports = useCallback(
    (k: number, x: number, y: number, vw: number, vh: number, currentLOD: LODLevel) => {
      syncL3Viewport(k, x, y, vw, vh, currentLOD);
      syncRoadsViewport(k, x, y, vw, vh, isAnyRoadActive());
      syncRegionalFiltersViewport(k, x, y, vw, vh, currentLOD);
    },
    [syncL3Viewport, syncRoadsViewport, syncRegionalFiltersViewport, isAnyRoadActive]
  );

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

    const currentLod = lodLevelRef.current;
    const rc: RenderContext = {
      ctx,
      k,
      x,
      y,
      vw,
      vh,
      dpr,
      visibleCopies,
      currentLod,
      isL2RegionMode: currentLod === 'L2' || currentLod === 'L3',
      activeFilter: activeFilterDefRef.current,
      activeTextFilters: activeTextFiltersRef.current,
      activeInternationalImageFilter: activeInternationalImageFilterRef.current,
      activeRegionalFilters: activeRegionalFiltersRef.current,
      countryPathData,
      countryPathMap,
      l1WorldBordersPath,
      combinedByCountry: l2CountryCombinedPathsRef.current,
      dissolvedByCountry: l2CountryDissolvedPathsRef.current,
      countryBBoxes: countryBBoxesRef.current,
      countryMap: countryDataMapRef.current,
      l2ByCountry: l2PathsByCountryRef.current,
      activeL3Parent: activeL3ParentRef.current,
      getL3SubdivisionsForParent,
      taipowerZoneRenderItems: taipowerZoneRenderItemsRef.current,
      hoveredTaipowerZone: hoveredTaipowerZoneRef.current,
      visibleRoadIso2s: visibleRoadIso2sRef.current,
      roadBundles: roadBundlesRef.current,
      isAnyRoadActive,
      isCountryRoadClassActive,
      selectedRoad: selectedRoadRef.current,
      hoveredRoad: hoveredRoadRef.current,
      hoveredCountry: hoveredCountryRef.current,
      selectedCountry: selectedCountryRef.current,
      hoveredMunicipality: hoveredMunicipalityRef.current,
      selectedMunicipality: selectedMunicipalityRef.current,
      hoveredL2Subdivision: hoveredL2SubdivisionRef.current,
      selectedL2Subdivision: selectedL2SubdivisionRef.current,
      badgeWidthCache: badgeWidthCacheRef.current,
      crossingImages: crossingImagesRef.current
    };

    drawWorldCopyLayers(rc);
    drawGlobalTextBadges(rc);
    drawAreaCodeBadges(rc);
    renderedCrossingBadgesRef.current = drawCrossingSignBadges(rc);
    drawTaipowerLabels(rc);
  }, [
    countryPathData,
    countryPathMap,
    l1WorldBordersPath,
    getL3SubdivisionsForParent,
    isAnyRoadActive,
    isCountryRoadClassActive
  ]);

  useEffect(() => {
    renderCanvasRef.current = renderCanvas;
  }, [renderCanvas]);

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

  // Helper to fetch an individual L3 regional partition pack (decoded in background worker)
  const fetchL3Pack = useCallback(
    async (filePath: string) => {
      if (loadedL3PacksRef.current.has(filePath) || inFlightL3PacksRef.current.has(filePath)) {
        return;
      }
      inFlightL3PacksRef.current.add(filePath);

      try {
        const { features: decoded } = await decodeGeo(`${import.meta.env.BASE_URL}/${filePath}`, 'l3');
        const paths: L3SubdivisionPathData[] = [];

        for (let i = 0; i < decoded.length; i++) {
          const f = decoded[i];
          const p = f.props;
          const iso2 = String(p.iso2 || '');
          paths.push({
            path2D: new Path2D(f.d),
            bbox: f.bbox,
            id: String(p.id || f.fid || ''),
            iso2,
            name: String(p.name || ''),
            nameEn: String(p.name_en || p.name || ''),
            nameZh: String(p.name_zh || p.name || ''),
            typeEn: String(p.type_en || ''),
            parentName: String(p.parent_name || ''),
            parentCode: String(p.parent_code || ''),
            code: String(p.code || '')
          });
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
          requestRender();
        }
      } catch (err) {
        console.warn(`[L3] Failed to load pack ${filePath}:`, err);
      } finally {
        inFlightL3PacksRef.current.delete(filePath);
      }
    },
    [requestRender]
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
        partition =
          L3_PARTITIONS_BY_KEY[`${normIso2}:${code}`] ||
          L3_PARTITIONS_BY_KEY[`${normIso2}:${normLookup(code)}`];
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
  const getFeatureAtPoint = useCallback(
    (clientX: number, clientY: number): HitFeature | null => {
      return hitTestMapFeature({
        clientX,
        clientY,
        container: containerRef.current,
        canvas: canvasRef.current,
        transform: transformRef.current,
        currentLod: lodLevelRef.current,
        activeInternationalImageFilter: activeInternationalImageFilterRef.current,
        activeRegionalFilters: activeRegionalFiltersRef.current,
        renderedCrossingBadges: renderedCrossingBadgesRef.current,
        countryPathData,
        countryPathMap,
        isAnyRoadActive,
        isCountryAnyRoadActive,
        isCountryRoadClassActive,
        visibleRoadCopies: visibleRoadCopiesRef.current,
        visibleRoadIso2s: visibleRoadIso2sRef.current,
        loadedRoads: loadedRoadsRef.current,
        activeL3Parent: activeL3ParentRef.current,
        getL3SubdivisionsForParent,
        taipowerZoneRenderItems: taipowerZoneRenderItemsRef.current,
        countryBBoxes: countryBBoxesRef.current,
        l2ByCountry: l2PathsByCountryRef.current,
        l2DissolvedByCountry: l2CountryDissolvedPathsRef.current
      });
    },
    [
      countryPathData,
      countryPathMap,
      getL3SubdivisionsForParent,
      isAnyRoadActive,
      isCountryAnyRoadActive,
      isCountryRoadClassActive
    ]
  );

  // Map Click Handler: selects feature or deselects when clicking empty space
  const handleMapClick = useCallback(
    (e: React.MouseEvent) => {
      if (hasDragged.current) return;
      const target = e.target as Element | null;
      if (target?.closest('.map-controls, .filter-legend-card, .precision-hud')) {
        return;
      }

      const hit = getFeatureAtPoint(e.clientX, e.clientY);

      if (hit && hit.type === 'road') {
        if (onSelectRoad) onSelectRoad(hit.data);
        onSelectCountry(null);
        if (onSelectSubdivision) onSelectSubdivision(null);
        if (onSelectPrefecture) onSelectPrefecture(null);
        if (onSelectMunicipality) onSelectMunicipality(null);
        return;
      } else {
        if (onSelectRoad) onSelectRoad(null);
      }

      if (!hit) {
        selectedL2SubdivisionRef.current = null;
        if (onSelectSubdivision) onSelectSubdivision(null);
        onSelectCountry(null);
        if (onSelectPrefecture) onSelectPrefecture(null);
        if (onSelectMunicipality) onSelectMunicipality(null);
        requestRender();
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
          if (onSelectSubdivision) {
            onSelectSubdivision(toL2Detail(sub));
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
      requestRender();
    },
    [
      onSelectRoad,
      onSelectCountry,
      onSelectSubdivision,
      onSelectPrefecture,
      onSelectMunicipality,
      getFeatureAtPoint,
      loadL3PackForSubdivision,
      requestRender
    ]
  );

  const clearHover = useCallback((): boolean => {
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
    return hadHover;
  }, [setHoveredCountry]);

  const applyHover = useCallback(
    (next: {
      road?: RoadPathData | null;
      country?: CountryData | null;
      municipality?: MunicipalityDetail | null;
      l2?: L2SubdivisionDetail | null;
      taipower?: TaipowerZoneDef | null;
    }) => {
      const road = next.road ?? null;
      const country = next.country ?? null;
      const municipality = next.municipality ?? null;
      const l2 = next.l2 ?? null;
      const taipower = next.taipower ?? null;

      if (hoveredRoadRef.current !== road) {
        hoveredRoadRef.current = road;
        setHoveredRoad(road);
      }
      if (hoveredCountryRef.current !== country) {
        hoveredCountryRef.current = country;
        setHoveredCountry(country);
      }
      if (hoveredMunicipalityRef.current !== municipality) {
        hoveredMunicipalityRef.current = municipality;
        setHoveredMunicipality(municipality);
      }
      if (hoveredL2SubdivisionRef.current !== l2) {
        hoveredL2SubdivisionRef.current = l2;
        setHoveredL2Subdivision(l2);
      }
      if (hoveredTaipowerZoneRef.current !== taipower) {
        hoveredTaipowerZoneRef.current = taipower;
        setHoveredTaipowerZone(taipower);
      }
      requestRender();
    },
    [setHoveredCountry, requestRender]
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
        if (clearHover()) {
          requestRender();
        }
        return;
      }

      if (hit.type === 'activeParentInterior') {
        let changed = false;
        if (hoveredMunicipalityRef.current) {
          hoveredMunicipalityRef.current = null;
          setHoveredMunicipality(null);
          changed = true;
        }
        if (hoveredTaipowerZoneRef.current) {
          hoveredTaipowerZoneRef.current = null;
          setHoveredTaipowerZone(null);
          changed = true;
        }
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
        if (changed) requestRender();
        return;
      }

      if (hit.type === 'taipowerZone') {
        const z = hit.data;
        if (hoveredTaipowerZoneRef.current?.letter !== z.letter) {
          applyHover({ taipower: z });
        }
      } else if (hit.type === 'road') {
        const road = hit.data;
        if (hoveredRoadRef.current?.name !== road.name) {
          applyHover({ road });
        }
      } else if (hit.type === 'municipality') {
        const m = hit.data;
        if (hoveredMunicipalityRef.current?.code !== m.code || hoveredMunicipalityRef.current?.iso2 !== m.iso2) {
          applyHover({ municipality: m });
        }
      } else if (hit.type === 'l2Subdivision') {
        const sub = hit.data;
        const currentLod = lodLevelRef.current;

        if (currentLod === 'L1') {
          const cMeta =
            findCountry(sub.iso2) ||
            makeUnknownCountry(sub.iso2, sub.iso2, sub.nameEn || sub.iso2, sub.nameZh || sub.iso2);

          if (hoveredCountryRef.current?.iso2 !== cMeta.iso2) {
            applyHover({ country: cMeta });
          }
        } else {
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
            applyHover({ l2: toL2Detail(sub) });
          }
        }
      } else if (hit.type === 'country') {
        const c = hit.data;
        const cMeta =
          c.countryMeta ||
          makeUnknownCountry(String(c.id), '', c.name, c.name, ['此地區目前尚無 Google 街景官方車載覆蓋。']);
        if (lodLevelRef.current === 'L3' && activeL3ParentRef.current && activeL3ParentRef.current.iso2 !== cMeta.iso2) {
          activeL3ParentRef.current = null;
        }
        if (hoveredCountryRef.current?.id !== cMeta.id) {
          applyHover({ country: cMeta });
        }
      }

      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'flex';
        tooltipRef.current.style.left = `${clientX}px`;
        tooltipRef.current.style.top = `${clientY - 12}px`;
      }
    },
    [getFeatureAtPoint, clearHover, applyHover, requestRender]
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

      const now = performance.now();
      if (now - lastDragSyncTime.current > 200) {
        lastDragSyncTime.current = now;
        syncRegionalFiltersViewport(
          k,
          transformRef.current.x,
          transformRef.current.y,
          viewportSize.current.w,
          vh,
          lodLevelRef.current
        );
      }

      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          renderCanvas();
          rafId.current = null;
        });
      }
      return;
    }

    const target = e.target as Element | null;
    const isOverControl = !!target?.closest(
      '.map-controls, .regional-controls-section, .filter-legend-card, .precision-hud'
    );

    if (isOverControl) {
      if (hoverRafId.current !== null) {
        cancelAnimationFrame(hoverRafId.current);
        hoverRafId.current = null;
      }
      if (containerRef.current) {
        containerRef.current.style.cursor = 'default';
      }
      if (clearHover()) {
        requestRender();
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

  // Apply LOD transition side effects (clear sub-level hovers/selections when zooming out)
  const applyLOD = useCallback(
    (nextLOD: LODLevel): boolean => {
      if (nextLOD === lodLevelRef.current) return false;
      setLodLevel(nextLOD);
      lodLevelRef.current = nextLOD;
      if (nextLOD !== 'L3') {
        activeL3ParentRef.current = null;
        if (hoveredMunicipalityRef.current) {
          hoveredMunicipalityRef.current = null;
          setHoveredMunicipality(null);
        }
      }
      if (nextLOD === 'L1') {
        if (hoveredL2SubdivisionRef.current) {
          hoveredL2SubdivisionRef.current = null;
          setHoveredL2Subdivision(null);
        }
        selectedL2SubdivisionRef.current = null;
        if (onSelectSubdivision) onSelectSubdivision(null);
        if (hoveredTaipowerZoneRef.current) {
          hoveredTaipowerZoneRef.current = null;
          setHoveredTaipowerZone(null);
        }
      }
      return true;
    },
    [onSelectSubdivision]
  );

  // Native non-passive wheel listener so preventDefault() actually blocks browser page zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
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

      const nextLOD = getLODLevel(newK, lodThresholdsRef.current);
      applyLOD(nextLOD);
      scheduleZoomKState(newK);
      syncAllViewports(newK, transformRef.current.x, transformRef.current.y, viewportSize.current.w, vh, nextLOD);
      requestRender();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [wrapX, clampY, applyLOD, scheduleZoomKState, syncAllViewports, requestRender]);

  const handleZoom = useCallback(
    (direction: 'in' | 'out') => {
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

      const nextLOD = getLODLevel(newK, lodThresholdsRef.current);
      applyLOD(nextLOD);
      setZoomK(Number(newK.toFixed(1)));
      animateTo(newK, newX, newY, 280, () => {
        syncAllViewports(newK, newX, newY, vw, vh, nextLOD);
      });
    },
    [wrapX, clampY, applyLOD, animateTo, syncAllViewports]
  );

  const handleZoomIn = useCallback(() => handleZoom('in'), [handleZoom]);
  const handleZoomOut = useCallback(() => handleZoom('out'), [handleZoom]);

  const handleResetZoom = useCallback(() => {
    const vh = viewportSize.current.h;
    const vw = viewportSize.current.w;
    const kMin = vh / MAP_H;

    const targetX = wrapX(vw / 2 - (MAP_W / 2) * kMin, kMin);
    const targetY = clampY((vh - MAP_H * kMin) / 2, kMin, vh);

    const targetLOD = getLODLevel(kMin, lodThresholdsRef.current);
    setZoomK(Number(kMin.toFixed(1)));
    applyLOD(targetLOD);
    animateTo(kMin, targetX, targetY, 320, () => {
      syncAllViewports(kMin, targetX, targetY, vw, vh, targetLOD);
    });
  }, [wrapX, clampY, applyLOD, animateTo, syncAllViewports]);

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
      applyLOD(nextLOD);
      scheduleZoomKState(newK);
      syncAllViewports(newK, transformRef.current.x, transformRef.current.y, vw, vh, nextLOD);
      requestRender();
    },
    [wrapX, clampY, requestRender, scheduleZoomKState, lodThresholds, syncAllViewports, applyLOD]
  );

  // Update dynamic custom LOD thresholds
  const handleUpdateThresholds = useCallback(
    (newThresholds: CustomLODThresholds) => {
      setLodThresholds(newThresholds);
      lodThresholdsRef.current = newThresholds;
      const currentK = transformRef.current.k;
      const nextLOD = getLODLevel(currentK, newThresholds);
      if (applyLOD(nextLOD)) {
        syncAllViewports(
          currentK,
          transformRef.current.x,
          transformRef.current.y,
          viewportSize.current.w,
          viewportSize.current.h,
          nextLOD
        );
      }
      requestRender();
    },
    [syncAllViewports, requestRender, applyLOD]
  );

  // Synchronize state and prop changes into render refs
  useEffect(() => {
    selectedCountryRef.current = selectedCountry;
    if (
      selectedCountry &&
      selectedL2SubdivisionRef.current &&
      selectedL2SubdivisionRef.current.iso2 !== selectedCountry.iso2
    ) {
      selectedL2SubdivisionRef.current = null;
    }
    requestRender();
  }, [selectedCountry, requestRender]);

  useEffect(() => {
    if (selectedSubdivision) {
      selectedL2SubdivisionRef.current = { iso2: selectedSubdivision.iso2, id: selectedSubdivision.id };
    } else if (selectedPrefecture) {
      selectedL2SubdivisionRef.current = { iso2: 'JP', id: selectedPrefecture.id };
    } else {
      selectedL2SubdivisionRef.current = null;
    }
    requestRender();
  }, [selectedSubdivision, selectedPrefecture, requestRender]);

  useEffect(() => {
    selectedMunicipalityRef.current = selectedMunicipality || null;
    requestRender();
  }, [selectedMunicipality, requestRender]);

  useEffect(() => {
    selectedRoadRef.current = selectedRoad || null;
    requestRender();
  }, [selectedRoad, requestRender]);

  useEffect(() => {
    activeFilterDefRef.current = activeFilterDef;
    requestRender();
  }, [activeFilterDef, requestRender]);

  useEffect(() => {
    activeTextFiltersRef.current = activeTextFilters || new Set();
    if (activeTextFilters) {
      for (const id of activeTextFilters) {
        const csvF = getCsvFilterById(id);
        if (csvF && !csvF.loaded) {
          void loadOnDemandCsvFilter(id).then(() => {
            requestRender();
          });
        }
      }
    }
    requestRender();
  }, [activeTextFilters, requestRender]);

  useEffect(() => {
    activeInternationalImageFilterRef.current = activeInternationalImageFilter || null;
    requestRender();
  }, [activeInternationalImageFilter, requestRender]);

  useEffect(() => {
    activeRegionalFiltersRef.current = activeRegionalFilters;
    for (const id of activeRegionalFilters) {
      const csvF = getCsvFilterById(id);
      if (csvF && !csvF.loaded) {
        void loadOnDemandCsvFilter(id).then(() => {
          requestRender();
        });
      }
    }
    const { k, x, y } = transformRef.current;
    syncRoadsViewport(k, x, y, viewportSize.current.w, viewportSize.current.h, isAnyRoadActive());
    requestRender();
  }, [activeRegionalFilters, syncRoadsViewport, isAnyRoadActive, requestRender]);

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
        img.src = `${import.meta.env.BASE_URL}/${meta.imagePath}`;
        img.onload = () => {
          requestRender();
        };
        crossingImagesRef.current.set(iso2, img);
        hasUnloaded = true;
      }
    }
    if (!hasUnloaded) {
      requestRender();
    }
  }, [activeInternationalImageFilter, activeRegionalFilters, requestRender]);

  useEffect(() => {
    requestRender();
  }, [countryPathData, requestRender]);

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
    requestRender();
  }, [lodLevel, requestRender, syncRegionalFiltersViewport]);

  // Synchronize selected subdivision into activeL3ParentRef
  useEffect(() => {
    if (lodLevelRef.current !== 'L3' || !selectedSubdivision) return;
    const subs = l2PathsByCountryRef.current[selectedSubdivision.iso2];
    const sub = subs?.find((s) => String(s.id) === String(selectedSubdivision.id));
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
      requestRender();
    }
  }, [selectedSubdivision, loadL3PackForSubdivision, requestRender]);

  useEffect(() => {
    lodThresholdsRef.current = lodThresholds;
  }, [lodThresholds]);

  useEffect(() => {
    showRoadsRef.current = showRoads;
    showInterstatesRef.current = showInterstates;
    showNumberedRoutesRef.current = showNumberedRoutes;
    if (showRoads && tooltipRef.current) {
      tooltipRef.current.style.display = 'none';
    }
    const { k, x, y } = transformRef.current;
    syncRoadsViewport(k, x, y, viewportSize.current.w, viewportSize.current.h, showRoads);
    requestRender();
  }, [showRoads, showInterstates, showNumberedRoutes, syncRoadsViewport, requestRender]);

  // Startup loader: show the map as soon as L1 countries finish, then stream all 91 L2 files in Web Workers
  useEffect(() => {
    let isMounted = true;

    const loadL1 = async (): Promise<GeoFeature[]> => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}/data/countries-110m.fgb`);
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

    const streamAllL2InBackground = async () => {
      const queue = [...L2_MANIFEST];
      const CONCURRENCY = 8;

      const worker = async () => {
        while (queue.length > 0) {
          if (!isMounted) return;
          const c = queue.shift();
          if (!c) break;
          const iso2 = c.iso2;
          try {
            
            const { features: decoded, dissolvedD } = await decodeGeo(
              `${import.meta.env.BASE_URL}/data/l2/${iso2}.fgb`, 'l2', iso2
            );
            if (!isMounted) return;

            const paths: L2SubdivisionPathData[] = [];
            const countryPath = new Path2D();
            let cMinX = Infinity,
              cMinY = Infinity,
              cMaxX = -Infinity,
              cMaxY = -Infinity;

            for (let i = 0; i < decoded.length; i++) {
              const f = decoded[i];

              if (!f) {
                console.error(`[L2] ${iso2}: missing feature at index ${i}`);
                continue;
              }

              if (!f.bbox || f.bbox.length < 4) {
                console.error(`[L2] ${iso2}: invalid bbox at feature ${i}`, f);
                continue;
              }

              if (typeof f.d !== 'string') {
                console.error(`[L2] ${iso2}: invalid path data at feature ${i}`, f);
                continue;
              }

              const p = f.props ?? {};
              const path2D = new Path2D(f.d);
              const bbox = f.bbox;
              countryPath.addPath(path2D);
              if (bbox[0] < cMinX) cMinX = bbox[0];
              if (bbox[1] < cMinY) cMinY = bbox[1];
              if (bbox[2] > cMaxX) cMaxX = bbox[2];
              if (bbox[3] > cMaxY) cMaxY = bbox[3];

              paths.push({
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
                centroid: f.centroid || [
                  (bbox[0] + bbox[2]) / 2,
                  (bbox[1] + bbox[3]) / 2
                ]
              });
            }

            l2PathsByCountryRef.current[iso2] = paths;
            l2CountryCombinedPathsRef.current[iso2] = countryPath;
            countryBBoxesRef.current[iso2] = [cMinX, cMinY, cMaxX, cMaxY];
            if (dissolvedD) {
              l2CountryDissolvedPathsRef.current[iso2] = new Path2D(dissolvedD);
            }

            if (transformRef.current.k >= 1.8 || lodLevelRef.current !== 'L1') {
              requestRender();
            }
          } catch (err) {
            console.warn(`[L2] Failed to preload /data/l2/${iso2}.fgb:`, err);
          }
        }
      };

      await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
    };

    (async () => {
      try {
        const loadedL1 = await loadL1();
        if (!isMounted) return;
        setFeatures(loadedL1);
        setLoading(false);
        void streamAllL2InBackground();
      } catch (err) {
        console.error('Initial map data loading error:', err);
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      if (animRafId.current !== null) {
        cancelAnimationFrame(animRafId.current);
        animRafId.current = null;
      }
      if (hoverRafId.current !== null) {
        cancelAnimationFrame(hoverRafId.current);
        hoverRafId.current = null;
      }
      if (renderRafIdRef.current !== null) {
        cancelAnimationFrame(renderRafIdRef.current);
        renderRafIdRef.current = null;
      }
      if (zoomKRafIdRef.current !== null) {
        cancelAnimationFrame(zoomKRafIdRef.current);
        zoomKRafIdRef.current = null;
      }
    };
  }, [requestRender]);

  // On-demand loader for visible L3 regional FlatGeobuf packs (only when L3 mode is active)
  useEffect(() => {
    if (lodLevel !== 'L3') return;

    for (const filePath of visibleL3Packs) {
      fetchL3Pack(filePath);
    }
  }, [visibleL3Packs, lodLevel, fetchL3Pack]);

  // On-demand loader for visible countries' Road FlatGeobuf datasets (decoded in background worker)
  useEffect(() => {
    if (!showRoads && !isAnyRoadActive()) return;

    let isMounted = true;
    for (const iso2 of visibleRoadIso2s) {
      if (loadedRoadsRef.current.has(iso2) || inFlightRoadFetchesRef.current.has(iso2)) continue;

      inFlightRoadFetchesRef.current.add(iso2);

      (async () => {
        try {
          const { features: decoded } = await decodeGeo(
            `${import.meta.env.BASE_URL}/data/roads/${iso2}.fgb`, 'roads', iso2
          );
          if (!isMounted) return;

          const paths: RoadPathData[] = [];
          const interstatesPath2D = new Path2D();
          const usRoutesPath2D = new Path2D();

          for (let i = 0; i < decoded.length; i++) {
            const f = decoded[i];
            const p = f.props;
            const roadClass = p.class === 'Interstate' ? 'Interstate' : 'Federal';
            const path2D = new Path2D(f.d);

            if (roadClass === 'Interstate') {
              interstatesPath2D.addPath(path2D);
            } else {
              usRoutesPath2D.addPath(path2D);
            }

            paths.push({
              name: String(p.name || ''),
              class: roadClass,
              number: String(p.number || ''),
              prefix: String(p.prefix || ''),
              type: String(p.type || ''),
              scalerank: Number(p.scalerank || 0),
              bbox: f.bbox,
              path2D,
              iso2
            });
          }

          if (isMounted) {
            loadedRoadsRef.current.set(iso2, paths);
            roadBundlesRef.current.set(iso2, {
              roads: paths,
              interstatesPath2D,
              usRoutesPath2D
            });
            requestRender();
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
  }, [visibleRoadIso2s, showRoads, activeRegionalFilters, isAnyRoadActive, requestRender]);

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
          requestRender();
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [clampY, wrapX, requestRender, syncAllViewports]);

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
      requestRender();
    }
  }, [loading, wrapX, clampY, renderCanvas, requestRender, lodThresholds, syncAllViewports]);

  // Zoom directly into a prefecture (called from Drawer)
  useEffect(() => {
    if (zoomToPrefectureRef) {
      zoomToPrefectureRef.current = (prefId: number) => {
        const target = l2PathsByCountryRef.current['JP']?.find((p) => Number(p.id) === prefId);
        if (target) {
          const [cx, cy] = target.centroid;
          const targetK = 7.8;
          const vh = viewportSize.current.h;
          const vw = viewportSize.current.w;
          const targetX = wrapX(vw / 2 - cx * targetK, targetK);
          const targetY = clampY(vh / 2 - cy * targetK, targetK, vh);

          const targetLOD = getLODLevel(targetK, lodThresholdsRef.current);
          setZoomK(Number(targetK.toFixed(1)));
          applyLOD(targetLOD);
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
  }, [zoomToPrefectureRef, wrapX, clampY, animateTo, syncAllViewports, loadL3PackForSubdivision, applyLOD]);

  // Arrow key navigation hook
  useKeyboardNav({
    deterministicCountries,
    getTransform: () => transformRef.current,
    setTransformXY: (x, y) => {
      transformRef.current.x = x;
      transformRef.current.y = y;
    },
    getViewport: () => viewportSize.current,
    getMousePos: () => mousePos.current,
    getLodLevel: () => lodLevelRef.current,
    getSelectedRoad: () => selectedRoadRef.current,
    setSelectedRoadRef: (r) => {
      selectedRoadRef.current = r;
    },
    getSelectedMunicipality: () => selectedMunicipalityRef.current,
    setSelectedMunicipalityRef: (m) => {
      selectedMunicipalityRef.current = m;
    },
    getSelectedL2Subdivision: () => selectedL2SubdivisionRef.current,
    setSelectedL2SubdivisionRef: (s) => {
      selectedL2SubdivisionRef.current = s;
    },
    getSelectedCountry: () => selectedCountryRef.current,
    setSelectedCountryRef: (c) => {
      selectedCountryRef.current = c;
    },
    getActiveL3Parent: () => activeL3ParentRef.current,
    setActiveL3Parent: (p) => {
      activeL3ParentRef.current = p;
    },
    getRoadBundles: () => roadBundlesRef.current,
    getL2PathsForCountry: (iso2) => l2PathsByCountryRef.current[iso2] || [],
    getL3SubdivisionsForParent,
    loadL3PackForSubdivision,
    onSelectCountry,
    onSelectSubdivision,
    onSelectPrefecture,
    onSelectMunicipality,
    onSelectRoad,
    wrapX,
    clampY,
    animateTo,
    syncAllViewports,
    renderCanvas,
    requestRender,
    updateHoverAtPoint
  });

  return (
    <div
      ref={containerRef}
      className={`svg-map-wrapper ${showRoads ? 'roads-mode-active' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseEnter={(e) => {
        isMouseInsideRef.current = true;
        mousePos.current = { x: e.clientX, y: e.clientY };
      }}
      onMouseLeave={() => {
        isMouseInsideRef.current = false;
        isDragging.current = false;
        const changed = clearHover();
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
        if (changed) {
          requestRender();
        }
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
              正在初始化全球國家邊界...
            </div>
          </div>
        </div>
      ) : (
        <canvas ref={canvasRef} className="world-map-canvas" />
      )}

      {/* Dynamic Floating Hover Tooltip */}
      <MapTooltip
        setTooltipNode={setTooltipNode}
        hoveredRoad={hoveredRoad}
        hoveredCountry={hoveredCountry}
        hoveredMunicipality={hoveredMunicipality}
        hoveredL2Subdivision={hoveredL2Subdivision}
        hoveredTaipowerZone={hoveredTaipowerZone}
        activeRegionalFilters={activeRegionalFilters}
      />

      {/* Floating Precision LOD Tracker HUD */}
      <PrecisionHUD
        currentLOD={lodLevel}
        currentZoomK={zoomK}
        lodThresholds={lodThresholds}
        onUpdateThresholds={handleUpdateThresholds}
        onZoomChange={handleSliderZoom}
      />

      {/* Filter Legend Card */}
      <MapLegend
        activeFilterDef={activeFilterDef}
        isFilterExpanded={isFilterExpanded}
        activeTextFilters={activeTextFilters}
        activeInternationalImageFilter={activeInternationalImageFilter}
        lodLevel={lodLevel}
        activeRegionalFilters={activeRegionalFilters}
      />

      {/* Map Control Buttons */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
      />
    </div>
  );
};
