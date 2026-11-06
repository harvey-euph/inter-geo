import type { Map as MapLibreMap } from 'maplibre-gl';

export class BoundaryLayer {
  public static readonly LAYER_IDS = ['adm0-boundary', 'adm1-boundary', 'adm2-boundary'] as const;

  public static setVisibility(map: MapLibreMap, level: 0 | 1 | 2, visible: boolean): void {
    const layerId = `adm${level}-boundary`;
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }
  }

  public static setLineWidth(map: MapLibreMap, level: 0 | 1 | 2, width: number): void {
    const layerId = `adm${level}-boundary`;
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'line-width', width);
    }
  }
}
