import type { Map as MapLibreMap } from 'maplibre-gl';

export class ImageMarkerLayer {
  public static readonly LAYER_ID = 'image-markers-layer';

  public static async registerImage(
    map: MapLibreMap,
    id: string,
    url: string
  ): Promise<void> {
    if (map.hasImage(id)) return;

    try {
      const response = await map.loadImage(url);
      if (response && response.data && !map.hasImage(id)) {
        map.addImage(id, response.data);
      }
    } catch (err) {
      console.warn(`[ImageMarkerLayer] Failed to load image ${id} from ${url}:`, err);
    }
  }

  public static setVisibility(map: MapLibreMap, visible: boolean): void {
    if (map.getLayer(ImageMarkerLayer.LAYER_ID)) {
      map.setLayoutProperty(ImageMarkerLayer.LAYER_ID, 'visibility', visible ? 'visible' : 'none');
    }
  }
}
