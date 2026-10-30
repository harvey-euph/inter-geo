import { getCsvLayerById } from './csvLayerRegistry';
import { getNationwideLayerById } from '../data/nationwideLayers';

/**
 * Extracts all `layer` parameters from URL query string.
 * Supports both repeated `layer=a&layer=b` and comma-separated `layer=a,b`.
 */
export function parseLayersFromUrl(searchParams: URLSearchParams): string[] {
  const rawList = searchParams.getAll('layer');
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of rawList) {
    const parts = item.split(',');
    for (const p of parts) {
      const trimmed = p.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        result.push(trimmed);
      }
    }
  }
  return result;
}

/**
 * Returns true if the layer is a 2D FillWithColor region coloring layer.
 */
export function isLayerFillColor(layerId: string): boolean {
  if (layerId === 'base' || layerId === 'none') return true;
  const csv = getCsvLayerById(layerId);
  if (csv) {
    if (csv.type === 'FillWithColor' && csv.group !== 'area-feature') return true;
    if (csv.group === 'fill-region' || csv.group === 'fill-region-with-color') return true;
  }
  const nationwide = getNationwideLayerById(layerId);
  if (nationwide && nationwide.layerType === 'coloring') return true;
  return false;
}

/**
 * Returns the `@goto` query string defined on the layer, if any.
 */
export function getLayerGoto(layerId: string): string | undefined {
  const csv = getCsvLayerById(layerId);
  return csv?.goto || csv?.meta?.goto;
}

/**
 * Returns true if any layer in the list defines a `@goto` query.
 */
export function checkAnyLayerHasGoto(layerIds: string[]): boolean {
  return layerIds.some((id) => Boolean(getLayerGoto(id)));
}

/**
 * Gathers all currently active layer IDs into a unique list.
 */
export function getActiveLayersList(
  filterId: string,
  textFilters: Set<string>,
  imageFilter: string | null,
  regionalFilters: Set<string>
): string[] {
  const list: string[] = [];
  if (filterId && filterId !== 'base' && filterId !== 'none') {
    list.push(filterId);
  }
  for (const id of textFilters) {
    if (!list.includes(id)) list.push(id);
  }
  if (imageFilter && !list.includes(imageFilter)) {
    list.push(imageFilter);
  }
  for (const id of regionalFilters) {
    if (id === 'eu-pedestrian-crossing' && list.includes('pedestrian-crossing')) continue;
    if (id === 'pedestrian-crossing' && list.includes('eu-pedestrian-crossing')) continue;
    if (!list.includes(id)) list.push(id);
  }
  return list;
}
