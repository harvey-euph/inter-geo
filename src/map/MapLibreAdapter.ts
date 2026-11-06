import { Map as MapLibreMapInstance, setWorkerUrl, type MapOptions, type LngLatBoundsLike } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { baseMapStyle } from './styles/mapStyle';
import { administrativeLayers } from './styles/administrativeStyle';
import { ProjectionController, type ProjectionMode } from './ProjectionController';
import { GeographicDataManager } from './data/GeographicDataManager';
import { FeatureStateManager } from './interaction/FeatureStateManager';
import { InteractionController, type InteractionControllerCallbacks } from './interaction/InteractionController';
import { LODController } from './lod/LODController';
import type { CanonicalFeature } from './data/FeatureRegistry';

// Configure MapLibre Web Worker URL for Vite bundling
if (typeof window !== 'undefined') {
  setWorkerUrl(maplibreWorkerUrl || '/inter-geo/assets/maplibre-gl-worker.mjs');
}

export interface MapLibreAdapterOptions {
  container: HTMLElement;
  initialMode?: ProjectionMode;
  initialCenter?: [number, number];
  initialZoom?: number;
  callbacks?: InteractionControllerCallbacks;
  onReady?: (adapter: MapLibreAdapter) => void;
}

export class MapLibreAdapter {
  private map: MapLibreMapInstance;
  private projectionController: ProjectionController;
  private dataManager: GeographicDataManager;
  private stateManager: FeatureStateManager;
  private interactionController: InteractionController;
  private lodController: LODController;
  private isDestroyed = false;

  constructor(options: MapLibreAdapterOptions) {
    this.projectionController = new ProjectionController(options.initialMode || '2d');
    this.dataManager = new GeographicDataManager();
    this.stateManager = new FeatureStateManager();
    this.interactionController = new InteractionController(
      this.dataManager.getRegistry(),
      this.stateManager,
      options.callbacks
    );
    this.lodController = new LODController(this.dataManager);

    const mapOptions: MapOptions = {
      container: options.container,
      style: baseMapStyle,
      center: options.initialCenter || [138, 38], // Default to Japan region
      zoom: options.initialZoom || 2,
      renderWorldCopies: true,
      attributionControl: false
    };

    this.map = new MapLibreMapInstance(mapOptions);

    this.map.once('load', () => {
      if (this.isDestroyed) return;

      // Add all administrative and feature layers
      for (const layer of administrativeLayers) {
        if (!this.map.getLayer(layer.id)) {
          this.map.addLayer(layer);
        }
      }

      // Bind all controllers to the map instance
      this.projectionController.setMap(this.map);
      this.dataManager.setMap(this.map);
      this.stateManager.setMap(this.map);
      this.interactionController.setMap(this.map);
      this.lodController.setMap(this.map);

      // Start by loading ADM0 data
      void this.dataManager.loadAdm0();

      options.onReady?.(this);
    });
  }

  public getMap(): MapLibreMapInstance {
    return this.map;
  }

  public getProjectionController(): ProjectionController {
    return this.projectionController;
  }

  public getDataManager(): GeographicDataManager {
    return this.dataManager;
  }

  public getStateManager(): FeatureStateManager {
    return this.stateManager;
  }

  public getInteractionController(): InteractionController {
    return this.interactionController;
  }

  public getLODController(): LODController {
    return this.lodController;
  }

  public flyTo(lng: number, lat: number, zoom?: number): void {
    if (this.isDestroyed) return;
    this.map.flyTo({
      center: [lng, lat],
      zoom: zoom !== undefined ? zoom : this.map.getZoom(),
      essential: true
    });
  }

  public fitBounds(bounds: [number, number, number, number], padding = 40): void {
    if (this.isDestroyed) return;
    const [minLng, minLat, maxLng, maxLat] = bounds;
    this.map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat]
      ] as LngLatBoundsLike,
      { padding, maxZoom: 14 }
    );
  }

  public setCallbacks(callbacks: InteractionControllerCallbacks): void {
    this.interactionController.setCallbacks(callbacks);
  }

  public resize(): void {
    if (!this.isDestroyed) {
      this.map.resize();
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.projectionController.setMap(null);
    this.dataManager.setMap(null);
    this.stateManager.setMap(null);
    this.interactionController.setMap(null);
    this.lodController.setMap(null);
    this.map.remove();
  }
}
