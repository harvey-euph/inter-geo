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
import { useDevMode } from '../utils/devMode';

export interface GoogleMapsEmbedProps {
  alt?: string;
  src: string;
  style?: React.CSSProperties;
  className?: string;
}

const clampFov = (v: number) => Math.min(100, Math.max(10, v));
const parseFov = (v?: string | number) => {
  if (v === undefined || v === null || v === '') return 90;
  const num = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(num) ? 90 : clampFov(num);
};

const parseSnippetInput = (
  input: string,
  fallbackSrc: string,
  fallbackAlt = ''
): ParsedEmbedConfig | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Case 1: Standard markdown ![alt](src) or [alt](src)
  const mdMatch = trimmed.match(/^!?\[(.*?)\]\((.*)\)$/s);
  if (mdMatch) {
    return parseGoogleMapsEmbedConfig(mdMatch[1], mdMatch[2]);
  }

  // Case 2: Just a URL or coordinates: "https://..." or "25.0338, 121.5645"
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(trimmed)
  ) {
    return parseGoogleMapsEmbedConfig(fallbackAlt, trimmed);
  }

  // Case 3: Just the alt pipe string: "streetview|vertical|heading=180|pitch=5|fov=30"
  if (
    trimmed.includes('|') ||
    trimmed.startsWith('streetview') ||
    trimmed.startsWith('view') ||
    trimmed.startsWith('place') ||
    trimmed.startsWith('directions') ||
    trimmed.startsWith('search')
  ) {
    return parseGoogleMapsEmbedConfig(trimmed, fallbackSrc);
  }

  // Case 4: Default fallback: treat as new location / query string
  return parseGoogleMapsEmbedConfig(fallbackAlt, trimmed);
};

export const GoogleMapsEmbed: React.FC<GoogleMapsEmbedProps> = ({
  alt,
  src,
  style,
  className
}) => {
  const apiKey = getGoogleMapsApiKey();
  const isDev = useDevMode();

  const config = useMemo(() => {
    return parseGoogleMapsEmbedConfig(alt, src);
  }, [alt, src]);

  // Dev-mode override when snippet input is edited and applied via Enter
  const [userConfigOverride, setUserConfigOverride] = useState<ParsedEmbedConfig | null>(null);
  const baseConfig = userConfigOverride ?? config;

  // User-toggleable lock state with baseConfig.locked as initial default
  const [userLocked, setUserLocked] = useState<boolean | null>(null);
  const [prevDefaultLocked, setPrevDefaultLocked] = useState(config.locked);

  if (config.locked !== prevDefaultLocked) {
    setPrevDefaultLocked(config.locked);
    setUserLocked(null);
  }

  const isLocked = userLocked ?? baseConfig.locked;

  // Real-time tuning state
  const initialHeading = config.params.heading ? parseFloat(config.params.heading) : 0;
  const initialPitch = config.params.pitch ? parseFloat(config.params.pitch) : 0;
  const initialFov = parseFov(config.params.fov);
  const initialZoom = config.params.zoom ? parseFloat(config.params.zoom) : 13;

  const [liveHeading, setLiveHeading] = useState<number>(initialHeading);
  const [livePitch, setLivePitch] = useState<number>(initialPitch);
  const [liveFov, setLiveFov] = useState<number>(initialFov);
  const [liveZoom, setLiveZoom] = useState<number>(initialZoom);
  const [showTuning, setShowTuning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [appliedFlash, setAppliedFlash] = useState(false);
  const [customSnippet, setCustomSnippet] = useState<string | null>(null);

  // Sync if config prop changes during render
  const [prevConfig, setPrevConfig] = useState(config);
  if (config !== prevConfig) {
    setPrevConfig(config);
    setUserConfigOverride(null);
    setCustomSnippet(null);
    setLiveHeading(config.params.heading ? parseFloat(config.params.heading) : 0);
    setLivePitch(config.params.pitch ? parseFloat(config.params.pitch) : 0);
    setLiveFov(parseFov(config.params.fov));
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
    if (!showTuning || !isDev) return baseConfig;
    const nextParams = { ...baseConfig.params };
    if (baseConfig.mode === 'streetview') {
      nextParams.heading = String(Math.round(debouncedParams.heading * 10) / 10);
      nextParams.pitch = String(Math.round(debouncedParams.pitch * 10) / 10);
      nextParams.fov = String(Math.round(debouncedParams.fov * 10) / 10);
    } else if (baseConfig.mode === 'view') {
      nextParams.zoom = String(Math.round(debouncedParams.zoom));
    }
    return {
      ...baseConfig,
      params: nextParams
    };
  }, [baseConfig, showTuning, isDev, debouncedParams]);

  const embedUrl = useMemo(() => {
    return buildEmbedUrl(activeConfig, apiKey);
  }, [activeConfig, apiKey]);

  const badgeInfo = useMemo(() => {
    switch (baseConfig.mode) {
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
  }, [baseConfig.mode]);

  const displayTitle =
    baseConfig.title ||
    (baseConfig.mode === 'directions' && baseConfig.params.origin && baseConfig.params.destination
      ? `${baseConfig.params.origin} → ${baseConfig.params.destination}`
      : baseConfig.params.location || baseConfig.params.q || baseConfig.params.center || badgeInfo.label);

  const buildCurrentSnippet = (isCurrentlyLocked: boolean) => {
    const curConfig = baseConfig;
    const parts: string[] = [curConfig.mode];
    if (curConfig.showHeader) parts.push('header');
    if (isCurrentlyLocked) parts.push('lock');

    if (curConfig.isVertical) {
      if (curConfig.aspectRatio === '4 / 5') {
        parts.push('vertical');
      } else if (curConfig.aspectRatio === '9 / 16') {
        parts.push('9:16');
      } else if (curConfig.aspectRatio === '3 / 4') {
        parts.push('3:4');
      } else if (curConfig.aspectRatio === '2 / 3') {
        parts.push('2:3');
      } else {
        parts.push(`ratio=${curConfig.aspectRatio.replace(/\s+/g, '')}`);
      }
    } else if (curConfig.aspectRatio && curConfig.aspectRatio !== '16 / 9') {
      parts.push(`ratio=${curConfig.aspectRatio.replace(/\s+/g, '')}`);
    }
    if (curConfig.width) {
      parts.push(`w=${curConfig.width}`);
    }
    if (curConfig.height) {
      parts.push(`h=${curConfig.height}`);
    }
    const { top, right, bottom, left } = curConfig.crop;
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

    if (curConfig.mode === 'streetview') {
      const curHeading = showTuning ? liveHeading : (curConfig.params.heading ? parseFloat(curConfig.params.heading) : undefined);
      const curPitch = showTuning ? livePitch : (curConfig.params.pitch ? parseFloat(curConfig.params.pitch) : undefined);
      const curFov = showTuning ? liveFov : (curConfig.params.fov ? parseFloat(curConfig.params.fov) : undefined);

      if (curHeading !== undefined) parts.push(`heading=${Math.round(curHeading * 10) / 10}`);
      if (curPitch !== undefined && curPitch !== 0) parts.push(`pitch=${Math.round(curPitch * 10) / 10}`);
      if (curFov !== undefined && curFov !== 90) parts.push(`fov=${Math.round(curFov * 10) / 10}`);
    } else if (curConfig.mode === 'view') {
      const curZoom = showTuning ? liveZoom : (curConfig.params.zoom ? parseFloat(curConfig.params.zoom) : undefined);
      if (curZoom !== undefined) parts.push(`zoom=${Math.round(curZoom)}`);
    }

    if (curConfig.params.mode && curConfig.mode === 'directions') parts.push(`mode=${curConfig.params.mode}`);
    if (curConfig.title) parts.push(curConfig.title);

    const targetSrc =
      curConfig.mode === 'directions' && curConfig.params.origin && curConfig.params.destination
        ? `${curConfig.params.origin} -> ${curConfig.params.destination}`
        : curConfig.params.location || curConfig.params.center || curConfig.params.q || src;

    return `![${parts.join('|')}](${targetSrc})`;
  };

  const autoSnippet = buildCurrentSnippet(isLocked);
  const displayedSnippet = customSnippet ?? autoSnippet;

  const handleApplySnippet = () => {
    const textToApply = customSnippet ?? autoSnippet;
    if (!textToApply) return;
    const currentSrc =
      baseConfig.params.location ||
      baseConfig.params.center ||
      baseConfig.params.q ||
      src;
    const parsed = parseSnippetInput(textToApply, currentSrc, alt);
    if (!parsed) return;

    setUserConfigOverride(parsed);
    setCustomSnippet(null);
    setAppliedFlash(true);
    setTimeout(() => setAppliedFlash(false), 800);

    const newHeading = parsed.params.heading ? parseFloat(parsed.params.heading) : 0;
    const newPitch = parsed.params.pitch ? parseFloat(parsed.params.pitch) : 0;
    const newFov = parseFov(parsed.params.fov);
    const newZoom = parsed.params.zoom ? parseFloat(parsed.params.zoom) : 13;

    setLiveHeading(newHeading);
    setLivePitch(newPitch);
    setLiveFov(newFov);
    setLiveZoom(newZoom);

    setDebouncedParams({
      heading: newHeading,
      pitch: newPitch,
      fov: newFov,
      zoom: newZoom
    });

    if (parsed.locked !== undefined) {
      setUserLocked(parsed.locked);
    }

    if (isDev) {
      console.log('%c⚡ [GoogleMapsEmbed Snippet Applied via Enter]', 'color: #34d399; font-weight: bold;', {
        snippet: textToApply,
        parsed
      });
    }
  };

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLocked = !isLocked;
    setUserLocked(nextLocked);

    if (nextLocked) {
      const snippet = buildCurrentSnippet(true);
      if (isDev) {
        console.group(
          `%c🔒 [GoogleMapsEmbed Locked] ${displayTitle}`,
          'color: #38bdf8; font-weight: bold; font-size: 12px;'
        );
        console.log('%c📋 Markdown Snippet (直接複製寫入 Markdown):', 'color: #a5f3fc; font-weight: bold;');
        console.log(snippet);
        console.log('%c📐 目前配置參數 (Parameters):', 'color: #94a3b8; font-weight: bold;', {
          mode: baseConfig.mode,
          title: baseConfig.title,
          locked: true,
          crop: baseConfig.crop,
          aspectRatio: baseConfig.aspectRatio,
          height: baseConfig.height,
          heading: showTuning ? liveHeading : baseConfig.params.heading,
          pitch: showTuning ? livePitch : baseConfig.params.pitch,
          fov: showTuning ? liveFov : baseConfig.params.fov,
          zoom: showTuning ? liveZoom : baseConfig.params.zoom,
          rawAlt: alt,
          rawSrc: src,
          externalUrl: baseConfig.externalUrl
        });
        console.groupEnd();
      }
    }
  };

  const handleCopySnippet = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = displayedSnippet;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    if (isDev) {
      console.group(
        `%c📋 [GoogleMapsEmbed Snippet Copied] ${displayTitle}`,
        'color: #38bdf8; font-weight: bold; font-size: 12px;'
      );
      console.log('%c📋 Markdown Snippet (已複製):', 'color: #a5f3fc; font-weight: bold;', textToCopy);
      console.log('%c📐 即時參數 (Live Parameters):', 'color: #94a3b8; font-weight: bold;', {
        heading: liveHeading,
        pitch: livePitch,
        fov: liveFov,
        zoom: liveZoom
      });
      console.groupEnd();
    }
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
        maxWidth: baseConfig.isVertical ? (baseConfig.width ? `${baseConfig.width}px` : '340px') : undefined,
        margin: baseConfig.isVertical ? '8px auto' : '8px 0',
        borderRadius: 8,
        overflow: 'hidden',
        touchAction: isLocked ? 'pan-y' : 'auto',
        backgroundColor: 'rgba(2, 6, 23, 0.92)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
        ...style
      }}
    >
      {/* Optional Top Header Bar (enabled via `header` or `bar` in markdown) */}
      {baseConfig.showHeader && (
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
            {isDev && (baseConfig.mode === 'streetview' || baseConfig.mode === 'view') && (
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
                title="開啟微調面板，可看著畫面滑動調整方位 (Heading)、仰角 (Pitch) 與縮放 (FOV)"
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

          {baseConfig.externalUrl && (
            <a
              href={baseConfig.externalUrl}
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
            height: baseConfig.height ? `${baseConfig.height}px` : 'auto',
            aspectRatio: baseConfig.height ? undefined : baseConfig.aspectRatio,
            minHeight: baseConfig.height ? undefined : 160,
            maxHeight: baseConfig.height
              ? undefined
              : baseConfig.isVertical
              ? 'min(75vh, 520px)'
              : 'min(75vh, 600px)',
            overflow: 'hidden',
            touchAction: isLocked ? 'pan-y' : 'auto',
            backgroundColor: '#020617',
            cursor: isLocked ? 'default' : undefined,
            userSelect: isLocked ? 'none' : undefined
          }}
        >
          <iframe
            src={embedUrl}
            width="100%"
            height={baseConfig.height ? baseConfig.height : undefined}
            style={{
              position: 'absolute',
              top: -baseConfig.crop.top,
              left: -baseConfig.crop.left,
              width: `calc(100% + ${baseConfig.crop.left + baseConfig.crop.right}px)`,
              height: `calc(100% + ${baseConfig.crop.top + baseConfig.crop.bottom}px)`,
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

          {/* Transparent gesture overlay when locked: enables native touch & wheel scrolling to scroll parent info card */}
          {isLocked && (
            <div
              className="google-maps-locked-overlay"
              onWheel={(e) => {
                const scrollParent = e.currentTarget.closest('.drawer-content') || document.documentElement;
                if (scrollParent) {
                  scrollParent.scrollTop += e.deltaY;
                }
              }}
            />
          )}

          {/* Floating overlays when top bar is hidden: 0px layout impact, hover-triggered toggle */}
          {!baseConfig.showHeader && (
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
              {isDev && (baseConfig.mode === 'streetview' || baseConfig.mode === 'view') && (
                <button
                  type="button"
                  className={`google-maps-tune-btn ${showTuning ? 'is-active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTuning(!showTuning);
                  }}
                  title="開啟微調面板，即時滑動調整方位 (Heading)、仰角 (Pitch) 與縮放 (FOV)"
                >
                  <Sliders size={11} />
                  <span>{showTuning ? '收起微調' : '微調'}</span>
                </button>
              )}
              {baseConfig.externalUrl && (
                <a
                  className="google-maps-float-link"
                  href={baseConfig.externalUrl}
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
          {baseConfig.externalUrl && (
            <a
              href={baseConfig.externalUrl}
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

      {/* Interactive Tuning Panel (Dev Mode Only) */}
      {isDev && showTuning && (baseConfig.mode === 'streetview' || baseConfig.mode === 'view') && (
        <div
          className="google-maps-tuning-panel"
          onClick={(e) => e.stopPropagation()}
        >
          {baseConfig.mode === 'streetview' && (
            <>
              {/* Heading Row */}
              <div className="google-maps-tuning-row">
                <div className="google-maps-tuning-item-label">
                  <span>方位角</span>
                  <b>{Math.round(liveHeading * 10) / 10}°</b>
                </div>
                <button
                  type="button"
                  className="google-maps-step-btn"
                  onClick={() => {
                    setCustomSnippet(null);
                    setLiveHeading(h => Math.round(((h - 0.5 + 360) % 360) * 10) / 10);
                  }}
                  title="方位 -0.5°"
                >
                  -
                </button>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={0.5}
                  value={liveHeading}
                  onChange={(e) => {
                    setCustomSnippet(null);
                    setLiveHeading(parseFloat(e.target.value));
                  }}
                  className="google-maps-tuning-slider"
                />
                <button
                  type="button"
                  className="google-maps-step-btn"
                  onClick={() => {
                    setCustomSnippet(null);
                    setLiveHeading(h => Math.round(((h + 0.5) % 360) * 10) / 10);
                  }}
                  title="方位 +0.5°"
                >
                  +
                </button>
              </div>

              {/* Pitch Row */}
              <div className="google-maps-tuning-row">
                <div className="google-maps-tuning-item-label">
                  <span>仰角</span>
                  <b>{livePitch > 0 ? '+' : ''}{Math.round(livePitch * 10) / 10}°</b>
                </div>
                <button
                  type="button"
                  className="google-maps-step-btn"
                  onClick={() => {
                    setCustomSnippet(null);
                    setLivePitch(p => Math.max(-90, Math.round((p - 0.5) * 10) / 10));
                  }}
                  title="仰角 -0.5°"
                >
                  -
                </button>
                <input
                  type="range"
                  min={-90}
                  max={90}
                  step={0.5}
                  value={livePitch}
                  onChange={(e) => {
                    setCustomSnippet(null);
                    setLivePitch(parseFloat(e.target.value));
                  }}
                  className="google-maps-tuning-slider"
                />
                <button
                  type="button"
                  className="google-maps-step-btn"
                  onClick={() => {
                    setCustomSnippet(null);
                    setLivePitch(p => Math.min(90, Math.round((p + 0.5) * 10) / 10));
                  }}
                  title="仰角 +0.5°"
                >
                  +
                </button>
              </div>

              {/* Zoom (FOV) Row: Inverted Zoom semantics: [+] zooms in (FOV down to 10), [-] zooms out (FOV up to 100) */}
              <div className="google-maps-tuning-row">
                <div
                  className="google-maps-tuning-item-label"
                  title={`目前視野角: ${Math.round(liveFov * 10) / 10}°（向右放大特寫，向左縮小廣角）`}
                >
                  <span>縮放</span>
                  <b>{Math.round(liveFov * 10) / 10}°</b>
                </div>
                <button
                  type="button"
                  className="google-maps-step-btn"
                  onClick={() => {
                    setCustomSnippet(null);
                    setLiveFov(f => Math.min(100, Math.round((f + 0.5) * 10) / 10));
                  }}
                  title="縮小 (廣角 +0.5°)"
                >
                  -
                </button>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={0.5}
                  value={Math.round((110 - liveFov) * 10) / 10}
                  onChange={(e) => {
                    setCustomSnippet(null);
                    const val = parseFloat(e.target.value);
                    setLiveFov(Math.round((110 - val) * 10) / 10);
                  }}
                  className="google-maps-tuning-slider"
                  title="縮放調整（向右放大特寫，向左縮小廣角）"
                />
                <button
                  type="button"
                  className="google-maps-step-btn"
                  onClick={() => {
                    setCustomSnippet(null);
                    setLiveFov(f => Math.max(10, Math.round((f - 0.5) * 10) / 10));
                  }}
                  title="放大 (特寫 -0.5°)"
                >
                  +
                </button>
              </div>
            </>
          )}

          {baseConfig.mode === 'view' && (
            <div className="google-maps-tuning-row">
              <div className="google-maps-tuning-item-label">
                <span>縮放</span>
                <b>{Math.round(liveZoom)}</b>
              </div>
              <button
                type="button"
                className="google-maps-step-btn"
                onClick={() => {
                  setCustomSnippet(null);
                  setLiveZoom(z => Math.max(1, z - 1));
                }}
                title="縮放 -1"
              >
                -
              </button>
              <input
                type="range"
                min={1}
                max={21}
                step={1}
                value={liveZoom}
                onChange={(e) => {
                  setCustomSnippet(null);
                  setLiveZoom(parseInt(e.target.value, 10));
                }}
                className="google-maps-tuning-slider"
              />
              <button
                type="button"
                className="google-maps-step-btn"
                onClick={() => {
                  setCustomSnippet(null);
                  setLiveZoom(z => Math.min(21, z + 1));
                }}
                title="縮放 +1"
              >
                +
              </button>
            </div>
          )}

          {/* Live Editable Markdown Snippet Box with Icon-only Copy Button */}
          <div className={`google-maps-snippet-box ${appliedFlash ? 'is-applied' : ''}`}>
            <input
              type="text"
              className="google-maps-snippet-input"
              value={displayedSnippet}
              onChange={(e) => setCustomSnippet(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleApplySnippet();
                }
              }}
              spellCheck={false}
              title="可直接編輯或複製此 Markdown 語法（修改後按 Enter 立即套用更新畫面）"
            />
            <button
              type="button"
              className="google-maps-copy-btn"
              onClick={handleCopySnippet}
              title={copied ? '已複製到剪貼簿！' : '複製 Markdown 語法'}
              aria-label="複製語法"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
