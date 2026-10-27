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
  isL2RegionMode: boolean;
  activeRegionalFilters?: Set<string>;
  onToggleTextFilter?: (filterId: string) => void;
  onToggleInternationalImageFilter?: (filterId: string) => void;
  onToggleRegionalFilter?: (filterId: string) => void;
}

const MapLegendComponent: React.FC<MapLegendProps> = ({
  activeFilterDef,
  isFilterExpanded = false,
  activeTextFilters,
  activeInternationalImageFilter,
  isL2RegionMode,
  activeRegionalFilters,
  onToggleTextFilter,
  onToggleInternationalImageFilter,
  onToggleRegionalFilter
}) => {
  const [collapsed, setCollapsed] = useState(false);

  // Dimmed / commented-out tags that remain in the legend until collapsed
  const [dimmedTextFilters, setDimmedTextFilters] = useState<Set<string>>(new Set());
  const [dimmedRegionalFilters, setDimmedRegionalFilters] = useState<Set<string>>(new Set());
  const [dimmedImageFilters, setDimmedImageFilters] = useState<Set<string>>(new Set());

  // Prune dimmed tags whenever legend is collapsed (收縮)
  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      if (next) {
        // Clean out all dimmed/commented-out tags on collapse
        setDimmedTextFilters(new Set());
        setDimmedRegionalFilters(new Set());
        setDimmedImageFilters(new Set());
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

  // Image overlay (pedestrian crossing) state
  const isImageActive = Boolean(
    activeInternationalImageFilter === 'pedestrian-crossing' ||
    activeInternationalImageFilter === 'eu-pedestrian-crossing'
  );
  const isImageDimmed = dimmedImageFilters.has('pedestrian-crossing');
  const showImagePill = isImageActive || isImageDimmed;

  const handleToggleImagePill = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleInternationalImageFilter) return;
    if (isImageActive) {
      const currentId = activeInternationalImageFilter || 'pedestrian-crossing';
      onToggleInternationalImageFilter(currentId);
      setDimmedImageFilters(new Set(['pedestrian-crossing']));
    } else {
      onToggleInternationalImageFilter('pedestrian-crossing');
      setDimmedImageFilters(new Set());
    }
  };

  // Compute merged list of active + dimmed regional filter IDs
  const regionalPillIds = useMemo(() => {
    const list: string[] = [];
    if (activeRegionalFilters) {
      for (const id of activeRegionalFilters) {
        list.push(id);
      }
    }
    for (const id of dimmedRegionalFilters) {
      if (!list.includes(id)) {
        list.push(id);
      }
    }
    return list;
  }, [activeRegionalFilters, dimmedRegionalFilters]);

  const handleToggleRegionalPill = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleRegionalFilter) return;
    const isActive = Boolean(activeRegionalFilters?.has(id));
    if (isActive) {
      onToggleRegionalFilter(id);
      setDimmedRegionalFilters((prev) => new Set(prev).add(id));
    } else {
      onToggleRegionalFilter(id);
      setDimmedRegionalFilters((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

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
              {isBase ? '預設草圖底圖風格（未選取著色圖層）' : (activeFilterDef.descriptionZh || '暫無顏色圖例')}
            </div>
          )}

          {/* Section 1: Global Overlay Labels */}
          {(textPillIds.length > 0 || showImagePill) && (
            <div className="legend-text-overlays-section">
              <div className="legend-divider" />
              <div className="legend-text-overlays-header">
                <span>已疊加標籤：</span>
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

                {showImagePill && (
                  <button
                    type="button"
                    className={`legend-text-pill ${!isImageActive ? 'is-dimmed' : ''}`}
                    onClick={handleToggleImagePill}
                    title={isImageActive ? "已啟用：人行道告示 (點擊停用)" : "已停用：人行道告示 (點擊重新啟用)"}
                    style={
                      isImageActive
                        ? {
                            borderColor: '#38bdf8',
                            color: '#38bdf8',
                            backgroundColor: 'rgba(56, 189, 248, 0.12)'
                          }
                        : undefined
                    }
                  >
                    🚸 人行道告示
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Section 2: Regional Sub-layers */}
          {isL2RegionMode && regionalPillIds.length > 0 && (
            <div className="legend-text-overlays-section">
              <div className="legend-divider" />
              <div className="legend-text-overlays-header">
                <span>國內專屬圖層：</span>
              </div>
              <div className="legend-text-overlays-pills">
                {regionalPillIds.map((id) => {
                  const rf = getNationwideLayerById(id) || NATIONWIDE_LAYERS_BY_ID.get(id);
                  if (!rf) return null;
                  const isActive = Boolean(activeRegionalFilters?.has(id));
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`legend-text-pill ${!isActive ? 'is-dimmed' : ''}`}
                      onClick={(e) => handleToggleRegionalPill(id, e)}
                      title={isActive ? `已啟用：${rf.nameZh} (點擊停用)` : `已停用：${rf.nameZh} (點擊重新啟用)`}
                      style={
                        isActive
                          ? {
                              borderColor: rf.activeColor,
                              color: rf.activeColor,
                              backgroundColor: `${rf.activeColor}18`
                            }
                          : undefined
                      }
                    >
                      {rf.shortBadge} {rf.nameZh}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const MapLegend = React.memo(MapLegendComponent);
