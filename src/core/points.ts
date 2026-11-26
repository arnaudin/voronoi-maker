import { RNG, gaussian, pick, range } from './rng';
import { Point } from './voronoi';

export type PatternId = 'scatter' | 'clusters' | 'grid' | 'orbits';

export const PATTERNS: { id: PatternId; name: string }[] = [
  { id: 'scatter', name: 'Scatter' },
  { id: 'clusters', name: 'Clusters' },
  { id: 'grid', name: 'Grid' },
  { id: 'orbits', name: 'Orbits' },
];

const clampIn = (v: number, hi: number): number => Math.min(hi - 1, Math.max(1, v));

/** Distinct sites for the voronoi diagram, ≥1px inside the w×h rect.
 *  The pattern shapes the raw distribution; Lloyd relaxation (applied later)
 *  evens it out without erasing the pattern's large-scale structure. */
export function generateSites(rng: RNG, count: number, w: number, h: number, pattern: PatternId): Point[] {
  let pts: Point[];
  if (pattern === 'clusters') pts = clusters(rng, count, w, h);
  else if (pattern === 'grid') pts = hexGrid(rng, count, w, h);
  else if (pattern === 'orbits') pts = orbits(rng, count, w, h);
  else pts = scatter(rng, count, w, h);
  return dedupe(pts);
}

function scatter(rng: RNG, count: number, w: number, h: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < count; i++) pts.push({ x: range(rng, 1, w - 1), y: range(rng, 1, h - 1) });
  return pts;
}

/** Gaussian blobs around a few centers, plus a light uniform dusting so the
 *  space between clusters still tessellates into large calm cells. */
function clusters(rng: RNG, count: number, w: number, h: number): Point[] {
  const k = Math.max(3, Math.round(Math.sqrt(count) * 0.8));
  const centers: Point[] = [];
  for (let i = 0; i < k; i++) {
    centers.push({ x: range(rng, w * 0.12, w * 0.88), y: range(rng, h * 0.12, h * 0.88) });
  }
  const sigma = (Math.min(w, h) / Math.sqrt(k)) * 0.42;
  const pts: Point[] = [];
  const dusting = Math.round(count * 0.15);
  for (let i = 0; i < dusting; i++) pts.push({ x: range(rng, 1, w - 1), y: range(rng, 1, h - 1) });
  for (let i = dusting; i < count; i++) {
    const c = pick(rng, centers);
    pts.push({
      x: clampIn(c.x + gaussian(rng) * sigma, w),
      y: clampIn(c.y + gaussian(rng) * sigma, h),
    });
  }
  return pts;
}

/** Jittered hex lattice — near-regular cells even before relaxation. */
function hexGrid(rng: RNG, count: number, w: number, h: number): Point[] {
  const s = Math.sqrt(((w * h) / count) * (2 / Math.sqrt(3)));
  const rowH = (s * Math.sqrt(3)) / 2;
  const jitter = s * 0.18;
  const pts: Point[] = [];
  let row = 0;
  for (let y = rowH / 2; y < h; y += rowH, row++) {
    for (let x = (row % 2 ? s : s / 2); x < w; x += s) {
      pts.push({
        x: clampIn(x + range(rng, -jitter, jitter), w),
        y: clampIn(y + range(rng, -jitter, jitter), h),
      });
    }
  }
  return pts;
}

/** Concentric rings around the center, out to the corners; cells read as a
 *  radial burst. Points that land outside the rect are dropped. */
function orbits(rng: RNG, count: number, w: number, h: number): Point[] {
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.hypot(w, h) / 2;
  const rings = Math.max(3, Math.round(Math.sqrt(count) / 1.6));
  const ringW = maxR / rings;
  const radii: number[] = [];
  let totalW = 0;
  for (let j = 0; j < rings; j++) {
    radii.push((j + 0.5) * ringW);
    totalW += radii[j];
  }
  const pts: Point[] = [{ x: cx, y: cy }];
  for (let j = 0; j < rings; j++) {
    const cnt = Math.max(3, Math.round(((count - 1) * radii[j]) / totalW));
    const phase = range(rng, 0, 2 * Math.PI);
    for (let c = 0; c < cnt; c++) {
      const angle = phase + ((c + range(rng, -0.3, 0.3)) / cnt) * 2 * Math.PI;
      const r = radii[j] + range(rng, -0.3, 0.3) * ringW;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (x > 1 && x < w - 1 && y > 1 && y < h - 1) pts.push({ x, y });
    }
  }
  return pts;
}

/** Coincident sites make the bisector math degenerate — drop anything closer
 *  than half a pixel to an already-kept site. */
function dedupe(pts: Point[]): Point[] {
  const seen = new Set<string>();
  const out: Point[] = [];
  for (const p of pts) {
    const key = `${Math.round(p.x * 2)}:${Math.round(p.y * 2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}
