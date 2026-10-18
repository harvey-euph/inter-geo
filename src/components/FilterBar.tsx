import React from 'react';
import { FILTERS } from '../data/filters';
import { COUNTRIES_DATA } from '../data/countries';
import { SlidersHorizontal, Sparkles, ChevronUp, Layers } from 'lucide-react';

interface FilterBarProps {
  activeFilterId: string;
  onSelectFilter: (filterId: string) => void;
  isExpanded: boolean;
  onCollapse: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  activeFilterId,
  onSelectFilter,
  isExpanded,
  onCollapse
}) => {
  if (!isExpanded) return null;

  const currentFilter = FILTERS.find((f) => f.id === activeFilterId) || FILTERS[0];

  return (
    <div className="filter-bar-container">
      {/* Top Bar inside floating window with collapse button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: 13, fontWeight: 600 }}>
          <SlidersHorizontal size={15} />
          <span>視覺濾鏡詳細面板 (Visual Filters)</span>
        </div>

        <button
          className="filter-collapse-btn"
          onClick={onCollapse}
          title="收納濾鏡面板至頂端 Headline"
        >
          <ChevronUp size={14} />
          <span>收納至頂端</span>
        </button>
      </div>

      {/* Filter pills row */}
      <div className="filter-pills-row">
        {FILTERS.map((f) => {
          const isActive = f.id === activeFilterId;
          return (
            <button
              key={f.id}
              className={`filter-pill ${isActive ? 'active' : ''}`}
              onClick={() => onSelectFilter(f.id)}
            >
              {f.nameZh}
            </button>
          );
        })}
      </div>

      {/* Filter info and description footer */}
      <div className="filter-info-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} color="#38bdf8" />
          <span>{currentFilter.descriptionZh}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          <Layers size={12} color="#94a3b8" />
          <span>已收錄 {COUNTRIES_DATA.length} 個主要官方街景國</span>
        </div>
      </div>
    </div>
  );
};
