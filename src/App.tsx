import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { WorldMap } from './components/WorldMap';
import type { CountryData } from './types/geo';
import type { PrefectureDetail, MunicipalityDetail, L2SubdivisionDetail } from './types/lod';
import type { RoadPathData } from './components/WorldMap';
import { findCountry, COUNTRIES_DATA } from './data/countries';
import { JAPAN_PREFECTURES } from './data/japanData';
import {
  getNationwideFilterById,
  type NationwideFilterDef
} from './data/nationwideFilters';
import './App.css';

const CountryDetailPanel = lazy(() =>
  import('./components/CountryDetailPanel').then((m) => ({ default: m.CountryDetailPanel }))
);
const QuizModal = lazy(() =>
  import('./components/QuizModal').then((m) => ({ default: m.QuizModal }))
);

export function App() {
  const [activeFilterId, setActiveFilterId] = useState<string>('none');
  const [activeTextFilters, setActiveTextFilters] = useState<Set<string>>(new Set());
  const [activeInternationalImageFilter, setActiveInternationalImageFilter] = useState<string | null>(null);
  const [activeRegionalFilters, setActiveRegionalFilters] = useState<Set<string>>(new Set());
  const [visibleRegionalFilters, setVisibleRegionalFilters] = useState<NationwideFilterDef[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [selectedSubdivision, setSelectedSubdivision] = useState<L2SubdivisionDetail | null>(null);
  const [selectedPrefecture, setSelectedPrefecture] = useState<PrefectureDetail | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalityDetail | null>(null);
  const [selectedRoad, setSelectedRoad] = useState<RoadPathData | null>(null);
  const [showInterstates, setShowInterstates] = useState<boolean>(false);
  const [showNumberedRoutes, setShowNumberedRoutes] = useState<boolean>(false);
  const showRoads = showInterstates || showNumberedRoutes;
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  const zoomToPrefectureRef = useRef<((prefId: number) => void) | null>(null);

  const handleSelectCountry = useCallback((country: CountryData | null) => {
    setSelectedCountry(country);
    if (country) {
      setSelectedSubdivision(null);
      setSelectedPrefecture(null);
      setSelectedMunicipality(null);
      setSelectedRoad(null);
    }
  }, []);

  const handleSelectSubdivision = useCallback((sub: L2SubdivisionDetail | null) => {
    setSelectedSubdivision(sub);
    if (sub) {
      setSelectedCountry(null);
      setSelectedPrefecture(null);
      setSelectedMunicipality(null);
      setSelectedRoad(null);
    }
  }, []);

  const handleSelectPrefecture = useCallback((pref: PrefectureDetail | null) => {
    setSelectedPrefecture(pref);
    if (pref) {
      setSelectedCountry(null);
      setSelectedSubdivision(null);
      setSelectedMunicipality(null);
      setSelectedRoad(null);
    }
  }, []);

  const handleSelectMunicipality = useCallback((muni: MunicipalityDetail | null) => {
    setSelectedMunicipality(muni);
    if (muni) {
      setSelectedCountry(null);
      setSelectedSubdivision(null);
      setSelectedPrefecture(null);
      setSelectedRoad(null);
    }
  }, []);

  const handleSelectRoad = useCallback((road: RoadPathData | null) => {
    setSelectedRoad(road);
    if (road) {
      setSelectedCountry(null);
      setSelectedSubdivision(null);
      setSelectedPrefecture(null);
      setSelectedMunicipality(null);
    }
  }, []);

  const handleToggleInterstates = useCallback(() => {
    setShowInterstates((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedRoad((r) => (r?.class === 'Interstate' ? null : r));
      }
      return next;
    });
  }, []);

  const handleToggleNumberedRoutes = useCallback(() => {
    setShowNumberedRoutes((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedRoad((r) => (r && r.class !== 'Interstate' ? null : r));
      }
      return next;
    });
  }, []);

  const handleToggleTextFilter = useCallback((filterId: string) => {
    // Activating a text filter closes the image filter
    setActiveInternationalImageFilter(null);
    setActiveTextFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filterId)) {
        next.delete(filterId);
      } else {
        // Enforce max 2 concurrent text filters
        if (next.size >= 2) {
          const first = Array.from(next)[0];
          next.delete(first);
        }
        next.add(filterId);
      }
      return next;
    });
  }, []);

  const handleToggleInternationalImageFilter = useCallback((filterId: string) => {
    setActiveInternationalImageFilter((prev) => {
      if (prev === filterId) {
        return null;
      } else {
        // Activating an image filter closes all text filters!
        setActiveTextFilters(new Set());
        return filterId;
      }
    });
  }, []);

  const handleToggleRegionalFilter = useCallback((filterId: string) => {
    const targetDef = getNationwideFilterById(filterId);
    setActiveRegionalFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filterId)) {
        next.delete(filterId);
        if (targetDef?.layerType === 'roads') {
          setSelectedRoad((r) => {
            if (!r) return null;
            const rClass = r.class === 'Interstate' ? 'Interstate' : 'Federal';
            if (r.iso2 === targetDef.countryIso2 && rClass === targetDef.roadClass) {
              return null;
            }
            return r;
          });
        }
      } else {
        // Single-select within 'coloring' layerType
        if (targetDef?.layerType === 'coloring') {
          for (const existingId of Array.from(next)) {
            const existingDef = getNationwideFilterById(existingId);
            if (existingDef?.layerType === 'coloring') {
              next.delete(existingId);
            }
          }
        }
        next.add(filterId);
      }
      return next;
    });
  }, []);

  const handleResetAllFilters = useCallback(() => {
    setActiveFilterId('none');
    setActiveTextFilters(new Set());
    setActiveInternationalImageFilter(null);
    setActiveRegionalFilters(new Set());
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedCountry(null);
    setSelectedSubdivision(null);
    setSelectedPrefecture(null);
    setSelectedMunicipality(null);
    setSelectedRoad(null);
  }, []);

  const handleSelectFilter = useCallback((filterId: string) => {
    setActiveFilterId(filterId);
  }, []);

  const handleToggleFilterExpanded = useCallback(() => {
    setIsFilterExpanded((prev) => !prev);
  }, []);

  const handleCollapseFilter = useCallback(() => {
    setIsFilterExpanded(false);
  }, []);

  // Keyboard shortcut: ESC to close right detail panel or active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isQuizOpen) {
          setIsQuizOpen(false);
          return;
        }
        if (isFilterExpanded) {
          setIsFilterExpanded(false);
          return;
        }
        handleClosePanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isQuizOpen, isFilterExpanded, handleClosePanel]);

  const handleSelectCountryByName = useCallback(
    (name: string) => {
      const found = findCountry(name);
      if (found) {
        handleSelectCountry(found);
      }
    },
    [handleSelectCountry]
  );

  const handleSelectCountryByIso2 = useCallback(
    (iso2: string) => {
      const found = COUNTRIES_DATA.find((c) => c.iso2 === iso2);
      if (found) {
        handleSelectCountry(found);
      }
    },
    [handleSelectCountry]
  );

  const handleZoomToPrefecture = useCallback((prefId: number) => {
    if (zoomToPrefectureRef.current) {
      zoomToPrefectureRef.current(prefId);
    }
  }, []);

  const handleNavigateBack = useCallback(() => {
    // 1. If currently on L3 (Municipality): Go back to L2 (Prefecture or Subdivision)
    if (selectedMunicipality) {
      const muni = selectedMunicipality;
      setSelectedMunicipality(null);
      if ((muni.iso2 === 'JP' || !muni.iso2) && muni.prefId && JAPAN_PREFECTURES[muni.prefId]) {
        setSelectedPrefecture(JAPAN_PREFECTURES[muni.prefId]);
        return;
      }
      // Worldwide L2 subdivision:
      const iso2 = muni.iso2 || 'US';
      const cMeta = findCountry(iso2);
      const subDetail: L2SubdivisionDetail = {
        id: muni.parentCode || muni.parentName || muni.pref,
        iso2: iso2,
        name: muni.parentName || muni.pref,
        nameEn: muni.parentName || muni.pref,
        nameZh: muni.parentName || muni.pref,
        typeEn: '一級行政區',
        code: muni.parentCode || '',
        postal: '',
        countryName: cMeta?.name || iso2,
        countryNameZh: cMeta?.nameZh || iso2,
        countryFlag: cMeta?.flag || '🌐'
      };
      setSelectedSubdivision(subDetail);
      return;
    }

    // 2. If currently on L2 (Japan Prefecture): Go back to L1 Country (Japan)
    if (selectedPrefecture) {
      setSelectedPrefecture(null);
      const jp = findCountry('JP');
      if (jp) {
        setSelectedCountry(jp);
      }
      return;
    }

    // 3. If currently on L2 (Worldwide Subdivision): Go back to L1 Country
    if (selectedSubdivision) {
      const iso2 = selectedSubdivision.iso2;
      setSelectedSubdivision(null);
      const cMeta = findCountry(iso2);
      if (cMeta) {
        setSelectedCountry(cMeta);
      }
      return;
    }
  }, [selectedMunicipality, selectedPrefecture, selectedSubdivision]);

  const handleNavigateToCountry = useCallback((c: CountryData) => {
    setSelectedCountry(c);
    setSelectedSubdivision(null);
    setSelectedPrefecture(null);
    setSelectedMunicipality(null);
    setSelectedRoad(null);
  }, []);

  const activeFilterCount =
    (activeFilterId !== 'none' ? 1 : 0) +
    activeTextFilters.size +
    (activeInternationalImageFilter ? 1 : 0) +
    activeRegionalFilters.size;

  return (
    <div className="app-layout">
      {/* Top Navigation Headline with Single Filter Trigger Button */}
      <Header
        activeFilterCount={activeFilterCount}
        isFilterExpanded={isFilterExpanded}
        onToggleFilterExpanded={handleToggleFilterExpanded}
        onSelectCountry={handleSelectCountry}
      />

      {/* Main Viewport */}
      <div className="main-viewport">
        <section className="map-section">
          {/* Tree-based Filter Selector Window */}
          <FilterBar
            activeFilterId={activeFilterId}
            onSelectFilter={handleSelectFilter}
            activeTextFilters={activeTextFilters}
            onToggleTextFilter={handleToggleTextFilter}
            activeInternationalImageFilter={activeInternationalImageFilter}
            onToggleInternationalImageFilter={handleToggleInternationalImageFilter}
            activeRegionalFilters={activeRegionalFilters}
            onToggleRegionalFilter={handleToggleRegionalFilter}
            visibleRegionalFilters={visibleRegionalFilters}
            onResetAll={handleResetAllFilters}
            isExpanded={isFilterExpanded}
            onCollapse={handleCollapseFilter}
          />

          {/* GPU-Accelerated Vector World Map with Dynamic LOD Precision Tracking */}
          <WorldMap
            activeFilterId={activeFilterId}
            activeTextFilters={activeTextFilters}
            activeInternationalImageFilter={activeInternationalImageFilter}
            activeRegionalFilters={activeRegionalFilters}
            onVisibleRegionalFiltersChange={setVisibleRegionalFilters}
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
            zoomToPrefectureRef={zoomToPrefectureRef}
            showRoads={showRoads}
            showInterstates={showInterstates}
            onToggleInterstates={handleToggleInterstates}
            showNumberedRoutes={showNumberedRoutes}
            onToggleNumberedRoutes={handleToggleNumberedRoutes}
          />
        </section>

        {/* Side Detail Dossier Panel (Supports Country, Subdivision L2, Prefecture L2, Municipality L3, Highway/Route) */}
        {(selectedCountry || selectedSubdivision || selectedPrefecture || selectedMunicipality || selectedRoad) && (
          <Suspense fallback={null}>
            <CountryDetailPanel
              country={selectedCountry}
              subdivision={selectedSubdivision}
              prefecture={selectedPrefecture}
              municipality={selectedMunicipality}
              road={selectedRoad}
              onClose={handleClosePanel}
              onNavigateBack={handleNavigateBack}
              onNavigateToCountry={handleNavigateToCountry}
              onSelectCountryName={handleSelectCountryByName}
              onZoomToPrefecture={handleZoomToPrefecture}
            />
          </Suspense>
        )}
      </div>

      {/* Quiz Modal */}
      {isQuizOpen && (
        <Suspense fallback={null}>
          <QuizModal
            onClose={() => setIsQuizOpen(false)}
            onSelectCountryByIso2={handleSelectCountryByIso2}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
