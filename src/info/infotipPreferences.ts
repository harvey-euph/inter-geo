export type InfotipDisplayMode =
  | 'first-item'   // 預設: 優先顯示第一張線索卡重點 (First clue preview)
  | 'tags-badges'  // 特徵膠囊: 顯示所有相關標籤與屬性 (Tags & clue badges)
  | 'card-titles'  // 線索清單: 顯示所有相關線索卡標題 (List of clue card titles)
  | 'minimal';     // 極簡模式: 僅顯示地名與代碼 (Name & code only)

export interface InfotipModeOption {
  id: InfotipDisplayMode;
  nameZh: string;
  nameEn: string;
  icon: string;
  descriptionZh: string;
}

export const INFOTIP_MODE_OPTIONS: InfotipModeOption[] = [
  {
    id: 'first-item',
    nameZh: '線索重點',
    nameEn: 'First Clue',
    icon: '💡',
    descriptionZh: '優先顯示最高優先級卡片的第一段摘要或線索'
  },
  {
    id: 'tags-badges',
    nameZh: '特徵膠囊',
    nameEn: 'Tags & Badges',
    icon: '🏷️',
    descriptionZh: '以標籤膠囊方式呈現行駛方向、街景等級與特徵'
  },
  {
    id: 'card-titles',
    nameZh: '線索清單',
    nameEn: 'Card Titles',
    icon: '📋',
    descriptionZh: '列出所有相關主題卡片標題，掌握該地區的所有知識點'
  },
  {
    id: 'minimal',
    nameZh: '極簡名稱',
    nameEn: 'Minimal',
    icon: '⚡',
    descriptionZh: '僅保留地名、國旗與代碼，保持畫面最乾淨'
  }
];

const STORAGE_KEY = 'intergeo_infotip_display_mode';

let currentMode: InfotipDisplayMode = (() => {
  if (typeof window === 'undefined') return 'first-item';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ['first-item', 'tags-badges', 'card-titles', 'minimal'].includes(saved)) {
      return saved as InfotipDisplayMode;
    }
  } catch {
    // fallback
  }
  return 'first-item';
})();

const listeners = new Set<(mode: InfotipDisplayMode) => void>();

export function getInfotipDisplayMode(): InfotipDisplayMode {
  return currentMode;
}

export function setInfotipDisplayMode(mode: InfotipDisplayMode): void {
  currentMode = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener(mode));
}

export function subscribeInfotipDisplayMode(listener: (mode: InfotipDisplayMode) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
