import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { LayerBar } from './components/LayerBar';
import { InfoSettingsWindow } from './components/InfoSettingsWindow';
import { WorldMap } from './components/WorldMap';
import type { CountryData } from './types/geo';
import type { MunicipalityDetail, L2SubdivisionDetail } from './types/lod';
import type { MapFocusTarget, MapSelectOptions, RoadPathData } from './components/WorldMap';
import { findCountry, COUNTRIES_DATA } from './data/countries';
import {
  getNationwideLayerById,
  type NationwideLayerDef
} from './data/nationwideLayers';
import {
  getCsvLayerById,
  loadOnDemandCsvLayer,
  onLayersIndexLoaded,
  type RegisteredCsvLayer
} from './layers/csvLayerRegistry';
import './App.css';

const CountryDetailPanel = lazy(() =>
  import('./components/CountryDetailPanel').then((m) => ({ default: m.CountryDetailPanel }))
);
const QuizModal = lazy(() =>
  import('./components/QuizModal').then((m) => ({ default: m.QuizModal }))
);

export function App() {
  const [initialLayerParam] = useState(() => new URLSearchParams(window.location.search).get('layer')?.trim() || '');
  const [initialTargetParam] = useState(() => new URLSearchParams(window.location.search).get('target')?.trim() || '');

  // 1. if (layer)
  const initialCsvLayer = initialLayerParam ? getCsvLayerById(initialLayerParam) : undefined;
  const initialNationwideLayer = initialLayerParam ? getNationwideLayerById(initialLayerParam) : undefined;
  const isBaseLayer = initialLayerParam === 'base' || initialLayerParam === 'none';
  const layerHasGoto = Boolean(initialCsvLayer?.goto || initialCsvLayer?.meta?.goto);

  // If layer.@goto exists, it navigates camera and returns (target is bypassed)
  const initialTarget = layerHasGoto ? '' : initialTargetParam;
  const initialTargetSeparator = initialTarget.includes('::')
    ? '::'
    : (initialTarget.includes('-') && !findCountry(initialTarget) ? '-' : null);
  const initialTargetParts = initialTargetSeparator
    ? initialTarget.split(initialTargetSeparator)
    : (initialTarget ? [initialTarget] : []);

  const initialCountry = initialTargetParts.length >= 1 ? findCountry(initialTargetParts[0]) || null : null;
  const initialSubdivision: L2SubdivisionDetail | null =
    initialTargetParts.length >= 2 && initialCountry
      ? {
          id: initialTargetParts.slice(1).join(initialTargetSeparator || '::').trim(),
          iso2: initialCountry.iso2,
          name: initialTargetParts.slice(1).join(initialTargetSeparator || '::').trim(),
          nameEn: initialTargetParts.slice(1).join(initialTargetSeparator || '::').trim(),
          nameZh: initialTargetParts.slice(1).join(initialTargetSeparator || '::').trim(),
          typeEn: '一級行政區',
          code: initialTargetParts.slice(1).join(initialTargetSeparator || '::').trim(),
          postal: initialTargetParts.slice(1).join(initialTargetSeparator || '::').trim(),
          countryName: initialCountry.name,
          countryNameZh: initialCountry.nameZh,
          countryFlag: initialCountry.flag
        }
      : null;

  const isFillRegion =
    isBaseLayer ||
    (initialCsvLayer?.type === 'FillWithColor' && initialCsvLayer?.group !== 'area-feature') ||
    initialCsvLayer?.group === 'fill-region' ||
    initialCsvLayer?.group === 'fill-region-with-color';
  const [activeFilterId, setActiveFilterId] = useState<string>(isFillRegion ? initialLayerParam : 'base');

  const isGlobalLabel =
    (initialCsvLayer?.type === 'Text' || initialCsvLayer?.type === 'TextWithStyle') &&
    initialCsvLayer?.group === 'global-label';
  const [activeTextFilters, setActiveTextFilters] = useState<Set<string>>(
    () => new Set(isGlobalLabel ? [initialLayerParam] : [])
  );

  const [activeInternationalImageFilter, setActiveInternationalImageFilter] = useState<string | null>(
    initialCsvLayer?.type === 'Image' ? initialLayerParam : null
  );

  const isAreaFeature =
    initialCsvLayer?.group === 'area-feature' ||
    initialCsvLayer?.meta.group === 'area-feature' ||
    initialCsvLayer?.type === 'ExtObject' ||
    !!initialNationwideLayer ||
    (initialCsvLayer?.type === 'Image' && (initialLayerParam === 'pedestrian-crossing' || initialLayerParam === 'eu-pedestrian-crossing'));

  const [activeRegionalFilters, setActiveRegionalFilters] = useState<Set<string>>(
    () => {
      const set = new Set<string>();
      if (isAreaFeature && initialLayerParam) {
        if (initialLayerParam === 'roads-highways' || initialLayerParam === 'us-interstates') {
          set.add('us-interstates');
        } else if (initialLayerParam === 'roads-numbered' || initialLayerParam === 'us-numbered-highways') {
          set.add('us-numbered-highways');
        } else if (initialLayerParam === 'pedestrian-crossing' || initialLayerParam === 'eu-pedestrian-crossing') {
          set.add('eu-pedestrian-crossing');
          set.add('pedestrian-crossing');
        } else {
          set.add(initialLayerParam);
        }
      }
      return set;
    }
  );

  const [visibleRegionalFilters, setVisibleRegionalFilters] = useState<NationwideLayerDef[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(
    initialSubdivision ? null : initialCountry
  );
  const [selectedSubdivision, setSelectedSubdivision] = useState<L2SubdivisionDetail | null>(
    initialSubdivision
  );
  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalityDetail | null>(null);
  const [selectedRoad, setSelectedRoad] = useState<RoadPathData | null>(null);
  const [detailPanelWidth, setDetailPanelWidth] = useState(420);
  const [detailPanelFullWidth, setDetailPanelFullWidth] = useState(false);
  const showInterstates = activeRegionalFilters.has('us-interstates') || activeRegionalFilters.has('roads-highways');
  const showNumberedRoutes = activeRegionalFilters.has('us-numbered-highways') || activeRegionalFilters.has('roads-numbered');
  const showRoads = showInterstates || showNumberedRoutes;
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  const zoomToSubdivisionRef = useRef<((iso2: string, id: string | number) => void) | null>(null);
  const focusMapRef = useRef<((target: MapFocusTarget) => void) | null>(null);
  const initialFocusTarget = '';
  const startupDispatchedRef = useRef(false);

  const activateLayerById = useCallback((layerId: string) => {
    if (!layerId) return;
    const csvLayer = getCsvLayerById(layerId);
    const isBase = layerId === 'base' || layerId === 'none';

    if (
      isBase ||
      (csvLayer?.type === 'FillWithColor' && csvLayer?.group !== 'area-feature') ||
      csvLayer?.group === 'fill-region' ||
      csvLayer?.group === 'fill-region-with-color'
    ) {
      setActiveFilterId(layerId);
    } else if (
      (csvLayer?.type === 'Text' || csvLayer?.type === 'TextWithStyle') &&
      csvLayer?.group === 'global-label'
    ) {
      setActiveTextFilters(new Set([layerId]));
    } else if (csvLayer?.type === 'Image') {
      setActiveInternationalImageFilter(layerId);
      if (layerId === 'pedestrian-crossing' || layerId === 'eu-pedestrian-crossing') {
        setActiveRegionalFilters((prev) => {
          const next = new Set(prev);
          next.add('eu-pedestrian-crossing');
          next.add('pedestrian-crossing');
          return next;
        });
      }
    } else {
      setActiveRegionalFilters((prev) => {
        const next = new Set(prev);
        if (layerId === 'roads-highways' || layerId === 'us-interstates') {
          next.add('us-interstates');
        } else if (layerId === 'roads-numbered' || layerId === 'us-numbered-highways') {
          next.add('us-numbered-highways');
        } else if (layerId === 'pedestrian-crossing' || layerId === 'eu-pedestrian-crossing') {
          next.add('eu-pedestrian-crossing');
          next.add('pedestrian-crossing');
        } else {
          next.add(layerId);
        }
        return next;
      });
    }
  }, []);

  // URL startup rules dispatcher:
  // if (layer) {
  //     layer.active();
  //     if (layer.@goto) {
  //         goto(layer.@goto);
  //         return;
  //     }
  // }
  // if (target) {
  //     goto(target.bbox);
  //     target.infocard.open();
  //     return;
  // }
  // goto(remaining tags);
  useEffect(() => {
    if (startupDispatchedRef.current) return;

    const dispatchUrlRules = () => {
      if (startupDispatchedRef.current) return;
      const params = new URLSearchParams(window.location.search);
      const layerParam = params.get('layer')?.trim();
      const targetParam = params.get('target')?.trim();

      if (layerParam) {
        activateLayerById(layerParam);
        const csvLayer = getCsvLayerById(layerParam);
        const layerGoto = csvLayer?.goto || csvLayer?.meta?.goto;
        if (layerGoto) {
          try {
            const p = new URLSearchParams(layerGoto);
            const lat = Number(p.get('lat'));
            const lon = Number(p.get('lon'));
            const ratio = p.has('ratio') ? Number(p.get('ratio')) : undefined;
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              focusMapRef.current?.({ kind: 'coordinates', lat, lon, ratio, force: true });
              startupDispatchedRef.current = true;
              return;
            }
          } catch {
            // ignore
          }
        }
      }

      if (targetParam) {
        startupDispatchedRef.current = true;
        return;
      }

      const latParam = Number(params.get('lat'));
      const lonParam = Number(params.get('lon'));
      const ratioParam = params.has('ratio') ? Number(params.get('ratio')) : undefined;
      if (Number.isFinite(latParam) && Number.isFinite(lonParam)) {
        focusMapRef.current?.({ kind: 'coordinates', lat: latParam, lon: lonParam, ratio: ratioParam });
      }
      startupDispatchedRef.current = true;
    };

    dispatchUrlRules();

    return onLayersIndexLoaded(() => {
      if (!startupDispatchedRef.current) {
        dispatchUrlRules();
      }
    });
  }, [activateLayerById]);

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
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('target', country.iso2);
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      }
    } else if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('target');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
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
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('target', `${sub.iso2}::${sub.id}`);
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      }
    } else if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('target');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
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

  const handleToggleTextFilter = useCallback((filterId: string) => {
    // Activating a text filter closes the image filter
    setActiveInternationalImageFilter(null);
    setActiveRegionalFilters((rPrev) => {
      if (!rPrev.has('eu-pedestrian-crossing') && !rPrev.has('pedestrian-crossing')) return rPrev;
      const next = new Set(rPrev);
      next.delete('eu-pedestrian-crossing');
      next.delete('pedestrian-crossing');
      return next;
    });
    setActiveTextFilters((prev) => {
      const next = new Set(prev);
      const isActivating = !next.has(filterId);
      if (!isActivating) {
        next.delete(filterId);
      } else {
        // Enforce max 4 concurrent text filters
        if (next.size >= 4) {
          const first = Array.from(next)[0];
          next.delete(first);
        }
        next.add(filterId);
      }

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (isActivating) {
          url.searchParams.set('layer', filterId);
        } else if (next.size > 0) {
          url.searchParams.set('layer', Array.from(next)[0]);
        } else {
          url.searchParams.delete('layer');
        }
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      }
      return next;
    });
  }, []);

  const handleToggleInternationalImageFilter = useCallback((filterId: string) => {
    setActiveInternationalImageFilter((prev) => {
      const isSameOrAlias =
        prev === filterId ||
        ((prev === 'eu-pedestrian-crossing' || prev === 'pedestrian-crossing') &&
          (filterId === 'eu-pedestrian-crossing' || filterId === 'pedestrian-crossing'));

      let nextFilter: string | null;
      if (isSameOrAlias) {
        setActiveRegionalFilters((rPrev) => {
          if (!rPrev.has('eu-pedestrian-crossing') && !rPrev.has('pedestrian-crossing')) return rPrev;
          const next = new Set(rPrev);
          next.delete('eu-pedestrian-crossing');
          next.delete('pedestrian-crossing');
          return next;
        });
        nextFilter = null;
      } else {
        // Activating an image filter closes all text filters!
        setActiveTextFilters(new Set());
        if (filterId === 'eu-pedestrian-crossing' || filterId === 'pedestrian-crossing') {
          setActiveRegionalFilters((rPrev) => {
            const next = new Set(rPrev);
            next.add('eu-pedestrian-crossing');
            next.add('pedestrian-crossing');
            return next;
          });
        }
        nextFilter = filterId;
      }

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (nextFilter) {
          url.searchParams.set('layer', nextFilter);
        } else {
          url.searchParams.delete('layer');
        }
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      }
      return nextFilter;
    });
  }, []);

  const handleToggleRegionalFilter = useCallback((filterId: string) => {
    if (filterId === 'eu-pedestrian-crossing' || filterId === 'pedestrian-crossing') {
      const isCurrentlyActive =
        activeRegionalFilters.has('eu-pedestrian-crossing') ||
        activeRegionalFilters.has('pedestrian-crossing') ||
        activeInternationalImageFilter === 'eu-pedestrian-crossing' ||
        activeInternationalImageFilter === 'pedestrian-crossing';

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (!isCurrentlyActive) {
          url.searchParams.set('layer', 'pedestrian-crossing');
        } else {
          url.searchParams.delete('layer');
        }
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      }

      if (isCurrentlyActive) {
        setActiveRegionalFilters((prev) => {
          const next = new Set(prev);
          next.delete('eu-pedestrian-crossing');
          next.delete('pedestrian-crossing');
          return next;
        });
        setActiveInternationalImageFilter(null);
      } else {
        setActiveRegionalFilters((prev) => {
          const next = new Set(prev);
          next.add('eu-pedestrian-crossing');
          next.add('pedestrian-crossing');
          return next;
        });
        setActiveInternationalImageFilter('pedestrian-crossing');

        const csvLayer = getCsvLayerById('pedestrian-crossing') || getCsvLayerById('eu-pedestrian-crossing');
        const csvGoto = csvLayer?.meta?.goto || csvLayer?.goto || 'lat=50&lon=16&ratio=4';
        if (csvGoto) {
          try {
            const p = new URLSearchParams(csvGoto);
            const lat = Number(p.get('lat'));
            const lon = Number(p.get('lon'));
            const ratio = p.has('ratio') ? Number(p.get('ratio')) : undefined;
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              focusMapRef.current?.({ kind: 'coordinates', lat, lon, ratio });
            }
          } catch {
            // ignore
          }
        }
      }
      return;
    }

    const targetDef = getNationwideLayerById(filterId);
    const turningOn = !activeRegionalFilters.has(filterId);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (turningOn) {
        url.searchParams.set('layer', filterId);
      } else {
        url.searchParams.delete('layer');
      }
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }

    setActiveRegionalFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filterId)) {
        next.delete(filterId);
        if (filterId === 'us-interstates' || filterId === 'roads-highways') {
          setSelectedRoad((r) => (r?.class === 'Interstate' ? null : r));
        } else if (filterId === 'us-numbered-highways' || filterId === 'roads-numbered') {
          setSelectedRoad((r) => (r && r.class !== 'Interstate' ? null : r));
        } else if (targetDef?.layerType === 'roads') {
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
            const existingDef = getNationwideLayerById(existingId);
            if (existingDef?.layerType === 'coloring') {
              next.delete(existingId);
            }
          }
        }
        next.add(filterId);
      }
      return next;
    });
    if (!turningOn) return;

    const csvLayer = getCsvLayerById(filterId);
    if (csvLayer) {
      const applyGoto = (gotoStr: string) => {
        try {
          const p = new URLSearchParams(gotoStr);
          const lat = Number(p.get('lat'));
          const lon = Number(p.get('lon'));
          const ratio = p.has('ratio') ? Number(p.get('ratio')) : undefined;
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            focusMapRef.current?.({ kind: 'coordinates', lat, lon, ratio });
            return true;
          }
        } catch {
          // ignore malformed goto query
        }
        return false;
      };

      // 1. Explicit @goto directive
      const csvGoto = csvLayer.meta?.goto || csvLayer.goto;
      if (csvGoto && applyGoto(csvGoto)) {
        return;
      }

      // If not loaded yet, fetch and apply any @goto defined in CSV
      if (!csvLayer.loaded) {
        void loadOnDemandCsvLayer(csvLayer.id).then((loaded: RegisteredCsvLayer | undefined) => {
          const freshGoto = loaded?.meta?.goto || loaded?.goto || loaded?.data?.meta?.goto;
          if (freshGoto && applyGoto(freshGoto)) return;
        });
      }

      // For CSV layers without @goto, do not jump camera
      return;
    }

    if (targetDef) {
      if (targetDef.customBBoxes && targetDef.customBBoxes.length > 0) {
        focusMapRef.current?.({ kind: 'bbox', boxes: targetDef.customBBoxes });
      } else if (targetDef.customBBox) {
        focusMapRef.current?.({ kind: 'bbox', boxes: [targetDef.customBBox] });
      } else {
        const iso =
          targetDef.countryIso2 || (targetDef.targetIso2 !== '*' ? targetDef.targetIso2 : '');
        if (iso) focusMapRef.current?.({ kind: 'country', iso2: iso });
      }
    }
  }, [activeRegionalFilters, activeInternationalImageFilter]);

  const handleResetAllFilters = useCallback(() => {
    setActiveFilterId('base');
    setActiveTextFilters(new Set());
    setActiveInternationalImageFilter(null);
    setActiveRegionalFilters(new Set());
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('layer');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedCountry(null);
    setSelectedSubdivision(null);
    setSelectedMunicipality(null);
    setSelectedRoad(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('target');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  const handleSelectFilter = useCallback((filterId: string) => {
    setActiveFilterId(filterId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (filterId && filterId !== 'base' && filterId !== 'none') {
        url.searchParams.set('layer', filterId);
      } else {
        url.searchParams.delete('layer');
      }
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  const [activeWindow, setActiveWindow] = useState<'layer' | 'info' | null>(null);
  const [layerZIndex, setLayerZIndex] = useState(35);
  const [infoZIndex, setInfoZIndex] = useState(35);
  const nextZIndexRef = useRef(36);

  const bringToFront = useCallback((win: 'layer' | 'info') => {
    const nextZ = nextZIndexRef.current++;
    if (win === 'layer') {
      setLayerZIndex(nextZ);
    } else {
      setInfoZIndex(nextZ);
    }
    setActiveWindow(win);
  }, []);

  const [isInfoSettingsExpanded, setIsInfoSettingsExpanded] = useState(false);

  const handleToggleFilterExpanded = useCallback(() => {
    if (!isFilterExpanded) {
      setIsFilterExpanded(true);
      bringToFront('layer');
      return;
    }
    if (activeWindow !== 'layer') {
      bringToFront('layer');
      return;
    }
    setIsFilterExpanded(false);
    if (isInfoSettingsExpanded) {
      bringToFront('info');
    } else {
      setActiveWindow(null);
    }
  }, [isFilterExpanded, activeWindow, isInfoSettingsExpanded, bringToFront]);

  const handleCollapseFilter = useCallback(() => {
    setIsFilterExpanded(false);
    if (activeWindow === 'layer') {
      if (isInfoSettingsExpanded) {
        bringToFront('info');
      } else {
        setActiveWindow(null);
      }
    }
  }, [activeWindow, isInfoSettingsExpanded, bringToFront]);

  const handleToggleInfoSettingsExpanded = useCallback(() => {
    if (!isInfoSettingsExpanded) {
      setIsInfoSettingsExpanded(true);
      bringToFront('info');
      return;
    }
    if (activeWindow !== 'info') {
      bringToFront('info');
      return;
    }
    setIsInfoSettingsExpanded(false);
    if (isFilterExpanded) {
      bringToFront('layer');
    } else {
      setActiveWindow(null);
    }
  }, [isInfoSettingsExpanded, activeWindow, isFilterExpanded, bringToFront]);

  const handleCollapseInfoSettings = useCallback(() => {
    setIsInfoSettingsExpanded(false);
    if (activeWindow === 'info') {
      if (isFilterExpanded) {
        bringToFront('layer');
      } else {
        setActiveWindow(null);
      }
    }
  }, [activeWindow, isFilterExpanded, bringToFront]);

  // Single click on empty ocean space closes both floating windows
  const handleOceanClick = useCallback(() => {
    setIsFilterExpanded(false);
    setIsInfoSettingsExpanded(false);
    setActiveWindow(null);
  }, []);

  // Keyboard shortcut: ESC to close frontmost window or active modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isQuizOpen) {
          setIsQuizOpen(false);
          return;
        }
        // If both floating windows are open, close the one that is currently focused/on top
        if (isFilterExpanded && isInfoSettingsExpanded) {
          if (activeWindow === 'layer') {
            setIsFilterExpanded(false);
            bringToFront('info');
          } else {
            setIsInfoSettingsExpanded(false);
            bringToFront('layer');
          }
          return;
        }
        if (isFilterExpanded) {
          setIsFilterExpanded(false);
          setActiveWindow(null);
          return;
        }
        if (isInfoSettingsExpanded) {
          setIsInfoSettingsExpanded(false);
          setActiveWindow(null);
          return;
        }
        handleClosePanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isQuizOpen, isFilterExpanded, isInfoSettingsExpanded, activeWindow, bringToFront, handleClosePanel]);

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

  const activeLayerCount =
    activeTextFilters.size +
    (activeInternationalImageFilter ? 1 : 0) +
    activeRegionalFilters.size;

  return (
    <div className="app-layout">
      {/* Top Navigation Headline with Single Layer Trigger Button */}
      <Header
        activeLayerCount={activeLayerCount}
        isLayerExpanded={isFilterExpanded}
        isLayerFocused={isFilterExpanded && activeWindow === 'layer'}
        onToggleLayerExpanded={handleToggleFilterExpanded}
        isInfoSettingsExpanded={isInfoSettingsExpanded}
        isInfoSettingsFocused={isInfoSettingsExpanded && activeWindow === 'info'}
        onToggleInfoSettingsExpanded={handleToggleInfoSettingsExpanded}
      />

      {/* Main Viewport */}
      <div className="main-viewport">
        <section className="map-section">
          {/* Tree-based Layer Selector Window */}
          <LayerBar
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
            zIndex={layerZIndex}
            isFront={activeWindow === 'layer'}
            onFocusWindow={() => bringToFront('layer')}
            onGotoCamera={(lat, lon, ratio) => {
              focusMapRef.current?.({ kind: 'coordinates', lat, lon, ratio });
            }}
          />

          {/* Infotip & Info Tag Preference Window */}
          <InfoSettingsWindow
            isExpanded={isInfoSettingsExpanded}
            onCollapse={handleCollapseInfoSettings}
            zIndex={infoZIndex}
            isFront={activeWindow === 'info'}
            onFocusWindow={() => bringToFront('info')}
          />

          {/* GPU-Accelerated Vector World Map with Dynamic LOD Precision Tracking */}
          <WorldMap
            activeFilterId={activeFilterId}
            activeTextFilters={activeTextFilters}
            onToggleTextFilter={handleToggleTextFilter}
            activeInternationalImageFilter={activeInternationalImageFilter}
            onToggleInternationalImageFilter={handleToggleInternationalImageFilter}
            activeRegionalFilters={activeRegionalFilters}
            onToggleRegionalFilter={handleToggleRegionalFilter}
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
            showNumberedRoutes={showNumberedRoutes}
            onOceanClick={handleOceanClick}
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
