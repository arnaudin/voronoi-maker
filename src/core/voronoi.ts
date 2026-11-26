export interface Point {
  x: number;
  y: number;
}

export interface VoronoiCell {
  site: Point;
  /** Clipped (possibly gap-inset) convex polygon; empty when the gap swallowed the cell. */
  poly: Point[];
  /** Indices of sites whose bisector cut this cell (superset of true adjacency). */
  neighbors: number[];
  area: number;
  centroid: Point;
}

/** Keep the part of a convex polygon with (p − a)·n ≤ 0. */
function clipHalfPlane(poly: Point[], ax: number, ay: number, nx: number, ny: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const dp = (p.x - ax) * nx + (p.y - ay) * ny;
    const dq = (q.x - ax) * nx + (q.y - ay) * ny;
    if (dp <= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      const t = dp / (dp - dq);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return out;
}

function maxDist(s: Point, poly: Point[]): number {
  let m = 0;
  for (const p of poly) {
    const d = Math.hypot(p.x - s.x, p.y - s.y);
    if (d > m) m = d;
  }
  return m;
}

/** Voronoi cells clipped to the w×h rect. Every bisector (and the rect edge) is
 *  pulled toward the site by gap/2, so neighboring cells end up exactly `gap`
 *  apart — a mathematically uniform gutter, unlike scaling toward the centroid.
 *
 *  Cell i corresponds to sites[i]. Each cell starts as the rect and is clipped
 *  against nearby sites' bisectors, found via a uniform grid searched in
 *  expanding rings; a site farther than 2·(current max vertex distance) can
 *  never cut the cell, which bounds the work to a handful of neighbors. */
export function computeCells(sites: Point[], w: number, h: number, gap: number): VoronoiCell[] {
  const n = sites.length;
  const g = gap / 2;
  const cell = Math.max(4, Math.sqrt((w * h) / Math.max(1, n)));
  const cols = Math.max(1, Math.ceil(w / cell));
  const rows = Math.max(1, Math.ceil(h / cell));
  const buckets: number[][] = Array.from({ length: cols * rows }, () => []);
  const gx = (p: Point) => Math.min(cols - 1, Math.max(0, Math.floor(p.x / cell)));
  const gy = (p: Point) => Math.min(rows - 1, Math.max(0, Math.floor(p.y / cell)));
  sites.forEach((p, i) => buckets[gy(p) * cols + gx(p)].push(i));

  const rect: Point[] = [
    { x: g, y: g },
    { x: w - g, y: g },
    { x: w - g, y: h - g },
    { x: g, y: h - g },
  ];

  return sites.map((s, i) => {
    let poly = rect;
    const neighbors: number[] = [];
    let radius = maxDist(s, poly);
    const cgx = gx(s);
    const cgy = gy(s);
    const maxRing = Math.max(cols, rows);

    for (let ring = 0; ring <= maxRing && poly.length >= 3; ring++) {
      // Sites in grid ring r are at least (r−1)·cell away — beyond reach once
      // half that distance (minus the gap inset) exceeds the cell radius.
      if (ring >= 2 && ((ring - 1) * cell) / 2 - g > radius) break;
      const cand: { j: number; d2: number }[] = [];
      const x0 = cgx - ring;
      const x1 = cgx + ring;
      const y0 = cgy - ring;
      const y1 = cgy + ring;
      for (let by = Math.max(0, y0); by <= Math.min(rows - 1, y1); by++) {
        for (let bx = Math.max(0, x0); bx <= Math.min(cols - 1, x1); bx++) {
          if (ring > 0 && bx !== x0 && bx !== x1 && by !== y0 && by !== y1) continue;
          for (const j of buckets[by * cols + bx]) {
            if (j === i) continue;
            const dx = sites[j].x - s.x;
            const dy = sites[j].y - s.y;
            cand.push({ j, d2: dx * dx + dy * dy });
          }
        }
      }
      cand.sort((a, b) => a.d2 - b.d2);
      for (const { j, d2 } of cand) {
        const d = Math.sqrt(d2);
        if (d / 2 - g > radius) break;
        if (d < 1e-9) continue;
        const ux = (sites[j].x - s.x) / d;
        const uy = (sites[j].y - s.y) / d;
        const mx = s.x + ux * (d / 2 - g);
        const my = s.y + uy * (d / 2 - g);
        let outside = false;
        for (const p of poly) {
          if ((p.x - mx) * ux + (p.y - my) * uy > 1e-9) {
            outside = true;
            break;
          }
        }
        if (!outside) continue;
        poly = clipHalfPlane(poly, mx, my, ux, uy);
        neighbors.push(j);
        if (poly.length < 3) {
          poly = [];
          break;
        }
        radius = maxDist(s, poly);
      }
    }

    // Shoelace area + centroid (fall back to the site for degenerate polys)
    let a2 = 0;
    let cx = 0;
    let cy = 0;
    for (let k = 0; k < poly.length; k++) {
      const p = poly[k];
      const q = poly[(k + 1) % poly.length];
      const cross = p.x * q.y - q.x * p.y;
      a2 += cross;
      cx += (p.x + q.x) * cross;
      cy += (p.y + q.y) * cross;
    }
    const area = Math.abs(a2) / 2;
    const centroid =
      poly.length >= 3 && area > 1e-6
        ? { x: cx / (3 * a2), y: cy / (3 * a2) }
        : { x: s.x, y: s.y };
    return { site: s, poly, neighbors, area, centroid };
  });
}

/** One step of Lloyd relaxation: every site moves to its cell's centroid.
 *  More steps ⇒ more uniform, honeycomb-like cells. */
export function relaxSites(sites: Point[], w: number, h: number): Point[] {
  return computeCells(sites, w, h, 0).map((c) => c.centroid);
}

/** A convex polygon shrunk by d: every edge moves inward by d, the same move the
 *  gap makes on each bisector, so the result is an exact offset. Empty once it
 *  vanishes. */
export function insetPolygon(poly: Point[], d: number): Point[] {
  const n = poly.length;
  if (n < 3) return [];
  let mx = 0;
  let my = 0;
  for (const p of poly) {
    mx += p.x / n;
    my += p.y / n;
  }
  let out = poly;
  for (let i = 0; i < n && out.length >= 3; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-9) continue;
    let nx = (b.y - a.y) / len;
    let ny = -(b.x - a.x) / len;
    // Outward normal: pointing away from the (interior) vertex average.
    if ((mx - a.x) * nx + (my - a.y) * ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    out = clipHalfPlane(out, a.x - nx * d, a.y - ny * d, nx, ny);
  }
  if (out.length < 3) return [];
  let a2 = 0;
  for (let k = 0; k < out.length; k++) {
    const p = out[k];
    const q = out[(k + 1) % out.length];
    a2 += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a2) > 2e-6 ? out : [];
}

/** Hard cap so a tiny spacing on a huge frame can't produce thousands of layers. */
const MAX_RINGS = 40;

/** Nested rings inside a cell, outermost first: the cell shrunk by 1, 2, 3…
 *  spacings, so every band between rings is exactly `spacing` wide. Rings stop
 *  while the center is still at least two spacings across. */
export function cellRings(poly: Point[], spacing: number): Point[][] {
  const rings: Point[][] = [];
  if (spacing <= 0) return rings;
  while (rings.length < MAX_RINGS) {
    const ring = insetPolygon(poly, (rings.length + 1) * spacing);
    if (!ring.length || !insetPolygon(ring, spacing).length) break;
    rings.push(ring);
  }
  return rings;
}

/** Closed SVG path for a convex polygon, optionally with rounded corners
 *  (quadratic corner cuts, radius clamped to half the shorter edge). */
export function polyPath(poly: Point[], radius: number): string {
  // Drop near-coincident vertices left over from clipping — they'd produce
  // zero-length edges and NaN offsets in the rounding math.
  const pts: Point[] = [];
  for (const p of poly) {
    const prev = pts[pts.length - 1];
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 0.02) pts.push(p);
  }
  while (pts.length > 1 && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) <= 0.02) {
    pts.pop();
  }
  if (pts.length < 3) return '';

  const r2 = (v: number) => Math.round(v * 100) / 100;
  if (radius <= 0.05) {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${r2(p.x)} ${r2(p.y)}`).join(' ') + ' Z';
  }
  const parts: string[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const prev = pts[(i + n - 1) % n];
    const v = pts[i];
    const next = pts[(i + 1) % n];
    const inLen = Math.hypot(v.x - prev.x, v.y - prev.y);
    const outLen = Math.hypot(next.x - v.x, next.y - v.y);
    const r = Math.max(0, Math.min(radius, inLen / 2 - 0.01, outLen / 2 - 0.01));
    const pin = { x: v.x + ((prev.x - v.x) * r) / inLen, y: v.y + ((prev.y - v.y) * r) / inLen };
    const pout = { x: v.x + ((next.x - v.x) * r) / outLen, y: v.y + ((next.y - v.y) * r) / outLen };
    parts.push(
      `${i === 0 ? 'M' : 'L'} ${r2(pin.x)} ${r2(pin.y)}`,
      `Q ${r2(v.x)} ${r2(v.y)} ${r2(pout.x)} ${r2(pout.y)}`,
    );
  }
  return parts.join(' ') + ' Z';
}
