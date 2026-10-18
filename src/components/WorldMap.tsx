import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
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
  selectedCountry: CountryData | null;
  onSelectCountry: (country: CountryData | null) => void;
  hoveredCountry: CountryData | null;
  setHoveredCountry: (country: CountryData | null) => void;
}

type GeoFeature = Feature<Geometry, { name: string }> & { id: string };

interface RegionPreset {
  nameZh: string;
  k: number;
  x: number;
  y: number;
}

const REGION_PRESETS: Record<string, RegionPreset> = {
  world: { nameZh: '全球', k: 1, x: 0, y: 0 },
  europe: { nameZh: '歐洲', k: 3.4, x: -750, y: 280 },
  asia: { nameZh: '亞洲', k: 2.2, x: -680, y: -20 },
  americas: { nameZh: '美洲', k: 1.5, x: 300, y: -30 },
  africa: { nameZh: '非洲', k: 2.0, x: -300, y: -120 },
  oceania: { nameZh: '大洋洲', k: 2.4, x: -1100, y: -450 }
};

export const WorldMap: React.FC<WorldMapProps> = ({
  activeFilterId,
  selectedCountry,
  onSelectCountry,
  hoveredCountry,
  setHoveredCountry
}) => {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState('world');

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Performance: keep pan/zoom transform entirely in ref to avoid re-rendering 240+ SVG paths during drag!
  const transformRef = useRef({ k: 1, x: 0, y: 0 });
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);

  // Active filter definition
  const activeFilterDef = useMemo<FilterDefinition>(() => {
    return FILTERS.find((f) => f.id === activeFilterId) || FILTERS[0];
  }, [activeFilterId]);

  // Apply GPU hardware-accelerated transform directly to the SVG group element
  const applyTransform = useCallback((animate = false) => {
    if (!gRef.current) return;
    const { k, x, y } = transformRef.current;
    if (animate) {
      gRef.current.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
    } else {
      gRef.current.style.transition = 'none';
    }
    gRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${k})`;
  }, []);

  // Load TopoJSON data - 110m is ultra-lightweight (107KB) and renders at 120 FPS
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

  // Initial transform apply when loaded
  useEffect(() => {
    if (!loading) {
      applyTransform(false);
    }
  }, [loading, applyTransform]);

  // Set up D3 Projection
  const width = 960;
  const height = 500;

  const projection = useMemo(() => {
    return geoNaturalEarth1()
      .scale(155)
      .translate([width / 2, height / 2 + 10]);
  }, [width, height]);

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

  // High Performance Mouse Pan Handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    hasDragged.current = false;
    dragStart.current = {
      x: e.clientX - transformRef.current.x,
      y: e.clientY - transformRef.current.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      const deltaX = Math.abs(e.clientX - (dragStart.current.x + transformRef.current.x));
      const deltaY = Math.abs(e.clientY - (dragStart.current.y + transformRef.current.y));
      if (deltaX > 3 || deltaY > 3) {
        hasDragged.current = true;
      }

      transformRef.current.x = e.clientX - dragStart.current.x;
      transformRef.current.y = e.clientY - dragStart.current.y;

      // Direct GPU transform via requestAnimationFrame - zero React re-render!
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          applyTransform(false);
          rafId.current = null;
        });
      }

      // Hide tooltip during active pan for smooth visuals
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none';
      }
      return;
    }

    // Direct DOM update for floating tooltip - zero React re-render on mouse movement!
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

  // High Performance Wheel Zoom (zooming towards mouse pointer)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { k, x, y } = transformRef.current;
    const newK = Math.min(Math.max(k * zoomFactor, 0.85), 14);
    const ratio = newK / k;

    const newX = mouseX - (mouseX - x) * ratio;
    const newY = mouseY - (mouseY - y) * ratio;

    transformRef.current = { k: newK, x: newX, y: newY };
    applyTransform(false);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 1.35 : 0.74;
    const { k, x, y } = transformRef.current;
    const newK = Math.min(Math.max(k * factor, 0.85), 14);

    const cx = width / 2;
    const cy = height / 2;
    const newX = cx - (cx - x) * (newK / k);
    const newY = cy - (cy - y) * (newK / k);

    transformRef.current = { k: newK, x: newX, y: newY };
    applyTransform(true);
  };

  const handleResetZoom = () => {
    transformRef.current = { k: 1, x: 0, y: 0 };
    setActiveRegion('world');
    applyTransform(true);
  };

  const handleSelectRegion = (key: string) => {
    const preset = REGION_PRESETS[key];
    if (!preset) return;
    setActiveRegion(key);
    transformRef.current = { k: preset.k, x: preset.x, y: preset.y };
    applyTransform(true);
  };

  // Color fill resolver
  const getCountryFill = useCallback(
    (countryMeta: CountryData | undefined, isHovered: boolean, isSelected: boolean) => {
      if (isHovered) return '#38bdf8';
      if (isSelected) return '#f59e0b';

      if (!countryMeta) {
        return '#1a1f2b'; // Dark neutral for territories without official Street View
      }

      const filterColor = activeFilterDef.getColor(countryMeta);
      return filterColor || '#232a38';
    },
    [activeFilterDef]
  );

  return (
    <div
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
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Deep Ocean Backdrop */}
          <rect width={width} height={height} fill="#0b0e14" />

          {/* Map Group with Direct GPU CSS Transform */}
          <g
            ref={gRef}
            style={{
              transformOrigin: '0 0',
              willChange: 'transform'
            }}
          >
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
                  key={id || name}
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
        </svg>
      )}

      {/* Floating Hover Tooltip with direct DOM ref positioning */}
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
      <div className="filter-legend-card">
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
