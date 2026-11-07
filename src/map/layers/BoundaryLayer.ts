import type { Map as MapLibreMap } from 'maplibre-gl';

export class BoundaryLayer {
  public static readonly LAYER_IDS = [
    'adm0-boundary',
    'adm0-boundary-inner',
    'adm1-boundary',
    'adm1-boundary-inner',
    'adm2-boundary',
    'adm2-boundary-inner'
  ] as const;

  public static setVisibility(map: MapLibreMap, level: 0 | 1 | 2, visible: boolean): void {
    const baseId = `adm${level}-boundary`;
    const innerId = `adm${level}-boundary-inner`;
    if (map.getLayer(baseId)) {
      map.setLayoutProperty(baseId, 'visibility', visible ? 'visible' : 'none');
    }
    if (map.getLayer(innerId)) {
      map.setLayoutProperty(innerId, 'visibility', visible ? 'visible' : 'none');
    }
  }

  public static setLineWidth(map: MapLibreMap, level: 0 | 1 | 2, width: number): void {
    const baseId = `adm${level}-boundary`;
    if (map.getLayer(baseId)) {
      map.setPaintProperty(baseId, 'line-width', width);
    }
  }
}
