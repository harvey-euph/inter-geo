export type BBox = [number, number, number, number];

/**
 * Decode job kinds:
 * - `l2`: Admin-1 subdivisions (adds centroid + dissolved national outline)
 * - `l3`: Regional L3 partition pack
 * - `roads`: Road network (features with empty geometry are dropped)
 */
export type DecodeKind = 'l2' | 'l3' | 'roads';

export interface DecodeRequest {
  id: number;
  url: string;
  kind: DecodeKind;
  iso2?: string;
}

/** A projected feature: SVG path string in map space + precomputed bbox (and centroid for L2). */
export interface DecodedFeature {
  d: string;
  bbox: BBox;
  centroid?: [number, number];
  props: Record<string, unknown>;
  fid?: string | number;
}

export interface DecodeResult {
  features: DecodedFeature[];
  /** L2 only: dissolved outer national boundary path (absent when dissolve failed or produced artifacts). */
  dissolvedD?: string;
}

export type DecodeResponse =
  | ({ id: number; ok: true } & DecodeResult)
  | { id: number; ok: false; error: string };
