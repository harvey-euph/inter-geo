import React, { useRef, useCallback, useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
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
  panelWidth: number;
  panelFullWidth: boolean;
  onPanelWidthChange: (width: number) => void;
  onTogglePanelFullWidth: () => void;
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
  panelWidth,
  panelFullWidth,
  onPanelWidthChange,
  onTogglePanelFullWidth,
  onClose,
  onNavigateBack,
  onNavigateToCountry,
  onSelectCountryName,
  onSelectMunicipality
}) => {
  const drawerRef = useRef<HTMLElement>(null);
  const resizeRef = useRef<{ pointerId: number; right: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
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

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (panelFullWidth || !drawerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      pointerId: e.pointerId,
      right: drawerRef.current.getBoundingClientRect().right
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    const maxWidth = Math.max(320, window.innerWidth - 24);
    const nextWidth = Math.max(320, Math.min(maxWidth, resize.right - e.clientX));
    onPanelWidthChange(Math.round(nextWidth));
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizeRef.current?.pointerId !== e.pointerId) return;
    e.stopPropagation();
    resizeRef.current = null;
    setIsResizing(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const drawerViewControls = (
    <div className="drawer-view-controls">
      <button
        type="button"
        className="close-btn"
        aria-pressed={panelFullWidth}
        onClick={onTogglePanelFullWidth}
        title={panelFullWidth ? '還原面板寬度' : '面板展開至最左側'}
        aria-label={panelFullWidth ? '還原面板寬度' : '展開面板至全寬'}
      >
        {panelFullWidth ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
      </button>
    </div>
  );

  const drawerProps = {
    ref: drawerRef,
    className: `country-drawer${panelFullWidth ? ' full-width' : ''}${isResizing ? ' is-resizing' : ''}`,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
    style: {
      touchAction: 'pan-y' as const,
      width: panelFullWidth ? '100%' : `${panelWidth}px`,
      maxWidth: '100vw'
    },
  };

  const resizeHandle = !panelFullWidth && (
    <div
      className={`drawer-resize-handle${isResizing ? ' is-resizing' : ''}`}
      role="separator"
      aria-label="拖曳調整 Object 資訊面板寬度"
      aria-orientation="vertical"
      aria-valuemin={320}
      aria-valuemax={Math.max(320, window.innerWidth - 24)}
      aria-valuenow={panelWidth}
      tabIndex={0}
      onPointerDown={handleResizePointerDown}
      onPointerMove={handleResizePointerMove}
      onPointerUp={handleResizePointerUp}
      onPointerCancel={handleResizePointerUp}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onPanelWidthChange(Math.min(Math.max(320, window.innerWidth - 24), panelWidth + 24));
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          onPanelWidthChange(Math.max(320, panelWidth - 24));
        }
      }}
    >
      <span />
    </div>
  );

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
        {resizeHandle}
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
        {resizeHandle}
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
        {resizeHandle}
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
      {resizeHandle}
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
