import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Edit3, Trash2 } from 'lucide-react';
import { invalidateInfoCard, isInfoIndexLoaded, loadInfoCard, onInfoIndexLoaded, optimisticAppendCardBullet, optimisticDeleteInfoCard, queryInfoStubs, reloadInfoIndex } from '../info/infoRegistry';
import { InfoArticleError, deleteInfoArticle, saveInfoArticle } from '../info/saveInfoArticle';
import { resolveInfoImageUrl } from '../info/imageUrl';
import { GoogleMapsEmbed } from './GoogleMapsEmbed';
import { InfoEmbedSourceContext, type InfoEmbedSlot, type InfoEmbedSource } from '../info/infoEmbedSource';
import { LayerSizeControls } from './LayerSizeControls';
import { NewInfoArticleForm } from './NewInfoArticleForm';
import { findCountry } from '../data/countries';
import { isGoogleMapsEmbedToken } from '../utils/googleMapsEmbed';
import { useDevMode } from '../utils/devMode';
import type { InfoCard, InfoItem, InfoQuery, InfoStub } from '../types/info';
import {
  getInfoTagPreferences,
  subscribeInfoTagPreferences,
  matchesCardTagFilter,
  resetInfoTagPreferences,
  type InfoTagPreferences
} from '../info/infoTagPreferences';

export interface LayerControlContextValue {
  activeRegionalFilters?: Set<string>;
  activeTextFilters?: Set<string>;
  activeInternationalImageFilter?: string | null;
  onToggleLayer?: (layerId: string) => void;
}

const LayerControlContext = React.createContext<LayerControlContextValue>({});

function isAreaFeatureLayerActive(layerId: string, ctx: LayerControlContextValue): boolean {
  if (!layerId) return false;
  if (layerId === 'pedestrian-crossing' || layerId === 'eu-pedestrian-crossing') {
    return Boolean(
      ctx.activeRegionalFilters?.has('pedestrian-crossing') ||
        ctx.activeRegionalFilters?.has('eu-pedestrian-crossing') ||
        ctx.activeInternationalImageFilter === 'pedestrian-crossing' ||
        ctx.activeInternationalImageFilter === 'eu-pedestrian-crossing'
    );
  }
  return Boolean(
    ctx.activeRegionalFilters?.has(layerId) || ctx.activeTextFilters?.has(layerId)
  );
}

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

function embedTokensIn(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  const re = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)/g;
  for (const match of text.matchAll(re)) {
    if (match[1] !== undefined && isGoogleMapsEmbedToken(match[1], match[2])) {
      found.push(match[0]);
    } else if (match[3] && /^(?:embed:(?:map|streetview|sv|gmap)|embed)$/i.test(match[3].trim())) {
      found.push(match[0]);
    }
  }
  return found;
}

function splitEmbedToken(token: string): { alt: string; src: string } {
  const match = token.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);
  if (!match) return { alt: 'sv', src: '' };
  return { alt: match[1], src: match[2] };
}

interface StreetViewDraft {
  key: string;
  alt: string;
  src: string;
  token: string;
  unsaved: boolean;
}

/**
 * Safely renders inline markdown (images, bold, italic, code, links, callouts)
 */
const renderInlineMarkdown = (
  text: string,
  onSelectCountryName?: (name: string) => void,
  embedSource?: InfoEmbedSource | null
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

        if (isGoogleMapsEmbedToken(rawAlt, src)) {
          const slot: InfoEmbedSlot = embedSource
            ? embedSource.claimSlot(part)
            : { index: 0, removed: false, occurrence: 0 };
          if (slot.removed) return <React.Fragment key={idx} />;
          return (
            <GoogleMapsEmbed
              key={idx}
              alt={rawAlt}
              src={src}
              originalToken={part}
              embedIndex={slot.index}
              onRemoved={embedSource ? () => embedSource.hideSlot(part, slot.occurrence) : undefined}
            />
          );
        }

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
        const linkText = match[1].trim();
        const href = match[2].trim();

        if (/^(?:embed:(?:map|streetview|sv|gmap)|embed)$/i.test(linkText)) {
          const slot: InfoEmbedSlot = embedSource
            ? embedSource.claimSlot(part)
            : { index: 0, removed: false, occurrence: 0 };
          if (slot.removed) return <React.Fragment key={idx} />;
          return (
            <GoogleMapsEmbed
              key={idx}
              alt={linkText}
              src={href}
              originalToken={part}
              embedIndex={slot.index}
              onRemoved={embedSource ? () => embedSource.hideSlot(part, slot.occurrence) : undefined}
            />
          );
        }

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
  const embedSource = React.useContext(InfoEmbedSourceContext);
  return <>{renderInlineMarkdown(text, onSelectCountryName, embedSource)}</>;
};

/**
 * Single Markdown info card renderer
 */
export const MarkdownInfoCard: React.FC<MarkdownInfoCardProps> = ({ card }) => {
  const [expandedState, setExpandedState] = useState(() => card.display ?? false);
  const [removedKeys, setRemovedKeys] = useState<Set<string>>(() => new Set());
  const [drafts, setDrafts] = useState<StreetViewDraft[]>([]);
  const [articleText, setArticleText] = useState('');
  const [articleError, setArticleError] = useState('');
  const [articleBusy, setArticleBusy] = useState(false);
  const [seenCardId, setSeenCardId] = useState(card.id);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const draftSeq = useRef(0);
  const isDev = useDevMode();
  const layerCtrl = React.useContext(LayerControlContext);

  useEffect(() => {
    if (!showMenu) return;
    const handleOutsideClick = () => setShowMenu(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [showMenu]);

  const handleDeleteCard = () => {
    const confirmDelete = window.confirm(
      `確定要刪除專欄文章「${card.title}」嗎？\n此文章將會被移動到 null.md.deprecated 封存，且不會被 build index。`
    );
    if (!confirmDelete) return;

    // 🚀 Optimistic delete: immediately remove from UI
    const rollback = optimisticDeleteInfoCard(card.id);

    const rawFile = card.sourceFile || 'info/note.md';
    const sourceFile = rawFile.startsWith('info/') ? rawFile : `info/${rawFile}`;

    void deleteInfoArticle({ file: sourceFile, cardId: card.id })
      .then(async () => {
        await reloadInfoIndex();
      })
      .catch((err: unknown) => {
        rollback();
        alert(`刪除文章失敗：${err instanceof Error ? err.message : '寫入或索引更新失敗'}`);
      });
  };

  if (card.id !== seenCardId) {
    setSeenCardId(card.id);
    setRemovedKeys(new Set());
    setDrafts([]);
    setArticleText('');
    setArticleError('');
    setArticleBusy(false);
    setShowMenu(false);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <NewInfoArticleForm
        initialCard={card}
        onClose={() => setIsEditing(false)}
        onSuccess={() => setIsEditing(false)}
      />
    );
  }

  const layerId = card.layer?.trim();
  const isLayerActive = layerId ? isAreaFeatureLayerActive(layerId, layerCtrl) : false;
  const isLayerControlled = Boolean(layerId && layerCtrl.onToggleLayer);
  const isExpanded = isLayerControlled ? isLayerActive : expandedState;

  const handleToggleExpand = () => {
    if (layerId && layerCtrl.onToggleLayer) {
      layerCtrl.onToggleLayer(layerId);
    } else {
      setExpandedState((expanded) => !expanded);
    }
  };

  const accent = card.accentColor || '#fbbf24';
  const sourceName = card.sourceFile?.split('/').pop() || '';
  const queues = new Map<string, InfoEmbedSlot[]>();
  const visibleCounts = new Map<string, number>();
  const occurrenceCounts = new Map<string, number>();
  const hiddenItems = new Set<number>();
  const hiddenSubs = new Set<string>();

  const assignSlot = (token: string, enqueue: boolean): InfoEmbedSlot => {
    const occurrence = occurrenceCounts.get(token) ?? 0;
    occurrenceCounts.set(token, occurrence + 1);
    const removed = removedKeys.has(`${token}\0${occurrence}`);
    const index = visibleCounts.get(token) ?? 0;
    if (!removed) visibleCounts.set(token, index + 1);
    const slot = { index, removed, occurrence };
    if (enqueue) {
      const list = queues.get(token) ?? [];
      list.push(slot);
      queues.set(token, list);
    }
    return slot;
  };

  card.items.forEach((item, idx) => {
    const contentTokens = embedTokensIn(item.content || '');
    const subs = item.subItems ?? [];
    const pureItem =
      !item.label &&
      contentTokens.length === 1 &&
      (item.content || '').trim() === contentTokens[0] &&
      subs.every((sub) => !sub.trim());
    if (pureItem) {
      const slot = assignSlot(contentTokens[0], false);
      if (slot.removed) hiddenItems.add(idx);
      else {
        const list = queues.get(contentTokens[0]) ?? [];
        list.push(slot);
        queues.set(contentTokens[0], list);
      }
      return;
    }
    for (const token of contentTokens) assignSlot(token, true);
    subs.forEach((sub, sIdx) => {
      const tokens = embedTokensIn(sub);
      const pureSub = tokens.length === 1 && sub.trim() === tokens[0];
      if (pureSub) {
        const slot = assignSlot(tokens[0], false);
        if (slot.removed) hiddenSubs.add(`${idx}:${sIdx}`);
        else {
          const list = queues.get(tokens[0]) ?? [];
          list.push(slot);
          queues.set(tokens[0], list);
        }
        return;
      }
      for (const token of tokens) assignSlot(token, true);
    });
  });

  const embedSource: InfoEmbedSource | null =
    card.id && /^[\w.-]+\.md$/.test(sourceName)
      ? {
          file: `info/${sourceName}`,
          cardId: card.id,
          claimSlot: (token: string) => {
            const list = queues.get(token);
            if (list && list.length > 0) return list.shift() as InfoEmbedSlot;
            const occurrence = occurrenceCounts.get(token) ?? 0;
            occurrenceCounts.set(token, occurrence + 1);
            const index = visibleCounts.get(token) ?? 0;
            visibleCounts.set(token, index + 1);
            return { index, removed: false, occurrence };
          },
          hideSlot: (token: string, occurrence: number) => {
            setRemovedKeys((prev) => {
              const next = new Set(prev);
              next.add(`${token}\0${occurrence}`);
              return next;
            });
          }
        }
      : null;

  const submitArticle = () => {
    if (!embedSource || articleBusy) return;
    const text = articleText.trim();
    if (!text) {
      setArticleError('先寫上條目內容，再按 Enter');
      return;
    }
    const source = embedSource;
    // 🚀 Optimistic update: instantly append bullet item to card in memory
    const rollback = optimisticAppendCardBullet(source.cardId, text);
    setArticleText('');
    setArticleError('');
    setArticleBusy(true);

    void saveInfoArticle({ file: source.file, cardId: source.cardId, text })
      .then(async () => {
        invalidateInfoCard(source.cardId);
        await reloadInfoIndex();
      })
      .catch(async (err: unknown) => {
        const written = err instanceof InfoArticleError && err.written;
        if (written) {
          invalidateInfoCard(source.cardId);
          try {
            await reloadInfoIndex();
          } catch {
            // The markdown is already on disk.
          }
        } else {
          rollback();
          setArticleText(text);
        }
        setArticleError(err instanceof Error ? err.message : '寫入失敗');
      })
      .finally(() => setArticleBusy(false));
  };

  const hasCardImage = Boolean(card.image);
  const imageDims = hasCardImage ? resolveImageDimensions(card.imageSize) : null;
  const effectivePosition =
    card.imagePosition || (imageDims?.isBanner ? 'top' : 'left');
  const isSideImage = hasCardImage && (effectivePosition === 'left' || effectivePosition === 'right');

  const isEmbedImage = Boolean(card.image && isGoogleMapsEmbedToken(card.imageAlt, card.image));
  const cardImageNode =
    hasCardImage && (isEmbedImage || imageDims) ? (
      isEmbedImage ? (
        <GoogleMapsEmbed
          alt={card.imageAlt}
          src={card.image || ''}
          style={{ marginBottom: effectivePosition === 'top' ? 10 : 0 }}
        />
      ) : (
        <div
          style={{
            width: imageDims!.width,
            height: imageDims!.height,
            minWidth: typeof imageDims!.width === 'number' ? imageDims!.width : undefined,
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
              maxHeight: imageDims!.maxHeight,
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
      )
    ) : null;

  const bulletListNode = (
    <ul style={{ margin: 0, padding: 0, listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
      {card.items.map((item: InfoItem, idx: number) => {
        if (hiddenItems.has(idx)) return null;
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
                  hiddenSubs.has(`${idx}:${sIdx}`) ? null : (
                  <li key={sIdx} style={{ color: '#e2e8f0', fontSize: 12.5, lineHeight: 1.5 }}>
                    <InlineMarkdown text={sub} />
                  </li>
                  )
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <InfoEmbedSourceContext.Provider value={embedSource}>
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
        handleToggleExpand();
      }}
      style={{
        borderColor: `${accent}70`,
        backgroundColor: `${accent}0d`,
        boxShadow: `0 4px 18px rgba(0, 0, 0, 0.28), 0 0 10px ${accent}15`,
        cursor: 'pointer'
      }}
    >
      <div
        className="intel-card-header info-card-title-toggle"
        style={{
           display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%'
        }}
      >
        {/* Card Icon with options dropdown */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
          <button
            type="button"
            aria-label="文章選項"
            title="點擊展開文章選項 (修改 / 刪除)"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((prev) => !prev);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              padding: '2px 4px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              transition: 'background-color 150ms ease, transform 150ms ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {card.icon || '📌'}
          </button>

          {showMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                zIndex: 100,
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: 6,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
                padding: '4px',
                minWidth: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  setIsEditing(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#f8fafc',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Edit3 size={13} style={{ color: '#38bdf8' }} />
                <span>修改</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  handleDeleteCard();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#fca5a5',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#7f1d1d')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Trash2 size={13} style={{ color: '#ef4444' }} />
                <span>刪除</span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={handleToggleExpand}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flex: 1,
            minWidth: 0,
            padding: 0,
            border: 0,
            background: 'transparent',
            textAlign: 'left',
            cursor: 'pointer'
          }}
        >
          <span style={{ color: accent, fontWeight: 700, fontSize: 14, flex: 1 }}>{card.title}</span>
        </button>

        <button
          type="button"
          aria-label={isExpanded ? '收合專欄' : '展開專欄'}
          onClick={handleToggleExpand}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
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
      </div>

      {/* Card Body with Optional Image Layout & Bullet List */}
      {isExpanded && (
        <div className="intel-card-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
          {layerId && <LayerSizeControls layerId={layerId} />}
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
          {isDev && embedSource && (
            <div className="google-maps-snippet-box" style={{ marginTop: 8 }} onClick={(event) => event.stopPropagation()}>
              <input
                className="google-maps-snippet-input"
                aria-label="新增條目"
                placeholder={articleBusy ? '正在寫入並更新索引…' : '新增一列段落/條目，Enter 寫回此卡片'}
                title="Enter 寫回這張 info 卡片（新增一列 bullet），並重跑索引"
                value={articleText}
                disabled={articleBusy}
                onChange={(event) => {
                  setArticleText(event.target.value);
                  if (articleError) setArticleError('');
                }}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    submitArticle();
                  }
                }}
              />
              <button
                type="button"
                className="google-maps-step-btn"
                style={{ width: 'auto', padding: '0 6px' }}
                aria-label="寫入條目"
                disabled={articleBusy}
                onClick={(event) => {
                  event.stopPropagation();
                  submitArticle();
                }}
              >
                寫入條目
              </button>
            </div>
          )}
          {articleError && (
            <div style={{ color: '#fca5a5', fontSize: 11, marginTop: 4 }}>{articleError}</div>
          )}
          {drafts.map((draft) => {
            const draftIndex = draft.unsaved ? 0 : (visibleCounts.get(draft.token) ?? 0);
            if (!draft.unsaved) visibleCounts.set(draft.token, draftIndex + 1);
            return (
            <GoogleMapsEmbed
              key={draft.key}
              alt={draft.alt}
              src={draft.src}
              originalToken={draft.unsaved ? undefined : draft.token}
              embedIndex={draftIndex}
              unsaved={draft.unsaved}
              startOpen={draft.unsaved}
              onInserted={(token) => {
                const parts = splitEmbedToken(token);
                setDrafts((prev) => prev.map((item) => (
                  item.key === draft.key
                    ? { ...item, unsaved: false, token, alt: parts.alt, src: parts.src }
                    : item
                )));
              }}
              onRemoved={() => {
                setDrafts((prev) => prev.filter((item) => item.key !== draft.key));
              }}
            />
            );
          })}
          {isDev && embedSource && (
            <button
              type="button"
              className="google-maps-step-btn"
              style={{ width: 'auto', padding: '0 6px', marginTop: 8 }}
              aria-label="新增街景"
              title="新增一張 Google 街景，在訊息框改完按 Enter 寫回"
              onClick={(event) => {
                event.stopPropagation();
                draftSeq.current += 1;
                const key = `sv-draft-${draftSeq.current}`;
                setDrafts((prev) => [...prev, { key, alt: 'sv', src: '', token: '', unsaved: true }]);
              }}
            >
              [+]
            </button>
          )}
        </div>
      )}
    </div>
    </InfoEmbedSourceContext.Provider>
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
  /** Active area-feature layer IDs */
  activeRegionalFilters?: Set<string>;
  activeTextFilters?: Set<string>;
  activeInternationalImageFilter?: string | null;
  /** Callback to toggle an area-feature layer from inside an info card */
  onToggleLayer?: (layerId: string) => void;
}

/**
 * Queries matching info stubs and mounts essay cards as the drawer scrolls.
 */
export const MarkdownInfoCards: React.FC<MarkdownInfoCardsProps> = ({
  query,
  pageSize = 3,
  onSelectCountryName,
  activeRegionalFilters,
  activeTextFilters,
  activeInternationalImageFilter,
  onToggleLayer
}) => {
  const isDev = useDevMode();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [indexLoaded, setIndexLoaded] = useState(isInfoIndexLoaded());
  const [indexEpoch, setIndexEpoch] = useState(0);
  const [tagPrefs, setTagPrefs] = useState<InfoTagPreferences>(() => getInfoTagPreferences());

  const defaultTarget = useMemo(() => {
    if (query.municipalityCode) return query.municipalityCode;
    if (query.subdivisionCode) {
      return query.countryIso2 ? `${query.countryIso2}::${query.subdivisionCode}` : query.subdivisionCode;
    }
    if (query.countryIso2) return query.countryIso2;
    if (query.roadName) return query.roadName;
    if (query.targetId) return query.targetId;
    if (query.taipowerLetter) return query.taipowerLetter;
    return '*';
  }, [query]);

  const defaultFile = useMemo(() => {
    const iso2 = query.countryIso2?.toUpperCase();
    if (iso2 === 'JP') return 'info/japan.md';
    if (iso2 === 'RU') return 'info/russia.md';
    if (iso2 === 'IN') return 'info/india.md';
    if (iso2) {
      const c = findCountry(iso2);
      if (c) {
        if (c.continent === 'Asia') return 'info/asia.md';
        if (c.continent === 'Europe') return 'info/europe.md';
        if (c.continent === 'Africa') return 'info/africa.md';
        if (c.continent === 'Americas') {
          return iso2 === 'US' || iso2 === 'CA' ? 'info/north-america.md' : 'info/latin-america.md';
        }
        if (c.continent === 'Oceania') return 'info/oceania.md';
      }
    }
    return 'info/note.md';
  }, [query.countryIso2]);

  const defaultIcon = useMemo(() => {
    if (query.countryIso2) {
      const c = findCountry(query.countryIso2);
      if (c?.flag) return c.flag;
    }
    return '💡';
  }, [query.countryIso2]);

  useEffect(() => {
    return subscribeInfoTagPreferences(setTagPrefs);
  }, []);

  useEffect(() => onInfoIndexLoaded(() => setIndexEpoch((n) => n + 1)), []);

  useEffect(() => {
    if (!indexLoaded) {
      return onInfoIndexLoaded(() => setIndexLoaded(true));
    }
  }, [indexLoaded]);

  const essayStubs = useMemo(() => {
    void indexLoaded;
    void indexEpoch;
    return queryInfoStubs(query);
  }, [query, indexLoaded, indexEpoch]);

  const filteredStubs = useMemo(() => {
    return essayStubs.filter((stub) => matchesCardTagFilter(stub.tags, tagPrefs));
  }, [essayStubs, tagPrefs]);

  const queryKey = `${query.countryIso2 || ''}|${query.subdivisionCode || ''}|${query.subdivisionId ?? ''}|${query.municipalityCode || ''}|${query.roadName || ''}|${query.roadClass || ''}|${query.targetId || query.taipowerLetter || ''}`;

  const [pagination, setPagination] = useState<{ key: string; count: number }>({
    key: queryKey,
    count: pageSize
  });

  const visibleCount = pagination.key === queryKey ? pagination.count : pageSize;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= filteredStubs.length) return;

    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setPagination((prev) => ({
            key: queryKey,
            count: Math.min(filteredStubs.length, (prev.key === queryKey ? prev.count : pageSize) + pageSize)
          }));
        }
      },
      { rootMargin: '120px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, filteredStubs.length, queryKey, pageSize]);

  const layerControlContextValue = useMemo<LayerControlContextValue>(
    () => ({
      activeRegionalFilters,
      activeTextFilters,
      activeInternationalImageFilter,
      onToggleLayer
    }),
    [activeRegionalFilters, activeTextFilters, activeInternationalImageFilter, onToggleLayer]
  );

  if (essayStubs.length === 0) {
    if (!isDev) return null;
    return (
      <div style={{ marginTop: 10 }}>
        {!showCreateForm ? (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px dashed rgba(56, 189, 248, 0.35)',
              backgroundColor: 'rgba(56, 189, 248, 0.05)',
              textAlign: 'center'
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>
              此地區目前尚無情報專欄
            </div>
            <button
              type="button"
              className="google-maps-step-btn"
              style={{
                width: 'auto',
                padding: '4px 12px',
                fontSize: 12,
                borderRadius: 6,
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                cursor: 'pointer'
              }}
              onClick={() => setShowCreateForm(true)}
            >
              + 新增此地區的第一篇情報文章 (# 標題)
            </button>
          </div>
        ) : (
          <NewInfoArticleForm
            defaultTarget={defaultTarget}
            defaultFile={defaultFile}
            defaultIcon={defaultIcon}
            onClose={() => setShowCreateForm(false)}
            onSuccess={() => setShowCreateForm(false)}
          />
        )}
      </div>
    );
  }

  const visibleStubs = filteredStubs.slice(0, visibleCount);
  const remainingCount = filteredStubs.length - visibleStubs.length;

  return (
    <LayerControlContext.Provider value={layerControlContextValue}>
      <CountryLinkContext.Provider value={onSelectCountryName}>
      {filteredStubs.length < essayStubs.length && filteredStubs.length > 0 && (
        <div className="info-cards-filter-subtle-bar">
          <span className="subtle-hint-text">
            已套用標籤篩選
          </span>
          <button
            type="button"
            className="info-subtle-reset-btn"
            onClick={resetInfoTagPreferences}
            title="還原為顯示該地區全部情報"
          >
            顯示全部
          </button>
        </div>
      )}

      {filteredStubs.length === 0 ? (
        <div className="info-cards-empty-filter">
          <div className="info-empty-icon">🔍</div>
          <div className="info-empty-title">目前分類或標籤篩選條件下無符合情報</div>
          <div className="info-empty-desc">
            此地區情報卡已被目前的分類或排除條件過濾。
          </div>
          <button
            type="button"
            className="info-empty-reset-btn"
            onClick={resetInfoTagPreferences}
          >
            重設標籤篩選（顯示全部情報）
          </button>
        </div>
      ) : (
        visibleStubs.map((stub) => (
          <LazyMarkdownInfoCard key={stub.id} stub={stub} />
        ))
      )}

      {remainingCount > 0 && (
        <div
          ref={sentinelRef}
          onClick={() =>
            setPagination({
              key: queryKey,
              count: Math.min(filteredStubs.length, visibleCount + pageSize)
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

      {/* Dev Mode button to post a new info card article (# 標題) */}
      {isDev && (
        <div style={{ marginTop: 12 }}>
          {!showCreateForm ? (
            <button
              type="button"
              className="google-maps-step-btn"
              style={{
                width: '100%',
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                border: '1px dashed rgba(56, 189, 248, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
              onClick={() => setShowCreateForm(true)}
              title="在此地區新增一篇新的 Markdown 情報卡 (# 標題)"
            >
              + 新增情報專欄文章 (# 標題)
            </button>
          ) : (
            <NewInfoArticleForm
              defaultTarget={defaultTarget}
              defaultFile={defaultFile}
              defaultIcon={defaultIcon}
              onClose={() => setShowCreateForm(false)}
              onSuccess={() => setShowCreateForm(false)}
            />
          )}
        </div>
      )}
      </CountryLinkContext.Provider>
    </LayerControlContext.Provider>
  );
};
