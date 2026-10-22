import React from 'react';
import { findCountry } from '../data/countries';
import { getRoadSystemMeta, type RoadPathData } from '../data/roadsMeta';
import { getCrossingSign } from '../data/pedestrianCrossing';
import { isCapitalSubdivision } from '../data/capitalSubdivisions';
import { queryLore } from '../lore/loreRegistry';
import type { TaipowerZoneDef } from '../data/taiwanPowerPoles';
import type { CountryData } from '../types/geo';
import type { L2SubdivisionDetail, MunicipalityDetail } from '../types/lod';

export interface MapTooltipProps {
  setTooltipNode: (node: HTMLDivElement | null) => void;
  hoveredRoad: RoadPathData | null;
  hoveredCountry: CountryData | null;
  hoveredMunicipality: MunicipalityDetail | null;
  hoveredL2Subdivision: L2SubdivisionDetail | null;
  hoveredTaipowerZone: TaipowerZoneDef | null;
  activeRegionalFilters: Set<string>;
}

const MapTooltipComponent: React.FC<MapTooltipProps> = ({
  setTooltipNode,
  hoveredRoad,
  hoveredCountry,
  hoveredMunicipality,
  hoveredL2Subdivision,
  hoveredTaipowerZone,
  activeRegionalFilters
}) => {
  if (!hoveredRoad && !hoveredCountry && !hoveredMunicipality && !hoveredL2Subdivision && !hoveredTaipowerZone) {
    return null;
  }

  return (
    <div ref={setTooltipNode} className="map-tooltip">
      {/* Taiwan Taipower Pole Grid Tooltip */}
      {!hoveredRoad && hoveredTaipowerZone && (
        <>
          <div className="tooltip-header">
            <span className="tooltip-flag" role="img" aria-label="grid">⚡</span>
            <div>
              <div className="tooltip-name" style={{ color: hoveredTaipowerZone.color }}>
                台電電力座標 · {hoveredTaipowerZone.letter} 區
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {hoveredTaipowerZone.nameZh}
              </div>
            </div>
          </div>
          <div className="tooltip-meta" style={{ flexWrap: 'wrap', gap: 4 }}>
            <span className="tooltip-badge" style={{ color: '#fbbf24', fontFamily: 'monospace', fontWeight: 700 }}>
              電桿範例: {hoveredTaipowerZone.examplePoleCode}
            </span>
            <span className="tooltip-badge" style={{ color: '#38bdf8' }}>
              80km × 50km 大分區
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              paddingTop: 6,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              fontSize: 11,
              color: '#94a3b8',
              lineHeight: 1.5
            }}
          >
            <div style={{ color: '#38bdf8', fontWeight: 600, marginBottom: 2 }}>【百分比座標解讀】</div>
            <div>
              • 首字「<strong style={{ color: hoveredTaipowerZone.color }}>{hoveredTaipowerZone.letter}</strong>」：代表本
              80km × 50km 大分區
            </div>
            <div>• 前兩碼數字：由西向東橫向百分比（X% · 00~99）</div>
            <div>• 後兩碼數字：由南向北縱向百分比（Y% · 00~99）</div>
            <div style={{ marginTop: 4, color: '#cbd5e1' }}>
              涵蓋：{hoveredTaipowerZone.subdivisionsZh.join('、')}
            </div>
          </div>
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
                    src={cSign.imagePath}
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
            const mdCards = queryLore({ countryIso2: hoveredCountry.iso2 });
            if (mdCards && mdCards.length > 0) {
              const card = mdCards[0];
              const firstItem = card.items[0];
              return (
                <div
                  style={{
                    fontSize: 11,
                    color: card.accentColor || '#fbbf24',
                    marginTop: 4,
                    lineHeight: 1.3,
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: 4
                  }}
                >
                  {card.icon || '💡'} <strong>{card.title}</strong>
                  {firstItem && (
                    <div style={{ color: '#cbd5e1', marginTop: 2, fontSize: 10.5 }}>
                      {firstItem.label ? `${firstItem.label} ` : ''}
                      {firstItem.content.length > 75 ? `${firstItem.content.slice(0, 75)}...` : firstItem.content}
                    </div>
                  )}
                </div>
              );
            }
            if (hoveredCountry.keyHints && hoveredCountry.keyHints.length > 0) {
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
                  💡 {hoveredCountry.keyHints[0]}
                </div>
              );
            }
            return null;
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
                    src={cSign.imagePath}
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
    </div>
  );
};

export const MapTooltip = React.memo(MapTooltipComponent);
