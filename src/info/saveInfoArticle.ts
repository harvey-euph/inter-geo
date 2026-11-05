export class InfoArticleError extends Error {
  written: boolean;

  constructor(message: string, written = false) {
    super(message);
    this.name = 'InfoArticleError';
    this.written = written;
  }
}

export interface NewInfoArticlePayload {
  file: string;
  title: string;
  id?: string;
  previousId?: string;
  targets: string[] | string;
  icon?: string;
  accent?: string;
  tags?: string[] | string;
  priority?: number | string;
  layer?: string;
  image?: string;
  imageSize?: string;
  imagePosition?: string;
  imageAlt?: string;
  comparison?: string[] | string;
  display?: boolean;
  content?: string;
  rawMarkdown?: string;
}

export interface AppendInfoBulletPayload {
  file: string;
  cardId: string;
  text: string;
  title?: never;
  rawMarkdown?: never;
}

export interface DeleteInfoArticlePayload {
  op: 'delete';
  file: string;
  cardId: string;
}

export type SaveInfoArticlePayload = NewInfoArticlePayload | AppendInfoBulletPayload | DeleteInfoArticlePayload;

export interface SaveInfoArticleResponse {
  ok: boolean;
  file: string;
  cardId: string;
  title?: string;
  op?: string;
  deprecatedFile?: string;
  changed: boolean;
  indexed: boolean;
}

export function normalizeInfoFilePath(rawFile?: string): string {
  const clean = (rawFile || '')
    .replace(/\\/g, '/')
    .trim()
    .replace(/^\/+/, '')
    .replace(/^info\/+/, '');
  const base = clean || 'note.md';
  return `info/${base.endsWith('.md') ? base : `${base}.md`}`;
}

export async function deleteInfoArticle(params: { file: string; cardId: string }): Promise<SaveInfoArticleResponse> {
  return saveInfoArticle({ op: 'delete', file: params.file, cardId: params.cardId });
}

export async function saveInfoArticle(body: SaveInfoArticlePayload): Promise<SaveInfoArticleResponse> {
  const normalizedFile = normalizeInfoFilePath(body.file);
  const normalizedBody = { ...body, file: normalizedFile };

  const base = (import.meta.env.BASE_URL || '/inter-geo/').replace(/\/+$/, '');
  const targetUrl = `${base}/@dev/info-article`;
  let res = await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizedBody)
  });

  if (res.status === 404 && base) {
    try {
      const fallbackRes = await fetch('/@dev/info-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedBody)
      });
      if (fallbackRes.ok || fallbackRes.status !== 404) {
        res = fallbackRes;
      }
    } catch {
      // keep original res
    }
  }

  let data: { ok?: boolean; error?: string; written?: boolean; file?: string; cardId?: string; title?: string; changed?: boolean; indexed?: boolean };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    data = {};
  }
  if (!res.ok || data.ok === false) {
    throw new InfoArticleError(data.error || `寫入失敗 (${res.status})`, Boolean(data.written));
  }
  return data as SaveInfoArticleResponse;
}
