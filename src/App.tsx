import { useState, useRef, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { WorldMap } from './components/WorldMap';
import { CountryDetailPanel } from './components/CountryDetailPanel';
import { QuizModal } from './components/QuizModal';
import type { CountryData } from './types/geo';
import type { PrefectureDetail, MunicipalityDetail, L2SubdivisionDetail } from './types/lod';
import type { RoadPathData } from './components/WorldMap';
import { findCountry, COUNTRIES_DATA } from './data/countries';
import './App.css';

export function App() {
  const [activeFilterId, setActiveFilterId] = useState<string>('none');
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [selectedSubdivision, setSelectedSubdivision] = useState<L2SubdivisionDetail | null>(null);
  const [selectedPrefecture, setSelectedPrefecture] = useState<PrefectureDetail | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalityDetail | null>(null);
  const [selectedRoad, setSelectedRoad] = useState<RoadPathData | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<CountryData | null>(null);
  const [showInterstates, setShowInterstates] = useState<boolean>(false);
  const [showNumberedRoutes, setShowNumberedRoutes] = useState<boolean>(false);
  const showRoads = showInterstates || showNumberedRoutes;
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  const zoomToPrefectureRef = useRef<((prefId: number) => void) | null>(null);

  const handleSelectCountry = (country: CountryData | null) => {
    setSelectedCountry(country);
    if (country) {
      setSelectedSubdivision(null);
      setSelectedPrefecture(null);
      setSelectedMunicipality(null);
      setSelectedRoad(null);
    }
  };

  const handleSelectSubdivision = useCallback((sub: L2SubdivisionDetail | null) => {
    setSelectedSubdivision(sub);
    if (sub) {
      setSelectedPrefecture(null);
      setSelectedMunicipality(null);
      setSelectedRoad(null);
    }
  }, []);

  const handleSelectPrefecture = (pref: PrefectureDetail | null) => {
    setSelectedPrefecture(pref);
    if (pref) {
      setSelectedCountry(null);
      setSelectedSubdivision(null);
      setSelectedMunicipality(null);
      setSelectedRoad(null);
    }
  };

  const handleSelectMunicipality = (muni: MunicipalityDetail | null) => {
    setSelectedMunicipality(muni);
    if (muni) {
      setSelectedCountry(null);
      setSelectedSubdivision(null);
      setSelectedPrefecture(null);
      setSelectedRoad(null);
    }
  };

  const handleSelectRoad = (road: RoadPathData | null) => {
    setSelectedRoad(road);
    if (road) {
      setSelectedCountry(null);
      setSelectedSubdivision(null);
      setSelectedPrefecture(null);
      setSelectedMunicipality(null);
    }
  };

  const handleToggleInterstates = () => {
    setShowInterstates((prev) => {
      const next = !prev;
      if (!next && selectedRoad?.class === 'Interstate') {
        setSelectedRoad(null);
      }
      return next;
    });
  };

  const handleToggleNumberedRoutes = () => {
    setShowNumberedRoutes((prev) => {
      const next = !prev;
      if (!next && selectedRoad && selectedRoad.class !== 'Interstate') {
        setSelectedRoad(null);
      }
      return next;
    });
  };

  const handleToggleRoads = () => {
    if (showRoads) {
      setShowInterstates(false);
      setShowNumberedRoutes(false);
      setSelectedRoad(null);
    } else {
      setShowInterstates(true);
      setShowNumberedRoutes(true);
    }
  };

  const handleClosePanel = useCallback(() => {
    setSelectedCountry(null);
    setSelectedSubdivision(null);
    setSelectedPrefecture(null);
    setSelectedMunicipality(null);
    setSelectedRoad(null);
  }, []);

  // Keyboard shortcut: ESC to close right detail panel or active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isQuizOpen) {
          setIsQuizOpen(false);
          return;
        }
        handleClosePanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isQuizOpen, handleClosePanel]);

  const handleSelectCountryByName = (name: string) => {
    const found = findCountry(name);
    if (found) {
      handleSelectCountry(found);
    }
  };

  const handleSelectCountryByIso2 = (iso2: string) => {
    const found = COUNTRIES_DATA.find((c) => c.iso2 === iso2);
    if (found) {
      handleSelectCountry(found);
    }
  };

  const handleZoomToPrefecture = (prefId: number) => {
    if (zoomToPrefectureRef.current) {
      zoomToPrefectureRef.current(prefId);
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
        onSelectCountry={handleSelectCountry}
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

          {/* Clean Raw SVG World Map with Dynamic LOD Precision Tracking */}
          <WorldMap
            activeFilterId={activeFilterId}
            isFilterExpanded={isFilterExpanded}
            selectedCountry={selectedCountry}
            onSelectCountry={handleSelectCountry}
            selectedSubdivision={selectedSubdivision}
            onSelectSubdivision={handleSelectSubdivision}
            selectedPrefecture={selectedPrefecture}
            onSelectPrefecture={handleSelectPrefecture}
            selectedMunicipality={selectedMunicipality}
            onSelectMunicipality={handleSelectMunicipality}
            selectedRoad={selectedRoad}
            onSelectRoad={handleSelectRoad}
            hoveredCountry={hoveredCountry}
            setHoveredCountry={setHoveredCountry}
            zoomToPrefectureRef={zoomToPrefectureRef}
            showRoads={showRoads}
            onToggleRoads={handleToggleRoads}
            showInterstates={showInterstates}
            onToggleInterstates={handleToggleInterstates}
            showNumberedRoutes={showNumberedRoutes}
            onToggleNumberedRoutes={handleToggleNumberedRoutes}
          />
        </section>

        {/* Side Detail Dossier Panel (Supports Country, Subdivision L2, Prefecture L2, Municipality L3, Highway/Route) */}
        <CountryDetailPanel
          country={selectedCountry}
          subdivision={selectedSubdivision}
          prefecture={selectedPrefecture}
          municipality={selectedMunicipality}
          road={selectedRoad}
          onClose={handleClosePanel}
          onSelectCountryName={handleSelectCountryByName}
          onZoomToPrefecture={handleZoomToPrefecture}
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
