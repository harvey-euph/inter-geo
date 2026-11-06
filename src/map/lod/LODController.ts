import type { Map as MapLibreMap } from 'maplibre-gl';
import type { GeographicDataManager } from '../data/GeographicDataManager';
import { AdministrativeLODManager } from './AdministrativeLODManager';
import { GeometryLODManager } from './GeometryLODManager';

export class LODController {
  private map: MapLibreMap | null = null;
  private dataManager: GeographicDataManager;
  private adminLOD: AdministrativeLODManager;
  private boundOnCameraChange = this.handleCameraChange.bind(this);

  constructor(dataManager: GeographicDataManager) {
    this.dataManager = dataManager;
    this.adminLOD = new AdministrativeLODManager(dataManager);
  }

  public setMap(map: MapLibreMap | null): void {
    if (this.map) {
      this.map.off('moveend', this.boundOnCameraChange);
    }
    this.map = map;
    if (this.map) {
      this.map.on('moveend', this.boundOnCameraChange);
      this.handleCameraChange();
    }
  }

  public getAdminLODManager(): AdministrativeLODManager {
    return this.adminLOD;
  }

  private handleCameraChange(): void {
    if (!this.map) return;
    const zoom = this.map.getZoom();
    const lod = GeometryLODManager.getLODForZoom(zoom);

    // If focused on country or subdivision, ensure high LOD is available
    const focusedCountry = this.adminLOD.getFocusedCountry();
    if (focusedCountry && lod >= 1) {
      void this.dataManager.ensureAdm1(focusedCountry);
    }

    const focusedSub = this.adminLOD.getFocusedSubdivision();
    if (focusedCountry && focusedSub && lod >= 2) {
      void this.dataManager.ensureAdm2(focusedCountry, focusedSub);
    }
  }
}
