import fs from 'node:fs';
import path from 'node:path';

const SIZE_KEYS = ['labelSize', 'textSize', 'imageSize'];
const MIN_SIZE = 0.4;
const MAX_SIZE = 4;

export function clampLayerSize(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error('size must be a number');
  }
  const clamped = Math.min(MAX_SIZE, Math.max(MIN_SIZE, n));
  return Math.round(clamped * 10) / 10;
}

export function formatLayerSize(value) {
  const n = clampLayerSize(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Insert or replace one `// @key: value` line in a layer CSV header.
 * The new line stays with the other `// @` directives.
 */
export function upsertDirective(csvText, key, value) {
  const newline = csvText.includes('\r\n') ? '\r\n' : '\n';
  const hadTrailingNewline = csvText.endsWith('\n');
  const lines = csvText.split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  const pattern = new RegExp(`^\\s*(?://|#)\\s*@${key}\\s*[:=]\\s*.*$`);
  const rendered = `// @${key}: ${formatLayerSize(value)}`;
  let replaced = false;
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
      if (pattern.test(lines[i])) {
        lines[i] = rendered;
        replaced = true;
      }
      if (/^(?:\/\/|#)\s*@/.test(trimmed)) insertAt = i + 1;
      continue;
    }
    if (!trimmed) continue;
    break;
  }
  if (!replaced) {
    lines.splice(insertAt, 0, rendered);
  }
  let out = lines.join(newline);
  if (hadTrailingNewline) out += newline;
  return out;
}

function isSafeLayerFile(dataRepo, relPath) {
  if (typeof relPath !== 'string' || !relPath || relPath.includes('..')) return false;
  const normalized = relPath.replace(/\\/g, '/');
  if (!normalized.startsWith('layers/') || !normalized.endsWith('.csv')) return false;
  const root = path.resolve(dataRepo, 'layers') + path.sep;
  const abs = path.resolve(dataRepo, normalized);
  return abs.startsWith(root);
}

function walkCsvFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkCsvFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith('.csv')) out.push(full);
  }
  return out;
}

function readIndex(dataRepo) {
  const indexPath = path.join(dataRepo, 'dist-index', 'layers-index.json');
  if (!fs.existsSync(indexPath)) return { indexPath: null, index: null };
  try {
    return { indexPath, index: JSON.parse(fs.readFileSync(indexPath, 'utf8')) };
  } catch {
    return { indexPath: null, index: null };
  }
}

function locateLayerCsv(dataRepo, id) {
  const { indexPath, index } = readIndex(dataRepo);
  const indexed = index?.byId?.[id]?.file;
  if (isSafeLayerFile(dataRepo, indexed)) {
    return { csvPath: path.resolve(dataRepo, indexed), indexPath, index };
  }
  const idPattern = new RegExp(`^\\s*//\\s*@id\\s*[:=]\\s*${id}\\s*$`);
  for (const csvPath of walkCsvFiles(path.join(dataRepo, 'layers'))) {
    const text = fs.readFileSync(csvPath, 'utf8');
    if (text.split(/\r?\n/).some((line) => idPattern.test(line))) {
      return { csvPath, indexPath, index };
    }
  }
  throw new Error(`layer not found: ${id}`);
}

function stampIndex(node, id, sizes) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) stampIndex(item, id, sizes);
    return;
  }
  if (node.id === id && typeof node.file === 'string') {
    Object.assign(node, sizes);
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') stampIndex(value, id, sizes);
  }
}

/**
 * Write label/text/image sizes into the layer CSV `// @` block and the local layers index.
 * `body` is `{ id, labelSize?, textSize?, imageSize? }`.
 */
export function applyLayerSizes(dataRepo, body) {
  const id = String(body?.id || '').trim();
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error('invalid layer id');
  }
  const sizes = {};
  for (const key of SIZE_KEYS) {
    if (body[key] === undefined || body[key] === null || body[key] === '') continue;
    sizes[key] = clampLayerSize(body[key]);
  }
  if (Object.keys(sizes).length === 0) {
    throw new Error('no sizes');
  }

  const { csvPath, indexPath, index } = locateLayerCsv(dataRepo, id);
  let csv = fs.readFileSync(csvPath, 'utf8');
  for (const [key, value] of Object.entries(sizes)) {
    csv = upsertDirective(csv, key, value);
  }
  fs.writeFileSync(csvPath, csv);

  if (index && indexPath) {
    stampIndex(index, id, sizes);
    fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  }

  return { ok: true, id, ...sizes };
}
