import React, { useState, useCallback, useMemo } from 'react';
import { List, ChevronUp } from 'lucide-react';
import type { LayerDefinition } from '../data/layers';
import { getGlobalTextLayerById, GLOBAL_TEXT_LAYERS_BY_ID } from '../data/globalLayers';
import { getNationwideLayerById, NATIONWIDE_LAYERS_BY_ID } from '../data/nationwideLayers';
import { getCsvLayerById } from '../layers/csvLayerRegistry';

export interface MapLegendProps {
  activeFilterDef: LayerDefinition;
  isFilterExpanded?: boolean;
  activeTextFilters?: Set<string>;
  activeInternationalImageFilter?: string | null;
  isL2RegionMode?: boolean;
  activeRegionalFilters?: Set<string>;
  showInterstates?: boolean;
  onToggleInterstates?: () => void;
  showNumberedRoutes?: boolean;
  onToggleNumberedRoutes?: () => void;
  onToggleTextFilter?: (filterId: string) => void;
  onToggleInternationalImageFilter?: (filterId: string) => void;
  onToggleRegionalFilter?: (filterId: string) => void;
}

interface AreaFeatureLegendItem {
  id: string;
  nameZh: string;
  shortBadge: string;
  accentColor: string;
  isActive: boolean;
  onToggle: () => void;
  legend?: Array<{ key: string; color: string; labelZh: string }>;
  descriptionZh?: string;
}

const MapLegendComponent: React.FC<MapLegendProps> = ({
  activeFilterDef,
  isFilterExpanded = false,
  activeTextFilters,
  activeInternationalImageFilter,
  activeRegionalFilters,
  showInterstates = false,
  onToggleInterstates,
  showNumberedRoutes = false,
  onToggleNumberedRoutes,
  onToggleTextFilter,
  onToggleInternationalImageFilter,
  onToggleRegionalFilter
}) => {
  const [collapsed, setCollapsed] = useState(false);

  // Dimmed / commented-out tags that remain in the legend until collapsed
  const [dimmedTextFilters, setDimmedTextFilters] = useState<Set<string>>(new Set());
  const [dimmedRegionalFilters, setDimmedRegionalFilters] = useState<Set<string>>(new Set());
  const [dimmedRoadFilters, setDimmedRoadFilters] = useState<Set<string>>(new Set());

  // Prune dimmed tags whenever legend is collapsed (收縮)
  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      if (next) {
        setDimmedTextFilters(new Set());
        setDimmedRegionalFilters(new Set());
        setDimmedRoadFilters(new Set());
      }
      return next;
    });
  }, []);

  const isBase = activeFilterDef.id === 'none' || activeFilterDef.id === 'base';

  // Compute merged list of active + dimmed global text filter IDs
  const textPillIds = useMemo(() => {
    const list: string[] = [];
    if (activeTextFilters) {
      for (const id of activeTextFilters) {
        list.push(id);
      }
    }
    for (const id of dimmedTextFilters) {
      if (!list.includes(id)) {
        list.push(id);
      }
    }
    return list;
  }, [activeTextFilters, dimmedTextFilters]);

  const handleToggleTextPill = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleTextFilter) return;
    const isActive = Boolean(activeTextFilters?.has(id));
    if (isActive) {
      onToggleTextFilter(id);
      setDimmedTextFilters((prev) => new Set(prev).add(id));
    } else {
      onToggleTextFilter(id);
      setDimmedTextFilters((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Compile unified list of Area Feature items (roads, crossings, regional code grids, power poles, etc.)
  const areaFeatureList = useMemo<AreaFeatureLegendItem[]>(() => {
    const items: AreaFeatureLegendItem[] = [];

    // 1. National Highways & Interstates
    const isInterstatesActive = Boolean(showInterstates);
    const isInterstatesDimmed = dimmedRoadFilters.has('roads-highways');
    if (isInterstatesActive || isInterstatesDimmed) {
      items.push({
        id: 'roads-highways',
        nameZh: '國道 / 主要高速公路網',
        shortBadge: '🛣️ 國道',
        accentColor: '#ef4444',
        isActive: isInterstatesActive,
        onToggle: () => {
          onToggleInterstates?.();
          if (isInterstatesActive) {
            setDimmedRoadFilters((prev) => new Set(prev).add('roads-highways'));
          } else {
            setDimmedRoadFilters((prev) => {
              const next = new Set(prev);
              next.delete('roads-highways');
              return next;
            });
          }
        },
        legend: [{ key: 'highway', color: '#ef4444', labelZh: '國道 / 主要高速公路' }]
      });
    }

    // 2. Numbered Routes / Provincial Roads
    const isNumberedActive = Boolean(showNumberedRoutes);
    const isNumberedDimmed = dimmedRoadFilters.has('roads-numbered');
    if (isNumberedActive || isNumberedDimmed) {
      items.push({
        id: 'roads-numbered',
        nameZh: '省道 / 編號道路',
        shortBadge: '🛤️ 省道',
        accentColor: '#3b82f6',
        isActive: isNumberedActive,
        onToggle: () => {
          onToggleNumberedRoutes?.();
          if (isNumberedActive) {
            setDimmedRoadFilters((prev) => new Set(prev).add('roads-numbered'));
          } else {
            setDimmedRoadFilters((prev) => {
              const next = new Set(prev);
              next.delete('roads-numbered');
              return next;
            });
          }
        },
        legend: [{ key: 'numbered', color: '#3b82f6', labelZh: '省道 / 一級編號道路' }]
      });
    }

    // 3. European Pedestrian Crossing Signs
    const isCrossingActive = Boolean(
      activeInternationalImageFilter === 'pedestrian-crossing' ||
      activeInternationalImageFilter === 'eu-pedestrian-crossing' ||
      activeRegionalFilters?.has('eu-pedestrian-crossing') ||
      activeRegionalFilters?.has('pedestrian-crossing')
    );
    const isCrossingDimmed = dimmedRegionalFilters.has('pedestrian-crossing') || dimmedRegionalFilters.has('eu-pedestrian-crossing');
    if (isCrossingActive || isCrossingDimmed) {
      items.push({
        id: 'pedestrian-crossing',
        nameZh: '歐洲行人過路標誌',
        shortBadge: '🚸 行人',
        accentColor: '#38bdf8',
        isActive: isCrossingActive,
        onToggle: () => {
          if (onToggleRegionalFilter) {
            onToggleRegionalFilter('pedestrian-crossing');
          } else if (onToggleInternationalImageFilter) {
            onToggleInternationalImageFilter('pedestrian-crossing');
          }
          if (isCrossingActive) {
            setDimmedRegionalFilters((prev) => new Set(prev).add('pedestrian-crossing'));
          } else {
            setDimmedRegionalFilters((prev) => {
              const next = new Set(prev);
              next.delete('pedestrian-crossing');
              next.delete('eu-pedestrian-crossing');
              return next;
            });
          }
        },
        legend: [{ key: 'pedestrian', color: '#38bdf8', labelZh: '歐洲各國行人穿越道告示（斑馬線特徵）' }]
      });
    }

    // 4. Other active / dimmed regional layers
    const allRegionalIds = new Set<string>();
    if (activeRegionalFilters) {
      for (const id of activeRegionalFilters) {
        if (id !== 'pedestrian-crossing' && id !== 'eu-pedestrian-crossing') {
          allRegionalIds.add(id);
        }
      }
    }
    for (const id of dimmedRegionalFilters) {
      if (id !== 'pedestrian-crossing' && id !== 'eu-pedestrian-crossing') {
        allRegionalIds.add(id);
      }
    }

    for (const id of allRegionalIds) {
      const csvLayer = getCsvLayerById(id);
      const nwLayer = getNationwideLayerById(id) || NATIONWIDE_LAYERS_BY_ID.get(id);
      if (!csvLayer && !nwLayer) continue;

      const isActive = Boolean(activeRegionalFilters?.has(id));
      const nameZh = csvLayer?.nameZh || nwLayer?.nameZh || id;
      const shortBadge = csvLayer?.shortBadge || nwLayer?.shortBadge || '';
      const accentColor = csvLayer?.accentColor || nwLayer?.activeColor || '#10b981';
      const descriptionZh = csvLayer?.descriptionZh || nwLayer?.descriptionZh;

      let legend: Array<{ key: string; color: string; labelZh: string }> | undefined;
      if (csvLayer?.legend && csvLayer.legend.length > 0) {
        legend = csvLayer.legend;
      } else if (id === 'nationwide-capital') {
        legend = [{ key: 'capital', color: '#f59e0b', labelZh: '首都所在行政區' }];
      } else if (csvLayer?.type === 'ExtObject' || id.includes('area-codes') || id.includes('ddd-codes')) {
        legend = [{ key: id, color: accentColor, labelZh: `${nameZh}` }];
      } else if (csvLayer?.data?.rows?.length) {
        const seenColors = new Set<string>();
        const list: Array<{ key: string; color: string; labelZh: string }> = [];
        for (const row of csvLayer.data.rows) {
          const c = String(row.color || row.value || '').trim();
          if (c && !seenColors.has(c)) {
            seenColors.add(c);
            list.push({ key: c, color: c, labelZh: String(row.label || row.value || c) });
          }
        }
        if (list.length > 0) legend = list;
      } else {
        legend = [{ key: id, color: accentColor, labelZh: descriptionZh || nameZh }];
      }

      items.push({
        id,
        nameZh,
        shortBadge,
        accentColor,
        isActive,
        onToggle: () => {
          if (!onToggleRegionalFilter) return;
          onToggleRegionalFilter(id);
          if (isActive) {
            setDimmedRegionalFilters((prev) => new Set(prev).add(id));
          } else {
            setDimmedRegionalFilters((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        },
        legend,
        descriptionZh
      });
    }

    return items;
  }, [
    showInterstates,
    showNumberedRoutes,
    activeInternationalImageFilter,
    activeRegionalFilters,
    dimmedRegionalFilters,
    dimmedRoadFilters,
    onToggleInterstates,
    onToggleNumberedRoutes,
    onToggleInternationalImageFilter,
    onToggleRegionalFilter
  ]);

  return (
    <div
      className={`filter-legend-card ${isFilterExpanded ? 'with-filter-bar' : ''} ${
        collapsed ? 'is-collapsed' : ''
      }`}
    >
      <button
        type="button"
        className="legend-title legend-toggle"
        onClick={handleToggleCollapse}
        aria-expanded={!collapsed}
        aria-label={collapsed ? '展開圖例' : '收合圖例'}
        title={collapsed ? '展開圖例' : '收合圖例'}
      >
        <span className="legend-toggle-icon" aria-hidden>
          <List size={16} />
        </span>
        {!collapsed && (
          <>
            <span className="legend-title-text">{activeFilterDef.nameZh}</span>
            <span className="legend-chevron-icon" aria-hidden>
              <ChevronUp size={13} />
            </span>
          </>
        )}
      </button>

      {!collapsed && (
        <>
          {/* Base Layer Legend */}
          {activeFilterDef.legend.length > 0 ? (
            <div className="legend-items-list legend-items">
              {activeFilterDef.legend.map((item) => (
                <div key={item.key} className="legend-item-row legend-item">
                  <span className="legend-color-dot" style={{ backgroundColor: item.color }} />
                  <span className="legend-label">{item.labelZh}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="legend-empty-hint">
              {isBase && areaFeatureList.length === 0 && textPillIds.length === 0
                ? '預設草圖底圖風格（未選取著色圖層）'
                : (activeFilterDef.descriptionZh || '著色底圖：基礎風格')}
            </div>
          )}

          {/* Section 1: Global Overlay Labels */}
          {textPillIds.length > 0 && (
            <div className="legend-text-overlays-section">
              <div className="legend-divider" />
              <div className="legend-text-overlays-header">
                <span>全域標籤：</span>
              </div>
              <div className="legend-text-overlays-pills">
                {textPillIds.map((id) => {
                  const tf = getGlobalTextLayerById(id) || GLOBAL_TEXT_LAYERS_BY_ID.get(id) || getCsvLayerById(id);
                  if (!tf) return null;
                  const isActive = Boolean(activeTextFilters?.has(id));
                  const accent = tf.accentColor || '#38bdf8';
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`legend-text-pill ${!isActive ? 'is-dimmed' : ''}`}
                      onClick={(e) => handleToggleTextPill(id, e)}
                      title={isActive ? `已啟用：${tf.nameZh} (點擊停用)` : `已停用：${tf.nameZh} (點擊重新啟用)`}
                      style={
                        isActive
                          ? {
                              borderColor: accent,
                              color: accent,
                              backgroundColor: `${accent}18`
                            }
                          : undefined
                      }
                    >
                      {tf.shortBadge || tf.nameZh}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Area Features (區域特徵) */}
          {areaFeatureList.length > 0 && (
            <div className="legend-text-overlays-section">
              <div className="legend-divider" />
              <div className="legend-text-overlays-header">
                <span>區域特徵：</span>
              </div>
              <div className="legend-text-overlays-pills">
                {areaFeatureList.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`legend-text-pill ${!item.isActive ? 'is-dimmed' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onToggle();
                    }}
                    title={item.isActive ? `已啟用：${item.nameZh} (點擊停用)` : `已停用：${item.nameZh} (點擊重新啟用)`}
                    style={
                      item.isActive
                        ? {
                            borderColor: item.accentColor,
                            color: item.accentColor,
                            backgroundColor: `${item.accentColor}18`
                          }
                        : undefined
                    }
                  >
                    {item.shortBadge ? `${item.shortBadge} ` : ''}{item.nameZh}
                  </button>
                ))}
              </div>

              {/* Detail legends for active Area Features that provide swatch definitions */}
              {areaFeatureList
                .filter((item) => item.isActive && item.legend && item.legend.length > 0)
                .map((item) => (
                  <div key={`legend-${item.id}`} style={{ marginTop: 6 }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: 3 }}>
                      {item.nameZh} 圖例：
                    </div>
                    <div className="legend-items-list legend-items">
                      {item.legend!.map((l) => (
                        <div key={l.key} className="legend-item-row legend-item">
                          <span className="legend-color-dot" style={{ backgroundColor: l.color }} />
                          <span className="legend-label">{l.labelZh}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const MapLegend = React.memo(MapLegendComponent);
