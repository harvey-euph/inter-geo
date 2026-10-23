import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LoreCard, LoreItem, LoreQuery, LoreStub } from '../types/lore';
import { loadLoreCard, queryLoreStubs } from '../lore/loreRegistry';

interface MarkdownLoreCardProps {
  card: LoreCard;
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
const renderInlineMarkdown = (text: string): React.ReactNode[] => {
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
              src={src}
              alt={altText || 'lore illustration'}
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
        return (
          <a
            key={idx}
            href={match[2]}
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

/**
 * Single Markdown Lore Card Renderer
 */
export const MarkdownLoreCard: React.FC<MarkdownLoreCardProps> = ({ card }) => {
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
          src={`${import.meta.env.BASE_URL}/${card.image}`}
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
      {card.items.map((item: LoreItem, idx: number) => {
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
            <span>{renderInlineMarkdown(item.content)}</span>

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
                    {renderInlineMarkdown(sub)}
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
      className="intel-card markdown-lore-card"
      style={{
        borderColor: `${accent}70`,
        backgroundColor: `${accent}0d`,
        boxShadow: `0 4px 18px rgba(0, 0, 0, 0.28), 0 0 10px ${accent}15`
      }}
    >
      {/* Card Header */}
      <div className="intel-card-header" style={{ alignItems: 'flex-start', gap: 8 }}>
        {card.icon && <span style={{ fontSize: 18, lineHeight: 1 }}>{card.icon}</span>}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ color: accent, fontWeight: 700, fontSize: 14 }}>{card.title}</span>
            {card.tags && card.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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
          </div>
          {card.comparisonTargets && card.comparisonTargets.length > 1 && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              跨區比較對象：{card.comparisonTargets.join(' vs ')}
            </div>
          )}
        </div>
      </div>

      {/* Card Body with Optional Image Layout & Bullet List */}
      <div className="intel-card-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
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
    </div>
  );
};

interface LazyMarkdownLoreCardProps {
  stub: LoreStub;
}

/**
 * Fetches and renders a single LoreCard on-demand when it enters the scroll viewport
 */
const LazyMarkdownLoreCard: React.FC<LazyMarkdownLoreCardProps> = ({ stub }) => {
  const [card, setCard] = useState<LoreCard | null>(null);
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

    loadLoreCard(stub)
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
    return <MarkdownLoreCard card={card} />;
  }

  if (hasError) {
    return null;
  }

  const accent = stub.accentColor || '#fbbf24';

  return (
    <div
      ref={containerRef}
      className="intel-card markdown-lore-card"
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

interface MarkdownLoreCardsProps {
  query: LoreQuery;
  /** Number of cards to mount per scroll batch inside the info drawer */
  pageSize?: number;
}

/**
 * Queries matching LoreStubs and progressively mounts cards as the user scrolls inside the info drawer
 */
export const MarkdownLoreCards: React.FC<MarkdownLoreCardsProps> = ({ query, pageSize = 3 }) => {
  const stubs = useMemo(() => queryLoreStubs(query), [query]);

  const queryKey = `${query.countryIso2 || ''}|${query.subdivisionCode || ''}|${query.subdivisionId ?? ''}|${query.municipalityCode || ''}|${query.roadName || ''}|${query.roadClass || ''}|${query.taipowerLetter || ''}`;

  const [pagination, setPagination] = useState<{ key: string; count: number }>({
    key: queryKey,
    count: pageSize
  });

  const visibleCount = pagination.key === queryKey ? pagination.count : pageSize;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= stubs.length) return;

    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setPagination((prev) => ({
            key: queryKey,
            count: Math.min(stubs.length, (prev.key === queryKey ? prev.count : pageSize) + pageSize)
          }));
        }
      },
      { rootMargin: '120px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, stubs.length, queryKey, pageSize]);

  if (!stubs || stubs.length === 0) return null;

  const visibleStubs = stubs.slice(0, visibleCount);
  const remainingCount = stubs.length - visibleStubs.length;

  return (
    <>
      {visibleStubs.map((stub) => (
        <LazyMarkdownLoreCard key={stub.id} stub={stub} />
      ))}
      {remainingCount > 0 && (
        <div
          ref={sentinelRef}
          onClick={() =>
            setPagination({
              key: queryKey,
              count: Math.min(stubs.length, visibleCount + pageSize)
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
    </>
  );
};
