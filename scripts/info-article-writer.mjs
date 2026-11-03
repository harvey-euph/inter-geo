import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const MAX_BODY_CHARS = 50000;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fail(message, written = false) {
  const err = new Error(message);
  err.written = written;
  return err;
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function findCardSection(text, cardId) {
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

function appendLine(sectionBody, line) {
  const trailing = sectionBody.match(/\s*$/)?.[0] ?? '';
  const head = sectionBody.slice(0, sectionBody.length - trailing.length);
  const prefix = head.length === 0 || head.endsWith('\n') ? '' : '\n';
  const keptTrailing = trailing.replace(/^\r?\n/, '');
  return `${head}${prefix}${line}\n${keptTrailing}`;
}

function sectionEndsWithLine(sectionBody, line) {
  const trimmedEnd = sectionBody.replace(/\s*$/, '');
  return trimmedEnd === line || trimmedEnd.endsWith(`\n${line}`);
}

function normalizeBulletText(raw) {
  let text = String(raw ?? '').replace(/\u00a0/g, ' ').trim();
  if (!text || /^[-*]+$/.test(text)) throw fail('文章是空的');
  if (/[\r\n]/.test(text)) throw fail('文章請寫成一行');
  text = text.replace(/^[-*]\s+/, '').trim();
  if (!text || /^[-*]+$/.test(text)) throw fail('文章是空的');
  if (text.startsWith('#')) throw fail('文章不能以 # 開頭');
  if (/^[A-Za-z0-9_-]+\s*:/.test(text)) throw fail('這行會被當成卡片設定');
  return text;
}

function rebuildIndexes(dataRepo) {
  const script = path.join(dataRepo, 'scripts', 'build-indexes.mjs');
  if (!fs.existsSync(script)) {
    throw fail('找不到 build-indexes.mjs', true);
  }
  const result = spawnSync(process.execPath, [script], {
    cwd: dataRepo,
    encoding: 'utf8',
    timeout: 50000
  });
  if (result.error || result.status !== 0) {
    const tail = `${result.stderr || ''}\n${result.stdout || ''}\n${result.error?.message || ''}`
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-2)
      .join(' ')
      .slice(0, 300);
    throw fail(tail ? `索引更新失敗：${tail}` : '索引更新失敗', true);
  }
}

/**
 * Format a structured info card article into a full `# 標題` markdown section.
 */
function formatCardSection({
  title,
  id,
  targets,
  icon,
  accent,
  tags,
  priority,
  layer,
  image,
  content
}) {
  const cleanTitle = String(title || '').replace(/^#\s*/, '').trim();
  if (!cleanTitle) throw fail('請輸入文章標題');

  const metaLines = [];
  if (id) metaLines.push(`- id: ${id}`);
  if (targets) {
    const tStr = Array.isArray(targets) ? targets.join(', ') : String(targets);
    if (tStr.trim()) metaLines.push(`- targets: ${tStr.trim()}`);
  }
  if (icon) metaLines.push(`- icon: ${icon}`);
  if (accent) metaLines.push(`- accent: ${accent}`);
  if (tags) {
    const tagStr = Array.isArray(tags) ? tags.join(', ') : String(tags);
    if (tagStr.trim()) metaLines.push(`- tags: ${tagStr.trim()}`);
  }
  if (priority !== undefined && priority !== null && String(priority).trim() !== '') {
    metaLines.push(`- priority: ${priority}`);
  }
  if (layer && String(layer).trim()) metaLines.push(`- layer: ${String(layer).trim()}`);
  if (image && String(image).trim()) metaLines.push(`- image: ${String(image).trim()}`);

  let body = String(content || '').trim();
  if (body) {
    const lines = body.split(/\r?\n/).map((l) => {
      const trimmed = l.trim();
      if (!trimmed) return '';
      if (/^[-*]\s+/.test(trimmed) || trimmed.startsWith('#') || trimmed.startsWith('<!--')) {
        return l;
      }
      return `- ${trimmed}`;
    }).filter(Boolean);
    body = lines.join('\n');
  }

  const metaBlock = metaLines.length > 0 ? `${metaLines.join('\n')}\n` : '';
  const bodyBlock = body ? `\n${body}\n` : '\n';
  return `# ${cleanTitle}\n${metaBlock}${bodyBlock}`;
}

/**
 * Parse a raw markdown text string into title, id, and sanitized section.
 */
function parseRawCardSection(rawMarkdown, fallbackId) {
  const text = String(rawMarkdown || '').trim();
  if (!text) throw fail('文章內容是空的');
  if (!text.startsWith('#')) throw fail('文章必須以 # 標題開頭');

  const lines = text.split(/\r?\n/);
  const firstLine = lines[0].trim();
  const titleMatch = firstLine.match(/^#\s+(.+)$/);
  if (!titleMatch) throw fail('無效的 # 標題');
  const title = titleMatch[1].trim();

  const idMatch = text.match(/^-\s*id\s*[:=]\s*([A-Za-z0-9_-]+)/im);
  let id = idMatch ? idMatch[1].trim() : (fallbackId || slugify(title) || `card-${Date.now().toString(36)}`);

  if (!idMatch) {
    // Inject - id: right after heading
    lines.splice(1, 0, `- id: ${id}`);
    return { title, id, sectionText: `${lines.join('\n')}\n` };
  }
  return { title, id, sectionText: `${text}\n` };
}

/**
 * Post a new info card article (`# 標題`), update an existing card, or append a bullet.
 *
 * For full info card article:
 * `body` contains `title` or `rawMarkdown` (or `markdown`), along with optional `id`, `targets`, `icon`, `accent`, `tags`, `priority`, `content`.
 *
 * For single bullet append:
 * `body` contains `cardId` and `text`.
 */
export function applyInfoArticle(dataRepo, body) {
  let file = String(body?.file || '').replace(/\\/g, '/').trim();
  if (!file) {
    file = 'info/note.md';
  } else if (!file.startsWith('info/')) {
    file = `info/${file}`;
  }
  if (!/^info\/[A-Za-z0-9._-]+\.md$/.test(file)) {
    throw fail('無效的 info 檔案路徑');
  }

  const root = path.resolve(dataRepo, 'info') + path.sep;
  const abs = path.resolve(dataRepo, file);
  if (!abs.startsWith(root)) {
    throw fail('無效的 info 檔案路徑');
  }

  // Ensure info directory exists
  const parentDir = path.dirname(abs);
  try {
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
  } catch {
    // Directory might already exist
  }

  const original = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';

  // Case 0: Deleting a card and moving it to null.md.deprecated
  if (body?.op === 'delete') {
    const cardId = String(body.cardId || body.id || '').trim();
    if (!cardId || /[\r\n/]/.test(cardId)) {
      throw fail('無效的 cardId');
    }
    const section = findCardSection(original, cardId);
    if (!section) {
      throw fail(`找不到欲刪除的卡片：${cardId}`);
    }

    // Cut from original file
    const beforeSection = original.slice(0, section.start);
    const afterSection = original.slice(section.end);
    const nextSourceContent = `${beforeSection}${afterSection}`.replace(/\n{3,}/g, '\n\n').trim() + '\n';
    fs.writeFileSync(abs, nextSourceContent, 'utf8');

    // Append to null.md.deprecated (guaranteed not to be indexed because extension is .deprecated, not .md)
    const deprecatedPath = path.resolve(dataRepo, 'info', 'null.md.deprecated');
    const timestamp = new Date().toISOString();
    const deprecatedHeader = `\n\n<!-- ========================================== -->\n<!-- [DEPRECATED ARCHIVE] Deleted on ${timestamp} from ${file} -->\n`;
    const deprecatedBody = `${section.body.trim()}\n`;
    fs.appendFileSync(deprecatedPath, `${deprecatedHeader}${deprecatedBody}`, 'utf8');

    rebuildIndexes(dataRepo);
    return {
      ok: true,
      op: 'delete',
      file,
      cardId,
      deprecatedFile: 'info/null.md.deprecated',
      changed: true,
      indexed: true
    };
  }

  // Case 1: Appending a single bullet to an existing card (legacy / bullet mode)
  if (body?.cardId && body?.text && !body?.title && !body?.rawMarkdown && !body?.markdown) {
    const cardId = String(body.cardId).trim();
    if (!cardId || /[\r\n/]/.test(cardId) || cardId.length > 160) {
      throw fail('無效的 cardId');
    }
    const text = normalizeBulletText(body.text);
    const line = `- ${text}`;

    const section = findCardSection(original, cardId);
    if (!section) {
      throw fail(`找不到卡片：${cardId}`);
    }

    let changed = false;
    if (!sectionEndsWithLine(section.body, line)) {
      const nextBody = appendLine(section.body, line);
      fs.writeFileSync(abs, original.slice(0, section.start) + nextBody + original.slice(section.end), 'utf8');
      changed = true;
    }

    rebuildIndexes(dataRepo);
    return { ok: true, file, cardId, changed, indexed: true };
  }

  // Case 2: Posting or updating a full Info Card article (`# 標題`)
  let title = '';
  let cardId = '';
  let cardSectionText = '';

  const rawMd = body?.rawMarkdown || body?.markdown;
  if (rawMd) {
    if (String(rawMd).length > MAX_BODY_CHARS) throw fail('文章內容過長');
    const parsed = parseRawCardSection(rawMd, body?.id);
    title = parsed.title;
    cardId = parsed.id;
    cardSectionText = parsed.sectionText;
  } else {
    title = String(body?.title || '').trim();
    if (!title) throw fail('請輸入文章標題');
    cardId = String(body?.id || '').trim();
    if (!cardId) {
      cardId = slugify(title) || `card-${Date.now().toString(36)}`;
    }
    if (/[\r\n/]/.test(cardId) || cardId.length > 160) {
      throw fail('無效的 cardId');
    }
    cardSectionText = formatCardSection({
      title,
      id: cardId,
      targets: body?.targets,
      icon: body?.icon,
      accent: body?.accent,
      tags: body?.tags,
      priority: body?.priority,
      layer: body?.layer,
      image: body?.image,
      content: body?.content
    });
  }

  const existingSection = original ? findCardSection(original, cardId) : null;
  let nextFileContent = '';

  if (existingSection) {
    // Replace the existing section with the new section
    nextFileContent = original.slice(0, existingSection.start) + cardSectionText + original.slice(existingSection.end);
  } else {
    // Append the new section to the file
    const trailing = original.endsWith('\n\n') ? '' : original.endsWith('\n') ? '\n' : original.length > 0 ? '\n\n' : '';
    nextFileContent = `${original}${trailing}${cardSectionText}`;
  }

  fs.writeFileSync(abs, nextFileContent, 'utf8');
  rebuildIndexes(dataRepo);
  return { ok: true, file, cardId, title, changed: true, indexed: true };
}
