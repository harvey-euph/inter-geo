import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import * as flatgeobuf from 'flatgeobuf';
import type { CountryData, LegendItem } from '../types/geo';
import type { LayerDefinition } from '../data/layers';
import { findCountry, COUNTRIES_DATA } from '../data/countries';
import { getLODLevel, DEFAULT_LOD_THRESHOLDS, MAX_ZOOM_K } from '../types/lod';
import type { LODLevel, MunicipalityDetail, L2SubdivisionDetail } from '../types/lod';
import {
  loadDataIndex,
  hasCountryL2Sync,
  resolveSubdivisionFileSync
} from '../data/geoIndexClient';
import { L2_MANIFEST } from '../data/l2Manifest';
import { L3_PARTITIONS_BY_KEY } from '../data/l3Manifest';
import type { L3PartitionMeta } from '../data/l3Manifest';
import { ROADS_MANIFEST } from '../data/roadsManifest';
import type { RoadPathData } from '../data/roadsMeta';
import {
  NATIONWIDE_LAYERS,
  COUNTRIES_WITH_AREA_CODES,
  COUNTRIES_WITH_ROADS,
  getNationwideLayerById,
  getRoadLayersForCountry
} from '../data/nationwideLayers';
import { isCapitalSubdivision } from '../data/capitalSubdivisions';
import type { NationwideLayerDef } from '../data/nationwideLayers';
import { EUROPEAN_CROSSING_SIGNS } from '../data/pedestrianCrossing';
import { MAP_W, MAP_H, createProjection, createPathGenerator } from '../map/geo';
import { decodeGeo } from '../map/geoWorkerClient';
import { getDataUrl } from '../data/dataSource';
import {
  getCsvLayerById,
  getCsvLayerValue,
  getCsvSubdivisionValue,
  loadOnDemandCsvLayer,
  isLayersIndexLoaded,
  onLayersIndexLoaded
} from '../layers/csvLayerRegistry';
import {
  parseLayersFromUrl,
  isLayerFillColor,
  getLayerGoto,
  checkAnyLayerHasGoto,
  getActiveLayersList
} from '../layers/layerUrlUtils';
import { loadExtObjectLayerFeatures } from '../layers/extObjectLoader';
import { normalizeRegionKeys } from '../layers/assignableRegions';
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
  type ExtFeatureItem,
  type ExtFeatureRenderItem,
  type RoadBundle,
  type CrossingBadgeBox,
  type HitFeature
} from '../map/types';
import {
  drawWorldCopyLayers,
  drawGlobalTextBadges,
  drawAreaCodeBadges,
  drawCrossingSignBadges,
  drawExtFeatureLabels,
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

export type MapFocusBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type MapFocusTarget = (
  | { kind: 'country'; iso2: string }
  | { kind: 'subdivision'; iso2: string; id: string | number }
  | {
      kind: 'municipality';
      iso2?: string;
      code?: string;
      parentName?: string;
      parentCode?: string;
    }
  | { kind: 'road'; bbox: [number, number, number, number] }
  | { kind: 'bbox'; boxes: MapFocusBox[] }
  | { kind: 'coordinates'; lat: number; lon: number; ratio?: number }
) & { force?: boolean };

export type MapSelectOptions = { focus?: boolean };

type RegionalLayerDef = NationwideLayerDef;
const REGIONAL_LAYERS = NATIONWIDE_LAYERS;

function findSubdivisionMatch(
  list: L2SubdivisionPathData[],
  targetId: string | number,
  iso2: string
): L2SubdivisionPathData | undefined {
  const idStr = String(targetId).trim();
  if (!idStr) return undefined;
  const lower = idStr.toLowerCase();
  const upper = idStr.toUpperCase();
  const normalizedTargetKeys = new Set(
    normalizeRegionKeys(idStr, iso2).map((k) => k.toLowerCase())
  );

  return list.find((p) => {
    // 1. Direct equality (case-insensitive) on any attribute
    if (
      String(p.id).toLowerCase() === lower ||
      p.code.toLowerCase() === lower ||
      p.postal.toLowerCase() === lower ||
      p.name.toLowerCase() === lower ||
      p.nameZh.toLowerCase() === lower ||
      p.nameEn.toLowerCase() === lower
    ) {
      return true;
    }

    // 2. Normalized keys match (e.g. 'CA' matches 'US-CA', '47' matches 'JP-47', '01' matches '1')
    const subKeys = [
      ...normalizeRegionKeys(p.code || '', iso2),
      ...normalizeRegionKeys(p.postal || '', iso2),
      ...normalizeRegionKeys(String(p.id), iso2)
    ];
    for (const sk of subKeys) {
      if (normalizedTargetKeys.has(sk.toLowerCase())) {
        return true;
      }
    }

    // 3. Prefix matching: e.g. p.code is 'US-CA', target is 'CA' (or vice-versa)
    if (p.code && p.code.toUpperCase() === `${iso2.toUpperCase()}-${upper}`) return true;
    if (p.postal && upper === `${iso2.toUpperCase()}-${p.postal.toUpperCase()}`) return true;
    if (p.postal && p.postal.toUpperCase() === upper) return true;

    return false;
  });
}

function getDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function getMidpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// ==========================================
// VIEWPORT EXPOSURE & EXPANSION CONFIGURATION
// ==========================================
/**
 * 國家 L2 子區域（州/省/都道府縣）展開之視窗曝光率門檻。
 * 數值越大代表需要 zoom in 放大越靠近才會展開（預設 0.2）。
 */
export const COUNTRY_L2_EXPANSION_THRESHOLD = 0.2;

/**
 * L2 父級展開 L3（市/區/町/村）之視窗曝光率門檻（預設 0.2）。
 */
export const SUBDIVISION_L3_EXPANSION_THRESHOLD = 0.2;

/**
 * 國家 BBox 在螢幕上的最短邊實體像素下限（像素小於此值視為過窄/過遠，不予展開）。
 */
export const COUNTRY_MIN_SCREEN_DIMENSION = 65;

function getBBoxScreenAreaRatio(
  bbox: [number, number, number, number],
  k: number,
  x: number,
  y: number,
  vw: number,
  vh: number
): number {
  let maxArea = 0;
  for (const copy of WORLD_COPIES) {
    const left = x + (bbox[0] + copy * MAP_W) * k;
    const right = x + (bbox[2] + copy * MAP_W) * k;
    const top = y + bbox[1] * k;
    const bottom = y + bbox[3] * k;
    const iw = Math.max(0, Math.min(vw, right) - Math.max(0, left));
    const ih = Math.max(0, Math.min(vh, bottom) - Math.max(0, top));
    maxArea = Math.max(maxArea, iw * ih);
  }
  return maxArea / Math.max(1, vw * vh);
}

interface WorldMapProps {
  activeFilterId: string;
  activeTextFilters?: Set<string>;
  onToggleTextFilter?: (filterId: string) => void;
  activeInternationalImageFilter?: string | null;
  onToggleInternationalImageFilter?: (filterId: string) => void;
  activeRegionalFilters?: Set<string>;
  onToggleRegionalFilter?: (filterId: string) => void;
  onVisibleRegionalFiltersChange?: (filters: NationwideLayerDef[]) => void;
  isFilterExpanded?: boolean;
  selectedCountry: CountryData | null;
  onSelectCountry: (country: CountryData | null, options?: MapSelectOptions) => void;
  selectedSubdivision?: L2SubdivisionDetail | null;
  onSelectSubdivision?: (sub: L2SubdivisionDetail | null, options?: MapSelectOptions) => void;
  selectedMunicipality?: MunicipalityDetail | null;
  onSelectMunicipality?: (muni: MunicipalityDetail | null, options?: MapSelectOptions) => void;
  hoveredCountry?: CountryData | null;
  setHoveredCountry?: (country: CountryData | null) => void;
  zoomToSubdivisionRef?: React.MutableRefObject<((iso2: string, id: string | number) => void) | null>;
  focusMapRef?: React.MutableRefObject<((target: MapFocusTarget) => void) | null>;
  initialTarget?: string;
  initialFocusTarget?: string;
  showRoads?: boolean;
  showInterstates?: boolean;
  showNumberedRoutes?: boolean;
  selectedRoad?: RoadPathData | null;
  onSelectRoad?: (road: RoadPathData | null, options?: MapSelectOptions) => void;
  detailPanelWidth?: number;
  detailPanelFullWidth?: boolean;
  onOceanClick?: () => void;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  activeFilterId,
  activeTextFilters,
  onToggleTextFilter,
  activeInternationalImageFilter,
  onToggleInternationalImageFilter,
  activeRegionalFilters: activeRegionalFiltersProp,
  onToggleRegionalFilter,
  onVisibleRegionalFiltersChange,
  isFilterExpanded = false,
  selectedCountry,
  onSelectCountry,
  selectedSubdivision,
  onSelectSubdivision,
  selectedMunicipality,
  onSelectMunicipality,
  hoveredCountry: hoveredCountryProp,
  setHoveredCountry: setHoveredCountryProp,
  zoomToSubdivisionRef,
  focusMapRef,
  initialTarget,
  initialFocusTarget,
  showRoads: showRoadsProp,
  showInterstates: showInterstatesProp,
  showNumberedRoutes: showNumberedRoutesProp,
  selectedRoad,
  onSelectRoad,
  detailPanelWidth = 420,
  detailPanelFullWidth = false,
  onOceanClick
}) => {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [loading, setLoading] = useState(true);

  // Level of Detail (LOD) tracking: L1 (Country), L2 (Subdivision), L3 (Local Unit)
  const [lodLevel, setLodLevel] = useState<LODLevel>('L1');

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
  const initialTargetHandledRef = useRef(false);
  const initialFocusTargetHandledRef = useRef(false);
  const [hoveredL2Subdivision, setHoveredL2Subdivision] = useState<L2SubdivisionDetail | null>(null);
  const hoveredL2PathRef = useRef<L2SubdivisionPathData | null>(null);
  const hoveredL3PathRef = useRef<L3SubdivisionPathData | null>(null);

  // L3 regional partition packs
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
  const visibleRegionalFiltersRef = useRef<RegionalLayerDef[]>([]);
  const [internalActiveRegionalFilters] = useState<Set<string>>(new Set());
  const activeRegionalFilters = activeRegionalFiltersProp ?? internalActiveRegionalFilters;
  const activeRegionalFiltersRef = useRef<Set<string>>(activeRegionalFilters);
  const activeLayerHoverTargetsRef = useRef({
    signature: '',
    countries: new Set<string>(),
    expandedCountries: new Set<string>(),
    subdivisions: new Set<string>(),
    countryLevelTargets: new Set<string>()
  });

  // ExtObject features hover state
  const [hoveredExtFeature, setHoveredExtFeature] = useState<ExtFeatureItem | null>(null);
  const hoveredExtFeatureRef = useRef<ExtFeatureItem | null>(null);

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
  const tooltipSizeRef = useRef({ width: 0, height: 0 });
  const animRafId = useRef<number | null>(null);
  const viewUrlSyncTimerRef = useRef<number | null>(null);

  // Real-time synchronization refs for 120fps render loop
  const hoveredCountryRef = useRef<CountryData | null>(hoveredCountry || null);
  const selectedCountryRef = useRef<CountryData | null>(selectedCountry || null);
  const hoveredMunicipalityRef = useRef<MunicipalityDetail | null>(hoveredMunicipality || null);
  const selectedMunicipalityRef = useRef<MunicipalityDetail | null>(selectedMunicipality || null);
  const hoveredL2SubdivisionRef = useRef<L2SubdivisionDetail | null>(hoveredL2Subdivision || null);
  const selectedL2SubdivisionRef = useRef<{ iso2: string; id: number | string } | null>(null);
  const lodLevelRef = useRef<LODLevel>(lodLevel);
  const activeL3ParentRef = useRef<ActiveL3ParentInfo | null>(null);
  const hoveredL3ParentRef = useRef<ActiveL3ParentInfo | null>(null);
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
  const renderCanvasRef = useRef<() => void>(() => {});
  const hoverUpdateRef = useRef<(clientX: number, clientY: number, duringGesture?: boolean) => void>(() => {});
  const hoverExpansionCheckRef = useRef<() => void>(() => {});
  const hoverExpansionSignatureRef = useRef<string | null>(null);
  const hoverSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleHoverSettleRef = useRef<() => void>(() => {});

  // Store container dimensions
  const viewportSize = useRef({ w: 1200, h: 800 });
  const detailPanelWidthRef = useRef(detailPanelWidth);
  const detailPanelFullWidthRef = useRef(detailPanelFullWidth);
  useLayoutEffect(() => {
    detailPanelWidthRef.current = detailPanelWidth;
    detailPanelFullWidthRef.current = detailPanelFullWidth;
  }, [detailPanelWidth, detailPanelFullWidth]);

  const getRemainingVisibleArea = useCallback((forObject = false) => {
    const vh = viewportSize.current.h;
    const vw = viewportSize.current.w;
    const isPanelOpen =
      (forObject ||
        Boolean(
          selectedCountry ||
          selectedCountryRef.current ||
          selectedSubdivision ||
          selectedMunicipality ||
          selectedRoad
        )) &&
      !detailPanelFullWidthRef.current &&
      vw > 768;
    const panelW = isPanelOpen ? Math.min(detailPanelWidthRef.current, vw * 0.6) : 0;
    const remainingW = vw - panelW;
    const centerX = remainingW / 2;
    return { vw, vh, remainingW, centerX, panelW };
  }, [selectedCountry, selectedSubdivision, selectedMunicipality, selectedRoad]);

  // Transform stored in ref for direct 120fps GPU manipulation
  const transformRef = useRef({ k: 1, x: 0, y: 0 });
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStart = useRef({ clientX: 0, clientY: 0, x: 0, y: 0 });

  const isPinching = useRef(false);
  const pinchStart = useRef({ distance: 0, k: 1, x: 0, y: 0, midX: 0, midY: 0, });
  // 追蹤目前畫面上的 pointer（pointerId → clientX/Y）
  const activePointers = useRef(new Map<number, { x: number; y: number }>());

  const lastDragSyncTime = useRef(0);
  const rafId = useRef<number | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const isMouseInsideRef = useRef(false);
  const [hasFinePointer] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
  const hasFinePointerRef = useRef(hasFinePointer);
  const [centerCursorEnabled, setCenterCursorEnabled] = useState(!hasFinePointer);
  const centerCursorEnabledRef = useRef(centerCursorEnabled);
  const isInitializedRef = useRef(false);

  const getHoverClientPoint = useCallback(() => {
    if (hasFinePointerRef.current) return mousePos.current;
    const rect = containerRef.current?.getBoundingClientRect();
    return rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.4 }
      : mousePos.current;
  }, []);

  const canTrackHover = useCallback(
    () => hasFinePointerRef.current ? isMouseInsideRef.current : centerCursorEnabledRef.current,
    []
  );

  const requestRender = useCallback(() => {
    if (renderRafIdRef.current !== null) return;
    renderRafIdRef.current = requestAnimationFrame(() => {
      renderRafIdRef.current = null;
      renderCanvasRef.current();
    });
  }, []);

  const placeTooltip = useCallback((clientX: number, clientY: number, measure = false) => {
    const node = tooltipRef.current;
    if (!node) return;
    if (node.style.display !== 'flex') node.style.display = 'flex';
    if (!hasFinePointerRef.current) {
      node.style.transform = 'none';
      return;
    }

    const margin = 8;
    const gap = 16;
    if (measure || tooltipSizeRef.current.width === 0 || tooltipSizeRef.current.height === 0) {
      tooltipSizeRef.current = { width: node.offsetWidth, height: node.offsetHeight };
    }
    const { width: w, height: h } = tooltipSizeRef.current;
    let left = clientX - w / 2;
    let top = clientY - h - gap;
    if (top < margin) top = clientY + gap;
    const maxLeft = Math.max(margin, window.innerWidth - w - margin);
    const maxTop = Math.max(margin, window.innerHeight - h - margin);
    left = Math.min(Math.max(left, margin), maxLeft);
    top = Math.min(Math.max(top, margin), maxTop);
    node.style.left = '0px';
    node.style.top = '0px';
    node.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }, []);

  const setTooltipNode = useCallback((node: HTMLDivElement | null) => {
    tooltipRef.current = node;
    if (node) {
      const point = getHoverClientPoint();
      placeTooltip(point.x, point.y, true);
    } else {
      tooltipSizeRef.current = { width: 0, height: 0 };
    }
  }, [getHoverClientPoint, placeTooltip]);

  useLayoutEffect(() => {
    if (
      !hoveredCountry &&
      !hoveredL2Subdivision &&
      !hoveredMunicipality &&
      !hoveredRoad &&
      !hoveredExtFeature
    ) {
      return;
    }
    const point = getHoverClientPoint();
    placeTooltip(point.x, point.y, true);
  }, [
    hoveredCountry,
    hoveredL2Subdivision,
    hoveredMunicipality,
    hoveredRoad,
    hoveredExtFeature,
    activeRegionalFilters,
    placeTooltip,
    getHoverClientPoint
  ]);

  const [layersIndexReady, setLayersIndexReady] = useState(() => isLayersIndexLoaded());
  const [csvLoadedRev, setCsvLoadedRev] = useState(0);

  useEffect(() => {
    if (!layersIndexReady) {
      return onLayersIndexLoaded(() => setLayersIndexReady(true));
    }
  }, [layersIndexReady]);

  // Active layer definition
  const activeFilterDef = useMemo<LayerDefinition>(() => {
    void csvLoadedRev;
    void layersIndexReady;
    const csvF = getCsvLayerById(activeFilterId) || (activeFilterId === 'none' ? getCsvLayerById('base') : undefined);
    if (csvF) {
      const defaultCol =
        csvF.meta.defaultColor ||
        csvF.defaultColor ||
        ((csvF.meta as Record<string, unknown>)['default-color'] as string | undefined);

      let legend: LegendItem[] = [];
      if (csvF.legend && csvF.legend.length > 0) {
        legend = csvF.legend.map((item) => ({ key: item.key, color: item.color, labelZh: item.labelZh }));
      } else if (csvF.id !== 'base' && csvF.data?.rows) {
        const seenColors = new Set<string>();
        for (const row of csvF.data.rows) {
          if (!seenColors.has(row.value)) {
            seenColors.add(row.value);
            legend.push({
              key: row.value,
              labelZh: row.label || row.value,
              color: row.value
            });
          }
        }
      }

      return {
        id: csvF.id,
        category: 'none',
        nameZh: csvF.nameZh,
        descriptionZh: csvF.descriptionZh || '',
        legend,
        getColor: (country: CountryData) => {
          const val = getCsvLayerValue(csvF.id, country.iso2);
          if (val) return val;
          return defaultCol || null;
        }
      };
    }

    return {
      id: 'base',
      category: 'none',
      nameZh: '基礎底圖',
      descriptionZh: '全球陸地基礎底圖輪廓風格',
      legend: [],
      getColor: () => '#38bdf8'
    };
  }, [activeFilterId, layersIndexReady, csvLoadedRev]);
  const activeFilterDefRef = useRef<LayerDefinition>(activeFilterDef);

  // Web Mercator Projection & GeoPath
  const projection = useMemo(() => createProjection(), []);
  const pathGenerator = useMemo(() => createPathGenerator(projection), [projection]);

  const hasActiveGoto = useMemo(() => {
    const list = getActiveLayersList(
      activeFilterId,
      activeTextFilters || new Set<string>(),
      activeInternationalImageFilter ?? null,
      activeRegionalFilters
    );
    return checkAnyLayerHasGoto(list);
  }, [activeFilterId, activeTextFilters, activeInternationalImageFilter, activeRegionalFilters]);

  const syncViewToUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (initialTarget && !initialTargetHandledRef.current) return;

    // Rule 3: If any open layer has @goto, lat/lon/ratio must not be saved
    if (hasActiveGoto) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('lat') || url.searchParams.has('lon') || url.searchParams.has('ratio')) {
        url.searchParams.delete('lat');
        url.searchParams.delete('lon');
        url.searchParams.delete('ratio');
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      }
      return;
    }

    const { k, x, y } = transformRef.current;
    const { vh, remainingW, centerX } = getRemainingVisibleArea(false);
    if (remainingW <= 0 || vh <= 0 || k <= 0) return;

    const mapX = (((centerX - x) / k) % MAP_W + MAP_W) % MAP_W;
    const mapY = (vh / 2 - y) / k;
    const center = projection.invert?.([mapX, mapY]);
    if (!center || !center.every(Number.isFinite)) return;

    const url = new URL(window.location.href);
    url.searchParams.set('lat', center[1].toFixed(5));
    url.searchParams.set('lon', center[0].toFixed(5));
    url.searchParams.set('ratio', k.toFixed(3));
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [projection, initialTarget, getRemainingVisibleArea, hasActiveGoto]);

  const prevHasActiveGotoRef = useRef(hasActiveGoto);
  useEffect(() => {
    if (prevHasActiveGotoRef.current && !hasActiveGoto) {
      syncViewToUrl();
    }
    prevHasActiveGotoRef.current = hasActiveGoto;
  }, [hasActiveGoto, syncViewToUrl]);

  const scheduleViewUrlSync = useCallback(() => {
    if (viewUrlSyncTimerRef.current !== null) window.clearTimeout(viewUrlSyncTimerRef.current);
    viewUrlSyncTimerRef.current = window.setTimeout(() => {
      viewUrlSyncTimerRef.current = null;
      syncViewToUrl();
    }, 250);
  }, [syncViewToUrl]);

  useEffect(() => () => {
    if (viewUrlSyncTimerRef.current !== null) {
      window.clearTimeout(viewUrlSyncTimerRef.current);
      viewUrlSyncTimerRef.current = null;
    }
  }, []);

  const extFeatureRenderItemsRef = useRef<ExtFeatureRenderItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const activeExtLayerIds = Array.from(activeRegionalFilters).filter((id) => {
      const layer = getCsvLayerById(id);
      if (!layer || layer.meta.fgb?.includes('-roads.fgb')) return false;
      return (
        layer.type === 'ExtObject' ||
        layer.id === 'taiwan-power-poles' ||
        !!layer.meta.fgb ||
        layer.meta.targetKeys?.some((k) => k.includes('::'))
      );
    });

    if (activeExtLayerIds.length === 0) {
      extFeatureRenderItemsRef.current = [];
      requestRender();
      return;
    }

    Promise.all(
      activeExtLayerIds.map((id) => loadExtObjectLayerFeatures(id, projection))
    ).then((results) => {
      if (cancelled) return;
      extFeatureRenderItemsRef.current = results.flat();
      requestRender();
    });

    return () => {
      cancelled = true;
    };
  }, [activeRegionalFilters, projection, requestRender, layersIndexReady]);

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
      const countryMeta =
        findCountry(feature.id) ||
        findCountry(feature.properties?.name) ||
        makeUnknownCountry(
          String(feature.id || feature.properties?.id || ''),
          '',
          feature.properties?.name || 'Unknown',
          feature.properties?.name || 'Unknown'
        );
      let centroid: [number, number] = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
      try {
        const c = pathGenerator.centroid(feature);
        if (c && !isNaN(c[0]) && !isNaN(c[1])) {
          centroid = c;
        }
      } catch {
        // fallback
      }

      // Geometric solidity: compares actual polygon land area vs AABB rectangle area to discount ocean expanses
      let solidity = 1.0;
      try {
        const landArea = Math.abs(pathGenerator.area(feature));
        const bboxArea = Math.max(1, (bbox[2] - bbox[0]) * (bbox[3] - bbox[1]));
        if (landArea > 0 && Number.isFinite(landArea)) {
          solidity = Math.min(1.0, Math.max(0.02, landArea / bboxArea));
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
        centroid,
        solidity
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

  const isCountryRoadClassActive = useCallback(
    (iso2: string, roadClass: 'Interstate' | 'Federal'): boolean => {
      const upper = (iso2 || '').toUpperCase();
      const set = activeRegionalFiltersRef.current;
      if (!set) return false;

      for (const id of set) {
        if (upper === 'US') {
          if (roadClass === 'Interstate' && (id === 'us-interstates' || id === 'roads-highways')) return true;
          if (
            roadClass === 'Federal' &&
            (id === 'us-numbered-highways' || id === 'us-highways' || id === 'us-numbered-routes' || id === 'roads-numbered')
          ) {
            return true;
          }
        }

        const csvLayer = getCsvLayerById(id);
        if (csvLayer?.meta.fgb?.includes(`${upper}-roads.fgb`)) {
          if (id.includes('interstate')) {
            if (roadClass === 'Interstate') return true;
          } else if (id.includes('highway') || id.includes('route')) {
            if (roadClass === 'Federal') return true;
          } else {
            return true;
          }
        }

        const def = getNationwideLayerById(id);
        if (!def || def.layerType !== 'roads' || def.roadClass !== roadClass) continue;
        const owner = (def.countryIso2 || def.targetIso2 || '').toUpperCase();
        if (owner === upper) return true;
      }

      if (upper === 'US') {
        if (
          roadClass === 'Interstate' &&
          (set.has('us-interstates') || set.has('roads-highways') || (showRoadsRef.current && showInterstatesRef.current))
        ) {
          return true;
        }
        if (
          roadClass === 'Federal' &&
          (set.has('us-numbered-highways') ||
            set.has('us-highways') ||
            set.has('us-numbered-routes') ||
            set.has('roads-numbered') ||
            (showRoadsRef.current && showNumberedRoutesRef.current))
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
        if (
          id === 'us-interstates' ||
          id === 'us-numbered-highways' ||
          id === 'us-highways' ||
          id === 'us-numbered-routes' ||
          id === 'roads-highways' ||
          id === 'roads-numbered'
        ) {
          return true;
        }
        const csvLayer = getCsvLayerById(id);
        if (csvLayer?.meta.fgb?.includes('-roads.fgb')) return true;
        const def = getNationwideLayerById(id);
        if (def?.layerType === 'roads') return true;
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

  // Keep nationwide filter availability tied to its target bbox, independently of the hovered LOD.
  const syncRegionalFiltersViewport = useCallback(
    (k: number, x: number, y: number, vw: number, vh: number) => {
      const nextVisible: RegionalLayerDef[] = [];

      for (let i = 0; i < REGIONAL_LAYERS.length; i++) {
        const filter = REGIONAL_LAYERS[i];
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
          const roadFilters = getRoadLayersForCountry(iso2);
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
    (k: number, x: number, y: number, vw: number, vh: number) => {
      syncRoadsViewport(k, x, y, vw, vh, isAnyRoadActive());
      syncRegionalFiltersViewport(k, x, y, vw, vh);
      scheduleViewUrlSync();
    },
    [syncRoadsViewport, syncRegionalFiltersViewport, isAnyRoadActive, scheduleViewUrlSync]
  );

  // ==========================================
  // UNIFIED CANVAS RENDER LOOP (GPU Accelerated)
  // ==========================================
  const getBBoxScreenRatio = useCallback((bbox: [number, number, number, number]) => {
    const { k, x, y } = transformRef.current;
    const { w, h } = viewportSize.current;
    return getBBoxScreenAreaRatio(bbox, k, x, y, w, h);
  }, []);

  /**
   * Evaluates whether a country is zoomed in enough to expand its L2 subdivisions.
   * Uses zero-hardcoded geometric solidity (land area / bbox area) to discount ocean voids
   * (e.g. US with Alaska/Hawaii, JP with Okinawa) and enforces a minimum physical pixel dimension.
   */
  const isCountryExpandedByExposure = useCallback(
    (iso2: string, countryBox: [number, number, number, number]) => {
      const baseRatio = getBBoxScreenRatio(countryBox);
      if (baseRatio <= 0.01) return false;

      const { k } = transformRef.current;
      const boxW = (countryBox[2] - countryBox[0]) * k;
      const boxH = (countryBox[3] - countryBox[1]) * k;
      // If the country's narrowest axis is physically too thin on the screen, do not expand yet
      if (Math.min(boxW, boxH) < COUNTRY_MIN_SCREEN_DIMENSION) return false;

      // Geometric solidity correction factor:
      // Compares actual polygon land area vs AABB rectangle area to discount ocean expanses
      // (e.g. US with Alaska/Hawaii ~20% solidity, JP with Okinawa ~17.5% solidity).
      const solidity = countryPathMap.get(iso2)?.solidity ?? 0.6;
      const correctionFactor = Math.sqrt(Math.max(0.12, Math.min(1.0, solidity)));
      const effectiveRatio = baseRatio * correctionFactor;

      return effectiveRatio > COUNTRY_L2_EXPANSION_THRESHOLD;
    },
    [getBBoxScreenRatio, countryPathMap]
  );

  const getActiveLayerHoverTargets = useCallback(() => {
    const activeFilters = Array.from(activeRegionalFiltersRef.current)
      .map((id) => getCsvLayerById(id))
      .filter((filter): filter is NonNullable<typeof filter> =>
        !!filter &&
        filter.rangeKind === 'Nationwide' &&
        !filter.fgb?.includes('-roads.fgb') &&
        filter.id !== 'taiwan-power-poles'
      );
    const areaCodeCountries = COUNTRIES_WITH_AREA_CODES.filter((iso2) =>
      activeRegionalFiltersRef.current.has(`area-codes-${iso2}`) ||
      activeRegionalFiltersRef.current.has(`${iso2.toLowerCase()}-area-codes`) ||
      activeRegionalFiltersRef.current.has(`${iso2.toLowerCase()}-ddd-codes`)
    );
    const hasCapitalLayer = activeRegionalFiltersRef.current.has('nationwide-capital');
    const signature = activeFilters
      .map((filter) => `${filter.id}:${filter.loaded}:${filter.targetIso2s
        .map((iso2) => `${iso2}:${l2PathsByCountryRef.current[iso2]?.length || 0}`)
        .join(',')}`)
      .concat([
        areaCodeCountries.length
          ? `area-codes:${areaCodeCountries
              .map((iso2) => `${iso2}:${l2PathsByCountryRef.current[iso2]?.length || 0}`)
              .join(',')}`
          : '',
        hasCapitalLayer
          ? `nationwide-capital:${NATIONWIDE_LAYERS.find((layer: NationwideLayerDef) => layer.id === 'nationwide-capital')?.targetIso2s
              ?.map((iso2: string) => `${iso2}:${l2PathsByCountryRef.current[iso2]?.length || 0}`)
              .join(',') || ''}`
          : ''
      ].filter(Boolean))
      .join('|');
    const cached = activeLayerHoverTargetsRef.current;
    if (cached.signature === signature) return cached;

    const countries = new Set<string>();
    const expandedCountries = new Set<string>();
    const subdivisions = new Set<string>();
    const countryLevelTargets = new Set<string>();

    if (areaCodeCountries.length) {
      for (const iso2 of areaCodeCountries) {
        countries.add(iso2);
        const subs = l2PathsByCountryRef.current[iso2];
        if (!subs?.length) continue;
        expandedCountries.add(iso2);
        for (const sub of subs) {
          subdivisions.add(`${iso2}:${String(sub.id)}`);
          if (sub.code) subdivisions.add(`${iso2}:${String(sub.code)}`);
        }
      }
    }
    if (hasCapitalLayer) {
      for (const iso2 of NATIONWIDE_LAYERS.find((layer: NationwideLayerDef) => layer.id === 'nationwide-capital')?.targetIso2s || []) {
        countries.add(iso2);
        const subs = l2PathsByCountryRef.current[iso2];
        if (!subs?.length) continue;
        expandedCountries.add(iso2);
        for (const sub of subs) {
          if (isCapitalSubdivision(iso2, sub)) {
            subdivisions.add(`${iso2}:${String(sub.id)}`);
            if (sub.code) subdivisions.add(`${iso2}:${String(sub.code)}`);
          }
        }
      }
    }
    for (const filter of activeFilters) {
      for (const iso2 of filter.targetIso2s) {
        countries.add(iso2);
        const subs = l2PathsByCountryRef.current[iso2];
        const hasSubTargetsInKeys =
          filter.meta.targetKeys?.some((k) => k.startsWith(`${iso2}::`)) ?? false;

        let hasSubTargetsInRows = false;
        if (filter.loaded && subs) {
          for (const sub of subs) {
            if (getCsvSubdivisionValue(filter.id, sub) !== null) {
              subdivisions.add(`${iso2}:${String(sub.id)}`);
              if (sub.code) subdivisions.add(`${iso2}:${String(sub.code)}`);
              hasSubTargetsInRows = true;
            }
          }
        }

        const targetsSubdivisions = hasSubTargetsInRows || hasSubTargetsInKeys;
        if (targetsSubdivisions) {
          expandedCountries.add(iso2);
        } else {
          // Layer targets iso2 strictly at country level (XX). Enforce "Layer 最重要": no child sub-regions XX::YY
          const hasCountryTarget =
            filter.meta.targetKeys?.includes(iso2) ||
            filter.data?.valueMap.has(iso2.toUpperCase()) ||
            filter.data?.rowMap.has(iso2.toUpperCase()) ||
            filter.targetIso2s.includes(iso2);
          if (hasCountryTarget) {
            countryLevelTargets.add(iso2);
          }
        }
      }
    }

    activeLayerHoverTargetsRef.current = { signature, countries, expandedCountries, subdivisions, countryLevelTargets };
    return activeLayerHoverTargetsRef.current;
  }, []);

  const getHoverExpansionSignature = useCallback(() => {
    const country = hoveredCountryRef.current;
    const sub = hoveredL2SubdivisionRef.current;
    const hoveredIso2 = country?.iso2 || sub?.iso2;
    const countryBox = hoveredIso2 && countryBBoxesRef.current[hoveredIso2];
    const { countryLevelTargets, subdivisions } = getActiveLayerHoverTargets();
    const isCountryL1Pinned = !!hoveredIso2 && countryLevelTargets.has(hoveredIso2);
    const countryExpanded = !isCountryL1Pinned && !!countryBox && !!hoveredIso2 && isCountryExpandedByExposure(hoveredIso2, countryBox);
    const isSubTarget = !!sub && (
      subdivisions.has(`${sub.iso2}:${String(sub.id)}`) ||
      (!!sub.code && subdivisions.has(`${sub.iso2}:${String(sub.code)}`))
    );
    const subPath = !isSubTarget && sub && l2PathsByCountryRef.current[sub.iso2]?.find(
      (item) => String(item.id) === String(sub.id)
    );
    const l3Expanded = !isSubTarget && !!subPath && getBBoxScreenRatio(subPath.bbox) > SUBDIVISION_L3_EXPANSION_THRESHOLD;
    return `${hoveredIso2 || ''}:${countryExpanded}|${sub?.iso2 || ''}:${sub?.id || ''}:${l3Expanded}`;
  }, [getBBoxScreenRatio, isCountryExpandedByExposure, getActiveLayerHoverTargets]);

  const getExpandedL2Countries = useCallback(() => {
    const { expandedCountries, countryLevelTargets, subdivisions } = getActiveLayerHoverTargets();
    const expanded = new Set<string>();
    [
      selectedL2SubdivisionRef.current?.iso2,
      selectedMunicipalityRef.current?.iso2,
      activeL3ParentRef.current?.iso2,
      hoveredL3ParentRef.current?.iso2
    ].forEach((iso2) => iso2 && expanded.add(iso2));

    if (selectedCountryRef.current?.iso2 && !countryLevelTargets.has(selectedCountryRef.current.iso2)) {
      expanded.add(selectedCountryRef.current.iso2);
    }

    for (const iso2 of expandedCountries) expanded.add(iso2);

    const hoveredL2 = hoveredL2SubdivisionRef.current;
    const hoveredIso2 = hoveredCountryRef.current?.iso2;
    const l2HoveredIso2 = hoveredL2?.iso2;
    const countryBoxIso2 = hoveredIso2 || l2HoveredIso2;
    const countryBox = countryBoxIso2 && countryBBoxesRef.current[countryBoxIso2];

    // Exposure-based expansion only for countries NOT pinned to country level (XX) by active layers
    if (
      hoveredIso2 &&
      countryBox &&
      !countryLevelTargets.has(hoveredIso2) &&
      isCountryExpandedByExposure(hoveredIso2, countryBox)
    ) {
      expanded.add(hoveredIso2);
    }
    if (
      l2HoveredIso2 &&
      countryBox &&
      !countryLevelTargets.has(l2HoveredIso2) &&
      isCountryExpandedByExposure(l2HoveredIso2, countryBox)
    ) {
      expanded.add(l2HoveredIso2);
    }

    if (hoveredL2) {
      const isSubTarget =
        subdivisions.has(`${hoveredL2.iso2}:${String(hoveredL2.id)}`) ||
        (!!hoveredL2.code && subdivisions.has(`${hoveredL2.iso2}:${String(hoveredL2.code)}`));
      if (!isSubTarget) {
        const sub = l2PathsByCountryRef.current[hoveredL2.iso2]?.find(
          (item) => String(item.id) === String(hoveredL2.id)
        );
        if (sub && getBBoxScreenRatio(sub.bbox) > SUBDIVISION_L3_EXPANSION_THRESHOLD) {
          expanded.add(hoveredL2.iso2);
        }
      }
    }
    return expanded;
  }, [getBBoxScreenRatio, isCountryExpandedByExposure, getActiveLayerHoverTargets]);

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

    const layerHoverTargets = getActiveLayerHoverTargets();
    const expandedL2Countries = getExpandedL2Countries();
    const hasL3RegionMode = !!activeL3ParentRef.current || !!hoveredL3ParentRef.current;
    const rc: RenderContext = {
      ctx,
      k,
      x,
      y,
      vw,
      vh,
      dpr,
      visibleCopies,
      isL2RegionMode: expandedL2Countries.size > 0,
      hasL3RegionMode,
      expandedL2Countries,
      layerHoveredCountries: layerHoverTargets.countries,
      layerHoveredL2Subdivisions: layerHoverTargets.subdivisions,
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
      hoveredL3Parent: hoveredL3ParentRef.current,
      getL3SubdivisionsForParent,
      extFeatureRenderItems: extFeatureRenderItemsRef.current,
      hoveredExtFeature: hoveredExtFeatureRef.current,
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
      crossingImages: crossingImagesRef.current,
      requestRender
    };

    drawWorldCopyLayers(rc);
    drawGlobalTextBadges(rc);
    drawAreaCodeBadges(rc);
    renderedCrossingBadgesRef.current = drawCrossingSignBadges(rc);
    drawExtFeatureLabels(rc);
  }, [
    countryPathData,
    countryPathMap,
    l1WorldBordersPath,
    getL3SubdivisionsForParent,
    isAnyRoadActive,
    isCountryRoadClassActive,
    getActiveLayerHoverTargets,
    getExpandedL2Countries,
    requestRender
  ]);

  useLayoutEffect(() => {
    renderCanvasRef.current = renderCanvas;
  });

  useEffect(
    () => () => {
      if (hoverSettleTimerRef.current) clearTimeout(hoverSettleTimerRef.current);
    },
    []
  );

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
        renderCanvasRef.current();
        if (canTrackHover()) hoverExpansionCheckRef.current();

        if (progress < 1) {
          animRafId.current = requestAnimationFrame(step);
        } else {
          animRafId.current = null;
          renderCanvasRef.current();
          requestRender();
          if (canTrackHover()) {
            const point = getHoverClientPoint();
            hoverUpdateRef.current(point.x, point.y);
          }
          if (onComplete) onComplete();
        }
      };

      animRafId.current = requestAnimationFrame(step);
    },
    [canTrackHover, getHoverClientPoint, requestRender]
  );

  // Helper to fetch an individual L3 regional partition pack (decoded in background worker)
  const fetchL3Pack = useCallback(
    async (filePath: string) => {
      const normalizedPath = filePath.replace(/^\/?data\/l3\//, 'data/').replace(/^\/+/, '');
      if (
        loadedL3PacksRef.current.has(normalizedPath) ||
        loadedL3PacksRef.current.has(filePath) ||
        inFlightL3PacksRef.current.has(normalizedPath) ||
        inFlightL3PacksRef.current.has(filePath)
      ) {
        return;
      }
      inFlightL3PacksRef.current.add(normalizedPath);
      inFlightL3PacksRef.current.add(filePath);

      try {
        const { features: decoded } = await decodeGeo(getDataUrl(normalizedPath), 'l3');
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
        loadedL3PacksRef.current.add(normalizedPath);
        requestRender();
      } catch (err) {
        console.warn(`[L3] Failed to load pack ${normalizedPath}:`, err);
      } finally {
        inFlightL3PacksRef.current.delete(filePath);
        inFlightL3PacksRef.current.delete(normalizedPath);
      }
    },
    [requestRender]
  );

  // Helper to load L3 pack on-demand for a given L2 subdivision
  const loadL3PackForSubdivision = useCallback(
    (iso2: string, code?: string, name?: string, id?: string | number) => {
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

      let partitionFile: string | undefined = partition?.file;
      if (!partitionFile) {
        const candidateKeys = [code, id !== undefined ? String(id) : '', name].filter(Boolean) as string[];
        for (const cand of candidateKeys) {
          const resolved = resolveSubdivisionFileSync(normIso2, cand);
          if (resolved) {
            partitionFile = resolved;
            break;
          }
        }
      }

      if (partitionFile) {
        partitionFile = partitionFile.replace(/^\/?data\/l3\//, 'data/').replace(/^\/+/, '');
      }

      if (
        partitionFile &&
        !loadedL3PacksRef.current.has(partitionFile) &&
        !inFlightL3PacksRef.current.has(partitionFile)
      ) {
        fetchL3Pack(partitionFile);
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
        activeInternationalImageFilter: activeInternationalImageFilterRef.current,
        activeRegionalFilters: activeRegionalFiltersRef.current,
        renderedCrossingBadges: renderedCrossingBadgesRef.current,
        countryPathData,
        countryPathMap,
        preferredCountryPath: countryPathMap.get(hoveredCountryRef.current?.iso2 || '') || null,
        isAnyRoadActive,
        isCountryAnyRoadActive,
        isCountryRoadClassActive,
        visibleRoadCopies: visibleRoadCopiesRef.current,
        visibleRoadIso2s: visibleRoadIso2sRef.current,
        loadedRoads: loadedRoadsRef.current,
        activeL3Parent: activeL3ParentRef.current,
        hoveredL3Parent: hoveredL3ParentRef.current,
        getL3SubdivisionsForParent,
        extFeatureRenderItems: extFeatureRenderItemsRef.current,
        countryBBoxes: countryBBoxesRef.current,
        l2ByCountry: l2PathsByCountryRef.current,
        l2DissolvedByCountry: l2CountryDissolvedPathsRef.current,
        expandedL2Countries: getExpandedL2Countries(),
        preferredL2Path: hoveredL2PathRef.current,
        preferredL3Path: hoveredL3PathRef.current
      });
    },
    [
      countryPathData,
      countryPathMap,
      getExpandedL2Countries,
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
      if (target?.closest('.map-controls, .filter-legend-card, .map-tooltip')) {
        return;
      }

      const hit = getFeatureAtPoint(e.clientX, e.clientY);

      if (hit && hit.type === 'road') {
        if (onSelectRoad) onSelectRoad(hit.data);
        onSelectCountry(null);
        if (onSelectSubdivision) onSelectSubdivision(null);
        if (onSelectMunicipality) onSelectMunicipality(null);
        return;
      } else {
        if (onSelectRoad) onSelectRoad(null);
      }

      if (!hit) {
        selectedL2SubdivisionRef.current = null;
        activeL3ParentRef.current = null;
        hoveredL3ParentRef.current = null;
        if (onSelectSubdivision) onSelectSubdivision(null);
        onSelectCountry(null);
        if (onSelectMunicipality) onSelectMunicipality(null);
        requestRender();
        onOceanClick?.();
        return;
      }

      if (hit.type === 'municipality') {
        const m = hit.data;
        if (m.iso2) {
          loadL3PackForSubdivision(m.iso2, m.parentCode, m.parentName);
          const parent = l2PathsByCountryRef.current[m.iso2]?.find(
            (item) => item.code === m.parentCode || item.name === m.parentName || item.nameEn === m.parentName
          );
          if (parent) {
            activeL3ParentRef.current = {
              iso2: parent.iso2,
              id: parent.id,
              name: parent.name,
              code: parent.code,
              bbox: parent.bbox,
              path2D: parent.path2D
            };
          }
        }
        if (onSelectMunicipality) {
          onSelectMunicipality(m);
          onSelectCountry(null);
          if (onSelectSubdivision) onSelectSubdivision(null);
        }
      } else if (hit.type === 'l2Subdivision') {
        const sub = hit.data;
        const selObj = { iso2: sub.iso2, id: sub.id };
        selectedL2SubdivisionRef.current = selObj;
        const activeHoverTargets = getActiveLayerHoverTargets();
        const isSubTargetOfActiveLayer =
          activeHoverTargets.subdivisions.has(`${sub.iso2}:${String(sub.id)}`) ||
          (!!sub.code && activeHoverTargets.subdivisions.has(`${sub.iso2}:${String(sub.code)}`));
        if (!isSubTargetOfActiveLayer) {
          loadL3PackForSubdivision(sub.iso2, sub.code, sub.name, sub.id);
          activeL3ParentRef.current = {
            iso2: sub.iso2,
            id: sub.id,
            name: sub.name,
            code: sub.code,
            bbox: sub.bbox,
            path2D: sub.path2D
          };
        } else {
          activeL3ParentRef.current = null;
        }
        if (onSelectSubdivision) {
          onSelectSubdivision(toL2Detail(sub));
        }
        if (onSelectCountry) onSelectCountry(null);
        if (onSelectMunicipality) onSelectMunicipality(null);
      } else if (hit.type === 'country') {
        const c = hit.data;
        selectedL2SubdivisionRef.current = null;
        activeL3ParentRef.current = null;
        hoveredL3ParentRef.current = null;
        if (onSelectSubdivision) onSelectSubdivision(null);
        if (c.countryMeta) {
          onSelectCountry(c.countryMeta);
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
      onSelectMunicipality,
      onOceanClick,
      getFeatureAtPoint,
      loadL3PackForSubdivision,
      requestRender,
      getActiveLayerHoverTargets
    ]
  );

  const clearHover = useCallback((): boolean => {
    let hadHover = false;
    if (hoveredL2PathRef.current || hoveredL3PathRef.current) {
      hoveredL2PathRef.current = null;
      hoveredL3PathRef.current = null;
      hadHover = true;
    }
    if (hoveredL3ParentRef.current) {
      hoveredL3ParentRef.current = null;
      hadHover = true;
    }
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
    if (hoveredExtFeatureRef.current) {
      hoveredExtFeatureRef.current = null;
      setHoveredExtFeature(null);
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
      extFeature?: ExtFeatureItem | null;
    }) => {
      const road = next.road ?? null;
      const country = next.country ?? null;
      const municipality = next.municipality ?? null;
      const l2 = next.l2 ?? null;
      const extFeature = next.extFeature ?? null;

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
      if (hoveredExtFeatureRef.current !== extFeature) {
        hoveredExtFeatureRef.current = extFeature;
        setHoveredExtFeature(extFeature);
      }
      requestRender();
    },
    [setHoveredCountry, requestRender]
  );

  // Pointer Pan Handlers（滑鼠 + 觸控共用）
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const target = e.target as Element | null;
    if (target?.closest('.map-controls, .regional-controls-section, .filter-legend-card, .map-tooltip')) {
      return;
    }

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    if (animRafId.current) {
      cancelAnimationFrame(animRafId.current);
      animRafId.current = null;
    }

    const pts = [...activePointers.current.values()];

    if (pts.length >= 2) {
      // 進入 / 重設 pinch
      isPinching.current = true;
      isDragging.current = false; // 取消單指拖曳
      hasDragged.current = true;  // 避免 pinch 結束後觸發 click

      const [p0, p1] = pts;
      const mid = getMidpoint(p0, p1);
      pinchStart.current = {
        distance: getDistance(p0, p1),
        k: transformRef.current.k,
        x: transformRef.current.x,
        y: transformRef.current.y,
        midX: mid.x,
        midY: mid.y,
      };
      return;
    }

    // 單指 → pan
    isPinching.current = false;
    isDragging.current = true;
    hasDragged.current = false;
    dragStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      x: transformRef.current.x,
      y: transformRef.current.y,
    };
  };

  const updateHoverAtPoint = useCallback(
    (clientX: number, clientY: number, duringGesture = false) => {
      if (hasFinePointerRef.current && !isMouseInsideRef.current) return;
      if (!hasFinePointerRef.current && !centerCursorEnabledRef.current) return;
      if (hasFinePointerRef.current && isDragging.current) return;
      if (isDragging.current && !duringGesture) return;

      if (!hasFinePointerRef.current) {
        const point = getHoverClientPoint();
        clientX = point.x;
        clientY = point.y;
      }

      const hit = getFeatureAtPoint(clientX, clientY);

      if (containerRef.current) {
        containerRef.current.style.cursor = hit ? 'pointer' : 'grab';
      }

      if (!hit) {
        if (clearHover()) {
          requestRender();
        }
        hoverExpansionSignatureRef.current = getHoverExpansionSignature();
        return;
      }

      if (hit.type === 'activeParentInterior') {
        let changed = false;
        if (hoveredMunicipalityRef.current) {
          hoveredMunicipalityRef.current = null;
          setHoveredMunicipality(null);
          changed = true;
        }
        if (hoveredExtFeatureRef.current) {
          hoveredExtFeatureRef.current = null;
          setHoveredExtFeature(null);
          changed = true;
        }
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
        if (changed) requestRender();
        hoverExpansionSignatureRef.current = getHoverExpansionSignature();
        return;
      }

      if (hit.type === 'extFeature') {
        const ef = hit.data;
        if (
          hoveredExtFeatureRef.current?.id !== ef.id ||
          hoveredExtFeatureRef.current?.layerId !== ef.layerId
        ) {
          applyHover({ extFeature: ef });
        }
      } else if (hit.type === 'road') {
        const road = hit.data;
        if (hoveredRoadRef.current?.name !== road.name) {
          applyHover({ road });
        }
      } else if (hit.type === 'municipality') {
        const m = hit.data;
        hoveredL3PathRef.current = hit.path || null;
        hoveredL2PathRef.current = null;
        if (hoveredMunicipalityRef.current?.code !== m.code || hoveredMunicipalityRef.current?.iso2 !== m.iso2) {
          applyHover({ municipality: m });
        }
      } else if (hit.type === 'l2Subdivision') {
        const sub = hit.data;
        hoveredL2PathRef.current = sub;
        hoveredL3PathRef.current = null;
        const { k, x, y } = transformRef.current;
        const { w, h } = viewportSize.current;
        const visibleArea = Math.max(1, w * h);
        let visibleBBoxArea = 0;
        for (const copy of WORLD_COPIES) {
          const left = x + (sub.bbox[0] + copy * MAP_W) * k;
          const right = x + (sub.bbox[2] + copy * MAP_W) * k;
          const top = y + sub.bbox[1] * k;
          const bottom = y + sub.bbox[3] * k;
          visibleBBoxArea = Math.max(visibleBBoxArea,
            Math.max(0, Math.min(w, right) - Math.max(0, left)) *
            Math.max(0, Math.min(h, bottom) - Math.max(0, top)));
        }
        const activeHoverTargets = getActiveLayerHoverTargets();
        const isSubTargetOfActiveLayer =
          activeHoverTargets.subdivisions.has(`${sub.iso2}:${String(sub.id)}`) ||
          (!!sub.code && activeHoverTargets.subdivisions.has(`${sub.iso2}:${String(sub.code)}`));
        const isPinnedSub = selectedL2SubdivisionRef.current?.iso2 === sub.iso2 &&
          String(selectedL2SubdivisionRef.current.id) === String(sub.id);
        if (!isSubTargetOfActiveLayer && (visibleBBoxArea / visibleArea > SUBDIVISION_L3_EXPANSION_THRESHOLD || isPinnedSub)) {
          hoveredL3ParentRef.current = {
            iso2: sub.iso2,
            id: sub.id,
            name: sub.name,
            code: sub.code,
            bbox: sub.bbox,
            path2D: sub.path2D
          };
          loadL3PackForSubdivision(sub.iso2, sub.code, sub.name, sub.id);
        } else {
          hoveredL3ParentRef.current = null;
        }
        if (
          hoveredL2SubdivisionRef.current?.iso2 !== sub.iso2 ||
          hoveredL2SubdivisionRef.current?.id !== sub.id
        ) {
          applyHover({ l2: toL2Detail(sub) });
        }
      } else if (hit.type === 'country') {
        const c = hit.data;
        const cMeta =
          c.countryMeta ||
          makeUnknownCountry(String(c.id), '', c.name, c.name, ['此地區目前尚無 Google 街景官方車載覆蓋。']);
        hoveredL3ParentRef.current = null;
        hoveredL2PathRef.current = null;
        hoveredL3PathRef.current = null;
        if (hoveredCountryRef.current?.id !== cMeta.id) {
          applyHover({ country: cMeta });
        }
      }

      placeTooltip(clientX, clientY);
      hoverExpansionSignatureRef.current = getHoverExpansionSignature();
    },
    [getFeatureAtPoint, clearHover, applyHover, requestRender, placeTooltip, loadL3PackForSubdivision, getHoverExpansionSignature, getHoverClientPoint, getActiveLayerHoverTargets]
  );

  useEffect(() => {
    hoverUpdateRef.current = updateHoverAtPoint;
    hoverExpansionCheckRef.current = () => {
      const signature = getHoverExpansionSignature();
      if (signature === hoverExpansionSignatureRef.current) return;
      hoverExpansionSignatureRef.current = signature;
      const point = getHoverClientPoint();
      hoverUpdateRef.current(point.x, point.y);
    };
    scheduleHoverSettleRef.current = () => {
      if (hoverSettleTimerRef.current) clearTimeout(hoverSettleTimerRef.current);
      hoverSettleTimerRef.current = setTimeout(() => {
        hoverSettleTimerRef.current = null;
        if (canTrackHover()) {
          const point = getHoverClientPoint();
          hoverUpdateRef.current(point.x, point.y);
        }
      }, 100);
    };
  }, [updateHoverAtPoint, getHoverExpansionSignature, getHoverClientPoint, canTrackHover]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    isMouseInsideRef.current = true;
    mousePos.current = { x: e.clientX, y: e.clientY };

    const pts = [...activePointers.current.values()];

    // —— 雙指縮放 ——
    if (pts.length >= 2 && isPinching.current) {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();

      const [p0, p1] = pts;
      const dist = getDistance(p0, p1);
      if (pinchStart.current.distance < 1e-6) return;

      const scale = dist / pinchStart.current.distance;
      const vh = viewportSize.current.h;
      const kMin = vh / MAP_H;
      const newK = Math.min(
        Math.max(pinchStart.current.k * scale, kMin),
        MAX_ZOOM_K
      );

      // 以「開始 pinch 時的兩指中點」為錨（和 wheel 的 mx/my 相同概念）
      const centerCursorZoom = !hasFinePointerRef.current && centerCursorEnabledRef.current;
      const currentMid = getMidpoint(p0, p1);
      const mx = centerCursorZoom ? rect.width / 2 : pinchStart.current.midX - rect.left;
      const my = centerCursorZoom ? rect.height * 0.4 : pinchStart.current.midY - rect.top;
      const { k: startK, x: startX, y: startY } = pinchStart.current;
      const ratio = newK / startK;

      const panX = centerCursorZoom ? currentMid.x - pinchStart.current.midX : 0;
      const panY = centerCursorZoom ? currentMid.y - pinchStart.current.midY : 0;
      const newX = mx - (mx - startX) * ratio + panX;
      const newY = my - (my - startY) * ratio + panY;

      transformRef.current.k = newK;
      transformRef.current.x = wrapX(newX, newK);
      transformRef.current.y = clampY(newY, newK, vh);

      const nextLOD = getLODLevel(newK);
      applyLOD(nextLOD);

      const now = e.timeStamp;
      if (now - lastDragSyncTime.current > 200) {
        lastDragSyncTime.current = now;
        syncAllViewports(
          newK,
          transformRef.current.x,
          transformRef.current.y,
          viewportSize.current.w,
          vh
        );
      }

      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          renderCanvasRef.current();
          if (!hasFinePointerRef.current && centerCursorEnabledRef.current) {
            const point = getHoverClientPoint();
            hoverUpdateRef.current(point.x, point.y, true);
            if (canTrackHover()) hoverExpansionCheckRef.current();
          }
          rafId.current = null;
        });
      }
      return;
    }

    // —— 單指 pan ——
    if (isDragging.current && pts.length === 1) {
      const dx = e.clientX - dragStart.current.clientX;
      const dy = e.clientY - dragStart.current.clientY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDragged.current = true;
        if (hasFinePointerRef.current && tooltipRef.current && tooltipRef.current.style.display !== 'none') {
          tooltipRef.current.style.display = 'none';
        }
      }

      const rawX = dragStart.current.x + dx;
      const rawY = dragStart.current.y + dy;

      const k = transformRef.current.k;
      const vh = viewportSize.current.h;

      transformRef.current.x = wrapX(rawX, k);
      transformRef.current.y = clampY(rawY, k, vh);

      const now = e.timeStamp;
      if (now - lastDragSyncTime.current > 200) {
        lastDragSyncTime.current = now;
        syncRegionalFiltersViewport(
          k,
          transformRef.current.x,
          transformRef.current.y,
          viewportSize.current.w,
          vh
        );
      }

      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          renderCanvasRef.current();
          if (!hasFinePointerRef.current && centerCursorEnabledRef.current) {
            const point = getHoverClientPoint();
            hoverUpdateRef.current(point.x, point.y, true);
          }
          rafId.current = null;
        });
      }
      return;
    }

    // —— hover（非拖曳、非 pinch）——
    if (isPinching.current) return;
    const target = e.target as Element | null;
    const isOverControl = !!target?.closest(
      '.map-controls, .regional-controls-section, .filter-legend-card'
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
        const point = getHoverClientPoint();
        updateHoverAtPoint(point.x, point.y);
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { /* ignore */ }

    const remaining = activePointers.current.size;

    if (remaining < 2) {
      isPinching.current = false;
    }

    if (remaining === 0) {
      isDragging.current = false;
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      const { k, x, y } = transformRef.current;
      syncAllViewports(
        k, x, y,
        viewportSize.current.w,
        viewportSize.current.h
      );
      updateHoverAtPoint(mousePos.current.x, mousePos.current.y);
    } else if (remaining === 1) {
      // Rebase the remaining finger at the current transform so it can resume panning.
      const remainingPointer = activePointers.current.values().next().value as
        | { x: number; y: number }
        | undefined;
      isDragging.current = Boolean(remainingPointer);
      hasDragged.current = true;
      if (remainingPointer) {
        dragStart.current = {
          clientX: remainingPointer.x,
          clientY: remainingPointer.y,
          x: transformRef.current.x,
          y: transformRef.current.y
        };
      }
      const { k, x, y } = transformRef.current;
      syncAllViewports(
        k, x, y,
        viewportSize.current.w,
        viewportSize.current.h
      );
    }
  };

  // Keep zoom LOD bookkeeping separate from area-driven map layer visibility.
  const applyLOD = useCallback(
    (nextLOD: LODLevel): boolean => {
      if (nextLOD === lodLevelRef.current) return false;
      setLodLevel(nextLOD);
      lodLevelRef.current = nextLOD;
      return true;
    },
    []
  );

  // Native non-passive wheel listener so preventDefault() actually blocks browser page zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const centerCursorZoom = !hasFinePointerRef.current && centerCursorEnabledRef.current;
      const cursorPoint = centerCursorZoom ? getHoverClientPoint() : { x: e.clientX, y: e.clientY };
      const mx = cursorPoint.x - rect.left;
      const my = cursorPoint.y - rect.top;

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
      mousePos.current = { x: e.clientX, y: e.clientY };
      isMouseInsideRef.current = true;

      const nextLOD = getLODLevel(newK);
      applyLOD(nextLOD);
      syncAllViewports(newK, transformRef.current.x, transformRef.current.y, viewportSize.current.w, vh);
      hoverExpansionCheckRef.current();
      scheduleHoverSettleRef.current();
      requestRender();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [wrapX, clampY, applyLOD, syncAllViewports, requestRender, getHoverClientPoint]);

  const handleZoom = useCallback(
    (direction: 'in' | 'out') => {
      const factor = direction === 'in' ? 1.35 : 0.74;
      const { k, x, y } = transformRef.current;
      const vh = viewportSize.current.h;
      const vw = viewportSize.current.w;
      const kMin = vh / MAP_H;
      const newK = Math.min(Math.max(k * factor, kMin), MAX_ZOOM_K);

      const centerCursorZoom = !hasFinePointerRef.current && centerCursorEnabledRef.current;
      const cursorPoint = centerCursorZoom ? getHoverClientPoint() : null;
      const rect = containerRef.current?.getBoundingClientRect();
      const cx = cursorPoint && rect ? cursorPoint.x - rect.left : vw / 2;
      const cy = cursorPoint && rect ? cursorPoint.y - rect.top : vh / 2;
      const newX = wrapX(cx - (cx - x) * (newK / k), newK);
      const newY = clampY(cy - (cy - y) * (newK / k), newK, vh);

      const nextLOD = getLODLevel(newK);
      applyLOD(nextLOD);
      animateTo(newK, newX, newY, 280, () => {
        syncAllViewports(newK, newX, newY, vw, vh);
      });
    },
    [wrapX, clampY, applyLOD, animateTo, syncAllViewports, getHoverClientPoint]
  );

  const handleZoomIn = useCallback(() => handleZoom('in'), [handleZoom]);
  const handleZoomOut = useCallback(() => handleZoom('out'), [handleZoom]);

  const handleResetZoom = useCallback(() => {
    const vh = viewportSize.current.h;
    const vw = viewportSize.current.w;
    const kMin = vh / MAP_H;

    const targetX = wrapX(vw / 2 - (MAP_W / 2) * kMin, kMin);
    const targetY = clampY((vh - MAP_H * kMin) / 2, kMin, vh);

    const targetLOD = getLODLevel(kMin);
    applyLOD(targetLOD);
    animateTo(kMin, targetX, targetY, 320, () => {
      syncAllViewports(kMin, targetX, targetY, vw, vh);
    });
  }, [wrapX, clampY, applyLOD, animateTo, syncAllViewports]);

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
    const { k, x, y } = transformRef.current;
    syncRegionalFiltersViewport(k, x, y, viewportSize.current.w, viewportSize.current.h);
    requestRender();
  }, [selectedCountry, requestRender, syncRegionalFiltersViewport]);

  useEffect(() => {
    if (selectedSubdivision) {
      selectedL2SubdivisionRef.current = { iso2: selectedSubdivision.iso2, id: selectedSubdivision.id };
    } else {
      selectedL2SubdivisionRef.current = null;
    }
    const { k, x, y } = transformRef.current;
    syncRegionalFiltersViewport(k, x, y, viewportSize.current.w, viewportSize.current.h);
    requestRender();
  }, [selectedSubdivision, requestRender, syncRegionalFiltersViewport]);

  useEffect(() => {
    selectedMunicipalityRef.current = selectedMunicipality || null;
    const { k, x, y } = transformRef.current;
    syncRegionalFiltersViewport(k, x, y, viewportSize.current.w, viewportSize.current.h);
    requestRender();
  }, [selectedMunicipality, requestRender, syncRegionalFiltersViewport]);

  useEffect(() => {
    selectedRoadRef.current = selectedRoad || null;
    requestRender();
  }, [selectedRoad, requestRender]);

  useEffect(() => {
    activeFilterDefRef.current = activeFilterDef;
    const csvF = getCsvLayerById(activeFilterId);
    if (csvF && !csvF.loaded) {
      void loadOnDemandCsvLayer(activeFilterId).then(() => {
        setCsvLoadedRev((v) => v + 1);
        requestRender();
      });
    }
    requestRender();
  }, [activeFilterDef, activeFilterId, requestRender]);

  useEffect(() => {
    activeTextFiltersRef.current = activeTextFilters || new Set();
    if (activeTextFilters) {
      for (const id of activeTextFilters) {
        const csvF = getCsvLayerById(id);
        if (csvF && !csvF.loaded) {
          void loadOnDemandCsvLayer(id).then(() => {
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
      const csvF = getCsvLayerById(id);
      if (csvF && !csvF.loaded) {
        void loadOnDemandCsvLayer(id).then(() => {
          requestRender();
        });
      }
    }
    const { k, x, y } = transformRef.current;
    syncRoadsViewport(k, x, y, viewportSize.current.w, viewportSize.current.h, isAnyRoadActive());
    scheduleViewUrlSync();
    requestRender();
  }, [activeRegionalFilters, syncRoadsViewport, isAnyRoadActive, requestRender, scheduleViewUrlSync]);

  // Preload European pedestrian crossing sign images when filter is activated
  useEffect(() => {
    const isCrossingActive =
      activeInternationalImageFilter === 'pedestrian-crossing' ||
      activeInternationalImageFilter === 'eu-pedestrian-crossing' ||
      activeRegionalFilters.has('eu-pedestrian-crossing') ||
      activeRegionalFilters.has('pedestrian-crossing');
    if (!isCrossingActive) return;

    let cancelled = false;

    const preloadImages = async () => {
      const layer = getCsvLayerById('pedestrian-crossing') || getCsvLayerById('eu-pedestrian-crossing');
      if (layer && !layer.loaded) {
        await loadOnDemandCsvLayer(layer.id);
      }
      if (cancelled) return;

      const loadedLayer = getCsvLayerById('pedestrian-crossing') || getCsvLayerById('eu-pedestrian-crossing');
      const entries = loadedLayer?.data?.rows?.length
        ? loadedLayer.data.rows.map((r) => [r.regionId, r.value || r.attributes.image] as [string, string])
        : Object.entries(EUROPEAN_CROSSING_SIGNS).map(([k, v]) => [k, v.imagePath] as [string, string]);

      let hasUnloaded = false;
      for (const [iso2, imagePath] of entries) {
        if (!imagePath) continue;
        if (!crossingImagesRef.current.has(iso2)) {
          const img = new Image();
          img.src = getDataUrl(imagePath);
          img.onload = () => {
            if (!cancelled) requestRender();
          };
          img.onerror = (e) => {
            console.warn(`[CrossingSigns] Failed to load image for ${iso2} from ${img.src}`, e);
          };
          crossingImagesRef.current.set(iso2, img);
          hasUnloaded = true;
        }
      }
      if (!hasUnloaded) {
        requestRender();
      }
    };

    void preloadImages();

    return () => {
      cancelled = true;
    };
  }, [activeInternationalImageFilter, activeRegionalFilters, requestRender]);

  useEffect(() => {
    renderCanvasRef.current();
    requestRender();
    if (countryPathData.length && !hasFinePointerRef.current) {
      requestAnimationFrame(() => {
        const point = getHoverClientPoint();
        hoverUpdateRef.current(point.x, point.y);
      });
    }
  }, [countryPathData, requestRender, getHoverClientPoint]);

  useEffect(() => {
    lodLevelRef.current = lodLevel;
    syncRegionalFiltersViewport(
      transformRef.current.k,
      transformRef.current.x,
      transformRef.current.y,
      viewportSize.current.w,
      viewportSize.current.h
    );
    requestRender();
  }, [lodLevel, requestRender, syncRegionalFiltersViewport]);

  // Synchronize selected subdivision into activeL3ParentRef
  useEffect(() => {
    if (!selectedSubdivision) {
      selectedL2SubdivisionRef.current = null;
      if (!selectedMunicipalityRef.current) {
        activeL3ParentRef.current = null;
        hoveredL3ParentRef.current = null;
        if (canTrackHover()) {
          requestAnimationFrame(() => {
            const point = getHoverClientPoint();
            hoverUpdateRef.current(point.x, point.y);
          });
        }
      }
      requestRender();
      return;
    }
    selectedL2SubdivisionRef.current = { iso2: selectedSubdivision.iso2, id: selectedSubdivision.id };
    const subs = l2PathsByCountryRef.current[selectedSubdivision.iso2];
    const sub = subs?.find((s) => String(s.id) === String(selectedSubdivision.id));
    if (sub) {
      const activeHoverTargets = getActiveLayerHoverTargets();
      const isSubTargetOfActiveLayer =
        activeHoverTargets.subdivisions.has(`${sub.iso2}:${String(sub.id)}`) ||
        (!!sub.code && activeHoverTargets.subdivisions.has(`${sub.iso2}:${String(sub.code)}`));
      if (!isSubTargetOfActiveLayer) {
        loadL3PackForSubdivision(sub.iso2, sub.code, sub.name, sub.id);
        activeL3ParentRef.current = {
          iso2: sub.iso2,
          id: sub.id,
          name: sub.name,
          code: sub.code,
          bbox: sub.bbox,
          path2D: sub.path2D
        };
      } else {
        activeL3ParentRef.current = null;
      }
      requestRender();
    }
  }, [selectedSubdivision, selectedMunicipality, loadL3PackForSubdivision, requestRender, canTrackHover, getHoverClientPoint, getActiveLayerHoverTargets]);

  useEffect(() => {
    showRoadsRef.current = showRoads;
    showInterstatesRef.current = showInterstates;
    showNumberedRoutesRef.current = showNumberedRoutes;
    if (showRoads && tooltipRef.current) {
      tooltipRef.current.style.display = 'none';
    }
    const { k, x, y } = transformRef.current;
    syncRoadsViewport(k, x, y, viewportSize.current.w, viewportSize.current.h, isAnyRoadActive());
    requestRender();
  }, [showRoads, showInterstates, showNumberedRoutes, syncRoadsViewport, isAnyRoadActive, requestRender]);

  // Frame an L2 subdivision. Used by the detail panel for any country that has a deeper level.
  const zoomToSubdivision = useCallback(
    (iso2: string, id: string | number) => {
      const list = l2PathsByCountryRef.current[iso2] || [];
      const target = findSubdivisionMatch(list, id, iso2);
      if (!target) return;

      const [minX, minY, maxX, maxY] = target.bbox;
      const bw = Math.max(maxX - minX, 0.5);
      const bh = Math.max(maxY - minY, 0.5);
      const { vw, vh, remainingW, centerX } = getRemainingVisibleArea(true);
      const kMin = vh / MAP_H;
      const kFit = Math.min((remainingW * 0.7) / bw, (vh * 0.7) / bh);
      const targetK = Math.min(MAX_ZOOM_K, Math.max(kFit, kMin));
      const [cx, cy] = target.centroid;
      const targetX = wrapX(centerX - cx * targetK, targetK);
      const targetY = clampY(vh / 2 - cy * targetK, targetK, vh);

      const targetLOD = getLODLevel(targetK);
      applyLOD(targetLOD);
      selectedL2SubdivisionRef.current = { iso2, id: target.id };

      if (targetLOD === 'L3') {
        loadL3PackForSubdivision(iso2, target.code, target.name, target.id);
        activeL3ParentRef.current = {
          iso2,
          id: target.id,
          name: target.name,
          code: target.code,
          bbox: target.bbox,
          path2D: target.path2D
        };
      }
      animateTo(targetK, targetX, targetY, 380, () => {
        syncAllViewports(targetK, targetX, targetY, vw, vh);
      });
    },
    [wrapX, clampY, animateTo, syncAllViewports, loadL3PackForSubdivision, applyLOD, getRemainingVisibleArea]
  );

  const zoomToSubdivisionRefInternal = useRef(zoomToSubdivision);
  useLayoutEffect(() => {
    zoomToSubdivisionRefInternal.current = zoomToSubdivision;
  }, [zoomToSubdivision]);

  useEffect(() => {
    if (!zoomToSubdivisionRef) return;
    zoomToSubdivisionRef.current = zoomToSubdivision;
  }, [zoomToSubdivisionRef, zoomToSubdivision]);

  const onSelectSubdivisionRef = useRef(onSelectSubdivision);
  useLayoutEffect(() => {
    onSelectSubdivisionRef.current = onSelectSubdivision;
  }, [onSelectSubdivision]);

  const initialTargetRef = useRef(initialTarget);
  const initialFocusTargetRef = useRef(initialFocusTarget);

  // Cancel canvas render animation frame on unmount
  useEffect(() => {
    return () => {
      if (renderRafIdRef.current !== null) {
        cancelAnimationFrame(renderRafIdRef.current);
        renderRafIdRef.current = null;
      }
    };
  }, []);

  // Startup loader: show the map as soon as L1 countries finish, then stream all 91 L2 files in Web Workers
  useEffect(() => {
    let isMounted = true;
    void loadDataIndex();

    const loadL1 = async (): Promise<GeoFeature[]> => {
      try {
        const res = await fetch(getDataUrl('data/COUNTRY.fgb'));
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

      // If initialTarget or initialFocusTarget targets a country, prioritize it at the front of queue
      const rawTarget = initialTargetRef.current || initialFocusTargetRef.current || '';
      const sepIdx = rawTarget.indexOf('::');
      const priorityIso2 = rawTarget
        ? (sepIdx > 0 ? rawTarget.slice(0, sepIdx) : rawTarget).trim().toUpperCase()
        : '';
      if (priorityIso2) {
        const pIdx = queue.findIndex((c) => c.iso2 === priorityIso2);
        if (pIdx > -1) {
          const [pItem] = queue.splice(pIdx, 1);
          queue.unshift(pItem);
        }
      }

      const worker = async () => {
        while (queue.length > 0) {
          if (!isMounted) return;
          const c = queue.shift();
          if (!c) break;
          const iso2 = c.iso2;
          if (!hasCountryL2Sync(iso2)) {
            continue;
          }
          try {
            
            const { features: decoded, dissolvedD } = await decodeGeo(
              getDataUrl(`data/${iso2}.fgb`), 'l2', iso2
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
                d: f.d,
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

            if (initialTargetRef.current && !initialTargetHandledRef.current) {
              const separatorIndex = initialTargetRef.current.indexOf('::');
              if (separatorIndex > 0) {
                const targetIso2 = initialTargetRef.current.slice(0, separatorIndex).trim().toUpperCase();
                const targetId = initialTargetRef.current.slice(separatorIndex + 2).trim();
                if (targetIso2 === iso2 && targetId) {
                  const targetSubdivision = findSubdivisionMatch(paths, targetId, iso2);
                  if (targetSubdivision) {
                    initialTargetHandledRef.current = true;
                    onSelectSubdivisionRef.current?.(toL2Detail(targetSubdivision), { focus: false });
                    zoomToSubdivisionRefInternal.current(iso2, targetSubdivision.id);
                  }
                }
              }
            }

            if (initialFocusTargetRef.current && !initialFocusTargetHandledRef.current) {
              const [targetIso2, targetId] = initialFocusTargetRef.current.split('::').map((part) => part.trim());
              if (targetIso2?.toUpperCase() === iso2 && targetId) {
                const targetSubdivision = findSubdivisionMatch(paths, targetId, iso2);
                if (targetSubdivision) {
                  initialFocusTargetHandledRef.current = true;
                  focusMapRef?.current?.({
                    kind: 'subdivision',
                    iso2,
                    id: targetSubdivision.id,
                    force: true
                  });
                }
              }
            }

            if (
              transformRef.current.k >= 1.8 ||
              getActiveLayerHoverTargets().expandedCountries.has(iso2) ||
              hoveredCountryRef.current?.iso2 === iso2 ||
              selectedCountryRef.current?.iso2 === iso2 ||
              hoveredL2SubdivisionRef.current?.iso2 === iso2 ||
              selectedL2SubdivisionRef.current?.iso2 === iso2
            ) {
              requestRender();
              if (!hasFinePointerRef.current && hoveredCountryRef.current?.iso2 === iso2) {
                requestAnimationFrame(() => {
                  const point = getHoverClientPoint();
                  hoverUpdateRef.current(point.x, point.y);
                });
              }
            }
          } catch (err) {
            console.warn(`[L2] Failed to preload data/${iso2}.fgb:`, err);
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
        renderCanvasRef.current();
        requestRender();
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
    };
  }, [focusMapRef, getActiveLayerHoverTargets, getHoverClientPoint, requestRender]);

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
            getDataUrl(`data/${iso2}-roads.fgb`), 'roads', iso2
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
          console.warn(`[Roads] Failed to load data/${iso2}-roads.fgb:`, err);
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
          syncAllViewports(newK, transformRef.current.x, transformRef.current.y, width, height);
          renderCanvasRef.current();
          requestRender();
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [clampY, wrapX, requestRender, syncAllViewports]);

  // Initial map positioning — run as soon as container has size (ocean paints immediately)
  useEffect(() => {
    if (containerRef.current && !isInitializedRef.current) {
      isInitializedRef.current = true;
      const vh = containerRef.current.clientHeight || 800;
      const vw = containerRef.current.clientWidth || 1200;
      viewportSize.current = { w: vw, h: vh };

      const kMin = vh / MAP_H;
      const params = new URLSearchParams(window.location.search);
      const layers = parseLayersFromUrl(params);
      let filledWithColor = false;
      let gone = false;
      let layerGoto: string | undefined;

      for (const layerId of layers) {
        const isFill = isLayerFillColor(layerId);
        const g = getLayerGoto(layerId);
        if (isFill) {
          if (filledWithColor) continue;
          filledWithColor = true;
        } else if (g) {
          if (gone) continue;
          gone = true;
          layerGoto = g;
        }
      }

      const hasPrimaryTarget = !gone && Boolean(params.get('target')?.trim());

      let initialK = Math.max(kMin, 1.0);
      let initialX = wrapX(vw / 2 - (MAP_W / 2) * initialK, initialK);
      let initialY = clampY(vh / 2 - (MAP_H / 2) * initialK, initialK, vh);

      if (layerGoto) {
        try {
          const lp = new URLSearchParams(layerGoto);
          const gRatio = lp.has('ratio') ? Number(lp.get('ratio')) : NaN;
          const gLat = Number(lp.get('lat'));
          const gLon = Number(lp.get('lon'));
          if (Number.isFinite(gRatio)) {
            initialK = Math.max(kMin, Math.min(MAX_ZOOM_K, gRatio));
          }
          if (
            Number.isFinite(gLat) &&
            Number.isFinite(gLon) &&
            Math.abs(gLat) <= 85.05112878 &&
            Math.abs(gLon) <= 180
          ) {
            const projected = projection([gLon, gLat]);
            if (projected) {
              initialX = wrapX(vw / 2 - projected[0] * initialK, initialK);
              initialY = clampY(vh / 2 - projected[1] * initialK, initialK, vh);
            }
          }
          initialTargetHandledRef.current = true;
        } catch {
          // ignore
        }
      } else if (hasPrimaryTarget) {
        // Target framing will run in initialTarget effect
      } else {
        // goto(remaining tags): lat, lon, ratio
        const ratioParam = Number(params.get('ratio'));
        if (params.has('ratio') && Number.isFinite(ratioParam)) {
          initialK = Math.max(kMin, Math.min(MAX_ZOOM_K, ratioParam));
        }
        const latParam = Number(params.get('lat'));
        const lonParam = Number(params.get('lon'));
        if (
          params.has('lat') &&
          params.has('lon') &&
          Number.isFinite(latParam) &&
          Number.isFinite(lonParam) &&
          Math.abs(latParam) <= 85.05112878 &&
          Math.abs(lonParam) <= 180
        ) {
          const projected = projection([lonParam, latParam]);
          if (projected) {
            initialX = wrapX(vw / 2 - projected[0] * initialK, initialK);
            initialY = clampY(vh / 2 - projected[1] * initialK, initialK, vh);
          }
        }
      }

      transformRef.current.k = initialK;
      transformRef.current.x = initialX;
      transformRef.current.y = initialY;
      const initialLOD = getLODLevel(initialK);
      syncAllViewports(initialK, initialX, initialY, vw, vh);
      setLodLevel(initialLOD);
      lodLevelRef.current = initialLOD;
      renderCanvasRef.current();
      requestRender();
    }
  }, [wrapX, clampY, renderCanvas, requestRender, syncAllViewports, projection]);

  // Camera focus has two routes. An object already on screen stays put.
  // The flight only pulls a target that sits outside the window into view.
  useEffect(() => {
    if (!focusMapRef) return;

    const tupleBox = (b: [number, number, number, number]): MapFocusBox => ({
      minX: b[0],
      minY: b[1],
      maxX: b[2],
      maxY: b[3]
    });

    const countryBox = (iso2: string): MapFocusBox | null => {
      const b = getCountryBBox(iso2);
      if (b) return { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY };
      const item = countryPathMap.get(iso2);
      return item ? tupleBox(item.bbox) : null;
    };

    const subdivisionBox = (iso2: string, id: string | number): MapFocusBox | null => {
      const list = l2PathsByCountryRef.current[iso2] || [];
      const target = findSubdivisionMatch(list, id, iso2);
      return target ? tupleBox(target.bbox) : countryBox(iso2);
    };

    const resolveBox = (target: MapFocusTarget): MapFocusBox | null => {
      if (target.kind === 'country') return countryBox(target.iso2);
      if (target.kind === 'subdivision') return subdivisionBox(target.iso2, target.id);
      if (target.kind === 'road') return tupleBox(target.bbox);
      if (target.kind === 'bbox') {
        if (target.boxes.length === 0) return null;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const b of target.boxes) {
          minX = Math.min(minX, b.minX, b.maxX);
          minY = Math.min(minY, b.minY, b.maxY);
          maxX = Math.max(maxX, b.minX, b.maxX);
          maxY = Math.max(maxY, b.minY, b.maxY);
        }
        if (!Number.isFinite(minX)) return null;
        return { minX, minY, maxX, maxY };
      }
      if (target.kind === 'coordinates') {
        return null;
      }
      const iso2 = target.iso2 || '';
      if (iso2 && target.code) {
        const kids = getL3SubdivisionsForParent(iso2, target.parentName, target.parentCode, target.code);
        const idStr = String(target.code);
        const hit = kids.find((s) => s.id === idStr || s.code === idStr || s.name === idStr);
        if (hit) return tupleBox(hit.bbox);
      }
      if (iso2 && (target.parentCode || target.parentName)) {
        const parent = subdivisionBox(iso2, target.parentCode || target.parentName || '');
        if (parent) return parent;
      }
      return iso2 ? countryBox(iso2) : null;
    };

    // On screen when the whole object is inside the window, or a real piece of it is.
    // A thin road counts when its thickness and a stretch of the line are both visible.
    const isAlreadyOnScreen = (
      box: MapFocusBox,
      k: number,
      x: number,
      y: number,
      vw: number,
      vh: number
    ): boolean => {
      const sMinY = y + box.minY * k;
      const sMaxY = y + box.maxY * k;
      for (const copy of WORLD_COPIES) {
        const sMinX = x + (box.minX + copy * MAP_W) * k;
        const sMaxX = x + (box.maxX + copy * MAP_W) * k;
        const overlapX = Math.min(vw, sMaxX) - Math.max(0, sMinX);
        const overlapY = Math.min(vh, sMaxY) - Math.max(0, sMinY);
        if (overlapX <= 1 || overlapY <= 1) continue;
        const featW = Math.max(sMaxX - sMinX, 1);
        const featH = Math.max(sMaxY - sMinY, 1);
        const seenX = overlapX >= 12 || overlapX >= featW - 1;
        const seenY = overlapY >= 12 || overlapY >= featH - 1;
        if (seenX && seenY) return true;
      }
      return false;
    };

    focusMapRef.current = (target: MapFocusTarget) => {
      if (target.kind === 'coordinates') {
        const { vw, vh, centerX } = getRemainingVisibleArea(false);
        if (vw <= 0 || vh <= 0) return;
        const [px, py] = projection([target.lon, target.lat]) || [MAP_W / 2, MAP_H / 2];
        const kMin = vh / MAP_H;
        const targetK = target.ratio !== undefined
          ? Math.max(kMin, Math.min(MAX_ZOOM_K, target.ratio))
          : transformRef.current.k;
        const targetX = wrapX(centerX - px * targetK, targetK);
        const targetY = clampY(vh / 2 - py * targetK, targetK, vh);
        const targetLOD = getLODLevel(targetK);
        if (targetLOD !== lodLevelRef.current) {
          lodLevelRef.current = targetLOD;
          setLodLevel(targetLOD);
          if (targetLOD !== 'L3') activeL3ParentRef.current = null;
        }
        animateTo(targetK, targetX, targetY, 380, () => {
          syncAllViewports(targetK, targetX, targetY, vw, vh);
        });
        return;
      }

      const raw = resolveBox(target);
      if (!raw) return;

      const minX = Math.min(raw.minX, raw.maxX);
      const maxX = Math.max(raw.minX, raw.maxX);
      const minY = Math.min(raw.minY, raw.maxY);
      const maxY = Math.max(raw.minY, raw.maxY);

      const { vw, vh, remainingW, centerX } = getRemainingVisibleArea(true);
      if (vw <= 0 || vh <= 0) return;

      const cur = transformRef.current;
      if (!target.force && isAlreadyOnScreen({ minX, minY, maxX, maxY }, cur.k, cur.x, cur.y, remainingW, vh)) {
        return;
      }

      const bw = Math.max(maxX - minX, 0.5);
      const bh = Math.max(maxY - minY, 0.5);
      // A road is a thin line. Keep the short side from forcing the zoom to the cap.
      const longSide = Math.max(bw, bh);
      const bwFit = Math.max(bw, longSide * 0.2);
      const bhFit = Math.max(bh, longSide * 0.2);

      const kMin = vh / MAP_H;
      const l3 = DEFAULT_LOD_THRESHOLDS.l3Threshold;
      const kCap = Math.min(MAX_ZOOM_K, Number.isFinite(l3) ? l3 - 0.15 : 14);
      const kFit = Math.min((remainingW * 0.62) / bwFit, (vh * 0.62) / bhFit);
      const targetK = Math.max(kMin, Math.min(kCap, kFit));
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const targetX = wrapX(centerX - cx * targetK, targetK);
      const targetY = clampY(vh / 2 - cy * targetK, targetK, vh);

      const targetLOD = getLODLevel(targetK);
      if (targetLOD !== lodLevelRef.current) {
        lodLevelRef.current = targetLOD;
        setLodLevel(targetLOD);
        if (targetLOD !== 'L3') activeL3ParentRef.current = null;
      }
      animateTo(targetK, targetX, targetY, 380, () => {
        syncAllViewports(targetK, targetX, targetY, vw, vh);
      });
    };

    return () => {
      focusMapRef.current = null;
    };
  }, [
    focusMapRef,
    countryPathMap,
    getL3SubdivisionsForParent,
    wrapX,
    clampY,
    animateTo,
    syncAllViewports,
    projection,
    getRemainingVisibleArea
  ]);

  useEffect(() => {
    if (!initialTarget || initialTargetHandledRef.current) return;
    const parts = initialTarget.split('::');
    const iso2 = parts[0].trim().toUpperCase();
    const country = findCountry(iso2);
    if (!country || !countryPathMap.has(iso2)) return;

    if (parts.length === 1) {
      initialTargetHandledRef.current = true;
      onSelectCountry(country, { focus: false });
      focusMapRef?.current?.({ kind: 'country', iso2, force: true });
    } else if (parts.length === 2) {
      // Immediately frame the parent country while background worker decodes subdivision geometry
      focusMapRef?.current?.({ kind: 'country', iso2, force: true });
    }
  }, [initialTarget, countryPathMap, onSelectCountry, focusMapRef]);

  useEffect(() => {
    if (!initialFocusTarget || initialFocusTargetHandledRef.current) return;
    const parts = initialFocusTarget.split('::').map((part) => part.trim());
    const iso2 = parts[0].toUpperCase();
    if (!findCountry(iso2) || !countryPathMap.has(iso2)) return;

    if (parts.length === 1) {
      initialFocusTargetHandledRef.current = true;
      focusMapRef?.current?.({ kind: 'country', iso2, force: true });
    } else if (parts.length === 2) {
      focusMapRef?.current?.({ kind: 'country', iso2, force: true });
    }
  }, [initialFocusTarget, countryPathMap, focusMapRef]);



  // Arrow key navigation hook
  useKeyboardNav({
    deterministicCountries,
    getTransform: () => transformRef.current,
    setTransformXY: (x, y) => {
      transformRef.current.x = x;
      transformRef.current.y = y;
    },
    getViewport: () => {
      const { vw, vh, centerX } = getRemainingVisibleArea(true);
      return { w: vw, h: vh, centerX };
    },
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

  const toggleCenterCursor = useCallback(() => {
    const nextEnabled = !centerCursorEnabledRef.current;
    centerCursorEnabledRef.current = nextEnabled;
    setCenterCursorEnabled(nextEnabled);

    if (nextEnabled) {
      const point = getHoverClientPoint();
      hoverUpdateRef.current(point.x, point.y);
    } else {
      const changed = clearHover();
      if (changed) requestRender();
    }
  }, [clearHover, getHoverClientPoint, requestRender]);

  const openHoveredFullInfo = useCallback(() => {
    const road = hoveredRoadRef.current;
    if (road && onSelectRoad) {
      onSelectRoad(road, { focus: false });
      onSelectCountry(null, { focus: false });
      onSelectSubdivision?.(null, { focus: false });
      onSelectMunicipality?.(null, { focus: false });
      return;
    }

    const municipality = hoveredMunicipalityRef.current;
    if (municipality && onSelectMunicipality) {
      onSelectMunicipality(municipality, { focus: false });
      onSelectCountry(null, { focus: false });
      onSelectSubdivision?.(null, { focus: false });
      onSelectRoad?.(null, { focus: false });
      return;
    }

    const subdivision = hoveredL2SubdivisionRef.current;
    if (subdivision && onSelectSubdivision) {
      onSelectSubdivision(subdivision, { focus: false });
      onSelectCountry(null, { focus: false });
      onSelectMunicipality?.(null, { focus: false });
      onSelectRoad?.(null, { focus: false });
      return;
    }

    const country = hoveredCountryRef.current;
    if (country) {
      onSelectCountry(country, { focus: false });
      onSelectSubdivision?.(null, { focus: false });
      onSelectMunicipality?.(null, { focus: false });
      onSelectRoad?.(null, { focus: false });
    }
  }, [onSelectCountry, onSelectMunicipality, onSelectRoad, onSelectSubdivision]);

  return (
    <div
      ref={containerRef}
      className={`svg-map-wrapper ${showRoads ? 'roads-mode-active' : ''} ${isFilterExpanded ? 'filter-panel-open' : ''} ${
        selectedCountry || selectedSubdivision || selectedMunicipality || selectedRoad ? 'panel-open' : ''
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}   // 系統中斷手勢時也要結束拖曳
      onPointerEnter={(e) => {
        isMouseInsideRef.current = true;
        mousePos.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerLeave={() => {
        isMouseInsideRef.current = false;
        // 注意：有 setPointerCapture 時，leave 不一定代表結束拖曳
        // 若沒在 dragging，才清 hover
        if (!isDragging.current) {
          if (hasFinePointerRef.current) {
            const changed = clearHover();
            if (tooltipRef.current) tooltipRef.current.style.display = 'none';
            if (changed) requestRender();
          } else {
            const point = getHoverClientPoint();
            hoverUpdateRef.current(point.x, point.y);
          }
        }
      }}
      onClick={handleMapClick}
    >
      <canvas ref={canvasRef} className="world-map-canvas" />

      {!hasFinePointer && centerCursorEnabled && (
        <div className="map-center-cursor" aria-hidden="true">
          <span className="map-center-cursor-horizontal" />
          <span className="map-center-cursor-vertical" />
          <span className="map-center-cursor-dot" />
        </div>
      )}

      {loading && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            backgroundColor: 'rgba(20, 24, 33, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 8,
            zIndex: 30,
            pointerEvents: 'none',
            fontSize: 13,
            color: '#38bdf8',
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              border: '2px solid rgba(56, 189, 248, 0.2)',
              borderTopColor: '#38bdf8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              flexShrink: 0,
            }}
          />
          <span>載入國家邊界中…</span>
        </div>
      )}

      {/* Dynamic Floating Hover Tooltip */}
      <MapTooltip
        setTooltipNode={setTooltipNode}
        hoveredRoad={hoveredRoad}
        hoveredCountry={hoveredCountry}
        hoveredMunicipality={hoveredMunicipality}
        hoveredL2Subdivision={hoveredL2Subdivision}
        hoveredExtFeature={hoveredExtFeature}
        activeRegionalFilters={activeRegionalFilters}
        isTouch={!hasFinePointer}
        onOpenFullInfo={
          !hasFinePointer &&
          (hoveredRoad || hoveredCountry || hoveredMunicipality || hoveredL2Subdivision)
            ? openHoveredFullInfo
            : undefined
        }
      />

      {/* Filter Legend Card */}
      <MapLegend
        activeFilterDef={activeFilterDef}
        isFilterExpanded={isFilterExpanded}
        activeTextFilters={activeTextFilters}
        activeInternationalImageFilter={activeInternationalImageFilter}
        isL2RegionMode={lodLevel !== 'L1'}
        activeRegionalFilters={activeRegionalFilters}
        onToggleTextFilter={onToggleTextFilter}
        onToggleInternationalImageFilter={onToggleInternationalImageFilter}
        onToggleRegionalFilter={onToggleRegionalFilter}
      />

      {/* Map Control Buttons */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onSelectCountry={onSelectCountry}
        panelOpen={Boolean(selectedCountry || selectedSubdivision || selectedMunicipality || selectedRoad)}
        panelWidth={detailPanelWidth}
        panelFullWidth={detailPanelFullWidth}
        showCenterCursorControl={!hasFinePointer}
        centerCursorEnabled={centerCursorEnabled}
        onToggleCenterCursor={toggleCenterCursor}
      />
    </div>
  );
};
