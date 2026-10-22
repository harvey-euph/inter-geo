#!/usr/bin/env node

/**
 * FlatGeobuf (FGB) Shell Data Content & Semantics Inspector
 * 
 * Inspect vector data contents, schema semantics, field meanings, 
 * value distributions, and geometric records directly in the terminal!
 * 
 * Usage:
 *   node scripts/fgb-visualizer.mjs <file.fgb> [options]
 * 
 * Examples:
 *   node scripts/fgb-visualizer.mjs public/data/l2/TW.fgb
 *   node scripts/fgb-visualizer.mjs public/data/l2/US.fgb
 *   node scripts/fgb-visualizer.mjs public/data/roads/US.fgb
 *   node scripts/fgb-visualizer.mjs public/data/l3/US/US-CA.fgb
 *   node scripts/fgb-visualizer.mjs public/data/l2/US.fgb --distinct type_en
 *   node scripts/fgb-visualizer.mjs public/data/l2/US.fgb --filter postal=CA
 *   node scripts/fgb-visualizer.mjs public/data/l2/US.fgb -f "Colorado"
 *   node scripts/fgb-visualizer.mjs public/data/l2/TW.fgb --map
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as flatgeobuf from 'flatgeobuf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ANSI Color Palette
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[93m',
  magenta: '\x1b[35m',
  brightMagenta: '\x1b[95m',
  blue: '\x1b[34m',
  brightBlue: '\x1b[94m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  white: '\x1b[37m'
};

/**
 * Knowledge Base: Schema Dictionary & Real-World Semantics
 */
const FIELD_DICTIONARY = {
  id: {
    labelZh: '唯一識別碼 (Feature ID)',
    type: 'number | string',
    meaning: '特徵物件的唯一數值或字串序號。在 FGB 內部用於 0-based 快速索引定位。',
    purpose: '畫布 Hover 碰撞檢測、點擊高亮比對、O(1) 陣列映射。'
  },
  iso2: {
    labelZh: '國家二碼 (Country Code)',
    type: 'string (2 chars)',
    meaning: 'ISO 3166-1 alpha-2 國際標準國家代碼 (如 TW=台灣, US=美國, JP=日本)。',
    purpose: '跨層級映射：在 L1 視角下將 L2 一級行政區自動聚合成所屬母國；對應國旗圖示與國家資訊卡。'
  },
  name: {
    labelZh: '當地/慣用名稱 (Local Name)',
    type: 'string',
    meaning: '該行政區在當地的原生地名或常用名稱 (如 California, Kyoto, 桃園市)。',
    purpose: '資訊卡主標題、搜尋欄主要關鍵字匹配。'
  },
  name_en: {
    labelZh: '國際英文名稱 (English Name)',
    type: 'string',
    meaning: 'ISO / 聯合國標準化羅馬拼音或英文官方名稱 (如 New Taipei City, Kyoto)。',
    purpose: '全球跨語系通用檢索、英文模式顯示、Street View 英文路牌比對。'
  },
  name_zh: {
    labelZh: '在地化中文地名 (Chinese Name)',
    type: 'string',
    meaning: '繁體中文翻譯地名 (如 加利福尼亞州、東京都、桃園市)。台灣縣市已自動校正為正體字。',
    purpose: '中文使用者介面核心呈現、GeoGuessr 繁中地理知識卡片。'
  },
  type_en: {
    labelZh: '一級體制型態 (Division Type)',
    type: 'string',
    meaning: '該國行政劃分的憲法/法律型態 (如 State, Province, Prefecture, Special Municipality, Overseas Department)。',
    purpose: '重要地理線索！區分聯邦州 (State) vs 直轄市 vs 海外屬地 (如法屬圭亞那、波多黎各)。'
  },
  code: {
    labelZh: 'ISO 3166-2 代碼 (Subdivision Code)',
    type: 'string',
    meaning: 'ISO 3166-2 國際標準行政區代碼 (格式通常為 {國家碼}-{區碼}，如 US-CA, TW-TPE, JP-13)。',
    purpose: '權威官方資料庫關聯鍵、外部 GIS 圖資串接、資料去重與唯一性驗證。'
  },
  postal: {
    labelZh: '郵政/車牌簡碼 (Postal/Plate Abbr)',
    type: 'string (2-3 chars)',
    meaning: '該國普遍通用的官方郵政縮寫或車牌代碼 (如美國 CA, TX, NY; 日本都道府縣番號)。',
    purpose: '⭐ GeoGuessr 核心破案線索！美國信箱地址、電線桿金屬牌、公路里程碑與商家招牌隨處可見此簡碼。'
  },
  class: {
    labelZh: '公路等級 (Highway Tier)',
    type: 'string',
    meaning: '公路路網分類：Interstate (州際公路) vs Federal (聯邦國道 / US Routes)。',
    purpose: '決定地圖著色樣式 (紅色盾牌 vs 白色盾牌)、決定南北向/東西向編號規則的解讀邏輯。'
  },
  number: {
    labelZh: '公路路線號碼 (Route Number)',
    type: 'string / number',
    meaning: '官方公路路線編號 (如 10, 80, 95, 66)。',
    purpose: '⭐ 導航與位置推算關鍵：偶數代表東西走向 (號碼由南向北遞增)；奇數代表南北走向 (號碼由西向東遞增)。'
  },
  prefix: {
    labelZh: '路網前綴 (Route Prefix)',
    type: 'string',
    meaning: '公路前綴代號：I (Interstate 州際) 或 US (US Federal Route 聯邦國道)。',
    purpose: '繪製對應樣式的道路標誌 (Road Shield) 盾形圖標。'
  },
  scalerank: {
    labelZh: '繪製優先級 (Carto Rank)',
    type: 'number (1-10)',
    meaning: '地圖學比例尺可見度權重 (1=主要幹道、8=次要支線)。',
    purpose: '動態 LOD 瓦片過濾：遠景僅繪製 scalerank <= 3 的主幹動脈，近景才開放次要支線。'
  },
  type: {
    labelZh: '路面等級規格 (Pavement Class)',
    type: 'string',
    meaning: '道路物理規格與收費型態：Freeway (高速公路), Primary, Secondary, Other Paved, Tollway (收費道路)。',
    purpose: '決定道路圖層線條粗細、描邊透明度與收費路段標籤。'
  },
  parent_name: {
    labelZh: '所屬母州/省名稱 (Parent Division)',
    type: 'string',
    meaning: '該二級行政區 (L3 County/City) 所隸屬的上一級省/州名稱 (如 California)。',
    purpose: 'L3 下鑽瀏覽導航、向上一級聚合關聯。'
  },
  parent_code: {
    labelZh: '所屬母區代碼 (Parent Code)',
    type: 'string',
    meaning: '上一級行政區的 ISO 3166-2 代碼 (如 US-CA)。',
    purpose: '跨層級外鍵 (Foreign Key) 關聯匹配。'
  },
  city: {
    labelZh: '市町村/城市名 (Municipality City)',
    type: 'string',
    meaning: '二級或三級地方自治體名稱 (如 札幌市、中央区)。',
    purpose: '細部行政區劃標記。'
  },
  pref: {
    labelZh: '都道府縣名稱 (Japanese Prefecture)',
    type: 'string',
    meaning: '日本二級劃分對應之都道府縣 (如 北海道、東京都)。',
    purpose: '日本 JIS 區域樹狀結構構建。'
  }
};

/**
 * High-Resolution Braille Canvas for Terminal
 */
class ColoredBrailleCanvas {
  constructor(pixelWidth, pixelHeight) {
    this.pixelW = Math.max(4, Math.round(pixelWidth));
    this.pixelH = Math.max(4, Math.round(pixelHeight));
    this.charW = Math.ceil(this.pixelW / 2);
    this.charH = Math.ceil(this.pixelH / 4);
    this.grid = new Uint8Array(this.charW * this.charH);
    this.colorGrid = new Array(this.charW * this.charH).fill('');
  }

  setPixel(x, y, color = '') {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.pixelW || y < 0 || y >= this.pixelH) return;
    const cx = Math.floor(x / 2);
    const cy = Math.floor(y / 4);
    const px = x % 2;
    const py = y % 4;

    const map = [
      [0x01, 0x08],
      [0x02, 0x10],
      [0x04, 0x20],
      [0x40, 0x80]
    ];

    const idx = cy * this.charW + cx;
    this.grid[idx] |= map[py][px];
    if (color) this.colorGrid[idx] = color;
  }

  drawLine(x0, y0, x1, y1, color = '') {
    x0 = Math.round(x0); y0 = Math.round(y0);
    x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.setPixel(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  renderWithFrame(title = '', bbox = null) {
    const lines = [];
    const innerW = this.charW;
    const topLabel = title ? ` ${title} ` : '';
    const topBarLen = Math.max(0, innerW - topLabel.length - 2);
    const topBarLeft = Math.floor(topBarLen / 2);
    const topBarRight = topBarLen - topBarLeft;

    let topBorder = `${C.gray}┌${'─'.repeat(topBarLeft)}${C.bold}${C.white}${topLabel}${C.reset}${C.gray}${'─'.repeat(topBarRight)}┐${C.reset}`;
    lines.push(topBorder);

    for (let cy = 0; cy < this.charH; cy++) {
      let rowStr = '';
      for (let cx = 0; cx < this.charW; cx++) {
        const idx = cy * this.charW + cx;
        const mask = this.grid[idx];
        if (mask === 0) {
          rowStr += ' ';
        } else {
          const col = this.colorGrid[idx] || C.cyan;
          rowStr += `${col}${String.fromCharCode(0x2800 + mask)}${C.reset}`;
        }
      }

      let rightAnnot = '';
      if (bbox) {
        if (cy === 0) {
          rightAnnot = ` ${C.gray}${bbox.maxY.toFixed(2)}°N${C.reset}`;
        } else if (cy === Math.floor(this.charH / 2)) {
          rightAnnot = ` ${C.dim}▲ N${C.reset}`;
        } else if (cy === this.charH - 1) {
          rightAnnot = ` ${C.gray}${bbox.minY.toFixed(2)}°S${C.reset}`;
        }
      }

      lines.push(`${C.gray}│${C.reset}${rowStr}${C.gray}│${C.reset}${rightAnnot}`);
    }

    let bottomBorder = `${C.gray}└${'─'.repeat(innerW)}┘${C.reset}`;
    if (bbox) {
      const minXStr = `${bbox.minX.toFixed(2)}°`;
      const maxXStr = `${bbox.maxX.toFixed(2)}°`;
      const padLen = Math.max(0, innerW - minXStr.length - maxXStr.length);
      bottomBorder += `\n ${C.gray}${minXStr}${' '.repeat(padLen)}${maxXStr}${C.reset}`;
    }
    lines.push(bottomBorder);

    return lines.join('\n');
  }
}

function scanGeometryStats(feature) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let vertexCount = 0;
  let partCount = 0;

  function scan(coords) {
    if (typeof coords[0] === 'number') {
      vertexCount++;
      minX = Math.min(minX, coords[0]);
      maxX = Math.max(maxX, coords[0]);
      minY = Math.min(minY, coords[1]);
      maxY = Math.max(maxY, coords[1]);
    } else {
      coords.forEach(scan);
    }
  }

  const geom = feature.geometry;
  if (geom && geom.coordinates) {
    if (geom.type === 'Polygon') {
      partCount = 1;
      geom.coordinates.forEach(scan);
    } else if (geom.type === 'MultiPolygon') {
      partCount = geom.coordinates.length;
      geom.coordinates.forEach((p) => p.forEach(scan));
    } else if (geom.type === 'LineString') {
      partCount = 1;
      geom.coordinates.forEach(scan);
    } else if (geom.type === 'MultiLineString') {
      partCount = geom.coordinates.length;
      geom.coordinates.forEach((l) => l.forEach(scan));
    }
  }

  return {
    bbox: { minX, maxX, minY, maxY },
    vertexCount,
    partCount
  };
}

function renderFeaturesToCanvas(features, options = {}) {
  const {
    pixelWidth = 100,
    pixelHeight = 44,
    highlightName = '',
    customBBox = null
  } = options;

  let globalMinX = Infinity, globalMaxX = -Infinity;
  let globalMinY = Infinity, globalMaxY = -Infinity;

  if (customBBox) {
    globalMinX = customBBox.minX;
    globalMaxX = customBBox.maxX;
    globalMinY = customBBox.minY;
    globalMaxY = customBBox.maxY;
  } else {
    for (const f of features) {
      const { bbox } = scanGeometryStats(f);
      if (isFinite(bbox.minX)) {
        globalMinX = Math.min(globalMinX, bbox.minX);
        globalMaxX = Math.max(globalMaxX, bbox.maxX);
        globalMinY = Math.min(globalMinY, bbox.minY);
        globalMaxY = Math.max(globalMaxY, bbox.maxY);
      }
    }
  }

  if (!isFinite(globalMinX) || globalMinX >= globalMaxX) {
    globalMinX = -180; globalMaxX = 180; globalMinY = -85; globalMaxY = 85;
  }

  const centerLat = (globalMinY + globalMaxY) / 2;
  const cosLat = Math.max(0.15, Math.cos((centerLat * Math.PI) / 180));
  const geoW = Math.max(1e-5, (globalMaxX - globalMinX) * cosLat);
  const geoH = Math.max(1e-5, globalMaxY - globalMinY);

  const scale = Math.min((pixelWidth - 4) / geoW, (pixelHeight - 4) / geoH);
  const canvasW = Math.max(10, Math.round(geoW * scale) + 4);
  const canvasH = Math.max(8, Math.round(geoH * scale) + 4);

  const canvas = new ColoredBrailleCanvas(canvasW, canvasH);
  const pad = 2;

  function project(lng, lat) {
    const x = pad + ((lng - globalMinX) * cosLat) * scale;
    const y = pad + (globalMaxY - lat) * scale;
    return [x, y];
  }

  function drawRing(ring, color) {
    if (!ring || ring.length < 2) return;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x0, y0] = project(ring[i][0], ring[i][1]);
      const [x1, y1] = project(ring[i + 1][0], ring[i + 1][1]);
      canvas.drawLine(x0, y0, x1, y1, color);
    }
  }

  const normalFeatures = [];
  let highlightedFeature = null;

  for (const f of features) {
    const p = f.properties || {};
    const name = String(p.name || p.name_en || p.name_zh || f.id || '');
    if (highlightName && (name.toLowerCase() === highlightName.toLowerCase() || String(f.id) === highlightName)) {
      highlightedFeature = f;
    } else {
      normalFeatures.push(f);
    }
  }

  const palette = [C.cyan, C.green, C.blue, C.magenta];
  normalFeatures.forEach((f, idx) => {
    const color = highlightName ? C.gray : palette[idx % palette.length];
    const geom = f.geometry;
    if (!geom) return;

    if (geom.type === 'Polygon') {
      geom.coordinates.forEach((ring) => drawRing(ring, color));
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach((poly) => poly.forEach((ring) => drawRing(ring, color)));
    } else if (geom.type === 'LineString') {
      drawRing(geom.coordinates, color);
    } else if (geom.type === 'MultiLineString') {
      geom.coordinates.forEach((line) => drawRing(line, color));
    }
  });

  if (highlightedFeature) {
    const hCol = C.brightYellow;
    const geom = highlightedFeature.geometry;
    if (geom.type === 'Polygon') {
      geom.coordinates.forEach((ring) => drawRing(ring, hCol));
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach((poly) => poly.forEach((ring) => drawRing(ring, hCol)));
    }
  }

  return canvas.renderWithFrame(
    highlightName ? `HIGHLIGHT: ${highlightName.toUpperCase()}` : '',
    { minX: globalMinX, maxX: globalMaxX, minY: globalMinY, maxY: globalMaxY }
  );
}

/**
 * Flexible Path Resolver:
 * Accepts exact path, relative path, or file name anywhere in public/data
 */
function resolveFgbPath(inputArg) {
  if (!inputArg) return null;

  // 1. Exact path or relative to current directory
  if (fs.existsSync(inputArg)) return path.resolve(inputArg);
  const directPath = path.resolve(process.cwd(), inputArg);
  if (fs.existsSync(directPath)) return directPath;

  // 2. Relative to project root
  const rootRel = path.resolve(rootDir, inputArg);
  if (fs.existsSync(rootRel)) return rootRel;

  // 3. Match in public/data/l2/<ISO2>.fgb
  const fgbName = inputArg.endsWith('.fgb') ? inputArg : `${inputArg}.fgb`;
  const l2Path = path.join(rootDir, 'public', 'data', 'l2', fgbName);
  if (fs.existsSync(l2Path)) return l2Path;
  const l2Upper = path.join(rootDir, 'public', 'data', 'l2', `${inputArg.toUpperCase()}.fgb`);
  if (fs.existsSync(l2Upper)) return l2Upper;

  // 4. Match in public/data/<filename>
  const dataPath = path.join(rootDir, 'public', 'data', fgbName);
  if (fs.existsSync(dataPath)) return dataPath;

  // 5. Match in public/data/roads/<filename>
  const roadPath = path.join(rootDir, 'public', 'data', 'roads', fgbName);
  if (fs.existsSync(roadPath)) return roadPath;

  // 6. Recursive search inside public/data (for L3 subdivisions like US-CA.fgb, etc.)
  function findRecursive(dir, target) {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        const res = findRecursive(full, target);
        if (res) return res;
      } else if (e.name.toLowerCase() === target.toLowerCase()) {
        return full;
      }
    }
    return null;
  }

  const found = findRecursive(path.join(rootDir, 'public', 'data'), fgbName);
  if (found) return found;

  return null;
}

/**
 * Render Schema Dictionary
 */
function renderSchemaDictionary(features, filename) {
  if (features.length === 0) return;
  const propKeys = Object.keys(features[0].properties || {});

  console.log(`\n${C.bold}${C.brightCyan}📖 欄位語意說明 (Schema & Meanings):${C.reset}`);
  console.log(`${C.gray}${'─'.repeat(84)}${C.reset}`);

  propKeys.forEach((key) => {
    const meta = FIELD_DICTIONARY[key] || {
      labelZh: '特徵屬性',
      type: typeof (features[0].properties?.[key]),
      meaning: '圖資所攜帶之屬性欄位',
      purpose: '前端屬性顯示'
    };

    console.log(`  • ${C.bold}${C.brightYellow}${key.padEnd(12)}${C.reset} ${C.gray}(${meta.type})${C.reset} : ${C.white}${meta.labelZh}${C.reset}`);
    console.log(`    ${C.dim}語意:${C.reset} ${meta.meaning}`);
    console.log(`    ${C.dim}用途:${C.reset} ${meta.purpose}`);
  });

  console.log(`${C.gray}${'─'.repeat(84)}${C.reset}`);
}

/**
 * Render Distinct Breakdown
 */
function renderDistinctDistribution(features, field) {
  const counts = new Map();
  let nullCount = 0;

  for (const f of features) {
    const v = f.properties?.[field];
    if (v === undefined || v === null || v === '') {
      nullCount++;
    } else {
      const s = String(v);
      counts.set(s, (counts.get(s) || 0) + 1);
    }
  }

  if (counts.size === 0 && nullCount === 0) return;

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const total = features.length;
  const maxLabelLen = Math.max(10, ...sorted.map(([k]) => k.length));

  console.log(`\n${C.bold}📊 類別分佈統計 (${field} Distribution):${C.reset}`);

  sorted.forEach(([val, count]) => {
    const pct = ((count / total) * 100).toFixed(1);
    const barLen = Math.round((count / total) * 20);
    const bar = `${C.brightCyan}${'█'.repeat(barLen)}${C.gray}${'░'.repeat(20 - barLen)}${C.reset}`;
    console.log(`   ${val.padEnd(maxLabelLen + 2)} : ${count.toString().padStart(3)} 筆 (${pct.padStart(5)}%) ${bar}`);
  });

  if (nullCount > 0) {
    const pct = ((nullCount / total) * 100).toFixed(1);
    console.log(`   ${'(未定義)'.padEnd(maxLabelLen + 2)} : ${nullCount.toString().padStart(3)} 筆 (${pct.padStart(5)}%)`);
  }
}

/**
 * Render Data Records Table
 */
function renderDataTable(features, options = {}) {
  const {
    limit = 50,
    page = 1,
    filterExpr = null
  } = options;

  let filtered = features;

  if (filterExpr) {
    const [filterKey, filterVal] = filterExpr.includes('=') ? filterExpr.split('=') : [null, filterExpr];
    filtered = features.filter((f) => {
      const p = f.properties || {};
      if (filterKey) {
        const val = String(p[filterKey] || '').toLowerCase();
        return val.includes(filterVal.toLowerCase());
      } else {
        return Object.values(p).some((v) => String(v).toLowerCase().includes(filterVal.toLowerCase()));
      }
    });
  }

  const total = filtered.length;
  const start = (page - 1) * (limit || total);
  const end = limit > 0 ? Math.min(total, start + limit) : total;
  const paged = filtered.slice(start, end);

  const isAll = limit >= total || limit === 0;
  const rangeStr = isAll ? `顯示全部 ${total} 筆` : `顯示第 ${start + 1} ~ ${end} 筆 (共 ${total} 筆)`;

  console.log(`\n${C.bold}📋 資料內容表 (${rangeStr}):${C.reset}`);
  if (filterExpr) {
    console.log(`   ${C.yellow}篩選條件: ${filterExpr}${C.reset}`);
  }

  if (paged.length === 0) {
    console.log(`  ${C.dim}(無符合篩選條件的記錄)${C.reset}\n`);
    return;
  }

  const firstProps = paged[0].properties || {};
  const propKeys = Object.keys(firstProps);

  const tableRows = paged.map((f, idx) => {
    const row = { '#': start + idx + 1 };
    propKeys.forEach((k) => {
      let val = f.properties?.[k];
      if (val === undefined || val === null) val = '-';
      row[k] = String(val);
    });
    return row;
  });

  console.table(tableRows);

  if (limit > 0 && end < total) {
    console.log(`  ${C.dim}💡 資料量較多，已預設顯示前 ${limit} 筆。加入 '--page ${page + 1}' 觀看下一頁，或 '--limit 0' 輸出全部記錄。${C.reset}`);
  }
}

/**
 * Main Entry Point
 */
async function main() {
  const args = process.argv.slice(2);
  let fileArg = null;
  let featureQuery = null;
  let highlightQuery = null;
  let distinctField = null;
  let filterExpr = null;
  let showMap = false;
  let showStat = false;
  let showCoords = false;
  let dumpJson = false;
  let limit = 50;
  let page = 1;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-f' || a === '--feature') {
      featureQuery = args[++i];
    } else if (a === '-h' || a === '--highlight') {
      highlightQuery = args[++i];
    } else if (a === '--map') {
      showMap = true;
    } else if (a === '--distinct') {
      distinctField = args[++i];
    } else if (a === '--filter' || a === '-q') {
      filterExpr = args[++i];
    } else if (a === '--json') {
      dumpJson = true;
    } else if (a === '-s' || a === '--stat') {
      showStat = true;
    } else if (a === '-c' || a === '--coords') {
      showCoords = true;
    } else if (a === '--limit') {
      limit = parseInt(args[++i], 10);
    } else if (a === '--page') {
      page = parseInt(args[++i], 10);
    } else if (!fileArg && !a.startsWith('-')) {
      fileArg = a;
    }
  }

  if (!fileArg) {
    printHelp();
    return;
  }

  const resolvedPath = resolveFgbPath(fileArg);
  if (!resolvedPath) {
    console.error(`\n${C.red}錯誤: 找不到圖資檔案 '${fileArg}'${C.reset}`);
    console.error(`請確認檔案路徑是否正確（如 public/data/l2/TW.fgb）`);
    process.exit(1);
  }

  const stat = fs.statSync(resolvedPath);
  const fileBytes = stat.size;
  const buf = fs.readFileSync(resolvedPath);

  // Deserialize features
  const it = flatgeobuf.geojson.deserialize(new Uint8Array(buf));
  const features = [];
  for await (const f of it) {
    features.push(f);
  }

  if (features.length === 0) {
    console.log(`${C.yellow}提示: 此 FlatGeobuf 檔案不包含任何 Feature 記錄。${C.reset}`);
    return;
  }

  // 1. Raw JSON Dump Mode
  if (dumpJson) {
    console.log(JSON.stringify(features.map((f) => f.properties), null, 2));
    return;
  }

  // 2. Distinct Mode
  if (distinctField) {
    console.log(`\n${C.bold}📁 檔案: ${C.cyan}${resolvedPath}${C.reset}`);
    renderDistinctDistribution(features, distinctField);
    return;
  }

  // 3. Zoom Single Feature
  if (featureQuery) {
    const q = featureQuery.toLowerCase();
    const target = features.find((f, idx) => {
      const p = f.properties || {};
      const idStr = String(f.id ?? p.id ?? '');
      const name = String(p.name || '').toLowerCase();
      const nameZh = String(p.name_zh || '').toLowerCase();
      const nameEn = String(p.name_en || '').toLowerCase();
      const code = String(p.code || p.postal || '').toLowerCase();
      return name === q || nameZh === q || nameEn === q || code === q || idStr === q || String(idx + 1) === q;
    });

    if (!target) {
      console.error(`\n${C.red}在 ${path.basename(resolvedPath)} 中找不到特徵 '${featureQuery}'${C.reset}`);
      process.exit(1);
    }

    const p = target.properties || {};
    const name = p.name || p.name_en || target.id || 'Unnamed';
    const nameZh = p.name_zh ? ` (${p.name_zh})` : '';
    const s = scanGeometryStats(target);

    console.log(`\n${C.bold}${C.brightYellow}🔎 單一特徵記錄檢視: ${name}${nameZh}${C.reset}`);
    console.log(`${C.gray}${'═'.repeat(70)}${C.reset}`);
    console.log(`\n${C.bold}屬性與語意:${C.reset}`);
    for (const [k, v] of Object.entries(p)) {
      const meta = FIELD_DICTIONARY[k];
      const annot = meta ? `${C.gray}# ${meta.labelZh}${C.reset}` : '';
      console.log(`  ${C.cyan}${k.padEnd(14)}${C.reset} : ${C.bold}${C.white}${String(v).padEnd(20)}${C.reset} ${annot}`);
    }

    console.log(`\n${C.bold}空間座標資訊:${C.reset}`);
    console.log(`  幾何型態:      ${C.green}${target.geometry.type}${C.reset}`);
    console.log(`  離島/分塊數:   ${C.yellow}${s.partCount}${C.reset}`);
    console.log(`  座標頂點數:    ${C.white}${s.vertexCount} pts${C.reset}`);
    console.log(`  經緯度範圍:    [${s.bbox.minX.toFixed(4)}°, ${s.bbox.minY.toFixed(4)}°] ~ [${s.bbox.maxX.toFixed(4)}°, ${s.bbox.maxY.toFixed(4)}°]`);

    if (showCoords) {
      console.log(`\n${C.bold}頂點座標列表 (${s.vertexCount} 點):${C.reset}`);
      console.log(JSON.stringify(target.geometry.coordinates, null, 2));
    }
    return;
  }

  // 4. Default Mode: File Overview -> Schema & Meanings -> Auto Distribution -> Data Content Table!
  let globalMinX = Infinity, globalMaxX = -Infinity;
  let globalMinY = Infinity, globalMaxY = -Infinity;
  let totalVerts = 0;
  const geomTypes = new Set();

  for (const f of features) {
    const s = scanGeometryStats(f);
    totalVerts += s.vertexCount;
    if (f.geometry?.type) geomTypes.add(f.geometry.type);
    if (isFinite(s.bbox.minX)) {
      globalMinX = Math.min(globalMinX, s.bbox.minX);
      globalMaxX = Math.max(globalMaxX, s.bbox.maxX);
      globalMinY = Math.min(globalMinY, s.bbox.minY);
      globalMaxY = Math.max(globalMaxY, s.bbox.maxY);
    }
  }

  console.log(`\n${C.bold}${C.brightCyan}╔══════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.brightCyan}║              FlatGeobuf (FGB) 資料內容與語意檢視器                       ║${C.reset}`);
  console.log(`${C.bold}${C.brightCyan}╚══════════════════════════════════════════════════════════════════════════╝${C.reset}`);

  // File Overview
  console.log(`\n${C.bold}📁 檔案基本資訊:${C.reset}`);
  console.log(`   檔案路徑:      ${C.cyan}${resolvedPath}${C.reset}`);
  console.log(`   檔案體積:      ${C.yellow}${(fileBytes / 1024).toFixed(1)} KB${C.reset} (${(fileBytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   記錄筆數:      ${C.brightGreen}${features.length}${C.reset} 筆`);
  console.log(`   幾何型態:      ${Array.from(geomTypes).join(', ')} (總頂點數: ${totalVerts.toLocaleString()} 點)`);
  console.log(`   經緯度範圍:    [${globalMinX.toFixed(2)}°E, ${globalMinY.toFixed(2)}°N] ~ [${globalMaxX.toFixed(2)}°E, ${globalMaxY.toFixed(2)}°N]`);

  // Schema Definitions & Meanings
  renderSchemaDictionary(features, resolvedPath);

  // Auto-detect categorical distribution (e.g. type_en or class)
  const firstProps = features[0]?.properties || {};
  if ('type_en' in firstProps) {
    renderDistinctDistribution(features, 'type_en');
  } else if ('class' in firstProps) {
    renderDistinctDistribution(features, 'class');
  }

  // Data Content Table (Auto-fits small tables up to 50 records)
  const autoLimit = features.length <= 50 ? features.length : limit;
  renderDataTable(features, { limit: autoLimit, page, filterExpr });

  // Optional Visual Map
  if (showMap) {
    console.log(`\n${C.bold}🗺️  點陣幾何輪廓圖:${C.reset}`);
    const mapStr = renderFeaturesToCanvas(features, {
      pixelWidth: 100,
      pixelHeight: 44,
      highlightName: highlightQuery
    });
    console.log(mapStr);
  }

  console.log(`${C.dim}💡 常用操作:${C.reset}`);
  console.log(`   - 條件過濾:  ${C.cyan}node scripts/fgb-visualizer.mjs ${fileArg} --filter postal=CA${C.reset}`);
  console.log(`   - 數值分佈:  ${C.cyan}node scripts/fgb-visualizer.mjs ${fileArg} --distinct <欄位名>${C.reset}`);
  console.log(`   - 單筆聚焦:  ${C.cyan}node scripts/fgb-visualizer.mjs ${fileArg} -f "<名稱>"${C.reset}`);
  console.log(`   - 檢視地圖:  ${C.cyan}node scripts/fgb-visualizer.mjs ${fileArg} --map${C.reset}\n`);
}

function printHelp() {
  console.log(`
${C.bold}${C.brightCyan}FlatGeobuf (FGB) Shell Data Inspector${C.reset}
直接帶入 .fgb 檔案路徑即可檢視屬性內容與欄位語意說明。

${C.bold}使用方式:${C.reset}
  node scripts/fgb-visualizer.mjs <檔案路徑.fgb> [選項]

${C.bold}範例:${C.reset}
  node scripts/fgb-visualizer.mjs public/data/l2/TW.fgb
  node scripts/fgb-visualizer.mjs public/data/l2/US.fgb
  node scripts/fgb-visualizer.mjs public/data/roads/US.fgb
  node scripts/fgb-visualizer.mjs public/data/l3/US/US-CA.fgb

${C.bold}查詢選項:${C.reset}
  --filter <key=val>   依屬性條件過濾 (如: --filter postal=CA)
  --distinct <欄位>    分析指定欄位的數值分佈比例 (如: --distinct type_en)
  -f, --feature <名稱> 聚焦單筆記錄，顯示全部屬性與空間座標
  --map                額外繪製終端機點字幾何地圖
  --limit <筆數>       設定顯示筆數 (預設: 50, 0 為全部)
  --page <頁碼>        分頁瀏覽
`);
}

main().catch((err) => {
  console.error(`\n${C.red}Inspector Error: ${err.message}${C.reset}`);
  process.exit(1);
});
