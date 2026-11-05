import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Map,
  Marker,
  setWorkerUrl,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AlertTriangle } from 'lucide-react';
import type { CountryData, LayerCategory } from '../types/geo';
import type { L2SubdivisionDetail, MunicipalityDetail } from '../types/lod';
import type { MapFocusTarget, MapSelectOptions, RoadPathData } from '../map/types';
import type { LayerDefinition } from '../data/layers';
import {
  NATIONWIDE_LAYERS,
  COUNTRIES_WITH_ROADS,
  getRoadLayersForCountry,
  getNationwideLayerById,
  type NationwideLayerDef
} from '../data/nationwideLayers';
import { findCountry, COUNTRIES_DATA, onCountriesIndexLoaded } from '../data/countries';
import { hasCountryL2Sync } from '../data/geoIndexClient';
import { ROADS_MANIFEST } from '../data/roadsManifest';
import { getDataUrl } from '../data/dataSource';
import { decodeGeoJson } from '../map/geoWorkerClient';
import { isCapitalSubdivision } from '../data/capitalSubdivisions';
import {
  getCsvLayerById,
  getCsvLayerValue,
  getCsvSubdivisionValue,
  getCsvSubdivisionCode,
  loadOnDemandCsvLayer,
  onLayersIndexLoaded,
  isLayersIndexLoaded
} from '../layers/csvLayerRegistry';
import { getCombinedTextOverlay } from '../data/globalLayers';
import { getCrossingSign } from '../data/pedestrianCrossing';
import { getCountryRoadMarking } from '../data/roadMarkings';
import { MapTooltip } from '../map/MapTooltip';
import { MapLegend } from '../map/MapLegend';
import { MapControls } from '../map/MapControls';
import { PerformanceMonitorPanel, type PerformanceStats } from './PerformanceMonitorPanel';

// Explicitly register worker URL with absolute path resolving base URL
const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/inter-geo/';
const workerPath = `${baseUrl.replace(/\/+$/, '')}/assets/maplibre-gl-worker.mjs`;
setWorkerUrl(workerPath);

// Mainland centroid coordinates [lng, lat] for reliable label placement
const COUNTRY_LABEL_CENTROIDS_LL: Record<string, [number, number]> = {
  US: [-98.58, 39.8],
  CA: [-106.35, 56.1],
  RU: [95.0, 62.0],
  FR: [2.2, 46.6],
  AU: [133.78, -25.27],
  JP: [138.25, 36.2],
  TW: [120.96, 23.7],
  GB: [-1.5, 54.0],
  NO: [8.5, 60.5],
  NZ: [172.5, -41.5],
  CL: [-71.5, -35.6],
  BR: [-51.9, -14.2],
  CN: [104.19, 35.86],
  IN: [78.96, 20.59],
  ID: [113.92, -0.78],
  ZA: [25.0, -29.0],
  AR: [-63.61, -38.41],
  MX: [-102.55, 23.63],
  DE: [10.45, 51.16],
  IT: [12.56, 41.87],
  ES: [-3.74, 40.46],
  SE: [18.64, 60.12],
  FI: [25.74, 61.92],
  PL: [19.14, 51.91],
  UA: [31.16, 48.37],
  TR: [35.24, 38.96],
  TH: [100.99, 15.87],
  MY: [101.97, 4.21],
  PH: [121.77, 12.87],
  VN: [108.27, 14.05],
  KR: [127.76, 35.9],
  GR: [21.82, 39.07],
  PT: [-8.22, 39.39],
  NL: [5.29, 52.13],
  BE: [4.46, 50.5],
  AT: [14.55, 47.51],
  CH: [8.22, 46.81],
  CZ: [15.47, 49.81],
  IE: [-8.24, 53.41]
};

export interface MapLibreMapProps {
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
  selectedRoad?: RoadPathData | null;
  onSelectRoad?: (road: RoadPathData | null, options?: MapSelectOptions) => void;
  zoomToSubdivisionRef?: React.MutableRefObject<((iso2: string, id: string | number) => void) | null>;
  focusMapRef?: React.MutableRefObject<((target: MapFocusTarget) => void) | null>;
  initialTarget?: string;
  initialFocusTarget?: string;
  showRoads?: boolean;
  showInterstates?: boolean;
  showNumberedRoutes?: boolean;
  detailPanelWidth?: number;
  detailPanelFullWidth?: boolean;
  onOceanClick?: () => void;
}

export const MapLibreMap: React.FC<MapLibreMapProps> = ({
  activeFilterId,
  activeTextFilters = new Set(),
  onToggleTextFilter,
  activeInternationalImageFilter,
  onToggleInternationalImageFilter,
  activeRegionalFilters = new Set(),
  onToggleRegionalFilter,
  onVisibleRegionalFiltersChange,
  isFilterExpanded,
  selectedCountry,
  onSelectCountry,
  selectedSubdivision,
  onSelectSubdivision,
  selectedMunicipality,
  selectedRoad,
  onSelectRoad,
  zoomToSubdivisionRef,
  focusMapRef,
  initialTarget,
  initialFocusTarget,
  showRoads = false,
  showInterstates = false,
  showNumberedRoutes = false,
  detailPanelWidth = 420,
  detailPanelFullWidth = false,
  onOceanClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const onOceanClickRef = useRef(onOceanClick);
  const onSelectCountryRef = useRef(onSelectCountry);
  const onSelectSubdivisionRef = useRef(onSelectSubdivision);
  const onSelectRoadRef = useRef(onSelectRoad);
  const selectedCountryRef = useRef(selectedCountry);

  useEffect(() => {
    onOceanClickRef.current = onOceanClick;
    onSelectCountryRef.current = onSelectCountry;
    onSelectSubdivisionRef.current = onSelectSubdivision;
    onSelectRoadRef.current = onSelectRoad;
    selectedCountryRef.current = selectedCountry;
  });

  const [hoveredCountry, setHoveredCountry] = useState<CountryData | null>(null);
  const [hoveredL2Subdivision, setHoveredL2Subdivision] = useState<L2SubdivisionDetail | null>(null);
  const [hoveredRoad, setHoveredRoad] = useState<RoadPathData | null>(null);
  const [hoveredMunicipality] = useState<MunicipalityDetail | null>(null);
  const [hoveredInfoText, setHoveredInfoText] = useState<string | null>(null);

  // Dynamic FGB caching tracking
  const loadedL2CountriesRef = useRef<Set<string>>(new Set(['TW', 'US']));
  const loadedRoadCountriesRef = useRef<Set<string>>(new Set(['TW', 'US']));
  const activeL2LayerIdsRef = useRef<Set<string>>(new Set(['tw-subdivisions', 'us-states']));

  // Index ready states
  const [csvLoadedRev, setCsvLoadedRev] = useState(0);
  const [indicesReady, setIndicesReady] = useState(() => isLayersIndexLoaded() && COUNTRIES_DATA.length > 0);

  useEffect(() => {
    const unsub1 = onLayersIndexLoaded(() => setIndicesReady(true));
    const unsub2 = onCountriesIndexLoaded(() => setIndicesReady(true));
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  // Viewport tracking & FPS measurement
  const [center, setCenter] = useState<[number, number]>([120.96, 23.7]);
  const [zoom, setZoom] = useState<number>(6.8);
  const [centerCursorEnabled, setCenterCursorEnabled] = useState(false);
  const [hasFinePointer] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(pointer: fine)').matches
      : true
  );

  const [perf, setPerf] = useState<PerformanceStats>({
    fps: 60,
    minFps: 60,
    maxFps: 60,
    avgFps: 60,
    frameTime: 16.6
  });
  const [isStressTesting, setIsStressTesting] = useState(false);
  const stressRef = useRef<number | null>(null);

  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const setTooltipNode = useCallback((node: HTMLDivElement | null) => {
    tooltipRef.current = node;
  }, []);

  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(0);
  const perfRafIdRef = useRef<number | null>(null);

  // Active layer definition for MapLegend
  const activeFilterDef = useMemo<LayerDefinition>(() => {
    void csvLoadedRev;
    void indicesReady;
    const csvF = getCsvLayerById(activeFilterId) || (activeFilterId === 'none' ? getCsvLayerById('base') : undefined);
    if (csvF) {
      const defaultCol =
        csvF.meta.defaultColor ||
        csvF.defaultColor ||
        ((csvF.meta as Record<string, unknown>)['default-color'] as string | undefined);
      return {
        id: csvF.id,
        category: (csvF.meta.category as LayerCategory) || 'none',
        nameZh: csvF.meta.nameZh || csvF.id,
        descriptionZh: csvF.meta.descriptionZh || '',
        legend: csvF.legend || [],
        getColor: (country: CountryData) => {
          if (csvF.id === 'roadLines' || csvF.id === 'roadMarkings' || csvF.id === 'road-markings') {
            return getCountryRoadMarking(country.iso2).centerColor;
          }
          const val = getCsvLayerValue(csvF.id, country.iso2);
          if (val === undefined || val === '') return defaultCol || null;
          const matchedItem = csvF.legend?.find((item) => String(item.key) === String(val));
          return matchedItem ? matchedItem.color : defaultCol || null;
        }
      };
    }
    return {
      id: 'base',
      category: 'none',
      nameZh: '基礎底圖',
      descriptionZh: '全球陸地基礎底圖輪廓風格',
      legend: [],
      getColor: () => null
    };
  }, [activeFilterId, csvLoadedRev, indicesReady]);

  // Position floating tooltip
  const placeTooltip = useCallback((clientX: number, clientY: number, measure = false) => {
    const node = tooltipRef.current;
    if (!node) return;

    node.style.display = 'block';
    node.style.visibility = 'visible';

    const PAD = 14;
    const OFFSET_X = 16;
    const OFFSET_Y = 16;
    const rect = node.getBoundingClientRect();
    const w = measure ? Math.max(220, rect.width || 220) : (rect.width || 220);
    const h = measure ? Math.max(90, rect.height || 90) : (rect.height || 90);

    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    let left = clientX + OFFSET_X;
    let top = clientY + OFFSET_Y;

    if (left + w > vpW - PAD) {
      left = clientX - w - OFFSET_X;
    }
    if (left < PAD) left = PAD;

    if (top + h > vpH - PAD) {
      top = clientY - h - OFFSET_Y;
    }
    if (top < PAD) top = PAD;

    node.style.left = `${Math.round(left)}px`;
    node.style.top = `${Math.round(top)}px`;
  }, []);

  // Performance FPS sampling loop
  useEffect(() => {
    let active = true;
    lastTimeRef.current = performance.now();

    const measure = (now: number) => {
      if (!active) return;
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = now;
      }
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (delta > 0 && delta < 200) {
        const currentFps = 1000 / delta;
        const times = frameTimesRef.current;
        times.push(currentFps);
        if (times.length > 60) times.shift();

        if (times.length >= 10) {
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          const min = Math.min(...times);
          const max = Math.max(...times);
          setPerf({
            fps: Math.round(currentFps),
            minFps: Math.round(min),
            maxFps: Math.round(max),
            avgFps: Math.round(avg),
            frameTime: Number(delta.toFixed(1))
          });
        }
      }

      perfRafIdRef.current = requestAnimationFrame(measure);
    };

    perfRafIdRef.current = requestAnimationFrame(measure);

    return () => {
      active = false;
      if (perfRafIdRef.current) cancelAnimationFrame(perfRafIdRef.current);
    };
  }, []);

  // Continuous stress test animation loop
  const toggleStressTest = useCallback(() => {
    if (isStressTesting) {
      setIsStressTesting(false);
      if (stressRef.current) {
        cancelAnimationFrame(stressRef.current);
        stressRef.current = null;
      }
      return;
    }

    setIsStressTesting(true);
    const map = mapRef.current;
    if (!map) return;

    let step = 0;
    const run = () => {
      step += 0.015;
      const angle = step;
      const lng = 121 + Math.sin(angle) * 8;
      const lat = 24 + Math.cos(angle * 0.7) * 4;
      const z = 5.5 + Math.sin(angle * 1.5) * 2.5;

      map.jumpTo({ center: [lng, lat], zoom: z });
      stressRef.current = requestAnimationFrame(run);
    };

    stressRef.current = requestAnimationFrame(run);
  }, [isStressTesting]);

  useEffect(() => {
    return () => {
      if (stressRef.current) cancelAnimationFrame(stressRef.current);
    };
  }, []);

  // Dynamic Country Subdivisions loader
  const loadCountrySubdivisions = useCallback(async (iso2: string) => {
    const map = mapRef.current;
    if (!map || loadedL2CountriesRef.current.has(iso2)) return;
    if (!hasCountryL2Sync(iso2)) return;
    loadedL2CountriesRef.current.add(iso2);

    try {
      const geojson = await decodeGeoJson(getDataUrl(`data/${iso2}.fgb`), 'l2', iso2);
      if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;

      const sourceId = `l2-${iso2.toLowerCase()}`;
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'geojson', data: geojson });
        map.addLayer({
          id: `${sourceId}-fill`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#0ea5e9',
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.55,
              0.2
            ]
          }
        });
        map.addLayer({
          id: `${sourceId}-border`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#38bdf8',
            'line-width': 1.2
          }
        });

        activeL2LayerIdsRef.current.add(sourceId);

        let hoveredFid: string | number | null = null;
        map.on('mousemove', `${sourceId}-fill`, (e: MapLayerMouseEvent) => {
          if (!e.features || e.features.length === 0) return;
          map.getCanvas().style.cursor = 'pointer';
          const feat = e.features[0] as MapGeoJSONFeature;
          if (hoveredFid !== null) {
            map.setFeatureState({ source: sourceId, id: hoveredFid }, { hover: false });
          }
          hoveredFid = feat.id !== undefined ? feat.id : null;
          if (hoveredFid !== null) {
            map.setFeatureState({ source: sourceId, id: hoveredFid }, { hover: true });
          }

          const cMeta = findCountry(iso2);
          const subDetail: L2SubdivisionDetail = {
            iso2,
            id: (feat.properties?.code || feat.properties?.postal || feat.id) as string,
            name: feat.properties?.name || '',
            nameEn: feat.properties?.name_en || feat.properties?.name || '',
            nameZh: feat.properties?.name_zh || feat.properties?.name || '',
            typeEn: feat.properties?.type_en || 'Subdivision',
            code: feat.properties?.code || '',
            postal: feat.properties?.postal || '',
            countryName: cMeta?.name || iso2,
            countryNameZh: cMeta?.nameZh || iso2,
            countryFlag: cMeta?.flag || '🌐'
          };
          setHoveredL2Subdivision(subDetail);
          setHoveredCountry(cMeta || null);
          setHoveredRoad(null);
          setHoveredInfoText(
            `${cMeta?.flag ? cMeta.flag + ' ' : ''}${cMeta?.nameZh || iso2} · ${subDetail.nameZh || subDetail.name}${subDetail.postal ? ` (${subDetail.postal})` : subDetail.code ? ` (${subDetail.code})` : ''}`
          );
          placeTooltip(e.point.x, e.point.y);
        });

        map.on('mouseleave', `${sourceId}-fill`, () => {
          map.getCanvas().style.cursor = '';
          if (hoveredFid !== null) {
            map.setFeatureState({ source: sourceId, id: hoveredFid }, { hover: false });
            hoveredFid = null;
          }
          setHoveredL2Subdivision(null);
          setHoveredInfoText(null);
        });

        map.on('click', `${sourceId}-fill`, (e: MapLayerMouseEvent) => {
          if (!e.features || e.features.length === 0) return;
          const feat = e.features[0] as MapGeoJSONFeature;
          const cMeta = findCountry(iso2);
          const subDetail: L2SubdivisionDetail = {
            iso2,
            id: (feat.properties?.code || feat.properties?.postal || feat.id) as string,
            name: feat.properties?.name || '',
            nameEn: feat.properties?.name_en || feat.properties?.name || '',
            nameZh: feat.properties?.name_zh || feat.properties?.name || '',
            typeEn: feat.properties?.type_en || 'Subdivision',
            code: feat.properties?.code || '',
            postal: feat.properties?.postal || '',
            countryName: cMeta?.name || iso2,
            countryNameZh: cMeta?.nameZh || iso2,
            countryFlag: cMeta?.flag || '🌐'
          };
          onSelectCountryRef.current?.(cMeta || null);
          onSelectSubdivisionRef.current?.(subDetail);
        });
      }
    } catch (err) {
      console.warn(`Failed to dynamically load L2 subdivisions for ${iso2}:`, err);
    }
  }, [placeTooltip]);

  // Helper to determine if a specific road class should be shown for a given country
  const isCountryRoadClassActive = useCallback(
    (iso2: string, roadClass: 'Interstate' | 'Federal'): boolean => {
      const upper = (iso2 || '').toUpperCase();

      // Check selected road
      if (selectedRoad) {
        const roadIso = (selectedRoad.iso2 || 'TW').toUpperCase();
        if (roadIso === upper) {
          if (!selectedRoad.class || selectedRoad.class === roadClass) {
            return true;
          }
        }
      }

      // Check activeRegionalFilters
      for (const id of activeRegionalFilters) {
        if (upper === 'US') {
          if (
            roadClass === 'Interstate' &&
            (id === 'us-interstates' || id === 'roads-highways' || id === 'roads-US-interstates')
          ) {
            return true;
          }
          if (
            roadClass === 'Federal' &&
            (id === 'us-numbered-highways' ||
              id === 'us-highways' ||
              id === 'us-numbered-routes' ||
              id === 'roads-numbered' ||
              id === 'roads-US-routes')
          ) {
            return true;
          }
        }

        if (upper === 'TW') {
          if (
            roadClass === 'Interstate' &&
            (id === 'roads-TW-freeway' ||
              id === 'roads-TW-freeways' ||
              id === 'tw-freeways' ||
              id.includes('freeway'))
          ) {
            return true;
          }
          if (
            roadClass === 'Federal' &&
            (id === 'roads-TW-provincial' ||
              id === 'roads-TW-expressways' ||
              id === 'tw-provincial' ||
              id.includes('provincial') ||
              id.includes('expressway'))
          ) {
            return true;
          }
        }

        // Generic pattern roads-XX-...
        if (id.startsWith(`roads-${upper}`) || id.startsWith(`roads-${upper.toLowerCase()}`)) {
          if (
            roadClass === 'Interstate' &&
            (id.includes('interstate') ||
              id.includes('freeway') ||
              id.includes('motorway') ||
              id.includes('autoroute') ||
              id.includes('autobahn') ||
              id.includes('expressway'))
          ) {
            return true;
          }
          if (
            roadClass === 'Federal' &&
            (id.includes('route') ||
              id.includes('provincial') ||
              id.includes('highway') ||
              id.includes('national') ||
              id.includes('bundesstrasse') ||
              id.includes('aroad') ||
              id.includes('primary'))
          ) {
            return true;
          }
          return true;
        }

        // Check NationwideLayerDef
        const def = getNationwideLayerById(id);
        if (def && def.layerType === 'roads') {
          const owner = (def.countryIso2 || def.targetIso2 || '').toUpperCase();
          if (owner === upper) {
            if (!def.roadClass || def.roadClass === roadClass) return true;
          }
        }
      }

      // Fallbacks if showRoads / showInterstates / showNumberedRoutes are active from props
      if (upper === 'US') {
        if (roadClass === 'Interstate' && showInterstates) return true;
        if (roadClass === 'Federal' && showNumberedRoutes) return true;
      }
      if (showRoads) return true;

      return false;
    },
    [selectedRoad, activeRegionalFilters, showRoads, showInterstates, showNumberedRoutes]
  );

  // Helper to determine if any roads should be shown for a given country
  const isCountryRoadVisible = useCallback(
    (iso2: string): boolean => {
      return isCountryRoadClassActive(iso2, 'Interstate') || isCountryRoadClassActive(iso2, 'Federal');
    },
    [isCountryRoadClassActive]
  );

  // Dynamic Country Roads loader
  const loadCountryRoads = useCallback(async (iso2: string) => {
    const map = mapRef.current;
    if (!map || loadedRoadCountriesRef.current.has(iso2)) return;
    if (!ROADS_MANIFEST[iso2]) return;
    loadedRoadCountriesRef.current.add(iso2);

    try {
      const geojson = await decodeGeoJson(getDataUrl(`data/${iso2}-roads.fgb`), 'roads', iso2);
      if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;

      const sourceId = `roads-${iso2.toLowerCase()}`;
      if (!map.getSource(sourceId)) {
        const isInter = isCountryRoadClassActive(iso2, 'Interstate');
        const isFed = isCountryRoadClassActive(iso2, 'Federal');
        const isVis = isInter || isFed;

        map.addSource(sourceId, { type: 'geojson', data: geojson });
        map.addLayer({
          id: `${sourceId}-casing`,
          type: 'line',
          source: sourceId,
          layout: {
            visibility: isVis ? 'visible' : 'none'
          },
          paint: {
            'line-color': '#0f172a',
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              4,
              ['case', ['==', ['get', 'class'], 'Interstate'], 2.0, 1.6],
              8,
              ['case', ['==', ['get', 'class'], 'Interstate'], 4.0, 3.0],
              12,
              ['case', ['==', ['get', 'class'], 'Interstate'], 7.2, 5.2]
            ]
          }
        });
        map.addLayer({
          id: `${sourceId}-core`,
          type: 'line',
          source: sourceId,
          layout: {
            visibility: isVis ? 'visible' : 'none'
          },
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'class'], 'Interstate'],
              '#38bdf8',
              '#fbbf24'
            ],
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              4,
              ['case', ['==', ['get', 'class'], 'Interstate'], 1.0, 0.7],
              8,
              ['case', ['==', ['get', 'class'], 'Interstate'], 2.0, 1.4],
              12,
              ['case', ['==', ['get', 'class'], 'Interstate'], 3.6, 2.6]
            ]
          }
        });

        if (isVis) {
          if (isInter && !isFed) {
            map.setFilter(`${sourceId}-casing`, ['==', ['get', 'class'], 'Interstate']);
            map.setFilter(`${sourceId}-core`, ['==', ['get', 'class'], 'Interstate']);
          } else if (isFed && !isInter) {
            map.setFilter(`${sourceId}-casing`, ['==', ['get', 'class'], 'Federal']);
            map.setFilter(`${sourceId}-core`, ['==', ['get', 'class'], 'Federal']);
          }
        }

        map.on('mousemove', `${sourceId}-core`, (e: MapLayerMouseEvent) => {
          if (!e.features || e.features.length === 0) return;
          map.getCanvas().style.cursor = 'pointer';
          const feat = e.features[0] as MapGeoJSONFeature;
          const roadObj: RoadPathData = {
            name: feat.properties?.name || 'Road',
            number: feat.properties?.number || '',
            prefix: feat.properties?.prefix || '',
            type: feat.properties?.type || 'motorway',
            class: (feat.properties?.class || (feat.properties?.type === 'motorway' ? 'Interstate' : 'Federal')) as 'Interstate' | 'Federal',
            scalerank: feat.properties?.scalerank || 1,
            iso2,
            bbox: [0, 0, 0, 0]
          };
          setHoveredRoad(roadObj);
          const flag = findCountry(iso2)?.flag;
          setHoveredInfoText(`🛣️ ${flag ? flag + ' ' : ''}${roadObj.name}`);
          placeTooltip(e.point.x, e.point.y);
        });

        map.on('mouseleave', `${sourceId}-core`, () => {
          map.getCanvas().style.cursor = '';
          setHoveredRoad(null);
          setHoveredInfoText(null);
        });

        map.on('click', `${sourceId}-core`, (e: MapLayerMouseEvent) => {
          if (!e.features || e.features.length === 0) return;
          const feat = e.features[0] as MapGeoJSONFeature;
          const roadObj: RoadPathData = {
            name: feat.properties?.name || 'Road',
            number: feat.properties?.number || '',
            prefix: feat.properties?.prefix || '',
            type: feat.properties?.type || 'motorway',
            class: (feat.properties?.class || (feat.properties?.type === 'motorway' ? 'Interstate' : 'Federal')) as 'Interstate' | 'Federal',
            scalerank: feat.properties?.scalerank || 1,
            iso2,
            bbox: [0, 0, 0, 0]
          };
          onSelectRoadRef.current?.(roadObj);
        });
      }
    } catch (err) {
      console.warn(`Failed to dynamically load roads for ${iso2}:`, err);
    }
  }, [isCountryRoadClassActive, placeTooltip]);

  // Read initial camera from URL params
  const getInitialCamera = useCallback(() => {
    if (typeof window === 'undefined') return { center: [120.96, 23.7] as [number, number], zoom: 6.8 };
    const params = new URLSearchParams(window.location.search);
    const latStr = params.get('lat');
    const lonStr = params.get('lon');
    const zoomStr = params.get('zoom') || params.get('ratio');
    if (latStr && lonStr) {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        let z = 6.8;
        if (zoomStr) {
          const val = parseFloat(zoomStr);
          if (Number.isFinite(val)) {
            z = val > 20 ? 7 : val < 1 ? 2 : val;
          }
        }
        return { center: [lon, lat] as [number, number], zoom: z };
      }
    }
    return { center: [120.96, 23.7] as [number, number], zoom: 6.8 };
  }, []);

  // Compute visible regional filters for LayerBar
  const syncVisibleRegionalFilters = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !onVisibleRegionalFiltersChange) return;

    const feats = map.queryRenderedFeatures({ layers: ['world-countries-fill'] });
    const visibleIso2s = new Set<string>();

    for (let i = 0; i < feats.length; i++) {
      const f = feats[i];
      const c = findCountry(f.properties?.id) || findCountry(f.properties?.name);
      if (c?.iso2) {
        visibleIso2s.add(c.iso2.toUpperCase());
      }
    }

    const nextVisible: NationwideLayerDef[] = [];
    const z = map.getZoom();

    for (let i = 0; i < NATIONWIDE_LAYERS.length; i++) {
      const filter = NATIONWIDE_LAYERS[i];
      if (filter.minZoomK && z < (filter.minZoomK > 1 ? 3.5 : 1)) continue;

      if (filter.targetIso2 === '*') {
        const anyVisible = filter.targetIso2s?.some((iso) => visibleIso2s.has(iso.toUpperCase()));
        if (anyVisible) nextVisible.push(filter);
      } else if (visibleIso2s.has(filter.targetIso2.toUpperCase())) {
        nextVisible.push(filter);
      } else if (filter.targetIso2s?.some((iso) => visibleIso2s.has(iso.toUpperCase()))) {
        nextVisible.push(filter);
      }
    }

    for (let i = 0; i < COUNTRIES_WITH_ROADS.length; i++) {
      const iso2 = COUNTRIES_WITH_ROADS[i];
      if (visibleIso2s.has(iso2.toUpperCase())) {
        const roadFilters = getRoadLayersForCountry(iso2);
        for (let r = 0; r < roadFilters.length; r++) {
          nextVisible.push(roadFilters[r]);
        }
      }
    }

    const unique = nextVisible.filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx);
    onVisibleRegionalFiltersChange(unique);
  }, [onVisibleRegionalFiltersChange]);

  // Crossing sign HTML markers ref
  const crossingMarkersRef = useRef<Marker[]>([]);

  // Initialize MapLibre
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCam = getInitialCamera();

    const map = new Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#0a0d14'
            }
          }
        ]
      },
      center: initialCam.center,
      zoom: initialCam.zoom,
      attributionControl: false,
      renderWorldCopies: true
    });

    mapRef.current = map;

    map.on('error', (e) => {
      console.error('MapLibre GL error:', e);
      if (e.error?.message) {
        setMapError(e.error.message);
      }
    });

    const handleResize = () => {
      map.resize();
    };
    window.addEventListener('resize', handleResize);

    map.on('move', () => {
      const c = map.getCenter();
      setCenter([Number(c.lng.toFixed(2)), Number(c.lat.toFixed(2))]);
      setZoom(Number(map.getZoom().toFixed(2)));
    });

    map.on('moveend', () => {
      if (typeof window === 'undefined') return;
      const c = map.getCenter();
      const z = map.getZoom();
      const url = new URL(window.location.href);
      url.searchParams.set('lat', c.lat.toFixed(5));
      url.searchParams.set('lon', c.lng.toFixed(5));
      url.searchParams.set('ratio', z.toFixed(2));
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);

      syncVisibleRegionalFilters();

      // Auto-expand L2 subdivisions for visible countries if zoom >= 4.0
      const showL2 = z >= 4.0;
      const selIso = selectedCountryRef.current?.iso2;
      const twVis = showL2 || selIso === 'TW';
      const usVis = showL2 || selIso === 'US';
      if (map.getLayer('tw-subdivisions-fill')) {
        map.setLayoutProperty('tw-subdivisions-fill', 'visibility', twVis ? 'visible' : 'none');
        map.setLayoutProperty('tw-subdivisions-border', 'visibility', twVis ? 'visible' : 'none');
      }
      if (map.getLayer('us-states-fill')) {
        map.setLayoutProperty('us-states-fill', 'visibility', usVis ? 'visible' : 'none');
        map.setLayoutProperty('us-states-border', 'visibility', usVis ? 'visible' : 'none');
      }

      activeL2LayerIdsRef.current.forEach((srcId) => {
        const iso = srcId.replace('l2-', '').replace('-subdivisions', '').replace('-states', '').toUpperCase();
        const vis = showL2 || selIso === iso;
        if (map.getLayer(`${srcId}-fill`)) {
          map.setLayoutProperty(`${srcId}-fill`, 'visibility', vis ? 'visible' : 'none');
          map.setLayoutProperty(`${srcId}-border`, 'visibility', vis ? 'visible' : 'none');
        }
      });

      if (showL2) {
        const feats = map.queryRenderedFeatures({ layers: ['world-countries-fill'] });
        for (const f of feats) {
          const country = findCountry(f.properties?.id) || findCountry(f.properties?.name);
          if (country && hasCountryL2Sync(country.iso2)) {
            loadCountrySubdivisions(country.iso2);
            if (isCountryRoadVisible(country.iso2)) loadCountryRoads(country.iso2);
          }
        }
      }
    });

    // Ocean click handler
    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point);
      const isMapFeature = features.some(
        (f) =>
          f.layer.id.startsWith('world-countries') ||
          f.layer.id.startsWith('tw-subdivisions') ||
          f.layer.id.startsWith('us-states') ||
          f.layer.id.startsWith('tw-roads') ||
          f.layer.id.startsWith('us-roads') ||
          f.layer.id.startsWith('l2-') ||
          f.layer.id.startsWith('roads-')
      );
      if (!isMapFeature) {
        onOceanClickRef.current?.();
      }
    });

    map.on('load', () => {
      const bUrl = baseUrl.replace(/\/+$/, '');

      // 1. World Countries (L1)
      map.addSource('world-countries', {
        type: 'geojson',
        data: `${bUrl}/poc-data/world-countries.geojson`
      });

      map.addLayer({
        id: 'world-countries-fill',
        type: 'fill',
        source: 'world-countries',
        paint: {
          'fill-color': '#232a38',
          'fill-opacity': 0.95
        }
      });

      map.addLayer({
        id: 'world-countries-border',
        type: 'line',
        source: 'world-countries',
        paint: {
          'line-color': '#000000',
          'line-width': 1.2
        }
      });

      // Country Hover Highlight Layer (Vibrant Orange fill + White glow border)
      map.addLayer({
        id: 'world-countries-hover',
        type: 'fill',
        source: 'world-countries',
        filter: ['==', ['get', 'name'], ''],
        paint: {
          'fill-color': '#f97316',
          'fill-opacity': 0.88
        }
      });

      map.addLayer({
        id: 'world-countries-hover-border',
        type: 'line',
        source: 'world-countries',
        filter: ['==', ['get', 'name'], ''],
        paint: {
          'line-color': '#ffffff',
          'line-width': 2.2
        }
      });

      // Country Selection Highlight Layer (Cyan border)
      map.addLayer({
        id: 'world-countries-select',
        type: 'line',
        source: 'world-countries',
        filter: ['==', ['get', 'name'], ''],
        paint: {
          'line-color': '#38bdf8',
          'line-width': 2.8
        }
      });

      // 2. Taiwan L2 Subdivisions
      map.addSource('tw-subdivisions', {
        type: 'geojson',
        data: `${bUrl}/poc-data/tw-subdivisions.geojson`
      });

      map.addLayer({
        id: 'tw-subdivisions-fill',
        type: 'fill',
        source: 'tw-subdivisions',
        layout: {
          visibility: 'none'
        },
        paint: {
          'fill-color': '#232a38',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.55,
            0.2
          ]
        }
      });

      map.addLayer({
        id: 'tw-subdivisions-border',
        type: 'line',
        source: 'tw-subdivisions',
        layout: {
          visibility: 'none'
        },
        paint: {
          'line-color': '#38bdf8',
          'line-width': 1.0
        }
      });

      activeL2LayerIdsRef.current.add('tw-subdivisions');

      // 3. US States L2 Subdivisions
      map.addSource('us-states', {
        type: 'geojson',
        data: `${bUrl}/poc-data/us-states.geojson`
      });

      map.addLayer({
        id: 'us-states-fill',
        type: 'fill',
        source: 'us-states',
        layout: {
          visibility: 'none'
        },
        paint: {
          'fill-color': '#232a38',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.5,
            0.2
          ]
        }
      });

      map.addLayer({
        id: 'us-states-border',
        type: 'line',
        source: 'us-states',
        layout: {
          visibility: 'none'
        },
        paint: {
          'line-color': '#34d399',
          'line-width': 1.0
        }
      });

      activeL2LayerIdsRef.current.add('us-states');

      // 4. Taiwan Roads (Dual-layer casing + core)
      map.addSource('tw-roads', {
        type: 'geojson',
        data: `${bUrl}/poc-data/tw-roads.geojson`
      });

      map.addLayer({
        id: 'tw-roads-casing',
        type: 'line',
        source: 'tw-roads',
        layout: {
          visibility: 'none'
        },
        paint: {
          'line-color': '#0f172a',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4,
            ['case', ['==', ['get', 'class'], 'Interstate'], 2.0, 1.6],
            8,
            ['case', ['==', ['get', 'class'], 'Interstate'], 4.0, 3.0],
            12,
            ['case', ['==', ['get', 'class'], 'Interstate'], 7.2, 5.2]
          ]
        }
      });

      map.addLayer({
        id: 'tw-roads-core',
        type: 'line',
        source: 'tw-roads',
        layout: {
          visibility: 'none'
        },
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'class'], 'Interstate'],
            '#38bdf8',
            '#fbbf24'
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4,
            ['case', ['==', ['get', 'class'], 'Interstate'], 1.0, 0.7],
            8,
            ['case', ['==', ['get', 'class'], 'Interstate'], 2.0, 1.4],
            12,
            ['case', ['==', ['get', 'class'], 'Interstate'], 3.6, 2.6]
          ]
        }
      });

      // 5. US Roads
      map.addSource('us-roads', {
        type: 'geojson',
        data: `${bUrl}/poc-data/us-roads.geojson`
      });

      map.addLayer({
        id: 'us-roads-casing',
        type: 'line',
        source: 'us-roads',
        layout: {
          visibility: 'none'
        },
        paint: {
          'line-color': '#0f172a',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4,
            ['case', ['==', ['get', 'class'], 'Interstate'], 2.0, 1.6],
            8,
            ['case', ['==', ['get', 'class'], 'Interstate'], 4.0, 3.0],
            12,
            ['case', ['==', ['get', 'class'], 'Interstate'], 7.2, 5.2]
          ]
        }
      });

      map.addLayer({
        id: 'us-roads-core',
        type: 'line',
        source: 'us-roads',
        layout: {
          visibility: 'none'
        },
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'class'], 'Interstate'],
            '#38bdf8',
            '#fbbf24'
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4,
            ['case', ['==', ['get', 'class'], 'Interstate'], 1.0, 0.7],
            8,
            ['case', ['==', ['get', 'class'], 'Interstate'], 2.0, 1.4],
            12,
            ['case', ['==', ['get', 'class'], 'Interstate'], 3.6, 2.6]
          ]
        }
      });

      // 6. Global Text Badges Source & Symbol Layer
      map.addSource('global-text-badges', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'global-text-badges-symbol',
        type: 'symbol',
        source: 'global-text-badges',
        layout: {
          'text-field': ['get', 'text'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 1, 10, 4, 12, 8, 14],
          'text-allow-overlap': false,
          'text-ignore-placement': false
        },
        paint: {
          'text-color': '#f8fafc',
          'text-halo-color': 'rgba(15, 23, 42, 0.95)',
          'text-halo-width': 3
        }
      });

      // 7. Domestic Area Codes Source & Symbol Layer
      map.addSource('area-code-badges', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'area-code-badges-symbol',
        type: 'symbol',
        source: 'area-code-badges',
        layout: {
          'text-field': ['get', 'code'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 6, 16, 10, 24],
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': '#10b981',
          'text-halo-color': 'rgba(15, 23, 42, 0.95)',
          'text-halo-width': 4
        }
      });

      // --- Hover Interactions ---
      let hoveredTwId: string | number | null = null;
      map.on('mousemove', 'tw-subdivisions-fill', (e: MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        map.getCanvas().style.cursor = 'pointer';
        const feat = e.features[0] as MapGeoJSONFeature;
        if (hoveredTwId !== null) {
          map.setFeatureState({ source: 'tw-subdivisions', id: hoveredTwId }, { hover: false });
        }
        hoveredTwId = feat.id !== undefined ? feat.id : null;
        if (hoveredTwId !== null) {
          map.setFeatureState({ source: 'tw-subdivisions', id: hoveredTwId }, { hover: true });
        }

        const subDetail: L2SubdivisionDetail = {
          iso2: 'TW',
          id: (feat.properties?.code || feat.properties?.postal || feat.id) as string,
          name: feat.properties?.name || '',
          nameEn: feat.properties?.name_en || feat.properties?.name || '',
          nameZh: feat.properties?.name_zh || feat.properties?.name || '',
          typeEn: feat.properties?.type_en || 'County',
          code: feat.properties?.code || '',
          postal: feat.properties?.postal || '',
          countryName: 'Taiwan',
          countryNameZh: '台灣',
          countryFlag: '🇹🇼'
        };
        setHoveredL2Subdivision(subDetail);
        setHoveredCountry(findCountry('TW') || null);
        setHoveredRoad(null);
        setHoveredInfoText(`🇹🇼 台灣 · ${subDetail.nameZh} (${subDetail.code || subDetail.name})`);
        placeTooltip(e.point.x, e.point.y);
      });

      map.on('mouseleave', 'tw-subdivisions-fill', () => {
        map.getCanvas().style.cursor = '';
        if (hoveredTwId !== null) {
          map.setFeatureState({ source: 'tw-subdivisions', id: hoveredTwId }, { hover: false });
          hoveredTwId = null;
        }
        setHoveredL2Subdivision(null);
        setHoveredInfoText(null);
      });

      let hoveredUsId: string | number | null = null;
      map.on('mousemove', 'us-states-fill', (e: MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        map.getCanvas().style.cursor = 'pointer';
        const feat = e.features[0] as MapGeoJSONFeature;
        if (hoveredUsId !== null) {
          map.setFeatureState({ source: 'us-states', id: hoveredUsId }, { hover: false });
        }
        hoveredUsId = feat.id !== undefined ? feat.id : null;
        if (hoveredUsId !== null) {
          map.setFeatureState({ source: 'us-states', id: hoveredUsId }, { hover: true });
        }

        const subDetail: L2SubdivisionDetail = {
          iso2: 'US',
          id: (feat.properties?.postal || feat.properties?.code || feat.id) as string,
          name: feat.properties?.name || '',
          nameEn: feat.properties?.name_en || feat.properties?.name || '',
          nameZh: feat.properties?.name_zh || feat.properties?.name || '',
          typeEn: feat.properties?.type_en || 'State',
          code: feat.properties?.code || '',
          postal: feat.properties?.postal || '',
          countryName: 'United States',
          countryNameZh: '美國',
          countryFlag: '🇺🇸'
        };
        setHoveredL2Subdivision(subDetail);
        setHoveredCountry(findCountry('US') || null);
        setHoveredRoad(null);
        setHoveredInfoText(`🇺🇸 美國 · ${subDetail.nameZh || subDetail.name} (${subDetail.postal || ''})`);
        placeTooltip(e.point.x, e.point.y);
      });

      map.on('mouseleave', 'us-states-fill', () => {
        map.getCanvas().style.cursor = '';
        if (hoveredUsId !== null) {
          map.setFeatureState({ source: 'us-states', id: hoveredUsId }, { hover: false });
          hoveredUsId = null;
        }
        setHoveredL2Subdivision(null);
        setHoveredInfoText(null);
      });

      // World Countries hover
      map.on('mousemove', 'world-countries-fill', (e: MapLayerMouseEvent) => {
        const topFeats = map.queryRenderedFeatures(e.point, {
          layers: ['tw-subdivisions-fill', 'us-states-fill']
        });
        if (topFeats.length > 0) return;

        if (!e.features || e.features.length === 0) return;
        map.getCanvas().style.cursor = 'pointer';
        const feat = e.features[0] as MapGeoJSONFeature;
        const cName = feat.properties?.name || '';
        const country = COUNTRIES_DATA.find(
          (c) => c.name === cName || c.iso2 === cName || c.nameZh === cName
        );
        if (country) {
          setHoveredCountry(country);
          setHoveredL2Subdivision(null);
          setHoveredRoad(null);
          setHoveredInfoText(`${country.flag || '🌍'} ${country.nameZh} (${country.name})`);
          placeTooltip(e.point.x, e.point.y);
          map.setFilter('world-countries-hover', ['==', ['get', 'name'], cName]);
          map.setFilter('world-countries-hover-border', ['==', ['get', 'name'], cName]);
        }
      });

      map.on('mouseleave', 'world-countries-fill', () => {
        map.getCanvas().style.cursor = '';
        setHoveredCountry(null);
        setHoveredInfoText(null);
        map.setFilter('world-countries-hover', ['==', ['get', 'name'], '']);
        map.setFilter('world-countries-hover-border', ['==', ['get', 'name'], '']);
      });

      // Taiwan Roads hover
      map.on('mousemove', 'tw-roads-core', (e: MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        map.getCanvas().style.cursor = 'pointer';
        const feat = e.features[0] as MapGeoJSONFeature;
        const roadObj: RoadPathData = {
          name: feat.properties?.name || '公路',
          number: feat.properties?.number || '',
          prefix: feat.properties?.prefix || '',
          type: feat.properties?.type || 'motorway',
          class: (feat.properties?.class || 'Interstate') as 'Interstate' | 'Federal',
          scalerank: feat.properties?.scalerank || 1,
          iso2: 'TW',
          bbox: [0, 0, 0, 0]
        };
        setHoveredRoad(roadObj);
        setHoveredInfoText(`🛣️ 🇹🇼 ${roadObj.name}`);
        placeTooltip(e.point.x, e.point.y);
      });

      map.on('mouseleave', 'tw-roads-core', () => {
        map.getCanvas().style.cursor = '';
        setHoveredRoad(null);
        setHoveredInfoText(null);
      });

      // US Roads hover
      map.on('mousemove', 'us-roads-core', (e: MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        map.getCanvas().style.cursor = 'pointer';
        const feat = e.features[0] as MapGeoJSONFeature;
        const roadObj: RoadPathData = {
          name: feat.properties?.name || 'Interstate',
          number: feat.properties?.number || '',
          prefix: feat.properties?.prefix || '',
          type: feat.properties?.type || 'motorway',
          class: (feat.properties?.class || 'Interstate') as 'Interstate' | 'Federal',
          scalerank: feat.properties?.scalerank || 1,
          iso2: 'US',
          bbox: [0, 0, 0, 0]
        };
        setHoveredRoad(roadObj);
        setHoveredInfoText(`🛣️ 🇺🇸 ${roadObj.name}`);
        placeTooltip(e.point.x, e.point.y);
      });

      map.on('mouseleave', 'us-roads-core', () => {
        map.getCanvas().style.cursor = '';
        setHoveredRoad(null);
        setHoveredInfoText(null);
      });

      // --- Click Handlers ---
      map.on('click', 'tw-subdivisions-fill', (e: MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0] as MapGeoJSONFeature;
        const subDetail: L2SubdivisionDetail = {
          iso2: 'TW',
          id: (feat.properties?.code || feat.properties?.postal || feat.id) as string,
          name: feat.properties?.name || '',
          nameEn: feat.properties?.name_en || feat.properties?.name || '',
          nameZh: feat.properties?.name_zh || feat.properties?.name || '',
          typeEn: feat.properties?.type_en || 'County',
          code: feat.properties?.code || '',
          postal: feat.properties?.postal || '',
          countryName: 'Taiwan',
          countryNameZh: '台灣',
          countryFlag: '🇹🇼'
        };
        onSelectCountryRef.current?.(findCountry('TW') || null);
        onSelectSubdivisionRef.current?.(subDetail);
      });

      map.on('click', 'us-states-fill', (e: MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0] as MapGeoJSONFeature;
        const subDetail: L2SubdivisionDetail = {
          iso2: 'US',
          id: (feat.properties?.postal || feat.properties?.code || feat.id) as string,
          name: feat.properties?.name || '',
          nameEn: feat.properties?.name_en || feat.properties?.name || '',
          nameZh: feat.properties?.name_zh || feat.properties?.name || '',
          typeEn: feat.properties?.type_en || 'State',
          code: feat.properties?.code || '',
          postal: feat.properties?.postal || '',
          countryName: 'United States',
          countryNameZh: '美國',
          countryFlag: '🇺🇸'
        };
        onSelectCountryRef.current?.(findCountry('US') || null);
        onSelectSubdivisionRef.current?.(subDetail);
      });

      map.on('click', 'world-countries-fill', (e: MapLayerMouseEvent) => {
        const topFeats = map.queryRenderedFeatures(e.point, {
          layers: ['tw-subdivisions-fill', 'us-states-fill']
        });
        if (topFeats.length > 0) return;

        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0] as MapGeoJSONFeature;
        const cName = feat.properties?.name || '';
        const country = COUNTRIES_DATA.find(
          (c) => c.name === cName || c.iso2 === cName || c.nameZh === cName
        );
        if (country) {
          onSelectCountryRef.current?.(country);
          onSelectSubdivisionRef.current?.(null);
          onSelectRoadRef.current?.(null);
        }
      });

      map.on('click', 'tw-roads-core', (e: MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0] as MapGeoJSONFeature;
        const roadObj: RoadPathData = {
          name: feat.properties?.name || '公路',
          number: feat.properties?.number || '',
          prefix: feat.properties?.prefix || '',
          type: feat.properties?.type || 'motorway',
          class: (feat.properties?.class || 'Interstate') as 'Interstate' | 'Federal',
          scalerank: feat.properties?.scalerank || 1,
          iso2: 'TW',
          bbox: [0, 0, 0, 0]
        };
        onSelectRoadRef.current?.(roadObj);
      });

      map.on('click', 'us-roads-core', (e: MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0] as MapGeoJSONFeature;
        const roadObj: RoadPathData = {
          name: feat.properties?.name || 'Interstate',
          number: feat.properties?.number || '',
          prefix: feat.properties?.prefix || '',
          type: feat.properties?.type || 'motorway',
          class: (feat.properties?.class || 'Interstate') as 'Interstate' | 'Federal',
          scalerank: feat.properties?.scalerank || 1,
          iso2: 'US',
          bbox: [0, 0, 0, 0]
        };
        onSelectRoadRef.current?.(roadObj);
      });

      // Synchronize regional layers initially
      syncVisibleRegionalFilters();
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      crossingMarkersRef.current.forEach((m) => m.remove());
      crossingMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [getInitialCamera, placeTooltip, syncVisibleRegionalFilters, isCountryRoadVisible, loadCountrySubdivisions, loadCountryRoads]);

  // Selected Country Outline effect
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer('world-countries-select')) return;
    if (selectedCountry?.name) {
      map.setFilter('world-countries-select', ['==', ['get', 'name'], selectedCountry.name]);
    } else {
      map.setFilter('world-countries-select', ['==', ['get', 'name'], '']);
    }
  }, [selectedCountry]);

  // When a country is selected, dynamically load its L2 subdivisions & roads if needed
  useEffect(() => {
    if (!selectedCountry) return;
    loadCountrySubdivisions(selectedCountry.iso2);
    if (isCountryRoadVisible(selectedCountry.iso2)) {
      loadCountryRoads(selectedCountry.iso2);
    }
  }, [selectedCountry, isCountryRoadVisible, loadCountrySubdivisions, loadCountryRoads]);

  // Load CSV layers on demand when activeFilterId or activeTextFilters change
  useEffect(() => {
    if (activeFilterId && activeFilterId !== 'base') {
      const csvF = getCsvLayerById(activeFilterId);
      if (csvF && !csvF.loaded) {
        void loadOnDemandCsvLayer(activeFilterId).then(() => {
          setCsvLoadedRev((v) => v + 1);
        });
      }
    }
    if (activeTextFilters && activeTextFilters.size > 0) {
      activeTextFilters.forEach((id) => {
        const csvF = getCsvLayerById(id);
        if (csvF && !csvF.loaded) {
          void loadOnDemandCsvLayer(id).then(() => {
            setCsvLoadedRev((v) => v + 1);
          });
        }
      });
    }
    if (activeInternationalImageFilter) {
      const csvF = getCsvLayerById(activeInternationalImageFilter);
      if (csvF && !csvF.loaded) {
        void loadOnDemandCsvLayer(activeInternationalImageFilter).then(() => {
          setCsvLoadedRev((v) => v + 1);
        });
      }
    }
  }, [activeFilterId, activeTextFilters, activeInternationalImageFilter]);

  // Update layer fill color dynamically from active CSV layer & nationwide capital
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer('world-countries-fill')) return;

    const isCapitalFilterActive = activeRegionalFilters.has('nationwide-capital');

    if (activeFilterId && activeFilterId !== 'base' && activeFilterDef) {
      const matchExpr: unknown[] = ['match', ['get', 'name']];
      let hasRule = false;
      for (const country of COUNTRIES_DATA) {
        const color = activeFilterDef.getColor(country);
        if (color) {
          matchExpr.push(country.name, color);
          if (country.nameZh && country.nameZh !== country.name) {
            matchExpr.push(country.nameZh, color);
          }
          hasRule = true;
        }
      }
      matchExpr.push('#232a38'); // default fallback color

      if (hasRule) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.setPaintProperty('world-countries-fill', 'fill-color', matchExpr as any);
      } else {
        map.setPaintProperty('world-countries-fill', 'fill-color', '#232a38');
      }

      // Also update any dynamic L2 layer colors
      activeL2LayerIdsRef.current.forEach((sourceId) => {
        const fillLayerId = `${sourceId}-fill`;
        if (map.getLayer(fillLayerId)) {
          const iso2 = sourceId.replace('l2-', '').replace('-subdivisions', '').replace('-states', '').toUpperCase();
          const subMatchExpr: unknown[] = ['match', ['coalesce', ['get', 'postal'], ['get', 'code'], ['get', 'id'], '']];
          let hasSubRule = false;
          const cMeta = findCountry(iso2);
          const cColor = cMeta ? activeFilterDef.getColor(cMeta) : null;
          const fallbackCol = isCapitalFilterActive ? 'rgba(20, 26, 38, 0.75)' : cColor || '#232a38';

          if (isCapitalFilterActive) {
            const capitalCandidates = ['DC', '63000', '13', 'IDF', 'BE', 'LDN', 'ACT', 'DF', 'DL', '11000', 'RM', 'MD'];
            capitalCandidates.forEach((code) => {
              if (isCapitalSubdivision(iso2, { id: code, code, postal: code })) {
                subMatchExpr.push(code, '#f59e0b');
                hasSubRule = true;
              }
            });
          }

          ['CA', 'NY', 'TX', 'FL', '01', '02', '63000', '64000', '65000', '66000', '67000', '68000'].forEach((subId) => {
            const val = getCsvSubdivisionValue(activeFilterId, { iso2, id: subId, code: subId, postal: subId });
            if (val) {
              const matched = activeFilterDef.legend?.find((item) => String(item.key) === String(val));
              if (matched) {
                subMatchExpr.push(subId, matched.color);
                hasSubRule = true;
              }
            }
          });
          subMatchExpr.push(fallbackCol);

          if (hasSubRule) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            map.setPaintProperty(fillLayerId, 'fill-color', subMatchExpr as any);
          } else {
            map.setPaintProperty(fillLayerId, 'fill-color', fallbackCol);
          }
        }
      });
    } else {
      map.setPaintProperty('world-countries-fill', 'fill-color', '#232a38');
      activeL2LayerIdsRef.current.forEach((sourceId) => {
        const fillLayerId = `${sourceId}-fill`;
        if (map.getLayer(fillLayerId)) {
          const iso2 = sourceId.replace('l2-', '').replace('-subdivisions', '').replace('-states', '').toUpperCase();
          if (isCapitalFilterActive) {
            const subMatchExpr: unknown[] = ['match', ['coalesce', ['get', 'postal'], ['get', 'code'], ['get', 'id'], '']];
            let hasCapital = false;
            const capitalCandidates = ['DC', '63000', '13', 'IDF', 'BE', 'LDN', 'ACT', 'DF', 'DL', '11000', 'RM', 'MD'];
            capitalCandidates.forEach((code) => {
              if (isCapitalSubdivision(iso2, { id: code, code, postal: code })) {
                subMatchExpr.push(code, '#f59e0b');
                hasCapital = true;
              }
            });
            subMatchExpr.push('rgba(20, 26, 38, 0.75)');
            if (hasCapital) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              map.setPaintProperty(fillLayerId, 'fill-color', subMatchExpr as any);
            } else {
              map.setPaintProperty(fillLayerId, 'fill-color', 'rgba(20, 26, 38, 0.75)');
            }
          } else {
            map.setPaintProperty(fillLayerId, 'fill-color', '#232a38');
          }
        }
      });
    }
  }, [activeFilterId, activeFilterDef, activeRegionalFilters, csvLoadedRev]);

  // Update Global Text Badges overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('global-text-badges') as { setData: (data: unknown) => void } | undefined;
    if (!source) return;

    if (!activeTextFilters || activeTextFilters.size === 0) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const features: Array<{
      type: 'Feature';
      geometry: { type: 'Point'; coordinates: [number, number] };
      properties: { text: string; name: string };
    }> = [];

    for (const country of COUNTRIES_DATA) {
      const text = getCombinedTextOverlay(country, activeTextFilters);
      if (!text) continue;

      const coords = COUNTRY_LABEL_CENTROIDS_LL[country.iso2];
      if (coords) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: coords
          },
          properties: {
            text,
            name: country.name
          }
        });
      }
    }

    source.setData({
      type: 'FeatureCollection',
      features
    });
  }, [activeTextFilters, csvLoadedRev]);

  // Update Domestic Area Code Badges overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('area-code-badges') as { setData: (data: unknown) => void } | undefined;
    if (!source) return;

    const isAreaCodeActive = Array.from(activeRegionalFilters).some(
      (f) => f.includes('area-code') || f.includes('area-codes')
    );

    if (!isAreaCodeActive) {
      source.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    const features: Array<{
      type: 'Feature';
      geometry: { type: 'Point'; coordinates: [number, number] };
      properties: { code: string };
    }> = [];

    // Check US area codes
    if (activeRegionalFilters.has('nationwide-area-code-us') || activeRegionalFilters.has('area-codes-us') || activeRegionalFilters.has('us-area-codes')) {
      const usStatesGeo = map.getSource('us-states') as { _data?: { features?: MapGeoJSONFeature[] } } | undefined;
      const rawFeats = usStatesGeo?._data?.features;
      if (rawFeats) {
        for (const feat of rawFeats) {
          const code = getCsvSubdivisionCode('us-area-codes', {
            iso2: 'US',
            id: (feat.properties?.postal || feat.properties?.code) as string
          });
          if (code) {
            const coords = (feat.geometry as { coordinates?: number[][][] })?.coordinates?.[0]?.[0] as [number, number] | undefined;
            if (coords) {
              features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: coords },
                properties: { code }
              });
            }
          }
        }
      }
    }

    // Check Taiwan area codes
    if (activeRegionalFilters.has('tw-area-codes')) {
      const twSubGeo = map.getSource('tw-subdivisions') as { _data?: { features?: MapGeoJSONFeature[] } } | undefined;
      const rawFeats = twSubGeo?._data?.features;
      if (rawFeats) {
        for (const feat of rawFeats) {
          const code = getCsvSubdivisionCode('tw-area-codes', {
            iso2: 'TW',
            id: (feat.properties?.postal || feat.properties?.code) as string,
            name: feat.properties?.name || ''
          });
          if (code) {
            const coords = (feat.geometry as { coordinates?: number[][][] })?.coordinates?.[0]?.[0] as [number, number] | undefined;
            if (coords) {
              features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: coords },
                properties: { code }
              });
            }
          }
        }
      }
    }

    source.setData({
      type: 'FeatureCollection',
      features
    });
  }, [activeRegionalFilters, csvLoadedRev]);

  // Update Pedestrian Crossing Sign Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old crossing markers
    crossingMarkersRef.current.forEach((m) => m.remove());
    crossingMarkersRef.current = [];

    const isCrossingActive =
      activeInternationalImageFilter === 'pedestrian-crossing' ||
      activeInternationalImageFilter === 'eu-pedestrian-crossing' ||
      activeRegionalFilters.has('eu-pedestrian-crossing') ||
      activeRegionalFilters.has('pedestrian-crossing');

    if (!isCrossingActive) return;

    for (const country of COUNTRIES_DATA) {
      const sign = getCrossingSign(country.iso2);
      if (!sign || !sign.imagePath) continue;

      const coords = COUNTRY_LABEL_CENTROIDS_LL[country.iso2];
      if (!coords) continue;

      const el = document.createElement('div');
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.cursor = 'pointer';
      el.style.borderRadius = '4px';
      el.style.backgroundImage = `url(${getDataUrl(sign.imagePath)})`;
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundPosition = 'center';
      el.title = `${country.nameZh}: ${sign.nameZh}`;

      const marker = new Marker({ element: el }).setLngLat(coords).addTo(map);
      crossingMarkersRef.current.push(marker);
    }
  }, [activeInternationalImageFilter, activeRegionalFilters, csvLoadedRev]);

  // Update road visibility and class filters
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const updateCountryRoads = (iso2: string, casingId: string, coreId: string) => {
      const upper = iso2.toUpperCase();
      const isInter = isCountryRoadClassActive(upper, 'Interstate');
      const isFed = isCountryRoadClassActive(upper, 'Federal');
      const isVis = isInter || isFed;

      if (map.getLayer(casingId)) {
        map.setLayoutProperty(casingId, 'visibility', isVis ? 'visible' : 'none');
        if (isVis) {
          if (isInter && !isFed) {
            map.setFilter(casingId, ['==', ['get', 'class'], 'Interstate']);
          } else if (isFed && !isInter) {
            map.setFilter(casingId, ['==', ['get', 'class'], 'Federal']);
          } else {
            map.setFilter(casingId, null);
          }
        }
      }
      if (map.getLayer(coreId)) {
        map.setLayoutProperty(coreId, 'visibility', isVis ? 'visible' : 'none');
        if (isVis) {
          if (isInter && !isFed) {
            map.setFilter(coreId, ['==', ['get', 'class'], 'Interstate']);
          } else if (isFed && !isInter) {
            map.setFilter(coreId, ['==', ['get', 'class'], 'Federal']);
          } else {
            map.setFilter(coreId, null);
          }
        }
      }
    };

    updateCountryRoads('TW', 'tw-roads-casing', 'tw-roads-core');
    updateCountryRoads('US', 'us-roads-casing', 'us-roads-core');

    loadedRoadCountriesRef.current.forEach((iso2) => {
      const src = `roads-${iso2.toLowerCase()}`;
      updateCountryRoads(iso2, `${src}-casing`, `${src}-core`);
    });

    // Auto-load road dataset if an active road layer is in activeRegionalFilters
    activeRegionalFilters.forEach((id) => {
      if (id.startsWith('roads-')) {
        const parts = id.split('-');
        if (parts[1]) {
          loadCountryRoads(parts[1].toUpperCase());
        }
      } else if (
        id === 'us-interstates' ||
        id === 'us-numbered-highways' ||
        id === 'roads-highways' ||
        id === 'roads-numbered'
      ) {
        loadCountryRoads('US');
      }
    });

    if (selectedRoad?.iso2) {
      loadCountryRoads(selectedRoad.iso2.toUpperCase());
    }
  }, [
    activeRegionalFilters,
    selectedRoad,
    showRoads,
    showInterstates,
    showNumberedRoutes,
    isCountryRoadClassActive,
    loadCountryRoads
  ]);

  // Synchronize focusMapRef for camera control
  useEffect(() => {
    if (!focusMapRef) return;

    focusMapRef.current = (target: MapFocusTarget) => {
      const map = mapRef.current;
      if (!map) return;

      if (target.kind === 'coordinates') {
        const z = target.ratio !== undefined ? Math.log2(target.ratio) + 2 : map.getZoom();
        map.flyTo({ center: [target.lon, target.lat], zoom: Math.max(1, z), speed: 1.4 });
      } else if (target.kind === 'country') {
        loadCountrySubdivisions(target.iso2);
        if (showRoads) loadCountryRoads(target.iso2);

        if (target.iso2 === 'TW') {
          map.flyTo({ center: [120.96, 23.7], zoom: 7.2, speed: 1.4 });
        } else if (target.iso2 === 'US') {
          map.flyTo({ center: [-98.58, 39.8], zoom: 4.2, speed: 1.4 });
        } else if (target.iso2 === 'JP') {
          map.flyTo({ center: [138.25, 36.2], zoom: 5.2, speed: 1.4 });
        } else {
          const coords = COUNTRY_LABEL_CENTROIDS_LL[target.iso2];
          if (coords) {
            map.flyTo({ center: coords, zoom: 4.8, speed: 1.4 });
          } else {
            const c = findCountry(target.iso2);
            if (c) map.flyTo({ zoom: 4.5, speed: 1.4 });
          }
        }
      } else if (target.kind === 'subdivision') {
        loadCountrySubdivisions(target.iso2);
        if (target.iso2 === 'TW') {
          map.flyTo({ center: [121.2, 24.9], zoom: 9.0, speed: 1.4 });
        } else if (target.iso2 === 'US') {
          map.flyTo({ center: [-120.5, 47.5], zoom: 6.5, speed: 1.4 });
        }
      } else if (target.kind === 'road') {
        map.fitBounds(
          [
            [target.bbox[0], target.bbox[1]],
            [target.bbox[2], target.bbox[3]]
          ],
          { padding: 40, speed: 1.4 }
        );
      }
    };

    if (zoomToSubdivisionRef) {
      zoomToSubdivisionRef.current = (iso2: string) => {
        focusMapRef.current?.({ kind: 'country', iso2 });
      };
    }

    return () => {
      focusMapRef.current = null;
      if (zoomToSubdivisionRef) zoomToSubdivisionRef.current = null;
    };
  }, [focusMapRef, zoomToSubdivisionRef, showRoads, loadCountrySubdivisions, loadCountryRoads]);

  // Initial target sync
  useEffect(() => {
    const target = initialTarget || initialFocusTarget;
    if (!target) return;
    const iso2 = target.includes('::') ? target.split('::')[0] : target;
    focusMapRef?.current?.({ kind: 'country', iso2, force: true });
  }, [initialTarget, initialFocusTarget, focusMapRef]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);
  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);
  const handleResetZoom = useCallback(() => {
    mapRef.current?.flyTo({ center: [0, 20], zoom: 1.5, speed: 1.4 });
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        backgroundColor: '#0a0d14'
      }}
    >
      {/* MapLibre WebGL Canvas Container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />

      {/* Center crosshair for touch devices */}
      {centerCursorEnabled && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 35,
            width: 12,
            height: 12,
            border: '2px solid #38bdf8',
            borderRadius: '50%',
            boxShadow: '0 0 6px #38bdf8'
          }}
        />
      )}

      {/* WebGL Error Prompt */}
      {mapError && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(239, 68, 68, 0.95)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14
          }}
        >
          <AlertTriangle size={18} />
          <span>WebGL 初始化提示：{mapError}</span>
        </div>
      )}

      {/* Dynamic Floating Hover Tooltip */}
      <MapTooltip
        setTooltipNode={setTooltipNode}
        hoveredRoad={hoveredRoad}
        hoveredCountry={hoveredCountry}
        hoveredMunicipality={hoveredMunicipality}
        hoveredL2Subdivision={hoveredL2Subdivision}
        hoveredExtFeature={null}
        activeRegionalFilters={activeRegionalFilters}
        isTouch={!hasFinePointer}
      />

      {/* Filter Legend Card */}
      <MapLegend
        activeFilterDef={activeFilterDef}
        isFilterExpanded={isFilterExpanded}
        activeTextFilters={activeTextFilters}
        activeInternationalImageFilter={activeInternationalImageFilter}
        isL2RegionMode={Boolean(selectedCountry || selectedSubdivision)}
        activeRegionalFilters={activeRegionalFilters}
        onToggleTextFilter={onToggleTextFilter}
        onToggleInternationalImageFilter={onToggleInternationalImageFilter}
        onToggleRegionalFilter={onToggleRegionalFilter}
      />

      {/* Bottom Center Hover Badge Info */}
      {hoveredInfoText && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 20px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.6)',
            borderRadius: 24,
            boxShadow: '0 8px 28px rgba(0,0,0,0.6), 0 0 16px rgba(56, 189, 248, 0.35)',
            color: '#f8fafc',
            fontSize: 13,
            fontWeight: 700,
            pointerEvents: 'none',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backdropFilter: 'blur(10px)'
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#38bdf8',
              boxShadow: '0 0 8px #38bdf8'
            }}
          />
          <span>{hoveredInfoText}</span>
        </div>
      )}

      {/* Top Right Live FPS & GPU Performance Metrics */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: (selectedCountry || selectedSubdivision || selectedMunicipality || selectedRoad)
            ? (detailPanelFullWidth ? 'max(16px, calc(100% - 240px))' : `min(${detailPanelWidth + 16}px, calc(100% - 240px))`)
            : 16,
          zIndex: 25,
          transition: 'right 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <PerformanceMonitorPanel
          title="實時 GPU 效能監測"
          badgeText="WebGL"
          perf={perf}
          zoom={zoom}
          center={center}
          extraMetrics={[
            { label: '渲染引擎', value: 'MapLibre GL' }
          ]}
          isStressTesting={isStressTesting}
          onToggleStressTest={toggleStressTest}
        />
      </div>

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
        onToggleCenterCursor={() => setCenterCursorEnabled((v) => !v)}
      />
    </div>
  );
};
