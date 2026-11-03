export function clampLayerSize(value: number): number;
export function formatLayerSize(value: number): string;
export function upsertDirective(csvText: string, key: string, value: number): string;
export function applyLayerSizes(
  dataRepo: string,
  body: { id?: string; labelSize?: number; textSize?: number; imageSize?: number }
): { ok: boolean; id: string; labelSize?: number; textSize?: number; imageSize?: number };
