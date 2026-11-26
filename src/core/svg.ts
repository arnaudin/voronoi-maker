import { ringFill } from './colors';
import { Tessellation } from './composer';
import { polyPath } from './voronoi';

export interface CellShape {
  id: string;
  d: string;
  fill: string;
  /** Index into the tessellation's cells (and sites). Skipped degenerate cells
   *  mean this drifts from the id's number, so always go through it. */
  index: number;
  /** 0 for the cell itself, k for its k-th nested ring (1 = outermost). */
  ring: number;
}

/** Stable id/path/fill triples for every non-degenerate cell, each followed by
 *  its nested rings ("cell-042", "cell-042-ring-1", …) so they stack on top of
 *  it. Both the SVG serializer and the Figma layer-name map derive from this,
 *  so names match. */
export function cellShapes(t: Tessellation): CellShape[] {
  const shapes: CellShape[] = [];
  let cellNo = 0;
  t.cells.forEach((c, i) => {
    if (c.poly.length < 3) return;
    const d = polyPath(c.poly, t.params.rounding);
    if (!d) return;
    const id = `cell-${String(++cellNo).padStart(3, '0')}`;
    shapes.push({ id, d, fill: t.fills[i], index: i, ring: 0 });
    const rings = t.rings[i];
    for (let k = 1; k <= rings.length; k++) {
      const rd = polyPath(rings[k - 1], t.params.rounding);
      if (!rd) break;
      const fill = ringFill(t.fills[i], k, rings.length, t.params.ringShading);
      shapes.push({ id: `${id}-ring-${k}`, d: rd, fill, index: i, ring: k });
    }
  });
  return shapes;
}

/** "cell-042" → "Cell 042", "cell-042-ring-1" → "Cell 042 Ring 1",
 *  "background" → "Background". Anything else is left as is. */
export function prettyName(id: string): string {
  if (!/^[a-z]+(-([a-z]+|\d+))*$/.test(id)) return id;
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Map of Figma layer name → generated fill hex, matching the names main.ts
 *  produces. Used to detect (and preserve) manual recolors on update. */
export function layerFills(t: Tessellation): Map<string, string> {
  const map = new Map<string, string>();
  map.set('Background', t.params.style === 'bw' ? '#ffffff' : t.palette.bg);
  for (const s of cellShapes(t)) map.set(prettyName(s.id), s.fill);
  return map;
}

/** Serialize a tessellation to an SVG string. Each cell is its own closed
 *  <path> — Figma's createNodeFromSvg turns every one into an individually
 *  selectable VectorNode. */
export function toSVG(t: Tessellation, shapes: CellShape[] = cellShapes(t)): string {
  const { params, palette } = t;
  const bw = params.style === 'bw';
  const bg = bw ? '#ffffff' : palette.bg;
  const stroke = bw ? '#111111' : palette.ink;
  const strokeW = bw ? Math.max(0.75, params.strokeWidth) : params.strokeWidth;

  const paths = shapes.map((s) => {
    const attrs = [`id="${s.id}"`, `d="${s.d}"`, `fill="${s.fill}"`];
    if (strokeW > 0) {
      attrs.push(`stroke="${stroke}"`, `stroke-width="${strokeW}"`, 'stroke-linejoin="round"');
    }
    return `  <path ${attrs.join(' ')}/>`;
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${params.width}" height="${params.height}" viewBox="0 0 ${params.width} ${params.height}">`,
    `  <rect id="background" width="${params.width}" height="${params.height}" fill="${bg}"/>`,
    ...paths,
    '</svg>',
  ].join('\n');
}
