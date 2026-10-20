#!/usr/bin/env node

/**
 * FlatGeobuf (FGB) Shell Visualizer & Data Inspector
 * 
 * Inspect and visualize any FlatGeobuf (.fgb) vector dataset directly in the terminal!
 * 
 * Features:
 *   - High-resolution terminal canvas using Braille Unicode characters (4x vertical, 2x horizontal resolution)
 *   - Latitude-corrected aspect ratio (Web Mercator cosine projection)
 *   - ANSI color rendering with frame borders and coordinate ticks
 *   - Feature-level zoom & property inspection
 *   - Feature highlight in global map
 *   - Schema & attribute table viewer
 *   - Geometric complexity & vertex statistics
 * 
 * Usage:
 *   node scripts/fgb-visualizer.mjs <file.fgb | ISO2> [options]
 * 
 * Examples:
 *   node scripts/fgb-visualizer.mjs TW
 *   node scripts/fgb-visualizer.mjs public/data/l2/US.fgb
 *   node scripts/fgb-visualizer.mjs US --feature "California"
 *   node scripts/fgb-visualizer.mjs US --feature "Colorado" --coords
 *   node scripts/fgb-visualizer.mjs US --highlight "Texas"
 *   node scripts/fgb-visualizer.mjs JP --list
 *   node scripts/fgb-visualizer.mjs US --stat
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
  white: '\x1b[37m',
  bgDark: '\x1b[40m'
};

/**
 * High-Resolution Braille Canvas for Terminal
 * Each character cell maps to a 2x4 sub-pixel grid.
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

    // Top border with North indicator
    let topBorder = `${C.gray}┌${'─'.repeat(topBarLeft)}${C.bold}${C.white}${topLabel}${C.reset}${C.gray}${'─'.repeat(topBarRight)}┐${C.reset}`;
    lines.push(topBorder);

    // Canvas rows with side coordinates
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

      // Add coordinate tick annotation on middle rows if bbox provided
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

    // Bottom border with min/max Longitude ticks
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

  // Handle anti-meridian wrap or empty
  if (!isFinite(globalMinX) || globalMinX >= globalMaxX) {
    globalMinX = -180; globalMaxX = 180; globalMinY = -85; globalMaxY = 85;
  }

  // Mercator aspect ratio scaling: physical width degrees = longitude degrees * cos(centerLat)
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

  // Draw features (highlighted feature drawn last with highest priority)
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

  // Draw normal features
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

  // Draw highlighted feature on top
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
 * Locate file from name or path
 */
function resolveFgbPath(inputArg) {
  if (!inputArg) return null;
  if (fs.existsSync(inputArg)) return inputArg;

  // Try relative to cwd
  const directPath = path.resolve(process.cwd(), inputArg);
  if (fs.existsSync(directPath)) return directPath;

  // Try public/data/l2/<ISO2>.fgb
  const l2Path = path.join(rootDir, 'public', 'data', 'l2', `${inputArg.toUpperCase()}.fgb`);
  if (fs.existsSync(l2Path)) return l2Path;

  // Try public/data/<filename>
  const dataPath = path.join(rootDir, 'public', 'data', inputArg.endsWith('.fgb') ? inputArg : `${inputArg}.fgb`);
  if (fs.existsSync(dataPath)) return dataPath;

  return null;
}

/**
 * Main Visualizer Routine
 */
async function main() {
  const args = process.argv.slice(2);
  let fileArg = null;
  let featureQuery = null;
  let highlightQuery = null;
  let showList = false;
  let showStat = false;
  let showCoords = false;
  let termWidth = process.stdout.columns ? Math.min(130, Math.max(60, process.stdout.columns - 4)) : 80;
  let termHeight = 24;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-f' || a === '--feature') {
      featureQuery = args[++i];
    } else if (a === '-h' || a === '--highlight') {
      highlightQuery = args[++i];
    } else if (a === '-l' || a === '--list') {
      showList = true;
    } else if (a === '-s' || a === '--stat') {
      showStat = true;
    } else if (a === '-c' || a === '--coords') {
      showCoords = true;
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
    console.error(`Checked relative path, public/data/l2/${fileArg.toUpperCase()}.fgb, and public/data/`);
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

  // Scan global stats
  let totalVertices = 0;
  const geomTypeSet = new Set();
  const featureSummaries = features.map((f, idx) => {
    const s = scanGeometryStats(f);
    totalVertices += s.vertexCount;
    if (f.geometry?.type) geomTypeSet.add(f.geometry.type);
    return {
      index: idx + 1,
      feature: f,
      ...s
    };
  });

  const avgVertices = Math.round(totalVertices / features.length);

  // 1. Zoom Feature View
  if (featureQuery) {
    const target = featureSummaries.find((fsItem) => {
      const p = fsItem.feature.properties || {};
      const idStr = String(fsItem.feature.id ?? p.id ?? '');
      const name = String(p.name || '').toLowerCase();
      const nameZh = String(p.name_zh || '').toLowerCase();
      const nameEn = String(p.name_en || '').toLowerCase();
      const code = String(p.code || '').toLowerCase();
      const q = featureQuery.toLowerCase();
      return name === q || nameZh === q || nameEn === q || code === q || idStr === q || String(fsItem.index) === q;
    });

    if (!target) {
      console.error(`\n${C.red}Feature '${featureQuery}' not found in ${path.basename(resolvedPath)}.${C.reset}`);
      console.log(`Available feature count: ${features.length}. Use '--list' to view all.`);
      process.exit(1);
    }

    renderSingleFeatureView(target, { termWidth, termHeight, showCoords });
    return;
  }

  // 2. Full List Mode
  if (showList) {
    renderFeatureList(featureSummaries, path.basename(resolvedPath));
    return;
  }

  // 3. Detailed Statistics Mode
  if (showStat) {
    renderStatistics(featureSummaries, resolvedPath, fileBytes, totalVertices, avgVertices);
    return;
  }

  // 4. Default Visualizer View
  console.log(`\n${C.bold}${C.brightCyan}╔══════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.brightCyan}║                     FlatGeobuf (FGB) Shell Visualizer                    ║${C.reset}`);
  console.log(`${C.bold}${C.brightCyan}╚══════════════════════════════════════════════════════════════════════════╝${C.reset}`);

  console.log(`\n${C.bold}📁 File Information:${C.reset}`);
  console.log(`   Path:          ${C.cyan}${resolvedPath}${C.reset}`);
  console.log(`   Size:          ${C.yellow}${(fileBytes / 1024).toFixed(1)} KB${C.reset} (${(fileBytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   Features:      ${C.brightGreen}${features.length}${C.reset} features`);
  console.log(`   Geometry:      ${Array.from(geomTypeSet).join(', ')}`);
  console.log(`   Total Vertices:${C.white} ${totalVertices.toLocaleString()} pts${C.reset} (Avg: ${avgVertices} pts/feature)`);

  // Render Braille Map
  console.log(`\n${C.bold}🗺️  Terminal Map Canvas (Braille 2x4 Sub-pixel Resolution):${C.reset}`);
  const pixelW = termWidth * 2;
  const pixelH = termHeight * 4;
  const mapStr = renderFeaturesToCanvas(features, {
    pixelWidth: pixelW,
    pixelHeight: pixelH,
    highlightName: highlightQuery
  });
  console.log(mapStr);

  // Schema & Sample Records
  renderPropertySummary(features);

  console.log(`\n${C.dim}💡 Tips:${C.reset}`);
  console.log(`   - Zoom feature:    ${C.cyan}node scripts/fgb-visualizer.mjs ${fileArg} -f "<name | id>"${C.reset}`);
  console.log(`   - Highlight area:  ${C.cyan}node scripts/fgb-visualizer.mjs ${fileArg} -h "<name>"${C.reset}`);
  console.log(`   - List all:        ${C.cyan}node scripts/fgb-visualizer.mjs ${fileArg} --list${C.reset}`);
  console.log(`   - Vertex stats:    ${C.cyan}node scripts/fgb-visualizer.mjs ${fileArg} --stat${C.reset}\n`);
}

/**
 * Render single zoomed feature
 */
function renderSingleFeatureView(fsItem, options) {
  const f = fsItem.feature;
  const p = f.properties || {};
  const name = p.name || p.name_en || f.id || 'Unnamed';
  const nameZh = p.name_zh ? ` (${p.name_zh})` : '';

  console.log(`\n${C.bold}${C.brightYellow}🔎 Inspecting Feature: ${name}${nameZh}${C.reset}`);
  console.log(`${C.gray}${'─'.repeat(60)}${C.reset}`);

  // Properties Table
  console.log(`${C.bold}Properties:${C.reset}`);
  for (const [k, v] of Object.entries(p)) {
    console.log(`  ${C.cyan}${k.padEnd(14)}${C.reset} : ${C.white}${String(v)}${C.reset}`);
  }

  console.log(`\n${C.bold}Geometry Details:${C.reset}`);
  console.log(`  Type:          ${C.green}${f.geometry.type}${C.reset}`);
  console.log(`  Parts/Islands: ${C.yellow}${fsItem.partCount}${C.reset}`);
  console.log(`  Total Vertices:${C.white} ${fsItem.vertexCount} pts${C.reset}`);
  console.log(`  Bounding Box:  [${fsItem.bbox.minX.toFixed(4)}, ${fsItem.bbox.minY.toFixed(4)}] to [${fsItem.bbox.maxX.toFixed(4)}, ${fsItem.bbox.maxY.toFixed(4)}]`);
  console.log(`  Center:        [${((fsItem.bbox.minX + fsItem.bbox.maxX) / 2).toFixed(4)}, ${((fsItem.bbox.minY + fsItem.bbox.maxY) / 2).toFixed(4)}]`);

  // Render Zoomed Map
  console.log(`\n${C.bold}Visual Geometry:${C.reset}`);
  const mapStr = renderFeaturesToCanvas([f], {
    pixelWidth: (options.termWidth || 80) * 2,
    pixelHeight: 22 * 4,
    customBBox: fsItem.bbox
  });
  console.log(mapStr);

  // Dump coordinates if requested
  if (options.showCoords) {
    console.log(`\n${C.bold}Coordinate Array (${fsItem.vertexCount} points):${C.reset}`);
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
function renderFeatureList(summaries, filename) {
  console.log(`\n${C.bold}📋 Feature Inventory for ${C.cyan}${filename}${C.reset} (${summaries.length} features):\n`);
  console.log(`${C.bold}${C.gray}  #    ID    NAME                     NAME (ZH)        CODE       PARTS  VERTICES${C.reset}`);
  console.log(`${C.gray}  ${'─'.repeat(78)}${C.reset}`);

  summaries.forEach((s) => {
    const p = s.feature.properties || {};
    const id = String(s.feature.id ?? p.id ?? s.index).padEnd(5);
    const name = String(p.name || p.name_en || '-').slice(0, 22).padEnd(24);
    const nameZh = String(p.name_zh || '-').slice(0, 14).padEnd(16);
    const code = String(p.code || p.postal || '-').slice(0, 9).padEnd(10);
    const parts = String(s.partCount).padStart(5);
    const pts = String(s.vertexCount).padStart(9);

    console.log(`  ${String(s.index).padStart(3)}  ${id} ${name} ${nameZh} ${code} ${parts} ${pts}`);
  });
  console.log(`${C.gray}  ${'─'.repeat(78)}${C.reset}\n`);
}

/**
 * Render complexity and vertex statistics
 */
function renderStatistics(summaries, filepath, fileBytes, totalVertices, avgVertices) {
  console.log(`\n${C.bold}📊 Geometry Complexity Analysis: ${C.cyan}${path.basename(filepath)}${C.reset}\n`);

  const sortedByPts = [...summaries].sort((a, b) => b.vertexCount - a.vertexCount);

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
  console.log(`  Bytes per Vertex:       ${(fileBytes / totalVertices).toFixed(1)} B/pt`);
  console.log('');
}

/**
 * Display property schema and sample records
 */
function renderPropertySummary(features) {
  if (features.length === 0) return;
  const firstProps = features[0].properties || {};
  const propKeys = Object.keys(firstProps);

  console.log(`\n${C.bold}📋 Properties Schema (${propKeys.length} fields):${C.reset}`);
  console.log(`   ${propKeys.map((k) => `${C.cyan}${k}${C.reset}`).join(', ')}`);

  console.log(`\n${C.bold}Sample Records (First ${Math.min(5, features.length)}):${C.reset}`);
  const sampleRows = features.slice(0, 5).map((f) => {
    const p = f.properties || {};
    return {
      ID: f.id ?? p.id ?? '-',
      Name: p.name || p.name_en || '-',
      Name_ZH: p.name_zh || '-',
      Code: p.code || p.postal || '-',
      Type: p.type_en || f.geometry.type
    };
  });
  console.table(sampleRows);
}

/**
 * Print CLI Help message
 */
function printHelp() {
  console.log(`
${C.bold}${C.brightCyan}FlatGeobuf (FGB) Shell Visualizer${C.reset}
Renders high-resolution vector maps and inspects GIS data directly in your shell.

${C.bold}Usage:${C.reset}
  node scripts/fgb-visualizer.mjs <file.fgb | ISO2> [options]

${C.bold}Options:${C.reset}
  -f, --feature <name|id>   Zoom into a specific feature, view detailed shape & all attributes
  -h, --highlight <name>    Render full map with a designated feature highlighted in bright color
  -l, --list                List all features with index, name, code, parts, and vertex counts
  -s, --stat                Show geometry complexity statistics, highest/lowest vertex breakdown
  -c, --coords              Dump raw coordinate array when viewing a feature
  -w, --width <columns>     Custom canvas width in terminal character columns
  --height <rows>           Custom canvas height in terminal character rows

${C.bold}Quick Examples:${C.reset}
  node scripts/fgb-visualizer.mjs TW
  node scripts/fgb-visualizer.mjs US -h "California"
  node scripts/fgb-visualizer.mjs US -f "Colorado"
  node scripts/fgb-visualizer.mjs US -f "Wyoming" --coords
  node scripts/fgb-visualizer.mjs JP --list
  node scripts/fgb-visualizer.mjs CA --stat
`);

  // List available L2 datasets
  const l2Dir = path.join(rootDir, 'public', 'data', 'l2');
  if (fs.existsSync(l2Dir)) {
    const available = fs.readdirSync(l2Dir).filter((f) => f.endsWith('.fgb')).map((f) => f.replace('.fgb', ''));
    console.log(`${C.bold}Available country codes (${available.length}):${C.reset}`);
    const preview = available.slice(0, 25).join(', ');
    console.log(`  ${C.gray}${preview}... and more${C.reset}\n`);
  }
}

main().catch((err) => {
  console.error(`\n${C.red}Visualizer Error: ${err.message}${C.reset}`);
  process.exit(1);
});
