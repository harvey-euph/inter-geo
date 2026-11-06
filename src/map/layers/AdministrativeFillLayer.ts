import type { Map as MapLibreMap } from 'maplibre-gl';

export class AdministrativeFillLayer {
  public static readonly LAYER_IDS = ['adm0-fill', 'adm1-fill', 'adm2-fill'] as const;

  public static setVisibility(map: MapLibreMap, level: 0 | 1 | 2, visible: boolean): void {
    const layerId = `adm${level}-fill`;
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    }
  }

  public static setOpacity(map: MapLibreMap, level: 0 | 1 | 2, opacity: number): void {
    const layerId = `adm${level}-fill`;
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'fill-opacity', opacity);
    }
  }
}
