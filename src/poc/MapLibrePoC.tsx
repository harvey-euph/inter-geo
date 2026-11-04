import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Map, setWorkerUrl, type MapGeoJSONFeature, type MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Layers,
  Activity,
  ArrowLeft,
  Play,
  Pause,
  AlertTriangle
} from 'lucide-react';

// Explicitly register worker URL with absolute path resolving base URL
const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/inter-geo/';
const workerPath = `${baseUrl.replace(/\/+$/, '')}/assets/maplibre-gl-worker.mjs`;
setWorkerUrl(workerPath);

interface MapLibrePoCProps {
  onBackToCanvas?: () => void;
}

interface PerformanceStats {
  fps: number;
  minFps: number;
  maxFps: number;
  avgFps: number;
  frameTime: number;
}

export const MapLibrePoC: React.FC<MapLibrePoCProps> = ({ onBackToCanvas }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  // Layer visibility state
  const [showCountries, setShowCountries] = useState(true);
  const [showSubdivisions, setShowSubdivisions] = useState(true);
  const [showRoads, setShowRoads] = useState(true);

  // Camera & inspection state
  const [zoom, setZoom] = useState(1.5);
  const [center, setCenter] = useState<[number, number]>([0, 20]);
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Performance monitoring
  const [perf, setPerf] = useState<PerformanceStats>({
    fps: 60,
    minFps: 60,
    maxFps: 60,
    avgFps: 60,
    frameTime: 16.6
  });

  const [isStressTesting, setIsStressTesting] = useState(false);
  const stressRef = useRef<number | null>(null);

  // Performance measurement refs
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

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

      rafIdRef.current = requestAnimationFrame(measure);
    };

    rafIdRef.current = requestAnimationFrame(measure);

    return () => {
      active = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // Initialize MapLibre
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dark canvas style definition matching Inter-Geo's slate aesthetic
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
      center: [120.96, 23.7], // Taiwan default
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

    // Ensure proper canvas dimension synchronization
    const handleResize = () => {
      map.resize();
    };
    window.addEventListener('resize', handleResize);

    map.on('move', () => {
      const c = map.getCenter();
      setCenter([Number(c.lng.toFixed(2)), Number(c.lat.toFixed(2))]);
      setZoom(Number(map.getZoom().toFixed(2)));
    });

    map.on('load', async () => {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/+$/, '');

      // 1. Add World Countries (L1)
      map.addSource('world-countries', {
        type: 'geojson',
        data: `${baseUrl}/poc-data/world-countries.geojson`
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

      // 2. Add Taiwan Subdivisions (L2)
      map.addSource('tw-subdivisions', {
        type: 'geojson',
        data: `${baseUrl}/poc-data/tw-subdivisions.geojson`,
        generateId: true
      });

      map.addLayer({
        id: 'tw-subdivisions-fill',
        type: 'fill',
        source: 'tw-subdivisions',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#38bdf8',
            '#0284c7'
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.65,
            0.35
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
          'line-opacity': 0.8
        }
      });

      // 3. Add Taiwan Roads (1D Network)
      map.addSource('tw-roads', {
        type: 'geojson',
        data: `${baseUrl}/poc-data/tw-roads.geojson`
      });

      // Road Casing (outer line)
      map.addLayer({
        id: 'tw-roads-casing',
        type: 'line',
        source: 'tw-roads',
        paint: {
          'line-color': '#0f172a',
          'line-width': 3.5,
          'line-opacity': 0.9
        }
      });

      // Road Core (colored line)
      map.addLayer({
        id: 'tw-roads-core',
        type: 'line',
        source: 'tw-roads',
        paint: {
          'line-color': '#f59e0b',
          'line-width': 2.0
        }
      });

      // 4. Add US States (L2)
      map.addSource('us-states', {
        type: 'geojson',
        data: `${baseUrl}/poc-data/us-states.geojson`,
        generateId: true
      });

      map.addLayer({
        id: 'us-states-fill',
        type: 'fill',
        source: 'us-states',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#10b981',
            '#059669'
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.5,
            0.25
          ]
        }
      });

      map.addLayer({
        id: 'us-states-border',
        type: 'line',
        source: 'us-states',
        paint: {
          'line-color': '#10b981',
          'line-width': 1.2,
          'line-opacity': 0.75
        }
      });

      // 5. Add US Highways (1D Network)
      map.addSource('us-roads', {
        type: 'geojson',
        data: `${baseUrl}/poc-data/us-roads.geojson`
      });

      map.addLayer({
        id: 'us-roads-casing',
        type: 'line',
        source: 'us-roads',
        paint: {
          'line-color': '#000000',
          'line-width': 2.6,
          'line-opacity': 0.85
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

      // Hover interaction for Taiwan
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
        setHoveredInfo(`🇹🇼 ${feat.properties?.name_zh || feat.properties?.name} (${feat.properties?.code || ''})`);
      });

      map.on('mouseleave', 'tw-subdivisions-fill', () => {
        map.getCanvas().style.cursor = '';
        if (hoveredTwId !== null) {
          map.setFeatureState({ source: 'tw-subdivisions', id: hoveredTwId }, { hover: false });
          hoveredTwId = null;
        }
        setHoveredInfo(null);
      });

      // Hover interaction for US
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
        setHoveredInfo(`🇺🇸 ${feat.properties?.name || 'US State'}`);
      });

      map.on('mouseleave', 'us-states-fill', () => {
        map.getCanvas().style.cursor = '';
        if (hoveredUsId !== null) {
          map.setFeatureState({ source: 'us-states', id: hoveredUsId }, { hover: false });
          hoveredUsId = null;
        }
        setHoveredInfo(null);
      });
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const setVis = (id: string, visible: boolean) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
      }
    };

    setVis('world-countries-fill', showCountries);
    setVis('world-countries-border', showCountries);
    setVis('tw-subdivisions-fill', showSubdivisions);
    setVis('tw-subdivisions-border', showSubdivisions);
    setVis('us-states-fill', showSubdivisions);
    setVis('us-states-border', showSubdivisions);
    setVis('tw-roads-casing', showRoads);
    setVis('tw-roads-core', showRoads);
    setVis('us-roads-casing', showRoads);
    setVis('us-roads-core', showRoads);
  }, [showCountries, showSubdivisions, showRoads]);

  // Camera presets
  const flyTo = useCallback((target: 'tw' | 'us' | 'world') => {
    const map = mapRef.current;
    if (!map) return;
    if (target === 'tw') {
      map.flyTo({ center: [120.96, 23.7], zoom: 7.2, speed: 1.4 });
    } else if (target === 'us') {
      map.flyTo({ center: [-98.58, 39.8], zoom: 4.2, speed: 1.4 });
    } else {
      map.flyTo({ center: [0, 20], zoom: 1.5, speed: 1.4 });
    }
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
      // Oscillate between Taiwan and East Asia with continuous zoom change
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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden', backgroundColor: '#0b0f19' }}>
      {/* MapLibre WebGL Canvas Container */}
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

      {/* Top Left Navigation & Mode Banner */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          zIndex: 10
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)'
          }}
        >
          {onBackToCanvas && (
            <button
              type="button"
              onClick={onBackToCanvas}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid #38bdf8',
                borderRadius: 8,
                color: '#38bdf8',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} /> 返回 Canvas 地圖
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 10px #10b981'
              }}
            />
            <span style={{ color: '#f8fafc', fontSize: 13, fontWeight: 700 }}>
              WebGL / MapLibre GL 渲染遷移 PoC
            </span>
          </div>
        </div>

        {/* Camera Quick Presets */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: '6px 10px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10
          }}
        >
          <button
            type="button"
            onClick={() => flyTo('world')}
            style={{
              padding: '4px 10px',
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: 6,
              color: '#cbd5e1',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🌍 全球
          </button>
          <button
            type="button"
            onClick={() => flyTo('tw')}
            style={{
              padding: '4px 10px',
              backgroundColor: 'rgba(56, 189, 248, 0.2)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: 6,
              color: '#38bdf8',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🇹🇼 台灣 (L2+Roads)
          </button>
          <button
            type="button"
            onClick={() => flyTo('us')}
            style={{
              padding: '4px 10px',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 6,
              color: '#10b981',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🇺🇸 美國 (L2+Roads)
          </button>
        </div>
      </div>

      {/* Top Right Live FPS & Hardware Metrics */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 10,
          minWidth: 220
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            color: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
              <Activity size={14} color="#38bdf8" /> 實時 GPU 效能監測
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: perf.avgFps >= 55 ? '#10b981' : perf.avgFps >= 30 ? '#f59e0b' : '#ef4444'
              }}
            >
              {perf.fps} <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>FPS</span>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, color: '#cbd5e1' }}>
            <div>平均: <strong style={{ color: '#38bdf8' }}>{perf.avgFps}</strong> FPS</div>
            <div>低標: <strong style={{ color: '#f43f5e' }}>{perf.minFps}</strong> FPS</div>
            <div>幀時間: <strong>{perf.frameTime}</strong> ms</div>
            <div>縮放: <strong>{zoom}</strong>x</div>
            <div style={{ gridColumn: 'span 2', fontSize: 10, color: '#94a3b8' }}>
              座標: [{center[0]}, {center[1]}]
            </div>
          </div>

          {/* Stress test button */}
          <button
            type="button"
            onClick={toggleStressTest}
            style={{
              marginTop: 10,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 12px',
              backgroundColor: isStressTesting ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              border: `1px solid ${isStressTesting ? '#ef4444' : '#10b981'}`,
              borderRadius: 8,
              color: isStressTesting ? '#ef4444' : '#10b981',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isStressTesting ? (
              <>
                <Pause size={12} /> 停止壓力巡航測試
              </>
            ) : (
              <>
                <Play size={12} /> 啟動動態連續縮放壓力測試
              </>
            )}
          </button>
        </div>

        {/* Layer Toggles */}
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            color: '#cbd5e1',
            fontSize: 11
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontWeight: 700, color: '#94a3b8' }}>
            <Layers size={13} /> 圖層開關 (Layer Toggles)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showCountries}
                onChange={(e) => setShowCountries(e.target.checked)}
              />
              <span>L1 全球國家輪廓 (177 國)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showSubdivisions}
                onChange={(e) => setShowSubdivisions(e.target.checked)}
              />
              <span>L2 一級行政區 (台/美)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showRoads}
                onChange={(e) => setShowRoads(e.target.checked)}
              />
              <span>1D 公路路網 (台/美雙層 Casing)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Bottom Center Hover Badge */}
      {hoveredInfo && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.6)',
            borderRadius: 20,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 16px rgba(56, 189, 248, 0.3)',
            color: '#f8fafc',
            fontSize: 13,
            fontWeight: 700,
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          {hoveredInfo}
        </div>
      )}
    </div>
  );
};
