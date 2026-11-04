import React, { useState } from 'react';
import { Check, Edit3, FileText, Send, Sparkles, X } from 'lucide-react';
import { saveInfoArticle, type NewInfoArticlePayload } from '../info/saveInfoArticle';
import { optimisticUpsertInfoCard, reloadInfoIndex } from '../info/infoRegistry';
import { parseMarkdownInfo } from '../info/infoParser';
import type { InfoCard, InfoItem } from '../types/info';

function cardItemsToMarkdown(items?: InfoItem[]): string {
  if (!items || items.length === 0) return '';
  const lines: string[] = [];
  for (const item of items) {
    if (item.label) {
      lines.push(`- **${item.label}** ${item.content || ''}`.trim());
    } else if (item.raw) {
      lines.push(item.raw.startsWith('-') ? item.raw : `- ${item.raw}`);
    } else if (item.content) {
      lines.push(`- ${item.content}`);
    }
    if (item.subItems) {
      for (const sub of item.subItems) {
        lines.push(`  - ${sub}`);
      }
    }
  }
  return lines.join('\n');
}

const AVAILABLE_INFO_FILES = [
  'info/asia.md',
  'info/europe.md',
  'info/latin-america.md',
  'info/north-america.md',
  'info/africa.md',
  'info/oceania.md',
  'info/countries.md',
  'info/japan.md',
  'info/russia.md',
  'info/india.md',
  'info/taiwan-grid.md',
  'info/car-meta.md',
  'info/highways.md',
  'info/pedestrian-crossing.md',
  'info/eu-bollard.md',
  'info/local-admin.md',
  'info/grok-gen.md',
  'info/note.md',
  'info/test.md'
];

const ACCENT_COLORS = [
  { label: '琥珀黃', value: '#fbbf24' },
  { label: '天藍', value: '#38bdf8' },
  { label: '翠綠', value: '#10b981' },
  { label: '赤紅', value: '#ef4444' },
  { label: '紫羅蘭', value: '#a855f7' },
  { label: '活力橘', value: '#f97316' },
  { label: '靛藍', value: '#3b82f6' }
];

const COMMON_TAGS = ['Geoguessr', 'Infrastructure', 'Road', 'Language', 'Meta', 'Car', 'Bollard'];

const QUICK_ICONS = ['💡', '⚡', '🚗', '🛣️', '🏛️', '🚩', '🌲', '🔍', '📷'];

export interface NewInfoArticleFormProps {
  defaultTarget?: string;
  defaultFile?: string;
  defaultIcon?: string;
  initialCard?: InfoCard;
  onClose: () => void;
  onSuccess?: (cardId: string) => void;
}

export const NewInfoArticleForm: React.FC<NewInfoArticleFormProps> = ({
  defaultTarget = '',
  defaultFile = 'info/note.md',
  defaultIcon = '💡',
  initialCard,
  onClose,
  onSuccess
}) => {
  const isEditing = Boolean(initialCard);
  const resolvedFile = initialCard?.sourceFile
    ? (initialCard.sourceFile.startsWith('info/') ? initialCard.sourceFile : `info/${initialCard.sourceFile}`)
    : defaultFile;

  const [mode, setMode] = useState<'form' | 'raw'>('form');

  // Form fields
  const [file, setFile] = useState<string>(resolvedFile);
  const [isCustomFile, setIsCustomFile] = useState(false);
  const [title, setTitle] = useState(initialCard?.title || '');
  const [id, setId] = useState(initialCard?.id || '');
  const [targets, setTargets] = useState(initialCard ? initialCard.targets.join(', ') : defaultTarget);
  const [icon, setIcon] = useState(initialCard?.icon || defaultIcon);
  const [accent, setAccent] = useState(initialCard?.accentColor || '#38bdf8');
  const [tags, setTags] = useState(initialCard ? (initialCard.tags || []).join(', ') : 'Geoguessr');
  const [priority, setPriority] = useState<number>(initialCard?.priority ?? 20);
  const [content, setContent] = useState(() => cardItemsToMarkdown(initialCard?.items));

  // Raw Markdown field
  const [rawMarkdown, setRawMarkdown] = useState('');

  // Submission state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSwitchToRaw = () => {
    // Build initial preview markdown from current form values
    const t = title.trim() || '文章標題';
    const cid = id.trim();
    const meta: string[] = [];
    if (cid) meta.push(`- id: ${cid}`);
    if (targets.trim()) meta.push(`- targets: ${targets.trim()}`);
    if (icon.trim()) meta.push(`- icon: ${icon.trim()}`);
    if (accent.trim()) meta.push(`- accent: ${accent.trim()}`);
    if (tags.trim()) meta.push(`- tags: ${tags.trim()}`);
    if (priority !== undefined) meta.push(`- priority: ${priority}`);

    const c = content.trim();
    const bodyStr = c ? `\n\n${c}\n` : '\n\n- **【核心特徵】** 描述此地區最重要的街景識別線索...\n';
    setRawMarkdown(`# ${t}\n${meta.join('\n')}${bodyStr}`);
    setMode('raw');
  };

  const handleTagToggle = (tagToAdd: string) => {
    const list = tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (list.includes(tagToAdd)) {
      setTags(list.filter((t) => t !== tagToAdd).join(', '));
    } else {
      setTags([...list, tagToAdd].join(', '));
    }
  };

  const insertSnippet = (snippet: string) => {
    setContent((prev) => (prev ? `${prev.trim()}\n${snippet}` : snippet));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (busy) return;

    setError('');
    const targetFile = file.trim() || 'info/note.md';

    let payload: NewInfoArticlePayload;
    let cardMarkdown: string;

    if (mode === 'raw') {
      const text = rawMarkdown.trim();
      if (!text) {
        setError('請輸入 Markdown 內容');
        return;
      }
      if (!text.startsWith('#')) {
        setError('Markdown 必須以「# 文章標題」開頭');
        return;
      }
      cardMarkdown = text;
      payload = {
        file: targetFile,
        title: '',
        targets: '',
        rawMarkdown: text
      };
    } else {
      const cleanTitle = title.trim();
      if (!cleanTitle) {
        setError('請輸入文章標題');
        return;
      }
      const cleanId = id.trim() || cleanTitle.toLowerCase().replace(/[^\w\u4e00-\u9fa5-]+/g, '-').replace(/^-+|-+$/g, '') || `card-${Date.now().toString(36)}`;
      const cleanTargets = targets.trim() || '*';
      const cleanIcon = icon.trim() || '💡';
      const cleanAccent = accent.trim() || '#38bdf8';
      const cleanTags = tags.trim() || 'Geoguessr';
      const cleanPriority = isNaN(priority) ? 20 : priority;

      const metaLines: string[] = [];
      metaLines.push(`- id: ${cleanId}`);
      metaLines.push(`- targets: ${cleanTargets}`);
      metaLines.push(`- icon: ${cleanIcon}`);
      metaLines.push(`- accent: ${cleanAccent}`);
      metaLines.push(`- tags: ${cleanTags}`);
      metaLines.push(`- priority: ${cleanPriority}`);

      let bodyContent = content.trim();
      if (bodyContent) {
        bodyContent = bodyContent.split(/\r?\n/).map((l) => {
          const tl = l.trim();
          if (!tl) return '';
          if (/^[-*]\s+/.test(tl) || tl.startsWith('#') || tl.startsWith('<!--')) return l;
          return `- ${tl}`;
        }).filter(Boolean).join('\n');
      }

      cardMarkdown = `# ${cleanTitle}\n${metaLines.join('\n')}\n\n${bodyContent}\n`;

      payload = {
        file: targetFile,
        title: cleanTitle,
        id: cleanId,
        targets: cleanTargets,
        icon: cleanIcon,
        accent: cleanAccent,
        tags: cleanTags,
        priority: cleanPriority,
        content: content.trim()
      };
    }

    // 🚀 Optimistic update: parse card and display immediately (0ms delay)
    const optimisticCards = parseMarkdownInfo(cardMarkdown, targetFile);
    let rollback: (() => void) | null = null;

    if (optimisticCards.length > 0) {
      const optCard = optimisticCards[0];
      const cardId = optCard.id;
      rollback = optimisticUpsertInfoCard(optCard);
      if (onSuccess) {
        onSuccess(cardId);
      }
      onClose();
    } else {
      setBusy(true);
    }

    // Background persistence: write to disk & rebuild backend index
    void saveInfoArticle(payload)
      .then(async () => {
        await reloadInfoIndex();
      })
      .catch((err: unknown) => {
        if (rollback) {
          rollback();
          alert(`發布文章失敗：${err instanceof Error ? err.message : '寫入或索引更新失敗'}`);
        } else {
          setError(err instanceof Error ? err.message : '發布失敗');
          setBusy(false);
        }
      });
  };

  return (
    <div
      className="intel-card info-card"
      style={{
        marginTop: 12,
        marginBottom: 16,
        padding: 14,
        borderColor: `${accent}99`,
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        boxShadow: `0 8px 24px rgba(0, 0, 0, 0.45), 0 0 14px ${accent}25`,
        borderRadius: 10
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color={accent} />
          <span style={{ color: accent, fontWeight: 700, fontSize: 14 }}>
            {isEditing ? `修改情報專欄文章` : '新增情報專欄文章 (# 標題)'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Mode Switcher */}
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 6,
              padding: 2
            }}
          >
            <button
              type="button"
              onClick={() => setMode('form')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 4,
                border: 0,
                cursor: 'pointer',
                backgroundColor: mode === 'form' ? accent : 'transparent',
                color: mode === 'form' ? '#0f172a' : '#94a3b8'
              }}
            >
              <Edit3 size={11} /> 表單
            </button>
            <button
              type="button"
              onClick={handleSwitchToRaw}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 4,
                border: 0,
                cursor: 'pointer',
                backgroundColor: mode === 'raw' ? accent : 'transparent',
                color: mode === 'raw' ? '#0f172a' : '#94a3b8'
              }}
            >
              <FileText size={11} /> Markdown
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="關閉表單"
            style={{
              background: 'transparent',
              border: 0,
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 2,
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Target File Selector */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>
          目標 Markdown 檔案 (inter-geo-data/info/*.md)
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {!isCustomFile ? (
            <select
              value={file}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setIsCustomFile(true);
                  setFile('info/');
                } else {
                  setFile(e.target.value);
                }
              }}
              style={{
                flex: 1,
                backgroundColor: 'rgba(2, 6, 23, 0.8)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: 6,
                padding: '6px 8px',
                fontSize: 12
              }}
            >
              {AVAILABLE_INFO_FILES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
              <option value="__custom__">+ 自訂其他檔案名稱…</option>
            </select>
          ) : (
            <div style={{ display: 'flex', flex: 1, gap: 4 }}>
              <input
                type="text"
                value={file}
                onChange={(e) => setFile(e.target.value)}
                placeholder="info/my-notes.md"
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: 6,
                  padding: '6px 8px',
                  fontSize: 12
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setIsCustomFile(false);
                  setFile(defaultFile);
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: 11,
                  borderRadius: 6,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                選單
              </button>
            </div>
          )}
        </div>
      </div>

      {mode === 'form' ? (
        <form onSubmit={handleSubmit}>
          {/* Article Title */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>
              文章標題 (# 標題) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="例如：台灣電線桿電力圖號座標網格"
              autoFocus
              style={{
                width: '100%',
                backgroundColor: 'rgba(2, 6, 23, 0.8)',
                color: '#f8fafc',
                fontWeight: 600,
                border: `1px solid ${accent}66`,
                borderRadius: 6,
                padding: '7px 10px',
                fontSize: 13,
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Targets & ID row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>
                目標代碼 (targets，逗號分隔)
              </label>
              <input
                type="text"
                value={targets}
                onChange={(e) => setTargets(e.target.value)}
                placeholder="TW, TW-TP, *"
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: 6,
                  padding: '6px 8px',
                  fontSize: 12,
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>
                卡片 ID (id，選填)
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="留空則依標題自動產生"
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: 6,
                  padding: '6px 8px',
                  fontSize: 12,
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Icon, Accent Color & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 65px', gap: 8, marginBottom: 10 }}>
            {/* Icon */}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>
                圖標
              </label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: 6,
                  padding: '6px 8px',
                  fontSize: 15,
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Accent Color */}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>
                主題色
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  style={{
                    width: 28,
                    height: 28,
                    padding: 0,
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 4,
                    cursor: 'pointer',
                    backgroundColor: 'transparent'
                  }}
                />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setAccent(c.value)}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        backgroundColor: c.value,
                        border: accent === c.value ? '2px solid #fff' : '1px solid rgba(0,0,0,0.4)',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>
                優先級
              </label>
              <input
                type="number"
                min={0}
                max={139}
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10))}
                title="優先級 0~139，越小越優先置頂"
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: 6,
                  padding: '6px 6px',
                  fontSize: 12,
                  textAlign: 'center',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Quick Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>常用圖標：</span>
            {QUICK_ICONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 4,
                  padding: '1px 5px',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600 }}>
              分類標籤 (tags，逗號分隔)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Geoguessr, Infrastructure, Road..."
              style={{
                width: '100%',
                backgroundColor: 'rgba(2, 6, 23, 0.8)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: 6,
                padding: '6px 8px',
                fontSize: 12,
                boxSizing: 'border-box',
                marginBottom: 4
              }}
            />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {COMMON_TAGS.map((t) => {
                const active = tags.split(',').map((x) => x.trim()).includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTagToggle(t)}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 4,
                      border: `1px solid ${active ? accent : 'rgba(255,255,255,0.15)'}`,
                      backgroundColor: active ? `${accent}22` : 'rgba(255,255,255,0.04)',
                      color: active ? accent : '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    {active ? `✓ ${t}` : `+ ${t}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Body */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                文章內文 (各列條目 Markdown，支援街景與膠囊)
              </label>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => insertSnippet('- **【核心重點】** ')}
                  style={{
                    padding: '1px 5px',
                    fontSize: 10,
                    borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.15)',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    color: '#cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  + 【膠囊】
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('- ![sv|lock|h=90|p=0](25.0338,121.5645)')}
                  style={{
                    padding: '1px 5px',
                    fontSize: 10,
                    borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.15)',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    color: '#cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  + 街景語法
                </button>
              </div>
            </div>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`- **【核心特徵】** 描述此地區最重要的街景識別線索...\n- **【補充說明】** 更多觀察細節...\n- ![sv|lock|h=90|p=0](25.0338,121.5645)`}
              style={{
                width: '100%',
                backgroundColor: 'rgba(2, 6, 23, 0.85)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: 12,
                lineHeight: 1.5,
                fontFamily: 'monospace',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{ color: '#fca5a5', fontSize: 11, marginBottom: 10, lineHeight: 1.4 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.18)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={busy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 16px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: 0,
                backgroundColor: accent,
                color: '#0f172a',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.7 : 1,
                boxShadow: `0 2px 8px ${accent}40`
              }}
            >
              {busy ? (
                <>正在寫入並更新索引…</>
              ) : (
                <>
                  <Send size={12} /> {isEditing ? '儲存修改' : '發布專欄文章'}
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Raw Markdown Editor */
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                完整 Markdown 專欄結構 (必須以 # 標題開頭)
              </label>
              <span style={{ fontSize: 10, color: '#64748b' }}>支援多行條目與嵌入標記</span>
            </div>
            <textarea
              rows={12}
              value={rawMarkdown}
              onChange={(e) => {
                setRawMarkdown(e.target.value);
                if (error) setError('');
              }}
              placeholder={`# 文章標題\n- id: my-card-id\n- targets: TW\n- icon: 💡\n- accent: #38bdf8\n- tags: Geoguessr\n- priority: 20\n\n- **【重點】** 內文說明...\n- ![sv|lock|h=90|p=0](25.0338,121.5645)`}
              autoFocus
              style={{
                width: '100%',
                backgroundColor: 'rgba(2, 6, 23, 0.85)',
                color: '#e2e8f0',
                border: `1px solid ${accent}66`,
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: 12,
                lineHeight: 1.5,
                fontFamily: 'monospace',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{ color: '#fca5a5', fontSize: 11, marginBottom: 10, lineHeight: 1.4 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.18)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={busy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 16px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: 0,
                backgroundColor: accent,
                color: '#0f172a',
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.7 : 1,
                boxShadow: `0 2px 8px ${accent}40`
              }}
            >
              {busy ? (
                <>正在寫入並更新索引…</>
              ) : (
                <>
                  <Check size={13} /> {isEditing ? '儲存 Markdown 修改' : '發布 Markdown 文章'}
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
