import { getCountryRoadMarking } from '../data/roadMarkings';

export const MAP_COLORS = {
  oceanBg: '#0a0d14',
  selected: '#38bdf8',
  hovered: '#f97316',
  hoveredLight: '#fb923c',
  unmappedFill: '#1a1f2b',
  defaultFill: '#232a38',
  capitalFill: '#f59e0b',
  capitalStroke: '#fef08a'
} as const;

export const MONO_BADGE_FONT =
  'bold 11px "Twemoji Country Flags", ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Apple Color Emoji", "Noto Color Emoji", monospace';
export const MONO_SMALL_FONT =
  'bold 9px "Twemoji Country Flags", ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Apple Color Emoji", "Noto Color Emoji", monospace';

/**
 * Checks whether a map-space bounding box [minX, minY, maxX, maxY] intersects the current screen viewport.
 */
export function inView(
  bbox: [number, number, number, number],
  copyOffset: number,
  k: number,
  x: number,
  y: number,
  vw: number,
  vh: number,
  margin = 50
): boolean {
  const [minX, minY, maxX, maxY] = bbox;
  const sMinY = y + minY * k;
  const sMaxY = y + maxY * k;
  if (sMaxY < -margin || sMinY > vh + margin) return false;
  const sMinX = x + (minX + copyOffset) * k;
  const sMaxX = x + (maxX + copyOffset) * k;
  return sMaxX >= -margin && sMinX <= vw + margin;
}

/**
 * Draws a rounded pill/card background with selected / hovered / default states.
 */
export function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  isSelected: boolean,
  isHovered: boolean,
  defaultFill = 'rgba(15, 23, 42, 0.88)',
  defaultStroke = 'rgba(255, 255, 255, 0.2)',
  defaultLineWidth = 1,
  activeLineWidth = 1
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);

  if (isSelected) {
    ctx.fillStyle = 'rgba(14, 165, 233, 0.96)';
    ctx.fill();
    ctx.strokeStyle = MAP_COLORS.selected;
    ctx.lineWidth = activeLineWidth;
    ctx.stroke();
  } else if (isHovered) {
    ctx.fillStyle = 'rgba(249, 115, 22, 0.96)';
    ctx.fill();
    ctx.strokeStyle = MAP_COLORS.hoveredLight;
    ctx.lineWidth = activeLineWidth;
    ctx.stroke();
  } else {
    ctx.fillStyle = defaultFill;
    ctx.fill();
    ctx.strokeStyle = defaultStroke;
    ctx.lineWidth = defaultLineWidth;
    ctx.stroke();
  }
}

/**
 * Fills a country or subdivision polygon according to road marking color specs:
 * Center/interior is painted with center line color; perimeter edge is stroked with outer line color.
 */
export function fillRoadMarkingPolygon(
  c: CanvasRenderingContext2D,
  path: Path2D,
  specOrIso2: string,
  lineWidth: number,
  overrideFillWithColor?: string
): void {
  let outerColor: string;
  let centerColor: string;

  if (specOrIso2.includes(':')) {
    const parts = specOrIso2.split(':');
    outerColor = parts[0].trim();
    centerColor = (parts[1] || parts[0]).trim();
  } else {
    const rm = getCountryRoadMarking(specOrIso2);
    outerColor = rm.outerColor;
    centerColor = overrideFillWithColor || rm.centerColor;
  }

  if (outerColor === centerColor || overrideFillWithColor) {
    c.fillStyle = centerColor;
    c.fill(path);
  } else {
    c.save();
    c.clip(path);
    c.fillStyle = centerColor;
    c.fill(path);
    c.strokeStyle = outerColor;
    c.lineWidth = lineWidth;
    c.stroke(path);
    c.restore();
  }
}
