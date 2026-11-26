"use strict";
var VoronoiCore = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/core/index.ts
  var index_exports = {};
  __export(index_exports, {
    DEFAULT_PARAMS: () => DEFAULT_PARAMS,
    PALETTES: () => PALETTES,
    PATTERNS: () => PATTERNS,
    compose: () => compose,
    generate: () => generate,
    getPalette: () => getPalette,
    insetPolygon: () => insetPolygon,
    layerCells: () => layerCells,
    layerFillMap: () => layerFillMap,
    matchByPosition: () => matchByPosition,
    matchLayers: () => matchLayers,
    prettyName: () => prettyName,
    sameGeometry: () => sameGeometry
  });

  // src/core/rng.ts
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }
  function range(rng, min, max) {
    return min + rng() * (max - min);
  }
  function gaussian(rng) {
    const u = Math.max(rng(), 1e-9);
    const v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // src/core/colors.ts
  function assignFills(cells, style, strategy, palette, gradientAngle, rng) {
    if (style === "bw") return cells.map(() => "#ffffff");
    if (style === "gradient") return gradientFills(cells, palette, gradientAngle);
    if (strategy === "random") return cells.map(() => pick(rng, palette.colors));
    if (strategy === "bySize") return sizeFills(cells, palette);
    return balancedFills(cells, palette);
  }
  function balancedFills(cells, palette) {
    const colors = palette.colors;
    const idx = new Array(cells.length).fill(-1);
    const counts = new Array(colors.length).fill(0);
    cells.forEach((c, i) => {
      const banned = /* @__PURE__ */ new Set();
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
  function sizeFills(cells, palette) {
    const order = cells.map((_, i) => i).sort((a, b) => cells[a].area - cells[b].area);
    const fills = new Array(cells.length).fill(palette.colors[0]);
    order.forEach((cellIdx, rank) => {
      const k = Math.min(
        palette.colors.length - 1,
        Math.floor(rank / cells.length * palette.colors.length)
      );
      fills[cellIdx] = palette.colors[k];
    });
    return fills;
  }
  function gradientFills(cells, palette, angleDeg) {
    const rad = angleDeg * Math.PI / 180;
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
  function ringFill(base, k, count, shading) {
    const t = shading === "alternate" ? k % 2 === 1 ? 0.45 : 0 : 0.72 * k / count;
    return hexLerp(base, "#ffffff", t);
  }
  function sampleStops(stops, t) {
    const clamped = Math.min(1, Math.max(0, t));
    const seg = clamped * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(seg));
    return hexLerp(stops[i], stops[i + 1], seg - i);
  }
  function hexLerp(a, b, t) {
    const na = parseInt(a.slice(1), 16);
    const nb = parseInt(b.slice(1), 16);
    const mix = (sa, sb) => Math.round(sa + (sb - sa) * t);
    const to = (v) => v.toString(16).padStart(2, "0");
    return "#" + to(mix(na >> 16 & 255, nb >> 16 & 255)) + to(mix(na >> 8 & 255, nb >> 8 & 255)) + to(mix(na & 255, nb & 255));
  }

  // src/core/palettes.ts
  var PALETTES = [
    {
      id: "terrazzo",
      name: "Terrazzo",
      bg: "#f5efe4",
      ink: "#33302b",
      colors: ["#d96f4e", "#e8b64c", "#7ea172", "#41576e", "#c9b7a0", "#8c5b45"]
    },
    {
      id: "lagoon",
      name: "Lagoon",
      bg: "#0d3b4f",
      ink: "#082733",
      colors: ["#0f6f7a", "#2fa5a0", "#7fd0c4", "#bfe8dd", "#eaf6f0", "#17495c"]
    },
    {
      id: "citrus",
      name: "Citrus",
      bg: "#fff8e8",
      ink: "#4c4433",
      colors: ["#ef476f", "#f78c6b", "#ffd166", "#83d483", "#06d6a0", "#118ab2"]
    },
    {
      id: "ultraviolet",
      name: "Ultraviolet",
      bg: "#181433",
      ink: "#0e0b22",
      colors: ["#5e60ce", "#6930c3", "#7400b8", "#5390d9", "#48bfe3", "#80ffdb"]
    },
    {
      id: "terra",
      name: "Terra",
      bg: "#efe6d8",
      ink: "#3f3128",
      colors: ["#7f4f24", "#936639", "#a68a64", "#b6ad90", "#656d4a", "#414833"]
    },
    {
      id: "sorbet",
      name: "Sorbet",
      bg: "#fdf3f6",
      ink: "#907a86",
      colors: ["#ffadad", "#ffd6a5", "#fdffb6", "#caffbf", "#9bf6ff", "#bdb2ff"]
    }
  ];
  function getPalette(id) {
    var _a;
    return (_a = PALETTES.find((p) => p.id === id)) != null ? _a : PALETTES[0];
  }

  // src/core/points.ts
  var PATTERNS = [
    { id: "scatter", name: "Scatter" },
    { id: "clusters", name: "Clusters" },
    { id: "grid", name: "Grid" },
    { id: "orbits", name: "Orbits" }
  ];
  var clampIn = (v, hi) => Math.min(hi - 1, Math.max(1, v));
  function generateSites(rng, count, w, h, pattern) {
    let pts;
    if (pattern === "clusters") pts = clusters(rng, count, w, h);
    else if (pattern === "grid") pts = hexGrid(rng, count, w, h);
    else if (pattern === "orbits") pts = orbits(rng, count, w, h);
    else pts = scatter(rng, count, w, h);
    return dedupe(pts);
  }
  function scatter(rng, count, w, h) {
    const pts = [];
    for (let i = 0; i < count; i++) pts.push({ x: range(rng, 1, w - 1), y: range(rng, 1, h - 1) });
    return pts;
  }
  function clusters(rng, count, w, h) {
    const k = Math.max(3, Math.round(Math.sqrt(count) * 0.8));
    const centers = [];
    for (let i = 0; i < k; i++) {
      centers.push({ x: range(rng, w * 0.12, w * 0.88), y: range(rng, h * 0.12, h * 0.88) });
    }
    const sigma = Math.min(w, h) / Math.sqrt(k) * 0.42;
    const pts = [];
    const dusting = Math.round(count * 0.15);
    for (let i = 0; i < dusting; i++) pts.push({ x: range(rng, 1, w - 1), y: range(rng, 1, h - 1) });
    for (let i = dusting; i < count; i++) {
      const c = pick(rng, centers);
      pts.push({
        x: clampIn(c.x + gaussian(rng) * sigma, w),
        y: clampIn(c.y + gaussian(rng) * sigma, h)
      });
    }
    return pts;
  }
  function hexGrid(rng, count, w, h) {
    const s = Math.sqrt(w * h / count * (2 / Math.sqrt(3)));
    const rowH = s * Math.sqrt(3) / 2;
    const jitter = s * 0.18;
    const pts = [];
    let row = 0;
    for (let y = rowH / 2; y < h; y += rowH, row++) {
      for (let x = row % 2 ? s : s / 2; x < w; x += s) {
        pts.push({
          x: clampIn(x + range(rng, -jitter, jitter), w),
          y: clampIn(y + range(rng, -jitter, jitter), h)
        });
      }
    }
    return pts;
  }
  function orbits(rng, count, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.hypot(w, h) / 2;
    const rings = Math.max(3, Math.round(Math.sqrt(count) / 1.6));
    const ringW = maxR / rings;
    const radii = [];
    let totalW = 0;
    for (let j = 0; j < rings; j++) {
      radii.push((j + 0.5) * ringW);
      totalW += radii[j];
    }
    const pts = [{ x: cx, y: cy }];
    for (let j = 0; j < rings; j++) {
      const cnt = Math.max(3, Math.round((count - 1) * radii[j] / totalW));
      const phase = range(rng, 0, 2 * Math.PI);
      for (let c = 0; c < cnt; c++) {
        const angle = phase + (c + range(rng, -0.3, 0.3)) / cnt * 2 * Math.PI;
        const r = radii[j] + range(rng, -0.3, 0.3) * ringW;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (x > 1 && x < w - 1 && y > 1 && y < h - 1) pts.push({ x, y });
      }
    }
    return pts;
  }
  function dedupe(pts) {
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const p of pts) {
      const key = `${Math.round(p.x * 2)}:${Math.round(p.y * 2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  }

  // src/core/voronoi.ts
  function clipHalfPlane(poly, ax, ay, nx, ny) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const dp = (p.x - ax) * nx + (p.y - ay) * ny;
      const dq = (q.x - ax) * nx + (q.y - ay) * ny;
      if (dp <= 0) out.push(p);
      if (dp < 0 && dq > 0 || dp > 0 && dq < 0) {
        const t = dp / (dp - dq);
        out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
      }
    }
    return out;
  }
  function maxDist(s, poly) {
    let m = 0;
    for (const p of poly) {
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (d > m) m = d;
    }
    return m;
  }
  function computeCells(sites, w, h, gap) {
    const n = sites.length;
    const g = gap / 2;
    const cell = Math.max(4, Math.sqrt(w * h / Math.max(1, n)));
    const cols = Math.max(1, Math.ceil(w / cell));
    const rows = Math.max(1, Math.ceil(h / cell));
    const buckets = Array.from({ length: cols * rows }, () => []);
    const gx = (p) => Math.min(cols - 1, Math.max(0, Math.floor(p.x / cell)));
    const gy = (p) => Math.min(rows - 1, Math.max(0, Math.floor(p.y / cell)));
    sites.forEach((p, i) => buckets[gy(p) * cols + gx(p)].push(i));
    const rect = [
      { x: g, y: g },
      { x: w - g, y: g },
      { x: w - g, y: h - g },
      { x: g, y: h - g }
    ];
    return sites.map((s, i) => {
      let poly = rect;
      const neighbors = [];
      let radius = maxDist(s, poly);
      const cgx = gx(s);
      const cgy = gy(s);
      const maxRing = Math.max(cols, rows);
      for (let ring = 0; ring <= maxRing && poly.length >= 3; ring++) {
        if (ring >= 2 && (ring - 1) * cell / 2 - g > radius) break;
        const cand = [];
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
      const centroid = poly.length >= 3 && area > 1e-6 ? { x: cx / (3 * a2), y: cy / (3 * a2) } : { x: s.x, y: s.y };
      return { site: s, poly, neighbors, area, centroid };
    });
  }
  function relaxSites(sites, w, h) {
    return computeCells(sites, w, h, 0).map((c) => c.centroid);
  }
  function insetPolygon(poly, d) {
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
  var MAX_RINGS = 40;
  function cellRings(poly, spacing) {
    const rings = [];
    if (spacing <= 0) return rings;
    while (rings.length < MAX_RINGS) {
      const ring = insetPolygon(poly, (rings.length + 1) * spacing);
      if (!ring.length || !insetPolygon(ring, spacing).length) break;
      rings.push(ring);
    }
    return rings;
  }
  function polyPath(poly, radius) {
    const pts = [];
    for (const p of poly) {
      const prev = pts[pts.length - 1];
      if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 0.02) pts.push(p);
    }
    while (pts.length > 1 && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) <= 0.02) {
      pts.pop();
    }
    if (pts.length < 3) return "";
    const r2 = (v) => Math.round(v * 100) / 100;
    if (radius <= 0.05) {
      return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${r2(p.x)} ${r2(p.y)}`).join(" ") + " Z";
    }
    const parts = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const prev = pts[(i + n - 1) % n];
      const v = pts[i];
      const next = pts[(i + 1) % n];
      const inLen = Math.hypot(v.x - prev.x, v.y - prev.y);
      const outLen = Math.hypot(next.x - v.x, next.y - v.y);
      const r = Math.max(0, Math.min(radius, inLen / 2 - 0.01, outLen / 2 - 0.01));
      const pin = { x: v.x + (prev.x - v.x) * r / inLen, y: v.y + (prev.y - v.y) * r / inLen };
      const pout = { x: v.x + (next.x - v.x) * r / outLen, y: v.y + (next.y - v.y) * r / outLen };
      parts.push(
        `${i === 0 ? "M" : "L"} ${r2(pin.x)} ${r2(pin.y)}`,
        `Q ${r2(v.x)} ${r2(v.y)} ${r2(pout.x)} ${r2(pout.y)}`
      );
    }
    return parts.join(" ") + " Z";
  }

  // src/core/composer.ts
  var DEFAULT_PARAMS = {
    width: 800,
    height: 600,
    density: 140,
    relax: 2,
    pattern: "scatter",
    gap: 4,
    rounding: 0,
    ringSpacing: 0,
    ringShading: "fade",
    strokeWidth: 2,
    style: "color",
    themeId: "terrazzo",
    colorStrategy: "balanced",
    gradientAngle: 35,
    seed: 12345
  };
  function clampParams(p) {
    const num = (v, d) => typeof v === "number" && isFinite(v) ? v : d;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const D = DEFAULT_PARAMS;
    const ringSpacing = num(p.ringSpacing, D.ringSpacing);
    return {
      width: clamp(Math.round(num(p.width, D.width)), 100, 4e3),
      height: clamp(Math.round(num(p.height, D.height)), 100, 4e3),
      density: clamp(Math.round(num(p.density, D.density)), 4, 1200),
      relax: clamp(Math.round(num(p.relax, D.relax)), 0, 10),
      pattern: PATTERNS.some((x) => x.id === p.pattern) ? p.pattern : D.pattern,
      gap: clamp(num(p.gap, D.gap), 0, 40),
      rounding: clamp(num(p.rounding, D.rounding), 0, 60),
      // Below 2px rings would be a solid smear of strokes; treat that as off.
      ringSpacing: ringSpacing < 2 ? 0 : clamp(ringSpacing, 2, 200),
      ringShading: p.ringShading === "alternate" ? "alternate" : "fade",
      strokeWidth: clamp(num(p.strokeWidth, D.strokeWidth), 0, 12),
      style: p.style === "gradient" || p.style === "bw" ? p.style : "color",
      themeId: PALETTES.some((x) => x.id === p.themeId) ? p.themeId : D.themeId,
      colorStrategy: p.colorStrategy === "random" || p.colorStrategy === "bySize" ? p.colorStrategy : "balanced",
      gradientAngle: clamp(num(p.gradientAngle, D.gradientAngle), 0, 360),
      seed: Math.round(num(p.seed, D.seed))
    };
  }
  function compose(raw) {
    const params = clampParams(raw);
    const rngGeo = mulberry32(params.seed);
    const rngColor = mulberry32((params.seed ^ 2654435769) >>> 0);
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
      rngColor
    );
    const rings = cells.map((c) => cellRings(c.poly, params.ringSpacing));
    return { params, palette, cells, fills, rings };
  }

  // src/core/svg.ts
  function cellShapes(t) {
    const shapes = [];
    let cellNo = 0;
    t.cells.forEach((c, i) => {
      if (c.poly.length < 3) return;
      const d = polyPath(c.poly, t.params.rounding);
      if (!d) return;
      const id = `cell-${String(++cellNo).padStart(3, "0")}`;
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
  function prettyName(id) {
    if (!/^[a-z]+(-([a-z]+|\d+))*$/.test(id)) return id;
    return id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  function layerFills(t) {
    const map = /* @__PURE__ */ new Map();
    map.set("Background", t.params.style === "bw" ? "#ffffff" : t.palette.bg);
    for (const s of cellShapes(t)) map.set(prettyName(s.id), s.fill);
    return map;
  }
  function toSVG(t, shapes = cellShapes(t)) {
    const { params, palette } = t;
    const bw = params.style === "bw";
    const bg = bw ? "#ffffff" : palette.bg;
    const stroke = bw ? "#111111" : palette.ink;
    const strokeW = bw ? Math.max(0.75, params.strokeWidth) : params.strokeWidth;
    const paths = shapes.map((s) => {
      const attrs = [`id="${s.id}"`, `d="${s.d}"`, `fill="${s.fill}"`];
      if (strokeW > 0) {
        attrs.push(`stroke="${stroke}"`, `stroke-width="${strokeW}"`, 'stroke-linejoin="round"');
      }
      return `  <path ${attrs.join(" ")}/>`;
    });
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${params.width}" height="${params.height}" viewBox="0 0 ${params.width} ${params.height}">`,
      `  <rect id="background" width="${params.width}" height="${params.height}" fill="${bg}"/>`,
      ...paths,
      "</svg>"
    ].join("\n");
  }

  // src/core/match.ts
  var CELL_KEYS = ["width", "height", "density", "relax", "pattern", "gap", "seed"];
  function cellsOf(t) {
    const map = /* @__PURE__ */ new Map();
    for (const s of cellShapes(t)) {
      if (s.ring) continue;
      const c = t.cells[s.index];
      map.set(prettyName(s.id), {
        index: s.index,
        poly: c.poly,
        centroid: c.centroid,
        rings: t.rings[s.index]
      });
    }
    return map;
  }
  function layerCells(params) {
    return cellsOf(compose(params));
  }
  function sameCells(a, b) {
    const ca = clampParams(a);
    const cb = clampParams(b);
    return CELL_KEYS.every((k) => ca[k] === cb[k]);
  }
  function sameGeometry(a, b) {
    return sameCells(a, b) && clampParams(a).ringSpacing === clampParams(b).ringSpacing;
  }
  function splitRing(name) {
    const m = / Ring (\d+)$/.exec(name);
    return m ? [name.slice(0, m.index), Number(m[1])] : [name, 0];
  }
  function polyDistance(p, poly) {
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
  function matchByPosition(from, to, names) {
    return positionMatch(compose(from), compose(to), names);
  }
  function positionMatch(src, dst, names) {
    const srcCells = cellsOf(src);
    const dstCells = [...cellsOf(dst)];
    const sx = dst.params.width / src.params.width;
    const sy = dst.params.height / src.params.height;
    const tol = Math.sqrt(dst.params.width * dst.params.height / dst.params.density) / 2;
    const reach = dstCells.map(
      ([, c]) => Math.max(...c.poly.map((v) => Math.hypot(v.x - c.centroid.x, v.y - c.centroid.y)))
    );
    const out = /* @__PURE__ */ new Map();
    const claims = /* @__PURE__ */ new Map();
    for (const name of names) {
      if (name === "Background") {
        out.set(name, name);
        continue;
      }
      const cell = srcCells.get(name);
      if (!cell) continue;
      const p = { x: cell.centroid.x * sx, y: cell.centroid.y * sy };
      let best = -1;
      let bestD = tol;
      let bestDc = Infinity;
      dstCells.forEach(([, c], j) => {
        const dc = Math.hypot(c.centroid.x - p.x, c.centroid.y - p.y);
        if (dc - reach[j] > bestD) return;
        const d = polyDistance(p, c.poly);
        if (d < bestD || d === bestD && dc < bestDc) {
          best = j;
          bestD = d;
          bestDc = dc;
        }
      });
      if (best < 0) continue;
      const target = dstCells[best][0];
      const prev = claims.get(target);
      if (prev && (prev.d < bestD || prev.d === bestD && prev.dc <= bestDc)) continue;
      claims.set(target, { name, d: bestD, dc: bestDc });
    }
    for (const [target, claim] of claims) out.set(claim.name, target);
    return out;
  }
  function matchLayers(from, to, names) {
    const list = [...names];
    if (sameGeometry(from, to)) return new Map(list.map((n) => [n, n]));
    const dst = compose(to);
    const cells = [...new Set(list.map((n) => splitRing(n)[0]))];
    const cellMap = sameCells(from, to) ? new Map(cells.map((c) => [c, c])) : positionMatch(compose(from), dst, cells);
    const layers = new Set(layerFills(dst).keys());
    const out = /* @__PURE__ */ new Map();
    for (const name of list) {
      const [cell, ring] = splitRing(name);
      const target = cellMap.get(cell);
      const layer = target && ring ? `${target} Ring ${ring}` : target;
      if (layer && layers.has(layer)) out.set(name, layer);
    }
    return out;
  }

  // src/core/index.ts
  function generate(params) {
    const tessellation = compose(params);
    const shapes = cellShapes(tessellation);
    const cellCount = shapes.filter((s) => s.ring === 0).length;
    return {
      svg: toSVG(tessellation, shapes),
      cellCount,
      ringCount: shapes.length - cellCount,
      tessellation
    };
  }
  function layerFillMap(params) {
    return layerFills(compose(params));
  }
  return __toCommonJS(index_exports);
})();
