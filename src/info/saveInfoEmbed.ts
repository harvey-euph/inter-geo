export interface InfoEmbedSave {
  file: string;
  cardId: string;
  op?: 'replace' | 'insert' | 'delete';
  from?: string;
  to?: string;
  index?: number;
}

const EMBED_TOKEN_RE = /^!?\[[^\]]{0,800}\]\([^)\r\n]{1,2000}\)$/;

export function isInfoEmbedToken(value: string): boolean {
  return EMBED_TOKEN_RE.test(value.trim());
}

export async function saveInfoEmbed(body: InfoEmbedSave): Promise<{ index: number }> {
  const base = (import.meta.env.BASE_URL || '/inter-geo/').replace(/\/+$/, '');
  const targetUrl = `${base}/@dev/info-embed`;
  let res = await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (res.status === 404 && base) {
    try {
      const fallbackRes = await fetch('/@dev/info-embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (fallbackRes.ok || fallbackRes.status !== 404) {
        res = fallbackRes;
      }
    } catch {
      // ignore
    }
  }

  let data: { error?: string; index?: number };
  try {
    data = (await res.json()) as { error?: string; index?: number };
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new Error(data.error || `寫入失敗 (${res.status})`);
  }
  return { index: typeof data.index === 'number' ? data.index : body.index ?? 0 };
}
