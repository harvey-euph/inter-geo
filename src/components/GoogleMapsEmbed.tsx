import React, { useMemo } from 'react';
import { ExternalLink, Compass, MapPin, AlertCircle } from 'lucide-react';
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
      {/* Top Header Bar */}
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

      {/* Embed Iframe or Missing Key Banner */}
      {apiKey && embedUrl ? (
        <iframe
          src={embedUrl}
          width="100%"
          height={config.height ? config.height : undefined}
          style={{
            border: 0,
            display: 'block',
            width: '100%',
            height: config.height ? `${config.height}px` : 'auto',
            aspectRatio: config.height ? undefined : config.aspectRatio,
            minHeight: config.height ? undefined : 160,
            maxHeight: config.height ? undefined : 'min(75vh, 600px)',
            backgroundColor: '#020617'
          }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          title={displayTitle}
        />
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
