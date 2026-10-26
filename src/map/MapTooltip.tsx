import React, { useState, useEffect } from 'react';
import { findCountry } from '../data/countries';
import { getRoadSystemMeta, type RoadPathData } from '../data/roadsMeta';
import { getCrossingSign } from '../data/pedestrianCrossing';
import { isCapitalSubdivision } from '../data/capitalSubdivisions';
import { getDataUrl } from '../data/dataSource';
import { queryInfoStubs } from '../info/infoRegistry';
import {
  getInfotipDisplayMode,
  subscribeInfotipDisplayMode,
  setInfotipDisplayMode,
  INFOTIP_MODE_OPTIONS,
  type InfotipDisplayMode
} from '../info/infotipPreferences';
import { gridObjectId, roadObjectId, subdivisionObjectId } from '../objects/objectId';
import type { CountryData } from '../types/geo';
import type { L2SubdivisionDetail, MunicipalityDetail } from '../types/lod';
import type { InfoStub } from '../types/info';
import type { ExtFeatureItem } from './types';

export interface MapTooltipProps {
  setTooltipNode: (node: HTMLDivElement | null) => void;
  hoveredRoad: RoadPathData | null;
  hoveredCountry: CountryData | null;
  hoveredMunicipality: MunicipalityDetail | null;
  hoveredL2Subdivision: L2SubdivisionDetail | null;
  hoveredExtFeature: ExtFeatureItem | null;
  activeRegionalFilters: Set<string>;
  onOpenFullInfo?: () => void;
  isTouch?: boolean;
}

const MapTooltipComponent: React.FC<MapTooltipProps> = ({
  setTooltipNode,
  hoveredRoad,
  hoveredCountry,
  hoveredMunicipality,
  hoveredL2Subdivision,
  hoveredExtFeature,
  activeRegionalFilters,
  onOpenFullInfo,
  isTouch = false
}) => {
  const [infotipMode, setInfotipMode] = useState<InfotipDisplayMode>(() => getInfotipDisplayMode());

  useEffect(() => {
    return subscribeInfotipDisplayMode(setInfotipMode);
  }, []);

  if (!hoveredRoad && !hoveredCountry && !hoveredMunicipality && !hoveredL2Subdivision && !hoveredExtFeature) {
    return null;
  }

  const cycleInfotipMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const modes: InfotipDisplayMode[] = ['first-item', 'tags-badges', 'card-titles', 'minimal'];
    const nextIdx = (modes.indexOf(infotipMode) + 1) % modes.length;
    setInfotipDisplayMode(modes[nextIdx]);
  };

  const currentModeMeta =
    INFOTIP_MODE_OPTIONS.find((m) => m.id === infotipMode) || INFOTIP_MODE_OPTIONS[0];

  const renderStubsPreview = (stubs: InfoStub[], fallbackHints?: string[]) => {
    if (infotipMode === 'minimal') {
      return null;
    }

    if (infotipMode === 'card-titles') {
      if (stubs.length === 0) return null;
      return (
        <div
          style={{
            marginTop: 6,
            paddingTop: 4,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
        >
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
            相關線索主題 ({stubs.length})
          </div>
          {stubs.slice(0, 4).map((s) => (
            <div
              key={s.id}
              style={{
                fontSize: 11,
                color: s.accentColor || '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>{s.icon || '📄'}</span>
              <span style={{ fontWeight: 600 }}>{s.title}</span>
            </div>
          ))}
        </div>
      );
    }

    if (infotipMode === 'tags-badges') {
      const allTags = Array.from(new Set(stubs.flatMap((s) => s.tags || [])));
      if (allTags.length === 0 && (!fallbackHints || fallbackHints.length === 0)) return null;
      return (
        <div
          style={{
            marginTop: 6,
            paddingTop: 4,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4
          }}
        >
          {allTags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="tooltip-badge"
              style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.25)' }}
            >
              #{tag}
            </span>
          ))}
          {fallbackHints?.slice(0, 2).map((hint, idx) => (
            <span key={idx} className="tooltip-badge" style={{ color: '#93c5fd' }}>
              {hint}
            </span>
          ))}
        </div>
      );
    }

    // Default: 'first-item'
    const stub = stubs[0];
    if (stub) {
      const preview = stub.firstItemPreview;
      return (
        <div
          style={{
            fontSize: 11,
            color: stub.accentColor || '#fbbf24',
            marginTop: 4,
            lineHeight: 1.3,
            borderTop: '1px solid var(--border-color)',
            paddingTop: 4
          }}
        >
          {stub.icon || '💡'} <strong>{stub.title}</strong>
          {preview && (
            <div style={{ color: '#cbd5e1', marginTop: 2, fontSize: 10.5 }}>
              {preview.label ? `${preview.label} ` : ''}
              {preview.content.length > 75 ? `${preview.content.slice(0, 75)}...` : preview.content}
            </div>
          )}
        </div>
      );
    }
    if (fallbackHints && fallbackHints.length > 0) {
      return (
        <div
          style={{
            fontSize: 11,
            color: '#93c5fd',
            marginTop: 4,
            lineHeight: 1.3,
            borderTop: '1px solid var(--border-color)',
            paddingTop: 4
          }}
        >
          💡 {fallbackHints[0]}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      ref={setTooltipNode}
      className={`map-tooltip${onOpenFullInfo ? ' is-interactive' : ''}${isTouch ? ' is-touch' : ''}`}
      role={onOpenFullInfo ? 'button' : undefined}
      tabIndex={onOpenFullInfo ? 0 : undefined}
      aria-label={onOpenFullInfo ? '開啟完整資訊' : undefined}
      onPointerDown={onOpenFullInfo ? (event) => event.stopPropagation() : undefined}
      onClick={onOpenFullInfo ? (event) => {
        event.stopPropagation();
        onOpenFullInfo();
      } : undefined}
      onKeyDown={onOpenFullInfo ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenFullInfo();
        }
      } : undefined}
    >
      {/* ExtObject Feature Tooltip */}
      {!hoveredRoad && hoveredExtFeature && (
        <>
          <div className="tooltip-header">
            <span className="tooltip-flag" role="img" aria-label="grid">📍</span>
            <div>
              <div className="tooltip-name" style={{ color: hoveredExtFeature.color }}>
                {hoveredExtFeature.name || hoveredExtFeature.id}
              </div>
              {hoveredExtFeature.label && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {hoveredExtFeature.label}
                </div>
              )}
            </div>
          </div>
          <div className="tooltip-meta" style={{ flexWrap: 'wrap', gap: 4 }}>
            <span className="tooltip-badge" style={{ color: hoveredExtFeature.color, fontFamily: 'monospace', fontWeight: 700 }}>
              {hoveredExtFeature.id}
            </span>
            {hoveredExtFeature.attributes?.examplePoleCode && (
              <span className="tooltip-badge" style={{ color: '#fbbf24', fontFamily: 'monospace', fontWeight: 700 }}>
                電桿範例: {hoveredExtFeature.attributes.examplePoleCode}
              </span>
            )}
            <span className="tooltip-badge">{gridObjectId(hoveredExtFeature.id)}</span>
          </div>
          {hoveredExtFeature.attributes?.subdivisions && (
            <div style={{ marginTop: 4, fontSize: 11, color: '#cbd5e1' }}>
              涵蓋：{hoveredExtFeature.attributes.subdivisions}
            </div>
          )}
          {hoveredExtFeature.attributes?.description && (
            <div style={{ marginTop: 2, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
              {hoveredExtFeature.attributes.description}
            </div>
          )}
          {renderStubsPreview(
            queryInfoStubs({ targetId: hoveredExtFeature.id, taipowerLetter: hoveredExtFeature.id })
          )}
        </>
      )}

      {/* L3 Municipality / Subdivision Tooltip */}
      {!hoveredRoad && hoveredMunicipality && (
        <>
          <div className="tooltip-header">
            <span className="tooltip-flag" role="img" aria-label="muni">
              {hoveredMunicipality.countryFlag || '🏙️'}
            </span>
            <div>
              <div className="tooltip-name">{hoveredMunicipality.city}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {hoveredMunicipality.pref} · {hoveredMunicipality.countryNameZh || '日本'}
              </div>
            </div>
          </div>
          <div className="tooltip-meta">
            <span className="tooltip-badge" style={{ color: '#fbbf24' }}>
              {hoveredMunicipality.typeEn || '市區町村'}
            </span>
            {hoveredMunicipality.code && (
              <span className="tooltip-badge" style={{ color: '#38bdf8' }}>
                #{hoveredMunicipality.code}
              </span>
            )}
            <span className="tooltip-badge" style={{ color: '#34d399' }}>
              點擊展開詳細
            </span>
          </div>
        </>
      )}

      {/* L2 Worldwide Subdivision Tooltip */}
      {!hoveredRoad && hoveredL2Subdivision && (
        <>
          <div className="tooltip-header">
            <span className="tooltip-flag">{hoveredL2Subdivision.countryFlag}</span>
            <div>
              <div className="tooltip-name">
                {hoveredL2Subdivision.nameZh}
                {hoveredL2Subdivision.nameEn && hoveredL2Subdivision.nameEn !== hoveredL2Subdivision.nameZh
                  ? ` (${hoveredL2Subdivision.nameEn})`
                  : ''}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {hoveredL2Subdivision.countryNameZh} ({hoveredL2Subdivision.countryName})
                {hoveredL2Subdivision.typeEn ? ` · ${hoveredL2Subdivision.typeEn}` : ''}
              </div>
            </div>
          </div>
          <div className="tooltip-meta">
            <span className="tooltip-badge" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              L2 · 第一級行政區
            </span>
            {hoveredL2Subdivision.code && (
              <span className="tooltip-badge" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                {hoveredL2Subdivision.code}
              </span>
            )}
            <span className="tooltip-badge">
              {subdivisionObjectId(hoveredL2Subdivision.iso2, hoveredL2Subdivision.code || hoveredL2Subdivision.id)}
            </span>
            {hoveredL2Subdivision.postal && (
              <span className="tooltip-badge" style={{ color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
                郵區: {hoveredL2Subdivision.postal}
              </span>
            )}
          </div>
          {activeRegionalFilters.has('eu-pedestrian-crossing') &&
            (() => {
              const cSign = getCrossingSign(hoveredL2Subdivision.iso2);
              if (!cSign) return null;
              return (
                <div
                  style={{
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <img
                    src={getDataUrl(cSign.imagePath)}
                    alt="crossing"
                    style={{ width: 24, height: 24, objectFit: 'contain' }}
                  />
                  <div style={{ fontSize: 11, color: '#38bdf8', lineHeight: 1.25 }}>
                    <strong>行人告示：</strong>
                    {cSign.descriptionZh}
                  </div>
                </div>
              );
            })()}
          {activeRegionalFilters.has('nationwide-capital') &&
            isCapitalSubdivision(hoveredL2Subdivision.iso2, hoveredL2Subdivision) && (
              <div
                style={{
                  marginTop: 6,
                  paddingTop: 6,
                  borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#f59e0b',
                  fontSize: 11,
                  fontWeight: 600
                }}
              >
                <span>👑 國家首都所在一級行政區</span>
              </div>
            )}
          {(() => {
            const mdStubs = queryInfoStubs({
              countryIso2: hoveredL2Subdivision.iso2,
              subdivisionCode: hoveredL2Subdivision.code,
              subdivisionId: hoveredL2Subdivision.id
            });
            return renderStubsPreview(mdStubs);
          })()}
        </>
      )}

      {/* Road Network Tooltip */}
      {hoveredRoad &&
        (() => {
          const roadCountry = hoveredRoad.iso2 ? findCountry(hoveredRoad.iso2) : undefined;
          const meta = getRoadSystemMeta(hoveredRoad, roadCountry);
          return (
            <>
              <div className="tooltip-header">
                <span className="tooltip-flag">{meta.flag}</span>
                <div>
                  <div className="tooltip-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        background: hoveredRoad.class === 'Interstate' ? '#0284c7' : '#d97706',
                        color: '#ffffff'
                      }}
                    >
                      {hoveredRoad.name}
                    </span>
                    <span>{meta.systemZh}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{meta.systemEn}</div>
                </div>
              </div>
              <div className="tooltip-meta">
                <span
                  className="tooltip-badge"
                  style={{
                    color: meta.classColor,
                    borderColor: `${meta.classColor}4d`
                  }}
                >
                  {meta.classBadge}
                </span>
                <span className="tooltip-badge">
                  {roadObjectId(hoveredRoad.iso2 || '', hoveredRoad.name)}
                </span>
                {meta.corridorClue && <span className="tooltip-badge">{meta.corridorClue}</span>}
                {meta.subClue && (
                  <span className="tooltip-badge" style={{ color: '#94a3b8' }}>
                    {meta.subClue}
                  </span>
                )}
              </div>
            </>
          );
        })()}

      {/* L1 Country Tooltip */}
      {!hoveredRoad && hoveredCountry && !hoveredMunicipality && !hoveredL2Subdivision && (
        <>
          <div className="tooltip-header">
            <span className="tooltip-flag">{hoveredCountry.flag}</span>
            <div>
              <div className="tooltip-name">{hoveredCountry.nameZh}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hoveredCountry.name}</div>
            </div>
            <button
              type="button"
              className="tooltip-mode-switch"
              title={`提示卡模式: ${currentModeMeta.nameZh} (${currentModeMeta.descriptionZh}) - 點擊切換`}
              onClick={cycleInfotipMode}
            >
              {currentModeMeta.icon}
            </button>
          </div>
          <div className="tooltip-meta">
            <span className="tooltip-badge">
              {hoveredCountry.drivingSide === 'left' ? '🚗 靠左行駛' : '🚙 靠右行駛'}
            </span>
            {hoveredCountry.coverage === 'official' ? (
              <span className="tooltip-badge" style={{ color: '#10b981' }}>
                官方街景
              </span>
            ) : (
              <span className="tooltip-badge" style={{ color: '#94a3b8' }}>
                無官方街景
              </span>
            )}
          </div>
          {(() => {
            const mdStubs = queryInfoStubs({ countryIso2: hoveredCountry.iso2 });
            return renderStubsPreview(mdStubs, hoveredCountry.keyHints);
          })()}
          {activeRegionalFilters.has('eu-pedestrian-crossing') &&
            (() => {
              const cSign = getCrossingSign(hoveredCountry.iso2);
              if (!cSign) return null;
              return (
                <div
                  style={{
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <img
                    src={getDataUrl(cSign.imagePath)}
                    alt="crossing"
                    style={{ width: 24, height: 24, objectFit: 'contain' }}
                  />
                  <div style={{ fontSize: 11, color: '#38bdf8', lineHeight: 1.25 }}>
                    <strong>行人告示：</strong>
                    {cSign.descriptionZh}
                  </div>
                </div>
              );
            })()}
        </>
      )}
      {onOpenFullInfo && <span className="mobile-tooltip-open-hint">點擊開啟完整資訊</span>}
    </div>
  );
};

export const MapTooltip = React.memo(MapTooltipComponent);
