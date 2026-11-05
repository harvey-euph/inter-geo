import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Map,
  setWorkerUrl,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AlertTriangle } from 'lucide-react';
import type { CountryData } from '../types/geo';
import type { L2SubdivisionDetail, MunicipalityDetail } from '../types/lod';
import type { MapFocusTarget, MapSelectOptions, RoadPathData } from './WorldMap';
import type { LayerDefinition } from '../data/layers';
import type { NationwideLayerDef } from '../data/nationwideLayers';
import { findCountry, COUNTRIES_DATA } from '../data/countries';
import { getCsvLayerById, getCsvLayerValue } from '../layers/csvLayerRegistry';
import { MapTooltip } from '../map/MapTooltip';
import { MapLegend } from '../map/MapLegend';
import { MapControls } from '../map/MapControls';
import { PerformanceMonitorPanel, type PerformanceStats } from './PerformanceMonitorPanel';

// Explicitly register worker URL with absolute path resolving base URL
const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/inter-geo/';
const workerPath = `${baseUrl.replace(/\/+$/, '')}/assets/maplibre-gl-worker.mjs`;
setWorkerUrl(workerPath);

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
  onBackToCanvas?: () => void;
}

export const MapLibreMap: React.FC<MapLibreMapProps> = ({
  activeFilterId,
  activeTextFilters,
  onToggleTextFilter,
  activeInternationalImageFilter,
  onToggleInternationalImageFilter,
  activeRegionalFilters = new Set(),
  onToggleRegionalFilter,
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
  showRoads = true,
  showInterstates = true,
  showNumberedRoutes = true,
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

  useEffect(() => {
    onOceanClickRef.current = onOceanClick;
    onSelectCountryRef.current = onSelectCountry;
    onSelectSubdivisionRef.current = onSelectSubdivision;
    onSelectRoadRef.current = onSelectRoad;
  });
  const [hoveredCountry, setHoveredCountry] = useState<CountryData | null>(null);
  const [hoveredL2Subdivision, setHoveredL2Subdivision] = useState<L2SubdivisionDetail | null>(null);
  const [hoveredRoad, setHoveredRoad] = useState<RoadPathData | null>(null);
  const [hoveredInfoText, setHoveredInfoText] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const tooltipSizeRef = useRef({ width: 0, height: 0 });

  // Camera coordinates & FPS inspection
  const [zoom, setZoom] = useState(1.5);
  const [center, setCenter] = useState<[number, number]>([0, 20]);
  const [hasFinePointer] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
  const [centerCursorEnabled, setCenterCursorEnabled] = useState(!hasFinePointer);

  const [perf, setPerf] = useState<PerformanceStats>({
    fps: 60,
    minFps: 60,
    maxFps: 60,
    avgFps: 60,
    frameTime: 16.6
  });
  const [isStressTesting, setIsStressTesting] = useState(false);
  const stressRef = useRef<number | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(0);
  const perfRafIdRef = useRef<number | null>(null);

  // Active layer definition for MapLegend
  const activeFilterDef = useMemo<LayerDefinition>(() => {
    const csvF = getCsvLayerById(activeFilterId) || (activeFilterId === 'none' ? getCsvLayerById('base') : undefined);
    if (csvF) {
      const defaultCol =
        csvF.meta.defaultColor ||
        csvF.defaultColor ||
        ((csvF.meta as Record<string, unknown>)['default-color'] as string | undefined);

      const legend = csvF.legend?.map((item) => ({ key: item.key, color: item.color, labelZh: item.labelZh })) || [];

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
      getColor: () => null
    };
  }, [activeFilterId]);

  // Position floating tooltip
  const placeTooltip = useCallback((clientX: number, clientY: number, measure = false) => {
    const node = tooltipRef.current;
    if (!node) return;
    if (node.style.display !== 'flex') node.style.display = 'flex';
    if (!hasFinePointer) {
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
  }, [hasFinePointer]);

  const setTooltipNode = useCallback((node: HTMLDivElement | null) => {
    tooltipRef.current = node;
    if (!node) {
      tooltipSizeRef.current = { width: 0, height: 0 };
    }
  }, []);

  // Continuous RAF loop to monitor FPS
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

  // Initialize MapLibre
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

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
              'background-color': '#0b0f19'
            }
          }
        ]
      },
      center: [120.96, 23.7],
      zoom: 6.8,
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

    // Ocean click handler
    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point);
      const isMapFeature = features.some(
        (f) =>
          f.layer.id.startsWith('world-countries') ||
          f.layer.id.startsWith('tw-subdivisions') ||
          f.layer.id.startsWith('us-states') ||
          f.layer.id.startsWith('tw-roads') ||
          f.layer.id.startsWith('us-roads')
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
          'fill-color': '#1e293b',
          'fill-opacity': 0.88
        }
      });

      map.addLayer({
        id: 'world-countries-border',
        type: 'line',
        source: 'world-countries',
        paint: {
          'line-color': '#334155',
          'line-width': 1.2
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
        paint: {
          'fill-color': '#0ea5e9',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.55,
            0.18
          ]
        }
      });

      map.addLayer({
        id: 'tw-subdivisions-border',
        type: 'line',
        source: 'tw-subdivisions',
        paint: {
          'line-color': '#38bdf8',
          'line-width': 1.5,
          'line-dasharray': [2, 2]
        }
      });

      // 3. US States L2 Subdivisions
      map.addSource('us-states', {
        type: 'geojson',
        data: `${bUrl}/poc-data/us-states.geojson`
      });

      map.addLayer({
        id: 'us-states-fill',
        type: 'fill',
        source: 'us-states',
        paint: {
          'fill-color': '#10b981',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.5,
            0.16
          ]
        }
      });

      map.addLayer({
        id: 'us-states-border',
        type: 'line',
        source: 'us-states',
        paint: {
          'line-color': '#34d399',
          'line-width': 1.2
        }
      });

      // 4. Taiwan Roads (Dual-layer casing + core)
      map.addSource('tw-roads', {
        type: 'geojson',
        data: `${bUrl}/poc-data/tw-roads.geojson`
      });

      map.addLayer({
        id: 'tw-roads-casing',
        type: 'line',
        source: 'tw-roads',
        paint: {
          'line-color': '#0369a1',
          'line-width': 3.6
        }
      });

      map.addLayer({
        id: 'tw-roads-core',
        type: 'line',
        source: 'tw-roads',
        paint: {
          'line-color': '#38bdf8',
          'line-width': 1.8
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
        paint: {
          'line-color': '#7f1d1d',
          'line-width': 3.2
        }
      });

      map.addLayer({
        id: 'us-roads-core',
        type: 'line',
        source: 'us-roads',
        paint: {
          'line-color': '#ef4444',
          'line-width': 1.6
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
        }
      });

      map.on('mouseleave', 'world-countries-fill', () => {
        setHoveredCountry(null);
        setHoveredInfoText(null);
      });

      // Roads hover
      map.on('mousemove', 'tw-roads-casing', (e: MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const rName = feat.properties?.name || '公路';
        const roadObj: RoadPathData = {
          name: rName,
          class: (feat.properties?.class === 'Interstate' ? 'Interstate' : 'Federal'),
          number: feat.properties?.number || '',
          prefix: feat.properties?.prefix || '',
          type: feat.properties?.type || 'Unknown',
          scalerank: feat.properties?.scalerank || 1,
          iso2: 'TW',
          bbox: [0, 0, 0, 0]
        };
        setHoveredRoad(roadObj);
        setHoveredInfoText(`🛣️ 台灣路網: ${rName}`);
        placeTooltip(e.point.x, e.point.y);
      });

      map.on('mousemove', 'us-roads-casing', (e: MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const rName = feat.properties?.name || '公路';
        const roadObj: RoadPathData = {
          name: rName,
          class: (feat.properties?.class === 'Interstate' ? 'Interstate' : 'Federal'),
          number: feat.properties?.number || '',
          prefix: feat.properties?.prefix || '',
          type: feat.properties?.type || 'Unknown',
          scalerank: feat.properties?.scalerank || 1,
          iso2: 'US',
          bbox: [0, 0, 0, 0]
        };
        setHoveredRoad(roadObj);
        setHoveredInfoText(`🛣️ 美國路網: ${rName}`);
        placeTooltip(e.point.x, e.point.y);
      });

      // --- Click Interactions ---
      map.on('click', 'tw-subdivisions-fill', (e: MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const sub: L2SubdivisionDetail = {
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
        onSelectSubdivisionRef.current?.(sub);
      });

      map.on('click', 'us-states-fill', (e: MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const sub: L2SubdivisionDetail = {
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
        onSelectSubdivisionRef.current?.(sub);
      });

      // Road click
      map.on('click', 'tw-roads-casing', (e: MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const rName = feat.properties?.name || '公路';
        onSelectRoadRef.current?.({
          name: rName,
          class: feat.properties?.class === 'Interstate' ? 'Interstate' : 'Federal',
          number: feat.properties?.number || '',
          prefix: feat.properties?.prefix || '',
          type: feat.properties?.type || 'Unknown',
          scalerank: feat.properties?.scalerank || 1,
          iso2: 'TW',
          bbox: [0, 0, 0, 0]
        });
      });

      map.on('click', 'us-roads-casing', (e: MapLayerMouseEvent) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const rName = feat.properties?.name || '公路';
        onSelectRoadRef.current?.({
          name: rName,
          class: feat.properties?.class === 'Interstate' ? 'Interstate' : 'Federal',
          number: feat.properties?.number || '',
          prefix: feat.properties?.prefix || '',
          type: feat.properties?.type || 'Unknown',
          scalerank: feat.properties?.scalerank || 1,
          iso2: 'US',
          bbox: [0, 0, 0, 0]
        });
      });

      map.on('click', 'world-countries-fill', (e: MapLayerMouseEvent) => {
        const topFeats = map.queryRenderedFeatures(e.point, {
          layers: ['tw-subdivisions-fill', 'us-states-fill']
        });
        if (topFeats.length > 0) return;

        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const cName = feat.properties?.name || '';
        const country = COUNTRIES_DATA.find(
          (c) => c.name === cName || c.iso2 === cName || c.nameZh === cName
        );
        if (country) {
          onSelectCountryRef.current?.(country);
        }
      });
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
    };
  }, [placeTooltip]);

  // Update layer fill color dynamically from active CSV layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer('world-countries-fill')) return;

    if (activeFilterId && activeFilterId !== 'base' && activeFilterDef) {
      const matchExpr: unknown[] = ['match', ['get', 'name']];
      let hasRule = false;
      for (const country of COUNTRIES_DATA) {
        const color = activeFilterDef.getColor(country);
        if (color) {
          matchExpr.push(country.name, color);
          hasRule = true;
        }
      }
      matchExpr.push('#1e293b');

      if (hasRule) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.setPaintProperty('world-countries-fill', 'fill-color', matchExpr as any);
      } else {
        map.setPaintProperty('world-countries-fill', 'fill-color', '#1e293b');
      }
    } else {
      map.setPaintProperty('world-countries-fill', 'fill-color', '#1e293b');
    }
  }, [activeFilterId, activeFilterDef]);

  // Update road & region visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const setVis = (id: string, visible: boolean) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
      }
    };

    setVis('tw-roads-casing', showRoads);
    setVis('tw-roads-core', showRoads);
    setVis('us-roads-casing', showRoads);
    setVis('us-roads-core', showRoads);
  }, [showRoads, showInterstates, showNumberedRoutes]);

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
        if (target.iso2 === 'TW') {
          map.flyTo({ center: [120.96, 23.7], zoom: 7.2, speed: 1.4 });
        } else if (target.iso2 === 'US') {
          map.flyTo({ center: [-98.58, 39.8], zoom: 4.2, speed: 1.4 });
        } else if (target.iso2 === 'JP') {
          map.flyTo({ center: [138.25, 36.2], zoom: 5.2, speed: 1.4 });
        } else {
          const c = findCountry(target.iso2);
          if (c) {
            map.flyTo({ zoom: 4.5, speed: 1.4 });
          }
        }
      } else if (target.kind === 'subdivision') {
        if (target.iso2 === 'TW') {
          map.flyTo({ center: [121.2, 24.9], zoom: 9.0, speed: 1.4 });
        } else if (target.iso2 === 'US') {
          map.flyTo({ center: [-120.5, 47.5], zoom: 6.5, speed: 1.4 });
        }
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
  }, [focusMapRef, zoomToSubdivisionRef]);

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
        backgroundColor: '#0b0f19'
      }}
    >
      {/* MapLibre Canvas Container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Error alert toast if loading fails */}
      {mapError && (
        <div
          style={{
            position: 'absolute',
            top: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            backgroundColor: 'rgba(239, 68, 68, 0.95)',
            border: '1px solid #f87171',
            borderRadius: 8,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            zIndex: 100,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}
        >
          <AlertTriangle size={18} />
          <span>WebGL 地圖載入錯誤: {mapError}</span>
        </div>
      )}

      {/* Filter Legend Card */}
      <MapLegend
        activeFilterDef={activeFilterDef}
        isFilterExpanded={isFilterExpanded}
        activeTextFilters={activeTextFilters}
        activeInternationalImageFilter={activeInternationalImageFilter}
        isL2RegionMode={zoom >= 3.8}
        activeRegionalFilters={activeRegionalFilters}
        onToggleTextFilter={onToggleTextFilter}
        onToggleInternationalImageFilter={onToggleInternationalImageFilter}
        onToggleRegionalFilter={onToggleRegionalFilter}
      />

      {/* Dynamic Floating Hover Tooltip (漂浮資訊小卡) */}
      <MapTooltip
        setTooltipNode={setTooltipNode}
        hoveredRoad={hoveredRoad}
        hoveredCountry={hoveredCountry}
        hoveredMunicipality={selectedMunicipality || null}
        hoveredL2Subdivision={hoveredL2Subdivision}
        hoveredExtFeature={null}
        activeRegionalFilters={activeRegionalFilters}
        isTouch={!hasFinePointer}
      />

      {/* Bottom Center Hover Badge (下方地名文字框，可與漂浮小卡並存) */}
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
