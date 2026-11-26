import { compose, DEFAULT_PARAMS, Tessellation, VoronoiParams } from './composer';
import { cellShapes, layerFills, prettyName, toSVG } from './svg';

export { compose, DEFAULT_PARAMS, prettyName };
export type { Tessellation, VoronoiParams };
export { layerCells, matchByPosition, matchLayers, sameGeometry } from './match';
export type { LayerCell } from './match';
export { PALETTES, getPalette } from './palettes';
export type { Palette } from './palettes';
export { PATTERNS } from './points';
export { insetPolygon } from './voronoi';
export type { PatternId } from './points';
export type { ColorStrategy, RingShading, StyleId } from './colors';

export interface GenerateResult {
  svg: string;
  cellCount: number;
  /** Nested ring layers across all cells (0 when rings are off). */
  ringCount: number;
  tessellation: Tessellation;
}

/** Main entry point: params → deterministic SVG Voronoi fill. */
export function generate(params: VoronoiParams): GenerateResult {
  const tessellation = compose(params);
  const shapes = cellShapes(tessellation);
  const cellCount = shapes.filter((s) => s.ring === 0).length;
  return {
    svg: toSVG(tessellation, shapes),
    cellCount,
    ringCount: shapes.length - cellCount,
    tessellation,
  };
}

/** "Cell 042" / "Cell 042 Ring 1" → generated fill hex, for manual-override detection. */
export function layerFillMap(params: VoronoiParams): Map<string, string> {
  return layerFills(compose(params));
}
