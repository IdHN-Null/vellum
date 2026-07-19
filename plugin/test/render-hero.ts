/**
 * Showcase render for the Vellum landing page.
 *   npx esbuild test/render-hero.ts --bundle --platform=node --external:skia-canvas --outfile=test/render-hero.js
 *   node test/render-hero.js
 * Output:
 *   ../../docs/map/hero.jpg                (16:9 wide — the scroll showcase)
 *   ../../docs/assets/style-{parchment,color,ink}.jpg  (same map, three styles)
 *   ../../docs/assets/{feat-terrain,feat-craft,feat-world,detail}.jpg
 *   ../../docs/assets/stickers.png
 */
import { Canvas, Path2D as SkPath2D, FontLibrary } from "skia-canvas";
import * as fs from "fs";
import * as path from "path";

(globalThis as unknown as Record<string, unknown>).document = {
  createElement: (tag: string) => {
    if (tag !== "canvas") throw new Error("canvas only");
    return new Canvas(1, 1);
  },
};
(globalThis as unknown as Record<string, unknown>).Path2D = SkPath2D;

try {
  FontLibrary.use("FMS Serif", [path.join(__dirname, "../fonts/Cinzel*.woff2")]);
  FontLibrary.use("FMS Hand", [path.join(__dirname, "../fonts/Gaegu*.woff2")]);
} catch { /* fallback */ }

/* eslint-disable import/first */
import { Ornament, StyleId, defaultDecor, defaultMapData } from "../src/types";
import { B, composeTerrain, generateBase, TerrainResult } from "../src/terrain";
import { getPalette, landDistance, paperGrainTile, renderLayers } from "../src/render2d";
import { chaikin, extractContours, extractIsoRings, simplifyLine, ContourSet } from "../src/contours";
import { roughLine, roughRing, sketchToPath } from "../src/rough";
import { drawMapEffects, drawOrnaments } from "../src/decor";
import { drawMarkerIcon } from "../src/icons";
import { ribbonPath } from "../src/ink";

const OUT = path.join(__dirname, "../../docs/assets");
const MAP_OUT = path.join(__dirname, "../../docs/map");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(MAP_OUT, { recursive: true });

type Ctx = CanvasRenderingContext2D;

// ── Map definition: 16:9 wide ────────────────────────────
const MAP_W = 768, MAP_H = 432, SCALE = 3;
const SEED = 151186;

const map = defaultMapData("Continent of Estella", SEED);
map.width = MAP_W;
map.height = MAP_H;
map.gen.polarNorth = 0.09;
map.gen.polarSouth = 0.07;

const terrain = composeTerrain(map, generateBase(map), null, null);
const contours = extractContours(terrain.height, terrain.w, terrain.h, terrain.seaLevel, map.gen.precision);
const W = terrain.w, H = terrain.h;

// ── Terrain-aware placement (markers on real land, decorations on real sea) ──
const land = (x: number, y: number) => terrain.biome[y * W + x] >= B.BEACH;
const near = (x: number, y: number, want: boolean, rad: number) => {
  for (const [dx, dy] of [[rad, 0], [-rad, 0], [0, rad], [0, -rad], [rad, rad], [-rad, -rad], [rad, -rad], [-rad, rad]] as const) {
    const xx = Math.max(0, Math.min(W - 1, x + dx)), yy = Math.max(0, Math.min(H - 1, y + dy));
    if (land(xx, yy) === want) return true;
  }
  return false;
};
const pick = (nx: number, ny: number, opts: { water?: boolean; coastal?: boolean; inland?: boolean } = {}) => {
  const wantLand = !opts.water;
  const tx = Math.round(nx * W), ty = Math.round(ny * H);
  let best: [number, number] | null = null, bd = Infinity;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (land(x, y) !== wantLand) continue;
      if (opts.coastal && !near(x, y, false, 2)) continue;
      if (opts.inland && (near(x, y, false, 3) || near(x, y, false, 5))) continue;
      const d = (x - tx) * (x - tx) + (y - ty) * (y - ty);
      if (d < bd) { bd = d; best = [x, y]; }
    }
  }
  const p = best ?? [tx, ty];
  return { x: p[0] / W, y: p[1] / H };
};

const capital = pick(0.38, 0.44, { inland: true });
const harbor = pick(0.60, 0.52, { coastal: true });
const gate = pick(0.40, 0.18, {});
const seaS = pick(0.22, 0.84, { water: true });
const strait = pick(0.78, 0.62, { water: true });
const shipP = pick(0.66, 0.86, { water: true });
const monsterP = pick(0.88, 0.34, { water: true });

const markers = [
  { x: capital.x, y: capital.y, name: "Crown City Estella", icon: "castle", color: "#c0392b" },
  { x: harbor.x, y: harbor.y, name: "Port Belmar", icon: "anchor", color: "#2471a3" },
  { x: gate.x, y: gate.y, name: "Northern Gate", icon: "tower", color: "#7a4a1a" },
];
const ornaments: Ornament[] = [
  { id: "t", type: "title", x: 0.5, y: 0.085, sizeF: 0.062, text: "Continent of Estella" },
  { id: "c", type: "compass", x: 0.915, y: 0.19, sizeF: 0.072 },
  { id: "s", type: "ship", x: shipP.x, y: shipP.y, sizeF: 0.06 },
  { id: "m", type: "monster", x: monsterP.x, y: monsterP.y, sizeF: 0.058 },
  { id: "b", type: "banner", x: strait.x, y: strait.y, sizeF: 0.03, text: "Forgotten Strait" },
  { id: "l", type: "label", x: seaS.x, y: seaS.y, sizeF: 0.04, text: "South Sea" },
];

/** Map compositing (same pipeline as the editor's draw()) — the palette changes per style */
function composite(ctx: Ctx, layers: ReturnType<typeof renderLayers>, style: StyleId): void {
  const pal = getPalette(style);
  const cl = pal.coastline;
  const sea = terrain.seaLevel;
  let sc = SEED * 3 + 17;

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(layers.base as unknown as CanvasImageSource, 0, 0);
  ctx.drawImage(layers.stamps as unknown as CanvasImageSource, 0, 0, W, H);

  // Contours
  const minor = new (SkPath2D as unknown as typeof Path2D)();
  const major = new (SkPath2D as unknown as typeof Path2D)();
  const bathy = new (SkPath2D as unknown as typeof Path2D)();
  let coast: Path2D | null = null;
  let landIdx = 0;
  for (const level of contours.levels) {
    if (level.z < sea - 1e-9) {
      for (const ring of level.rings) sketchToPath(bathy, roughRing(ring, 0.9, sc++), true);
      continue;
    }
    if (Math.abs(level.z - sea) < 1e-9) {
      coast = new (SkPath2D as unknown as typeof Path2D)();
      for (const ring of level.rings) {
        sketchToPath(coast, roughRing(ring, 1.0, sc), true);
        sketchToPath(coast, roughRing(ring, 0.7, sc + 5000), true);
        sc++;
      }
      continue;
    }
    landIdx++;
    const target = landIdx % 3 === 0 ? major : minor;
    for (const ring of level.rings) sketchToPath(target, roughRing(ring, landIdx % 3 === 0 ? 0.85 : 1.0, sc++), true);
  }
  ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.08)`; ctx.lineWidth = 0.7; ctx.stroke(bathy);
  ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.05)`; ctx.lineWidth = 2; ctx.stroke(minor);
  ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.16)`; ctx.lineWidth = 0.6; ctx.stroke(minor);
  ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.07)`; ctx.lineWidth = 2.6; ctx.stroke(major);
  ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.26)`; ctx.lineWidth = 0.9; ctx.stroke(major);

  // Coastal hatching (water + land)
  const M = 19;
  const strokeRows = (dist: Uint8Array, isos: [number, number][], dash: [number, number], off: number) => {
    const field = new Float32Array(dist.length);
    for (let i = 0; i < field.length; i++) field[i] = Math.min(M, dist[i]);
    ctx.save(); ctx.lineCap = "round"; ctx.lineWidth = 0.55;
    let k = 0;
    for (const [iso, alpha] of isos) {
      const rings = extractIsoRings(field, W, H, iso, 1.3, 12);
      const p = new (SkPath2D as unknown as typeof Path2D)();
      for (const ring of rings) sketchToPath(p, roughRing(chaikin(ring, 1, true), 0.18, sc++), true);
      ctx.setLineDash(dash); ctx.lineDashOffset = k * 2.9 + off;
      ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},${alpha})`;
      ctx.stroke(p); k++;
    }
    ctx.restore();
  };
  strokeRows(layers.waterDist, [[2.1, 0.42], [4.3, 0.3], [7.0, 0.2], [10.6, 0.12]], [5.2, 3.0], 0);
  strokeRows(landDistance(terrain.biome, W, H, 10), [[1.7, 0.3], [3.4, 0.18], [5.6, 0.1]], [4.2, 2.6], 1.4);

  // Coastline
  if (coast) {
    ctx.setLineDash([]); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.12)`; ctx.lineWidth = 2.1; ctx.stroke(coast);
    ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.9)`; ctx.lineWidth = 0.95; ctx.stroke(coast);
  }

  // Rivers
  {
    const oc = pal.ocean, ck = pal.coastline, dp = pal.deep;
    const isInk = style === "ink";
    const lines = terrain.rivers.map((rv) => {
      const sm = chaikin(roughLine(simplifyLine(rv.pts, 0.9), 0.95, sc++), 3, false);
      const widths = sm.map((_, i) => rv.widths[Math.min(rv.widths.length - 1, Math.round((i / (sm.length - 1)) * (rv.widths.length - 1)))]);
      return { sm, widths };
    }).filter((l) => l.sm.length >= 3);
    const wAt = (i: number, n: number, wArr: number[]) => {
      const baseW = Math.min(3.0, wArr[Math.min(wArr.length - 1, i)] * 0.5 + 0.1);
      return baseW * Math.min(1, i / Math.min(5, n - 1));
    };
    const wr = Math.round(oc[0] * 0.72 + ck[0] * 0.28), wg = Math.round(oc[1] * 0.74 + ck[1] * 0.26), wb = Math.round(oc[2] * 0.78 + ck[2] * 0.22);
    for (const l of lines) {
      const n = l.sm.length;
      ctx.fillStyle = isInk ? `rgba(${ck[0]},${ck[1]},${ck[2]},0.06)` : `rgba(${wr},${wg},${wb},0.2)`;
      ctx.fill(ribbonPath(l.sm, (t) => wAt(Math.round(t * (n - 1)), n, l.widths) * 1.9 + 0.25));
    }
    const dr = Math.round(dp[0] * 0.62), dg = Math.round(dp[1] * 0.66), db = Math.round(dp[2] * 0.78);
    for (const l of lines) {
      const n = l.sm.length;
      ctx.fillStyle = isInk ? `rgba(${ck[0]},${ck[1]},${ck[2]},0.34)` : `rgba(${dr},${dg},${db},0.5)`;
      ctx.fill(ribbonPath(l.sm, (t) => wAt(Math.round(t * (n - 1)), n, l.widths) * 0.8 + 0.15));
    }
  }
}

/** Fully render one style and return the canvas */
function renderStyle(style: StyleId): Canvas {
  const layers = renderLayers(terrain, style, { coastWidth: 3, waves: true });
  const c = new Canvas(W * SCALE, H * SCALE);
  const ctx = c.getContext("2d") as unknown as Ctx;
  const pal = getPalette(style);

  ctx.save();
  ctx.scale(SCALE, SCALE);
  composite(ctx, layers, style);
  drawMapEffects(ctx, W, H, SCALE, pal.coastline, defaultDecor(), style);
  drawOrnaments(ctx, ornaments, W, H, SCALE, pal.coastline, style);
  ctx.restore();

  // Markers + name tags (same rules as the editor's paintMarker)
  const halo = style === "color" ? "rgba(250,252,255,0.85)" : "rgba(244,236,214,0.85)";
  const size = 34;
  for (const m of markers) {
    const mx = m.x * W * SCALE, my = m.y * H * SCALE;
    drawMarkerIcon(ctx, m.icon, mx, my, size, m.color, style);
    const fs = size * 0.44;
    ctx.save();
    ctx.font = `600 ${fs}px "FMS Serif","FMS Hand",serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.strokeStyle = halo;
    ctx.lineWidth = Math.max(2.5, fs * 0.3);
    ctx.strokeText(m.name, mx, my + size * 0.18 + fs * 0.62);
    ctx.fillStyle = `rgba(${pal.coastline[0]},${pal.coastline[1]},${pal.coastline[2]},0.92)`;
    ctx.fillText(m.name, mx, my + size * 0.18 + fs * 0.62);
    ctx.restore();
  }
  // Paper grain
  const pat = ctx.createPattern(paperGrainTile() as unknown as CanvasImageSource, "repeat");
  if (pat) { ctx.save(); ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = 0.5; ctx.fillStyle = pat; ctx.fillRect(0, 0, W * SCALE, H * SCALE); ctx.restore(); }
  return c;
}

/** Downscale a canvas to the given width and save as JPG */
function saveScaled(c: Canvas, file: string, outW: number, quality = 0.9): void {
  const outH = Math.round(outW * (H / W));
  const s = new Canvas(outW, outH);
  const g = s.getContext("2d");
  g.imageSmoothingEnabled = true;
  (g as unknown as { imageSmoothingQuality: string }).imageSmoothingQuality = "high";
  g.drawImage(c, 0, 0, outW, outH);
  s.toFileSync(file, { format: "jpeg", quality });
}

// ── Render the three styles ──────────────────────────────
const styles: StyleId[] = ["parchment", "color", "ink"];
let parchmentCanvas: Canvas | null = null;
for (const style of styles) {
  const c = renderStyle(style);
  saveScaled(c, path.join(OUT, `style-${style}.jpg`), 1500, 0.84); // hover background (laid on subtly)
  if (style === "parchment") {
    parchmentCanvas = c;
    saveScaled(c, path.join(MAP_OUT, "hero.jpg"), 1600, 0.9);      // scroll showcase (16:9)
  }
}

// ── Feature-section crops (from parchment, scanning the terrain, 3:2) ──
{
  const c = parchmentCanvas!;
  const cropCells = (name: string, cx: number, cy: number, cw: number, outW = 1000) => {
    const ch = Math.round(cw / 1.5); // 3:2
    const x0 = Math.max(0, Math.min(W - cw, Math.round(cx - cw / 2)));
    const y0 = Math.max(0, Math.min(H - ch, Math.round(cy - ch / 2)));
    const outH = Math.round(outW / 1.5);
    const cc = new Canvas(outW, outH);
    const g = cc.getContext("2d");
    g.imageSmoothingEnabled = true;
    (g as unknown as { imageSmoothingQuality: string }).imageSmoothingQuality = "high";
    g.drawImage(c, x0 * SCALE, y0 * SCALE, cw * SCALE, ch * SCALE, 0, 0, outW, outH);
    cc.toFileSync(path.join(OUT, name), { format: "jpeg", quality: 0.9 });
  };
  // Find the window densest with mountains
  const winW = 300, winH = 200;
  let best = { x: 0, y: 0, n: -1 };
  for (let y = 0; y <= H - winH; y += 6) {
    for (let x = 0; x <= W - winW; x += 6) {
      let n = 0;
      for (let j = 0; j < winH; j += 4) for (let i = 0; i < winW; i += 4) {
        if (terrain.biome[(y + j) * W + x + i] === B.MOUNTAIN) n++;
      }
      if (n > best.n) best = { x, y, n };
    }
  }
  cropCells("feat-terrain.jpg", best.x + winW / 2, best.y + winH / 2, 300);       // ranges & rivers
  cropCells("feat-craft.jpg", harbor.x * W + 40, harbor.y * H, 280);             // coastline & hatching
  cropCells("feat-world.jpg", (capital.x + harbor.x) / 2 * W, (capital.y + harbor.y) / 2 * H, 340); // markers & labels
}

// ── Sticker sheet (transparent background) ───────────────
{
  const { STICKERS } = require("../src/stickers") as typeof import("../src/stickers");
  const list = STICKERS.slice(0, 12);
  const cols = 6, rows = Math.ceil(list.length / cols), cell = 150;
  const c = new Canvas(cols * cell, rows * cell);
  const g = c.getContext("2d") as unknown as Ctx;
  const inkFn = (a: number) => `rgba(58,44,28,${a})`;
  list.forEach((st, i) => {
    const cx = (i % cols) * cell + cell / 2, cy = Math.floor(i / cols) * cell + cell / 2;
    g.save(); g.lineJoin = "round"; g.lineCap = "round";
    const rr = 52 / Math.max(st.box[0], st.box[1]);
    g.lineWidth = Math.max(rr * 0.032, 1);
    st.draw(g, cx, cy, rr, inkFn, "rgba(238,228,205,0.96)");
    g.restore();
  });
  c.toFileSync(path.join(OUT, "stickers.png"));
}

console.log(`rendered ${MAP_W}x${MAP_H} (16:9) → hero + 3 styles + crops`);
