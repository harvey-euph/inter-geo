export function applyInfoEmbed(
  dataRepo: string,
  body: {
    file?: string;
    cardId?: string;
    op?: string;
    from?: string;
    to?: string;
    index?: number;
  }
): { ok: boolean; file: string; cardId: string; changed: boolean; index: number };
