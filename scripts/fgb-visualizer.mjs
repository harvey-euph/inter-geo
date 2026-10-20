#!/usr/bin/env node

/**
 * FlatGeobuf (FGB) Shell Data Inspector & Visualizer
 * 
 * Inspect vector data contents, schema semantics, field meanings, 
 * value distributions, and geometric shapes directly in the terminal!
 * 
 * Usage:
 *   node scripts/fgb-visualizer.mjs <file.fgb | ISO2> [options]
 * 
 * Data Content & Semantic Modes:
 *   --data, --table          View all data records in an aligned tabular view
 *   --schema, --dict         View the Data Dictionary: field meanings, types & purposes
 *   --distinct <field>       Show value distribution & frequency breakdown for any column
 *   --filter <key=val|str>   Filter records matching specific attribute values or substrings
 *   --json [name|id]         Dump raw JSON properties for full programmatic inspection
 *   --limit <num>            Set maximum records to display (default: 50, use 0 for all)
 *   --page <num>             Pagination page number
 * 
 * Visual & Geometry Modes:
 *   -f, --feature <name|id>  Zoom into a specific feature, view detailed shape & all attributes
 *   -h, --highlight <name>   Render full map with a designated feature highlighted
 *   -l, --list               Compact list with parts & vertex counts
 *   -s, --stat               Geometry complexity statistics & vertex distribution
 *   --no-map                 Skip rendering ASCII/Braille map (data content only)
 * 
 * Examples:
 *   node scripts/fgb-visualizer.mjs TW --data
 *   node scripts/fgb-visualizer.mjs US --schema
 *   node scripts/fgb-visualizer.mjs US --distinct type_en
 *   node scripts/fgb-visualizer.mjs TW --distinct type_en
 *   node scripts/fgb-visualizer.mjs US --filter postal=CA
 *   node scripts/fgb-visualizer.mjs public/data/roads/US.fgb --distinct class
 *   node scripts/fgb-visualizer.mjs public/data/roads/US.fgb --filter class=Interstate --limit 10
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as flatgeobuf from 'flatgeobuf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ANSI Color Helpers
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
 * Knowledge Base: Data Dictionary & Field Meanings
 * Defines the real-world semantics, standards, and gameplay/system purposes for every known field.
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
    meaning: '正體/繁體中文翻譯地名 (如 加利福尼亞州、東京都、桃園市)。台灣縣市已自動校正為正體字。',
    purpose: '中文使用者介面核心顯示、GeoGuessr 繁中地理知識卡片。'
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
    meaning: '日本/各國二級或三級自治體名稱 (如 札幌市、中央区)。',
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

/**
 * Scan features to compute bounding box and vertex count
 */
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

/**
 * Render collection of features onto terminal canvas
 */
function renderFeaturesToCanvas(features, options = {}) {
  const {
    pixelWidth = 120,
    pixelHeight = 56,
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
 * Resolve input argument to existing .fgb file path
 */
function resolveFgbPath(inputArg) {
  if (!inputArg) return null;
  if (fs.existsSync(inputArg)) return inputArg;

  const directPath = path.resolve(process.cwd(), inputArg);
  if (fs.existsSync(directPath)) return directPath;

  // Check public/data/l2/<ISO2>.fgb
  const l2Path = path.join(rootDir, 'public', 'data', 'l2', `${inputArg.toUpperCase()}.fgb`);
  if (fs.existsSync(l2Path)) return l2Path;

  // Check public/data/<filename>
  const dataPath = path.join(rootDir, 'public', 'data', inputArg.endsWith('.fgb') ? inputArg : `${inputArg}.fgb`);
  if (fs.existsSync(dataPath)) return dataPath;

  // Check public/data/roads/<filename>
  const roadPath = path.join(rootDir, 'public', 'data', 'roads', inputArg.endsWith('.fgb') ? inputArg : `${inputArg}.fgb`);
  if (fs.existsSync(roadPath)) return roadPath;

  return null;
}

/**
 * 1. Render Schema & Semantic Meanings Data Dictionary
 */
function renderSchemaDictionary(features, filename) {
  if (features.length === 0) return;
  const propKeys = Object.keys(features[0].properties || {});

  console.log(`\n${C.bold}${C.brightCyan}📖 Data Dictionary & Schema Semantics: ${path.basename(filename)}${C.reset}`);
  console.log(`${C.gray}${'═'.repeat(90)}${C.reset}`);
  console.log(`${C.bold}此檔案共偵測到 ${C.yellow}${propKeys.length}${C.reset}${C.bold} 個屬性欄位。以下為各欄位的資料定義、現實語意與系統用途：${C.reset}\n`);

  propKeys.forEach((key, idx) => {
    const meta = FIELD_DICTIONARY[key] || {
      labelZh: '自訂屬性',
      type: typeof (features[0].properties?.[key]),
      meaning: '圖資所攜帶之地理或屬性欄位',
      purpose: '前端屬性顯示或過濾條件'
    };

    // Collect 3 sample distinct values
    const sampleVals = [];
    for (const f of features) {
      const v = f.properties?.[key];
      if (v !== undefined && v !== null && v !== '' && !sampleVals.includes(String(v))) {
        sampleVals.push(String(v));
        if (sampleVals.length >= 3) break;
      }
    }

    console.log(`${C.bold}${C.brightYellow}[${idx + 1}] 欄位名稱: ${C.cyan}${key}${C.reset}  ${C.gray}── ${meta.labelZh} (${meta.type})${C.reset}`);
    console.log(`    ${C.bold}語意說明:${C.reset} ${meta.meaning}`);
    console.log(`    ${C.bold}系統用途:${C.reset} ${meta.purpose}`);
    console.log(`    ${C.bold}範例數值:${C.reset} ${C.white}${sampleVals.map((s) => `'${s}'`).join(', ')}${C.reset}\n`);
  });

  console.log(`${C.gray}${'═'.repeat(90)}${C.reset}\n`);
}

/**
 * 2. Render Full Data Content Table
 */
function renderDataContentTable(features, options = {}) {
  const {
    limit = 50,
    page = 1,
    filterExpr = null
  } = options;

  let filtered = features;

  // Apply filtering if provided
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

  console.log(`\n${C.bold}${C.brightGreen}📊 Data Content Records (${start + 1} ~ ${end} of ${total} total)${C.reset}`);
  if (filterExpr) {
    console.log(`   ${C.yellow}Active Filter: ${filterExpr}${C.reset}`);
  }
  console.log(`${C.gray}${'─'.repeat(90)}${C.reset}`);

  if (paged.length === 0) {
    console.log(`  ${C.dim}(No records matching filter)${C.reset}\n`);
    return;
  }

  // Build dynamic table columns
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
    console.log(`\n${C.dim}💡 Use '--page ${page + 1}' to view next page, or '--limit 0' to view all ${total} records.${C.reset}`);
  }
  console.log('');
}

/**
 * 3. Render Distinct Value Analysis & Frequency Distribution
 */
function renderDistinctDistribution(features, field) {
  console.log(`\n${C.bold}${C.brightMagenta}📈 Value Frequency Distribution for field: '${C.cyan}${field}${C.reset}'${C.reset}`);
  console.log(`${C.gray}${'═'.repeat(70)}${C.reset}`);

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

  if (counts.size === 0 && nullCount === 0) {
    console.error(`\n${C.red}Field '${field}' not found in dataset.${C.reset}`);
    const available = Object.keys(features[0]?.properties || {}).join(', ');
    console.log(`Available fields: ${available}`);
    return;
  }

  // Sort descending by count
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const total = features.length;
  const maxLabelLen = Math.max(8, ...sorted.map(([k]) => k.length));

  console.log(`  Total Records: ${C.white}${total}${C.reset} | Distinct Values: ${C.yellow}${sorted.length}${C.reset}\n`);
  console.log(`  ${C.gray}${'VALUE'.padEnd(maxLabelLen + 2)} COUNT     PERCENTAGE    DISTRIBUTION${C.reset}`);
  console.log(`  ${C.gray}${'─'.repeat(maxLabelLen + 40)}${C.reset}`);

  sorted.forEach(([val, count]) => {
    const pct = ((count / total) * 100).toFixed(1);
    const barLen = Math.round((count / total) * 24);
    const bar = `${C.brightCyan}${'█'.repeat(barLen)}${C.gray}${'░'.repeat(24 - barLen)}${C.reset}`;
    console.log(`  ${C.bold}${val.padEnd(maxLabelLen + 2)}${C.reset} ${count.toString().padStart(5)}     ${pct.padStart(5)}%     ${bar}`);
  });

  if (nullCount > 0) {
    const pct = ((nullCount / total) * 100).toFixed(1);
    console.log(`  ${C.dim}(null/empty)`.padEnd(maxLabelLen + 4) + ` ${nullCount.toString().padStart(5)}     ${pct.padStart(5)}%`);
  }

  console.log(`${C.gray}${'─'.repeat(maxLabelLen + 40)}${C.reset}\n`);
}

/**
 * Main Visualizer & Inspector Routine
 */
async function main() {
  const args = process.argv.slice(2);
  let fileArg = null;
  let featureQuery = null;
  let highlightQuery = null;
  let distinctField = null;
  let filterExpr = null;
  let showSchema = false;
  let showData = false;
  let showList = false;
  let showStat = false;
  let showCoords = false;
  let dumpJson = false;
  let noMap = false;
  let limit = 50;
  let page = 1;
  let termWidth = process.stdout.columns ? Math.min(130, Math.max(60, process.stdout.columns - 4)) : 80;
  let termHeight = 24;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-f' || a === '--feature') {
      featureQuery = args[++i];
    } else if (a === '-h' || a === '--highlight') {
      highlightQuery = args[++i];
    } else if (a === '--schema' || a === '--dict') {
      showSchema = true;
    } else if (a === '--data' || a === '--table') {
      showData = true;
    } else if (a === '--distinct') {
      distinctField = args[++i];
    } else if (a === '--filter' || a === '-q') {
      filterExpr = args[++i];
    } else if (a === '--json') {
      dumpJson = true;
    } else if (a === '-l' || a === '--list') {
      showList = true;
    } else if (a === '-s' || a === '--stat') {
      showStat = true;
    } else if (a === '-c' || a === '--coords') {
      showCoords = true;
    } else if (a === '--no-map') {
      noMap = true;
    } else if (a === '--limit') {
      limit = parseInt(args[++i], 10);
    } else if (a === '--page') {
      page = parseInt(args[++i], 10);
    } else if (a === '-w' || a === '--width') {
      termWidth = parseInt(args[++i], 10);
    } else if (a === '--height') {
      termHeight = parseInt(args[++i], 10);
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
    console.error(`\n${C.red}Error: File not found for '${fileArg}'${C.reset}`);
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
    console.log(`${C.yellow}Notice: FlatGeobuf file contains 0 features.${C.reset}`);
    return;
  }

  // 1. Distinct Distribution Mode
  if (distinctField) {
    renderDistinctDistribution(features, distinctField);
    return;
  }

  // 2. Schema / Dictionary Mode
  if (showSchema) {
    renderSchemaDictionary(features, resolvedPath);
    return;
  }

  // 3. Raw JSON Dump Mode
  if (dumpJson) {
    if (featureQuery) {
      const q = featureQuery.toLowerCase();
      const target = features.find((f) => {
        const p = f.properties || {};
        return String(f.id) === q || String(p.name || '').toLowerCase() === q || String(p.code || '').toLowerCase() === q;
      });
      console.log(JSON.stringify(target || null, null, 2));
    } else {
      console.log(JSON.stringify(features.slice(0, limit || 10).map((f) => f.properties), null, 2));
    }
    return;
  }

  // 4. Data Content Table Mode
  if (showData || filterExpr) {
    renderDataContentTable(features, { limit, page, filterExpr });
    return;
  }

  // 5. Single Feature Zoom Inspection
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
      console.error(`\n${C.red}Feature '${featureQuery}' not found in ${path.basename(resolvedPath)}.${C.reset}`);
      process.exit(1);
    }

    renderSingleFeatureView(target, { termWidth, termHeight, showCoords });
    return;
  }

  // 6. Compact List Mode
  if (showList) {
    renderFeatureList(features, path.basename(resolvedPath));
    return;
  }

  // 7. Complexity Stats Mode
  if (showStat) {
    renderStatistics(features, resolvedPath, fileBytes);
    return;
  }

  // 8. Default Combined View: File Overview + Schema Summary + Data Table Preview + Terminal Map
  console.log(`\n${C.bold}${C.brightCyan}╔══════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.brightCyan}║                     FlatGeobuf (FGB) Data Inspector                      ║${C.reset}`);
  console.log(`${C.bold}${C.brightCyan}╚══════════════════════════════════════════════════════════════════════════╝${C.reset}`);

  console.log(`\n${C.bold}📁 File Overview:${C.reset}`);
  console.log(`   Path:          ${C.cyan}${resolvedPath}${C.reset}`);
  console.log(`   Size:          ${C.yellow}${(fileBytes / 1024).toFixed(1)} KB${C.reset} (${(fileBytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   Features:      ${C.brightGreen}${features.length}${C.reset} records`);

  // Print Schema Summary
  const propKeys = Object.keys(features[0].properties || {});
  console.log(`\n${C.bold}📋 Data Schema (${propKeys.length} fields detected):${C.reset}`);
  propKeys.forEach((k) => {
    const meta = FIELD_DICTIONARY[k];
    const desc = meta ? `${C.white}${meta.labelZh}${C.reset} (${meta.meaning})` : `${C.dim}自訂屬性${C.reset}`;
    console.log(`   • ${C.brightYellow}${k.padEnd(12)}${C.reset}: ${desc}`);
  });

  // Data Preview Table (First 5 records)
  renderDataContentTable(features, { limit: 5, page: 1 });

  // Terminal Map Canvas
  if (!noMap) {
    console.log(`${C.bold}🗺️  Visual Map Canvas (Braille Sub-pixel):${C.reset}`);
    const pixelW = termWidth * 2;
    const pixelH = termHeight * 4;
    const mapStr = renderFeaturesToCanvas(features, {
      pixelWidth: pixelW,
      pixelHeight: pixelH,
      highlightName: highlightQuery
    });
    console.log(mapStr);
  }

  console.log(`\n${C.dim}💡 Quick Data Exploration Commands:${C.reset}`);
  console.log(`   - Full Data Table:     ${C.cyan}node scripts/fgb-visualizer.mjs ${fileArg} --data${C.reset}`);
  console.log(`   - Data Dictionary:     ${C.cyan}node scripts/fgb-visualizer.mjs ${fileArg} --schema${C.reset}`);
  console.log(`   - Value Breakdown:     ${C.cyan}node scripts/fgb-visualizer.mjs ${fileArg} --distinct <field>${C.reset}`);
  console.log(`   - Search / Filter:     ${C.cyan}node scripts/fgb-visualizer.mjs ${fileArg} --filter <key=val>${C.reset}`);
  console.log(`   - Feature Inspector:   ${C.cyan}node scripts/fgb-visualizer.mjs ${fileArg} -f "<name>"${C.reset}\n`);
}

/**
 * Render single zoomed feature
 */
function renderSingleFeatureView(f, options) {
  const p = f.properties || {};
  const name = p.name || p.name_en || f.id || 'Unnamed';
  const nameZh = p.name_zh ? ` (${p.name_zh})` : '';
  const s = scanGeometryStats(f);

  console.log(`\n${C.bold}${C.brightYellow}🔎 Inspecting Record: ${name}${nameZh}${C.reset}`);
  console.log(`${C.gray}${'═'.repeat(70)}${C.reset}`);

  // Properties Table with Semantics
  console.log(`\n${C.bold}Attributes & Meanings:${C.reset}`);
  for (const [k, v] of Object.entries(p)) {
    const meta = FIELD_DICTIONARY[k];
    const annot = meta ? `${C.gray}# ${meta.labelZh}${C.reset}` : '';
    console.log(`  ${C.cyan}${k.padEnd(14)}${C.reset} : ${C.bold}${C.white}${String(v).padEnd(20)}${C.reset} ${annot}`);
  }

  console.log(`\n${C.bold}Spatial & Geometry Stats:${C.reset}`);
  console.log(`  Type:          ${C.green}${f.geometry.type}${C.reset}`);
  console.log(`  Parts/Islands: ${C.yellow}${s.partCount}${C.reset}`);
  console.log(`  Total Vertices:${C.white} ${s.vertexCount} pts${C.reset}`);
  console.log(`  Bounding Box:  [${s.bbox.minX.toFixed(4)}, ${s.bbox.minY.toFixed(4)}] to [${s.bbox.maxX.toFixed(4)}, ${s.bbox.maxY.toFixed(4)}]`);
  console.log(`  Center:        [${((s.bbox.minX + s.bbox.maxX) / 2).toFixed(4)}, ${((s.bbox.minY + s.bbox.maxY) / 2).toFixed(4)}]`);

  console.log(`\n${C.bold}Geometry Preview:${C.reset}`);
  const mapStr = renderFeaturesToCanvas([f], {
    pixelWidth: (options.termWidth || 80) * 2,
    pixelHeight: 20 * 4,
    customBBox: s.bbox
  });
  console.log(mapStr);

  if (options.showCoords) {
    console.log(`\n${C.bold}Coordinate Array (${s.vertexCount} points):${C.reset}`);
    const coordsStr = JSON.stringify(f.geometry.coordinates, null, 2);
    const lines = coordsStr.split('\n');
    if (lines.length > 50) {
      console.log(lines.slice(0, 40).join('\n'));
      console.log(`${C.dim}  ... [${lines.length - 40} lines truncated] ...${C.reset}`);
    } else {
      console.log(coordsStr);
    }
  }
}

/**
 * List all features in tabular format
 */
function renderFeatureList(features, filename) {
  console.log(`\n${C.bold}📋 Inventory for ${C.cyan}${filename}${C.reset} (${features.length} features):\n`);
  console.log(`${C.bold}${C.gray}  #    ID    NAME                     NAME (ZH)        CODE       PARTS  VERTICES${C.reset}`);
  console.log(`${C.gray}  ${'─'.repeat(78)}${C.reset}`);

  features.forEach((f, idx) => {
    const p = f.properties || {};
    const s = scanGeometryStats(f);
    const id = String(f.id ?? p.id ?? idx + 1).padEnd(5);
    const name = String(p.name || p.name_en || '-').slice(0, 22).padEnd(24);
    const nameZh = String(p.name_zh || '-').slice(0, 14).padEnd(16);
    const code = String(p.code || p.postal || '-').slice(0, 9).padEnd(10);
    const parts = String(s.partCount).padStart(5);
    const pts = String(s.vertexCount).padStart(9);

    console.log(`  ${String(idx + 1).padStart(3)}  ${id} ${name} ${nameZh} ${code} ${parts} ${pts}`);
  });
  console.log(`${C.gray}  ${'─'.repeat(78)}${C.reset}\n`);
}

/**
 * Render complexity and vertex statistics
 */
function renderStatistics(features, filepath, fileBytes) {
  let totalVertices = 0;
  const summaries = features.map((f, idx) => {
    const s = scanGeometryStats(f);
    totalVertices += s.vertexCount;
    return {
      index: idx + 1,
      feature: f,
      ...s
    };
  });

  const avgVertices = Math.round(totalVertices / features.length);
  const sortedByPts = [...summaries].sort((a, b) => b.vertexCount - a.vertexCount);

  console.log(`\n${C.bold}📊 Geometry Complexity Analysis: ${C.cyan}${path.basename(filepath)}${C.reset}\n`);

  console.log(`${C.bold}Top 5 Most Complex Features (Highest Vertex Count):${C.reset}`);
  sortedByPts.slice(0, 5).forEach((s, idx) => {
    const p = s.feature.properties || {};
    const name = p.name || p.name_en || `#${s.index}`;
    const pct = ((s.vertexCount / totalVertices) * 100).toFixed(1);
    console.log(`  ${idx + 1}. ${C.yellow}${name.padEnd(20)}${C.reset} : ${C.white}${s.vertexCount.toLocaleString().padStart(6)} pts${C.reset} (${pct}% of file, ${s.partCount} parts)`);
  });

  console.log(`\n${C.bold}Top 5 Simplest / Cleanest Features (Lowest Vertex Count):${C.reset}`);
  [...sortedByPts].reverse().slice(0, 5).forEach((s, idx) => {
    const p = s.feature.properties || {};
    const name = p.name || p.name_en || `#${s.index}`;
    console.log(`  ${idx + 1}. ${C.green}${name.padEnd(20)}${C.reset} : ${C.white}${s.vertexCount.toString().padStart(6)} pts${C.reset} (${s.partCount} parts)`);
  });

  console.log(`\n${C.bold}Summary Metrics:${C.reset}`);
  console.log(`  File Size:              ${(fileBytes / 1024).toFixed(1)} KB`);
  console.log(`  Total Coordinate Verts: ${totalVertices.toLocaleString()}`);
  console.log(`  Average Vertices/Shape: ${avgVertices}`);
  console.log(`  Bytes per Vertex:       ${(fileBytes / totalVertices).toFixed(1)} B/pt\n`);
}

/**
 * Print CLI Help message
 */
function printHelp() {
  console.log(`
${C.bold}${C.brightCyan}FlatGeobuf (FGB) Shell Data Inspector & Visualizer${C.reset}
Inspect vector data contents, schema semantics, and geographic shapes directly in your shell.

${C.bold}Usage:${C.reset}
  node scripts/fgb-visualizer.mjs <file.fgb | ISO2> [options]

${C.bold}Data Inspection Options:${C.reset}
  --data, --table          View all data records in an aligned tabular view
  --schema, --dict         View Data Dictionary: field meanings, types & purposes
  --distinct <field>       Show value distribution & frequency breakdown for any column
  --filter <key=val|str>   Filter records matching specific attribute values or substrings
  --json [name|id]         Dump raw JSON properties for full programmatic inspection
  --limit <num>            Set maximum records to display (default: 50, use 0 for all)
  --page <num>             Pagination page number

${C.bold}Map & Shape Options:${C.reset}
  -f, --feature <name|id>  Zoom into a specific feature, view detailed shape & all attributes
  -h, --highlight <name>   Render full map with a designated feature highlighted
  -l, --list               Compact list with parts & vertex counts
  -s, --stat               Geometry complexity statistics & vertex distribution
  --no-map                 Skip rendering ASCII/Braille map (data content only)

${C.bold}Examples:${C.reset}
  node scripts/fgb-visualizer.mjs TW --data
  node scripts/fgb-visualizer.mjs US --schema
  node scripts/fgb-visualizer.mjs US --distinct type_en
  node scripts/fgb-visualizer.mjs US --filter postal=CA
  node scripts/fgb-visualizer.mjs roads/US.fgb --distinct class
  node scripts/fgb-visualizer.mjs JP -f "Tokyo"
`);
}

main().catch((err) => {
  console.error(`\n${C.red}Inspector Error: ${err.message}${C.reset}`);
  process.exit(1);
});
