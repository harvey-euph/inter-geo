import type { Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import type { FeatureRegistry, CanonicalFeature } from '../data/FeatureRegistry';
import { FeatureStateManager } from './FeatureStateManager';

export interface InteractionControllerCallbacks {
  onHover?: (
    feature: CanonicalFeature | null,
    screenPos: { x: number; y: number },
    lngLat: { lng: number; lat: number }
  ) => void;
  onSelect?: (feature: CanonicalFeature) => void;
  onOceanClick?: () => void;
}

export class InteractionController {
  private map: MapLibreMap | null = null;
  private registry: FeatureRegistry;
  private stateManager: FeatureStateManager;
  private callbacks: InteractionControllerCallbacks = {};

  private boundMouseMove = this.handleMouseMove.bind(this);
  private boundMouseLeave = this.handleMouseLeave.bind(this);
  private boundClick = this.handleClick.bind(this);

  private readonly INTERACTIVE_LAYERS = [
    'ext-fill',
    'adm2-fill',
    'adm1-fill',
    'adm0-fill',
    'roads-line'
  ];

  constructor(
    registry: FeatureRegistry,
    stateManager: FeatureStateManager,
    callbacks?: InteractionControllerCallbacks
  ) {
    this.registry = registry;
    this.stateManager = stateManager;
    if (callbacks) this.callbacks = callbacks;
  }

  public setMap(map: MapLibreMap | null): void {
    if (this.map) {
      this.detachListeners();
    }
    this.map = map;
    this.stateManager.setMap(map);
    if (this.map) {
      this.attachListeners();
    }
  }

  public setCallbacks(callbacks: InteractionControllerCallbacks): void {
    this.callbacks = callbacks;
  }

  private attachListeners(): void {
    if (!this.map) return;
    this.map.on('mousemove', this.boundMouseMove);
    this.map.on('mouseout', this.boundMouseLeave);
    this.map.on('click', this.boundClick);
  }

  private detachListeners(): void {
    if (!this.map) return;
    this.map.off('mousemove', this.boundMouseMove);
    this.map.off('mouseout', this.boundMouseLeave);
    this.map.off('click', this.boundClick);
  }

  private handleMouseMove(e: MapLayerMouseEvent): void {
    if (!this.map) return;

    // Check if layer exists before querying
    const activeLayers = this.INTERACTIVE_LAYERS.filter((l) => Boolean(this.map?.getLayer(l)));
    if (activeLayers.length === 0) return;

    const rendered = this.map.queryRenderedFeatures(e.point, { layers: activeLayers });

    if (rendered.length === 0) {
      this.stateManager.setHover(null);
      this.map.getCanvas().style.cursor = '';
      this.callbacks.onHover?.(null, e.point, e.lngLat);
      return;
    }

    // Pick top-most feature
    const top = rendered[0];
    const featureId = String(top.properties?.feature_id || top.id || '');
    const canonical = this.registry.getById(featureId);

    if (canonical) {
      this.stateManager.setHover({ source: top.source, id: featureId });
      this.map.getCanvas().style.cursor = 'pointer';
      this.callbacks.onHover?.(canonical, e.point, e.lngLat);
    } else {
      this.stateManager.setHover(null);
      this.map.getCanvas().style.cursor = '';
      this.callbacks.onHover?.(null, e.point, e.lngLat);
    }
  }

  private handleMouseLeave(): void {
    this.stateManager.setHover(null);
    if (this.map) {
      this.map.getCanvas().style.cursor = '';
    }
    this.callbacks.onHover?.(null, { x: 0, y: 0 }, { lng: 0, lat: 0 });
  }

  private handleClick(e: MapLayerMouseEvent): void {
    if (!this.map) return;

    const activeLayers = this.INTERACTIVE_LAYERS.filter((l) => Boolean(this.map?.getLayer(l)));
    const rendered = this.map.queryRenderedFeatures(e.point, { layers: activeLayers });

    if (rendered.length === 0) {
      this.stateManager.setSelected(null);
      this.callbacks.onOceanClick?.();
      return;
    }

    const top = rendered[0];
    const featureId = String(top.properties?.feature_id || top.id || '');
    const canonical = this.registry.getById(featureId);

    if (canonical) {
      this.stateManager.setSelected({ source: top.source, id: featureId });
      this.callbacks.onSelect?.(canonical);
    } else {
      this.callbacks.onOceanClick?.();
    }
  }
}
