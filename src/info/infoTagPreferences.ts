/**
 * Info Tag & Category Preferences Management
 * Allows users to filter Info cards by category or custom include/exclude tags.
 */

export interface InfoCategoryDef {
  id: string;
  nameZh: string;
  nameEn: string;
  icon: string;
  descriptionZh: string;
  matchTags: string[];
}

export const INFO_CATEGORIES: InfoCategoryDef[] = [
  {
    id: 'all',
    nameZh: '全部',
    nameEn: 'All',
    icon: '🌍',
    descriptionZh: '顯示所有情報卡，不進行任何分類過濾',
    matchTags: []
  },
  {
    id: 'geoguessr',
    nameZh: 'Geoguessr',
    nameEn: 'Geoguessr',
    icon: '🎯',
    descriptionZh: '街景拍攝車特徵、號誌護柱與各國獨特外觀識別等趣味地理小知識',
    matchTags: ['Geoguessr', 'geoguessr', 'car-meta', 'basics']
  },
  {
    id: 'language',
    nameZh: '語言文字',
    nameEn: 'Language',
    icon: '🔤',
    descriptionZh: '各國官方語言、特殊文字字母、字系與特色街名詞彙',
    matchTags: ['Language', 'language']
  },
  {
    id: 'infrastructure',
    nameZh: '基礎建設',
    nameEn: 'Infrastructure',
    icon: '🛣️',
    descriptionZh: '公路網格、編號系統、交通標誌、護柱與基礎設施工程',
    matchTags: ['Infrastructure', 'infrastructure']
  },
  {
    id: 'ski',
    nameZh: '滑雪休閒',
    nameEn: 'Ski-resort',
    icon: '⛷️',
    descriptionZh: '滑雪勝地、雪場分布、豪雪地帶與冬季雪景地貌',
    matchTags: ['Ski-resort', 'ski-resort', 'ski', 'Ski']
  },
  {
    id: 'travel',
    nameZh: '旅行景點',
    nameEn: 'Travel',
    icon: '✈️',
    descriptionZh: '風景名勝、知名景點、探索靈感與地標速查',
    matchTags: ['Travel', 'travel']
  },
  {
    id: 'culture',
    nameZh: '文化歷史',
    nameEn: 'Culture',
    icon: '🏛️',
    descriptionZh: '飲食習俗、民俗文化、移民歷史與人文背景小知識',
    matchTags: ['Culture', 'culture']
  },
  {
    id: 'nature',
    nameZh: '自然地景',
    nameEn: 'Nature',
    icon: '🌲',
    descriptionZh: '地形山脈、氣候特徵、乾燥荒漠與自然景觀風貌',
    matchTags: ['Nature', 'nature']
  },
  {
    id: 'admin',
    nameZh: '行政體系',
    nameEn: 'Admin',
    icon: '🗺️',
    descriptionZh: '行政劃分體系、郵遞區號、電話區碼與編碼規則',
    matchTags: ['Admin', 'admin']
  }
];

export interface InfoTagPreferences {
  /** Active quick category key, e.g. 'all' | 'basics' | 'ski' | 'culture' | 'infrastructure' | 'car-meta' | 'language' | 'nature' | 'admin' */
  activeCategory: string;
  /** Custom included tags. If non-empty, cards must have at least one of these tags (OR logic). */
  includeTags: string[];
  /** Custom excluded tags. If card matches any of these, it is completely hidden (NOT logic). */
  excludeTags: string[];
}

const STORAGE_KEY = 'intergeo_info_tag_filter_v1';

const DEFAULT_PREFERENCES: InfoTagPreferences = {
  activeCategory: 'all',
  includeTags: [],
  excludeTags: []
};

let currentPreferences: InfoTagPreferences = (() => {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        activeCategory:
          typeof parsed.activeCategory === 'string' &&
          INFO_CATEGORIES.some((c) => c.id === parsed.activeCategory)
            ? parsed.activeCategory
            : parsed.activeCategory === 'basics' || parsed.activeCategory === 'car-meta'
              ? 'geoguessr'
              : 'all',
        includeTags: Array.isArray(parsed.includeTags) ? parsed.includeTags : [],
        excludeTags: Array.isArray(parsed.excludeTags) ? parsed.excludeTags : []
      };
    }
  } catch {
    // fallback
  }
  return DEFAULT_PREFERENCES;
})();

const listeners = new Set<(prefs: InfoTagPreferences) => void>();

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener(currentPreferences);
    } catch {
      // ignore listener error
    }
  }
}

function persistPreferences() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPreferences));
  } catch {
    // ignore quota error
  }
}

export function getInfoTagPreferences(): InfoTagPreferences {
  return currentPreferences;
}

export function setInfoTagPreferences(next: Partial<InfoTagPreferences>): void {
  currentPreferences = {
    ...currentPreferences,
    ...next
  };
  persistPreferences();
  notifyListeners();
}

export function subscribeInfoTagPreferences(listener: (prefs: InfoTagPreferences) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetInfoTagPreferences(): void {
  setInfoTagPreferences(DEFAULT_PREFERENCES);
}

export function setActiveCategory(categoryId: string): void {
  setInfoTagPreferences({
    activeCategory: categoryId
  });
}

export function toggleIncludeTag(tag: string): void {
  const norm = tag.trim().toLowerCase();
  const current = new Set(currentPreferences.includeTags.map((t) => t.toLowerCase()));
  if (current.has(norm)) {
    current.delete(norm);
  } else {
    current.add(norm);
  }
  setInfoTagPreferences({
    includeTags: [...current]
  });
}

export function toggleExcludeTag(tag: string): void {
  const norm = tag.trim().toLowerCase();
  const current = new Set(currentPreferences.excludeTags.map((t) => t.toLowerCase()));
  if (current.has(norm)) {
    current.delete(norm);
  } else {
    current.add(norm);
    // If it was in includeTags, remove from include
    const includes = currentPreferences.includeTags.filter((t) => t.toLowerCase() !== norm);
    setInfoTagPreferences({
      includeTags: includes,
      excludeTags: [...current]
    });
    return;
  }
  setInfoTagPreferences({
    excludeTags: [...current]
  });
}

export function moveTagToInclude(tag: string): void {
  const norm = tag.trim().toLowerCase();
  const currentIncludes = new Set(currentPreferences.includeTags.map((t) => t.toLowerCase()));
  const currentExcludes = new Set(currentPreferences.excludeTags.map((t) => t.toLowerCase()));

  currentIncludes.add(norm);
  currentExcludes.delete(norm);

  setInfoTagPreferences({
    includeTags: [...currentIncludes],
    excludeTags: [...currentExcludes]
  });
}

export function moveTagToExclude(tag: string): void {
  const norm = tag.trim().toLowerCase();
  const currentIncludes = new Set(currentPreferences.includeTags.map((t) => t.toLowerCase()));
  const currentExcludes = new Set(currentPreferences.excludeTags.map((t) => t.toLowerCase()));

  currentExcludes.add(norm);
  currentIncludes.delete(norm);

  setInfoTagPreferences({
    includeTags: [...currentIncludes],
    excludeTags: [...currentExcludes]
  });
}

export function moveTagToDefault(tag: string): void {
  const norm = tag.trim().toLowerCase();
  const currentIncludes = currentPreferences.includeTags.filter((t) => t.toLowerCase() !== norm);
  const currentExcludes = currentPreferences.excludeTags.filter((t) => t.toLowerCase() !== norm);

  setInfoTagPreferences({
    includeTags: currentIncludes,
    excludeTags: currentExcludes
  });
}

/**
 * Checks whether an info card's tags satisfy the active filtering preferences.
 */
export function matchesCardTagFilter(
  cardTags: string[] | undefined,
  prefs: InfoTagPreferences = currentPreferences
): boolean {
  const tags = (cardTags || []).map((t) => t.trim().toLowerCase());
  const tagSet = new Set(tags);

  // 1. Exclude filter: If card has ANY tag in excludeTags, reject immediately
  if (prefs.excludeTags && prefs.excludeTags.length > 0) {
    for (const ex of prefs.excludeTags) {
      const exLower = ex.toLowerCase();
      // Check if ex matches a category
      const cat = INFO_CATEGORIES.find((c) => c.id === exLower);
      if (cat && cat.matchTags.length > 0) {
        if (cat.matchTags.some((mt) => tagSet.has(mt.toLowerCase()))) {
          return false;
        }
      }
      if (tagSet.has(exLower)) {
        return false;
      }
    }
  }

  // 2. Active Quick Category Filter (if not 'all')
  if (prefs.activeCategory && prefs.activeCategory !== 'all') {
    const cat = INFO_CATEGORIES.find((c) => c.id === prefs.activeCategory);
    if (cat && cat.matchTags.length > 0) {
      const hasMatch = cat.matchTags.some((mt) => tagSet.has(mt.toLowerCase()));
      if (!hasMatch) return false;
    }
  }

  // 3. Custom Include filter: If includeTags specified, card must have at least one match
  if (prefs.includeTags && prefs.includeTags.length > 0) {
    const hasAnyInclude = prefs.includeTags.some((inc) => {
      const incLower = inc.toLowerCase();
      const cat = INFO_CATEGORIES.find((c) => c.id === incLower);
      if (cat && cat.matchTags.length > 0) {
        return cat.matchTags.some((mt) => tagSet.has(mt.toLowerCase()));
      }
      return tagSet.has(incLower);
    });
    if (!hasAnyInclude) return false;
  }

  return true;
}
