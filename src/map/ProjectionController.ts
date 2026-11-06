import type { Map as MapLibreMap } from 'maplibre-gl';

export type ProjectionMode = '2d' | '3d';

export interface ProjectionChangeCallback {
  (mode: ProjectionMode): void;
}

/**
 * ProjectionController manages 2D (Mercator / Flat Continuous) and 3D (Globe)
 * projection switching on a single MapLibre GL JS Map instance.
 *
 * Guarantees:
 * 1. Zero data reloading when switching projection.
 * 2. Feature state (hover, selection) is preserved.
 * 3. Geographic center and camera view remain consistent.
 */
export class ProjectionController {
  private map: MapLibreMap | null = null;
  private currentMode: ProjectionMode = '2d';
  private listeners = new Set<ProjectionChangeCallback>();

  constructor(initialMode: ProjectionMode = '2d') {
    this.currentMode = initialMode;
  }

  public setMap(map: MapLibreMap | null): void {
    this.map = map;
    if (this.map) {
      this.applyProjection(this.currentMode);
    }
  }

  public getMode(): ProjectionMode {
    return this.currentMode;
  }

  public setMode(mode: ProjectionMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.applyProjection(mode);
    this.notify();
  }

  public toggle(): void {
    this.setMode(this.currentMode === '2d' ? '3d' : '2d');
  }

  public subscribe(cb: ProjectionChangeCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    for (const cb of this.listeners) {
      cb(this.currentMode);
    }
  }

  /**
   * Applies the projection to the MapLibre map instance while preserving
   * center coordinate, bearing, and zoom.
   */
  private applyProjection(mode: ProjectionMode): void {
    if (!this.map) return;

    try {
      const center = this.map.getCenter();
      const zoom = this.map.getZoom();
      const bearing = this.map.getBearing();
      const pitch = this.map.getPitch();

      if (mode === '3d') {
        this.map.setProjection({ type: 'globe' });
      } else {
        this.map.setProjection({ type: 'mercator' });
      }

      // Re-apply center and zoom to ensure camera continuity
      this.map.jumpTo({
        center,
        zoom,
        bearing,
        pitch
      });
    } catch (err) {
      console.warn('[ProjectionController] setProjection error:', err);
    }
  }
}
