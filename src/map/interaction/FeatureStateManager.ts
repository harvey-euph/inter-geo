import type { Map as MapLibreMap } from 'maplibre-gl';

export interface ActiveFeatureIdentifier {
  source: string;
  id: string | number;
}

export interface MapInteractionState {
  hoveredFeature: ActiveFeatureIdentifier | null;
  selectedFeature: ActiveFeatureIdentifier | null;
  activeAdminLevel: 0 | 1 | 2;
}

/**
 * FeatureStateManager handles feature state (hover, selected) in MapLibre GL JS.
 * Ensures interaction state is strictly projection-independent.
 */
export class FeatureStateManager {
  private map: MapLibreMap | null = null;
  private state: MapInteractionState = {
    hoveredFeature: null,
    selectedFeature: null,
    activeAdminLevel: 0
  };

  public setMap(map: MapLibreMap | null): void {
    this.map = map;
    // When map rebinds or changes projection, restore the state
    if (this.map) {
      this.restoreStates();
    }
  }

  public getState(): Readonly<MapInteractionState> {
    return this.state;
  }

  public setHover(target: ActiveFeatureIdentifier | null): void {
    // Clear previous hover on map
    if (this.map && this.state.hoveredFeature) {
      try {
        this.map.setFeatureState(
          { source: this.state.hoveredFeature.source, id: this.state.hoveredFeature.id },
          { hover: false }
        );
      } catch {
        // ignore if source not loaded
      }
    }

    this.state.hoveredFeature = target;

    // Apply new hover on map
    if (this.map && target) {
      try {
        this.map.setFeatureState(
          { source: target.source, id: target.id },
          { hover: true }
        );
      } catch {
        // ignore
      }
    }
  }

  public setSelected(target: ActiveFeatureIdentifier | null): void {
    // Clear previous selection on map
    if (this.map && this.state.selectedFeature) {
      try {
        this.map.setFeatureState(
          { source: this.state.selectedFeature.source, id: this.state.selectedFeature.id },
          { selected: false }
        );
      } catch {
        // ignore
      }
    }

    this.state.selectedFeature = target;

    // Apply new selection on map
    if (this.map && target) {
      try {
        this.map.setFeatureState(
          { source: target.source, id: target.id },
          { selected: true }
        );
      } catch {
        // ignore
      }
    }
  }

  public setActiveAdminLevel(level: 0 | 1 | 2): void {
    this.state.activeAdminLevel = level;
  }

  public restoreStates(): void {
    if (!this.map) return;
    if (this.state.hoveredFeature) {
      try {
        this.map.setFeatureState(
          { source: this.state.hoveredFeature.source, id: this.state.hoveredFeature.id },
          { hover: true }
        );
      } catch {
        // ignore
      }
    }
    if (this.state.selectedFeature) {
      try {
        this.map.setFeatureState(
          { source: this.state.selectedFeature.source, id: this.state.selectedFeature.id },
          { selected: true }
        );
      } catch {
        // ignore
      }
    }
  }
}
