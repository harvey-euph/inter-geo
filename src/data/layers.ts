import type { CountryData, LayerCategory, LegendItem } from '../types/geo';
import { getCountryRoadMarking } from './roadMarkings';

export interface LayerDefinition {
  id: string;
  category: LayerCategory;
  nameZh: string;
  descriptionZh: string;
  iconName?: string;
  legend: LegendItem[];
  getColor: (country: CountryData) => string | null; // return null if no match or default
}

export type FilterDefinition = LayerDefinition;

export const LAYERS: LayerDefinition[] = [
  {
    id: 'coverage',
    category: 'none',
    nameZh: '🌍 街景全覽',
    descriptionZh: '顯示全球具備 Google 街景官方覆蓋之國家，點擊或滑動查看各地地理與道路文化特色',
    legend: [
      { key: 'official', labelZh: '官方街景覆蓋國家', color: '#38bdf8' },
      { key: 'none', labelZh: '無街景或未收錄', color: '#1e2430' }
    ],
    getColor: (country) => {
      if (country.coverage === 'official') return '#38bdf8';
      if (country.coverage === 'limited') return '#64748b';
      return null;
    }
  },
  {
    id: 'drivingSide',
    category: 'drivingSide',
    nameZh: '🚦 行駛方向 (左右行)',
    descriptionZh: '全球各國道路通行方向（靠左行駛與靠右行駛）制度分布',
    legend: [
      { key: 'left', labelZh: '靠左行駛 (Left-hand Drive)', color: '#f59e0b' },
      { key: 'right', labelZh: '靠右行駛 (Right-hand Drive)', color: '#3b82f6' }
    ],
    getColor: (country) => {
      if (country.drivingSide === 'left') return '#f59e0b';
      if (country.drivingSide === 'right') return '#3b82f6';
      return null;
    }
  },
  {
    id: 'plateType',
    category: 'plateType',
    nameZh: '🪪 車牌特徵 (顏色與邊條)',
    descriptionZh: '歐洲藍條、英國前白後黃、荷蘭/以色列雙黃牌、吉爾吉斯/不丹紅牌',
    legend: [
      { key: 'eu_blue', labelZh: '歐盟藍條牌 (EU Blue Strip)', color: '#38bdf8' },
      { key: 'yellow_rear', labelZh: '前白後黃 (英國/直布羅陀)', color: '#f97316' },
      { key: 'yellow_both', labelZh: '前後雙黃牌 (荷蘭/以色列/哥倫比亞計程車)', color: '#eab308' },
      { key: 'red_strip', labelZh: '紅條或紅牌 (吉爾吉斯/阿爾巴尼亞/不丹)', color: '#ef4444' },
      { key: 'green_strip', labelZh: '綠底/綠牌 (挪威商用車)', color: '#22c55e' },
      { key: 'yellow_kei', labelZh: '日本輕型車黃牌 (Kei Car)', color: '#fbbf24' }
    ],
    getColor: (country) => {
      switch (country.plateType) {
        case 'eu_blue': return '#38bdf8';
        case 'yellow_rear': return '#f97316';
        case 'yellow_both': return '#eab308';
        case 'red_strip': return '#ef4444';
        case 'green_strip': return '#22c55e';
        case 'yellow_kei': return '#fbbf24';
        default: return '#64748b';
      }
    }
  },
  {
    id: 'carMeta',
    category: 'carMeta',
    nameZh: '🚙 街景拍攝車與設備特徵',
    descriptionZh: '各國街景拍攝車輛的車頂架、涉水喉、隨行護衛車與鏡頭高度差異',
    legend: [
      { key: 'snorkel', labelZh: '肯亞：涉水喉 (Snorkel)', color: '#06b6d4' },
      { key: 'black_tape', labelZh: '迦納：車頂黑膠帶 (Black Tape)', color: '#a855f7' },
      { key: 'roof_rack', labelZh: '車頂行李橫桿 (蒙古/吉爾吉斯/瓜地馬拉/塞內加爾)', color: '#ec4899' },
      { key: 'escort_car', labelZh: '奈及利亞：警察護衛車 (Police Escort)', color: '#3b82f6' },
      { key: 'low_cam', labelZh: '低視角鏡頭 Low Cam (日本/瑞士/斯里蘭卡)', color: '#8b5cf6' },
      { key: 'back_black', labelZh: '阿根廷：車尾露出黑色保險桿', color: '#10b981' }
    ],
    getColor: (country) => {
      if (country.carMeta.includes('snorkel')) return '#06b6d4';
      if (country.carMeta.includes('black_tape')) return '#a855f7';
      if (country.carMeta.includes('escort_car')) return '#3b82f6';
      if (country.carMeta.includes('roof_rack') || country.carMeta.includes('tent')) return '#ec4899';
      if (country.carMeta.includes('low_cam')) return '#8b5cf6';
      if (country.carMeta.includes('back_black')) return '#10b981';
      return '#262f3f';
    }
  },
  {
    id: 'roadMarkings',
    category: 'roadLines',
    nameZh: '🛣️ 道路標線 (邊線與中線)',
    descriptionZh: '國家多邊形輪廓雙層著色：外圈邊界為邊線顏色，內部中心為車道中線顏色（如白邊+雙黃、全白、黃邊+白中線）',
    legend: [
      { key: 'white_outer_yellow_center', labelZh: '外圈白邊線 + 中心黃線', color: '#f59e0b' },
      { key: 'white_outer_white_center', labelZh: '外圈白邊線 + 中心白線', color: '#f1f5f9' },
      { key: 'yellow_outer_white_center', labelZh: '外圈黃邊線 + 中心白線', color: '#eab308' },
      { key: 'other', labelZh: '其他或無標線道路', color: '#334155' }
    ],
    getColor: (country) => {
      const rm = getCountryRoadMarking(country.iso2);
      return rm ? rm.centerColor : '#334155';
    }
  },
  {
    id: 'poles',
    category: 'poles',
    nameZh: '🪵 電線桿特色 (洞洞桿 / 斑馬條紋)',
    descriptionZh: '波蘭與巴西階梯洞洞桿、台灣黃黑斑馬紋、北歐北美木桿',
    legend: [
      { key: 'ladder_holes', labelZh: '長方形鏤空洞洞桿 (波蘭/巴西/羅馬尼亞)', color: '#14b8a6' },
      { key: 'striped', labelZh: '桿底黃黑斜紋防撞漆 (台灣/日本)', color: '#eab308' },
      { key: 'wooden', labelZh: '天然木頭桿 (美國/加拿大/北歐/澳洲)', color: '#d97706' },
      { key: 'standard', labelZh: '一般水泥或金屬桿', color: '#64748b' }
    ],
    getColor: (country) => {
      if (!country.poleTypes) return '#262f3f';
      if (country.poleTypes.includes('striped')) return '#eab308';
      if (country.poleTypes.includes('ladder_holes')) return '#14b8a6';
      if (country.poleTypes.includes('wooden')) return '#d97706';
      return '#64748b';
    }
  }
];

export const FILTERS = LAYERS;

/**
 * Resolves a built-in preset layer definition by ID with legacy alias support.
 */
export function getPresetLayerById(id: string): LayerDefinition | undefined {
  return LAYERS.find(
    (f) =>
      f.id === id ||
      (f.id === 'coverage' && (id === 'none' || id === 'coverage' || id === 'street-view-coverage')) ||
      (f.id === 'roadMarkings' && (id === 'roadLines' || id === 'road-markings' || id === 'roadMarkings')) ||
      (f.id === 'drivingSide' && (id === 'drivingSide' || id === 'driving-side'))
  );
}
