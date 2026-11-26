import { assignFills, ColorStrategy, RingShading, StyleId } from './colors';
import { getPalette, Palette, PALETTES } from './palettes';
import { generateSites, PatternId, PATTERNS } from './points';
import { mulberry32 } from './rng';
import { cellRings, computeCells, Point, relaxSites, VoronoiCell } from './voronoi';

export interface VoronoiParams {
  width: number;
  height: number;
  /** Target number of cells (actual count can differ slightly after dedupe/clipping). */
  density: number;
  /** Lloyd relaxation steps: 0 = raw/organic, 10 = near-honeycomb uniform. */
  relax: number;
  pattern: PatternId;
  /** Uniform gutter between cells, px. */
  gap: number;
  /** Corner rounding radius, px. */
  rounding: number;
  /** Nested rings inside every cell: the spacing between them, px (0 = off). */
  ringSpacing: number;
  /** Colored/Gradient only: how rings are tinted from their cell's color. */
  ringShading: RingShading;
  strokeWidth: number;
  style: StyleId;
  themeId: string;
  colorStrategy: ColorStrategy;
  /** Gradient style only: axis angle in degrees. */
  gradientAngle: number;
  seed: number;
}

export const DEFAULT_PARAMS: VoronoiParams = {
  width: 800,
  height: 600,
  density: 140,
  relax: 2,
  pattern: 'scatter',
  gap: 4,
  rounding: 0,
  ringSpacing: 0,
  ringShading: 'fade',
  strokeWidth: 2,
  style: 'color',
  themeId: 'terrazzo',
  colorStrategy: 'balanced',
  gradientAngle: 35,
  seed: 12345,
};

export interface Tessellation {
  params: VoronoiParams;
  palette: Palette;
  cells: VoronoiCell[];
  fills: string[];
  /** Per cell (aligned with `cells`): its nested ring polygons, outermost first. */
  rings: Point[][][];
}

/** Hydrated params may come from stale plugin data — coerce everything sane. */
export function clampParams(p: VoronoiParams): VoronoiParams {
  const num = (v: unknown, d: number) => (typeof v === 'number' && isFinite(v) ? v : d);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const D = DEFAULT_PARAMS;
  const ringSpacing = num(p.ringSpacing, D.ringSpacing);
  return {
    width: clamp(Math.round(num(p.width, D.width)), 100, 4000),
    height: clamp(Math.round(num(p.height, D.height)), 100, 4000),
    density: clamp(Math.round(num(p.density, D.density)), 4, 1200),
    relax: clamp(Math.round(num(p.relax, D.relax)), 0, 10),
    pattern: PATTERNS.some((x) => x.id === p.pattern) ? p.pattern : D.pattern,
    gap: clamp(num(p.gap, D.gap), 0, 40),
    rounding: clamp(num(p.rounding, D.rounding), 0, 60),
    // Below 2px rings would be a solid smear of strokes; treat that as off.
    ringSpacing: ringSpacing < 2 ? 0 : clamp(ringSpacing, 2, 200),
    ringShading: p.ringShading === 'alternate' ? 'alternate' : 'fade',
    strokeWidth: clamp(num(p.strokeWidth, D.strokeWidth), 0, 12),
    style: p.style === 'gradient' || p.style === 'bw' ? p.style : 'color',
    themeId: PALETTES.some((x) => x.id === p.themeId) ? p.themeId : D.themeId,
    colorStrategy:
      p.colorStrategy === 'random' || p.colorStrategy === 'bySize' ? p.colorStrategy : 'balanced',
    gradientAngle: clamp(num(p.gradientAngle, D.gradientAngle), 0, 360),
    seed: Math.round(num(p.seed, D.seed)),
  };
}

/** Params → deterministic tessellation. Geometry and colors draw from separate
 *  rng streams so the layout stays identical when only theme/style changes. */
export function compose(raw: VoronoiParams): Tessellation {
  const params = clampParams(raw);
  const rngGeo = mulberry32(params.seed);
  const rngColor = mulberry32((params.seed ^ 0x9e3779b9) >>> 0);
  let sites = generateSites(rngGeo, params.density, params.width, params.height, params.pattern);
  for (let k = 0; k < params.relax; k++) sites = relaxSites(sites, params.width, params.height);
  const cells = computeCells(sites, params.width, params.height, params.gap);
  const palette = getPalette(params.themeId);
  const fills = assignFills(
    cells,
    params.style,
    params.colorStrategy,
    palette,
    params.gradientAngle,
    rngColor,
  );
  const rings = cells.map((c) => cellRings(c.poly, params.ringSpacing));
  return { params, palette, cells, fills, rings };
}
