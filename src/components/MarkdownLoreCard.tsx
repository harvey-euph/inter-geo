import React from 'react';
import type { LoreCard, LoreItem, LoreQuery } from '../types/lore';
import { queryLore } from '../lore/loreRegistry';

interface MarkdownLoreCardProps {
  card: LoreCard;
}

/**
 * Safely renders inline markdown (bold, italic, code, links, callouts)
 */
const renderInlineMarkdown = (text: string): React.ReactNode[] => {
  if (!text) return [];

  // Tokens: **bold**, *italic*, `code`, [text](url)
  const tokenRegex = /(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`|\[[^\]]+?\]\([^)]+?\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
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

      {/* Card Body with Bullet List */}
      <div className="intel-card-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
        <ul style={{ margin: 0, padding: 0, listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                      margin: '6px 0 2px 8px',
                      paddingLeft: 14,
                      listStyleType: 'disc',
                      borderLeft: `2px solid ${accent}40`,
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
      </div>
    </div>
  );
};

interface MarkdownLoreCardsProps {
  query: LoreQuery;
}

/**
 * Queries and renders matching Markdown Lore Cards
 */
export const MarkdownLoreCards: React.FC<MarkdownLoreCardsProps> = ({ query }) => {
  const cards = queryLore(query);
  if (!cards || cards.length === 0) return null;

  return (
    <>
      {cards.map((card) => (
        <MarkdownLoreCard key={card.id} card={card} />
      ))}
    </>
  );
};
