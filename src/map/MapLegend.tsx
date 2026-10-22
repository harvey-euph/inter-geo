import React from 'react';
import type { FilterDefinition } from '../data/filters';
import { GLOBAL_TEXT_FILTERS_BY_ID } from '../data/globalFilters';
import { getNationwideFilterById, NATIONWIDE_FILTERS_BY_ID } from '../data/nationwideFilters';
import type { LODLevel } from '../types/lod';

export interface MapLegendProps {
  activeFilterDef: FilterDefinition;
  isFilterExpanded?: boolean;
  activeTextFilters?: Set<string>;
  activeInternationalImageFilter?: string | null;
  lodLevel: LODLevel;
  activeRegionalFilters: Set<string>;
}

const MapLegendComponent: React.FC<MapLegendProps> = ({
  activeFilterDef,
  isFilterExpanded = false,
  activeTextFilters,
  activeInternationalImageFilter,
  lodLevel,
  activeRegionalFilters
}) => {
  return (
    <div className={`filter-legend-card ${isFilterExpanded ? 'with-filter-bar' : ''}`}>
      <div className="legend-title">
        <span>{activeFilterDef.nameZh}</span>
      </div>
      <div className="legend-items-list legend-items">
        {activeFilterDef.legend.map((item) => (
          <div key={item.key} className="legend-item-row legend-item">
            <span className="legend-color-dot" style={{ backgroundColor: item.color }} />
            <span className="legend-label">{item.labelZh}</span>
          </div>
        ))}
      </div>

      {/* Text / Image Overlay Status in Legend */}
      {((activeTextFilters && activeTextFilters.size > 0) || activeInternationalImageFilter) && (
        <div className="legend-text-overlays-section">
          <div className="legend-divider" />
          <div className="legend-text-overlays-header">
            <span>已疊加標籤：</span>
          </div>
          <div className="legend-text-overlays-pills">
            {activeTextFilters &&
              Array.from(activeTextFilters).map((id) => {
                const tf = GLOBAL_TEXT_FILTERS_BY_ID.get(id);
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

      {/* Nationwide Overlay Status in Legend (surfaced only at L2/L3) */}
      {(lodLevel === 'L2' || lodLevel === 'L3') && activeRegionalFilters.size > 0 && (
        <div className="legend-text-overlays-section">
          <div className="legend-divider" />
          <div className="legend-text-overlays-header">
            <span>國內專屬圖層：</span>
          </div>
          <div className="legend-text-overlays-pills">
            {Array.from(activeRegionalFilters).map((id) => {
              const rf = getNationwideFilterById(id) || NATIONWIDE_FILTERS_BY_ID.get(id);
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
    </div>
  );
};

export const MapLegend = React.memo(MapLegendComponent);
