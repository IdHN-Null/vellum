/**
 * Headless visual verification — saves the composite render as PNGs without a browser.
 *   npx esbuild test/render-png.ts --bundle --platform=node --external:skia-canvas --outfile=test/render-png.js
 *   node test/render-png.js
 * Output: test/out/*.png (full map + auto crops: mountains, rivers, coastal forest, ship, monster)
 */
import { Canvas, Path2D as SkPath2D, FontLibrary } from "skia-canvas";
import * as fs from "fs";
import * as path from "path";

// DOM stub (render2d uses document.createElement("canvas"))
(globalThis as unknown as Record<string, unknown>).document = {
  createElement: (tag: string) => {
    if (tag !== "canvas") throw new Error("canvas only");
    return new Canvas(1, 1);
  },
};
(globalThis as unknown as Record<string, unknown>).Path2D = SkPath2D;

// Bundled fonts (falls back to system fonts if woff2 is unsupported)
try {
  FontLibrary.use("FMS Serif", [path.join(__dirname, "../fonts/Cinzel*.woff2")]);
  FontLibrary.use("FMS Hand", [path.join(__dirname, "../fonts/Gaegu*.woff2")]);
} catch { /* fallback */ }

/* eslint-disable import/first */
import { Ornament, defaultDecor, defaultMapData } from "../src/types";
import { composeTerrain, generateBase } from "../src/terrain";
import { getPalette, landDistance, paperGrainTile, renderLayers } from "../src/render2d";
import { chaikin, extractContours, extractIsoRings, simplifyLine } from "../src/contours";
import { roughLine, roughRing, sketchToPath } from "../src/rough";
import { drawCoordinateGrid, drawMapEffects, drawOrnaments } from "../src/decor";
import { drawMarkerIcon } from "../src/icons";
import { ribbonPath } from "../src/ink";

const OUT = path.join(__dirname, "out");
fs.mkdirSync(OUT, { recursive: true });

const map = defaultMapData("세이도라 대륙", 151186);
map.gen.polarNorth = 0.12;
map.gen.polarSouth = 0.12;

const base = generateBase(map);
const terrain = composeTerrain(map, base, null, null);
const contours = extractContours(terrain.height, terrain.w, terrain.h, terrain.seaLevel, map.gen.precision);
const layers = renderLayers(terrain, "parchment", { coastWidth: 3, waves: true });
const pal = getPalette("parchment");

const W = terrain.w, H = terrain.h, scale = 2;
const c = new Canvas(W * scale, H * scale);
const ctx = c.getContext("2d") as unknown as CanvasRenderingContext2D;

ctx.save();
ctx.scale(scale, scale);
ctx.imageSmoothingEnabled = true;
ctx.drawImage(layers.base as unknown as CanvasImageSource, 0, 0);
ctx.drawImage(layers.stamps as unknown as CanvasImageSource, 0, 0, W, H);

const sea = terrain.seaLevel;
const cl = pal.coastline;
let sc = 999;

// Contours (same updated alphas as view.drawVectorLines)
{
  const bathy = new (SkPath2D as unknown as typeof Path2D)();
  const minor = new (SkPath2D as unknown as typeof Path2D)();
  const major = new (SkPath2D as unknown as typeof Path2D)();
  let landIdx = 0;
  let coast: Path2D | null = null;
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
  ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.08)`;
  ctx.lineWidth = 0.7;
  ctx.stroke(bathy);
  ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.05)`;
  ctx.lineWidth = 2;
  ctx.stroke(minor);
  ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.16)`;
  ctx.lineWidth = 0.6;
  ctx.stroke(minor);
  ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.07)`;
  ctx.lineWidth = 2.6;
  ctx.stroke(major);
  ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.26)`;
  ctx.lineWidth = 0.9;
  ctx.stroke(major);
  // Coastal hatching: dashed iso-line rows — water side + land side (mirrors view.buildCoastHatch)
  {
    const M = 19;
    const strokeRows = (dist: Uint8Array, isos: [number, number][], dash: [number, number], off: number) => {
      const field = new Float32Array(dist.length);
      for (let i = 0; i < field.length; i++) field[i] = Math.min(M, dist[i]);
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = 0.55;
      let k = 0;
      for (const [iso, alpha] of isos) {
        const rings = extractIsoRings(field, W, H, iso, 1.3, 12);
        const path = new (SkPath2D as unknown as typeof Path2D)();
        for (const ring of rings) sketchToPath(path, roughRing(chaikin(ring, 1, true), 0.18, sc++), true);
        ctx.setLineDash(dash);
        ctx.lineDashOffset = k * 2.9 + off;
        ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},${alpha})`;
        ctx.stroke(path);
        k++;
      }
      ctx.restore();
    };
    strokeRows(layers.waterDist, [[2.1, 0.42], [4.3, 0.3], [7.0, 0.2], [10.6, 0.12]], [5.2, 3.0], 0);
    strokeRows(landDistance(terrain.biome, W, H, 10), [[1.7, 0.3], [3.4, 0.18], [5.6, 0.1]], [4.2, 2.6], 1.4);
  }
  // Coastline: fountain pen (thin, dark double pen line)
  if (coast) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.12)`;
    ctx.lineWidth = 2.1;
    ctx.stroke(coast);
    ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.9)`;
    ctx.lineWidth = 0.95;
    ctx.stroke(coast);
  }
}

// Rivers (mirrors view.drawVectorLines: wash + deep-water core)
{
  const oc = pal.ocean, ck = pal.coastline, dp = pal.deep;
  const smoothedR = terrain.rivers.map((rv) => {
    if (rv.pts.length < 3) return null;
    const sm = chaikin(roughLine(simplifyLine(rv.pts, 0.9), 0.95, sc++), 3, false);
    const widths = sm.map((_, i) => rv.widths[Math.min(rv.widths.length - 1, Math.round((i / (sm.length - 1)) * (rv.widths.length - 1)))]);
    return { sm, widths };
  });
  // Snap tributary endpoints to the parent's rendered centreline (mirrors view.buildVectorPaths)
  terrain.rivers.forEach((rv, idx) => {
    const line = smoothedR[idx];
    if (!line || rv.joins === undefined) return;
    const parent = smoothedR[rv.joins];
    if (!parent) return;
    const end = line.sm[line.sm.length - 1];
    let best = -1, bestD = Infinity;
    for (let k = 0; k < parent.sm.length; k++) {
      const dx = parent.sm[k][0] - end[0], dy = parent.sm[k][1] - end[1];
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = k; }
    }
    if (best >= 0 && bestD < 25) line.sm[line.sm.length - 1] = [parent.sm[best][0], parent.sm[best][1]];
  });
  const lines = smoothedR.filter((l): l is NonNullable<typeof l> => !!l && l.sm.length >= 3);
  const wAt = (i: number, n: number, wArr: number[]) => {
    const baseW = Math.min(3.0, wArr[Math.min(wArr.length - 1, i)] * 0.5 + 0.1);
    return baseW * Math.min(1, i / Math.min(5, n - 1));
  };
  const wr = Math.round(oc[0] * 0.72 + ck[0] * 0.28);
  const wg = Math.round(oc[1] * 0.74 + ck[1] * 0.26);
  const wb = Math.round(oc[2] * 0.78 + ck[2] * 0.22);
  for (const l of lines) {
    const n = l.sm.length;
    ctx.fillStyle = `rgba(${wr},${wg},${wb},0.2)`;
    ctx.fill(ribbonPath(l.sm, (t) => wAt(Math.round(t * (n - 1)), n, l.widths) * 1.9 + 0.25));
  }
  const dr = Math.round(dp[0] * 0.62), dg = Math.round(dp[1] * 0.66), db = Math.round(dp[2] * 0.78);
  for (const l of lines) {
    const n = l.sm.length;
    ctx.fillStyle = `rgba(${dr},${dg},${db},0.5)`;
    ctx.fill(ribbonPath(l.sm, (t) => wAt(Math.round(t * (n - 1)), n, l.widths) * 0.8 + 0.15));
  }
}

// Map effects, grid, placed elements (incl. ship & monster)
drawMapEffects(ctx, W, H, scale, cl, defaultDecor(), "parchment");
drawCoordinateGrid(ctx, W, H, scale, cl);
const ornaments: Ornament[] = [
  { id: "o1", type: "compass", x: 0.89, y: 0.14, sizeF: 0.062 },
  { id: "o2", type: "title", x: 0.5, y: 0.075, sizeF: 0.052, text: "세이도라 대륙" },
  { id: "o3", type: "label", x: 0.25, y: 0.75, sizeF: 0.04, text: "남 해" },
  { id: "o5", type: "ship", x: 0.62, y: 0.86, sizeF: 0.05 },
  { id: "o6", type: "monster", x: 0.84, y: 0.4, sizeF: 0.05 },
  { id: "o7", type: "banner", x: 0.75, y: 0.62, sizeF: 0.026, text: "잊혀진 해협" },
];
drawOrnaments(ctx, ornaments, W, H, scale, cl);
ctx.restore();

// Markers + the new name-tag style
const markers = [
  { x: 0.36, y: 0.42, name: "왕도 세이도라", icon: "castle", color: "#c0392b" },
  { x: 0.62, y: 0.58, name: "항구도시 벨마르", icon: "anchor", color: "#2471a3" },
];
for (const m of markers) {
  const mx = m.x * W * scale, my = m.y * H * scale;
  drawMarkerIcon(ctx, m.icon, mx, my, 25, m.color);
  const fs = Math.max(9, 25 * 0.44);
  ctx.save();
  ctx.font = `600 ${fs}px "FMS Serif","FMS Hand",serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(244,236,214,0.85)";
  ctx.lineWidth = Math.max(2.5, fs * 0.3);
  ctx.strokeText(m.name, mx, my + 25 * 0.18 + fs * 0.62);
  ctx.fillStyle = "rgba(86,62,36,0.92)";
  ctx.fillText(m.name, mx, my + 25 * 0.18 + fs * 0.62);
  ctx.restore();
}

// Paper-grain overlay
{
  const pat = ctx.createPattern(paperGrainTile() as unknown as CanvasImageSource, "repeat");
  if (pat) {
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W * scale, H * scale);
    ctx.restore();
  }
}

// Saving: full map + crops
function saveCrop(name: string, cx0: number, cy0: number, cw: number, chh: number, outW: number): void {
  const crop = new Canvas(outW, Math.round((chh / cw) * outW));
  const g = crop.getContext("2d");
  g.imageSmoothingEnabled = true;
  g.drawImage(c, cx0 * scale, cy0 * scale, cw * scale, chh * scale, 0, 0, crop.width, crop.height);
  crop.toFileSync(path.join(OUT, name));
}

c.toFileSync(path.join(OUT, "full.png"));

// Find auto-crop targets (mountains, rivers, coastal forest)
function densest(pred: (i: number) => boolean): { x: number; y: number } {
  let best = { x: 0, y: 0, n: -1 };
  for (let y = 0; y < H - 50; y += 8) {
    for (let x = 0; x < W - 60; x += 8) {
      let m = 0;
      for (let j = 0; j < 50; j += 2) for (let i = 0; i < 60; i += 2) if (pred((y + j) * W + x + i)) m++;
      if (m > best.n) best = { x, y, n: m };
    }
  }
  return best;
}
const mtn = densest((i) => terrain.biome[i] === 7);
const rvr = densest((i) => terrain.river[i] === 1);
// Coastal forest: forest cells with water within 6 cells
const coastForest = densest((i) => {
  if (terrain.biome[i] !== 4) return false;
  const x = i % W, y = (i / W) | 0;
  for (const [dx, dy] of [[-5, 0], [5, 0], [0, -5], [0, 5]] as const) {
    const ni = Math.max(0, Math.min(H - 1, y + dy)) * W + Math.max(0, Math.min(W - 1, x + dx));
    if (terrain.biome[ni] <= 1) return true;
  }
  return false;
});
saveCrop("crop-mountain.png", mtn.x, mtn.y, 60, 50, 480);
saveCrop("crop-river.png", rvr.x, rvr.y, 60, 50, 480);
saveCrop("crop-coast-forest.png", coastForest.x, coastForest.y, 60, 50, 480);
saveCrop("crop-banner.png", 0.75 * W - 30, 0.62 * H - 25, 60, 50, 480);
saveCrop("crop-ship.png", 0.62 * W - 30, 0.86 * H - 25, 60, 50, 480);
saveCrop("crop-monster.png", 0.84 * W - 30, 0.4 * H - 25, 60, 50, 480);
saveCrop("crop-marker.png", 0.36 * W - 30, 0.42 * H - 25, 60, 50, 480);

// River connection crops: mouth (sea contact) and tributary junction
{
  // Mouth: rivers whose final point is water (preferring the middle, clear of decorations)
  const mouths = terrain.rivers.filter((rv) => {
    const [x, y] = rv.pts[rv.pts.length - 1];
    return terrain.height[y * W + x] < sea && y > H * 0.25 && y < H * 0.9;
  });
  const mouth = mouths.sort((a, b) => b.widths[b.widths.length - 1] - a.widths[a.widths.length - 1])[0];
  if (mouth) {
    const [mx, my] = mouth.pts[mouth.pts.length - 1];
    saveCrop("crop-river-mouth.png", Math.max(0, mx - 20), Math.max(0, my - 17), 40, 34, 480);
  }
  // Junction: rivers whose final point is land (tributaries extended onto the parent)
  const junc = terrain.rivers.find((rv) => {
    const [x, y] = rv.pts[rv.pts.length - 1];
    return terrain.height[y * W + x] >= sea;
  });
  if (junc) {
    const [jx, jy] = junc.pts[junc.pts.length - 1];
    saveCrop("crop-river-junction.png", Math.max(0, jx - 20), Math.max(0, jy - 17), 40, 34, 480);
  }
}

// Built-in sticker showcase (parchment-background grid)
{
  const { STICKERS } = require("../src/stickers") as typeof import("../src/stickers");
  const cols = 5, cell = 130;
  const rows = Math.ceil(STICKERS.length / cols);
  const sc2 = new Canvas(cols * cell, rows * cell + 20);
  const g = sc2.getContext("2d") as unknown as CanvasRenderingContext2D;
  g.fillStyle = "#e8d9b0";
  g.fillRect(0, 0, sc2.width, sc2.height);
  const inkFn = (a: number) => `rgba(86,62,36,${a})`;
  STICKERS.forEach((st, i) => {
    const cx = (i % cols) * cell + cell / 2;
    const cy = Math.floor(i / cols) * cell + cell / 2;
    g.save();
    g.lineJoin = "round";
    g.lineCap = "round";
    g.lineWidth = 1.2;
    st.draw(g, cx, cy - 8, 40, inkFn, "rgba(242,232,206,0.9)");
    g.restore();
    g.font = "12px sans-serif";
    g.textAlign = "center";
    g.fillStyle = "rgba(60,45,25,0.85)";
    g.fillText(`${st.label} (${st.id})`, cx, cy + 52);
  });
  sc2.toFileSync(path.join(OUT, "stickers.png"));
}

// Small-size sticker sharpness check (line width proportional to size): r 10/16/28
{
  const { STICKERS } = require("../src/stickers") as typeof import("../src/stickers");
  const picks = ["tower", "castle", "lighthouse", "windmill", "scroll"];
  const cell = 90;
  const cnv = new Canvas(picks.length * cell, 3 * cell);
  const g = cnv.getContext("2d") as unknown as CanvasRenderingContext2D;
  g.fillStyle = "#e8d9b0";
  g.fillRect(0, 0, cnv.width, cnv.height);
  const inkFn = (a: number) => `rgba(86,62,36,${a})`;
  [28, 16, 10].forEach((rr, row) => {
    picks.forEach((id, col) => {
      const st = STICKERS.find((x) => x.id === id);
      if (!st) return;
      g.save();
      g.lineJoin = "round";
      g.lineCap = "round";
      g.lineWidth = Math.max(rr * 0.032, 0.55); // same rule as drawOrnaments
      st.draw(g, col * cell + cell / 2, row * cell + cell / 2, rr, inkFn, "rgba(242,232,206,0.92)");
      g.restore();
    });
  });
  cnv.toFileSync(path.join(OUT, "stickers-small.png"));
}

console.log("saved to", OUT, "| rivers:", terrain.rivers.length);
