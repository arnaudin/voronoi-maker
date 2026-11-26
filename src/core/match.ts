import { clampParams, compose, Tessellation, VoronoiParams } from './composer';
import { cellShapes, layerFills, prettyName } from './svg';
import { Point } from './voronoi';

/** Params that move cells. The rest (style, theme, coloring, gradient angle,
 *  stroke, rounding, ring shading) restyle the same cells, which keep their
 *  layer names; ring spacing keeps the cells but changes their rings. */
const CELL_KEYS = ['width', 'height', 'density', 'relax', 'pattern', 'gap', 'seed'] as const;

export interface LayerCell {
  /** Index into the tessellation's cells (and sites). */
  index: number;
  poly: Point[];
  centroid: Point;
  /** Its nested rings, outermost first ("Cell 042 Ring 1", …); empty when off. */
  rings: Point[][];
}

function cellsOf(t: Tessellation): Map<string, LayerCell> {
  const map = new Map<string, LayerCell>();
  for (const s of cellShapes(t)) {
    if (s.ring) continue;
    const c = t.cells[s.index];
    map.set(prettyName(s.id), {
      index: s.index,
      poly: c.poly,
      centroid: c.centroid,
      rings: t.rings[s.index],
    });
  }
  return map;
}

/** Map of Figma layer name ("Cell 042") → that cell's polygon, centroid, and rings. */
export function layerCells(params: VoronoiParams): Map<string, LayerCell> {
  return cellsOf(compose(params));
}

function sameCells(a: VoronoiParams, b: VoronoiParams): boolean {
  const ca = clampParams(a);
  const cb = clampParams(b);
  return CELL_KEYS.every((k) => ca[k] === cb[k]);
}

/** True when both param sets produce the same layers under the same names. */
export function sameGeometry(a: VoronoiParams, b: VoronoiParams): boolean {
  return sameCells(a, b) && clampParams(a).ringSpacing === clampParams(b).ringSpacing;
}

/** "Cell 042 Ring 2" → ["Cell 042", 2]; any other name → [name, 0]. */
function splitRing(name: string): [string, number] {
  const m = / Ring (\d+)$/.exec(name);
  return m ? [name.slice(0, m.index), Number(m[1])] : [name, 0];
}

/** Distance from p to a convex polygon (0 inside or on the boundary). */
function polyDistance(p: Point, poly: Point[]): number {
  let pos = false;
  let neg = false;
  let min = Infinity;
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k];
    const b = poly[(k + 1) % poly.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const cross = ex * (p.y - a.y) - ey * (p.x - a.x);
    if (cross > 1e-9) pos = true;
    else if (cross < -1e-9) neg = true;
    const len2 = ex * ex + ey * ey;
    const t = len2 > 0 ? Math.min(1, Math.max(0, ((p.x - a.x) * ex + (p.y - a.y) * ey) / len2)) : 0;
    min = Math.min(min, Math.hypot(p.x - a.x - t * ex, p.y - a.y - t * ey));
  }
  return pos && neg ? min : 0;
}

/** Positional half of matchLayers (exported so the gallery can check it on
 *  identical layouts). Each cell's centroid is scaled to the new frame size and
 *  goes to the new cell covering that spot; a spot in a gutter goes to the
 *  nearest cell within half a typical cell width. A new cell claimed by several
 *  names goes to the closest claim, and the others are dropped. */
export function matchByPosition(
  from: VoronoiParams,
  to: VoronoiParams,
  names: Iterable<string>,
): Map<string, string> {
  return positionMatch(compose(from), compose(to), names);
}

function positionMatch(
  src: Tessellation,
  dst: Tessellation,
  names: Iterable<string>,
): Map<string, string> {
  const srcCells = cellsOf(src);
  const dstCells = [...cellsOf(dst)];
  const sx = dst.params.width / src.params.width;
  const sy = dst.params.height / src.params.height;
  const tol = Math.sqrt((dst.params.width * dst.params.height) / dst.params.density) / 2;
  const reach = dstCells.map(([, c]) =>
    Math.max(...c.poly.map((v) => Math.hypot(v.x - c.centroid.x, v.y - c.centroid.y))),
  );

  const out = new Map<string, string>();
  const claims = new Map<string, { name: string; d: number; dc: number }>();
  for (const name of names) {
    if (name === 'Background') {
      out.set(name, name);
      continue;
    }
    const cell = srcCells.get(name);
    if (!cell) continue;
    const p = { x: cell.centroid.x * sx, y: cell.centroid.y * sy };
    // Closest polygon wins (0 = covers p); centroid distance breaks ties.
    let best = -1;
    let bestD = tol;
    let bestDc = Infinity;
    dstCells.forEach(([, c], j) => {
      const dc = Math.hypot(c.centroid.x - p.x, c.centroid.y - p.y);
      if (dc - reach[j] > bestD) return;
      const d = polyDistance(p, c.poly);
      if (d < bestD || (d === bestD && dc < bestDc)) {
        best = j;
        bestD = d;
        bestDc = dc;
      }
    });
    if (best < 0) continue;
    const target = dstCells[best][0];
    const prev = claims.get(target);
    if (prev && (prev.d < bestD || (prev.d === bestD && prev.dc <= bestDc))) continue;
    claims.set(target, { name, d: bestD, dc: bestDc });
  }
  for (const [target, claim] of claims) out.set(claim.name, target);
  return out;
}

/** Where each named layer of a frame generated from `from` belongs in the frame
 *  generated from `to`, for carrying manual recolors across an update. Names are
 *  sequential, so they only line up when the geometry is unchanged; otherwise
 *  cells are matched by position (see matchByPosition). A ring goes wherever its
 *  cell goes, as the same ring number, if that cell still has one. Each target
 *  name appears at most once; names with no match are left out. */
export function matchLayers(
  from: VoronoiParams,
  to: VoronoiParams,
  names: Iterable<string>,
): Map<string, string> {
  const list = [...names];
  if (sameGeometry(from, to)) return new Map(list.map((n) => [n, n]));
  const dst = compose(to);
  const cells = [...new Set(list.map((n) => splitRing(n)[0]))];
  const cellMap = sameCells(from, to)
    ? new Map(cells.map((c) => [c, c]))
    : positionMatch(compose(from), dst, cells);
  const layers = new Set(layerFills(dst).keys());
  const out = new Map<string, string>();
  for (const name of list) {
    const [cell, ring] = splitRing(name);
    const target = cellMap.get(cell);
    const layer = target && ring ? `${target} Ring ${ring}` : target;
    if (layer && layers.has(layer)) out.set(name, layer);
  }
  return out;
}
