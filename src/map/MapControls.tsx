import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { COUNTRIES_DATA } from '../data/countries';
import type { CountryData } from '../types/geo';

export interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onSelectCountry: (country: CountryData) => void;
  panelOpen?: boolean;
  panelWidth?: number;
  panelFullWidth?: boolean;
}

const MapControlsComponent: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onSelectCountry,
  panelOpen = false,
  panelWidth = 420,
  panelFullWidth = false
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [openSearchToRight, setOpenSearchToRight] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CountryData[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const searchControlRef = useRef<HTMLDivElement>(null);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  }, []);

  useEffect(() => {
    if (isSearchOpen) inputRef.current?.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!searchControlRef.current?.contains(event.target as Node)) closeSearch();
    };
    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, [isSearchOpen, closeSearch]);

  const controlsStyle = panelOpen
    ? {
        right: panelFullWidth
          ? 'max(20px, calc(100% - 58px))'
          : `min(${panelWidth + 20}px, calc(100% - 58px))`,
        zIndex: 31
      }
    : undefined;

  const style = isSearchOpen && openSearchToRight
    ? { left: 20, right: 'auto', alignItems: 'flex-start' as const, zIndex: 31 }
    : controlsStyle;

  const toggleSearch = () => {
    if (isSearchOpen) {
      closeSearch();
      return;
    }

    const rect = controlsRef.current?.getBoundingClientRect();
    setOpenSearchToRight(Boolean(rect && rect.left < 286));
    setIsSearchOpen(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (!value.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const query = value.toLowerCase().trim();
    const matches = COUNTRIES_DATA.filter((country) =>
      country.name.toLowerCase().includes(query) ||
      country.nameZh.includes(query) ||
      country.iso2.toLowerCase() === query ||
      country.iso3.toLowerCase() === query ||
      Boolean(country.language?.toLowerCase().includes(query))
    );
    setSearchResults(matches.slice(0, 8));
    setShowDropdown(true);
  };

  const handleSelectResult = (country: CountryData) => {
    onSelectCountry(country);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setIsSearchOpen(false);
  };

  return (
    <div ref={controlsRef} className="map-controls-panel map-controls" style={style}>
      <button className="map-control-btn" onClick={onZoomIn} title="放大地圖 (Zoom In)">
        <ZoomIn size={18} />
      </button>
      <button className="map-control-btn" onClick={onZoomOut} title="縮小地圖 (Zoom Out)">
        <ZoomOut size={18} />
      </button>
      <button className="map-control-btn" onClick={onResetZoom} title="還原縮放比例 (Reset View)">
        <RotateCcw size={16} />
      </button>
      <div
        ref={searchControlRef}
        className={`map-search-control${isSearchOpen ? ' open' : ''}${openSearchToRight ? ' open-right' : ''}`}
      >
        {isSearchOpen && (
          <div className="map-search-field">
            <Search size={15} className="map-search-icon" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              className="map-search-input"
              placeholder="搜尋國家 (如台灣、JP)…"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.trim() && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  toggleSearch();
                }
              }}
              aria-label="搜尋國家"
            />
            {showDropdown && (
              <div className="map-search-dropdown search-dropdown-menu">
                {searchResults.length > 0 ? searchResults.map((country) => (
                  <div
                    key={country.id}
                    className="search-dropdown-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectResult(country);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{country.flag}</span>
                      <span style={{ fontWeight: 600 }}>{country.nameZh}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{country.name}</span>
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                      {country.iso2}
                    </span>
                  </div>
                )) : (
                  <div className="map-search-empty">找不到符合的國家</div>
                )}
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          className="map-control-btn map-search-toggle"
          onClick={toggleSearch}
          title={isSearchOpen ? '關閉搜尋' : '搜尋國家'}
          aria-label={isSearchOpen ? '關閉搜尋' : '搜尋國家'}
          aria-expanded={isSearchOpen}
        >
          <Search size={18} />
        </button>
      </div>
    </div>
  );
};

export const MapControls = React.memo(MapControlsComponent);
