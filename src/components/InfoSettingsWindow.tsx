import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Check,
  Ban,
  Sparkles
} from 'lucide-react';
import { FloatingWindow } from './FloatingWindow';
import {
  INFOTIP_MODE_OPTIONS,
  getInfotipDisplayMode,
  setInfotipDisplayMode,
  subscribeInfotipDisplayMode,
  type InfotipDisplayMode
} from '../info/infotipPreferences';
import {
  INFO_CATEGORIES,
  getInfoTagPreferences,
  setInfoTagPreferences,
  resetInfoTagPreferences,
  toggleIncludeTag,
  toggleExcludeTag,
  subscribeInfoTagPreferences,
  type InfoTagPreferences
} from '../info/infoTagPreferences';
import {
  getAllDatabaseTagsWithCounts,
  onInfoIndexLoaded
} from '../info/infoRegistry';

export interface InfoSettingsWindowProps {
  isExpanded: boolean;
  onCollapse: () => void;
  zIndex?: number;
  isFront?: boolean;
  onFocusWindow?: () => void;
}

export const InfoSettingsWindow: React.FC<InfoSettingsWindowProps> = React.memo(({
  isExpanded,
  onCollapse,
  zIndex,
  isFront,
  onFocusWindow
}) => {
  // Infotip Mode state
  const [infotipMode, setInfotipMode] = useState<InfotipDisplayMode>(() => getInfotipDisplayMode());

  // Tag Preferences state
  const [tagPrefs, setTagPrefs] = useState<InfoTagPreferences>(() => getInfoTagPreferences());

  // All tags with counts across database
  const [dbTags, setDbTags] = useState<{ tag: string; count: number }[]>(() => getAllDatabaseTagsWithCounts());

  // Search in tags
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  // Subscriptions
  useEffect(() => {
    const unsubTip = subscribeInfotipDisplayMode(setInfotipMode);
    const unsubTags = subscribeInfoTagPreferences(setTagPrefs);
    const unsubIndex = onInfoIndexLoaded(() => {
      setDbTags(getAllDatabaseTagsWithCounts());
    });
    return () => {
      unsubTip();
      unsubTags();
      unsubIndex();
    };
  }, []);

  // Active filters check
  const hasActiveTagFilter =
    tagPrefs.activeCategory !== 'all' ||
    tagPrefs.includeTags.length > 0 ||
    tagPrefs.excludeTags.length > 0;

  const activeCategoryDef = INFO_CATEGORIES.find((c) => c.id === tagPrefs.activeCategory);

  // Filter dbTags by search
  const filteredTags = useMemo(() => {
    if (!tagSearchQuery.trim()) return dbTags;
    const q = tagSearchQuery.toLowerCase().trim();
    return dbTags.filter((item) => item.tag.toLowerCase().includes(q));
  }, [dbTags, tagSearchQuery]);

  return (
    <FloatingWindow
      title="資訊過濾器"
      icon={<Sparkles size={14} className="title-icon" />}
      isExpanded={isExpanded}
      onCollapse={onCollapse}
      zIndex={zIndex}
      isFront={isFront}
      onFocusWindow={onFocusWindow}
      hasActiveReset={hasActiveTagFilter}
      onReset={resetInfoTagPreferences}
      resetLabel="Reset"
      resetTitle="重設所有分類與標籤篩選"
      className="info-settings-window"
      topBarClassName="info-settings-top-bar"
    >
      {/* Scrollable Body Content */}
      <div className="info-settings-scroll-body">
        {/* Section A: Tooltip Display Mode */}
        <section className="info-settings-section">
          <div className="info-settings-section-header">
            <span className="section-title">地圖提示卡懸浮模式</span>
            <span className="section-sub">滑鼠移至地圖上時之即時預覽型態</span>
          </div>
          <div className="infotip-mode-grid">
            {INFOTIP_MODE_OPTIONS.map((opt) => {
              const isSelected = infotipMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`infotip-mode-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setInfotipDisplayMode(opt.id)}
                  title={opt.descriptionZh}
                >
                  <div className="card-top">
                    <span className="card-icon">{opt.icon}</span>
                    <span className="card-title">{opt.nameZh}</span>
                    {isSelected && <span className="card-dot" />}
                  </div>
                  <div className="card-desc">{opt.descriptionZh}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section B: Quick Categories */}
        <section className="info-settings-section">
          <div className="info-settings-section-header">
            <span className="section-title">情報主題分類</span>
            <span className="section-sub">選擇欲著重觀看的知識主題</span>
          </div>
          <div className="info-cat-grid">
            {INFO_CATEGORIES.map((cat) => {
              const isActive = tagPrefs.activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`info-cat-card-btn ${isActive ? 'is-active' : ''}`}
                  onClick={() => {
                    if (tagPrefs.activeCategory === cat.id) {
                      setInfoTagPreferences({ activeCategory: 'all' });
                    } else {
                      setInfoTagPreferences({ activeCategory: cat.id });
                    }
                  }}
                  title={cat.descriptionZh}
                >
                  <span className="cat-icon">{cat.icon}</span>
                  <span className="cat-name">{cat.nameZh}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section C: Active Chips Summary (if any filter active) */}
        {hasActiveTagFilter && (
          <section className="info-settings-section active-chips-section">
            <div className="active-chips-header">
              <span className="chips-label">已套用篩選條件：</span>
              <button
                type="button"
                className="clear-all-link"
                onClick={resetInfoTagPreferences}
              >
                清除全部條件
              </button>
            </div>
            <div className="info-active-chips-row">
              {tagPrefs.activeCategory !== 'all' && activeCategoryDef && (
                <span className="info-active-chip cat-chip">
                  <span className="chip-icon">{activeCategoryDef.icon}</span>
                  <span>{activeCategoryDef.nameZh}</span>
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => setInfoTagPreferences({ activeCategory: 'all' })}
                    title="清除此分類"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}

              {tagPrefs.includeTags.map((tag) => (
                <span key={`inc-${tag}`} className="info-active-chip include-chip">
                  <span className="chip-prefix">+ 只看</span>
                  <span className="chip-text">{tag}</span>
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => toggleIncludeTag(tag)}
                    title="移除此包含條件"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}

              {tagPrefs.excludeTags.map((tag) => (
                <span key={`exc-${tag}`} className="info-active-chip exclude-chip">
                  <span className="chip-prefix">- 排除</span>
                  <span className="chip-text">{tag}</span>
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => toggleExcludeTag(tag)}
                    title="移除此排除條件"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Section D: Advanced Tag Planning */}
        <section className="info-settings-section">
          <div className="info-settings-section-header">
            <span className="section-title">進階特徵標籤規劃</span>
            <span className="section-sub">點擊 [✓ 只看] 包含標籤；點擊 [✕ 排除] 隱藏該標籤情報</span>
          </div>

          <div className="fsw-search-wrapper" style={{ marginBottom: 8 }}>
            <Search size={13} className="fsw-search-icon" />
            <input
              type="text"
              className="fsw-search-input"
              placeholder="搜尋特徵標籤 (如: 護柱, 語言, 滑雪, 歷史, 標線)..."
              value={tagSearchQuery}
              onChange={(e) => setTagSearchQuery(e.target.value)}
            />
            {tagSearchQuery && (
              <button
                type="button"
                className="fsw-search-clear"
                onClick={() => setTagSearchQuery('')}
                title="清除搜尋"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="info-tag-pills-list">
            {filteredTags.length === 0 ? (
              <div className="info-no-tags-found">無符合搜尋字詞之標籤</div>
            ) : (
              filteredTags.slice(0, 150).map(({ tag }) => {
                const isIncluded = tagPrefs.includeTags.includes(tag.toLowerCase());
                const isExcluded = tagPrefs.excludeTags.includes(tag.toLowerCase());

                let chipStateClass = 'state-neutral';
                if (isIncluded) chipStateClass = 'state-included';
                if (isExcluded) chipStateClass = 'state-excluded';

                return (
                  <div key={tag} className={`info-interactive-tag-pill ${chipStateClass}`}>
                    <span className="tag-pill-name">{tag}</span>

                    <button
                      type="button"
                      className={`tag-btn-include ${isIncluded ? 'is-active' : ''}`}
                      onClick={() => toggleIncludeTag(tag)}
                      title={isIncluded ? `取消只看 ${tag}` : `只看含 ${tag} 的情報`}
                    >
                      <Check size={11} />
                      <span>只看</span>
                    </button>

                    <button
                      type="button"
                      className={`tag-btn-exclude ${isExcluded ? 'is-active' : ''}`}
                      onClick={() => toggleExcludeTag(tag)}
                      title={isExcluded ? `取消排除 ${tag}` : `排除隱藏含 ${tag} 的情報`}
                    >
                      <Ban size={11} />
                      <span>排除</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
          {filteredTags.length > 150 && (
            <div className="info-more-tags-hint">
              尚有更多標籤，請在上方搜尋框輸入關鍵字快速過濾
            </div>
          )}
        </section>
      </div>
    </FloatingWindow>
  );
});
