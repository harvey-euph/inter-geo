import React, { useMemo, useState } from 'react';
import { ExternalLink, Compass, MapPin, AlertCircle, Lock, Unlock } from 'lucide-react';
import { parseGoogleMapsEmbedConfig, buildEmbedUrl, getGoogleMapsApiKey } from '../utils/googleMapsEmbed';

export interface GoogleMapsEmbedProps {
  alt?: string;
  src: string;
  style?: React.CSSProperties;
  className?: string;
}

export const GoogleMapsEmbed: React.FC<GoogleMapsEmbedProps> = ({
  alt,
  src,
  style,
  className
}) => {
  const apiKey = getGoogleMapsApiKey();

  const config = useMemo(() => {
    return parseGoogleMapsEmbedConfig(alt, src);
  }, [alt, src]);

  // User-toggleable lock state with config.locked as initial default
  const [userLocked, setUserLocked] = useState<boolean | null>(null);
  const [prevDefaultLocked, setPrevDefaultLocked] = useState(config.locked);

  if (config.locked !== prevDefaultLocked) {
    setPrevDefaultLocked(config.locked);
    setUserLocked(null);
  }

  const isLocked = userLocked ?? config.locked;

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLocked = !isLocked;
    setUserLocked(nextLocked);

    if (nextLocked) {
      // Build markdown snippet for easy copying and tuning
      const parts: string[] = [config.mode];
      if (config.showHeader) parts.push('header');
      parts.push('lock');
      if (config.aspectRatio && config.aspectRatio !== '16 / 9') {
        parts.push(`ratio=${config.aspectRatio.replace(/\s+/g, '')}`);
      }
      if (config.height) {
        parts.push(`h=${config.height}`);
      }
      const { top, right, bottom, left } = config.crop;
      if (top || right || bottom || left) {
        parts.push(`crop=${top},${right},${bottom},${left}`);
      }
      if (config.params.heading) parts.push(`heading=${config.params.heading}`);
      if (config.params.pitch) parts.push(`pitch=${config.params.pitch}`);
      if (config.params.fov) parts.push(`fov=${config.params.fov}`);
      if (config.params.zoom) parts.push(`zoom=${config.params.zoom}`);
      if (config.title) parts.push(config.title);

      const targetSrc = config.params.location || config.params.center || config.params.q || src;
      const snippet = `![${parts.join('|')}](${targetSrc})`;

      // Print structured parameters and copy-ready snippet to developer console
      console.group(
        `%c🔒 [GoogleMapsEmbed Locked] ${displayTitle}`,
        'color: #38bdf8; font-weight: bold; font-size: 12px;'
      );
      console.log('%c📋 Markdown Snippet (直接複製寫入 Markdown):', 'color: #a5f3fc; font-weight: bold;');
      console.log(snippet);
      console.log('%c📐 目前配置參數 (Parameters):', 'color: #94a3b8; font-weight: bold;', {
        mode: config.mode,
        title: config.title,
        locked: true,
        crop: config.crop,
        aspectRatio: config.aspectRatio,
        height: config.height,
        ...config.params,
        rawAlt: alt,
        rawSrc: src,
        externalUrl: config.externalUrl
      });
      console.groupEnd();
    }
  };

  const embedUrl = useMemo(() => {
    return buildEmbedUrl(config, apiKey);
  }, [config, apiKey]);

  const isStreetView = config.mode === 'streetview';
  const badgeLabel = isStreetView ? 'Google 街景' : 'Google 地圖';
  const displayTitle = config.title || config.params.location || config.params.q || config.params.center || badgeLabel;

  return (
    <div
      className={`google-maps-embed-container ${className || ''}`}
      onClick={(e) => {
        // Prevent clicking inside map container from toggling parent info card collapse
        e.stopPropagation();
      }}
      style={{
        display: 'block',
        width: '100%',
        margin: '8px 0',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: 'rgba(2, 6, 23, 0.92)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
        ...style
      }}
    >
      {/* Optional Top Header Bar (enabled via `header` or `bar` in markdown) */}
      {config.showHeader && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: 12,
            color: '#cbd5e1'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: isStreetView ? 'rgba(56, 189, 248, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                color: isStreetView ? '#38bdf8' : '#fbbf24',
                border: `1px solid ${isStreetView ? 'rgba(56, 189, 248, 0.35)' : 'rgba(251, 191, 36, 0.35)'}`
              }}
            >
              {isStreetView ? <Compass size={12} /> : <MapPin size={12} />}
              {badgeLabel}
            </span>
            <button
              type="button"
              onClick={toggleLock}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: isLocked ? 'rgba(148, 163, 184, 0.15)' : 'rgba(56, 189, 248, 0.2)',
                color: isLocked ? '#94a3b8' : '#38bdf8',
                border: `1px solid ${isLocked ? 'rgba(148, 163, 184, 0.25)' : 'rgba(56, 189, 248, 0.35)'}`,
                transition: 'all 0.15s ease'
              }}
              title={isLocked ? '目前已鎖定（點擊解鎖開始互動探索）' : '目前已解鎖（點擊鎖定避免滑動干擾）'}
            >
              {isLocked ? <Lock size={10} /> : <Unlock size={10} />}
              <span>{isLocked ? '已鎖定' : '已解鎖'}</span>
            </button>
            <span
              style={{
                fontWeight: 500,
                color: '#f1f5f9',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 220
              }}
              title={displayTitle}
            >
              {displayTitle}
            </span>
          </div>

          {config.externalUrl && (
            <a
              href={config.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="在 Google 地圖開啟完整頁面"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 11,
                color: '#94a3b8',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#38bdf8';
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              }}
            >
              <span>在 Google 地圖開啟</span>
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}

      {/* Embed Iframe or Missing Key Banner */}
      {apiKey && embedUrl ? (
        <div
          className="google-maps-viewport"
          style={{
            position: 'relative',
            width: '100%',
            height: config.height ? `${config.height}px` : 'auto',
            aspectRatio: config.height ? undefined : config.aspectRatio,
            minHeight: config.height ? undefined : 160,
            maxHeight: config.height ? undefined : 'min(75vh, 600px)',
            overflow: 'hidden',
            backgroundColor: '#020617',
            cursor: isLocked ? 'default' : undefined,
            userSelect: isLocked ? 'none' : undefined
          }}
        >
          <iframe
            src={embedUrl}
            width="100%"
            height={config.height ? config.height : undefined}
            style={{
              position: 'absolute',
              top: -config.crop.top,
              left: -config.crop.left,
              width: `calc(100% + ${config.crop.left + config.crop.right}px)`,
              height: `calc(100% + ${config.crop.top + config.crop.bottom}px)`,
              border: 0,
              display: 'block',
              backgroundColor: '#020617',
              pointerEvents: isLocked ? 'none' : 'auto'
            }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            title={displayTitle}
          />

          {/* Floating overlays when top bar is hidden: 0px layout impact, hover-triggered toggle */}
          {!config.showHeader && (
            <>
              <button
                type="button"
                className={`google-maps-lock-btn ${isLocked ? 'is-locked' : 'is-unlocked'}`}
                onClick={toggleLock}
                title={isLocked ? '目前已鎖定（點擊解鎖開始互動探索）' : '目前可互動（點擊鎖定避免滑動干擾）'}
              >
                {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
                <span>{isLocked ? '已鎖定' : '已解鎖'}</span>
              </button>
              {config.externalUrl && (
                <a
                  className="google-maps-float-link"
                  href={config.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="在 Google 地圖開啟完整頁面"
                >
                  <span>Google 地圖</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </>
          )}
        </div>
      ) : (
        <div
          style={{
            padding: '20px 16px',
            textAlign: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b', fontSize: 13 }}>
            <AlertCircle size={16} />
            <span>尚未配置 Google Maps API 金鑰 (VITE_GOOGLE_MAPS_API_KEY)</span>
          </div>
          {config.externalUrl && (
            <a
              href={config.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                backgroundColor: '#0284c7',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 500
              }}
            >
              <span>直接在 Google 地圖檢視</span>
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      )}
    </div>
  );
};
