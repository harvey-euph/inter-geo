import React, { useState } from 'react';
import { List } from 'lucide-react';
import type { LayerDefinition } from '../data/layers';
import { GLOBAL_TEXT_LAYERS_BY_ID } from '../data/globalLayers';
import { getNationwideLayerById, NATIONWIDE_LAYERS_BY_ID } from '../data/nationwideLayers';

export interface MapLegendProps {
  activeFilterDef: LayerDefinition;
  isFilterExpanded?: boolean;
  activeTextFilters?: Set<string>;
  activeInternationalImageFilter?: string | null;
  isL2RegionMode: boolean;
  activeRegionalFilters: Set<string>;
}

const MapLegendComponent: React.FC<MapLegendProps> = ({
  activeFilterDef,
  isFilterExpanded = false,
  activeTextFilters,
  activeInternationalImageFilter,
  isL2RegionMode,
  activeRegionalFilters
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`filter-legend-card ${isFilterExpanded ? 'with-filter-bar' : ''} ${
        collapsed ? 'is-collapsed' : ''
      }`}
    >
      <button
        type="button"
        className="legend-title legend-toggle"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? '展開圖例' : '收合圖例'}
        title={collapsed ? '展開圖例' : '收合圖例'}
      >
        <span className="legend-toggle-icon" aria-hidden>
          <List size={16} />
        </span>
        {!collapsed && <span className="legend-title-text">{activeFilterDef.nameZh}</span>}
      </button>

      {!collapsed && (
        <>
          <div className="legend-items-list legend-items">
            {activeFilterDef.legend.map((item) => (
              <div key={item.key} className="legend-item-row legend-item">
                <span className="legend-color-dot" style={{ backgroundColor: item.color }} />
                <span className="legend-label">{item.labelZh}</span>
              </div>
            ))}
          </div>

          {((activeTextFilters && activeTextFilters.size > 0) || activeInternationalImageFilter) && (
            <div className="legend-text-overlays-section">
              <div className="legend-divider" />
              <div className="legend-text-overlays-header">
                <span>已疊加標籤：</span>
              </div>
              <div className="legend-text-overlays-pills">
                {activeTextFilters &&
                  Array.from(activeTextFilters).map((id) => {
                    const tf = GLOBAL_TEXT_LAYERS_BY_ID.get(id);
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

          {isL2RegionMode && activeRegionalFilters.size > 0 && (
            <div className="legend-text-overlays-section">
              <div className="legend-divider" />
              <div className="legend-text-overlays-header">
                <span>國內專屬圖層：</span>
              </div>
              <div className="legend-text-overlays-pills">
                {Array.from(activeRegionalFilters).map((id) => {
                  const rf = getNationwideLayerById(id) || NATIONWIDE_LAYERS_BY_ID.get(id);
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
        </>
      )}
    </div>
  );
};

export const MapLegend = React.memo(MapLegendComponent);
