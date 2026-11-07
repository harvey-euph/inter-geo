declare module 'topojson-server' {
  import type { Topology } from 'topojson-specification';
  import type { GeoJsonObject } from 'geojson';

  export function topology(
    objects: { [key: string]: GeoJsonObject } | Record<string, unknown>,
    quantization?: number
  ): Topology & { objects: Record<string, any> };
}
