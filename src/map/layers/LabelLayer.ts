import type { Map as MapLibreMap } from 'maplibre-gl';

export class LabelLayer {
  public static readonly LAYER_ID = 'admin-labels';

  public static setVisibility(map: MapLibreMap, visible: boolean): void {
    if (map.getLayer(LabelLayer.LAYER_ID)) {
      map.setLayoutProperty(LabelLayer.LAYER_ID, 'visibility', visible ? 'visible' : 'none');
    }
  }

  public static setLanguage(map: MapLibreMap, lang: 'zh' | 'en'): void {
    if (map.getLayer(LabelLayer.LAYER_ID)) {
      const field = lang === 'zh' ? ['get', 'nameZh'] : ['get', 'nameEn'];
      map.setLayoutProperty(LabelLayer.LAYER_ID, 'text-field', field as unknown as string);
    }
  }
}
