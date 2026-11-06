export type GeometryLODLevel = 0 | 1 | 2;

/**
 * GeometryLODManager defines zoom thresholds for geometry simplification
 * and coordinate precision.
 */
export class GeometryLODManager {
  public static getLODForZoom(zoom: number): GeometryLODLevel {
    if (zoom < 4) return 0;
    if (zoom < 7.5) return 1;
    return 2;
  }
}
