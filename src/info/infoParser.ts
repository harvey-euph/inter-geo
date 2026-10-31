import type { InfoCard, InfoItem } from '../types/info';

type YamlValue = string | string[];

const METADATA_KEY =
  /^(id|title|targets?|icon|accent|color|tags?|type|priority|comparison|image|imagesize|imageposition|imagealt|display|layers?)$/i;

/**
 * Parses raw YAML-like string lines into key-value map
 */
function parseYamlBlock(yamlLines: string[]): Record<string, YamlValue> {
  const meta: Record<string, YamlValue> = {};
  for (const line of yamlLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
    let valStr = trimmed.slice(colonIdx + 1).trim();

    if ((valStr.startsWith('"') && valStr.endsWith('"')) || (valStr.startsWith("'") && valStr.endsWith("'"))) {
      valStr = valStr.slice(1, -1);
    }

    if (valStr.startsWith('[') && valStr.endsWith(']')) {
      const inner = valStr.slice(1, -1).trim();
      meta[key] = inner
        ? inner.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        : [];
    } else if (valStr.includes(',') && !valStr.startsWith('{')) {
      meta[key] = valStr.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
    } else {
      meta[key] = valStr;
    }
  }
  return meta;
}

function getString(val: YamlValue | undefined, fallback = ''): string {
  if (!val) return fallback;
  if (Array.isArray(val)) return val.join(', ') || fallback;
  return String(val) || fallback;
}

function getBoolean(val: YamlValue | undefined): boolean | undefined {
  if (val === undefined || Array.isArray(val)) return undefined;
  const normalized = val.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

/**
 * Extracts label and content from a long bullet point line
 */
function parseBulletLine(lineText: string): { label?: string; content: string } {
  const trimmed = lineText.trim();
  const boldMatch = trimmed.match(/^\*\*(.+?)\*\*[:：]?\s*(.*)$/);
  if (boldMatch) {
    return {
      label: boldMatch[1].trim(),
      content: boldMatch[2].trim()
    };
  }

  const bracketMatch = trimmed.match(/^【(.+?)】[:：]?\s*(.*)$/);
  if (bracketMatch) {
    return {
      label: `【${bracketMatch[1].trim()}】`,
      content: bracketMatch[2].trim()
    };
  }

  return { content: trimmed };
}

/**
 * Parses long markdown body lines into structured InfoItem[].
 * Short lines are removed before this runs.
 */
function parseItemsFromLines(bodyLines: string[]): InfoItem[] {
  const items: InfoItem[] = [];
  let currentItem: InfoItem | null = null;

  for (let i = 0; i < bodyLines.length; i++) {
    const rawLine = bodyLines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const isIndented = /^(\s{2,}|\t)[-*]\s+/.test(rawLine);

    if (isIndented && currentItem) {
      const subContent = trimmed.replace(/^[-*]\s+/, '').trim();
      if (!currentItem.subItems) {
        currentItem.subItems = [];
      }
      currentItem.subItems.push(subContent);
    } else if (/^[-*]\s+/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[-*]\s+/, '').trim();
      const { label, content } = parseBulletLine(bulletText);

      currentItem = {
        raw: bulletText,
        label,
        content,
        subItems: []
      };
      items.push(currentItem);
    } else if (currentItem) {
      if (currentItem.content) {
        currentItem.content += ` ${trimmed}`;
      } else {
        currentItem.content = trimmed;
      }
    }
  }

  return items;
}

/**
 * Parses a single section of Markdown text into an InfoCard
 */
function parseSingleSection(sectionText: string, sourceFile: string, sectionIndex: number): InfoCard | null {
  const lines = sectionText.split(/\r?\n/);
  let meta: Record<string, YamlValue> = {};
  const bodyLines: string[] = [];
  let titleFromH1: string | null = null;
  const frontmatterLines: string[] = [];

  let lineIdx = 0;
  if (lines[0] && lines[0].trim() === '---') {
    lineIdx = 1;
    while (lineIdx < lines.length) {
      const l = lines[lineIdx];
      if (l.trim() === '---') {
        lineIdx++;
        break;
      }
      frontmatterLines.push(l);
      lineIdx++;
    }
    meta = parseYamlBlock(frontmatterLines);
  }

  const remainingLines = lines.slice(lineIdx);
  const metadataListLines: string[] = [];
  let inMetadataList = true;

  for (let i = 0; i < remainingLines.length; i++) {
    const line = remainingLines[i];
    const trimmed = line.trim();

    if (!titleFromH1 && /^#\s+/.test(trimmed)) {
      titleFromH1 = trimmed.replace(/^#\s+/, '').trim();
      continue;
    }

    if (inMetadataList && /^-\s*([a-z]+)[:=]\s*/i.test(trimmed)) {
      const key = trimmed.match(/^-\s*([a-z]+)[:=]\s*/i)?.[1] || '';
      if (METADATA_KEY.test(key)) {
        metadataListLines.push(trimmed.replace(/^-\s*/, ''));
        continue;
      }
    }

    if (trimmed) {
      inMetadataList = false;
      bodyLines.push(line);
    }
  }

  if (metadataListLines.length > 0) {
    const listMeta = parseYamlBlock(metadataListLines);
    meta = { ...meta, ...listMeta };
  }

  const title = getString(meta.title, titleFromH1 || `Info ${sectionIndex + 1}`);
  const rawId = getString(meta.id, title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, '-'));
  const id = rawId.replace(/^-+|-+$/g, '') || `info-${sectionIndex + 1}`;

  let targets: string[] = [];
  if (Array.isArray(meta.targets)) {
    targets = meta.targets.map((t) => String(t).trim().toUpperCase());
  } else if (meta.targets) {
    targets = String(meta.targets)
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
  } else if (meta.target) {
    targets = [String(meta.target).trim().toUpperCase()];
  }

  let tags: string[] = [];
  if (Array.isArray(meta.tags)) {
    tags = meta.tags.map((t) => String(t).trim());
  } else if (meta.tags) {
    tags = String(meta.tags)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  const items = parseItemsFromLines(bodyLines);

  if (items.length === 0 && bodyLines.length > 0) {
    const content = bodyLines
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('<!--'))
      .join('\n')
      .trim();
    if (content) {
      items.push({
        raw: content,
        content
      });
    }
  }

  if (!title && items.length === 0) {
    return null;
  }

  const comparisonTargets = Array.isArray(meta.comparison)
    ? meta.comparison.map((t) => String(t).trim().toUpperCase())
    : meta.comparison
    ? String(meta.comparison).split(',').map((t) => t.trim().toUpperCase())
    : targets.length > 1 && (meta.type === 'comparison' || tags.includes('比較') || tags.includes('跨區比較'))
    ? targets
    : undefined;

  const typeStr = meta.type ? getString(meta.type) : undefined;
  const targetType = (typeStr || (comparisonTargets ? 'comparison' : undefined)) as InfoCard['targetType'];
  const priorityStr = meta.priority ? getString(meta.priority) : undefined;
  const priority = priorityStr ? parseInt(priorityStr, 10) : undefined;
  const image = meta.image ? getString(meta.image) : undefined;
  const imageSize = meta.imagesize ? getString(meta.imagesize) : undefined;
  const imagePosition = (meta.imageposition ? getString(meta.imageposition).toLowerCase() : undefined) as InfoCard['imagePosition'];
  const imageAlt = meta.imagealt ? getString(meta.imagealt) : undefined;
  const display = getBoolean(meta.display);
  const layer = meta.layer || meta.layers ? getString(meta.layer || meta.layers).trim() : undefined;

  return {
    id,
    title,
    icon: getString(meta.icon, '💡'),
    accentColor: getString(meta.accent || meta.color || meta.accentcolor, '#fbbf24'),
    targets: targets.length > 0 ? targets : ['*'],
    targetType,
    tags,
    image,
    imageSize,
    imagePosition,
    imageAlt,
    display,
    items,
    comparisonTargets,
    sourceFile,
    priority: isNaN(Number(priority)) ? undefined : priority,
    layer: layer || undefined
  };
}

/**
 * Parses full raw Markdown file content; every top-level `#` heading starts one card.
 */
export function parseMarkdownInfo(fileContent: string, fileName: string): InfoCard[] {
  if (!fileContent || !fileContent.trim()) return [];

  const cards: InfoCard[] = [];
  const h1Matches = Array.from(fileContent.matchAll(/^#\s+[^\r\n]+/gm));
  if (h1Matches.length > 0) {
    for (let i = 0; i < h1Matches.length; i++) {
      const start = h1Matches[i].index!;
      const end = i < h1Matches.length - 1 ? h1Matches[i + 1].index! : fileContent.length;
      const sectionStr = fileContent.slice(start, end).trim();
      const card = parseSingleSection(sectionStr, fileName, i);
      if (card) cards.push(card);
    }
  } else {
    const card = parseSingleSection(fileContent.trim(), fileName, 0);
    if (card) cards.push(card);
  }

  return cards;
}
