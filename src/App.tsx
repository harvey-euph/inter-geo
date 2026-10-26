import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { WorldMap } from './components/WorldMap';
import { FILTERS } from './data/filters';
import type { CountryData } from './types/geo';
import type { MunicipalityDetail, L2SubdivisionDetail } from './types/lod';
import type { MapFocusTarget, MapSelectOptions, RoadPathData } from './components/WorldMap';
import { findCountry, COUNTRIES_DATA } from './data/countries';
import {
  getNationwideFilterById,
  type NationwideFilterDef
} from './data/nationwideFilters';
import { getCsvFilterById } from './filters/csvFilterRegistry';
import './App.css';

if (typeof window !== 'undefined') {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navigation?.type === 'reload' && window.location.search) {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.hash}`);
  }
}

const CountryDetailPanel = lazy(() =>
  import('./components/CountryDetailPanel').then((m) => ({ default: m.CountryDetailPanel }))
);
const QuizModal = lazy(() =>
  import('./components/QuizModal').then((m) => ({ default: m.QuizModal }))
);

export function App() {
  const [initialTargetParam] = useState(() => new URLSearchParams(window.location.search).get('target')?.trim() || '');
  const [initialLayerParam] = useState(() => new URLSearchParams(window.location.search).get('layer')?.trim() || '');
  const effectiveLayerCandidate = initialLayerParam || initialTargetParam;
  const initialCsvLayer = effectiveLayerCandidate ? getCsvFilterById(effectiveLayerCandidate) : undefined;
  const initialNationwideLayer = effectiveLayerCandidate ? getNationwideFilterById(effectiveLayerCandidate) : undefined;
  const initialBaseLayer = FILTERS.some((filter) => filter.id === effectiveLayerCandidate);
  const isInitialLayer = !!initialCsvLayer || !!initialNationwideLayer || initialBaseLayer;
  const initialLayerIds = initialNationwideLayer ? [effectiveLayerCandidate] : [];
  const initialTarget = isInitialLayer && !initialLayerParam ? '' : initialTargetParam;
  const [initialFocusTarget] = useState(() => {
    for (const id of initialLayerIds) {
      const csvFocus = getCsvFilterById(id)?.meta.focusTarget;
      if (csvFocus) return csvFocus;
      const filter = getNationwideFilterById(id);
      if (filter?.targetIso2 && filter.targetIso2 !== '*') return filter.targetIso2;
    }
    return '';
  });
  const initialTargetParts = initialTarget.split('::');
  const initialCountry = initialTargetParts.length === 1 ? findCountry(initialTargetParts[0]) || null : null;
  const isFillRegion = initialBaseLayer || initialCsvLayer?.type === 'FillWithColor';
  const [activeFilterId, setActiveFilterId] = useState<string>(isFillRegion ? effectiveLayerCandidate : 'none');
  const [activeTextFilters, setActiveTextFilters] = useState<Set<string>>(
    () => new Set(initialCsvLayer?.type === 'Text' ? [effectiveLayerCandidate] : [])
  );
  const [activeInternationalImageFilter, setActiveInternationalImageFilter] = useState<string | null>(
    initialCsvLayer?.type === 'Image' ? effectiveLayerCandidate : null
  );
  const [activeRegionalFilters, setActiveRegionalFilters] = useState<Set<string>>(
    () => new Set(
      effectiveLayerCandidate === 'taiwan-power-poles'
        ? ['taiwan-power-poles']
        : initialLayerIds.filter((id) => !!getNationwideFilterById(id))
    )
  );
  const [visibleRegionalFilters, setVisibleRegionalFilters] = useState<NationwideFilterDef[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(initialCountry);
  const [selectedSubdivision, setSelectedSubdivision] = useState<L2SubdivisionDetail | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalityDetail | null>(null);
  const [selectedRoad, setSelectedRoad] = useState<RoadPathData | null>(null);
  const [detailPanelWidth, setDetailPanelWidth] = useState(420);
  const [detailPanelFullWidth, setDetailPanelFullWidth] = useState(false);
  const [showInterstates, setShowInterstates] = useState<boolean>(
    () => effectiveLayerCandidate === 'roads-highways'
  );
  const [showNumberedRoutes, setShowNumberedRoutes] = useState<boolean>(
    () => effectiveLayerCandidate === 'roads-numbered'
  );
  const showRoads = showInterstates || showNumberedRoutes;
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  const zoomToSubdivisionRef = useRef<((iso2: string, id: string | number) => void) | null>(null);
  const focusMapRef = useRef<((target: MapFocusTarget) => void) | null>(null);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    const updateAppViewportHeight = () => {
      const height = visualViewport?.height || window.innerHeight;
      const top = visualViewport?.offsetTop || 0;
      document.documentElement.style.setProperty('--app-visual-height', `${height}px`);
      document.documentElement.style.setProperty('--app-visual-top', `${top}px`);
    };
    updateAppViewportHeight();
    visualViewport?.addEventListener('resize', updateAppViewportHeight);
    visualViewport?.addEventListener('scroll', updateAppViewportHeight);
    window.addEventListener('resize', updateAppViewportHeight);
    return () => {
      visualViewport?.removeEventListener('resize', updateAppViewportHeight);
      visualViewport?.removeEventListener('scroll', updateAppViewportHeight);
      window.removeEventListener('resize', updateAppViewportHeight);
      document.documentElement.style.removeProperty('--app-visual-height');
      document.documentElement.style.removeProperty('--app-visual-top');
    };
  }, []);

  const handleSelectCountry = useCallback((country: CountryData | null, options?: MapSelectOptions) => {
    setSelectedCountry(country);
    if (country) {
      setSelectedSubdivision(null);
      setSelectedMunicipality(null);
      setSelectedRoad(null);
      if (options?.focus !== false) {
        focusMapRef.current?.({ kind: 'country', iso2: country.iso2 });
      }
    }
  }, []);

  const handleSelectSubdivision = useCallback((sub: L2SubdivisionDetail | null, options?: MapSelectOptions) => {
    setSelectedSubdivision(sub);
    if (sub) {
      setSelectedCountry(null);
      setSelectedMunicipality(null);
      setSelectedRoad(null);
      if (options?.focus !== false) {
        focusMapRef.current?.({ kind: 'subdivision', iso2: sub.iso2, id: sub.id });
      }
    }
  }, []);

  const handleSelectMunicipality = useCallback((muni: MunicipalityDetail | null, options?: MapSelectOptions) => {
    setSelectedMunicipality(muni);
    if (muni) {
      setSelectedCountry(null);
      setSelectedSubdivision(null);
      setSelectedRoad(null);
      if (options?.focus !== false) {
        focusMapRef.current?.({
          kind: 'municipality',
          iso2: muni.iso2,
          code: muni.code,
          parentName: muni.parentName || muni.pref,
          parentCode: muni.parentCode
        });
      }
    }
  }, []);

  const handleSelectRoad = useCallback((road: RoadPathData | null, options?: MapSelectOptions) => {
    setSelectedRoad(road);
    if (road) {
      setSelectedCountry(null);
      setSelectedSubdivision(null);
      setSelectedMunicipality(null);
      if (options?.focus !== false) {
        focusMapRef.current?.({ kind: 'road', bbox: road.bbox });
      }
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
    const turningOn = !activeRegionalFilters.has(filterId);
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
    if (!turningOn || !targetDef) return;
    const csvFocusTarget = getCsvFilterById(filterId)?.meta.focusTarget;
    if (csvFocusTarget) {
      const [iso2, ...namespace] = csvFocusTarget.split('::').map((part) => part.trim());
      if (iso2 && namespace.length > 0) {
        focusMapRef.current?.({ kind: 'subdivision', iso2: iso2.toUpperCase(), id: namespace[0], force: true });
        return;
      }
      if (iso2) {
        focusMapRef.current?.({ kind: 'country', iso2: iso2.toUpperCase(), force: true });
        return;
      }
    }
    if (targetDef.customBBoxes && targetDef.customBBoxes.length > 0) {
      focusMapRef.current?.({ kind: 'bbox', boxes: targetDef.customBBoxes });
    } else if (targetDef.customBBox) {
      focusMapRef.current?.({ kind: 'bbox', boxes: [targetDef.customBBox] });
    } else {
      const iso =
        targetDef.countryIso2 || (targetDef.targetIso2 !== '*' ? targetDef.targetIso2 : '');
      if (iso) focusMapRef.current?.({ kind: 'country', iso2: iso });
    }
  }, [activeRegionalFilters]);

  const handleResetAllFilters = useCallback(() => {
    setActiveFilterId('none');
    setActiveTextFilters(new Set());
    setActiveInternationalImageFilter(null);
    setActiveRegionalFilters(new Set());
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedCountry(null);
    setSelectedSubdivision(null);
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

  const handleNavigateBack = useCallback(() => {
    // L3 -> the parent L2 subdivision, for every country including Japan.
    if (selectedMunicipality) {
      const muni = selectedMunicipality;
      const iso2 = muni.iso2 || '';
      const cMeta = iso2 ? findCountry(iso2) : undefined;
      const parentName = muni.parentName || muni.pref;
      const parentCode = muni.parentCode || '';
      const subDetail: L2SubdivisionDetail = {
        id: parentCode || parentName,
        iso2,
        name: parentName,
        nameEn: parentName,
        nameZh: parentName,
        typeEn: '一級行政區',
        code: parentCode,
        postal: '',
        countryName: cMeta?.name || iso2,
        countryNameZh: cMeta?.nameZh || iso2,
        countryFlag: cMeta?.flag || '🌐'
      };
      handleSelectSubdivision(subDetail);
      return;
    }

    // L2 -> the parent country.
    if (selectedSubdivision) {
      const cMeta = findCountry(selectedSubdivision.iso2);
      if (cMeta) {
        handleSelectCountry(cMeta);
      } else {
        setSelectedSubdivision(null);
      }
    }
  }, [selectedMunicipality, selectedSubdivision, handleSelectSubdivision, handleSelectCountry]);

  const handleNavigateToCountry = useCallback((c: CountryData) => {
    handleSelectCountry(c);
  }, [handleSelectCountry]);

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
            showInterstates={showInterstates}
            onToggleInterstates={() => setShowInterstates((prev) => !prev)}
            showNumberedRoutes={showNumberedRoutes}
            onToggleNumberedRoutes={() => setShowNumberedRoutes((prev) => !prev)}
            onResetAll={handleResetAllFilters}
            isExpanded={isFilterExpanded}
            onCollapse={handleCollapseFilter}
            onGotoCamera={(lat, lon, ratio) => {
              focusMapRef.current?.({ kind: 'coordinates', lat, lon, ratio });
            }}
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
            selectedMunicipality={selectedMunicipality}
            onSelectMunicipality={handleSelectMunicipality}
            selectedRoad={selectedRoad}
            onSelectRoad={handleSelectRoad}
            detailPanelWidth={detailPanelWidth}
            detailPanelFullWidth={detailPanelFullWidth}
            zoomToSubdivisionRef={zoomToSubdivisionRef}
            focusMapRef={focusMapRef}
            initialTarget={initialTarget}
            initialFocusTarget={initialFocusTarget}
            showRoads={showRoads}
            showInterstates={showInterstates}
            onToggleInterstates={handleToggleInterstates}
            showNumberedRoutes={showNumberedRoutes}
            onToggleNumberedRoutes={handleToggleNumberedRoutes}
          />
        </section>

        {(selectedCountry || selectedSubdivision || selectedMunicipality || selectedRoad) && (
          <Suspense fallback={null}>
            <CountryDetailPanel
              country={selectedCountry}
              subdivision={selectedSubdivision}
              municipality={selectedMunicipality}
              road={selectedRoad}
              panelWidth={detailPanelWidth}
              panelFullWidth={detailPanelFullWidth}
              onPanelWidthChange={setDetailPanelWidth}
              onTogglePanelFullWidth={() => setDetailPanelFullWidth((full) => !full)}
              onClose={handleClosePanel}
              onNavigateBack={handleNavigateBack}
              onNavigateToCountry={handleNavigateToCountry}
              onSelectCountryName={handleSelectCountryByName}
              onSelectMunicipality={handleSelectMunicipality}
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
