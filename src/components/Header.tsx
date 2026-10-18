import React, { useState } from 'react';
import { Globe, Search, Award } from 'lucide-react';
import { COUNTRIES_DATA } from '../data/countries';
import type { CountryData } from '../types/geo';

interface HeaderProps {
  onSelectCountry: (country: CountryData) => void;
  onOpenQuiz: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSelectCountry, onOpenQuiz }) => {
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
      <div className="brand">
        <div className="brand-icon">
          <Globe size={20} />
        </div>
        <div className="brand-title">
          <span>InterGeo</span>
          <span className="brand-badge">互動式 GeoGuessr 學習圖鑑</span>
        </div>
      </div>

      <div className="header-actions">
        {/* Search Input with Autocomplete dropdown */}
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="搜尋國家、代碼 (如 台灣, JP, NO)..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchQuery.trim() && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          />

          {showDropdown && searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 40,
                left: 0,
                width: 260,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                boxShadow: 'var(--shadow-lg)',
                zIndex: 60,
                overflow: 'hidden'
              }}
            >
              {searchResults.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-color)',
                    fontSize: 13
                  }}
                  onMouseDown={() => handleSelectResult(c)}
                  className="search-dropdown-item"
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

        {/* Quiz Button */}
        <button className="btn-header btn-primary" onClick={onOpenQuiz}>
          <Award size={15} />
          <span>隨堂測驗</span>
        </button>
      </div>
    </header>
  );
};
