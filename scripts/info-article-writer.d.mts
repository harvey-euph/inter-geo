export interface ApplyInfoArticleResult {
  ok: boolean;
  file: string;
  cardId: string;
  title?: string;
  op?: string;
  deprecatedFile?: string;
  changed: boolean;
  indexed: boolean;
}

export function applyInfoArticle(
  dataRepo: string,
  body: {
    op?: 'upsert' | 'delete';
    file?: string;
    cardId?: string;
    title?: string;
    id?: string;
    targets?: string[] | string;
    icon?: string;
    accent?: string;
    tags?: string[] | string;
    priority?: number | string;
    layer?: string;
    image?: string;
    content?: string;
    rawMarkdown?: string;
    markdown?: string;
    text?: string;
  }
): ApplyInfoArticleResult;
