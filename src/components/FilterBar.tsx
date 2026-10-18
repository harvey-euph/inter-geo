import React from 'react';
import { FILTERS } from '../data/filters';
import { COUNTRIES_DATA } from '../data/countries';
import { SlidersHorizontal, Sparkles } from 'lucide-react';

interface FilterBarProps {
  activeFilterId: string;
  onSelectFilter: (filterId: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ activeFilterId, onSelectFilter }) => {
  const currentFilter = FILTERS.find((f) => f.id === activeFilterId) || FILTERS[0];

  return (
    <div className="filter-bar-container">
      <div className="filter-pills-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8, color: 'var(--text-muted)', fontSize: 13, flexShrink: 0 }}>
          <SlidersHorizontal size={15} />
          <span>視覺濾鏡：</span>
        </div>
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
      <div className="filter-info-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} color="#38bdf8" />
          <span>{currentFilter.descriptionZh}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
          已收錄 {COUNTRIES_DATA.length} 個主要官方街景國
        </div>
      </div>
    </div>
  );
};
