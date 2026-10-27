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
    id: 'basics',
    nameZh: '基礎必備',
    nameEn: 'Basics',
    icon: '⭐',
    descriptionZh: '各國最核心速查情報、基礎國情、通行方向、車牌特徵與經典秒殺線索',
    matchTags: ['basics', '基礎', '基礎必備', '基礎線索', '核心識別', '國情總覽']
  },
  {
    id: 'ski',
    nameZh: '滑雪與豪雪',
    nameEn: 'Ski & Snow',
    icon: '⛷️',
    descriptionZh: '雪山、滑雪場、豪雪地帶、防暴風雪標記 (矢羽)、防雪屋頂、除雪設備與冬季地景',
    matchTags: ['ski', '滑雪', '滑雪場', '豪雪', '豪雪地帶', '冬季', '雪山', '積雪', 'snow', 'winter', '滑雪與雪景']
  },
  {
    id: 'culture',
    nameZh: '文化歷史',
    nameEn: 'Culture & History',
    icon: '🏛️',
    descriptionZh: '飲食文化、歷史背景、宗教建築、移民史與在地生活習俗',
    matchTags: ['culture', '文化', '歷史', '飲食', '歷史淵源', '民俗', '美食歷史', '文化歷史', '寺社佛閣']
  },
  {
    id: 'infrastructure',
    nameZh: '道路與設施',
    nameEn: 'Infrastructure',
    icon: '🛣️',
    descriptionZh: '交通標誌、行人告示、電線桿、防撞桿、護柱 (Bollard) 與公路網格',
    matchTags: [
      'infrastructure',
      '設施',
      '道路',
      '交通標誌',
      '電線桿',
      '護柱',
      'bollards',
      '公路系統',
      '標線',
      '道路設施',
      '斑馬線',
      '行人告示'
    ]
  },
  {
    id: 'car-meta',
    nameZh: '街景車特徵',
    nameEn: 'Car Meta',
    icon: '🚙',
    descriptionZh: '涉水喉 (Snorkel)、車頂架、黑膠帶、護衛警車、低鏡頭 (Low Cam) 等特殊車載配備',
    matchTags: ['car-meta', '街景車', '設備特徵', '車頂架', '涉水喉', '黑膠帶', '護衛車', 'low_cam', 'meta']
  },
  {
    id: 'language',
    nameZh: '語言與文字',
    nameEn: 'Language & Scripts',
    icon: '🔤',
    descriptionZh: '特定字母、文字字系 (西里爾/阿拉伯/印度系等)、路牌特色詞彙 (Street Words)',
    matchTags: ['language', '語言', '文字', '字系', '特徵字母', '街道名詞', '印度文字', '語言文字']
  },
  {
    id: 'nature',
    nameZh: '自然與地形',
    nameEn: 'Nature & Landscape',
    icon: '🌲',
    descriptionZh: '山脈地理、土壤植被、乾燥荒漠、赤道仰角與自然景觀風貌',
    matchTags: ['nature', '地形', '自然', '地理', '氣候', '山脈', '植被', '荒漠', '自然地景']
  },
  {
    id: 'admin',
    nameZh: '行政與代碼',
    nameEn: 'Admin & Codes',
    icon: '🗺️',
    descriptionZh: '行政區劃、都道府縣、邦省縮寫、郵遞區號、市外局番與官方代碼',
    matchTags: ['admin', '地方行政', '行政區', '市外局番', '地方車牌', '首府', '日本都道府縣']
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
        activeCategory: typeof parsed.activeCategory === 'string' ? parsed.activeCategory : 'all',
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
