import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { isInfoIndexLoaded, loadInfoCard, onInfoIndexLoaded, queryInfoStubs } from '../info/infoRegistry';
import { resolveInfoImageUrl } from '../info/imageUrl';
import type { InfoCard, InfoItem, InfoQuery, InfoStub } from '../types/info';

interface MarkdownInfoCardProps {
  card: InfoCard;
}

/**
 * Resolves a size token ('sm' | 'md' | 'lg' | 'xl' | 'banner' | '68' | '100x60') into CSS dimensions
 */
function resolveImageDimensions(sizeToken?: string): {
  width: number | string;
  height: number | string;
  maxHeight?: number;
  isBanner?: boolean;
} {
  const token = (sizeToken || 'md').trim().toLowerCase();
  if (token === 'sm') return { width: 52, height: 'auto', maxHeight: 72 };
  if (token === 'md') return { width: 76, height: 'auto', maxHeight: 108 };
  if (token === 'lg') return { width: 108, height: 'auto', maxHeight: 148 };
  if (token === 'xl') return { width: 140, height: 'auto', maxHeight: 188 };
  if (token === 'banner' || token === 'full') {
    return { width: '100%', height: 'auto', maxHeight: 168, isBanner: true };
  }
  const rectMatch = token.match(/^(\d+)x(\d+)$/);
  if (rectMatch) {
    return { width: Number(rectMatch[1]), height: Number(rectMatch[2]) };
  }
  const numMatch = token.match(/^(\d+)(px)?$/);
  if (numMatch) {
    const px = Number(numMatch[1]);
    return { width: px, height: 'auto', maxHeight: Math.round(px * 1.5) };
  }
  return { width: 76, height: 'auto', maxHeight: 108 };
}

/**
 * Safely renders inline markdown (images, bold, italic, code, links, callouts)
 */
const renderInlineMarkdown = (
  text: string,
  onSelectCountryName?: (name: string) => void
): React.ReactNode[] => {
  if (!text) return [];

  // Tokens: ![alt|size](url), **bold**, *italic*, `code`, [text](url)
  const tokenRegex = /(!\[[^\]]*?\]\([^)]+?\)|\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`|\[[^\]]+?\]\([^)]+?\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (part.startsWith('![') && part.includes('](') && part.endsWith(')')) {
      const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch) {
        const rawAlt = imgMatch[1].trim();
        const src = imgMatch[2].trim();
        const [altText, sizeParam] = rawAlt.includes('|')
          ? rawAlt.split('|').map((s) => s.trim())
          : [rawAlt, undefined];
        const dims = resolveImageDimensions(sizeParam || 'md');
        return (
          <span
            key={idx}
            style={{
              display: dims.isBanner ? 'flex' : 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: dims.width,
              height: dims.height,
              maxWidth: '100%',
              margin: dims.isBanner ? '6px 0' : '2px 6px 2px 0',
              padding: 4,
              borderRadius: 8,
              backgroundColor: 'rgba(2, 6, 23, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              verticalAlign: 'middle'
            }}
          >
            <img
              src={resolveInfoImageUrl(src)}
              alt={altText || 'info illustration'}
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                maxHeight: dims.maxHeight || (typeof dims.height === 'number' ? dims.height - 8 : 96),
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </span>
        );
      }
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      const isCallout = inner.startsWith('【') && inner.endsWith('】');
      return (
        <strong
          key={idx}
          style={{
            color: isCallout ? '#fbbf24' : 'inherit',
            fontWeight: 700
          }}
        >
          {inner}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={idx} style={{ color: '#cbd5e1', fontStyle: 'italic' }}>
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            padding: '1px 5px',
            borderRadius: 4,
            fontSize: 12,
            fontFamily: 'monospace',
            color: '#38bdf8'
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        const href = match[2];
        if (href.toLowerCase().startsWith('country:')) {
          let countryName = href.slice('country:'.length);
          try {
            countryName = decodeURIComponent(countryName);
          } catch {
            // Keep the raw target when the href is not valid percent-encoding.
          }
          if (!onSelectCountryName) {
            return (
              <span key={idx} className="confused-country-btn">
                {match[1]}
              </span>
            );
          }
          return (
            <button
              key={idx}
              type="button"
              className="confused-country-btn"
              onClick={() => onSelectCountryName(countryName)}
            >
              {match[1]}
            </button>
          );
        }
        return (
          <a
            key={idx}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#38bdf8', textDecoration: 'underline' }}
          >
            {match[1]}
          </a>
        );
      }
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
};

const CountryLinkContext = React.createContext<((name: string) => void) | undefined>(undefined);

const InlineMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const onSelectCountryName = React.useContext(CountryLinkContext);
  return <>{renderInlineMarkdown(text, onSelectCountryName)}</>;
};

/**
 * Single Markdown info card renderer
 */
export const MarkdownInfoCard: React.FC<MarkdownInfoCardProps> = ({ card }) => {
  const [isExpanded, setIsExpanded] = useState(() => card.display ?? false);
  const accent = card.accentColor || '#fbbf24';
  const hasCardImage = Boolean(card.image);
  const imageDims = hasCardImage ? resolveImageDimensions(card.imageSize) : null;
  const effectivePosition =
    card.imagePosition || (imageDims?.isBanner ? 'top' : 'left');
  const isSideImage = hasCardImage && (effectivePosition === 'left' || effectivePosition === 'right');

  const cardImageNode =
    hasCardImage && imageDims ? (
      <div
        style={{
          width: imageDims.width,
          height: imageDims.height,
          minWidth: typeof imageDims.width === 'number' ? imageDims.width : undefined,
          maxWidth: '100%',
          borderRadius: 8,
          backgroundColor: 'rgba(2, 6, 23, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          marginBottom: effectivePosition === 'top' ? 10 : 0
        }}
      >
        <img
          src={resolveInfoImageUrl(card.image || '')}
          alt={card.imageAlt || card.title}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            maxHeight: imageDims.maxHeight,
            objectFit: 'contain',
            display: 'block'
          }}
        />
      </div>
    ) : null;

  const bulletListNode = (
    <ul style={{ margin: 0, padding: 0, listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
      {card.items.map((item: InfoItem, idx: number) => {
        const hasCallout = item.label && item.label.startsWith('【') && item.label.endsWith('】');
        return (
          <li key={idx} style={{ color: '#cbd5e1' }}>
            {item.label && (
              <strong
                style={{
                  color: hasCallout ? accent : '#f1f5f9',
                  fontWeight: 700,
                  marginRight: 4
                }}
              >
                {item.label}
                {!hasCallout && !item.label.endsWith('：') && !item.label.endsWith(':') ? '：' : ''}
              </strong>
            )}
            <span><InlineMarkdown text={item.content} /></span>

            {/* Indented Sub-bullet Items */}
            {item.subItems && item.subItems.length > 0 && (
              <ul
                style={{
                  margin: '6px 0 2px 4px',
                  paddingLeft: 18,
                  listStyleType: 'disc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}
              >
                {item.subItems.map((sub: string, sIdx: number) => (
                  <li key={sIdx} style={{ color: '#e2e8f0', fontSize: 12.5, lineHeight: 1.5 }}>
                    <InlineMarkdown text={sub} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div
      className="intel-card info-card"
      onClick={(e) => {
        const target = e.target;
        if (
          target instanceof Element &&
          target.closest('a, button, input, select, textarea, [role="button"]')
        ) {
          return;
        }
        setIsExpanded((expanded) => !expanded);
      }}
      style={{
        borderColor: `${accent}70`,
        backgroundColor: `${accent}0d`,
        boxShadow: `0 4px 18px rgba(0, 0, 0, 0.28), 0 0 10px ${accent}15`,
        cursor: 'pointer'
      }}
    >
      <button
        type="button"
        className="intel-card-header info-card-title-toggle"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((expanded) => !expanded)}
        style={{
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: 0,
          border: 0,
          background: 'transparent',
          textAlign: 'left',
          cursor: 'pointer'
        }}
      >
        {card.icon && <span style={{ fontSize: 18, lineHeight: 1 }}>{card.icon}</span>}
        <span style={{ color: accent, fontWeight: 700, fontSize: 14, flex: 1 }}>{card.title}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          style={{
            flexShrink: 0,
            color: accent,
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 160ms ease'
          }}
        />
      </button>

      {/* Card Body with Optional Image Layout & Bullet List */}
      {isExpanded && (
        <div className="intel-card-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
          {card.tags && card.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {card.tags.map((tag, tIdx) => (
                <span
                  key={tIdx}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 4,
                    backgroundColor: `${accent}22`,
                    color: accent,
                    border: `1px solid ${accent}45`
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {card.comparisonTargets && card.comparisonTargets.length > 1 && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
              跨區比較對象：{card.comparisonTargets.join(' vs ')}
            </div>
          )}
          {effectivePosition === 'top' && cardImageNode}
          {isSideImage ? (
            <div
              style={{
                display: 'flex',
                flexDirection: effectivePosition === 'right' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: 14
              }}
            >
              {cardImageNode}
              {bulletListNode}
            </div>
          ) : (
            bulletListNode
          )}
        </div>
      )}
    </div>
  );
};

interface LazyMarkdownInfoCardProps {
  stub: InfoStub;
}

/**
 * Fetches and renders a single info card when it enters the scroll viewport
 */
const LazyMarkdownInfoCard: React.FC<LazyMarkdownInfoCardProps> = ({ stub }) => {
  const [card, setCard] = useState<InfoCard | null>(null);
  const [isVisible, setIsVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || isVisible || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '160px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;

    loadInfoCard(stub)
      .then((loaded) => {
        if (cancelled) return;
        if (loaded) {
          setCard(loaded);
        } else {
          setHasError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isVisible, stub]);

  if (card) {
    return <MarkdownInfoCard card={card} />;
  }

  if (hasError) {
    return null;
  }

  const accent = stub.accentColor || '#fbbf24';

  return (
    <div
      ref={containerRef}
      className="intel-card info-card"
      style={{
        borderColor: `${accent}45`,
        backgroundColor: `${accent}08`,
        minHeight: 72
      }}
    >
      <div className="intel-card-header" style={{ alignItems: 'center', gap: 8 }}>
        {stub.icon && <span style={{ fontSize: 18, lineHeight: 1 }}>{stub.icon}</span>}
        <span style={{ color: accent, fontWeight: 700, fontSize: 14 }}>{stub.title}</span>
      </div>
      <div style={{ fontSize: 12, color: '#64748b' }}>載入專欄內容中...</div>
    </div>
  );
};

interface MarkdownInfoCardsProps {
  query: InfoQuery;
  /** Number of cards to mount per scroll batch inside the info drawer */
  pageSize?: number;
  /** Opens another country when an info link uses the country: target. */
  onSelectCountryName?: (name: string) => void;
}

/**
 * Queries matching info stubs and mounts essay cards as the drawer scrolls.
 */
export const MarkdownInfoCards: React.FC<MarkdownInfoCardsProps> = ({
  query,
  pageSize = 3,
  onSelectCountryName
}) => {
  const [indexLoaded, setIndexLoaded] = useState(isInfoIndexLoaded());

  useEffect(() => {
    if (!indexLoaded) {
      return onInfoIndexLoaded(() => setIndexLoaded(true));
    }
  }, [indexLoaded]);

  const essayStubs = useMemo(() => {
    void indexLoaded;
    return queryInfoStubs(query);
  }, [query, indexLoaded]);

  const queryKey = `${query.countryIso2 || ''}|${query.subdivisionCode || ''}|${query.subdivisionId ?? ''}|${query.municipalityCode || ''}|${query.roadName || ''}|${query.roadClass || ''}|${query.targetId || query.taipowerLetter || ''}`;

  const [pagination, setPagination] = useState<{ key: string; count: number }>({
    key: queryKey,
    count: pageSize
  });

  const visibleCount = pagination.key === queryKey ? pagination.count : pageSize;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= essayStubs.length) return;

    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setPagination((prev) => ({
            key: queryKey,
            count: Math.min(essayStubs.length, (prev.key === queryKey ? prev.count : pageSize) + pageSize)
          }));
        }
      },
      { rootMargin: '120px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, essayStubs.length, queryKey, pageSize]);

  if (essayStubs.length === 0) return null;

  const visibleStubs = essayStubs.slice(0, visibleCount);
  const remainingCount = essayStubs.length - visibleStubs.length;

  return (
    <CountryLinkContext.Provider value={onSelectCountryName}>
      {visibleStubs.map((stub) => (
        <LazyMarkdownInfoCard key={stub.id} stub={stub} />
      ))}
      {remainingCount > 0 && (
        <div
          ref={sentinelRef}
          onClick={() =>
            setPagination({
              key: queryKey,
              count: Math.min(essayStubs.length, visibleCount + pageSize)
            })
          }
          style={{
            textAlign: 'center',
            padding: '8px 12px',
            fontSize: 12,
            color: '#94a3b8',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            borderRadius: 8,
            cursor: 'pointer'
          }}
        >
          向下滾動或點擊載入更多專欄（尚有 {remainingCount} 篇）
        </div>
      )}
    </CountryLinkContext.Provider>
  );
};
