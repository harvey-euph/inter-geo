import React, { useState } from 'react';
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

  const isBase = activeFilterDef.id === 'none' || activeFilterDef.id === 'base';

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

          {((activeTextFilters && activeTextFilters.size > 0) || activeInternationalImageFilter) && (
            <div className="legend-text-overlays-section">
              <div className="legend-divider" />
              <div className="legend-text-overlays-header">
                <span>已疊加標籤：</span>
              </div>
              <div className="legend-text-overlays-pills">
                {activeTextFilters &&
                  Array.from(activeTextFilters).map((id) => {
                    const tf = getGlobalTextLayerById(id) || GLOBAL_TEXT_LAYERS_BY_ID.get(id) || getCsvLayerById(id);
                    if (!tf) return null;
                    const accent = tf.accentColor || '#38bdf8';
                    return (
                      <span
                        key={id}
                        className="legend-text-pill"
                        style={{
                          borderColor: accent,
                          color: accent,
                          backgroundColor: `${accent}18`
                        }}
                      >
                        {tf.shortBadge || tf.nameZh}
                      </span>
                    );
                  })}
                {(activeInternationalImageFilter === 'pedestrian-crossing' ||
                  activeInternationalImageFilter === 'eu-pedestrian-crossing') && (
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

          {isL2RegionMode && activeRegionalFilters && activeRegionalFilters.size > 0 && (
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
