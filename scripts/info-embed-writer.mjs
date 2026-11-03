import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function rebuildIndexes(dataRepo) {
  const script = path.join(dataRepo, 'scripts', 'build-indexes.mjs');
  if (!fs.existsSync(script)) return;
  spawnSync(process.execPath, [script], {
    cwd: dataRepo,
    encoding: 'utf8',
    timeout: 50000
  });
}

const TOKEN_RE = /^!?\[[^\]]{0,800}\]\([^)\r\n]{1,2000}\)$/;

function isEmbedToken(value) {
  return typeof value === 'string' && TOKEN_RE.test(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findCardSection(text, cardId) {
  const idRe = new RegExp(`^-\\s*id\\s*[:=]\\s*${escapeRegExp(cardId)}\\s*$`, 'm');
  const starts = [];
  const headingRe = /^# /gm;
  let match = headingRe.exec(text);
  while (match) {
    starts.push(match.index);
    match = headingRe.exec(text);
  }
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : text.length;
    const body = text.slice(start, end);
    if (idRe.test(body)) return { start, end, body };
  }
  return null;
}

function findNth(haystack, needle, index) {
  let from = 0;
  for (let n = 0; n <= index; n++) {
    const found = haystack.indexOf(needle, from);
    if (found === -1) return -1;
    if (n === index) return found;
    from = found + needle.length;
  }
  return -1;
}

function countBefore(haystack, needle, end) {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  while (count <= 50) {
    const found = haystack.indexOf(needle, from);
    if (found === -1 || found >= end) return count;
    count += 1;
    from = found + needle.length;
  }
  return count;
}

function insertBullet(sectionBody, token) {
  const line = `- ${token}`;
  const trailing = sectionBody.match(/\s*$/)?.[0] ?? '';
  const head = sectionBody.slice(0, sectionBody.length - trailing.length);
  const prefix = head.length === 0 || head.endsWith('\n') ? '' : '\n';
  const keptTrailing = trailing.replace(/^\r?\n/, '');
  return {
    text: `${head}${prefix}${line}\n${keptTrailing}`,
    index: countBefore(sectionBody, token, sectionBody.length)
  };
}

function deleteNthToken(sectionBody, token, index) {
  const found = findNth(sectionBody, token, index);
  if (found === -1) return null;
  const lineStart = sectionBody.lastIndexOf('\n', found - 1) + 1;
  const lineBreak = sectionBody.indexOf('\n', found);
  const lineEnd = lineBreak === -1 ? sectionBody.length : lineBreak;
  const line = sectionBody.slice(lineStart, lineEnd);
  const bullet = line.match(/^[ \t]*[-*][ \t]+([\s\S]*)$/);
  if (bullet && bullet[1].trim() === token) {
    const cutEnd = lineBreak === -1 ? sectionBody.length : lineBreak + 1;
    return sectionBody.slice(0, lineStart) + sectionBody.slice(cutEnd);
  }
  return sectionBody.slice(0, found) + sectionBody.slice(found + token.length);
}

/**
 * Insert, replace, or delete one street-view markdown token inside an info card.
 * `body` is `{ file, cardId, op?, from?, to?, index? }`.
 * `op` is `replace` (default), `insert`, or `delete`.
 * `file` is relative to the data repo, for example `info/taiwan-grid.md`.
 */
export function applyInfoEmbed(dataRepo, body) {
  const file = String(body?.file || '').replace(/\\/g, '/');
  if (!/^info\/[A-Za-z0-9._-]+\.md$/.test(file)) {
    throw new Error('invalid info file');
  }
  const cardId = String(body?.cardId || '').trim();
  if (!cardId || /[\r\n/]/.test(cardId) || cardId.length > 160) {
    throw new Error('invalid card id');
  }
  const op = body?.op === undefined || body?.op === null || body?.op === '' ? 'replace' : String(body.op);
  if (op !== 'replace' && op !== 'insert' && op !== 'delete') {
    throw new Error('invalid embed op');
  }
  const from = String(body?.from || '');
  const to = String(body?.to || '').trim();
  if (op === 'insert') {
    if (!isEmbedToken(to)) throw new Error('invalid embed');
  } else if (op === 'delete') {
    if (!isEmbedToken(from)) throw new Error('invalid embed');
  } else if (!isEmbedToken(from) || !isEmbedToken(to)) {
    throw new Error('invalid embed');
  }
  const index = op === 'insert' ? 0 : body?.index === undefined ? 0 : Number(body.index);
  if (!Number.isInteger(index) || index < 0 || index > 50) {
    throw new Error('invalid embed index');
  }

  const root = path.resolve(dataRepo, 'info') + path.sep;
  const abs = path.resolve(dataRepo, file);
  if (!abs.startsWith(root)) {
    throw new Error('invalid info file');
  }
  if (!fs.existsSync(abs)) {
    throw new Error(`info file not found: ${file}`);
  }

  const text = fs.readFileSync(abs, 'utf8');
  const section = findCardSection(text, cardId);
  if (!section) {
    throw new Error(`card not found: ${cardId}`);
  }
  let nextBody = section.body;
  let resultIndex = index;
  if (op === 'insert') {
    const inserted = insertBullet(section.body, to);
    nextBody = inserted.text;
    resultIndex = inserted.index;
  } else if (op === 'delete') {
    const deleted = deleteNthToken(section.body, from, index);
    if (deleted === null) throw new Error('embed not found');
    nextBody = deleted;
  } else {
    const located = findNth(section.body, from, index);
    if (located === -1) throw new Error('embed not found');
    nextBody = section.body.slice(0, located) + to + section.body.slice(located + from.length);
    resultIndex = countBefore(nextBody, to, located);
  }
  if (nextBody !== section.body) {
    fs.writeFileSync(abs, text.slice(0, section.start) + nextBody + text.slice(section.end));
    rebuildIndexes(dataRepo);
  }
  return { ok: true, file, cardId, changed: nextBody !== section.body, index: resultIndex };
}
