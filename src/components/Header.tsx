import React, { useState } from 'react';
import { Globe, Search, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { COUNTRIES_DATA } from '../data/countries';
import type { CountryData } from '../types/geo';

interface HeaderProps {
  activeFilterCount: number;
  isFilterExpanded: boolean;
  onToggleFilterExpanded: () => void;
  onSelectCountry: (country: CountryData) => void;
  onOpenQuiz?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  activeFilterCount,
  isFilterExpanded,
  onToggleFilterExpanded,
  onSelectCountry
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CountryData[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const q = val.toLowerCase().trim();
    const matches = COUNTRIES_DATA.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.nameZh.includes(q) ||
        c.iso2.toLowerCase() === q ||
        c.iso3.toLowerCase() === q ||
        (c.language && c.language.toLowerCase().includes(q))
      );
    });

    setSearchResults(matches.slice(0, 8));
    setShowDropdown(true);
  };

  const handleSelectResult = (country: CountryData) => {
    onSelectCountry(country);
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <header className="app-header">
      {/* Left: Brand Logo & Title */}
      <div className="brand">
        <div className="brand-icon">
          <Globe size={18} />
        </div>
        <div className="brand-title">
          <span>InterGeo</span>
          <span className="brand-badge">GeoGuessr</span>
        </div>
      </div>

      {/* Center / Left-Center: Single Filter Selector Button */}
      <div className="headline-filter-row">
        <button
          type="button"
          className={`filter-trigger-btn ${isFilterExpanded ? 'open' : ''} ${activeFilterCount > 0 ? 'has-active' : ''}`}
          onClick={onToggleFilterExpanded}
          title="開啟 / 關閉濾鏡選擇器 (Filter Selector)"
        >
          <SlidersHorizontal size={14} className="filter-trigger-icon" />
          <span className="filter-trigger-label">Filters 濾鏡</span>
          {activeFilterCount > 0 && (
            <span className="filter-trigger-badge">{activeFilterCount}</span>
          )}
          {isFilterExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Right: Search & Actions */}
      <div className="header-actions">
        {/* Search Input with Autocomplete dropdown */}
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="搜尋國家 (如 台灣, JP)..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchQuery.trim() && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          />

          {showDropdown && searchResults.length > 0 && (
            <div className="search-dropdown-menu">
              {searchResults.map((c) => (
                <div
                  key={c.id}
                  className="search-dropdown-item"
                  onMouseDown={() => handleSelectResult(c)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{c.flag}</span>
                    <span style={{ fontWeight: 600 }}>{c.nameZh}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.name}</span>
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    {c.iso2}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
});
