import React, { useRef, useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { CountryData } from '../types/geo';
import type { MunicipalityDetail, L2SubdivisionDetail } from '../types/lod';
import { getRoadSystemMeta, type RoadPathData } from '../data/roadsMeta';
import { findCountry } from '../data/countries';
import { MarkdownInfoCards } from './MarkdownInfoCard';
import { L3ChildPicker } from './L3ChildPicker';

interface CountryDetailPanelProps {
  country: CountryData | null;
  subdivision?: L2SubdivisionDetail | null;
  municipality?: MunicipalityDetail | null;
  road?: RoadPathData | null;
  onClose: () => void;
  onNavigateBack?: () => void;
  onNavigateToCountry?: (country: CountryData) => void;
  onSelectCountryName?: (name: string) => void;
  onSelectMunicipality?: (municipality: MunicipalityDetail) => void;
}

export const CountryDetailPanel: React.FC<CountryDetailPanelProps> = React.memo(({
  country,
  subdivision,
  municipality,
  road,
  onClose,
  onNavigateBack,
  onNavigateToCountry,
  onSelectCountryName,
  onSelectMunicipality
}) => {
  const drawerRef = useRef<HTMLElement>(null);
  const [drawerWidth, setDrawerWidth] = useState(420);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    touchStartX.current = e.clientX;
    touchStartY.current = e.clientY;
    isSwiping.current = false;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'touch' || !drawerRef.current) return;
    const dx = e.clientX - touchStartX.current;
    const dy = e.clientY - touchStartY.current;

    if (!isSwiping.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      isSwiping.current = true;
    }
    if (!isSwiping.current) return;

    if (dx > 0) {
      const clamped = Math.min(dx, 140);
      drawerRef.current.style.transform = `translateX(${clamped}px)`;
      drawerRef.current.style.transition = 'none';
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'touch' || !drawerRef.current) return;
    const dx = e.clientX - touchStartX.current;

    if (isSwiping.current && dx > 70) {
      onClose();
    } else {
      drawerRef.current.style.transition = 'transform 0.2s ease';
      drawerRef.current.style.transform = 'translateX(0)';
    }
    isSwiping.current = false;
  }, [onClose]);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === drawerRef.current);
    };
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    try {
      if (document.fullscreenElement === drawer) {
        await document.exitFullscreen();
      } else if (drawer.requestFullscreen) {
        await drawer.requestFullscreen();
      }
    } catch {
      // Fullscreen can be denied by browser policy; keep the panel usable inline.
    }
  }, []);

  const drawerViewControls = (
    <div className="drawer-view-controls">
      <label className="drawer-width-control">
        <span>寬度</span>
        <select
          value={drawerWidth}
          onChange={(e) => setDrawerWidth(Number(e.target.value))}
          aria-label="Object 資訊面板寬度"
        >
          <option value={420}>標準</option>
          <option value={640}>寬</option>
          <option value={900}>特寬</option>
        </select>
      </label>
      <button
        type="button"
        className="drawer-view-btn"
        aria-pressed={isFullscreen}
        onClick={() => void toggleFullscreen()}
      >
        {isFullscreen ? '還原' : '全螢幕'}
      </button>
    </div>
  );

  const drawerProps = {
    ref: drawerRef,
    className: 'country-drawer',
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
    style: {
      touchAction: 'pan-y' as const,
      width: `min(${drawerWidth}px, 100vw)`,
      maxWidth: '100vw'
    },
  };

  // 0. Highway & Route Detail (Roads Mode)
  if (road) {
    const isInterstate = road.class === 'Interstate';
    const roadCountry = (road.iso2 ? findCountry(road.iso2) : undefined) || country || undefined;
    const parentCountryName = roadCountry?.nameZh || road.iso2 || '國家';
    const roadMeta = getRoadSystemMeta(road, roadCountry);

    const handleBack = () => {
      if (roadCountry && onNavigateToCountry) {
        onNavigateToCountry(roadCountry);
      } else if (onNavigateBack) {
        onNavigateBack();
      }
    };

    return (
      <aside {...drawerProps}>
        <div className="drawer-header">
          <div className="drawer-country-title">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 800,
                background: isInterstate
                  ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                  : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: '#ffffff',
                boxShadow: isInterstate
                  ? '0 0 12px rgba(56, 189, 248, 0.45)'
                  : '0 0 12px rgba(251, 191, 36, 0.45)',
                letterSpacing: 0.5
              }}
            >
              {road.name}
            </span>
            <div>
              <div className="drawer-name-zh">
                {roadMeta.flag} {road.name} · {roadMeta.systemZh}
              </div>
              <div className="drawer-name-en">
                {roadMeta.systemEn}
              </div>
            </div>
          </div>
          <div className="drawer-header-actions">
            {drawerViewControls}
            <button className="close-btn" onClick={onClose} title="關閉情報卡 (ESC)">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="drawer-content">
          <div className="drawer-breadcrumbs">
            {roadCountry && (
              <>
                <span
                  className="drawer-breadcrumb-link"
                  onClick={handleBack}
                  title={`查看 ${parentCountryName} 國家情報`}
                >
                  {roadCountry.flag} {roadCountry.nameZh}
                </span>
                <span className="drawer-breadcrumb-sep">›</span>
              </>
            )}
            <span className="drawer-breadcrumb-current">
              {road.name} · {roadMeta.systemZh}
            </span>
          </div>

          <MarkdownInfoCards
            query={{
              roadName: road.name,
              roadClass: road.class,
              countryIso2: road.iso2
            }}
            onSelectCountryName={onSelectCountryName}
          />
        </div>
      </aside>
    );
  }

  // L3 subdivision
  if (municipality) {
    const flag = municipality.countryFlag || '🏙️';
    const countryNameZh = municipality.countryNameZh || '';
    const parentL2Name = municipality.pref || municipality.parentName || '一級行政區';
    const ownName = municipality.city || municipality.nameZh;

    return (
      <aside {...drawerProps}>
        <div className="drawer-header">
          <div className="drawer-country-title">
            <span className="drawer-flag" role="img" aria-label="city">{flag}</span>
            <div>
              <div className="drawer-name-zh">{ownName}</div>
            </div>
          </div>
          <div className="drawer-header-actions">
            {drawerViewControls}
            <button className="close-btn" onClick={onClose} title="關閉情報卡 (ESC)">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="drawer-content">
          <div className="drawer-breadcrumbs">
            <span
              className="drawer-breadcrumb-link"
              onClick={() => {
                if (!municipality.iso2) return;
                const c = findCountry(municipality.iso2);
                if (c && onNavigateToCountry) onNavigateToCountry(c);
              }}
              title={`查看 ${countryNameZh || '國家'} 國家情報`}
            >
              {municipality.countryFlag || '🌐'} {countryNameZh || '國家'}
            </span>
            <span className="drawer-breadcrumb-sep">›</span>
            <span
              className="drawer-breadcrumb-link"
              onClick={onNavigateBack}
              title={`查看 ${parentL2Name} 行政區情報`}
            >
              {parentL2Name}
            </span>
            <span className="drawer-breadcrumb-sep">›</span>
            <span className="drawer-breadcrumb-current">{municipality.city}</span>
          </div>

          <MarkdownInfoCards
            query={{
              countryIso2: municipality.iso2,
              municipalityCode: municipality.code || `${municipality.iso2 || 'XX'}-LOCAL`
            }}
            onSelectCountryName={onSelectCountryName}
          />
        </div>
      </aside>
    );
  }

  // L2 subdivision
  if (subdivision) {
    const flag = subdivision.countryFlag || '🌐';
    const titleZh = subdivision.nameZh || subdivision.nameEn || subdivision.name;
    const titleEn = subdivision.nameEn && subdivision.nameEn !== titleZh ? subdivision.nameEn : '';

    return (
      <aside {...drawerProps}>
        <div className="drawer-header">
          <div className="drawer-country-title">
            <span className="drawer-flag" role="img" aria-label="flag">{flag}</span>
            <div>
              <div className="drawer-name-zh">{titleZh}</div>
              {titleEn ? <div className="drawer-name-en">{titleEn}</div> : null}
            </div>
          </div>
          <div className="drawer-header-actions">
            {drawerViewControls}
            <button className="close-btn" onClick={onClose} title="關閉情報卡 (ESC)">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="drawer-content">
          <div className="drawer-breadcrumbs">
            <span
              className="drawer-breadcrumb-link"
              onClick={onNavigateBack}
              title={`查看 ${subdivision.countryNameZh} 國家情報`}
            >
              {subdivision.countryFlag || '🌐'} {subdivision.countryNameZh}
            </span>
            <span className="drawer-breadcrumb-sep">›</span>
            <span className="drawer-breadcrumb-current">{titleZh}</span>
          </div>

          {onSelectMunicipality && (
            <L3ChildPicker
              key={`${subdivision.iso2}:${subdivision.code}:${subdivision.id}`}
              subdivision={subdivision}
              onSelect={onSelectMunicipality}
            />
          )}

          <MarkdownInfoCards
            query={{
              countryIso2: subdivision.iso2,
              subdivisionCode: subdivision.code || subdivision.nameEn || subdivision.nameZh,
              subdivisionId: subdivision.id
            }}
            onSelectCountryName={onSelectCountryName}
          />
        </div>
      </aside>
    );
  }

  // Country Detail (L1)
  if (!country) return null;

  return (
    <aside {...drawerProps}>
      <div className="drawer-header">
        <div className="drawer-country-title">
          <span className="drawer-flag">{country.flag}</span>
          <div>
            <div className="drawer-name-zh">{country.nameZh}</div>
            <div className="drawer-name-en">
              {country.name} · {country.iso2} ({country.region} / {country.continent})
            </div>
          </div>
        </div>
        <div className="drawer-header-actions">
          {drawerViewControls}
          <button className="close-btn" onClick={onClose} title="關閉情報卡 (ESC)">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="drawer-content">
        <div className="drawer-breadcrumbs">
          <span className="drawer-breadcrumb-current">
            {country.flag} {country.nameZh} ({country.name}) · {country.continent} / {country.region}
          </span>
        </div>

        <MarkdownInfoCards
          query={{
            countryIso2: country.iso2
          }}
          onSelectCountryName={onSelectCountryName}
        />
      </div>
    </aside>
  );
});
