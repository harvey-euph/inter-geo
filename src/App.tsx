import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
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
import {
  parseLayersFromUrl,
  isLayerFillColor,
  getLayerGoto,
  checkAnyLayerHasGoto,
  getActiveLayersList
} from './layers/layerUrlUtils';
import './App.css';

// Reload: 把座標 & ratio 丟棄，只留下 layers 和 target
if (typeof window !== 'undefined') {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const isReload =
    nav?.type === 'reload' ||
    (window.performance && (window.performance as unknown as { navigation?: { type?: number } }).navigation?.type === 1);
  if (isReload) {
    const url = new URL(window.location.href);
    if (url.searchParams.has('lat') || url.searchParams.has('lon') || url.searchParams.has('ratio')) {
      url.searchParams.delete('lat');
      url.searchParams.delete('lon');
      url.searchParams.delete('ratio');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }
}

const CountryDetailPanel = lazy(() =>
  import('./components/CountryDetailPanel').then((m) => ({ default: m.CountryDetailPanel }))
);
const QuizModal = lazy(() =>
  import('./components/QuizModal').then((m) => ({ default: m.QuizModal }))
);

export function App() {
  const [initialLayers] = useState(() => parseLayersFromUrl(new URLSearchParams(window.location.search)));
  const [initialTargetParam] = useState(() => new URLSearchParams(window.location.search).get('target')?.trim() || '');

  // 整理所有 layer= 放進 layers:
  // bool filled_with_color = false;
  // bool gone = false;
  // for (Layer layer : layers) {
  //     if (layer.type == FillWithColor) {
  //         if (filled_with_color) continue;
  //         layer.active();
  //         filled_with_color = true;
  //     } else if (layer.@goto) {
  //         if (gone) continue;
  //         layer.active();
  //         gone = true;
  //     } else layer.active();
  // }
  // if (gone) return;
  // if (target) {
  //     goto(target.bbox);
  //     target.infocard.open();
  //     return;
  // }
  // goto(remaining tags);
  const initialResolved = useMemo(() => {
    let filledWithColor = false;
    let gone = false;
    let gotoQuery: string | null = null;
    let filterId = 'base';
    const textFilters = new Set<string>();
    let imageFilter: string | null = null;
    const regionalFilters = new Set<string>();

    const activateItem = (id: string) => {
      const csv = getCsvLayerById(id);
      if (
        (csv?.type === 'Text' || csv?.type === 'TextWithStyle') &&
        csv?.group === 'global-label'
      ) {
        textFilters.add(id);
      } else if (csv?.type === 'Image') {
        imageFilter = id;
        if (id === 'pedestrian-crossing' || id === 'eu-pedestrian-crossing') {
          regionalFilters.add('eu-pedestrian-crossing');
          regionalFilters.add('pedestrian-crossing');
        }
      } else {
        if (id === 'roads-highways' || id === 'us-interstates') {
          regionalFilters.add('us-interstates');
        } else if (id === 'roads-numbered' || id === 'us-numbered-highways') {
          regionalFilters.add('us-numbered-highways');
        } else if (id === 'pedestrian-crossing' || id === 'eu-pedestrian-crossing') {
          regionalFilters.add('eu-pedestrian-crossing');
          regionalFilters.add('pedestrian-crossing');
        } else {
          regionalFilters.add(id);
        }
      }
    };

    for (const layerId of initialLayers) {
      const isFill = isLayerFillColor(layerId);
      const layerGoto = getLayerGoto(layerId);

      if (isFill) {
        if (filledWithColor) continue;
        filterId = layerId;
        filledWithColor = true;
      } else if (layerGoto) {
        if (gone) continue;
        activateItem(layerId);
        gone = true;
        gotoQuery = layerGoto;
      } else {
        activateItem(layerId);
      }
    }

    return {
      filterId,
      textFilters,
      imageFilter,
      regionalFilters,
      gone,
      gotoQuery
    };
  }, [initialLayers]);

  // if (gone) return; (target is bypassed)
  const initialTarget = initialResolved.gone ? '' : initialTargetParam;
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

  const [activeFilterId, setActiveFilterId] = useState<string>(initialResolved.filterId);
  const [activeTextFilters, setActiveTextFilters] = useState<Set<string>>(() => initialResolved.textFilters);
  const [activeInternationalImageFilter, setActiveInternationalImageFilter] = useState<string | null>(
    initialResolved.imageFilter
  );
  const [activeRegionalFilters, setActiveRegionalFilters] = useState<Set<string>>(
    () => initialResolved.regionalFilters
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

  // URL startup rules dispatcher:
  // if (gone) return;
  // if (target) { goto(target.bbox); target.infocard.open(); return; }
  // goto(remaining tags);
  useEffect(() => {
    if (startupDispatchedRef.current) return;

    const dispatchUrlRules = () => {
      if (startupDispatchedRef.current) return;
      const params = new URLSearchParams(window.location.search);
      const layers = parseLayersFromUrl(params);
      const targetParam = params.get('target')?.trim();

      let filledWithColor = false;
      let gone = false;
      let gotoQuery: string | null = null;

      for (const layerId of layers) {
        const isFill = isLayerFillColor(layerId);
        const layerGoto = getLayerGoto(layerId);
        if (isFill) {
          if (filledWithColor) continue;
          filledWithColor = true;
        } else if (layerGoto) {
          if (gone) continue;
          gone = true;
          gotoQuery = layerGoto;
        }
      }

      if (gone && gotoQuery) {
        try {
          const p = new URLSearchParams(gotoQuery);
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
  }, []);

  // URL 實時同步中央調度器:
  // 1. layer 列出所有開啟中的
  // 2. info card 如果開啟，就要帶上 target=
  // 3. 如果開啟的 layer 沒有任何 goto，就記錄當下座標 & ratio
  const syncAppUrl = useCallback(
    (
      layersList: string[],
      targetStr: string | null
    ) => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);

      // 1. layer 列出所有開啟中的
      url.searchParams.delete('layer');
      for (const l of layersList) {
        url.searchParams.append('layer', l);
      }

      // 2. info card 如果開啟，就要帶上 target=
      if (targetStr) {
        url.searchParams.set('target', targetStr);
      } else {
        url.searchParams.delete('target');
      }

      // 3. 如果開啟的 layer 沒有任何 goto，就記錄當下座標 & ratio (由 WorldMap syncViewToUrl 維護；若有 goto 則清理)
      const hasGoto = checkAnyLayerHasGoto(layersList);
      if (hasGoto) {
        url.searchParams.delete('lat');
        url.searchParams.delete('lon');
        url.searchParams.delete('ratio');
      }

      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    },
    []
  );

  const getTargetStr = useCallback((country: CountryData | null, sub: L2SubdivisionDetail | null) => {
    if (sub) return `${sub.iso2}::${sub.id}`;
    if (country) return country.iso2;
    return null;
  }, []);

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
    const targetStr = country ? country.iso2 : null;
    const activeLayers = getActiveLayersList(activeFilterId, activeTextFilters, activeInternationalImageFilter, activeRegionalFilters);
    syncAppUrl(activeLayers, targetStr);
  }, [activeFilterId, activeTextFilters, activeInternationalImageFilter, activeRegionalFilters, syncAppUrl]);

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
    const targetStr = sub ? `${sub.iso2}::${sub.id}` : null;
    const activeLayers = getActiveLayersList(activeFilterId, activeTextFilters, activeInternationalImageFilter, activeRegionalFilters);
    syncAppUrl(activeLayers, targetStr);
  }, [activeFilterId, activeTextFilters, activeInternationalImageFilter, activeRegionalFilters, syncAppUrl]);

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

      const targetStr = getTargetStr(selectedCountry, selectedSubdivision);
      const activeLayers = getActiveLayersList(activeFilterId, next, null, activeRegionalFilters);
      syncAppUrl(activeLayers, targetStr);
      return next;
    });
  }, [selectedCountry, selectedSubdivision, getTargetStr, activeFilterId, activeRegionalFilters, syncAppUrl]);

  const handleToggleInternationalImageFilter = useCallback((filterId: string) => {
    setActiveInternationalImageFilter((prev) => {
      const isSameOrAlias =
        prev === filterId ||
        ((prev === 'eu-pedestrian-crossing' || prev === 'pedestrian-crossing') &&
          (filterId === 'eu-pedestrian-crossing' || filterId === 'pedestrian-crossing'));

      let nextFilter: string | null;
      let nextReg = activeRegionalFilters;
      let nextText = activeTextFilters;

      if (isSameOrAlias) {
        if (activeRegionalFilters.has('eu-pedestrian-crossing') || activeRegionalFilters.has('pedestrian-crossing')) {
          const nr = new Set(activeRegionalFilters);
          nr.delete('eu-pedestrian-crossing');
          nr.delete('pedestrian-crossing');
          setActiveRegionalFilters(nr);
          nextReg = nr;
        }
        nextFilter = null;
      } else {
        // Activating an image filter closes all text filters!
        setActiveTextFilters(new Set());
        nextText = new Set();
        if (filterId === 'eu-pedestrian-crossing' || filterId === 'pedestrian-crossing') {
          const nr = new Set(activeRegionalFilters);
          nr.add('eu-pedestrian-crossing');
          nr.add('pedestrian-crossing');
          setActiveRegionalFilters(nr);
          nextReg = nr;
        }
        nextFilter = filterId;
      }

      const targetStr = getTargetStr(selectedCountry, selectedSubdivision);
      const activeLayers = getActiveLayersList(activeFilterId, nextText, nextFilter, nextReg);
      syncAppUrl(activeLayers, targetStr);
      return nextFilter;
    });
  }, [activeRegionalFilters, activeTextFilters, selectedCountry, selectedSubdivision, getTargetStr, activeFilterId, syncAppUrl]);

  const handleToggleRegionalFilter = useCallback((filterId: string, skipCameraJump = false) => {
    let nextReg: Set<string>;

    if (filterId === 'eu-pedestrian-crossing' || filterId === 'pedestrian-crossing') {
      let nextImg: string | null;
      const isCurrentlyActive =
        activeRegionalFilters.has('eu-pedestrian-crossing') ||
        activeRegionalFilters.has('pedestrian-crossing') ||
        activeInternationalImageFilter === 'eu-pedestrian-crossing' ||
        activeInternationalImageFilter === 'pedestrian-crossing';

      if (isCurrentlyActive) {
        nextReg = new Set(activeRegionalFilters);
        nextReg.delete('eu-pedestrian-crossing');
        nextReg.delete('pedestrian-crossing');
        setActiveRegionalFilters(nextReg);
        setActiveInternationalImageFilter(null);
        nextImg = null;
      } else {
        nextReg = new Set(activeRegionalFilters);
        nextReg.add('eu-pedestrian-crossing');
        nextReg.add('pedestrian-crossing');
        setActiveRegionalFilters(nextReg);
        setActiveInternationalImageFilter('pedestrian-crossing');
        nextImg = 'pedestrian-crossing';

        const csvLayer = getCsvLayerById('pedestrian-crossing') || getCsvLayerById('eu-pedestrian-crossing');
        if (csvLayer && !csvLayer.loaded) {
          void loadOnDemandCsvLayer(csvLayer.id);
        }
        if (!skipCameraJump) {
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
      }

      const targetStr = getTargetStr(selectedCountry, selectedSubdivision);
      const activeLayers = getActiveLayersList(activeFilterId, activeTextFilters, nextImg, nextReg);
      syncAppUrl(activeLayers, targetStr);
      return;
    }

    const targetDef = getNationwideLayerById(filterId);
    const turningOn = !activeRegionalFilters.has(filterId);

    nextReg = new Set(activeRegionalFilters);
    if (nextReg.has(filterId)) {
      nextReg.delete(filterId);
      if (filterId === 'us-interstates' || filterId === 'roads-highways') {
        setSelectedRoad((r) => (r?.class === 'Interstate' ? null : r));
      } else if (filterId === 'us-numbered-highways' || filterId === 'roads-numbered') {
        setSelectedRoad((r) => (r && r.class !== 'Interstate' ? null : r));
      } else if (targetDef?.layerType === 'roads') {
        const roadIso = targetDef.countryIso2 || filterId.slice(0, 2).toUpperCase();
        const roadClass = targetDef.roadClass;
        setSelectedRoad((r) => {
          if (!r) return null;
          const rClass = r.class === 'Interstate' ? 'Interstate' : 'Federal';
          if (r.iso2 === roadIso && (!roadClass || rClass === roadClass)) {
            return null;
          }
          return r;
        });
      }
    } else {
      // Single-select within 'coloring' layerType
      if (targetDef?.layerType === 'coloring') {
        for (const existingId of Array.from(nextReg)) {
          const existingDef = getNationwideLayerById(existingId);
          if (existingDef?.layerType === 'coloring') {
            nextReg.delete(existingId);
          }
        }
      }
      nextReg.add(filterId);
    }
    setActiveRegionalFilters(nextReg);

    const targetStr = getTargetStr(selectedCountry, selectedSubdivision);
    const activeLayers = getActiveLayersList(activeFilterId, activeTextFilters, activeInternationalImageFilter, nextReg);
    syncAppUrl(activeLayers, targetStr);

    if (!turningOn) return;

    const csvLayer = getCsvLayerById(filterId);
    if (csvLayer) {
      if (!csvLayer.loaded) {
        void loadOnDemandCsvLayer(csvLayer.id).then((loaded: RegisteredCsvLayer | undefined) => {
          if (skipCameraJump) return;
          const freshGoto = loaded?.meta?.goto || loaded?.goto || loaded?.data?.meta?.goto;
          if (freshGoto) {
            try {
              const p = new URLSearchParams(freshGoto);
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
        });
      }
      if (skipCameraJump) return;

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

      // For CSV layers without @goto, do not jump camera
      return;
    }

    if (skipCameraJump) return;

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
  }, [activeRegionalFilters, activeInternationalImageFilter, activeFilterId, activeTextFilters, selectedCountry, selectedSubdivision, getTargetStr, syncAppUrl]);

  const handleResetAllFilters = useCallback(() => {
    setActiveFilterId('base');
    setActiveTextFilters(new Set());
    setActiveInternationalImageFilter(null);
    setActiveRegionalFilters(new Set());
    const targetStr = getTargetStr(selectedCountry, selectedSubdivision);
    syncAppUrl([], targetStr);
  }, [selectedCountry, selectedSubdivision, getTargetStr, syncAppUrl]);

  const handleClosePanel = useCallback(() => {
    setSelectedCountry(null);
    setSelectedSubdivision(null);
    setSelectedMunicipality(null);
    setSelectedRoad(null);
    const activeLayers = getActiveLayersList(activeFilterId, activeTextFilters, activeInternationalImageFilter, activeRegionalFilters);
    syncAppUrl(activeLayers, null);
  }, [activeFilterId, activeTextFilters, activeInternationalImageFilter, activeRegionalFilters, syncAppUrl]);

  const handleSelectFilter = useCallback((filterId: string) => {
    setActiveFilterId(filterId);
    const targetStr = getTargetStr(selectedCountry, selectedSubdivision);
    const activeLayers = getActiveLayersList(filterId, activeTextFilters, activeInternationalImageFilter, activeRegionalFilters);
    syncAppUrl(activeLayers, targetStr);
  }, [selectedCountry, selectedSubdivision, getTargetStr, activeTextFilters, activeInternationalImageFilter, activeRegionalFilters, syncAppUrl]);

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
              activeRegionalFilters={activeRegionalFilters}
              activeTextFilters={activeTextFilters}
              activeInternationalImageFilter={activeInternationalImageFilter}
              onToggleLayer={(layerId) => handleToggleRegionalFilter(layerId, true)}
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
