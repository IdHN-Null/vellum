import { B, TerrainResult } from "./terrain";
import { StyleId } from "./types";

type RGB = [number, number, number];

export interface Palette {
  deep: RGB; ocean: RGB; beach: RGB; grass: RGB; forest: RGB;
  desert: RGB; hill: RGB; mountain: RGB; snow: RGB; river: RGB;
  coastline: RGB; paperGrain: number; stipple: boolean;
}

const PALETTES: Record<StyleId, Palette> = {
  parchment: {
    // Classic fantasy-map grammar: land is a nearly flat cream tone; terrain is expressed
    // by glyphs and ink lines
    // (narrow hill/mountain colour steps — avoids wide brown terrace banding)
    deep: [118, 150, 142], ocean: [154, 182, 166], beach: [228, 204, 150],
    grass: [214, 184, 130], forest: [193, 176, 116], desert: [234, 202, 138],
    hill: [206, 175, 120], mountain: [188, 155, 108], snow: [240, 230, 206],
    river: [96, 138, 154], coastline: [86, 62, 36], paperGrain: 15, stipple: true,
  },
  color: {
    deep: [38, 70, 111], ocean: [62, 105, 146], beach: [222, 206, 160],
    grass: [122, 158, 96], forest: [72, 112, 62], desert: [222, 197, 132],
    hill: [148, 138, 100], mountain: [128, 118, 106], snow: [240, 244, 246],
    river: [70, 118, 160], coastline: [40, 52, 60], paperGrain: 9, stipple: false,
  },
  ink: {
    deep: [235, 232, 224], ocean: [242, 239, 231], beach: [235, 231, 220],
    grass: [244, 241, 233], forest: [214, 209, 196], desert: [240, 236, 224],
    hill: [222, 216, 202], mountain: [176, 168, 150], snow: [248, 246, 240],
    river: [120, 116, 104], coastline: [60, 55, 45], paperGrain: 6, stipple: true,
  },
};

export function hexToRGB(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(c: RGB): string {
  return "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

/** User colour-override key → palette slot */
export const TERRAIN_COLOR_KEYS: { key: string; label: string; slot: keyof Palette }[] = [
  { key: "water", label: "Water", slot: "ocean" },
  { key: "grass", label: "Grassland", slot: "grass" },
  { key: "forest", label: "Forest", slot: "forest" },
  { key: "desert", label: "Desert", slot: "desert" },
  { key: "snow", label: "Snow", slot: "snow" },
];

export function getPalette(style: StyleId, colors?: Record<string, string>): Palette {
  const base = PALETTES[style] ?? PALETTES.parchment;
  if (!colors) return base;
  const pal: Palette = { ...base };
  for (const { key, slot } of TERRAIN_COLOR_KEYS) {
    const hex = colors[key];
    if (!hex) continue;
    const rgb = hexToRGB(hex);
    if (!rgb) continue;
    (pal[slot] as RGB) = rgb;
    if (key === "water") {
      pal.deep = [rgb[0] * 0.82, rgb[1] * 0.85, rgb[2] * 0.85] as RGB;
    }
  }
  return pal;
}

export function hash2(x: number, y: number): number {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise (bilinear) — for paper mottling */
export function smoothVal(x: number, y: number, scale: number): number {
  const xf = x / scale, yf = y / scale;
  const xi = Math.floor(xf), yi = Math.floor(yf);
  const tx = xf - xi, ty = yf - yi;
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

let _grainTile: HTMLCanvasElement | null = null;

/**
 * Screen-resolution paper/ink grain tile (generated once and cached).
 * Laid over the map as a repeat pattern for a fine brush-pen texture independent of zoom.
 */
export function paperGrainTile(): HTMLCanvasElement {
  if (_grainTile) return _grainTile;
  const N = 160;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(N, N);
  const p = img.data;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const speck = hash2(x * 13 + 1, y * 7 + 3);         // fine specks
      const fiber = smoothVal(x, y * 0.35, 3.2);          // fibre grain
      const v = 128 + (speck - 0.5) * 26 + (fiber - 0.5) * 12;
      const o = (y * N + x) * 4;
      p[o] = p[o + 1] = p[o + 2] = Math.max(0, Math.min(255, v));
      p[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  _grainTile = c;
  return c;
}

export const GRAIN_TILE = 160;

/** Maximum coastal concentric-ring distance (cells) — tied to the waterDistance BFS range */
export const COAST_RING_MAX = 17;

/** Ring positions (cell distance) and darkness — spacing widens and rings fade with distance from shore */
const COAST_RINGS: [number, number][] = [[2.4, 13], [4.8, 9], [7.8, 6.5], [11.4, 4.5], [15.6, 3]];

/**
 * Antique-map sea detail: surface streaks + coastal concentric rings.
 * Returns a scalar delta to add to RGB (shared by the base render and the LOD detail render).
 */
export function oceanExtraShade(x: number, y: number, d: number): number {
  // Water-surface grain: subtle horizontally stretched streaks
  let v = (smoothVal(x + 533, y * 3.1 + 97, 9) - 0.5) * 6.5;
  if (d >= 1 && d <= COAST_RING_MAX) {
    for (let k = 0; k < COAST_RINGS.length; k++) {
      const t = (d - COAST_RINGS[k][0]) / 0.7;
      v -= Math.exp(-t * t) * COAST_RINGS[k][1];
    }
  }
  return v;
}

/** Land watercolour-wash variation: low-frequency vegetation mottling that breaks up flat plains (RGB delta) */
export function landWash(x: number, y: number): [number, number, number] {
  const v = smoothVal(x * 0.9 + 911, y * 0.9 + 533, 21) - 0.5;
  return [v * 5, v * 9, -v * 4];
}

export function biomeColor(pal: Palette, b: number): RGB {
  switch (b) {
    case B.DEEP: return pal.deep;
    case B.OCEAN: return pal.ocean;
    case B.BEACH: return pal.beach;
    case B.FOREST: return pal.forest;
    case B.DESERT: return pal.desert;
    case B.HILL: return pal.hill;
    case B.MOUNTAIN: return pal.mountain;
    case B.SNOW: return pal.snow;
    default: return pal.grass;
  }
}

export interface RenderOpts {
  colors?: Record<string, string>;
  coastWidth?: number;  // coastal band width (cells)
  coastColor?: string;  // coastal band colour (automatic when unset)
  waves?: boolean;      // coastal wave marks
  relief?: number;      // shading (wash) contrast multiplier (default 1)
  mottle?: number;      // paper mottling multiplier (default 1)
}

/** Terrain layers: base pixels + glyph stamps (the view composites them) */
export interface MapLayers {
  base: HTMLCanvasElement;
  stamps: HTMLCanvasElement;
  ss: number;            // stamp supersampling factor (softens zoom blur)
  waterDist: Uint8Array; // water-cell distance from land (shared by waves & coastal band)
}

function isWaterBiome(b: number): boolean {
  return b === B.DEEP || b === B.OCEAN;
}

const WAVE_DIST = 12;

/** BFS distance of water cells from land (values above maxD become 255) */
function waterDistance(biome: Uint8Array, w: number, h: number, maxD: number): Uint8Array {
  return distanceField(biome, w, h, maxD, true);
}

/** Distance of land cells from the waterline (for land hatching) */
export function landDistance(biome: Uint8Array, w: number, h: number, maxD: number): Uint8Array {
  return distanceField(biome, w, h, maxD, false);
}

/** BFS cell distance from the boundary — targetWater=true: water cells' distance from land; false: land cells' distance from water */
function distanceField(biome: Uint8Array, w: number, h: number, maxD: number, targetWater: boolean): Uint8Array {
  const isTarget = (b: number) => isWaterBiome(b) === targetWater;
  const dist = new Uint8Array(w * h).fill(255);
  let frontier: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (isTarget(biome[i])) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (isTarget(biome[ni]) && dist[ni] === 255) {
          dist[ni] = 1;
          frontier.push(ni);
        }
      }
    }
  }
  for (let d = 2; d <= maxD; d++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % w, y = (i / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (isTarget(biome[ni]) && dist[ni] === 255) {
          dist[ni] = d;
          next.push(ni);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

/** Allocate empty layers (pixels unrendered) — the starting point of the progressive tile render */
export function allocLayers(t: TerrainResult, opts: RenderOpts = {}): MapLayers {
  const base = document.createElement("canvas");
  base.width = t.w;
  base.height = t.h;
  // Tree/mountain glyphs are drawn at high resolution to soften zoom blur (lower factor for bigger maps)
  const ss = t.w <= 640 ? 3 : t.w <= 900 ? 2.5 : t.w <= 1600 ? 2 : 1.5;
  const stamps = document.createElement("canvas");
  stamps.width = Math.round(t.w * ss);
  stamps.height = Math.round(t.h * ss);
  return {
    base, stamps, ss,
    waterDist: waterDistance(t.biome, t.w, t.h, Math.max(WAVE_DIST, COAST_RING_MAX, Math.round(opts.coastWidth ?? 0) * 3)),
  };
}

/** Render one tile (cell rectangle) of base + stamps — called by the progressive scheduler */
export function renderTile(
  layers: MapLayers, t: TerrainResult, style: StyleId, opts: RenderOpts,
  x0: number, y0: number, x1: number, y1: number,
): void {
  paintBaseRect(layers, t, style, opts, x0, y0, x1, y1);
  stampRect(layers, t, style, opts, x0, y0, x1, y1);
}

/** Full layer render (synchronous; for small maps, exports and the test harness) */
export function renderLayers(t: TerrainResult, style: StyleId, opts: RenderOpts = {}): MapLayers {
  const layers = allocLayers(t, opts);
  renderTile(layers, t, style, opts, 0, 0, t.w - 1, t.h - 1);
  return layers;
}

/**
 * Redraw only the brushed area (instant feedback).
 * The water↔land boundary may change, so the coastal distance field is refreshed too —
 * the BFS is linear and takes a few ms.
 */
export function updateLayersRect(
  layers: MapLayers, t: TerrainResult, style: StyleId, opts: RenderOpts,
  x0: number, y0: number, x1: number, y1: number,
): void {
  layers.waterDist = waterDistance(t.biome, t.w, t.h, Math.max(WAVE_DIST, COAST_RING_MAX, Math.round(opts.coastWidth ?? 0) * 3));
  // Coastal band, waves and concentric rings spill beyond the brush, so repaint with a margin
  const pad = Math.max(WAVE_DIST, COAST_RING_MAX, Math.round(opts.coastWidth ?? 0) * 3) + 8;
  const rx0 = Math.max(0, x0 - pad), ry0 = Math.max(0, y0 - pad);
  const rx1 = Math.min(t.w - 1, x1 + pad), ry1 = Math.min(t.h - 1, y1 + pad);
  paintBaseRect(layers, t, style, opts, rx0, ry0, rx1, ry1);
  stampRect(layers, t, style, opts, rx0, ry0, rx1, ry1);
}

/** Pixel layer: water depth, hillshading, coastal band, paper texture (coastlines & rivers are vector-drawn, so excluded) */
function paintBaseRect(
  layers: MapLayers, t: TerrainResult, style: StyleId, opts: RenderOpts,
  x0: number, y0: number, x1: number, y1: number,
): void {
  const { w, h, height, biome, seaLevel } = t;
  const pal = getPalette(style, opts.colors);
  const coastW = Math.max(0, Math.min(12, Math.round(opts.coastWidth ?? 0)));
  const coastRGB = (opts.coastColor && hexToRGB(opts.coastColor)) ||
    [Math.min(255, pal.ocean[0] * 1.16), Math.min(255, pal.ocean[1] * 1.14), Math.min(255, pal.ocean[2] * 1.1)] as RGB;

  const rw = x1 - x0 + 1, rh = y1 - y0 + 1;
  const ctx = layers.base.getContext("2d")!;
  const img = ctx.createImageData(rw, rh);
  const px = img.data;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * w + x;
      const b = biome[i];
      let [r, g, bl] = biomeColor(pal, b);
      const el = height[i];

      if (isWaterBiome(b)) {
        // Even shallow water starts 22% into the deep colour → ramp compression stops the
        // coastal shelf floating mint-green. Lakes sit at or above sea level so their depth
        // reads as 0 — pin them at a middle depth instead.
        const rawDepth = Math.min(1, Math.max(0, (seaLevel - el) / 0.25));
        const depth = t.lake[i] ? 0.4 : 0.22 + 0.78 * Math.pow(rawDepth, 0.7);
        const dp = pal.deep, oc = pal.ocean;
        r = oc[0] + (dp[0] - oc[0]) * depth;
        g = oc[1] + (dp[1] - oc[1]) * depth;
        bl = oc[2] + (dp[2] - oc[2]) * depth;
        // Shoreline highlight: a narrow exponential-decay band (reads as light at the water's
        // edge, not a border stripe). Lakes are excluded — the band would swamp them and wash
        // out their colour.
        if (coastW > 0 && !t.lake[i]) {
          const d = layers.waterDist[i];
          if (d <= coastW * 3) {
            const f = Math.exp(-(d - 1) / (coastW * 0.9)) * 0.38;
            r += (coastRGB[0] - r) * f;
            g += (coastRGB[1] - g) * f;
            bl += (coastRGB[2] - bl) * f;
          }
        }
        // Waterline: darken water pixels touching land slightly (lake outline)
        if (t.lake[i] && layers.waterDist[i] === 1) {
          const ck = pal.coastline;
          r = r * 0.45 + ck[0] * 0.55;
          g = g * 0.45 + ck[1] * 0.55;
          bl = bl * 0.45 + ck[2] * 0.55;
        }
        // Surface grain + coastal concentric rings (antique-map ripples)
        const ex = oceanExtraShade(x, y, layers.waterDist[i]);
        r += ex; g += ex * 0.98; bl += ex * 0.9;
      } else {
        // Biome-boundary smoothing: bilinearly blend neighbouring cells' biome colours to soften edges
        // (milder than renderDetail's 3×3 Gaussian, but gives consistent rendering even mid-drag)
        const x1b = Math.min(w - 1, x + 1), y1b = Math.min(h - 1, y + 1);
        const c00 = biomeColor(pal, biome[i]);
        const c10 = biomeColor(pal, biome[y * w + x1b]);
        const c01 = biomeColor(pal, biome[y1b * w + x]);
        const c11 = biomeColor(pal, biome[y1b * w + x1b]);
        // 0.5 offset — neutral half-cell bilinear blend
        const tx = 0.5, ty = 0.5;
        r = (c00[0] * (1-tx) + c10[0] * tx) * (1-ty) + (c01[0] * (1-tx) + c11[0] * tx) * ty;
        g = (c00[1] * (1-tx) + c10[1] * tx) * (1-ty) + (c01[1] * (1-tx) + c11[1] * tx) * ty;
        bl = (c00[2] * (1-tx) + c10[2] * tx) * (1-ty) + (c01[2] * (1-tx) + c11[2] * tx) * ty;

        const hl = height[y * w + Math.max(0, x - 1)];
        const hu = height[Math.max(0, y - 1) * w + x];
        const rf = opts.relief ?? 1;
        const shade = 1 + (hl - el + hu - el) * 4.2 * rf;
        const rel = (el - seaLevel) / Math.max(0.0001, 1 - seaLevel);
        const lift = 1 + rel * 0.1 * rf;
        const sc = Math.min(1 + 0.22 * rf, Math.max(1 - 0.22 * rf, shade)) * lift;
        r *= sc; g *= sc; bl *= sc;
        if (b !== B.SNOW) {
          const wash = landWash(x, y);
          r += wash[0]; g += wash[1]; bl += wash[2];
        }
      }

      if (pal.paperGrain > 0) {
        const grain = (hash2(x + 999, y + 999) - 0.5) * pal.paperGrain * (isWaterBiome(b) ? 0.5 : 1);
        r += grain; g += grain; bl += grain;
      }
      // Paper mottling (all styles) — breaks the flat digital colour for an aged-paper feel.
      // Under half strength on water — a blotchy sea makes the boundary look messy
      // (same coefficient as the LOD render)
      const mScale = isWaterBiome(b) ? 0.45 : 1;
      const mottle = (smoothVal(x + 300, y + 300, 13) - 0.5) * 22 * (opts.mottle ?? 1) * mScale;
      r += mottle; g += mottle * 0.95; bl += mottle * 0.82;

      const o = ((y - y0) * rw + (x - x0)) * 4;
      px[o] = Math.max(0, Math.min(255, r));
      px[o + 1] = Math.max(0, Math.min(255, g));
      px[o + 2] = Math.max(0, Math.min(255, bl));
      px[o + 3] = 255;
    }
  }
  ctx.putImageData(img, x0, y0);
}

/** Stamp layer: forest trees, mountain-ridge glyphs, plus coastal waves */
function stampRect(
  layers: MapLayers, t: TerrainResult, style: StyleId, opts: RenderOpts,
  x0: number, y0: number, x1: number, y1: number,
): void {
  const { w, h, biome, height, seaLevel } = t;
  const pal = getPalette(style, opts.colors);
  const ink = pal.coastline;
  const ss = layers.ss;
  const ctx = layers.stamps.getContext("2d")!;

  ctx.save();
  ctx.scale(ss, ss); // draw in cell space but rasterise at ss× resolution → holds up when zoomed
  ctx.clearRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  ctx.clip();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const step = 7;
  const gx0 = Math.max(0, Math.floor((x0 - step) / step) * step);
  const gy0 = Math.max(0, Math.floor((y0 - step) / step) * step);
  for (let gy = gy0 + (step >> 1); gy <= y1 + step; gy += step) {
    for (let gx = gx0 + (step >> 1); gx <= x1 + step; gx += step) {
      const jx = gx + (hash2(gx, gy) - 0.5) * step * 0.9;
      const jy = gy + (hash2(gy, gx) - 0.5) * step * 0.9;
      const cx = Math.max(0, Math.min(w - 1, Math.round(jx)));
      const cyy = Math.max(0, Math.min(h - 1, Math.round(jy)));
      const i = cyy * w + cx;
      const b = biome[i];
      const rnd = hash2(gx * 7, gy * 13);

      // A glyph straddling the coastline or map edge looks cut in half — stamp only where
      // its whole footprint is on land
      const fitsLand = (r: number): boolean => {
        for (const [ox2, oy2] of [[-r, 0], [r, 0], [0, -r], [0, r]] as const) {
          const tx = Math.round(jx + ox2), ty = Math.round(jy + oy2);
          if (tx < 0 || ty < 0 || tx >= w || ty >= h) return false;
          if (isWaterBiome(biome[ty * w + tx])) return false;
        }
        return true;
      };

      if (b === B.FOREST && rnd < 0.85) {
        // Tree: ground shadow + trunk + hand-drawn multi-facet canopy + lower-left shading (bulk)
        const s = 2.2 + rnd * 1.7;
        const radius = s * 0.62;
        const cy = jy - s * 0.15;
        if (!fitsLand(s * 1.15)) continue;

        // Ground shadow (overlapping canopies read as a forest mass)
        ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.10)`;
        ctx.beginPath();
        ctx.ellipse(jx + radius * 0.2, jy + s * 0.95, radius * 1.05, radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.55)`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(jx, jy + s);
        ctx.lineTo(jx, jy + s * 0.3);
        ctx.stroke();

        const canopy = new Path2D();
        const segments = 10;
        for (let k = 0; k < segments; k++) {
          const theta = (k * Math.PI * 2) / segments;
          // Mix in deterministic noise for hand-drawn line tremor
          const r_jitter = radius * (0.86 + 0.28 * hash2(jx + k * 17, cy + 31));
          const tx = jx + Math.cos(theta) * r_jitter;
          const ty = cy + Math.sin(theta) * r_jitter;
          if (k === 0) canopy.moveTo(tx, ty);
          else canopy.lineTo(tx, ty);
        }
        canopy.closePath();

        const fc = pal.forest;
        ctx.fillStyle = `rgba(${fc[0] * 0.92},${fc[1] * 0.94},${fc[2] * 0.86},0.95)`;
        ctx.fill(canopy);
        // Lower-left canopy shading (volume)
        ctx.save();
        ctx.clip(canopy);
        ctx.fillStyle = `rgba(${fc[0] * 0.55},${fc[1] * 0.6},${fc[2] * 0.5},0.5)`;
        ctx.beginPath();
        ctx.ellipse(jx - radius * 0.45, cy + radius * 0.45, radius * 0.85, radius * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.stroke(canopy);
      } else if (b === B.HILL && rnd < 0.5) {
        // Hill: low mound arc + short hatching on the right (relieves the flat colour-only look)
        const s = 1.7 + rnd * 1.5;
        if (!fitsLand(s * 1.1)) continue;
        const peakX = jx + (hash2(jx + 7, jy + 3) - 0.5) * s * 0.3;
        const peakY = jy - s * 0.6 + (hash2(jx, jy + 5) - 0.5) * s * 0.16;
        const baseY = jy + s * 0.2;
        const mound = new Path2D();
        mound.moveTo(jx - s, baseY);
        mound.quadraticCurveTo(peakX - s * 0.4, peakY, peakX, peakY);
        mound.quadraticCurveTo(peakX + s * 0.45, peakY + s * 0.1, jx + s, baseY);
        ctx.fillStyle = "rgba(255,250,235,0.20)";
        ctx.fill(mound);
        ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.5)`;
        ctx.lineWidth = 0.7;
        ctx.stroke(mound);
        // One or two hatching strokes on the right slope
        ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.3)`;
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        const hn = 1 + Math.round(hash2(jx + 3, jy) * 1.2);
        for (let h = 1; h <= hn; h++) {
          const t = h / (hn + 1);
          const hx = peakX + t * (jx + s - peakX) * 0.8;
          const hy = peakY + t * (baseY - peakY) * 0.85;
          ctx.moveTo(hx, hy);
          ctx.quadraticCurveTo(hx - s * 0.12, hy + s * 0.2, hx - s * 0.2, hy + s * 0.34);
        }
        ctx.stroke();
      } else if (opts.waves !== false && isWaterBiome(b) && rnd < 0.24) {
        // Coastal waves: ripple strokes in near-shore water (antique-map style)
        const d = layers.waterDist[i];
        if (d >= 4 && d <= WAVE_DIST) {
          const fade = 1 - (d - 4) / (WAVE_DIST - 4);
          const s = 2.5 + rnd * 3;
          ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${0.16 * fade})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(jx - s, jy);
          ctx.quadraticCurveTo(jx - s * 0.5, jy - s * 0.28, jx, jy);
          ctx.quadraticCurveTo(jx + s * 0.5, jy + s * 0.28, jx + s, jy);
          ctx.stroke();
        }
      }
    }
  }

  // Mountains: a sparser separate grid with alternate rows shifted half a step — reads as
  // overlapping chains rather than a uniform 'triangle carpet' (Tolkien-esque: rows of
  // large, bold peaks)
  const mStep = 11;
  const mgx0 = Math.max(0, Math.floor((x0 - mStep * 2) / mStep) * mStep);
  const mgy0 = Math.max(0, Math.floor((y0 - mStep * 2) / mStep) * mStep);
  for (let gy = mgy0 + (mStep >> 1); gy <= y1 + mStep; gy += mStep) {
    const rowShift = ((gy / mStep) | 0) % 2 === 0 ? 0 : mStep * 0.5;
    for (let gx = mgx0 + (mStep >> 1); gx <= x1 + mStep; gx += mStep) {
      const bx = gx + rowShift;
      const jx = bx + (hash2(bx, gy) - 0.5) * mStep * 0.6;
      const jy = gy + (hash2(gy, bx) - 0.5) * mStep * 0.6;
      const cx = Math.max(0, Math.min(w - 1, Math.round(jx)));
      const cyy = Math.max(0, Math.min(h - 1, Math.round(jy)));
      const i = cyy * w + cx;
      const b = biome[i];
      const rnd = hash2(bx * 7, gy * 13);
      if (b !== B.MOUNTAIN && b !== B.SNOW) continue;
      if (rnd >= 0.9) continue;
      {
        const rel = (height[i] - seaLevel) / Math.max(0.0001, 1 - seaLevel);
        if (b === B.SNOW && (rel < 0.55 || rnd > 0.65)) continue; // only sparse snow peaks on snowfields
        // Mountain: ridge-kink jitter + bright left face / ink-washed right face for volume (woodcut style)
        const s = 3.6 + rnd * 3.6;
        const left_h = hash2(jx - 100, jy);
        const right_h = hash2(jx + 100, jy);
        const peakX = jx + (hash2(jx + 51, jy - 17) - 0.5) * s * 0.22;
        const peakY = jy - s * 0.78;
        const lbX = jx - s, lbY = jy + s * 0.55;
        const rbX = jx + s, rbY = jy + s * 0.5;
        const lmx = (lbX + peakX) / 2 + (left_h - 0.5) * s * 0.2;
        const lmy = (lbY + peakY) / 2 + (left_h - 0.5) * s * 0.16;
        const rmx = (rbX + peakX) / 2 + (right_h - 0.5) * s * 0.2;
        const rmy = (rbY + peakY) / 2 + (right_h - 0.5) * s * 0.16;

        // Left face: bright (sunlit)
        const leftFace = new Path2D();
        leftFace.moveTo(lbX, lbY);
        leftFace.lineTo(lmx, lmy);
        leftFace.lineTo(peakX, peakY);
        leftFace.lineTo(peakX + s * 0.04, jy + s * 0.5);
        leftFace.closePath();
        ctx.fillStyle = "rgba(255,251,240,0.32)";
        ctx.fill(leftFace);
        // Right face: ink wash (shade)
        const rightFace = new Path2D();
        rightFace.moveTo(peakX, peakY);
        rightFace.lineTo(rmx, rmy);
        rightFace.lineTo(rbX, rbY);
        rightFace.lineTo(peakX + s * 0.04, jy + s * 0.5);
        rightFace.closePath();
        ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.16)`;
        ctx.fill(rightFace);

        // Ridge ink line
        ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.8)`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(lbX, lbY);
        ctx.lineTo(lmx, lmy);
        ctx.lineTo(peakX, peakY);
        ctx.lineTo(rmx, rmy);
        ctx.lineTo(rbX, rbY);
        ctx.stroke();

        // Mountain shading hatch (4–6 soft curved strokes on the right slope)
        ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.4)`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        const hatchCount = 4 + Math.floor(rnd * 3);
        for (let h = 1; h <= hatchCount; h++) {
          const t = h / (hatchCount + 1);
          // Hatch start point (walking down the right slope)
          const startX = peakX + t * (rbX - peakX);
          const startY = peakY + t * (rbY - peakY);

          const hatchLen = s * 0.45 * (1 - t * 0.4) * (0.8 + 0.4 * hash2(jx + h, jy));
          // Control points set so the stroke curves slightly inwards rather than running straight
          const endX = startX - hatchLen * 0.5;
          const endY = startY + hatchLen;
          const cpX = startX - hatchLen * 0.1;
          const cpY = startY + hatchLen * 0.6;

          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        }
        ctx.stroke();
        if (b === B.SNOW) {
          ctx.strokeStyle = "rgba(255,255,255,0.6)";
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(peakX - s * 0.3, peakY + s * 0.44);
          ctx.lineTo(peakX, peakY);
          ctx.lineTo(peakX + s * 0.3, peakY + s * 0.44);
          ctx.stroke();
        }
      }
    }
  }
  ctx.restore();
}
