import React, { useMemo, useState, useEffect } from 'react';
import {
  ExternalLink,
  Compass,
  MapPin,
  AlertCircle,
  Lock,
  Unlock,
  Search,
  Route,
  Sliders,
  Copy,
  Check
} from 'lucide-react';
import {
  parseGoogleMapsEmbedConfig,
  buildEmbedUrl,
  getGoogleMapsApiKey,
  DEFAULT_CROP,
  type ParsedEmbedConfig
} from '../utils/googleMapsEmbed';

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

  // Real-time tuning state
  const initialHeading = config.params.heading ? parseFloat(config.params.heading) : 0;
  const initialPitch = config.params.pitch ? parseFloat(config.params.pitch) : 0;
  const initialFov = config.params.fov ? parseFloat(config.params.fov) : 90;
  const initialZoom = config.params.zoom ? parseFloat(config.params.zoom) : 13;

  const [liveHeading, setLiveHeading] = useState<number>(initialHeading);
  const [livePitch, setLivePitch] = useState<number>(initialPitch);
  const [liveFov, setLiveFov] = useState<number>(initialFov);
  const [liveZoom, setLiveZoom] = useState<number>(initialZoom);
  const [showTuning, setShowTuning] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync if config prop changes during render
  const [prevConfig, setPrevConfig] = useState(config);
  if (config !== prevConfig) {
    setPrevConfig(config);
    setLiveHeading(config.params.heading ? parseFloat(config.params.heading) : 0);
    setLivePitch(config.params.pitch ? parseFloat(config.params.pitch) : 0);
    setLiveFov(config.params.fov ? parseFloat(config.params.fov) : 90);
    setLiveZoom(config.params.zoom ? parseFloat(config.params.zoom) : 13);
  }

  // Debounced params for the iframe to avoid rapid reloads during slider drag
  const [debouncedParams, setDebouncedParams] = useState({
    heading: initialHeading,
    pitch: initialPitch,
    fov: initialFov,
    zoom: initialZoom
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedParams({
        heading: liveHeading,
        pitch: livePitch,
        fov: liveFov,
        zoom: liveZoom
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [liveHeading, livePitch, liveFov, liveZoom]);

  const activeConfig = useMemo<ParsedEmbedConfig>(() => {
    if (!showTuning) return config;
    const nextParams = { ...config.params };
    if (config.mode === 'streetview') {
      nextParams.heading = String(Math.round(debouncedParams.heading * 10) / 10);
      nextParams.pitch = String(Math.round(debouncedParams.pitch * 10) / 10);
      nextParams.fov = String(Math.round(debouncedParams.fov * 10) / 10);
    } else if (config.mode === 'view') {
      nextParams.zoom = String(Math.round(debouncedParams.zoom));
    }
    return {
      ...config,
      params: nextParams
    };
  }, [config, showTuning, debouncedParams]);

  const embedUrl = useMemo(() => {
    return buildEmbedUrl(activeConfig, apiKey);
  }, [activeConfig, apiKey]);

  const badgeInfo = useMemo(() => {
    switch (config.mode) {
      case 'streetview':
        return {
          label: 'Google 街景',
          color: '#38bdf8',
          bg: 'rgba(56, 189, 248, 0.2)',
          border: 'rgba(56, 189, 248, 0.35)',
          icon: <Compass size={12} />
        };
      case 'view':
        return {
          label: 'Google 俯視圖',
          color: '#34d399',
          bg: 'rgba(52, 211, 153, 0.2)',
          border: 'rgba(52, 211, 153, 0.35)',
          icon: <MapPin size={12} />
        };
      case 'search':
        return {
          label: 'Google 搜尋',
          color: '#a78bfa',
          bg: 'rgba(167, 139, 250, 0.2)',
          border: 'rgba(167, 139, 250, 0.35)',
          icon: <Search size={12} />
        };
      case 'directions':
        return {
          label: 'Google 導航路線',
          color: '#f43f5e',
          bg: 'rgba(244, 63, 94, 0.2)',
          border: 'rgba(244, 63, 94, 0.35)',
          icon: <Route size={12} />
        };
      case 'place':
      default:
        return {
          label: 'Google 地標',
          color: '#fbbf24',
          bg: 'rgba(251, 191, 36, 0.2)',
          border: 'rgba(251, 191, 36, 0.35)',
          icon: <MapPin size={12} />
        };
    }
  }, [config.mode]);

  const displayTitle =
    config.title ||
    (config.mode === 'directions' && config.params.origin && config.params.destination
      ? `${config.params.origin} → ${config.params.destination}`
      : config.params.location || config.params.q || config.params.center || badgeInfo.label);

  const buildCurrentSnippet = (isCurrentlyLocked: boolean) => {
    const parts: string[] = [config.mode];
    if (config.showHeader) parts.push('header');
    if (isCurrentlyLocked) parts.push('lock');

    if (config.isVertical) {
      if (config.aspectRatio === '4 / 5') {
        parts.push('vertical');
      } else if (config.aspectRatio === '9 / 16') {
        parts.push('9:16');
      } else if (config.aspectRatio === '3 / 4') {
        parts.push('3:4');
      } else if (config.aspectRatio === '2 / 3') {
        parts.push('2:3');
      } else {
        parts.push(`ratio=${config.aspectRatio.replace(/\s+/g, '')}`);
      }
    } else if (config.aspectRatio && config.aspectRatio !== '16 / 9') {
      parts.push(`ratio=${config.aspectRatio.replace(/\s+/g, '')}`);
    }
    if (config.width) {
      parts.push(`w=${config.width}`);
    }
    if (config.height) {
      parts.push(`h=${config.height}`);
    }
    const { top, right, bottom, left } = config.crop;
    const isDefaultCrop =
      top === DEFAULT_CROP.top &&
      right === DEFAULT_CROP.right &&
      bottom === DEFAULT_CROP.bottom &&
      left === DEFAULT_CROP.left;

    if (!isDefaultCrop) {
      if (top === 0 && right === 0 && bottom === 0 && left === 0) {
        parts.push('no-crop');
      } else {
        parts.push(`crop=${top},${right},${bottom},${left}`);
      }
    }

    if (config.mode === 'streetview') {
      const curHeading = showTuning ? liveHeading : (config.params.heading ? parseFloat(config.params.heading) : undefined);
      const curPitch = showTuning ? livePitch : (config.params.pitch ? parseFloat(config.params.pitch) : undefined);
      const curFov = showTuning ? liveFov : (config.params.fov ? parseFloat(config.params.fov) : undefined);

      if (curHeading !== undefined) parts.push(`heading=${Math.round(curHeading * 10) / 10}`);
      if (curPitch !== undefined && curPitch !== 0) parts.push(`pitch=${Math.round(curPitch * 10) / 10}`);
      if (curFov !== undefined && curFov !== 90) parts.push(`fov=${Math.round(curFov * 10) / 10}`);
    } else if (config.mode === 'view') {
      const curZoom = showTuning ? liveZoom : (config.params.zoom ? parseFloat(config.params.zoom) : undefined);
      if (curZoom !== undefined) parts.push(`zoom=${Math.round(curZoom)}`);
    }

    if (config.params.mode && config.mode === 'directions') parts.push(`mode=${config.params.mode}`);
    if (config.title) parts.push(config.title);

    const targetSrc =
      config.mode === 'directions' && config.params.origin && config.params.destination
        ? `${config.params.origin} -> ${config.params.destination}`
        : config.params.location || config.params.center || config.params.q || src;

    return `![${parts.join('|')}](${targetSrc})`;
  };

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLocked = !isLocked;
    setUserLocked(nextLocked);

    if (nextLocked) {
      const snippet = buildCurrentSnippet(true);
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
        heading: showTuning ? liveHeading : config.params.heading,
        pitch: showTuning ? livePitch : config.params.pitch,
        fov: showTuning ? liveFov : config.params.fov,
        zoom: showTuning ? liveZoom : config.params.zoom,
        rawAlt: alt,
        rawSrc: src,
        externalUrl: config.externalUrl
      });
      console.groupEnd();
    }
  };

  const handleCopySnippet = (e: React.MouseEvent) => {
    e.stopPropagation();
    const snippet = buildCurrentSnippet(isLocked);
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    console.group(
      `%c📋 [GoogleMapsEmbed Snippet Copied] ${displayTitle}`,
      'color: #38bdf8; font-weight: bold; font-size: 12px;'
    );
    console.log('%c📋 Markdown Snippet (直接複製貼上):', 'color: #a5f3fc; font-weight: bold;');
    console.log(snippet);
    console.log('%c📐 即時參數 (Live Parameters):', 'color: #94a3b8; font-weight: bold;', {
      heading: liveHeading,
      pitch: livePitch,
      fov: liveFov,
      zoom: liveZoom
    });
    console.groupEnd();
  };

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
        maxWidth: config.isVertical ? (config.width ? `${config.width}px` : '340px') : undefined,
        margin: config.isVertical ? '8px auto' : '8px 0',
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
                backgroundColor: badgeInfo.bg,
                color: badgeInfo.color,
                border: `1px solid ${badgeInfo.border}`
              }}
            >
              {badgeInfo.icon}
              {badgeInfo.label}
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
            {(config.mode === 'streetview' || config.mode === 'view') && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTuning(!showTuning);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: showTuning ? 'rgba(56, 189, 248, 0.25)' : 'rgba(148, 163, 184, 0.15)',
                  color: showTuning ? '#38bdf8' : '#94a3b8',
                  border: `1px solid ${showTuning ? 'rgba(56, 189, 248, 0.45)' : 'rgba(148, 163, 184, 0.25)'}`,
                  transition: 'all 0.15s ease'
                }}
                title="開啟微調面板，可看著畫面滑動調整方位 (Heading)、仰角 (Pitch) 與視野 (FOV)"
              >
                <Sliders size={10} />
                <span>{showTuning ? '收起微調' : '微調'}</span>
              </button>
            )}
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
            maxHeight: config.height
              ? undefined
              : config.isVertical
              ? 'min(75vh, 520px)'
              : 'min(75vh, 600px)',
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
            allow="accelerometer; gyroscope"
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
              {(config.mode === 'streetview' || config.mode === 'view') && (
                <button
                  type="button"
                  className={`google-maps-tune-btn ${showTuning ? 'is-active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTuning(!showTuning);
                  }}
                  title="開啟微調面板，即時滑動調整方位 (Heading)、仰角 (Pitch) 與視野 (FOV)"
                >
                  <Sliders size={11} />
                  <span>{showTuning ? '收起微調' : '微調'}</span>
                </button>
              )}
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

      {/* Interactive Tuning Panel */}
      {showTuning && (config.mode === 'streetview' || config.mode === 'view') && (
        <div
          className="google-maps-tuning-panel"
          onClick={(e) => e.stopPropagation()}
        >
          {config.mode === 'streetview' && (
            <>
              {/* Heading Slider with -1° and +1° at the two ends */}
              <div className="google-maps-tuning-row">
                <div className="google-maps-tuning-label">
                  <span>方位旋轉 (Heading)</span>
                  <b>{Math.round(liveHeading * 10) / 10}°</b>
                </div>
                <div className="google-maps-tuning-control">
                  <button
                    type="button"
                    className="google-maps-step-btn"
                    onClick={() => setLiveHeading(h => Math.round(((h - 0.5 + 360) % 360) * 10) / 10)}
                    title="方位 -0.5°"
                  >
                    -0.5°
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={0.5}
                    value={liveHeading}
                    onChange={(e) => setLiveHeading(parseFloat(e.target.value))}
                    className="google-maps-tuning-slider"
                  />
                  <button
                    type="button"
                    className="google-maps-step-btn"
                    onClick={() => setLiveHeading(h => Math.round(((h + 0.5) % 360) * 10) / 10)}
                    title="方位 +0.5°"
                  >
                    +0.5°
                  </button>
                </div>
              </div>

              {/* Pitch Slider with -0.5° and +0.5° at the two ends */}
              <div className="google-maps-tuning-row">
                <div className="google-maps-tuning-label">
                  <span>仰角俯視 (Pitch)</span>
                  <b>{livePitch > 0 ? '+' : ''}{Math.round(livePitch * 10) / 10}°</b>
                </div>
                <div className="google-maps-tuning-control">
                  <button
                    type="button"
                    className="google-maps-step-btn"
                    onClick={() => setLivePitch(p => Math.max(-90, Math.round((p - 0.5) * 10) / 10))}
                    title="仰角 -0.5°"
                  >
                    -0.5°
                  </button>
                  <input
                    type="range"
                    min={-90}
                    max={90}
                    step={0.5}
                    value={livePitch}
                    onChange={(e) => setLivePitch(parseFloat(e.target.value))}
                    className="google-maps-tuning-slider"
                  />
                  <button
                    type="button"
                    className="google-maps-step-btn"
                    onClick={() => setLivePitch(p => Math.min(90, Math.round((p + 0.5) * 10) / 10))}
                    title="仰角 +0.5°"
                  >
                    +0.5°
                  </button>
                </div>
              </div>

              {/* FOV Slider with -0.5° and +0.5° at the two ends */}
              <div className="google-maps-tuning-row">
                <div className="google-maps-tuning-label">
                  <span>視野縮放 (FOV 焦距)</span>
                  <b>{Math.round(liveFov * 10) / 10}°</b>
                </div>
                <div className="google-maps-tuning-control">
                  <button
                    type="button"
                    className="google-maps-step-btn"
                    onClick={() => setLiveFov(f => Math.max(15, Math.round((f - 0.5) * 10) / 10))}
                    title="視野 -0.5° (放大特寫)"
                  >
                    -0.5°
                  </button>
                  <input
                    type="range"
                    min={15}
                    max={120}
                    step={0.5}
                    value={liveFov}
                    onChange={(e) => setLiveFov(parseFloat(e.target.value))}
                    className="google-maps-tuning-slider"
                  />
                  <button
                    type="button"
                    className="google-maps-step-btn"
                    onClick={() => setLiveFov(f => Math.min(120, Math.round((f + 0.5) * 10) / 10))}
                    title="視野 +0.5° (廣角縮小)"
                  >
                    +0.5°
                  </button>
                </div>
              </div>
            </>
          )}

          {config.mode === 'view' && (
            <div className="google-maps-tuning-row">
              <div className="google-maps-tuning-label">
                <span>縮放層級 (Zoom Level)</span>
                <b>{Math.round(liveZoom)}</b>
              </div>
              <div className="google-maps-tuning-control">
                <button
                  type="button"
                  className="google-maps-step-btn"
                  onClick={() => setLiveZoom(z => Math.max(1, z - 1))}
                  title="縮放 -1"
                >
                  -1
                </button>
                <input
                  type="range"
                  min={1}
                  max={21}
                  step={1}
                  value={liveZoom}
                  onChange={(e) => setLiveZoom(parseInt(e.target.value, 10))}
                  className="google-maps-tuning-slider"
                />
                <button
                  type="button"
                  className="google-maps-step-btn"
                  onClick={() => setLiveZoom(z => Math.min(21, z + 1))}
                  title="縮放 +1"
                >
                  +1
                </button>
              </div>
            </div>
          )}

          {/* Live Markdown Snippet Box */}
          <div className="google-maps-snippet-box">
            <span className="google-maps-snippet-code" title={buildCurrentSnippet(isLocked)}>
              {buildCurrentSnippet(isLocked)}
            </span>
            <button
              type="button"
              className="google-maps-copy-btn"
              onClick={handleCopySnippet}
              title="複製此 Markdown 語法"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              <span>{copied ? '已複製!' : '複製語法'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
