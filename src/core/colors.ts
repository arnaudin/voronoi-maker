import { Palette } from './palettes';
import { RNG, pick } from './rng';
import { VoronoiCell } from './voronoi';

export type StyleId = 'color' | 'gradient' | 'bw';
export type ColorStrategy = 'balanced' | 'random' | 'bySize';
export type RingShading = 'fade' | 'alternate';

/** One fill per cell (aligned with the cells array — empty cells included so
 *  indices keep matching the neighbor lists). */
export function assignFills(
  cells: VoronoiCell[],
  style: StyleId,
  strategy: ColorStrategy,
  palette: Palette,
  gradientAngle: number,
  rng: RNG,
): string[] {
  if (style === 'bw') return cells.map(() => '#ffffff');
  if (style === 'gradient') return gradientFills(cells, palette, gradientAngle);
  if (strategy === 'random') return cells.map(() => pick(rng, palette.colors));
  if (strategy === 'bySize') return sizeFills(cells, palette);
  return balancedFills(cells, palette);
}

/** Greedy graph coloring: never reuse a color a touching neighbor already has
 *  (when avoidable), preferring the least-used color for an even spread. */
function balancedFills(cells: VoronoiCell[], palette: Palette): string[] {
  const colors = palette.colors;
  const idx = new Array<number>(cells.length).fill(-1);
  const counts = new Array<number>(colors.length).fill(0);
  cells.forEach((c, i) => {
    const banned = new Set<number>();
    for (const j of c.neighbors) if (j < i && idx[j] >= 0) banned.add(idx[j]);
    let best = -1;
    for (let k = 0; k < colors.length; k++) {
      if (banned.has(k)) continue;
      if (best < 0 || counts[k] < counts[best]) best = k;
    }
    if (best < 0) {
      best = 0;
      for (let k = 1; k < colors.length; k++) if (counts[k] < counts[best]) best = k;
    }
    idx[i] = best;
    counts[best]++;
  });
  return idx.map((k) => colors[k]);
}

/** Area-ranked banding: smallest cells get the first palette color, largest
 *  the last — reads as depth, especially with the Clusters pattern. */
function sizeFills(cells: VoronoiCell[], palette: Palette): string[] {
  const order = cells.map((_, i) => i).sort((a, b) => cells[a].area - cells[b].area);
  const fills = new Array<string>(cells.length).fill(palette.colors[0]);
  order.forEach((cellIdx, rank) => {
    const k = Math.min(
      palette.colors.length - 1,
      Math.floor((rank / cells.length) * palette.colors.length),
    );
    fills[cellIdx] = palette.colors[k];
  });
  return fills;
}

/** Each cell sampled from a linear gradient through the theme colors, by the
 *  projection of its centroid onto the gradient axis. */
function gradientFills(cells: VoronoiCell[], palette: Palette, angleDeg: number): string[] {
  const rad = (angleDeg * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  let min = Infinity;
  let max = -Infinity;
  for (const c of cells) {
    const t = c.centroid.x * ux + c.centroid.y * uy;
    if (t < min) min = t;
    if (t > max) max = t;
  }
  const span = max - min || 1;
  return cells.map((c) => {
    const t = (c.centroid.x * ux + c.centroid.y * uy - min) / span;
    return sampleStops(palette.colors, t);
  });
}

/** Fill for ring k (1 = outermost) of a cell with `count` rings, tinted from the
 *  cell's color toward white: 'fade' lightens step by step to 72% white at the
 *  center; 'alternate' switches between the cell color and a 45% tint. White
 *  (Outline style) stays white. */
export function ringFill(base: string, k: number, count: number, shading: RingShading): string {
  const t = shading === 'alternate' ? (k % 2 === 1 ? 0.45 : 0) : (0.72 * k) / count;
  return hexLerp(base, '#ffffff', t);
}

function sampleStops(stops: string[], t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const seg = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  return hexLerp(stops[i], stops[i + 1], seg - i);
}

function hexLerp(a: string, b: string, t: number): string {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const mix = (sa: number, sb: number) => Math.round(sa + (sb - sa) * t);
  const to = (v: number) => v.toString(16).padStart(2, '0');
  return (
    '#' +
    to(mix((na >> 16) & 255, (nb >> 16) & 255)) +
    to(mix((na >> 8) & 255, (nb >> 8) & 255)) +
    to(mix(na & 255, nb & 255))
  );
}
