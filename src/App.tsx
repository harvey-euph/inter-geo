import { useState } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { WorldMap } from './components/WorldMap';
import { CountryDetailPanel } from './components/CountryDetailPanel';
import { QuizModal } from './components/QuizModal';
import type { CountryData } from './types/geo';
import { findCountry, COUNTRIES_DATA } from './data/countries';
import './App.css';

export function App() {
  const [activeFilterId, setActiveFilterId] = useState<string>('none');
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<CountryData | null>(null);
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  const handleSelectCountryByName = (name: string) => {
    const found = findCountry(name);
    if (found) {
      setSelectedCountry(found);
    }
  };

  const handleSelectCountryByIso2 = (iso2: string) => {
    const found = COUNTRIES_DATA.find((c) => c.iso2 === iso2);
    if (found) {
      setSelectedCountry(found);
    }
  };

  return (
    <div className="app-layout">
      {/* Top Navigation Headline with Collapsed Filters */}
      <Header
        activeFilterId={activeFilterId}
        onSelectFilter={(filterId) => setActiveFilterId(filterId)}
        isFilterExpanded={isFilterExpanded}
        onToggleFilterExpanded={() => setIsFilterExpanded((prev) => !prev)}
        onSelectCountry={(country) => setSelectedCountry(country)}
        onOpenQuiz={() => setIsQuizOpen(true)}
      />

      {/* Main Viewport */}
      <div className="main-viewport">
        <section className="map-section">
          {/* Collapsible Floating Filter Bar Window */}
          <FilterBar
            activeFilterId={activeFilterId}
            onSelectFilter={(filterId) => setActiveFilterId(filterId)}
            isExpanded={isFilterExpanded}
            onCollapse={() => setIsFilterExpanded(false)}
          />

          {/* Clean Raw SVG World Map */}
          <WorldMap
            activeFilterId={activeFilterId}
            isFilterExpanded={isFilterExpanded}
            selectedCountry={selectedCountry}
            onSelectCountry={(country) => setSelectedCountry(country)}
            hoveredCountry={hoveredCountry}
            setHoveredCountry={setHoveredCountry}
          />
        </section>

        {/* Side Detail Dossier Panel */}
        <CountryDetailPanel
          country={selectedCountry}
          onClose={() => setSelectedCountry(null)}
          onSelectCountryName={handleSelectCountryByName}
        />
      </div>

      {/* Quiz Modal */}
      {isQuizOpen && (
        <QuizModal
          onClose={() => setIsQuizOpen(false)}
          onSelectCountryByIso2={handleSelectCountryByIso2}
        />
      )}
    </div>
  );
}

export default App;
