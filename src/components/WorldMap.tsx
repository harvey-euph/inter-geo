import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import * as topojson from 'topojson-client';
import type { Topology, Objects } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import { ZoomIn, ZoomOut, RotateCcw, Compass } from 'lucide-react';
import type { CountryData } from '../types/geo';
import { FILTERS } from '../data/filters';
import type { FilterDefinition } from '../data/filters';
import { findCountry } from '../data/countries';

interface WorldMapProps {
  activeFilterId: string;
  isFilterExpanded?: boolean;
  selectedCountry: CountryData | null;
  onSelectCountry: (country: CountryData | null) => void;
  hoveredCountry: CountryData | null;
  setHoveredCountry: (country: CountryData | null) => void;
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

export const WorldMap: React.FC<WorldMapProps> = ({
  activeFilterId,
  isFilterExpanded = false,
  selectedCountry,
  onSelectCountry,
  hoveredCountry,
  setHoveredCountry
}) => {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState('world');

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

  // Pre-calculate paths and map country data
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

  // Load TopoJSON data
  useEffect(() => {
    let isMounted = true;
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
        console.error('Map loading error:', err);
      });

    return () => {
      isMounted = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // ResizeObserver to detect container dimensions and clamp/scale appropriately
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          viewportSize.current = { w: width, h: height };

          // Minimum zoom required to vertically cover the container with zero vertical empty space
          const kMin = height / MAP_H;
          const currentK = transformRef.current.k;
          const newK = Math.max(currentK, kMin);
          transformRef.current.k = newK;

          // Clamp Y strictly
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

      // Center horizontally on Europe/Africa meridian, vertically centered in bounds
      const initialX = wrapX(vw / 2 - (MAP_W / 2) * initialK, initialK);
      const initialY = clampY((vh - MAP_H * initialK) / 2, initialK, vh);

      transformRef.current.x = initialX;
      transformRef.current.y = initialY;
      applyTransform(false);
    }
  }, [loading, wrapX, clampY, applyTransform]);

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

  // Wheel zoom centered on mouse pointer
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
        setHoveredCountry(null);
        if (tooltipRef.current) {
          tooltipRef.current.style.display = 'none';
        }
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
          <span style={{ color: 'var(--text-secondary)' }}>正在載入世界向量地圖...</span>
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
            <rect x={-2 * MAP_W} y={0} width={7 * MAP_W} height={MAP_H} fill="#0b0e14" />

            {/* Continuous periodic world copies */}
            {WORLD_COPIES.map((copyIdx) => (
              <g key={copyIdx} transform={`translate(${copyIdx * MAP_W}, 0)`}>
                {countryPathData.map(({ pathD, countryMeta, id, name }) => {
                  if (!pathD) return null;

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
                      onMouseEnter={() => {
                        if (isDragging.current) return;
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
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Prevent accidental click when dragging/panning
                        if (hasDragged.current) return;
                        if (countryMeta) {
                          onSelectCountry(countryMeta);
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

      {/* Floating Hover Tooltip */}
      {hoveredCountry && (
        <div ref={tooltipRef} className="map-tooltip">
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
        </div>
      )}

      {/* Filter Legend Card */}
      <div className={`filter-legend-card ${isFilterExpanded ? 'with-filter-bar' : ''}`}>
        <div className="legend-title">
          <Compass size={14} color="#38bdf8" />
          <span>{activeFilterDef.nameZh}</span>
        </div>
        <div className="legend-items-list">
          {activeFilterDef.legend.map((item) => (
            <div key={item.key} className="legend-item-row">
              <span className="legend-color-dot" style={{ backgroundColor: item.color }} />
              <span>{item.labelZh}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Region Presets Toolbar */}
      <div className="region-presets-bar">
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

      {/* Zoom / Map Controls */}
      <div className="map-controls-panel">
        <button
          className="map-control-btn"
          onClick={() => handleZoom('in')}
          title="放大 (或滾輪向前)"
        >
          <ZoomIn size={18} />
        </button>
        <button
          className="map-control-btn"
          onClick={() => handleZoom('out')}
          title="縮小 (或滾輪向後)"
        >
          <ZoomOut size={18} />
        </button>
        <button
          className="map-control-btn"
          onClick={handleResetZoom}
          title="重設全圖視角"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
};
