"use strict";
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

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => VellumPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/view.ts
var import_obsidian2 = require("obsidian");

// src/noise.ts
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t2 = Math.imul(a ^ a >>> 15, 1 | a);
    t2 = t2 + Math.imul(t2 ^ t2 >>> 7, 61 | t2) ^ t2;
    return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296;
  };
}
var GRAD = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];
var Noise2D = class {
  constructor(seed) {
    const rng = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t2 = p[i];
      p[i] = p[j];
      p[j] = t2;
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }
  /** -1..1 */
  noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const p = this.perm;
    const aa = p[p[xi & 255] + (yi & 255)] & 7;
    const ab = p[p[xi & 255] + (yi + 1 & 255)] & 7;
    const ba = p[p[xi + 1 & 255] + (yi & 255)] & 7;
    const bb = p[p[xi + 1 & 255] + (yi + 1 & 255)] & 7;
    const dot = (g, dx, dy) => g[0] * dx + g[1] * dy;
    const x1 = dot(GRAD[aa], xf, yf) + u * (dot(GRAD[ba], xf - 1, yf) - dot(GRAD[aa], xf, yf));
    const x2 = dot(GRAD[ab], xf, yf - 1) + u * (dot(GRAD[bb], xf - 1, yf - 1) - dot(GRAD[ab], xf, yf - 1));
    return (x1 + v * (x2 - x1)) * 1.4;
  }
};
function fbm(n, x, y, octaves, lacunarity = 2, gain = 0.5) {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += n.noise(x * freq, y * freq) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

// src/types.ts
var PLUGIN_VERSION = "0.21.0";
function defaultTexture() {
  return { grain: 0.5, relief: 1, mottle: 1, markerScale: 1 };
}
function defaultDecor() {
  return { compass: true, frame: true, title: true, waves: true, vignette: true };
}
function defaultOrnaments(name) {
  return [
    { id: newId(), type: "compass", x: 0.89, y: 0.14, sizeF: 0.062 },
    { id: newId(), type: "title", x: 0.5, y: 0.075, sizeF: 0.052, text: name }
  ];
}
function defaultGenParams(seed) {
  return {
    seed,
    seaLevel: 0.5,
    continents: 2,
    continentCount: 3,
    islandCount: 8,
    landAmount: 1,
    roughness: 1,
    climate: 0.55,
    detail: 1,
    precision: 1,
    erosion: 1,
    riverDensity: 1,
    polarNorth: 0.1,
    polarSouth: 0.1,
    rivers: true,
    snow: true,
    desert: true,
    forest: true
  };
}
function randomizeGenParams(seed) {
  const rng = mulberry32(seed ^ 2654435769);
  const range = (lo, hi) => lo + rng() * (hi - lo);
  const p = defaultGenParams(seed);
  p.seaLevel = range(0.44, 0.58);
  p.continentCount = 1 + Math.floor(rng() * 5);
  p.islandCount = Math.floor(rng() * 16);
  p.landAmount = range(0.75, 1.35);
  p.roughness = range(0.7, 1.3);
  p.climate = range(0.38, 0.68);
  p.detail = range(0.8, 1.2);
  p.erosion = range(0.6, 1.4);
  p.riverDensity = range(0.6, 1.2);
  p.polarNorth = rng() < 0.25 ? 0 : range(0.04, 0.18);
  p.polarSouth = rng() < 0.25 ? 0 : range(0.04, 0.18);
  return p;
}
function defaultMapData(name, seed) {
  return {
    version: 1,
    name,
    width: 512,
    height: 384,
    mode: "generated",
    gen: defaultGenParams(seed ?? Math.floor(Math.random() * 1e6)),
    style: "parchment",
    annotations: [],
    showContours: true,
    showGrid: false,
    showRhumbLines: true,
    fastRender: false,
    coastWidth: 3,
    coastHatching: true,
    landHatching: true,
    decor: defaultDecor(),
    texture: defaultTexture(),
    ornaments: defaultOrnaments(name),
    markers: [],
    regions: []
  };
}
function parseMapData(raw) {
  const d = JSON.parse(raw);
  const base = defaultMapData(d.name ?? "Map");
  let ornaments;
  if (Array.isArray(d.ornaments)) {
    ornaments = d.ornaments;
  } else {
    ornaments = [];
    const oldDecor = d.decor ?? defaultDecor();
    if (oldDecor.compass !== false) {
      ornaments.push({ id: newId(), type: "compass", x: 0.89, y: 0.14, sizeF: 0.062 });
    }
    if (oldDecor.title !== false) {
      ornaments.push({ id: newId(), type: "title", x: 0.5, y: 0.075, sizeF: 0.052, text: d.name ?? "Map" });
    }
  }
  return {
    ...base,
    ...d,
    version: 1,
    gen: { ...base.gen, ...d.gen ?? {} },
    decor: { ...base.decor, ...d.decor ?? {} },
    texture: { ...base.texture, ...d.texture ?? {} },
    showRhumbLines: d.showRhumbLines !== false,
    fastRender: d.fastRender === true,
    coastHatching: d.coastHatching !== false,
    landHatching: d.landHatching !== false,
    ornaments,
    markers: Array.isArray(d.markers) ? d.markers : [],
    regions: Array.isArray(d.regions) ? d.regions : [],
    annotations: Array.isArray(d.annotations) ? d.annotations : []
  };
}
function newId() {
  return Math.random().toString(36).slice(2, 10);
}
function u8ToB64(u8) {
  let s = "";
  const chunk = 8192;
  for (let i = 0; i < u8.length; i += chunk) {
    s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + chunk)));
  }
  return btoa(s);
}
function b64ToU8(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function rleEncode(u8) {
  const out = [];
  let i = 0;
  while (i < u8.length) {
    const v = u8[i];
    let run = 1;
    while (i + run < u8.length && u8[i + run] === v && run < 255) run++;
    out.push(run, v);
    i += run;
  }
  return new Uint8Array(out);
}
function rleDecode(data, expectedLen) {
  const out = new Uint8Array(expectedLen);
  let o = 0;
  for (let i = 0; i + 1 < data.length && o < expectedLen; i += 2) {
    const run = data[i], v = data[i + 1];
    out.fill(v, o, Math.min(expectedLen, o + run));
    o += run;
  }
  return out;
}
function bytesToB64(bytes) {
  const u8 = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rle = rleEncode(u8);
  if (rle.length < u8.length) return "R:" + u8ToB64(rle);
  return u8ToB64(u8);
}
function b64ToBytes(b64, expectedLen) {
  try {
    let u8;
    if (b64.startsWith("R:")) {
      u8 = rleDecode(b64ToU8(b64.slice(2)), expectedLen);
    } else {
      u8 = b64ToU8(b64);
    }
    const out = new Int8Array(expectedLen);
    const n = Math.min(u8.length, expectedLen);
    for (let i = 0; i < n; i++) {
      let v = u8[i];
      if (v > 127) v -= 256;
      out[i] = v;
    }
    return out;
  } catch {
    return new Int8Array(expectedLen);
  }
}

// src/terrain.ts
function smoothstep(a, b, x) {
  const t2 = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t2 * t2 * (3 - 2 * t2);
}
var B = {
  DEEP: 0,
  OCEAN: 1,
  BEACH: 2,
  GRASS: 3,
  FOREST: 4,
  DESERT: 5,
  HILL: 6,
  MOUNTAIN: 7,
  SNOW: 8
};
function generateBase(map) {
  const w = map.width, h = map.height;
  const g = map.gen;
  const nH = new Noise2D(g.seed);
  const nD = new Noise2D(g.seed + 1013);
  const nW = new Noise2D(g.seed + 5501);
  const base = new Float32Array(w * h);
  const contFreq = 1.2 + g.continents * 0.75;
  const detOct = Math.max(2, Math.round(3 + g.detail * 3));
  const detGain = 0.42 + Math.min(g.roughness, 2) * 0.09;
  const aspect = h / w;
  const cc = Math.max(0, Math.round(g.continentCount ?? 0));
  const ic = Math.max(0, Math.round(g.islandCount ?? 0));
  const useBlobs = cc > 0 || ic > 0;
  const landAmt = g.landAmount ?? 1;
  const blobs = [];
  if (useBlobs) {
    const rng = mulberry32(g.seed ^ 1715004);
    const contR = 0.3 / Math.sqrt(Math.max(1, cc)) * landAmt;
    for (let i = 0; i < cc; i++) {
      const cx = 0.18 + rng() * 0.64;
      const cy = 0.18 + rng() * 0.64;
      const r = contR * (0.72 + rng() * 0.6);
      const ang = rng() * Math.PI;
      const sl = r * (0.5 + rng() * 0.25);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const ucy = cy * aspect;
      blobs.push({
        cx,
        cy,
        r,
        s: 1,
        spine: { x0: cx - ca * sl, y0: ucy - sa * sl, x1: cx + ca * sl, y1: ucy + sa * sl, w: r * 0.115 }
      });
    }
    for (let i = 0; i < ic; i++) {
      blobs.push({
        cx: 0.06 + rng() * 0.88,
        cy: 0.06 + rng() * 0.88,
        r: (0.028 + rng() * 0.045) * landAmt,
        s: 0.9
      });
    }
  }
  let mn = Infinity, mx = -Infinity;
  for (let y = 0; y < h; y++) {
    const ny = (y / h - 0.5) * aspect;
    const nyc = y / h;
    for (let x = 0; x < w; x++) {
      const nx = x / w - 0.5;
      const nxc = x / w;
      let v;
      if (useBlobs) {
        const wx = nxc + fbm(nW, nxc * 3, nyc * 3, 4) * 0.12;
        const wy = nyc + fbm(nW, nxc * 3 + 11, nyc * 3 + 7, 4) * 0.12;
        let land = 0;
        for (const b of blobs) {
          const dx = wx - b.cx, dy = (wy - b.cy) * aspect;
          const t2 = Math.hypot(dx, dy) / b.r;
          if (t2 < 1.2) {
            const fall = t2 < 0.68 ? 1 : Math.max(0, 1 - (t2 - 0.68) / 0.32);
            land = Math.max(land, fall * b.s);
          }
        }
        const coastN = fbm(nD, nxc * contFreq * 3 + 7, nyc * contFreq * 3 + 3, detOct, 2, detGain);
        const edge = land + coastN * 0.22;
        if (edge < 0.5) {
          v = edge * 0.9;
        } else {
          const inland = Math.min(1, (edge - 0.5) * 2.5);
          const maskN = (fbm(nH, nxc * 1.7 + 4, nyc * 1.7 + 4, 3) + 1) * 0.5;
          const rr = fbm(nD, nxc * 3.4 + 20, nyc * 3.4 + 20, 5);
          const ridge = Math.max(0, 1 - Math.abs(rr) * 1.5);
          const gate = smoothstep(0.46, 0.76, maskN);
          let spine = 0;
          for (const b of blobs) {
            const sp = b.spine;
            if (!sp) continue;
            const uy = wy * aspect;
            const vx = sp.x1 - sp.x0, vy = sp.y1 - sp.y0;
            const len2 = vx * vx + vy * vy || 1;
            let tt = ((wx - sp.x0) * vx + (uy - sp.y0) * vy) / len2;
            tt = tt < 0 ? 0 : tt > 1 ? 1 : tt;
            const dxs = wx - (sp.x0 + vx * tt), dys = uy - (sp.y0 + vy * tt);
            const ds = Math.hypot(dxs, dys);
            if (ds < sp.w * 1.4) {
              const prof = Math.max(0, 1 - ds / sp.w);
              const envelope = Math.sin(Math.PI * tt) ** 0.6;
              const peaks = 0.55 + 0.45 * ((fbm(nD, wx * 7 + 40, wy * 7 + 40, 3) + 1) * 0.5);
              spine = Math.max(spine, prof * envelope * peaks * 0.8);
            }
          }
          const mtn = Math.max(ridge * gate, spine) * Math.min(1, inland * 2.5);
          v = 0.52 + inland * 0.06 + mtn * 0.58 + coastN * 0.02;
        }
      } else {
        const b = fbm(nH, nx * contFreq, ny * contFreq, 4, 2, 0.5);
        const d = fbm(nD, nx * contFreq * 4 + 7.3, ny * contFreq * 4 + 3.1, detOct, 2, detGain);
        v = b * 0.7 + d * 0.3 * (0.6 + g.roughness * 0.4);
      }
      base[y * w + x] = v;
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
  }
  if (useBlobs) {
    for (let i = 0; i < base.length; i++) {
      let v = base[i];
      if (v > 0.86) v = 0.86 + (v - 0.86) * 0.38;
      base[i] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
  } else {
    const span = mx - mn || 1;
    for (let i = 0; i < base.length; i++) base[i] = (base[i] - mn) / span;
  }
  if (g.erosion > 0.01) erode(base, w, h, g.seaLevel, g.erosion, g.seed);
  return base;
}
function erode(height, w, h, sea, strength, seed) {
  const rng = mulberry32(seed ^ 59141);
  const drops = Math.floor(w * h * 0.18 * strength);
  const INERTIA = 0.06, CAP = 3.4, MIN_SLOPE = 8e-3;
  const ERODE = 0.32, DEPOSIT = 0.28, EVAP = 0.02, GRAVITY = 4;
  for (let d = 0; d < drops; d++) {
    let px = rng() * (w - 2), py = rng() * (h - 2);
    let dx = 0, dy = 0, vel = 1, water = 1, sed = 0;
    for (let life = 0; life < 30; life++) {
      const xi = px | 0, yi = py | 0;
      if (xi < 0 || yi < 0 || xi >= w - 1 || yi >= h - 1) break;
      const fx = px - xi, fy = py - yi;
      const i00 = yi * w + xi;
      const h00 = height[i00], h10 = height[i00 + 1];
      const h01 = height[i00 + w], h11 = height[i00 + w + 1];
      const gx = (h10 - h00) * (1 - fy) + (h11 - h01) * fy;
      const gy = (h01 - h00) * (1 - fx) + (h11 - h10) * fx;
      const oldH = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;
      if (oldH < sea - 0.03) break;
      dx = dx * INERTIA - gx * (1 - INERTIA);
      dy = dy * INERTIA - gy * (1 - INERTIA);
      const len = Math.hypot(dx, dy);
      if (len < 1e-8) break;
      dx /= len;
      dy /= len;
      px += dx;
      py += dy;
      if (px < 0 || py < 0 || px >= w - 1.001 || py >= h - 1.001) break;
      const nxi = px | 0, nyi = py | 0;
      const nfx = px - nxi, nfy = py - nyi;
      const j = nyi * w + nxi;
      const newH = height[j] * (1 - nfx) * (1 - nfy) + height[j + 1] * nfx * (1 - nfy) + height[j + w] * (1 - nfx) * nfy + height[j + w + 1] * nfx * nfy;
      const dh = newH - oldH;
      const cap = Math.max(-dh, MIN_SLOPE) * vel * water * CAP;
      if (sed > cap || dh > 0) {
        const dep = dh > 0 ? Math.min(dh, sed) : (sed - cap) * DEPOSIT;
        sed -= dep;
        height[i00] += dep * (1 - fx) * (1 - fy);
        height[i00 + 1] += dep * fx * (1 - fy);
        height[i00 + w] += dep * (1 - fx) * fy;
        height[i00 + w + 1] += dep * fx * fy;
      } else {
        const er = Math.min((cap - sed) * ERODE, -dh);
        sed += er;
        height[i00] -= er * (1 - fx) * (1 - fy);
        height[i00 + 1] -= er * fx * (1 - fy);
        height[i00 + w] -= er * (1 - fx) * fy;
        height[i00 + w + 1] -= er * fx * fy;
      }
      vel = Math.sqrt(Math.max(0.01, vel * vel - dh * GRAVITY));
      water *= 1 - EVAP;
    }
  }
  for (let i = 0; i < height.length; i++) {
    const v = height[i];
    height[i] = v < 0 ? 0 : v > 1 ? 1 : v;
  }
}
function composeHeight(base, edit) {
  const v = base + edit / 254;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
var Classifier = class {
  constructor(g, w, h) {
    this.g = g;
    this.nM = new Noise2D(g.seed + 2027);
    this.w = w;
    this.h = h;
  }
  biomeAt(x, y, el) {
    const { g, nM, w, h } = this;
    const sea = g.seaLevel;
    if (el < sea - 0.12) return B.DEEP;
    if (el < sea) return B.OCEAN;
    const lat = y / h;
    const polarJit = nM.noise(x / w * 9 + 50, y / h * 9 + 50) * 0.035;
    const inPolar = g.snow && g.polarNorth > 0 && lat < g.polarNorth + polarJit || g.snow && g.polarSouth > 0 && lat > 1 - g.polarSouth + polarJit;
    const rel = (el - sea) / Math.max(1e-4, 1 - sea);
    const temp = 1 - Math.abs(lat * 2 - 1) * 0.9 - rel * 0.55;
    const moist = fbm(nM, x / w * 5, y / h * 5, 4) * 0.5 + 0.5 + (g.climate - 0.5) * 0.6;
    if (inPolar || g.snow && rel > 0.9) return B.SNOW;
    if (rel > 0.66) return B.MOUNTAIN;
    if (rel > 0.5) return B.HILL;
    if (rel < 0.035) return B.BEACH;
    if (g.desert && moist < 0.34 && temp > 0.42) return B.DESERT;
    if (g.forest && moist > 0.55 && temp > 0.2 && temp < 0.85) return B.FOREST;
    return B.GRASS;
  }
};
function applyPaintAt(biome, paintVal, el, sea) {
  if (paintVal <= 0) return biome;
  const b = paintVal - 1;
  return b === B.OCEAN && el < sea - 0.12 ? B.DEEP : b;
}
function composeTerrain(map, base, edits, paint) {
  const w = map.width, h = map.height;
  const g = map.gen;
  const sea = g.seaLevel;
  const height = new Float32Array(w * h);
  for (let i = 0; i < height.length; i++) {
    height[i] = composeHeight(base[i], edits ? edits[i] : 0);
  }
  let river = new Uint8Array(w * h);
  let lake = new Uint8Array(w * h);
  let rivers = [];
  if (g.rivers) {
    const hyd = hydrology(height, w, h, sea, g.riverDensity);
    river = hyd.river;
    lake = hyd.lake;
    rivers = hyd.rivers;
  }
  const cls = new Classifier(g, w, h);
  const biome = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let b = lake[i] ? B.OCEAN : cls.biomeAt(x, y, height[i]);
      if (paint) b = applyPaintAt(b, paint[i], height[i], sea);
      biome[i] = b;
    }
  }
  return { w, h, height, biome, river, lake, rivers, seaLevel: sea };
}
function updateTerrainRect(t2, map, base, edits, paint, cls, x0, y0, x1, y1) {
  const w = t2.w;
  const sea = map.gen.seaLevel;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * w + x;
      const el = composeHeight(base[i], edits ? edits[i] : 0);
      t2.height[i] = el;
      let b = t2.lake[i] && el >= sea ? B.OCEAN : cls.biomeAt(x, y, el);
      if (paint) b = applyPaintAt(b, paint[i], el, sea);
      t2.biome[i] = b;
      if (el < sea) {
        t2.river[i] = 0;
        t2.lake[i] = 0;
      }
    }
  }
}
var DX8 = [1, -1, 0, 0, 1, 1, -1, -1];
var DY8 = [0, 0, 1, -1, 1, -1, 1, -1];
function hydrology(height, w, h, sea, riverDensity) {
  const n = w * h;
  const filled = new Float32Array(height);
  const visited = new Uint8Array(n);
  const heap = new MinHeap(n);
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const i = y * w + x;
      if (!visited[i]) {
        visited[i] = 1;
        heap.push(filled[i], i);
      }
    }
  }
  for (let y = 1; y < h - 1; y++) {
    for (const x of [0, w - 1]) {
      const i = y * w + x;
      if (!visited[i]) {
        visited[i] = 1;
        heap.push(filled[i], i);
      }
    }
  }
  while (heap.size > 0) {
    const [level, i] = heap.pop();
    const x = i % w, y = i / w | 0;
    for (let d = 0; d < 8; d++) {
      const nx = x + DX8[d], ny = y + DY8[d];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (visited[ni]) continue;
      visited[ni] = 1;
      filled[ni] = Math.max(height[ni], level + 1e-5);
      heap.push(filled[ni], ni);
    }
  }
  const lake = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (filled[i] > sea && filled[i] - height[i] > 6e-3) lake[i] = 1;
  }
  const flowDir = new Int32Array(n).fill(-1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let best = -1, bestDrop = 0;
      for (let d = 0; d < 8; d++) {
        const nx = x + DX8[d], ny = y + DY8[d];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        const drop = (filled[i] - filled[ni]) / (d < 4 ? 1 : 1.4142);
        if (drop > bestDrop) {
          bestDrop = drop;
          best = ni;
        }
      }
      flowDir[i] = best;
    }
  }
  const order = new Uint32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  const sorted = Array.from(order).sort((a, b) => filled[b] - filled[a]);
  const acc = new Float32Array(n).fill(1);
  for (const i of sorted) {
    const d = flowDir[i];
    if (d >= 0) acc[d] += acc[i];
  }
  const T = n / (50 + 620 * Math.max(0.02, riverDensity));
  const river = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (height[i] >= sea && !lake[i] && acc[i] >= T) river[i] = 1;
  }
  const rivers = [];
  const traced = new Int32Array(n);
  const widthOf = (a) => 0.5 + Math.log2(a / T + 1) * 0.55;
  const heightRange = Math.max(1e-3, 1 - sea);
  for (let i = 0; i < n; i++) {
    if (!river[i] || traced[i]) continue;
    let isSource = true;
    const x = i % w, y = i / w | 0;
    for (let d = 0; d < 8 && isSource; d++) {
      const nx = x + DX8[d], ny = y + DY8[d];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (river[ni] && flowDir[ni] === i) isSource = false;
    }
    if (!isSource) continue;
    const relSrcHeight = (height[i] - sea) / heightRange;
    if (relSrcHeight < 0.08) continue;
    const pts = [];
    const widths = [];
    const marked = [];
    const riverIdx = rivers.length + 1;
    let joins;
    let cur = i;
    for (let step = 0; step < w + h; step++) {
      pts.push([cur % w, cur / w | 0]);
      widths.push(widthOf(acc[cur]));
      const next = flowDir[cur];
      if (next < 0) break;
      if (height[next] < sea || lake[next]) {
        const wBase = widthOf(acc[cur]);
        const flare = [1.25, 1.7, 2.2];
        let mc = next;
        for (let k = 0; k < 3 && mc >= 0 && (height[mc] < sea || lake[mc]); k++) {
          pts.push([mc % w, mc / w | 0]);
          widths.push(wBase * flare[k]);
          mc = flowDir[mc];
        }
        break;
      }
      if (traced[next]) {
        joins = traced[next] - 1;
        pts.push([next % w, next / w | 0]);
        widths.push(widthOf(acc[next]));
        break;
      }
      traced[cur] = riverIdx;
      marked.push(cur);
      cur = next;
    }
    if (pts.length >= 10) {
      rivers.push({ pts, widths, joins });
    } else {
      for (const m of marked) traced[m] = 0;
    }
  }
  for (let i = 0; i < n; i++) {
    if (river[i] && height[i] >= sea) {
      const dent = 4e-3 + 5e-3 * Math.min(1, acc[i] / (T * 10));
      height[i] = Math.max(sea + 1e-3, height[i] - dent);
    }
  }
  return { river, lake, rivers };
}
var MinHeap = class {
  constructor(cap) {
    this.size = 0;
    this.keys = new Float64Array(cap + 8);
    this.vals = new Int32Array(cap + 8);
  }
  push(key, val) {
    let i = this.size++;
    const { keys, vals } = this;
    keys[i] = key;
    vals[i] = val;
    while (i > 0) {
      const p = i - 1 >> 1;
      if (keys[p] <= keys[i]) break;
      const tk = keys[p];
      keys[p] = keys[i];
      keys[i] = tk;
      const tv = vals[p];
      vals[p] = vals[i];
      vals[i] = tv;
      i = p;
    }
  }
  pop() {
    const { keys, vals } = this;
    const outK = keys[0], outV = vals[0];
    this.size--;
    keys[0] = keys[this.size];
    vals[0] = vals[this.size];
    let i = 0;
    for (; ; ) {
      const l = i * 2 + 1, r = l + 1;
      let m = i;
      if (l < this.size && keys[l] < keys[m]) m = l;
      if (r < this.size && keys[r] < keys[m]) m = r;
      if (m === i) break;
      const tk = keys[m];
      keys[m] = keys[i];
      keys[i] = tk;
      const tv = vals[m];
      vals[m] = vals[i];
      vals[i] = tv;
      i = m;
    }
    return [outK, outV];
  }
};

// src/render2d.ts
var PALETTES = {
  parchment: {
    // Classic fantasy-map grammar: land is a nearly flat cream tone; terrain is expressed
    // by glyphs and ink lines
    // (narrow hill/mountain colour steps — avoids wide brown terrace banding)
    deep: [118, 150, 142],
    ocean: [154, 182, 166],
    beach: [228, 204, 150],
    grass: [214, 184, 130],
    forest: [193, 176, 116],
    desert: [234, 202, 138],
    hill: [206, 175, 120],
    mountain: [188, 155, 108],
    snow: [240, 230, 206],
    river: [96, 138, 154],
    coastline: [86, 62, 36],
    paperGrain: 15,
    stipple: true
  },
  color: {
    deep: [38, 70, 111],
    ocean: [62, 105, 146],
    beach: [222, 206, 160],
    grass: [122, 158, 96],
    forest: [72, 112, 62],
    desert: [222, 197, 132],
    hill: [148, 138, 100],
    mountain: [128, 118, 106],
    snow: [240, 244, 246],
    river: [70, 118, 160],
    coastline: [40, 52, 60],
    paperGrain: 9,
    stipple: false
  },
  ink: {
    deep: [235, 232, 224],
    ocean: [242, 239, 231],
    beach: [235, 231, 220],
    grass: [244, 241, 233],
    forest: [214, 209, 196],
    desert: [240, 236, 224],
    hill: [222, 216, 202],
    mountain: [176, 168, 150],
    snow: [248, 246, 240],
    river: [120, 116, 104],
    coastline: [60, 55, 45],
    paperGrain: 6,
    stipple: true
  }
};
function hexToRGB(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function rgbToHex(c) {
  return "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}
var TERRAIN_COLOR_KEYS = [
  { key: "water", label: "Water", slot: "ocean" },
  { key: "grass", label: "Grassland", slot: "grass" },
  { key: "forest", label: "Forest", slot: "forest" },
  { key: "desert", label: "Desert", slot: "desert" },
  { key: "snow", label: "Snow", slot: "snow" }
];
function getPalette(style, colors) {
  const base = PALETTES[style] ?? PALETTES.parchment;
  if (!colors) return base;
  const pal = { ...base };
  for (const { key, slot } of TERRAIN_COLOR_KEYS) {
    const hex = colors[key];
    if (!hex) continue;
    const rgb = hexToRGB(hex);
    if (!rgb) continue;
    pal[slot] = rgb;
    if (key === "water") {
      pal.deep = [rgb[0] * 0.82, rgb[1] * 0.85, rgb[2] * 0.85];
    }
  }
  return pal;
}
function hash2(x, y) {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ n >> 13) * 1274126177;
  return ((n ^ n >> 16) >>> 0) / 4294967296;
}
function smoothVal(x, y, scale) {
  const xf = x / scale, yf = y / scale;
  const xi = Math.floor(xf), yi = Math.floor(yf);
  const tx = xf - xi, ty = yf - yi;
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
var _grainTile = null;
function paperGrainTile() {
  if (_grainTile) return _grainTile;
  const N = 160;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(N, N);
  const p = img.data;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const speck = hash2(x * 13 + 1, y * 7 + 3);
      const fiber = smoothVal(x, y * 0.35, 3.2);
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
var GRAIN_TILE = 160;
var COAST_RING_MAX = 17;
var COAST_RINGS = [[2.4, 13], [4.8, 9], [7.8, 6.5], [11.4, 4.5], [15.6, 3]];
function oceanExtraShade(x, y, d) {
  let v = (smoothVal(x + 533, y * 3.1 + 97, 9) - 0.5) * 6.5;
  if (d >= 1 && d <= COAST_RING_MAX) {
    for (let k = 0; k < COAST_RINGS.length; k++) {
      const t2 = (d - COAST_RINGS[k][0]) / 0.7;
      v -= Math.exp(-t2 * t2) * COAST_RINGS[k][1];
    }
  }
  return v;
}
function landWash(x, y) {
  const v = smoothVal(x * 0.9 + 911, y * 0.9 + 533, 21) - 0.5;
  return [v * 5, v * 9, -v * 4];
}
function biomeColor(pal, b) {
  switch (b) {
    case B.DEEP:
      return pal.deep;
    case B.OCEAN:
      return pal.ocean;
    case B.BEACH:
      return pal.beach;
    case B.FOREST:
      return pal.forest;
    case B.DESERT:
      return pal.desert;
    case B.HILL:
      return pal.hill;
    case B.MOUNTAIN:
      return pal.mountain;
    case B.SNOW:
      return pal.snow;
    default:
      return pal.grass;
  }
}
function isWaterBiome(b) {
  return b === B.DEEP || b === B.OCEAN;
}
var WAVE_DIST = 12;
function waterDistance(biome, w, h, maxD) {
  return distanceField(biome, w, h, maxD, true);
}
function landDistance(biome, w, h, maxD) {
  return distanceField(biome, w, h, maxD, false);
}
function distanceField(biome, w, h, maxD, targetWater) {
  const isTarget = (b) => isWaterBiome(b) === targetWater;
  const dist = new Uint8Array(w * h).fill(255);
  let frontier = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (isTarget(biome[i])) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
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
    const next = [];
    for (const i of frontier) {
      const x = i % w, y = i / w | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
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
function allocLayers(t2, opts = {}) {
  const base = document.createElement("canvas");
  base.width = t2.w;
  base.height = t2.h;
  const ss = t2.w <= 640 ? 3 : t2.w <= 900 ? 2.5 : t2.w <= 1600 ? 2 : 1.5;
  const stamps = document.createElement("canvas");
  stamps.width = Math.round(t2.w * ss);
  stamps.height = Math.round(t2.h * ss);
  return {
    base,
    stamps,
    ss,
    waterDist: waterDistance(t2.biome, t2.w, t2.h, Math.max(WAVE_DIST, COAST_RING_MAX, Math.round(opts.coastWidth ?? 0) * 3))
  };
}
function renderTile(layers, t2, style, opts, x0, y0, x1, y1) {
  paintBaseRect(layers, t2, style, opts, x0, y0, x1, y1);
  stampRect(layers, t2, style, opts, x0, y0, x1, y1);
}
function updateLayersRect(layers, t2, style, opts, x0, y0, x1, y1) {
  layers.waterDist = waterDistance(t2.biome, t2.w, t2.h, Math.max(WAVE_DIST, COAST_RING_MAX, Math.round(opts.coastWidth ?? 0) * 3));
  const pad = Math.max(WAVE_DIST, COAST_RING_MAX, Math.round(opts.coastWidth ?? 0) * 3) + 8;
  const rx0 = Math.max(0, x0 - pad), ry0 = Math.max(0, y0 - pad);
  const rx1 = Math.min(t2.w - 1, x1 + pad), ry1 = Math.min(t2.h - 1, y1 + pad);
  paintBaseRect(layers, t2, style, opts, rx0, ry0, rx1, ry1);
  stampRect(layers, t2, style, opts, rx0, ry0, rx1, ry1);
}
function paintBaseRect(layers, t2, style, opts, x0, y0, x1, y1) {
  const { w, h, height, biome, seaLevel } = t2;
  const pal = getPalette(style, opts.colors);
  const coastW = Math.max(0, Math.min(12, Math.round(opts.coastWidth ?? 0)));
  const coastRGB = opts.coastColor && hexToRGB(opts.coastColor) || [Math.min(255, pal.ocean[0] * 1.16), Math.min(255, pal.ocean[1] * 1.14), Math.min(255, pal.ocean[2] * 1.1)];
  const rw = x1 - x0 + 1, rh = y1 - y0 + 1;
  const ctx = layers.base.getContext("2d");
  const img = ctx.createImageData(rw, rh);
  const px = img.data;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * w + x;
      const b = biome[i];
      let [r, g, bl] = biomeColor(pal, b);
      const el = height[i];
      if (isWaterBiome(b)) {
        const rawDepth = Math.min(1, Math.max(0, (seaLevel - el) / 0.25));
        const depth = t2.lake[i] ? 0.4 : 0.22 + 0.78 * Math.pow(rawDepth, 0.7);
        const dp = pal.deep, oc = pal.ocean;
        r = oc[0] + (dp[0] - oc[0]) * depth;
        g = oc[1] + (dp[1] - oc[1]) * depth;
        bl = oc[2] + (dp[2] - oc[2]) * depth;
        if (coastW > 0 && !t2.lake[i]) {
          const d = layers.waterDist[i];
          if (d <= coastW * 3) {
            const f = Math.exp(-(d - 1) / (coastW * 0.9)) * 0.38;
            r += (coastRGB[0] - r) * f;
            g += (coastRGB[1] - g) * f;
            bl += (coastRGB[2] - bl) * f;
          }
        }
        if (t2.lake[i] && layers.waterDist[i] === 1) {
          const ck = pal.coastline;
          r = r * 0.45 + ck[0] * 0.55;
          g = g * 0.45 + ck[1] * 0.55;
          bl = bl * 0.45 + ck[2] * 0.55;
        }
        const ex = oceanExtraShade(x, y, layers.waterDist[i]);
        r += ex;
        g += ex * 0.98;
        bl += ex * 0.9;
      } else {
        const x1b = Math.min(w - 1, x + 1), y1b = Math.min(h - 1, y + 1);
        const c00 = biomeColor(pal, biome[i]);
        const c10 = biomeColor(pal, biome[y * w + x1b]);
        const c01 = biomeColor(pal, biome[y1b * w + x]);
        const c11 = biomeColor(pal, biome[y1b * w + x1b]);
        const tx = 0.5, ty = 0.5;
        r = (c00[0] * (1 - tx) + c10[0] * tx) * (1 - ty) + (c01[0] * (1 - tx) + c11[0] * tx) * ty;
        g = (c00[1] * (1 - tx) + c10[1] * tx) * (1 - ty) + (c01[1] * (1 - tx) + c11[1] * tx) * ty;
        bl = (c00[2] * (1 - tx) + c10[2] * tx) * (1 - ty) + (c01[2] * (1 - tx) + c11[2] * tx) * ty;
        const hl = height[y * w + Math.max(0, x - 1)];
        const hu = height[Math.max(0, y - 1) * w + x];
        const rf = opts.relief ?? 1;
        const shade = 1 + (hl - el + hu - el) * 4.2 * rf;
        const rel = (el - seaLevel) / Math.max(1e-4, 1 - seaLevel);
        const lift = 1 + rel * 0.1 * rf;
        const sc = Math.min(1 + 0.22 * rf, Math.max(1 - 0.22 * rf, shade)) * lift;
        r *= sc;
        g *= sc;
        bl *= sc;
        if (b !== B.SNOW) {
          const wash = landWash(x, y);
          r += wash[0];
          g += wash[1];
          bl += wash[2];
        }
      }
      if (pal.paperGrain > 0) {
        const grain = (hash2(x + 999, y + 999) - 0.5) * pal.paperGrain * (isWaterBiome(b) ? 0.5 : 1);
        r += grain;
        g += grain;
        bl += grain;
      }
      const mScale = isWaterBiome(b) ? 0.45 : 1;
      const mottle = (smoothVal(x + 300, y + 300, 13) - 0.5) * 22 * (opts.mottle ?? 1) * mScale;
      r += mottle;
      g += mottle * 0.95;
      bl += mottle * 0.82;
      const o = ((y - y0) * rw + (x - x0)) * 4;
      px[o] = Math.max(0, Math.min(255, r));
      px[o + 1] = Math.max(0, Math.min(255, g));
      px[o + 2] = Math.max(0, Math.min(255, bl));
      px[o + 3] = 255;
    }
  }
  ctx.putImageData(img, x0, y0);
}
function stampRect(layers, t2, style, opts, x0, y0, x1, y1) {
  const { w, h, biome, height, seaLevel } = t2;
  const pal = getPalette(style, opts.colors);
  const ink = pal.coastline;
  const ss = layers.ss;
  const ctx = layers.stamps.getContext("2d");
  ctx.save();
  ctx.scale(ss, ss);
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
      const fitsLand = (r) => {
        for (const [ox2, oy2] of [[-r, 0], [r, 0], [0, -r], [0, r]]) {
          const tx = Math.round(jx + ox2), ty = Math.round(jy + oy2);
          if (tx < 0 || ty < 0 || tx >= w || ty >= h) return false;
          if (isWaterBiome(biome[ty * w + tx])) return false;
        }
        return true;
      };
      if (b === B.FOREST && rnd < 0.85) {
        const s = 2.2 + rnd * 1.7;
        const radius = s * 0.62;
        const cy = jy - s * 0.15;
        if (!fitsLand(s * 1.15)) continue;
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
          const theta = k * Math.PI * 2 / segments;
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
        ctx.save();
        ctx.clip(canopy);
        ctx.fillStyle = `rgba(${fc[0] * 0.55},${fc[1] * 0.6},${fc[2] * 0.5},0.5)`;
        ctx.beginPath();
        ctx.ellipse(jx - radius * 0.45, cy + radius * 0.45, radius * 0.85, radius * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.stroke(canopy);
      } else if (b === B.HILL && rnd < 0.5) {
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
        ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.3)`;
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        const hn = 1 + Math.round(hash2(jx + 3, jy) * 1.2);
        for (let h2 = 1; h2 <= hn; h2++) {
          const t3 = h2 / (hn + 1);
          const hx = peakX + t3 * (jx + s - peakX) * 0.8;
          const hy = peakY + t3 * (baseY - peakY) * 0.85;
          ctx.moveTo(hx, hy);
          ctx.quadraticCurveTo(hx - s * 0.12, hy + s * 0.2, hx - s * 0.2, hy + s * 0.34);
        }
        ctx.stroke();
      } else if (opts.waves !== false && isWaterBiome(b) && rnd < 0.24) {
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
  const mStep = 11;
  const mgx0 = Math.max(0, Math.floor((x0 - mStep * 2) / mStep) * mStep);
  const mgy0 = Math.max(0, Math.floor((y0 - mStep * 2) / mStep) * mStep);
  for (let gy = mgy0 + (mStep >> 1); gy <= y1 + mStep; gy += mStep) {
    const rowShift = (gy / mStep | 0) % 2 === 0 ? 0 : mStep * 0.5;
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
        const rel = (height[i] - seaLevel) / Math.max(1e-4, 1 - seaLevel);
        if (b === B.SNOW && (rel < 0.55 || rnd > 0.65)) continue;
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
        const leftFace = new Path2D();
        leftFace.moveTo(lbX, lbY);
        leftFace.lineTo(lmx, lmy);
        leftFace.lineTo(peakX, peakY);
        leftFace.lineTo(peakX + s * 0.04, jy + s * 0.5);
        leftFace.closePath();
        ctx.fillStyle = "rgba(255,251,240,0.32)";
        ctx.fill(leftFace);
        const rightFace = new Path2D();
        rightFace.moveTo(peakX, peakY);
        rightFace.lineTo(rmx, rmy);
        rightFace.lineTo(rbX, rbY);
        rightFace.lineTo(peakX + s * 0.04, jy + s * 0.5);
        rightFace.closePath();
        ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.16)`;
        ctx.fill(rightFace);
        ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.8)`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(lbX, lbY);
        ctx.lineTo(lmx, lmy);
        ctx.lineTo(peakX, peakY);
        ctx.lineTo(rmx, rmy);
        ctx.lineTo(rbX, rbY);
        ctx.stroke();
        ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.4)`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        const hatchCount = 4 + Math.floor(rnd * 3);
        for (let h2 = 1; h2 <= hatchCount; h2++) {
          const t3 = h2 / (hatchCount + 1);
          const startX = peakX + t3 * (rbX - peakX);
          const startY = peakY + t3 * (rbY - peakY);
          const hatchLen = s * 0.45 * (1 - t3 * 0.4) * (0.8 + 0.4 * hash2(jx + h2, jy));
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

// src/contours.ts
function extractContours(height, w, h, sea, precision, bathy = 2) {
  const levelCount = Math.round(3 + precision * 4);
  const epsilon = Math.max(0.4, 2.2 - precision * 0.9);
  const step = (1 - sea) / levelCount;
  const levels = [];
  for (let k = bathy; k >= 1; k--) {
    const iso = sea - k * 0.055;
    if (iso <= 0.02) continue;
    const rings = marchingSquares(height, w, h, iso).map((r) => simplifyRing(r, epsilon * 1.4)).filter((r) => r.length >= 3 && Math.abs(ringArea(r)) > 12);
    if (rings.length > 0) levels.push({ z: iso, rings });
  }
  for (let k = 0; k < levelCount; k++) {
    const iso = sea + k * step;
    const rings = marchingSquares(height, w, h, iso).map((r) => simplifyRing(r, epsilon)).filter((r) => r.length >= 3 && Math.abs(ringArea(r)) > 3);
    if (rings.length > 0) levels.push({ z: iso, rings });
  }
  return { levels, step };
}
function extractIsoRings(field, w, h, iso, epsilon = 0.8, minArea = 6) {
  return marchingSquares(field, w, h, iso).map((r) => simplifyRing(r, epsilon)).filter((r) => r.length >= 3 && Math.abs(ringArea(r)) > minArea);
}
function simplifyLine(pts, epsilon) {
  return dpSimplify(pts, epsilon);
}
function marchingSquares(f, w, h, iso) {
  const OUT = -10;
  const sample = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? OUT : f[y * w + x];
  const segs = [];
  for (let y = -1; y < h; y++) {
    for (let x = -1; x < w; x++) {
      const a = sample(x, y);
      const b = sample(x + 1, y);
      const c = sample(x + 1, y + 1);
      const d = sample(x, y + 1);
      let idx = 0;
      if (a >= iso) idx |= 8;
      if (b >= iso) idx |= 4;
      if (c >= iso) idx |= 2;
      if (d >= iso) idx |= 1;
      if (idx === 0 || idx === 15) continue;
      const t2 = (va, vb) => {
        const dv = vb - va;
        return dv === 0 ? 0.5 : (iso - va) / dv;
      };
      const topX = x + t2(a, b), topY = y;
      const rightX = x + 1, rightY = y + t2(b, c);
      const botX = x + t2(d, c), botY = y + 1;
      const leftX = x, leftY = y + t2(a, d);
      const put = (x1, y1, x2, y2) => segs.push(x1, y1, x2, y2);
      switch (idx) {
        case 1:
          put(leftX, leftY, botX, botY);
          break;
        case 2:
          put(botX, botY, rightX, rightY);
          break;
        case 3:
          put(leftX, leftY, rightX, rightY);
          break;
        case 4:
          put(topX, topY, rightX, rightY);
          break;
        case 5:
          if ((a + b + c + d) / 4 >= iso) {
            put(topX, topY, leftX, leftY);
            put(botX, botY, rightX, rightY);
          } else {
            put(topX, topY, rightX, rightY);
            put(leftX, leftY, botX, botY);
          }
          break;
        case 6:
          put(topX, topY, botX, botY);
          break;
        case 7:
          put(leftX, leftY, topX, topY);
          break;
        case 8:
          put(leftX, leftY, topX, topY);
          break;
        case 9:
          put(topX, topY, botX, botY);
          break;
        case 10:
          if ((a + b + c + d) / 4 >= iso) {
            put(topX, topY, rightX, rightY);
            put(leftX, leftY, botX, botY);
          } else {
            put(topX, topY, leftX, leftY);
            put(botX, botY, rightX, rightY);
          }
          break;
        case 11:
          put(topX, topY, rightX, rightY);
          break;
        case 12:
          put(leftX, leftY, rightX, rightY);
          break;
        case 13:
          put(botX, botY, rightX, rightY);
          break;
        case 14:
          put(leftX, leftY, botX, botY);
          break;
      }
    }
  }
  return chainSegments(segs);
}
function chainSegments(segs) {
  const count = segs.length / 4;
  const key = (x, y) => `${Math.round(x * 1024)},${Math.round(y * 1024)}`;
  const byPoint = /* @__PURE__ */ new Map();
  for (let i = 0; i < count; i++) {
    for (const k of [key(segs[i * 4], segs[i * 4 + 1]), key(segs[i * 4 + 2], segs[i * 4 + 3])]) {
      const arr = byPoint.get(k);
      if (arr) arr.push(i);
      else byPoint.set(k, [i]);
    }
  }
  const used = new Uint8Array(count);
  const rings = [];
  for (let start = 0; start < count; start++) {
    if (used[start]) continue;
    used[start] = 1;
    const ring = [
      [segs[start * 4], segs[start * 4 + 1]],
      [segs[start * 4 + 2], segs[start * 4 + 3]]
    ];
    const headKey = key(ring[0][0], ring[0][1]);
    for (; ; ) {
      const tail = ring[ring.length - 1];
      const tk = key(tail[0], tail[1]);
      if (tk === headKey && ring.length > 2) {
        ring.pop();
        break;
      }
      const candidates = byPoint.get(tk);
      let next = -1;
      if (candidates) {
        for (const ci of candidates) {
          if (!used[ci]) {
            next = ci;
            break;
          }
        }
      }
      if (next < 0) break;
      used[next] = 1;
      const nx1 = segs[next * 4], ny1 = segs[next * 4 + 1];
      const nx2 = segs[next * 4 + 2], ny2 = segs[next * 4 + 3];
      if (key(nx1, ny1) === tk) ring.push([nx2, ny2]);
      else ring.push([nx1, ny1]);
    }
    if (ring.length >= 3) rings.push(ring);
  }
  return rings;
}
function simplifyRing(ring, epsilon) {
  if (epsilon <= 0 || ring.length < 8) return ring;
  let far = 0, farD = -1;
  for (let i = 1; i < ring.length; i++) {
    const dx = ring[i][0] - ring[0][0], dy = ring[i][1] - ring[0][1];
    const d = dx * dx + dy * dy;
    if (d > farD) {
      farD = d;
      far = i;
    }
  }
  const a = dpSimplify(ring.slice(0, far + 1), epsilon);
  const b = dpSimplify(ring.slice(far).concat([ring[0]]), epsilon);
  return a.slice(0, -1).concat(b.slice(0, -1));
}
function dpSimplify(pts, epsilon) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  const eps2 = epsilon * epsilon;
  while (stack.length > 0) {
    const [s, e] = stack.pop();
    if (e - s < 2) continue;
    const [sx, sy] = pts[s], [ex, ey] = pts[e];
    const dx = ex - sx, dy = ey - sy;
    const len2 = dx * dx + dy * dy || 1;
    let maxD = -1, maxI = -1;
    for (let i = s + 1; i < e; i++) {
      const px = pts[i][0] - sx, py = pts[i][1] - sy;
      const cross = px * dy - py * dx;
      const d = cross * cross / len2;
      if (d > maxD) {
        maxD = d;
        maxI = i;
      }
    }
    if (maxD > eps2) {
      keep[maxI] = 1;
      stack.push([s, maxI], [maxI, e]);
    }
  }
  const out = [];
  for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
  return out;
}
function chaikin(pts, iterations = 2, closed = true) {
  let cur = pts;
  for (let it = 0; it < iterations; it++) {
    if (cur.length < 3) return cur;
    const out = [];
    const n = cur.length;
    if (!closed) out.push(cur[0]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const [ax, ay] = cur[i];
      const [bx, by] = cur[(i + 1) % n];
      out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
      out.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    if (!closed) out.push(cur[n - 1]);
    cur = out;
  }
  return cur;
}
function ringArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return sum / 2;
}

// src/rough.ts
function roughLine(pts, amp, seed) {
  if (pts.length < 2) return pts;
  const rng = mulberry32(seed);
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    let tx = next[0] - prev[0], ty = next[1] - prev[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const nx = -ty, ny = tx;
    const j = (rng() - 0.5) * 2 * amp;
    const jt = (rng() - 0.5) * amp * 0.5;
    out.push([x + nx * j + tx * jt, y + ny * j + ty * jt]);
  }
  return out;
}
function roughRing(ring, amp, seed) {
  if (ring.length < 3) return ring;
  const rng = mulberry32(seed);
  const n = ring.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = ring[i];
    const prev = ring[(i - 1 + n) % n];
    const next = ring[(i + 1) % n];
    let tx = next[0] - prev[0], ty = next[1] - prev[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const nx = -ty, ny = tx;
    const j = (rng() - 0.5) * 2 * amp;
    out.push([x + nx * j, y + ny * j]);
  }
  return out;
}
function sketchToPath(path, pts, closed) {
  if (pts.length < 2) return;
  const p = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  path.moveTo(pts[0][0], pts[0][1]);
  const end = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < end; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = closed ? pts[(i + 1) % pts.length] : p(i + 1), p3 = closed ? pts[(i + 2) % pts.length] : p(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    path.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
  if (closed) path.closePath();
}

// src/fonts.ts
var FONT_SERIF = '"FMS Serif", "FMS Hand", Georgia, serif';
var FONT_HAND = '"FMS Hand", "Segoe Script", cursive';
function ensureFontsLoaded(cb) {
  const fd = document.fonts;
  if (!fd) {
    cb();
    return;
  }
  Promise.all([
    fd.load('600 16px "FMS Serif"'),
    fd.load('600 16px "FMS Hand"')
  ]).then(() => cb()).catch(() => cb());
}

// src/ink.ts
function resample(pts, subdiv = 3) {
  if (pts.length < 3) return pts.slice();
  const out = [];
  const p = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
    for (let s = 0; s < subdiv; s++) {
      const t2 = s / subdiv, t22 = t2 * t2, t3 = t22 * t2;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t2 + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t22 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t2 + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t22 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function ribbonPath(pts, widthAt) {
  const rs = resample(pts, 3);
  const n = rs.length;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const a = rs[Math.max(0, i - 1)], b = rs[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const nx = -ty, ny = tx;
    const w = Math.max(0, widthAt(i / (n - 1), i)) / 2;
    left.push([rs[i][0] + nx * w, rs[i][1] + ny * w]);
    right.push([rs[i][0] - nx * w, rs[i][1] - ny * w]);
  }
  const path = new Path2D();
  path.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < n; i++) path.lineTo(left[i][0], left[i][1]);
  for (let i = n - 1; i >= 0; i--) path.lineTo(right[i][0], right[i][1]);
  path.closePath();
  return path;
}
function taperedRibbon(pts, wStart, wEnd) {
  return ribbonPath(pts, (t2) => {
    const w = wStart + (wEnd - wStart) * t2;
    const endTaper = Math.min(1, t2 / 0.08) * Math.min(1, (1 - t2) / 0.06);
    return w * (0.55 + 0.45 * endTaper);
  });
}
function rgbaFrom(color, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(color);
  if (m) {
    const n = parseInt(m[1], 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  }
  return color;
}
function inkStroke(ctx, pts, o) {
  if (pts.length < 2) return;
  const passes = o.passes ?? 2;
  const amp = o.amp ?? Math.max(0.5, o.width * 0.35);
  const seed = o.seed ?? 1234;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const bleed = o.bleed ?? 2.4;
  if (bleed > 0) {
    const p = new Path2D();
    sketchToPath(p, roughLine(pts, amp * 0.6, seed + 700), !!o.closed);
    ctx.strokeStyle = rgbaFrom(o.color, o.bleedAlpha ?? 0.1);
    ctx.lineWidth = o.width * bleed;
    ctx.stroke(p);
  }
  for (let k = 0; k < passes; k++) {
    const p = new Path2D();
    sketchToPath(p, roughLine(pts, amp, seed + k * 811), !!o.closed);
    ctx.strokeStyle = rgbaFrom(o.color, k === 0 ? 0.92 : 0.5);
    ctx.lineWidth = o.width * (k === 0 ? 1 : 0.7);
    ctx.stroke(p);
  }
  ctx.restore();
}
function brushArrow(ctx, pts, color, width, dashed) {
  if (pts.length < 2) return;
  const tip = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const nx = -dy, ny = dx;
  const headLen = width * 3.4 + 6;
  const headHalf = width * 1.9 + 4;
  const barb = 0.32;
  const baseX = tip[0] - dx * headLen, baseY = tip[1] - dy * headLen;
  const notchX = tip[0] - dx * headLen * (1 - barb), notchY = tip[1] - dy * headLen * (1 - barb);
  const bodyEnd = [notchX, notchY];
  const body = pts.slice(0, -1).concat([bodyEnd]);
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (dashed) {
    ctx.setLineDash([width * 2.6, width * 2.2]);
    ctx.lineWidth = width;
    const p = new Path2D();
    sketchToPath(p, body, false);
    ctx.stroke(p);
    ctx.setLineDash([]);
  } else {
    ctx.fill(taperedRibbon(body, width * 0.5, width * 1));
  }
  const head = new Path2D();
  head.moveTo(tip[0], tip[1]);
  head.lineTo(baseX + nx * headHalf, baseY + ny * headHalf);
  head.lineTo(notchX, notchY);
  head.lineTo(baseX - nx * headHalf, baseY - ny * headHalf);
  head.closePath();
  ctx.fill(head);
  ctx.restore();
}

// src/stickers.ts
function sampleQuad(p0, c, p1, n = 14) {
  const out = [];
  for (let k = 0; k <= n; k++) {
    const t2 = k / n, u = 1 - t2;
    out.push([
      u * u * p0[0] + 2 * u * t2 * c[0] + t2 * t2 * p1[0],
      u * u * p0[1] + 2 * u * t2 * c[1] + t2 * t2 * p1[1]
    ]);
  }
  return out;
}
function spiralPts(cx, cy, r0, turns, phase, dir = 1) {
  const out = [];
  const total = turns * Math.PI * 2;
  for (let t2 = 0; t2 <= total; t2 += 0.22) {
    const rr = r0 * (1 - t2 / (total * 1.12));
    out.push([cx + Math.cos(phase + t2 * dir) * rr, cy + Math.sin(phase + t2 * dir) * rr]);
  }
  return out;
}
var STICKER_CATS = [
  { id: "sky", label: "Sky" },
  { id: "sea", label: "Sea" },
  { id: "land", label: "Land" },
  { id: "map", label: "Map" }
];
var STICKERS = [
  // ── Sky ──────────────────────────────────────────────
  {
    id: "cloud",
    label: "Cloud",
    cat: "sky",
    box: [1.2, 0.72],
    draw(ctx, cx, cy, r, ink, paper) {
      const lw = ctx.lineWidth;
      const base = cy + r * 0.28;
      const p = new Path2D();
      p.moveTo(cx - r * 0.98, base);
      p.quadraticCurveTo(cx - r * 1.06, cy + r * 0.02, cx - r * 0.66, cy - r * 0.06);
      p.quadraticCurveTo(cx - r * 0.56, cy - r * 0.42, cx - r * 0.18, cy - r * 0.34);
      p.quadraticCurveTo(cx + r * 0.06, cy - r * 0.56, cx + r * 0.42, cy - r * 0.34);
      p.quadraticCurveTo(cx + r * 0.7, cy - r * 0.42, cx + r * 0.8, cy - r * 0.08);
      p.quadraticCurveTo(cx + r * 1.08, cy - r * 0.04, cx + r * 0.98, base);
      p.closePath();
      ctx.fillStyle = paper;
      ctx.fill(p);
      ctx.strokeStyle = ink(0.82);
      ctx.stroke(p);
      ctx.strokeStyle = ink(0.35);
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.78, base + r * 0.14);
      ctx.lineTo(cx + r * 0.5, base + r * 0.14);
      ctx.moveTo(cx - r * 0.5, base + r * 0.28);
      ctx.lineTo(cx + r * 0.78, base + r * 0.28);
      ctx.stroke();
      ctx.lineWidth = lw;
    }
  },
  {
    id: "sun",
    label: "Sun",
    cat: "sky",
    box: [1.05, 1.05],
    draw(ctx, cx, cy, r, ink, paper) {
      const lw = ctx.lineWidth;
      ctx.fillStyle = ink(0.8);
      for (let k = 0; k < 16; k++) {
        const a = k * Math.PI / 8;
        const len = k % 2 === 0 ? r * 1 : r * 0.66;
        const wj = r * (k % 2 === 0 ? 0.06 : 0.045);
        const px = Math.cos(a), py = Math.sin(a);
        const qx = -py, qy = px;
        ctx.beginPath();
        ctx.moveTo(cx + px * len, cy + py * len);
        ctx.lineTo(cx + px * r * 0.5 + qx * wj, cy + py * r * 0.5 + qy * wj);
        ctx.lineTo(cx + px * r * 0.5 - qx * wj, cy + py * r * 0.5 - qy * wj);
        ctx.closePath();
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = paper;
      ctx.fill();
      ctx.strokeStyle = ink(0.85);
      ctx.stroke();
      ctx.strokeStyle = ink(0.45);
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 + Math.PI / 8;
        ctx.moveTo(cx + Math.cos(a) * r * 0.12, cy + Math.sin(a) * r * 0.12);
        ctx.lineTo(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3);
      }
      ctx.stroke();
      ctx.lineWidth = lw;
    }
  },
  {
    id: "moon",
    label: "Crescent moon",
    cat: "sky",
    box: [0.95, 0.8],
    draw(ctx, cx, cy, r, ink, paper) {
      const lw = ctx.lineWidth;
      const p = new Path2D();
      p.moveTo(cx + r * 0.2, cy - r * 0.56);
      p.bezierCurveTo(cx - r * 0.78, cy - r * 0.58, cx - r * 0.78, cy + r * 0.58, cx + r * 0.16, cy + r * 0.56);
      p.bezierCurveTo(cx - r * 0.2, cy + r * 0.42, cx - r * 0.22, cy - r * 0.42, cx + r * 0.2, cy - r * 0.56);
      p.closePath();
      ctx.fillStyle = paper;
      ctx.fill(p);
      ctx.strokeStyle = ink(0.85);
      ctx.stroke(p);
      ctx.strokeStyle = ink(0.4);
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.02, cy - r * 0.4);
      ctx.bezierCurveTo(cx - r * 0.5, cy - r * 0.42, cx - r * 0.5, cy + r * 0.42, cx - r * 0.04, cy + r * 0.4);
      ctx.stroke();
      ctx.lineWidth = lw;
      const s = r * 0.13, sx = cx + r * 0.5, sy = cy - r * 0.34;
      ctx.fillStyle = ink(0.6);
      ctx.beginPath();
      ctx.moveTo(sx, sy - s);
      ctx.lineTo(sx + s * 0.22, sy - s * 0.22);
      ctx.lineTo(sx + s, sy);
      ctx.lineTo(sx + s * 0.22, sy + s * 0.22);
      ctx.lineTo(sx, sy + s);
      ctx.lineTo(sx - s * 0.22, sy + s * 0.22);
      ctx.lineTo(sx - s, sy);
      ctx.lineTo(sx - s * 0.22, sy - s * 0.22);
      ctx.closePath();
      ctx.fill();
    }
  },
  {
    id: "birds",
    label: "Flock of birds",
    cat: "sky",
    box: [0.95, 0.7],
    draw(ctx, cx, cy, r, ink) {
      ctx.strokeStyle = ink(0.75);
      ctx.lineCap = "round";
      const gull = (x, y, s) => {
        ctx.beginPath();
        ctx.moveTo(x - s, y);
        ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.8, x, y);
        ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.8, x + s, y);
        ctx.stroke();
      };
      gull(cx - r * 0.4, cy - r * 0.15, r * 0.34);
      gull(cx + r * 0.3, cy - r * 0.42, r * 0.27);
      gull(cx + r * 0.42, cy + r * 0.22, r * 0.2);
      gull(cx - r * 0.25, cy + r * 0.38, r * 0.16);
    }
  },
  // ── Sea ──────────────────────────────────────────────
  {
    id: "whale",
    label: "Whale",
    cat: "sea",
    box: [1.3, 1],
    draw(ctx, cx, cy, r, ink, paper) {
      const lw = ctx.lineWidth;
      const p = new Path2D();
      p.moveTo(cx - r * 1, cy + r * 0.04);
      p.quadraticCurveTo(cx - r * 0.9, cy - r * 0.44, cx - r * 0.3, cy - r * 0.46);
      p.quadraticCurveTo(cx + r * 0.4, cy - r * 0.48, cx + r * 0.66, cy - r * 0.16);
      p.lineTo(cx + r * 0.82, cy - r * 0.5);
      p.lineTo(cx + r * 1.16, cy - r * 0.44);
      p.lineTo(cx + r * 0.94, cy - r * 0.06);
      p.lineTo(cx + r * 1.16, cy + r * 0.28);
      p.lineTo(cx + r * 0.8, cy + r * 0.2);
      p.quadraticCurveTo(cx + r * 0.5, cy + r * 0.34, cx - r * 0.1, cy + r * 0.34);
      p.quadraticCurveTo(cx - r * 0.72, cy + r * 0.34, cx - r * 1, cy + r * 0.04);
      p.closePath();
      ctx.fillStyle = paper;
      ctx.fill(p);
      ctx.strokeStyle = ink(0.85);
      ctx.stroke(p);
      ctx.strokeStyle = ink(0.55);
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.98, cy + r * 0.06);
      ctx.quadraticCurveTo(cx - r * 0.75, cy + r * 0.16, cx - r * 0.4, cy + r * 0.12);
      ctx.stroke();
      ctx.strokeStyle = ink(0.85);
      ctx.lineWidth = lw;
      const fin = new Path2D();
      fin.moveTo(cx - r * 0.36, cy + r * 0.26);
      fin.quadraticCurveTo(cx - r * 0.22, cy + r * 0.5, cx + r * 0.02, cy + r * 0.42);
      fin.quadraticCurveTo(cx - r * 0.16, cy + r * 0.3, cx - r * 0.2, cy + r * 0.26);
      fin.closePath();
      ctx.fillStyle = paper;
      ctx.fill(fin);
      ctx.stroke(fin);
      ctx.strokeStyle = ink(0.35);
      ctx.lineWidth = lw * 0.65;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.55, cy - r * 0.18);
      ctx.quadraticCurveTo(cx, cy - r * 0.28, cx + r * 0.5, cy - r * 0.1);
      ctx.moveTo(cx - r * 0.5, cy - r * 0.04);
      ctx.quadraticCurveTo(cx, cy - r * 0.14, cx + r * 0.48, cy + r * 0.02);
      ctx.stroke();
      ctx.lineWidth = lw;
      ctx.fillStyle = ink(0.9);
      ctx.beginPath();
      ctx.arc(cx - r * 0.68, cy - r * 0.08, Math.max(0.9, r * 0.04), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ink(0.6);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.5, cy - r * 0.46);
      ctx.quadraticCurveTo(cx - r * 0.6, cy - r * 0.8, cx - r * 0.78, cy - r * 0.92);
      ctx.moveTo(cx - r * 0.5, cy - r * 0.46);
      ctx.quadraticCurveTo(cx - r * 0.42, cy - r * 0.8, cx - r * 0.3, cy - r * 0.9);
      ctx.stroke();
    }
  },
  {
    id: "fish",
    label: "School of fish",
    cat: "sea",
    box: [1, 0.8],
    draw(ctx, cx, cy, r, ink, paper) {
      const lw = ctx.lineWidth;
      const fish = (x, y, s) => {
        const p = new Path2D();
        p.moveTo(x - s, y);
        p.quadraticCurveTo(x - s * 0.2, y - s * 0.5, x + s * 0.5, y - s * 0.14);
        p.lineTo(x + s * 0.9, y - s * 0.44);
        p.quadraticCurveTo(x + s * 0.78, y, x + s * 0.9, y + s * 0.44);
        p.lineTo(x + s * 0.5, y + s * 0.14);
        p.quadraticCurveTo(x - s * 0.2, y + s * 0.5, x - s, y);
        p.closePath();
        ctx.fillStyle = paper;
        ctx.fill(p);
        ctx.strokeStyle = ink(0.82);
        ctx.lineWidth = lw;
        ctx.stroke(p);
        ctx.strokeStyle = ink(0.45);
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.moveTo(x - s * 0.5, y - s * 0.22);
        ctx.quadraticCurveTo(x - s * 0.36, y, x - s * 0.5, y + s * 0.22);
        ctx.moveTo(x + s * 0.02, y - s * 0.24);
        ctx.lineTo(x + s * 0.16, y - s * 0.34);
        ctx.moveTo(x + s * 0.16, y - s * 0.18);
        ctx.lineTo(x + s * 0.3, y - s * 0.28);
        ctx.stroke();
        ctx.lineWidth = lw;
        ctx.fillStyle = ink(0.85);
        ctx.beginPath();
        ctx.arc(x - s * 0.62, y - s * 0.06, Math.max(0.8, s * 0.06), 0, Math.PI * 2);
        ctx.fill();
      };
      fish(cx - r * 0.32, cy - r * 0.32, r * 0.5);
      fish(cx + r * 0.3, cy + r * 0.06, r * 0.42);
      fish(cx - r * 0.26, cy + r * 0.44, r * 0.34);
    }
  },
  {
    id: "whirlpool",
    label: "Whirlpool",
    cat: "sea",
    box: [0.95, 0.95],
    draw(ctx, cx, cy, r, ink) {
      ctx.strokeStyle = ink(0.7);
      ctx.lineCap = "round";
      ctx.beginPath();
      let first = true;
      for (let t2 = 0; t2 <= 4.6 * Math.PI; t2 += 0.15) {
        const rr = r * 0.05 + r * 0.85 * t2 / (4.6 * Math.PI);
        const x = cx + Math.cos(t2 + 0.8) * rr;
        const y = cy + Math.sin(t2 + 0.8) * rr * 0.82;
        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = ink(0.5);
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.75, cy - r * 0.55);
      ctx.quadraticCurveTo(cx + r * 0.9, cy - r * 0.7, cx + r * 1, cy - r * 0.62);
      ctx.moveTo(cx - r * 0.85, cy + r * 0.45);
      ctx.quadraticCurveTo(cx - r * 1, cy + r * 0.55, cx - r * 0.95, cy + r * 0.68);
      ctx.stroke();
    }
  },
  {
    id: "waves",
    label: "Waves",
    cat: "sea",
    box: [1.05, 0.7],
    draw(ctx, cx, cy, r, ink) {
      ctx.strokeStyle = ink(0.6);
      ctx.lineCap = "round";
      for (let row = 0; row < 3; row++) {
        const y = cy + (row - 1) * r * 0.38;
        const off = row % 2 === 0 ? 0 : r * 0.3;
        for (let k = -1; k <= 1; k++) {
          const x = cx + k * r * 0.6 + off;
          ctx.beginPath();
          ctx.arc(x, y, r * 0.3, Math.PI, Math.PI * 1.9);
          ctx.stroke();
        }
      }
    }
  },
  // ── Land ─────────────────────────────────────────────
  {
    id: "dragon",
    label: "Dragon",
    cat: "land",
    box: [1.25, 1],
    draw(ctx, cx, cy, r, ink, paper) {
      const p = new Path2D();
      p.moveTo(cx - r * 1.15, cy - r * 0.5);
      p.lineTo(cx - r * 0.9, cy - r * 0.4);
      p.lineTo(cx - r * 1.06, cy - r * 0.26);
      p.quadraticCurveTo(cx - r * 0.82, cy - r * 0.24, cx - r * 0.72, cy - r * 0.18);
      p.quadraticCurveTo(cx - r * 0.56, cy - r * 0.06, cx - r * 0.48, cy + r * 0.08);
      p.lineTo(cx - r * 0.38, cy + r * 0.28);
      p.lineTo(cx - r * 0.28, cy + r * 0.12);
      p.quadraticCurveTo(cx - r * 0.05, cy + r * 0.3, cx + r * 0.16, cy + r * 0.24);
      p.lineTo(cx + r * 0.24, cy + r * 0.46);
      p.lineTo(cx + r * 0.34, cy + r * 0.24);
      p.quadraticCurveTo(cx + r * 0.68, cy + r * 0.22, cx + r * 0.92, cy + r * 0.4);
      p.lineTo(cx + r * 0.94, cy + r * 0.56);
      p.lineTo(cx + r * 1.18, cy + r * 0.42);
      p.lineTo(cx + r * 0.99, cy + r * 0.3);
      p.quadraticCurveTo(cx + r * 0.72, cy + r * 0.06, cx + r * 0.44, cy + r * 0.02);
      p.lineTo(cx + r * 0.38, cy - r * 0.06);
      p.quadraticCurveTo(cx + r * 0.62, cy - r * 0.42, cx + r * 0.56, cy - r * 0.9);
      p.quadraticCurveTo(cx + r * 0.28, cy - r * 0.58, cx + r * 0.12, cy - r * 0.74);
      p.quadraticCurveTo(cx - r * 0.06, cy - r * 0.44, cx - r * 0.22, cy - r * 0.52);
      p.quadraticCurveTo(cx - r * 0.36, cy - r * 0.3, cx - r * 0.46, cy - r * 0.24);
      p.quadraticCurveTo(cx - r * 0.62, cy - r * 0.34, cx - r * 0.7, cy - r * 0.52);
      p.lineTo(cx - r * 0.58, cy - r * 0.72);
      p.lineTo(cx - r * 0.78, cy - r * 0.58);
      p.quadraticCurveTo(cx - r * 0.98, cy - r * 0.58, cx - r * 1.15, cy - r * 0.5);
      p.closePath();
      ctx.fillStyle = ink(0.85);
      ctx.fill(p);
      ctx.fillStyle = paper;
      ctx.beginPath();
      ctx.arc(cx - r * 0.88, cy - r * 0.48, Math.max(0.9, r * 0.04), 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: "tent",
    label: "Camp",
    cat: "land",
    box: [1, 1],
    draw(ctx, cx, cy, r, ink, paper) {
      const p = new Path2D();
      p.moveTo(cx - r * 0.78, cy + r * 0.55);
      p.lineTo(cx, cy - r * 0.62);
      p.lineTo(cx + r * 0.78, cy + r * 0.55);
      p.closePath();
      ctx.fillStyle = paper;
      ctx.fill(p);
      ctx.strokeStyle = ink(0.85);
      ctx.stroke(p);
      const door = new Path2D();
      door.moveTo(cx - r * 0.2, cy + r * 0.55);
      door.lineTo(cx, cy + r * 0.02);
      door.lineTo(cx + r * 0.2, cy + r * 0.55);
      ctx.fillStyle = ink(0.22);
      ctx.fill(door);
      ctx.stroke(door);
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.62);
      ctx.lineTo(cx, cy - r * 0.92);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.92);
      ctx.lineTo(cx + r * 0.3, cy - r * 0.84);
      ctx.lineTo(cx, cy - r * 0.76);
      ctx.closePath();
      ctx.fillStyle = ink(0.7);
      ctx.fill();
      ctx.strokeStyle = ink(0.5);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.95, cy + r * 0.56);
      ctx.quadraticCurveTo(cx, cy + r * 0.62, cx + r * 0.95, cy + r * 0.56);
      ctx.stroke();
    }
  },
  {
    id: "ruins",
    label: "Ancient ruins",
    cat: "land",
    box: [1, 1],
    draw(ctx, cx, cy, r, ink, paper) {
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      const col = new Path2D();
      col.rect(cx - r * 0.62, cy - r * 0.55, r * 0.28, r * 1.1);
      ctx.fill(col);
      ctx.stroke(col);
      const cap = new Path2D();
      cap.rect(cx - r * 0.7, cy - r * 0.68, r * 0.44, r * 0.14);
      ctx.fill(cap);
      ctx.stroke(cap);
      const br = new Path2D();
      br.moveTo(cx + r * 0.12, cy + r * 0.55);
      br.lineTo(cx + r * 0.12, cy - r * 0.1);
      br.lineTo(cx + r * 0.22, cy - r * 0.24);
      br.lineTo(cx + r * 0.3, cy - r * 0.06);
      br.lineTo(cx + r * 0.4, cy - r * 0.18);
      br.lineTo(cx + r * 0.4, cy + r * 0.55);
      br.closePath();
      ctx.fill(br);
      ctx.stroke(br);
      ctx.strokeStyle = ink(0.3);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.53, cy - r * 0.5);
      ctx.lineTo(cx - r * 0.53, cy + r * 0.5);
      ctx.moveTo(cx - r * 0.44, cy - r * 0.5);
      ctx.lineTo(cx - r * 0.44, cy + r * 0.5);
      ctx.moveTo(cx + r * 0.21, cy - r * 0.1);
      ctx.lineTo(cx + r * 0.21, cy + r * 0.48);
      ctx.moveTo(cx + r * 0.31, cy - r * 0.04);
      ctx.lineTo(cx + r * 0.31, cy + r * 0.48);
      ctx.stroke();
      ctx.strokeStyle = ink(0.8);
      ctx.save();
      ctx.translate(cx + r * 0.68, cy + r * 0.44);
      ctx.rotate(0.35);
      const drum = new Path2D();
      drum.rect(-r * 0.2, -r * 0.09, r * 0.4, r * 0.18);
      ctx.fillStyle = paper;
      ctx.fill(drum);
      ctx.stroke(drum);
      ctx.restore();
      ctx.fillStyle = ink(0.5);
      for (const [dx, dy, s] of [[-0.15, 0.5, 0.04], [0, 0.53, 0.03], [0.52, 0.55, 0.035]]) {
        ctx.beginPath();
        ctx.arc(cx + r * dx, cy + r * dy, r * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = ink(0.5);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.9, cy + r * 0.56);
      ctx.lineTo(cx + r * 0.9, cy + r * 0.56);
      ctx.stroke();
    }
  },
  {
    id: "tower",
    label: "Tower",
    cat: "land",
    box: [0.85, 1.1],
    draw(ctx, cx, cy, r, ink, paper) {
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      const body = new Path2D();
      body.moveTo(cx - r * 0.34, cy + r * 0.6);
      body.lineTo(cx - r * 0.26, cy - r * 0.42);
      body.lineTo(cx + r * 0.26, cy - r * 0.42);
      body.lineTo(cx + r * 0.34, cy + r * 0.6);
      body.closePath();
      ctx.fill(body);
      ctx.stroke(body);
      const cren = new Path2D();
      cren.moveTo(cx - r * 0.34, cy - r * 0.42);
      cren.lineTo(cx - r * 0.34, cy - r * 0.6);
      cren.lineTo(cx - r * 0.18, cy - r * 0.6);
      cren.lineTo(cx - r * 0.18, cy - r * 0.48);
      cren.lineTo(cx - r * 0.06, cy - r * 0.48);
      cren.lineTo(cx - r * 0.06, cy - r * 0.6);
      cren.lineTo(cx + r * 0.08, cy - r * 0.6);
      cren.lineTo(cx + r * 0.08, cy - r * 0.48);
      cren.lineTo(cx + r * 0.2, cy - r * 0.48);
      cren.lineTo(cx + r * 0.2, cy - r * 0.6);
      cren.lineTo(cx + r * 0.34, cy - r * 0.6);
      cren.lineTo(cx + r * 0.34, cy - r * 0.42);
      cren.closePath();
      ctx.fill(cren);
      ctx.stroke(cren);
      ctx.fillStyle = ink(0.75);
      ctx.beginPath();
      ctx.rect(cx - r * 0.035, cy - r * 0.18, r * 0.07, r * 0.2);
      ctx.fill();
      const door = new Path2D();
      door.moveTo(cx - r * 0.11, cy + r * 0.6);
      door.lineTo(cx - r * 0.11, cy + r * 0.34);
      door.arc(cx, cy + r * 0.34, r * 0.11, Math.PI, 0);
      door.lineTo(cx + r * 0.11, cy + r * 0.6);
      ctx.fill(door);
      ctx.strokeStyle = ink(0.3);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.2, cy + r * 0.1);
      ctx.lineTo(cx - r * 0.02, cy + r * 0.1);
      ctx.moveTo(cx + r * 0.04, cy - r * 0.02);
      ctx.lineTo(cx + r * 0.2, cy - r * 0.02);
      ctx.moveTo(cx - r * 0.16, cy + r * 0.32);
      ctx.lineTo(cx + r * 0.02, cy + r * 0.32);
      ctx.stroke();
      ctx.strokeStyle = ink(0.85);
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.27, cy - r * 0.6);
      ctx.lineTo(cx + r * 0.27, cy - r * 0.88);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.27, cy - r * 0.88);
      ctx.lineTo(cx + r * 0.55, cy - r * 0.8);
      ctx.lineTo(cx + r * 0.27, cy - r * 0.72);
      ctx.closePath();
      ctx.fillStyle = ink(0.7);
      ctx.fill();
    }
  }
  // ── Map decoration ───────────────────────────────────
  // (The ribbon banner was promoted to the text-capable 'ribbon banner' element and removed here)
];
STICKERS.push(
  {
    id: "wind",
    label: "Wind",
    cat: "sky",
    box: [1.15, 0.8],
    draw(ctx, cx, cy, r, ink) {
      ctx.strokeStyle = ink(0.75);
      ctx.lineCap = "round";
      const lw = ctx.lineWidth;
      const sx = cx - r * 0.7, sy = cy - r * 0.05;
      ctx.beginPath();
      let first = true;
      for (let t2 = 0; t2 <= 3.2 * Math.PI; t2 += 0.25) {
        const rr = r * 0.24 * (1 - t2 / (3.6 * Math.PI));
        const x = sx + Math.cos(t2 + Math.PI) * rr, y = sy + Math.sin(t2 + Math.PI) * rr;
        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      const gust = (y0, len, curlR, wide) => {
        ctx.lineWidth = wide;
        ctx.beginPath();
        ctx.moveTo(sx + r * 0.2, sy + y0);
        ctx.quadraticCurveTo(cx + r * 0.1, sy + y0 - r * 0.14, cx + r * len, sy + y0 - r * 0.06);
        ctx.arc(cx + r * (len - 0.02), sy + y0 + curlR - r * 0.06, curlR, -Math.PI * 0.5, Math.PI * 0.9);
        ctx.stroke();
      };
      gust(-r * 0.22, 0.82, r * 0.1, lw);
      gust(r * 0.02, 1.02, r * 0.12, lw * 1.15);
      gust(r * 0.26, 0.72, r * 0.09, lw * 0.85);
      ctx.lineWidth = lw;
    }
  },
  {
    id: "storm",
    label: "Storm cloud",
    cat: "sky",
    box: [1, 1],
    draw(ctx, cx, cy, r, ink, paper) {
      const p = new Path2D();
      const oy = cy - r * 0.35;
      p.moveTo(cx - r * 0.72, oy + r * 0.16);
      p.quadraticCurveTo(cx - r * 0.92, oy - r * 0.12, cx - r * 0.5, oy - r * 0.2);
      p.quadraticCurveTo(cx - r * 0.36, oy - r * 0.52, cx - r * 0.02, oy - r * 0.4);
      p.quadraticCurveTo(cx + r * 0.26, oy - r * 0.58, cx + r * 0.48, oy - r * 0.26);
      p.quadraticCurveTo(cx + r * 0.85, oy - r * 0.24, cx + r * 0.78, oy + r * 0.06);
      p.quadraticCurveTo(cx + r * 0.85, oy + r * 0.26, cx + r * 0.5, oy + r * 0.26);
      p.lineTo(cx - r * 0.55, oy + r * 0.26);
      p.quadraticCurveTo(cx - r * 0.8, oy + r * 0.3, cx - r * 0.72, oy + r * 0.16);
      p.closePath();
      ctx.fillStyle = paper;
      ctx.fill(p);
      ctx.strokeStyle = ink(0.85);
      ctx.stroke(p);
      const bolt = new Path2D();
      bolt.moveTo(cx - r * 0.05, cy - r * 0.02);
      bolt.lineTo(cx - r * 0.24, cy + r * 0.34);
      bolt.lineTo(cx - r * 0.08, cy + r * 0.3);
      bolt.lineTo(cx - r * 0.26, cy + r * 0.72);
      bolt.lineTo(cx + r * 0.14, cy + r * 0.22);
      bolt.lineTo(cx - r * 0.02, cy + r * 0.26);
      bolt.lineTo(cx + r * 0.12, cy - r * 0.02);
      bolt.closePath();
      ctx.fillStyle = ink(0.85);
      ctx.fill(bolt);
      ctx.strokeStyle = ink(0.45);
      ctx.beginPath();
      for (const [ox2, oy2] of [[0.32, 0.1], [0.48, 0.2], [0.38, 0.42]]) {
        ctx.moveTo(cx + r * ox2, cy + r * oy2);
        ctx.lineTo(cx + r * (ox2 - 0.08), cy + r * (oy2 + 0.2));
      }
      ctx.stroke();
    }
  },
  {
    id: "lighthouse",
    label: "Lighthouse",
    cat: "sea",
    box: [1.05, 1.1],
    draw(ctx, cx, cy, r, ink, paper) {
      ctx.fillStyle = ink(0.18);
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + dir * r * 0.18, cy - r * 0.72);
        ctx.lineTo(cx + dir * r * 1.02, cy - r * 0.95);
        ctx.lineTo(cx + dir * r * 1.02, cy - r * 0.55);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      const body = new Path2D();
      body.moveTo(cx - r * 0.3, cy + r * 0.5);
      body.lineTo(cx - r * 0.16, cy - r * 0.55);
      body.lineTo(cx + r * 0.16, cy - r * 0.55);
      body.lineTo(cx + r * 0.3, cy + r * 0.5);
      body.closePath();
      ctx.fill(body);
      ctx.stroke(body);
      ctx.fillStyle = ink(0.35);
      const stripe = (t0, t1) => {
        const lx = (t2) => cx - r * (0.3 - 0.14 * t2);
        const rx = (t2) => cx + r * (0.3 - 0.14 * t2);
        const yy = (t2) => cy + r * (0.5 - 1.05 * t2);
        const sp = new Path2D();
        sp.moveTo(lx(t0), yy(t0));
        sp.lineTo(rx(t0), yy(t0));
        sp.lineTo(rx(t1), yy(t1));
        sp.lineTo(lx(t1), yy(t1));
        sp.closePath();
        ctx.fill(sp);
      };
      stripe(0.18, 0.36);
      stripe(0.55, 0.73);
      ctx.fillStyle = paper;
      const lantern = new Path2D();
      lantern.rect(cx - r * 0.18, cy - r * 0.78, r * 0.36, r * 0.23);
      ctx.fill(lantern);
      ctx.stroke(lantern);
      ctx.fillStyle = ink(0.8);
      ctx.beginPath();
      ctx.rect(cx - r * 0.09, cy - r * 0.74, r * 0.18, r * 0.15);
      ctx.fill();
      const roof = new Path2D();
      roof.moveTo(cx - r * 0.22, cy - r * 0.78);
      roof.lineTo(cx, cy - r * 0.98);
      roof.lineTo(cx + r * 0.22, cy - r * 0.78);
      roof.closePath();
      ctx.fillStyle = paper;
      ctx.fill(roof);
      ctx.stroke(roof);
      ctx.fillStyle = paper;
      const rock = new Path2D();
      rock.moveTo(cx - r * 0.6, cy + r * 0.72);
      rock.quadraticCurveTo(cx - r * 0.45, cy + r * 0.42, cx - r * 0.1, cy + r * 0.52);
      rock.quadraticCurveTo(cx + r * 0.25, cy + r * 0.4, cx + r * 0.58, cy + r * 0.7);
      rock.closePath();
      ctx.fill(rock);
      ctx.stroke(rock);
      ctx.strokeStyle = ink(0.45);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.95, cy + r * 0.8);
      ctx.quadraticCurveTo(cx - r * 0.7, cy + r * 0.68, cx - r * 0.5, cy + r * 0.8);
      ctx.moveTo(cx + r * 0.45, cy + r * 0.82);
      ctx.quadraticCurveTo(cx + r * 0.7, cy + r * 0.7, cx + r * 0.95, cy + r * 0.82);
      ctx.stroke();
    }
  },
  {
    id: "kraken",
    label: "Kraken",
    cat: "sea",
    box: [1.1, 0.95],
    draw(ctx, cx, cy, r, ink, paper) {
      const wl = cy + r * 0.52;
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      const tentacle = (bx, h, dir, w0) => {
        const tipY = wl - r * h;
        const p = new Path2D();
        p.moveTo(bx - r * w0, wl);
        p.quadraticCurveTo(bx - r * (w0 + 0.06 * dir), wl - r * h * 0.55, bx - r * 0.02 * dir, tipY + r * 0.3);
        p.quadraticCurveTo(bx + r * 0.02 * dir, tipY + r * 0.02, bx + r * 0.24 * dir, tipY + r * 0.02);
        p.quadraticCurveTo(bx + r * 0.34 * dir, tipY + r * 0.04, bx + r * 0.33 * dir, tipY + r * 0.14);
        p.quadraticCurveTo(bx + r * 0.24 * dir, tipY + r * 0.12, bx + r * 0.18 * dir, tipY + r * 0.2);
        p.quadraticCurveTo(bx + r * 0.12 * dir, tipY + r * 0.4, bx + r * w0 * 0.7, wl - r * h * 0.4);
        p.quadraticCurveTo(bx + r * w0, wl - r * h * 0.2, bx + r * w0, wl);
        p.closePath();
        ctx.fill(p);
        ctx.stroke(p);
      };
      tentacle(cx - r * 0.62, 0.78, -1, 0.15);
      tentacle(cx + r * 0.02, 1.28, 1, 0.19);
      tentacle(cx + r * 0.66, 0.62, 1, 0.13);
      ctx.fillStyle = ink(0.55);
      for (const [sx2, sy2, s] of [
        [-0.5, 0.18, 0.035],
        [-0.53, 0, 0.03],
        [0.16, -0.1, 0.042],
        [0.14, -0.34, 0.036],
        [0.1, -0.56, 0.03],
        [0.76, 0.24, 0.03],
        [0.74, 0.1, 0.026]
      ]) {
        ctx.beginPath();
        ctx.arc(cx + r * sx2, cy + r * sy2, r * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = ink(0.45);
      ctx.beginPath();
      for (const [ox2, len] of [[-1, 0.42], [-0.32, 0.5], [0.4, 0.48]]) {
        ctx.moveTo(cx + r * ox2, wl + r * 0.06);
        ctx.quadraticCurveTo(cx + r * (ox2 + len / 2), wl + r * 0.16, cx + r * (ox2 + len), wl + r * 0.06);
      }
      ctx.stroke();
    }
  },
  {
    id: "castle",
    label: "Castle",
    cat: "land",
    box: [1.05, 1],
    draw(ctx, cx, cy, r, ink, paper) {
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      const wall = new Path2D();
      wall.moveTo(cx - r * 0.55, cy + r * 0.55);
      wall.lineTo(cx - r * 0.55, cy - r * 0.05);
      let wx = -0.55;
      const step = 0.22;
      let up = true;
      while (wx < 0.55 - 0.01) {
        const nx = Math.min(0.55, wx + step * 0.5);
        wall.lineTo(cx + r * nx, cy - r * (up ? 0.2 : 0.05));
        wall.lineTo(cx + r * nx, cy - r * (up ? 0.05 : 0.2));
        wx = nx;
        up = !up;
      }
      wall.lineTo(cx + r * 0.55, cy + r * 0.55);
      wall.closePath();
      ctx.fill(wall);
      ctx.stroke(wall);
      for (const dir of [-1, 1]) {
        const tx = cx + dir * r * 0.68;
        const tower = new Path2D();
        tower.rect(tx - r * 0.17, cy - r * 0.5, r * 0.34, r * 1.05);
        ctx.fill(tower);
        ctx.stroke(tower);
        const roof = new Path2D();
        roof.moveTo(tx - r * 0.22, cy - r * 0.5);
        roof.lineTo(tx, cy - r * 0.88);
        roof.lineTo(tx + r * 0.22, cy - r * 0.5);
        roof.closePath();
        ctx.fill(roof);
        ctx.stroke(roof);
        ctx.fillStyle = ink(0.7);
        ctx.beginPath();
        ctx.rect(tx - r * 0.03, cy - r * 0.28, r * 0.06, r * 0.16);
        ctx.fill();
        ctx.fillStyle = paper;
        ctx.beginPath();
        ctx.moveTo(tx, cy - r * 0.88);
        ctx.lineTo(tx, cy - r * 1.05);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tx, cy - r * 1.05);
        ctx.lineTo(tx + dir * r * 0.2, cy - r * 0.99);
        ctx.lineTo(tx, cy - r * 0.93);
        ctx.closePath();
        ctx.fillStyle = ink(0.7);
        ctx.fill();
        ctx.fillStyle = paper;
      }
      const gate = new Path2D();
      gate.moveTo(cx - r * 0.14, cy + r * 0.55);
      gate.lineTo(cx - r * 0.14, cy + r * 0.22);
      gate.arc(cx, cy + r * 0.22, r * 0.14, Math.PI, 0);
      gate.lineTo(cx + r * 0.14, cy + r * 0.55);
      ctx.fillStyle = ink(0.72);
      ctx.fill(gate);
      ctx.strokeStyle = ink(0.5);
      ctx.beginPath();
      ctx.moveTo(cx - r * 1, cy + r * 0.56);
      ctx.lineTo(cx + r * 1, cy + r * 0.56);
      ctx.stroke();
    }
  },
  {
    id: "bridge",
    label: "Bridge",
    cat: "land",
    box: [1.05, 0.7],
    draw(ctx, cx, cy, r, ink, paper) {
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      const body = new Path2D();
      body.moveTo(cx - r * 0.95, cy - r * 0.08);
      body.lineTo(cx + r * 0.95, cy - r * 0.08);
      body.lineTo(cx + r * 0.95, cy + r * 0.32);
      body.lineTo(cx + r * 0.6, cy + r * 0.32);
      body.arc(cx + r * 0.34, cy + r * 0.32, r * 0.26, 0, Math.PI, true);
      body.lineTo(cx - r * 0.08, cy + r * 0.32);
      body.arc(cx - r * 0.34, cy + r * 0.32, r * 0.26, 0, Math.PI, true);
      body.lineTo(cx - r * 0.95, cy + r * 0.32);
      body.closePath();
      ctx.fill(body);
      ctx.stroke(body);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.95, cy - r * 0.2);
      ctx.lineTo(cx + r * 0.95, cy - r * 0.2);
      ctx.stroke();
      ctx.strokeStyle = ink(0.4);
      ctx.beginPath();
      for (let k = -4; k <= 4; k++) {
        ctx.moveTo(cx + k * r * 0.21, cy - r * 0.2);
        ctx.lineTo(cx + k * r * 0.21, cy - r * 0.08);
      }
      ctx.moveTo(cx - r * 0.75, cy + r * 0.05);
      ctx.lineTo(cx - r * 0.55, cy + r * 0.05);
      ctx.moveTo(cx + r * 0.5, cy + r * 0.08);
      ctx.lineTo(cx + r * 0.7, cy + r * 0.08);
      ctx.stroke();
      ctx.strokeStyle = ink(0.45);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.5, cy + r * 0.42);
      ctx.quadraticCurveTo(cx - r * 0.34, cy + r * 0.34, cx - r * 0.18, cy + r * 0.42);
      ctx.moveTo(cx + r * 0.18, cy + r * 0.42);
      ctx.quadraticCurveTo(cx + r * 0.34, cy + r * 0.34, cx + r * 0.5, cy + r * 0.42);
      ctx.stroke();
    }
  },
  {
    id: "windmill",
    label: "Windmill",
    cat: "land",
    box: [1, 1.1],
    draw(ctx, cx, cy, r, ink, paper) {
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      const hubY = cy - r * 0.3;
      const body = new Path2D();
      body.moveTo(cx - r * 0.3, cy + r * 0.6);
      body.lineTo(cx - r * 0.16, hubY + r * 0.1);
      body.lineTo(cx + r * 0.16, hubY + r * 0.1);
      body.lineTo(cx + r * 0.3, cy + r * 0.6);
      body.closePath();
      ctx.fill(body);
      ctx.stroke(body);
      const roof = new Path2D();
      roof.moveTo(cx - r * 0.2, hubY + r * 0.1);
      roof.quadraticCurveTo(cx, hubY - r * 0.18, cx + r * 0.2, hubY + r * 0.1);
      roof.closePath();
      ctx.fill(roof);
      ctx.stroke(roof);
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + k * Math.PI / 2;
        const dx = Math.cos(a), dy = Math.sin(a);
        const px2 = -dy, py2 = dx;
        const L = r * 0.62, Wd = r * 0.12;
        const blade = new Path2D();
        blade.moveTo(cx + dx * r * 0.08, hubY + dy * r * 0.08);
        blade.lineTo(cx + dx * L + px2 * Wd, hubY + dy * L + py2 * Wd);
        blade.lineTo(cx + dx * L - px2 * Wd, hubY + dy * L - py2 * Wd);
        blade.closePath();
        ctx.fill(blade);
        ctx.stroke(blade);
        ctx.strokeStyle = ink(0.4);
        ctx.beginPath();
        for (const t2 of [0.35, 0.6, 0.85]) {
          ctx.moveTo(cx + dx * L * t2 + px2 * Wd * 0.9, hubY + dy * L * t2 + py2 * Wd * 0.9);
          ctx.lineTo(cx + dx * L * t2 - px2 * Wd * 0.9, hubY + dy * L * t2 - py2 * Wd * 0.9);
        }
        ctx.stroke();
        ctx.strokeStyle = ink(0.85);
      }
      ctx.fillStyle = ink(0.85);
      ctx.beginPath();
      ctx.arc(cx, hubY, r * 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.rect(cx - r * 0.07, cy + r * 0.38, r * 0.14, r * 0.22);
      ctx.fill();
      ctx.strokeStyle = ink(0.5);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.7, cy + r * 0.61);
      ctx.lineTo(cx + r * 0.7, cy + r * 0.61);
      ctx.stroke();
    }
  },
  {
    id: "inkblot",
    label: "Ink blot",
    cat: "map",
    box: [1, 0.9],
    draw(ctx, cx, cy, r, ink) {
      ctx.fillStyle = ink(0.82);
      const n = 12;
      const bp = [];
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2;
        const wob = Math.sin(a * 2 + 0.7) * 0.11 + Math.sin(a * 5 + 2.1) * 0.07;
        const rr = r * (0.42 + wob);
        bp.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.85]);
      }
      const mid = (i) => {
        const a = bp[i % n], b = bp[(i + 1) % n];
        return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      };
      const blob = new Path2D();
      blob.moveTo(mid(0)[0], mid(0)[1]);
      for (let k = 1; k <= n; k++) blob.quadraticCurveTo(bp[k % n][0], bp[k % n][1], mid(k)[0], mid(k)[1]);
      blob.closePath();
      ctx.fill(blob);
      for (const [a0, len, wd] of [[-0.5, 0.55, 0.09], [2.4, 0.45, 0.08], [1.1, 0.38, 0.06]]) {
        const bx = cx + Math.cos(a0) * r * 0.42, by = cy + Math.sin(a0) * r * 0.38;
        const tx = cx + Math.cos(a0) * r * (0.42 + len), ty = cy + Math.sin(a0) * r * (0.38 + len) * 0.85;
        const px2 = -Math.sin(a0) * r * wd, py2 = Math.cos(a0) * r * wd;
        ctx.beginPath();
        ctx.moveTo(bx - px2, by - py2);
        ctx.quadraticCurveTo((bx + tx) / 2, (by + ty) / 2, tx, ty);
        ctx.quadraticCurveTo((bx + tx) / 2, (by + ty) / 2, bx + px2, by + py2);
        ctx.closePath();
        ctx.fill();
      }
      for (const [dx, dy, s] of [
        [0.72, -0.5, 0.055],
        [0.88, -0.62, 0.035],
        [1, -0.7, 0.02],
        [-0.72, 0.5, 0.045],
        [-0.88, 0.58, 0.026],
        [0.28, 0.66, 0.03],
        [0.4, 0.78, 0.018]
      ]) {
        ctx.beginPath();
        ctx.arc(cx + r * dx, cy + r * dy, r * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  {
    id: "scroll",
    label: "Scroll",
    cat: "map",
    box: [1.2, 0.65],
    draw(ctx, cx, cy, r, ink, paper) {
      const lw = ctx.lineWidth;
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      const sheet = new Path2D();
      sheet.moveTo(cx - r * 0.78, cy - r * 0.3);
      sheet.quadraticCurveTo(cx, cy - r * 0.38, cx + r * 0.78, cy - r * 0.3);
      sheet.lineTo(cx + r * 0.78, cy + r * 0.28);
      sheet.quadraticCurveTo(cx, cy + r * 0.36, cx - r * 0.78, cy + r * 0.28);
      sheet.closePath();
      ctx.fill(sheet);
      ctx.stroke(sheet);
      ctx.strokeStyle = ink(0.3);
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      for (const dir of [-1, 1]) {
        for (const t2 of [0.56, 0.63, 0.7]) {
          ctx.moveTo(cx + dir * r * t2, cy - r * 0.26);
          ctx.quadraticCurveTo(cx + dir * r * (t2 + 0.02), cy, cx + dir * r * t2, cy + r * 0.24);
        }
      }
      ctx.stroke();
      ctx.lineWidth = lw;
      ctx.strokeStyle = ink(0.4);
      ctx.lineWidth = lw * 0.75;
      ctx.beginPath();
      for (const t2 of [-0.15, -0.02, 0.11]) {
        ctx.moveTo(cx - r * 0.42, cy + r * t2);
        ctx.lineTo(cx + r * 0.42, cy + r * (t2 + 0.015));
      }
      ctx.stroke();
      ctx.lineWidth = lw;
      for (const dir of [-1, 1]) {
        const ex = cx + dir * r * 0.88;
        const rw = r * 0.15, rh = r * 0.46;
        const roll = new Path2D();
        roll.moveTo(ex - rw, cy - rh + rw);
        roll.arc(ex, cy - rh + rw, rw, Math.PI, 0);
        roll.lineTo(ex + rw, cy + rh - rw);
        roll.arc(ex, cy + rh - rw, rw, 0, Math.PI);
        roll.closePath();
        ctx.fillStyle = paper;
        ctx.fill(roll);
        ctx.strokeStyle = ink(0.85);
        ctx.stroke(roll);
        ctx.strokeStyle = ink(0.3);
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.moveTo(ex - rw * 0.35, cy - rh + rw * 0.8);
        ctx.lineTo(ex - rw * 0.35, cy + rh - rw * 0.8);
        ctx.stroke();
        ctx.lineWidth = lw;
        ctx.strokeStyle = ink(0.6);
        ctx.beginPath();
        let first = true;
        for (let t2 = 0; t2 <= 2.2 * Math.PI; t2 += 0.3) {
          const rr = rw * 0.75 * (1 - t2 / (2.6 * Math.PI));
          const x = ex + Math.cos(t2 + 1.2) * rr, y = cy - rh + rw + Math.sin(t2 + 1.2) * rr * 0.5;
          if (first) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            first = false;
          } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  },
  {
    id: "flourish",
    label: "Corner flourish",
    cat: "map",
    box: [1.1, 1.1],
    draw(ctx, cx, cy, r, ink) {
      const lw = ctx.lineWidth;
      ctx.strokeStyle = ink(0.75);
      ctx.beginPath();
      ctx.moveTo(cx + r * 1.02, cy - r * 0.92);
      ctx.lineTo(cx - r * 0.74, cy - r * 0.92);
      ctx.quadraticCurveTo(cx - r * 0.92, cy - r * 0.92, cx - r * 0.92, cy - r * 0.74);
      ctx.lineTo(cx - r * 0.92, cy + r * 1.02);
      ctx.stroke();
      ctx.strokeStyle = ink(0.4);
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx + r * 1.02, cy - r * 0.78);
      ctx.lineTo(cx - r * 0.6, cy - r * 0.78);
      ctx.quadraticCurveTo(cx - r * 0.78, cy - r * 0.78, cx - r * 0.78, cy - r * 0.6);
      ctx.lineTo(cx - r * 0.78, cy + r * 1.02);
      ctx.stroke();
      ctx.lineWidth = lw;
      ctx.fillStyle = ink(0.85);
      const curl = spiralPts(cx - r * 0.34, cy - r * 0.34, r * 0.32, 1.9, Math.PI * 0.72, 1);
      ctx.fill(ribbonPath(curl, (t2) => r * 0.09 * (1 - t2 * 0.92)));
      const armH = sampleQuad(
        [cx - r * 0.18, cy - r * 0.5],
        [cx + r * 0.3, cy - r * 0.72],
        [cx + r * 0.78, cy - r * 0.58]
      );
      ctx.fill(ribbonPath(armH, (t2) => r * 0.07 * (1 - t2 * 0.9)));
      const armV = sampleQuad(
        [cx - r * 0.5, cy - r * 0.18],
        [cx - r * 0.72, cy + r * 0.3],
        [cx - r * 0.58, cy + r * 0.78]
      );
      ctx.fill(ribbonPath(armV, (t2) => r * 0.07 * (1 - t2 * 0.9)));
      const tipH = spiralPts(cx + r * 0.84, cy - r * 0.64, r * 0.12, 1.4, Math.PI * 1.1, -1);
      ctx.fill(ribbonPath(tipH, (t2) => r * 0.045 * (1 - t2 * 0.9)));
      const tipV = spiralPts(cx - r * 0.64, cy + r * 0.84, r * 0.12, 1.4, Math.PI * 0.4, 1);
      ctx.fill(ribbonPath(tipV, (t2) => r * 0.045 * (1 - t2 * 0.9)));
      ctx.fillStyle = ink(0.6);
      for (const [ang, lx, ly] of [
        [-0.35, 0.22, -0.72],
        [0.25, 0.5, -0.52],
        [1.92, -0.72, 0.22],
        [1.32, -0.52, 0.5]
      ]) {
        ctx.save();
        ctx.translate(cx + r * lx, cy + r * ly);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(r * 0.13, -r * 0.09, r * 0.26, 0);
        ctx.quadraticCurveTo(r * 0.13, r * 0.06, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = ink(0.7);
      for (const [dx, dy] of [[0.95, -0.68], [-0.68, 0.95]]) {
        ctx.beginPath();
        ctx.arc(cx + r * dx, cy + r * dy, r * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
);
var BY_ID = new Map(STICKERS.map((s) => [s.id, s]));
function getSticker(id) {
  return BY_ID.get(id);
}

// src/decor.ts
function ornTheme(style) {
  switch (style) {
    case "color":
      return { card: "rgba(252,250,245,0.95)", fold: "rgba(214,222,230,0.95)", ink: "rgba(38,50,64,0.9)", title: "rgba(252,250,245,0.9)", titleInk: "rgba(30,42,56,0.95)" };
    case "ink":
      return { card: "rgba(250,249,244,0.96)", fold: "rgba(224,221,210,0.95)", ink: "rgba(28,26,22,0.92)", title: "rgba(250,249,244,0.92)", titleInk: "rgba(20,18,14,0.95)" };
    default:
      return { card: "rgba(246,235,206,0.95)", fold: "rgba(220,204,164,0.95)", ink: "rgba(86,62,36,0.9)", title: "rgba(244,231,200,0.86)", titleInk: "rgba(74,52,28,0.95)" };
  }
}
function drawMapEffects(ctx, W, H, s, inkRGB, decor, style) {
  const ink = (a) => `rgba(${inkRGB[0]},${inkRGB[1]},${inkRGB[2]},${a})`;
  const m = Math.min(W, H);
  if (decor.vignette && style !== "color") {
    const g = ctx.createRadialGradient(W / 2, H / 2, m * 0.42, W / 2, H / 2, m * 0.85);
    g.addColorStop(0, "rgba(60,45,25,0)");
    g.addColorStop(1, "rgba(60,45,25,0.20)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (decor.frame) {
    const inset = m * 0.018;
    ctx.strokeStyle = ink(0.8);
    ctx.lineWidth = Math.max(1.4, 2.2 / s);
    ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
    ctx.lineWidth = Math.max(0.5, 0.8 / s);
    const in2 = inset * 1.9;
    ctx.strokeRect(in2, in2, W - in2 * 2, H - in2 * 2);
  }
}
function drawOrnaments(ctx, ornaments, W, H, s, inkRGB, style = "parchment", images) {
  const boxes = /* @__PURE__ */ new Map();
  const ink = (a) => `rgba(${inkRGB[0]},${inkRGB[1]},${inkRGB[2]},${a})`;
  const th = ornTheme(style);
  const m = Math.min(W, H);
  for (const orn of ornaments) {
    const cx = orn.x * W, cy = orn.y * H;
    const size = Math.max(4, orn.sizeF * m);
    switch (orn.type) {
      case "sticker": {
        const r = size;
        if (orn.sticker === "custom" && orn.imagePath) {
          const img = images?.get(orn.imagePath);
          if (img && img.naturalWidth > 0) {
            const ar = img.naturalWidth / img.naturalHeight;
            const dh = r * 2, dw = dh * ar;
            ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
            boxes.set(orn.id, { x: cx - dw / 2, y: cy - dh / 2, w: dw, h: dh });
          } else {
            ctx.save();
            ctx.strokeStyle = ink(0.4);
            ctx.setLineDash([r * 0.16, r * 0.12]);
            ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
            ctx.restore();
            boxes.set(orn.id, { x: cx - r, y: cy - r, w: r * 2, h: r * 2 });
          }
        } else {
          const def = orn.sticker ? getSticker(orn.sticker) : void 0;
          if (def) {
            ctx.save();
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            ctx.lineWidth = Math.max(size * 0.032, 0.55 / s);
            def.draw(ctx, cx, cy, size, ink, style === "color" ? "rgba(250,250,246,0.92)" : "rgba(242,232,206,0.9)");
            ctx.restore();
            boxes.set(orn.id, {
              x: cx - size * def.box[0] * 1.08,
              y: cy - size * def.box[1] * 1.08,
              w: size * def.box[0] * 2.16,
              h: size * def.box[1] * 2.16
            });
          } else {
            boxes.set(orn.id, { x: cx - r, y: cy - r, w: r * 2, h: r * 2 });
          }
        }
        break;
      }
      case "compass": {
        const r = size;
        drawCompass(ctx, cx, cy, r, s, ink);
        boxes.set(orn.id, { x: cx - r * 1.3, y: cy - r * 1.55, w: r * 2.6, h: r * 2.85 });
        break;
      }
      case "title": {
        const fs = size;
        const text = orn.text || "Title";
        ctx.font = `600 ${fs}px ${FONT_SERIF}`;
        const tw = ctx.measureText(text).width;
        const padX = fs * 1, padY = fs * 0.46;
        const rx = cx - tw / 2 - padX, ry = cy - fs / 2 - padY;
        const rw = tw + padX * 2, rh = fs + padY * 2;
        ctx.save();
        ctx.shadowColor = "rgba(30,22,10,0.25)";
        ctx.shadowBlur = fs * 0.45;
        ctx.shadowOffsetY = fs * 0.1;
        ctx.fillStyle = th.title;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = ink(0.85);
        ctx.lineWidth = Math.max(0.8, 1.4 / s);
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.lineWidth = Math.max(0.4, 0.6 / s);
        const inX = rx + fs * 0.22, inY = ry + fs * 0.22;
        const inW = rw - fs * 0.44, inH = rh - fs * 0.44;
        ctx.strokeRect(inX, inY, inW, inH);
        const dm = fs * 0.13;
        ctx.fillStyle = ink(0.8);
        for (const [dx2, dy2] of [[inX, inY], [inX + inW, inY], [inX, inY + inH], [inX + inW, inY + inH]]) {
          ctx.beginPath();
          ctx.moveTo(dx2, dy2 - dm);
          ctx.lineTo(dx2 + dm, dy2);
          ctx.lineTo(dx2, dy2 + dm);
          ctx.lineTo(dx2 - dm, dy2);
          ctx.closePath();
          ctx.fill();
        }
        const fl = padX * 0.42, fy = cy + fs * 0.05;
        ctx.strokeStyle = ink(0.6);
        ctx.lineWidth = Math.max(0.5, 0.8 / s);
        ctx.beginPath();
        ctx.moveTo(cx - tw / 2 - fl - fs * 0.18, fy);
        ctx.lineTo(cx - tw / 2 - fs * 0.18, fy);
        ctx.moveTo(cx + tw / 2 + fs * 0.18, fy);
        ctx.lineTo(cx + tw / 2 + fl + fs * 0.18, fy);
        ctx.stroke();
        ctx.fillStyle = ink(0.7);
        for (const px2 of [cx - tw / 2 - fl - fs * 0.26, cx + tw / 2 + fl + fs * 0.26]) {
          ctx.beginPath();
          ctx.arc(px2, fy, fs * 0.05, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = th.titleInk;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, cx, cy + fs * 0.05);
        ctx.restore();
        boxes.set(orn.id, { x: rx, y: ry, w: rw, h: rh });
        break;
      }
      case "banner": {
        const fs = size;
        const text = orn.text || "Banner";
        ctx.save();
        ctx.font = `600 ${fs}px ${FONT_SERIF}`;
        const tw = ctx.measureText(text).width;
        const hw = tw / 2 + fs * 0.9;
        const hh = fs * 0.75;
        ctx.lineJoin = "round";
        ctx.strokeStyle = ink(0.85);
        ctx.lineWidth = Math.max(fs * 0.05, 0.5 / s);
        ctx.fillStyle = ink(0.32);
        for (const dir of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + dir * hw, cy - hh * 0.62);
          ctx.lineTo(cx + dir * (hw + fs * 0.32), cy + hh * 0.08);
          ctx.lineTo(cx + dir * hw, cy + hh * 0.95);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = th.title;
        for (const dir of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + dir * hw, cy - hh * 0.62);
          ctx.lineTo(cx + dir * (hw + fs * 1.15), cy - hh * 0.38);
          ctx.lineTo(cx + dir * (hw + fs * 0.72), cy + hh * 0.18);
          ctx.lineTo(cx + dir * (hw + fs * 1.1), cy + hh * 0.82);
          ctx.lineTo(cx + dir * hw, cy + hh * 0.95);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(cx - hw, cy - hh);
        ctx.quadraticCurveTo(cx, cy - hh - fs * 0.22, cx + hw, cy - hh);
        ctx.lineTo(cx + hw, cy + hh);
        ctx.quadraticCurveTo(cx, cy + hh - fs * 0.22, cx - hw, cy + hh);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = th.titleInk;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, cx, cy - fs * 0.06);
        ctx.restore();
        boxes.set(orn.id, {
          x: cx - hw - fs * 1.2,
          y: cy - hh - fs * 0.25,
          w: (hw + fs * 1.2) * 2,
          h: hh * 2 + fs * 0.25
        });
        break;
      }
      case "label": {
        const fs = size;
        const text = orn.text || "Label";
        ctx.save();
        ctx.font = `600 ${fs}px ${FONT_SERIF}`;
        try {
          ctx.letterSpacing = `${fs * 0.22}px`;
        } catch {
        }
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const tw = ctx.measureText(text).width;
        ctx.strokeStyle = style === "color" ? "rgba(250,252,255,0.72)" : "rgba(244,236,214,0.72)";
        ctx.lineWidth = Math.max(2, fs * 0.16);
        ctx.lineJoin = "round";
        ctx.strokeText(text, cx, cy);
        ctx.fillStyle = ink(0.82);
        ctx.fillText(text, cx, cy);
        ctx.restore();
        boxes.set(orn.id, { x: cx - tw / 2 - fs * 0.3, y: cy - fs * 0.7, w: tw + fs * 0.6, h: fs * 1.4 });
        break;
      }
      case "note": {
        const fs = size;
        const lines = (orn.text || "Note").split("\n");
        ctx.font = `600 ${fs}px ${FONT_HAND}`;
        let maxW = 0;
        for (const ln of lines) maxW = Math.max(maxW, ctx.measureText(ln).width);
        const padX = fs * 0.7, padY = fs * 0.55;
        const lh = fs * 1.35;
        const rw = maxW + padX * 2, rh = lines.length * lh + padY * 2 - (lh - fs);
        const rx = cx - rw / 2, ry = cy - rh / 2;
        const fold = Math.min(fs * 0.9, rw * 0.3);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + rw - fold, ry);
        ctx.lineTo(rx + rw, ry + fold);
        ctx.lineTo(rx + rw, ry + rh);
        ctx.lineTo(rx, ry + rh);
        ctx.closePath();
        ctx.shadowColor = "rgba(30,22,10,0.28)";
        ctx.shadowBlur = fs * 0.5;
        ctx.shadowOffsetX = fs * 0.08;
        ctx.shadowOffsetY = fs * 0.14;
        ctx.fillStyle = th.card;
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = ink(0.7);
        ctx.lineWidth = Math.max(0.6, 1 / s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rx + rw - fold, ry);
        ctx.lineTo(rx + rw - fold, ry + fold);
        ctx.lineTo(rx + rw, ry + fold);
        ctx.closePath();
        ctx.fillStyle = th.fold;
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = th.ink;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        lines.forEach((ln, li) => {
          ctx.fillText(ln, rx + padX, ry + padY + li * lh);
        });
        ctx.restore();
        boxes.set(orn.id, { x: rx, y: ry, w: rw, h: rh });
        break;
      }
      case "ship": {
        const r = size;
        const lw = Math.max(r * 0.03, 0.55 / s);
        const sail = style === "color" ? "#fbf8f0" : "rgba(253,251,244,0.92)";
        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = ink(0.88);
        ctx.lineWidth = lw;
        const hull = new Path2D();
        hull.moveTo(cx - r * 0.95, cy + r * 0.12);
        hull.quadraticCurveTo(cx - r * 1.02, cy + r * 0.42, cx - r * 0.78, cy + r * 0.58);
        hull.quadraticCurveTo(cx - r * 0.1, cy + r * 0.82, cx + r * 0.72, cy + r * 0.56);
        hull.lineTo(cx + r * 1.02, cy + r * 0.16);
        hull.lineTo(cx + r * 0.78, cy + r * 0.3);
        hull.quadraticCurveTo(cx, cy + r * 0.46, cx - r * 0.68, cy + r * 0.3);
        hull.closePath();
        ctx.fillStyle = style === "color" ? th.card : "rgba(240,230,204,0.9)";
        ctx.fill(hull);
        ctx.stroke(hull);
        ctx.strokeStyle = ink(0.4);
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.82, cy + r * 0.42);
        ctx.quadraticCurveTo(cx, cy + r * 0.62, cx + r * 0.8, cy + r * 0.42);
        ctx.moveTo(cx - r * 0.72, cy + r * 0.52);
        ctx.quadraticCurveTo(cx, cy + r * 0.7, cx + r * 0.66, cy + r * 0.5);
        ctx.stroke();
        ctx.strokeStyle = ink(0.85);
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.88, cy + r * 0.22);
        ctx.lineTo(cx + r * 1.32, cy - r * 0.12);
        ctx.moveTo(cx + r * 0.02, cy + r * 0.4);
        ctx.lineTo(cx + r * 0.02, cy - r * 1.02);
        ctx.moveTo(cx - r * 0.6, cy + r * 0.28);
        ctx.lineTo(cx - r * 0.6, cy - r * 0.62);
        ctx.stroke();
        const mainSail = new Path2D();
        mainSail.moveTo(cx - r * 0.34, cy - r * 0.92);
        mainSail.quadraticCurveTo(cx - r * 0.62, cy - r * 0.5, cx - r * 0.42, cy - r * 0.1);
        mainSail.lineTo(cx + r * 0.44, cy - r * 0.1);
        mainSail.quadraticCurveTo(cx + r * 0.5, cy - r * 0.52, cx + r * 0.38, cy - r * 0.92);
        mainSail.closePath();
        ctx.fillStyle = sail;
        ctx.fill(mainSail);
        ctx.stroke(mainSail);
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.34, cy - r * 0.92);
        ctx.lineTo(cx + r * 0.38, cy - r * 0.92);
        ctx.moveTo(cx - r * 0.42, cy - r * 0.1);
        ctx.lineTo(cx + r * 0.44, cy - r * 0.1);
        ctx.stroke();
        const jib = new Path2D();
        jib.moveTo(cx + r * 1.22, cy - r * 0.06);
        jib.lineTo(cx + r * 0.5, cy - r * 0.72);
        jib.quadraticCurveTo(cx + r * 0.62, cy - r * 0.3, cx + r * 0.94, cy + r * 0.02);
        jib.closePath();
        ctx.fill(jib);
        ctx.stroke(jib);
        const mizzen = new Path2D();
        mizzen.moveTo(cx - r * 0.6, cy - r * 0.58);
        mizzen.lineTo(cx - r * 0.6, cy + r * 0.05);
        mizzen.quadraticCurveTo(cx - r * 0.92, cy - r * 0.2, cx - r * 0.6, cy - r * 0.58);
        mizzen.closePath();
        ctx.fill(mizzen);
        ctx.stroke(mizzen);
        ctx.strokeStyle = ink(0.35);
        ctx.lineWidth = lw * 0.55;
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.02, cy - r * 1);
        ctx.lineTo(cx + r * 1.28, cy - r * 0.1);
        ctx.moveTo(cx + r * 0.02, cy - r * 1);
        ctx.lineTo(cx - r * 0.88, cy + r * 0.14);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.02, cy - r * 1.02);
        ctx.lineTo(cx - r * 0.3, cy - r * 0.94);
        ctx.lineTo(cx + r * 0.02, cy - r * 0.88);
        ctx.closePath();
        ctx.fillStyle = style === "color" ? "#a83c3c" : ink(0.7);
        ctx.fill();
        ctx.strokeStyle = ink(0.4);
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx - r * 1.05, cy + r * 0.68);
        ctx.quadraticCurveTo(cx - r * 0.85, cy + r * 0.58, cx - r * 0.66, cy + r * 0.7);
        ctx.moveTo(cx + r * 0.55, cy + r * 0.72);
        ctx.quadraticCurveTo(cx + r * 0.78, cy + r * 0.6, cx + r * 1, cy + r * 0.72);
        ctx.stroke();
        ctx.restore();
        boxes.set(orn.id, { x: cx - r * 1.15, y: cy - r * 1.15, w: r * 2.55, h: r * 2.05 });
        break;
      }
      case "monster": {
        const r = size;
        const lw = Math.max(r * 0.03, 0.55 / s);
        const wl = cy + r * 0.32;
        const body = style === "color" ? "rgba(210,222,214,0.85)" : "rgba(228,216,186,0.8)";
        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = ink(0.88);
        ctx.lineWidth = lw;
        const neck = new Path2D();
        neck.moveTo(cx - r * 0.42, wl);
        neck.quadraticCurveTo(cx - r * 0.52, cy - r * 0.3, cx - r * 0.82, cy - r * 0.52);
        neck.quadraticCurveTo(cx - r * 0.98, cy - r * 0.62, cx - r * 1.18, cy - r * 0.56);
        neck.lineTo(cx - r * 1.02, cy - r * 0.46);
        neck.lineTo(cx - r * 1.14, cy - r * 0.34);
        neck.quadraticCurveTo(cx - r * 0.92, cy - r * 0.3, cx - r * 0.78, cy - r * 0.36);
        neck.quadraticCurveTo(cx - r * 0.6, cy - r * 0.12, cx - r * 0.72, wl);
        neck.closePath();
        ctx.fillStyle = body;
        ctx.fill(neck);
        ctx.stroke(neck);
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.86, cy - r * 0.56);
        ctx.lineTo(cx - r * 0.8, cy - r * 0.74);
        ctx.stroke();
        ctx.fillStyle = ink(0.95);
        ctx.beginPath();
        ctx.arc(cx - r * 0.9, cy - r * 0.5, Math.max(1.2, r * 0.045), 0, Math.PI * 2);
        ctx.fill();
        const humps = [[cx + r * 0.02, 0.34], [cx + r * 0.62, 0.22]];
        for (const [hx, hr0] of humps) {
          const hr = r * hr0;
          const hump = new Path2D();
          hump.arc(hx, wl, hr, Math.PI, 0);
          hump.closePath();
          ctx.fillStyle = body;
          ctx.fill(hump);
          ctx.stroke(hump);
          ctx.fillStyle = ink(0.55);
          const nSp = hr0 > 0.3 ? 4 : 3;
          for (let k2 = 0; k2 < nSp; k2++) {
            const a = Math.PI + (k2 + 0.7) / (nSp + 0.4) * Math.PI;
            const bx = hx + Math.cos(a) * hr, by = wl + Math.sin(a) * hr;
            const tx = hx + Math.cos(a) * (hr + r * 0.13), ty = wl + Math.sin(a) * (hr + r * 0.13);
            const px2 = -Math.sin(a) * r * 0.05, py2 = Math.cos(a) * r * 0.05;
            ctx.beginPath();
            ctx.moveTo(bx - px2, by - py2);
            ctx.lineTo(tx, ty);
            ctx.lineTo(bx + px2, by + py2);
            ctx.closePath();
            ctx.fill();
          }
        }
        const tail = new Path2D();
        tail.moveTo(cx + r * 1, wl);
        tail.quadraticCurveTo(cx + r * 1.12, cy - r * 0.02, cx + r * 1.05, cy - r * 0.22);
        tail.quadraticCurveTo(cx + r * 1.28, cy - r * 0.18, cx + r * 1.34, cy - r * 0.34);
        tail.quadraticCurveTo(cx + r * 1.18, cy - r * 0.44, cx + r * 1.02, cy - r * 0.38);
        tail.quadraticCurveTo(cx + r * 0.92, cy - r * 0.1, cx + r * 0.84, wl);
        tail.closePath();
        ctx.fillStyle = body;
        ctx.fill(tail);
        ctx.stroke(tail);
        ctx.strokeStyle = ink(0.38);
        ctx.lineWidth = lw * 0.65;
        ctx.beginPath();
        for (const [ox2, len] of [[-0.72, 0.5], [-0.12, 0.42], [0.5, 0.44], [0.86, 0.4]]) {
          ctx.moveTo(cx + r * ox2, wl + r * 0.06);
          ctx.quadraticCurveTo(cx + r * (ox2 + len / 2), wl + r * 0.16, cx + r * (ox2 + len), wl + r * 0.06);
        }
        ctx.stroke();
        ctx.restore();
        boxes.set(orn.id, { x: cx - r * 1.3, y: cy - r * 0.85, w: r * 2.75, h: r * 1.35 });
        break;
      }
    }
  }
  return boxes;
}
function drawCoordinateGrid(ctx, W, H, s, inkRGB) {
  const m = Math.min(W, H);
  const cell = m / 8;
  const cols = Math.max(2, Math.round(W / cell));
  const rows = Math.max(2, Math.round(H / cell));
  const cw = W / cols, ch = H / rows;
  const ink = (a) => `rgba(${inkRGB[0]},${inkRGB[1]},${inkRGB[2]},${a})`;
  const margin = m * 0.032;
  ctx.save();
  ctx.strokeStyle = ink(0.22);
  ctx.lineWidth = Math.max(0.3, 0.5 / s);
  ctx.beginPath();
  for (let c = 1; c < cols; c++) {
    ctx.moveTo(c * cw, 0);
    ctx.lineTo(c * cw, H);
  }
  for (let r = 1; r < rows; r++) {
    ctx.moveTo(0, r * ch);
    ctx.lineTo(W, r * ch);
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(242,234,214,0.72)";
  ctx.fillRect(0, 0, W, margin);
  ctx.fillRect(0, H - margin, W, margin);
  ctx.fillRect(0, 0, margin, H);
  ctx.fillRect(W - margin, 0, margin, H);
  const fs = margin * 0.62;
  ctx.font = `600 ${fs}px ${FONT_SERIF}`;
  ctx.fillStyle = ink(0.85);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let c = 0; c < cols; c++) {
    const label = String.fromCharCode(65 + c % 26);
    const x = c * cw + cw / 2;
    ctx.fillText(label, x, margin / 2);
    ctx.fillText(label, x, H - margin / 2);
  }
  for (let r = 0; r < rows; r++) {
    const label = String(r + 1);
    const y = r * ch + ch / 2;
    ctx.fillText(label, margin / 2, y);
    ctx.fillText(label, W - margin / 2, y);
  }
  ctx.restore();
}
function drawCompass(ctx, cx, cy, r, s, ink) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(242,234,214,0.55)";
  ctx.fill();
  ctx.strokeStyle = ink(0.75);
  ctx.lineWidth = Math.max(0.6, 1 / s);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(0.4, 0.6 / s);
  ctx.stroke();
  ctx.strokeStyle = ink(0.5);
  ctx.lineWidth = Math.max(0.35, 0.5 / s);
  ctx.beginPath();
  for (let k = 0; k < 32; k++) {
    const ang = k * Math.PI / 16;
    const r0 = k % 4 === 0 ? r * 1.06 : r * 1.11;
    ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
    ctx.lineTo(cx + Math.cos(ang) * r * 1.18, cy + Math.sin(ang) * r * 1.18);
  }
  ctx.stroke();
  for (let k = 0; k < 8; k++) {
    const long = k % 2 === 0;
    const ang = k * Math.PI / 4 - Math.PI / 2;
    const len = long ? r : r * 0.5;
    const wj = r * (long ? 0.14 : 0.09);
    const px = Math.cos(ang), py = Math.sin(ang);
    const qx = -py, qy = px;
    ctx.beginPath();
    ctx.moveTo(cx + px * len, cy + py * len);
    ctx.lineTo(cx + qx * wj, cy + qy * wj);
    ctx.lineTo(cx - px * len * 0.22, cy - py * len * 0.22);
    ctx.lineTo(cx - qx * wj, cy - qy * wj);
    ctx.closePath();
    ctx.fillStyle = long ? ink(0.85) : ink(0.4);
    ctx.fill();
  }
  ctx.fillStyle = ink(0.9);
  ctx.font = `700 ${r * 0.42}px ${FONT_SERIF}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("N", cx, cy - r * 1.06);
  ctx.restore();
}

// src/icons.ts
var MARKER_ICONS = [
  { id: "pin", label: "Pin", d: "M12 21s-6.5-7.3-6.5-11.7a6.5 6.5 0 0 1 13 0C18.5 13.7 12 21 12 21zM12 6.8a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z" },
  { id: "castle", label: "Castle", d: "M6 21V8.5L5 8V4h2.5v2h2V4h5v2h2V4H19v4l-1 .5V21M6 21h12M10 21v-4.5a2 2 0 0 1 4 0V21M9 11h.01M15 11h.01" },
  { id: "town", label: "Town", d: "M3 21v-7l4.5-3.5L12 14v7M12 21v-9l4.5-3.5L21 12v9M3 21h18M6.5 17h.01M16.5 15.5h.01" },
  { id: "anchor", label: "Harbor", d: "M12 8.5V21M12 8.5a2.7 2.7 0 1 0-.01 0zM4.5 13.5C4.5 18 8 21 12 21s7.5-3 7.5-7.5M4.5 13.5L2.5 15m2-1.5L6.5 15M19.5 13.5L17.5 15m2-1.5l2 1.5" },
  { id: "mountain", label: "Mountain", d: "M2.5 20L9.5 6l4 7.5L16 9.5l5.5 10.5zM7.5 11.5l2-1.5 1.5 2" },
  { id: "tree", label: "Forest", d: "M12 21v-4M12 3l4.5 6h-2.5l3.5 5h-3l3 4H6.5l3-4h-3l3.5-5H7.5z" },
  { id: "tower", label: "Tower", d: "M8.5 21V8h7v13M8.5 8L7 3.5h2l1 2h4l1-2h2L15.5 8M10.5 21v-4h3v4M11 11h2" },
  { id: "temple", label: "Temple", d: "M4 8.5L12 3l8 5.5M5 8.5h14M6.5 11v6M10.2 11v6M13.8 11v6M17.5 11v6M4.5 17.5h15M3.5 21h17" },
  { id: "swords", label: "Battlefield", d: "M5 3.5l12.5 12.5M15 18.5l2.5-2.5M19 20l-2.5-2.5M19 3.5L6.5 16M9 18.5L6.5 16M5 20l2.5-2.5" },
  { id: "gem", label: "Treasure", d: "M7.5 4h9L21 9.5 12 20.5 3 9.5zM3 9.5h18M12 20.5L8.5 9.5 12 4l3.5 5.5z" },
  { id: "tent", label: "Camp", d: "M12 4.5L3 20h6.5l2.5-4.5L14.5 20H21zM10 8.5l2-2 2 2" },
  { id: "star", label: "Landmark", d: "M12 3.5l2.5 5.4 5.9.7-4.4 4 1.2 5.8-5.2-2.9-5.2 2.9 1.2-5.8-4.4-4 5.9-.7z" },
  { id: "x", label: "X mark", d: "M6 6l12 12M18 6L6 18M4.5 4.5l1 1M18.5 4.5l1 1M4.5 19.5l1-1M18.5 19.5l1-1" },
  { id: "skull", label: "Danger", d: "M12 3a7 7 0 0 0-4 12.7V18l1.5 1.5h5L16 18v-2.3A7 7 0 0 0 12 3zM9 11h.01M15 11h.01M11 14.5l1-1.5 1 1.5M9.5 20.5v-1M14.5 20.5v-1" },
  { id: "flag", label: "Flag", d: "M6 21V4M6 5h11l-2 3 2 3H6" },
  { id: "chest", label: "Treasure chest", d: "M4 10h16v9H4zM4 10l2-4h12l2 4M4 13h16M11 10v3h2v-3M11 13a1 1 0 0 0 2 0" },
  { id: "cross", label: "Sanctuary", d: "M10 21V9H4V7h6V3h4v4h6v2h-6v12z" }
];
var LEGACY = {
  "\u{1F4CD}": "pin",
  "\u{1F3F0}": "castle",
  "\u{1F3D8}\uFE0F": "town",
  "\u2693": "anchor",
  "\u26F0\uFE0F": "mountain",
  "\u{1F332}": "tree",
  "\u{1F5FC}": "tower",
  "\u{1F54D}": "temple",
  "\u2694\uFE0F": "swords",
  "\u{1F48E}": "gem",
  "\u{1F409}": "star",
  "\u{1F3DB}\uFE0F": "temple"
};
function normalizeIcon(icon) {
  if (MARKER_ICONS.some((i) => i.id === icon)) return icon;
  return LEGACY[icon] ?? "pin";
}
var path2dCache = /* @__PURE__ */ new Map();
function getPath(id) {
  let p = path2dCache.get(id);
  if (!p) {
    const icon = MARKER_ICONS.find((i) => i.id === id) ?? MARKER_ICONS[0];
    p = new Path2D(icon.d);
    path2dCache.set(id, p);
  }
  return p;
}
var badgeRingCache = /* @__PURE__ */ new Map();
function badgeRing(id) {
  let p = badgeRingCache.get(id);
  if (!p) {
    let seed = 7;
    for (let i = 0; i < id.length; i++) seed = seed * 31 + id.charCodeAt(i) | 0;
    const pts = [];
    const N = 22;
    for (let k = 0; k < N; k++) {
      const a = k / N * Math.PI * 2;
      pts.push([Math.cos(a), Math.sin(a)]);
    }
    p = new Path2D();
    sketchToPath(p, roughRing(pts, 0.045, seed), true);
    badgeRingCache.set(id, p);
  }
  return p;
}
function drawMarkerIcon(ctx, iconId, cx, cy, size, accent, style = "parchment") {
  const id = normalizeIcon(iconId);
  const r = size / 2;
  const bcy = cy - size * 0.78;
  ctx.save();
  const isInk = style === "ink";
  const inkC = isInk ? [60, 55, 45] : [58, 44, 28];
  const acc = hexToRGB(accent || "") ?? inkC;
  const mr = Math.round(acc[0] * 0.6 + inkC[0] * 0.4);
  const mg = Math.round(acc[1] * 0.6 + inkC[1] * 0.4);
  const mb = Math.round(acc[2] * 0.6 + inkC[2] * 0.4);
  const inkStr = `rgb(${inkC[0]},${inkC[1]},${inkC[2]})`;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.quadraticCurveTo(cx - r * 0.12, bcy + r * 0.9, cx - r * 0.2, bcy + r * 0.72);
  ctx.lineTo(cx + r * 0.2, bcy + r * 0.72);
  ctx.quadraticCurveTo(cx + r * 0.12, bcy + r * 0.9, cx, cy);
  ctx.closePath();
  ctx.fillStyle = `rgb(${mr},${mg},${mb})`;
  ctx.fill();
  ctx.lineWidth = Math.max(0.6, size * 0.03);
  ctx.strokeStyle = inkStr;
  ctx.stroke();
  const ring = badgeRing(id);
  ctx.translate(cx, bcy);
  ctx.scale(r, r);
  ctx.fillStyle = isInk ? "#f8f6f0" : "#f2ead6";
  ctx.fill(ring);
  ctx.lineWidth = Math.max(1.4, size * 0.085) / r;
  ctx.strokeStyle = inkStr;
  ctx.stroke(ring);
  ctx.scale(0.86, 0.86);
  ctx.lineWidth = Math.max(1, size * 0.05) / (r * 0.86);
  ctx.strokeStyle = `rgba(${mr},${mg},${mb},0.9)`;
  ctx.stroke(ring);
  ctx.restore();
  ctx.save();
  const gs = size * 0.68 / 24;
  ctx.translate(cx - 12 * gs, bcy - 12 * gs);
  ctx.scale(gs, gs);
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = inkStr;
  ctx.stroke(getPath(id));
  ctx.restore();
}
function iconSvg(id) {
  const icon = MARKER_ICONS.find((i) => i.id === id) ?? MARKER_ICONS[0];
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="${icon.d}"/></svg>`;
}

// src/annotations.ts
function strokeAnnotationPx(ctx, a, ptsPx, widthPx) {
  if (ptsPx.length < 2) return;
  const w = Math.max(1, widthPx);
  if (a.kind === "arrow") {
    brushArrow(ctx, ptsPx, a.color, w, a.dashed);
    return;
  }
  if (a.dashed) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = a.color;
    ctx.lineWidth = w;
    ctx.setLineDash([w * 2.6, w * 2.2]);
    const path = new Path2D();
    sketchToPath(path, ptsPx, false);
    ctx.stroke(path);
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }
  inkStroke(ctx, ptsPx, { color: a.color, width: w, closed: false, passes: 2, bleed: 2, amp: Math.max(0.6, w * 0.3) });
}
function distToPolyline(px, py, ptsPx) {
  let best = Infinity;
  for (let i = 0; i < ptsPx.length - 1; i++) {
    const [ax, ay] = ptsPx[i], [bx, by] = ptsPx[i + 1];
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    let t2 = ((px - ax) * dx + (py - ay) * dy) / l2;
    t2 = t2 < 0 ? 0 : t2 > 1 ? 1 : t2;
    const cx = ax + t2 * dx, cy = ay + t2 * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (d < best) best = d;
  }
  return best;
}

// src/modals.ts
var import_obsidian = require("obsidian");
var NoteSuggestModal = class extends import_obsidian.FuzzySuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("\uC5F0\uACB0\uD560 \uB178\uD2B8\uB97C \uAC80\uC0C9...");
  }
  getItems() {
    return this.app.vault.getMarkdownFiles();
  }
  getItemText(file) {
    return file.path;
  }
  onChooseItem(file) {
    this.onChoose(file);
  }
};
var ImageSuggestModal = class extends import_obsidian.FuzzySuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("\uC9C0\uB3C4 \uC774\uBBF8\uC9C0\uB97C \uAC80\uC0C9... (png/jpg/webp)");
  }
  getItems() {
    const exts = /* @__PURE__ */ new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp"]);
    return this.app.vault.getFiles().filter((f) => exts.has(f.extension.toLowerCase()));
  }
  getItemText(file) {
    return file.path;
  }
  onChooseItem(file) {
    this.onChoose(file);
  }
};
var MarkerModal = class extends import_obsidian.Modal {
  constructor(app, marker, onSave, onDelete) {
    super(app);
    this.marker = { ...marker };
    this.onSave = onSave;
    this.onDelete = onDelete;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: this.marker.name ? "\uB9C8\uCEE4 \uD3B8\uC9D1" : "\uC0C8 \uB9C8\uCEE4" });
    new import_obsidian.Setting(contentEl).setName("\uC774\uB984").addText((t2) => {
      t2.setValue(this.marker.name).onChange((v) => this.marker.name = v);
      window.setTimeout(() => t2.inputEl.focus(), 30);
    });
    const iconSetting = new import_obsidian.Setting(contentEl).setName("\uC544\uC774\uCF58");
    const iconRow = iconSetting.controlEl.createDiv({ cls: "fms-icon-row" });
    const iconBtns = [];
    const current2 = normalizeIcon(this.marker.icon);
    for (const ic of MARKER_ICONS) {
      const btn = iconRow.createEl("button", { cls: "fms-icon-btn", attr: { "aria-label": ic.label } });
      btn.innerHTML = iconSvg(ic.id);
      if (ic.id === current2) btn.addClass("is-active");
      btn.onclick = () => {
        this.marker.icon = ic.id;
        iconBtns.forEach((b) => b.removeClass("is-active"));
        btn.addClass("is-active");
      };
      iconBtns.push(btn);
    }
    new import_obsidian.Setting(contentEl).setName("\uD06C\uAE30").addSlider(
      (sl) => sl.setLimits(0.5, 3, 0.1).setValue(this.marker.size ?? 1).setDynamicTooltip().onChange((v) => this.marker.size = v)
    );
    new import_obsidian.Setting(contentEl).setName("\uC5F0\uACB0\uB41C \uB178\uD2B8").setDesc(this.marker.notePath ?? "\uC5C6\uC74C").addButton(
      (b) => b.setButtonText("\uB178\uD2B8 \uC120\uD0DD").onClick(() => {
        new NoteSuggestModal(this.app, (file) => {
          this.marker.notePath = file.path;
          if (!this.marker.name) this.marker.name = file.basename;
          this.onOpen2();
        }).open();
      })
    ).addExtraButton(
      (b) => b.setIcon("x").setTooltip("\uC5F0\uACB0 \uD574\uC81C").onClick(() => {
        delete this.marker.notePath;
        this.onOpen2();
      })
    );
    const footer = new import_obsidian.Setting(contentEl);
    if (this.onDelete) {
      footer.addButton(
        (b) => b.setButtonText("\uC0AD\uC81C").setWarning().onClick(() => {
          this.close();
          this.onDelete?.();
        })
      );
    }
    footer.addButton(
      (b) => b.setButtonText("\uC800\uC7A5").setCta().onClick(() => {
        if (!this.marker.name) this.marker.name = "\uC774\uB984 \uC5C6\uB294 \uB9C8\uCEE4";
        this.close();
        this.onSave(this.marker);
      })
    );
  }
  /** Refresh the UI after the note link changes */
  onOpen2() {
    this.contentEl.empty();
    this.onOpen();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var TextEditModal = class extends import_obsidian.Modal {
  constructor(app, heading, initial, multiline, onSave) {
    super(app);
    this.heading = heading;
    this.value = initial;
    this.multiline = multiline;
    this.onSave = onSave;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: this.heading });
    let input;
    if (this.multiline) {
      input = contentEl.createEl("textarea", { cls: "fms-textarea" });
      input.rows = 5;
    } else {
      input = contentEl.createEl("input", { type: "text", cls: "fms-text-input" });
    }
    input.value = this.value;
    input.oninput = () => this.value = input.value;
    input.onkeydown = (e) => {
      if (e.key === "Enter" && (!this.multiline || e.ctrlKey)) {
        e.preventDefault();
        this.close();
        this.onSave(this.value);
      }
    };
    window.setTimeout(() => input.focus(), 30);
    new import_obsidian.Setting(contentEl).addButton(
      (b) => b.setButtonText("\uC800\uC7A5").setCta().onClick(() => {
        this.close();
        this.onSave(this.value);
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
var REGION_COLORS = ["#c0392b", "#8e44ad", "#2471a3", "#1e8449", "#b7950b", "#6e2c00", "#5d6d7e"];
var RegionModal = class extends import_obsidian.Modal {
  constructor(app, region, onSave, onDelete) {
    super(app);
    this.region = { ...region, points: region.points.map((p) => [...p]) };
    this.onSave = onSave;
    this.onDelete = onDelete;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: this.region.name ? "\uC9C0\uC5ED \uD3B8\uC9D1" : "\uC0C8 \uC9C0\uC5ED" });
    new import_obsidian.Setting(contentEl).setName("\uC774\uB984").addText((t2) => {
      t2.setValue(this.region.name).onChange((v) => this.region.name = v);
      window.setTimeout(() => t2.inputEl.focus(), 30);
    });
    const colorSetting = new import_obsidian.Setting(contentEl).setName("\uC0C9\uC0C1");
    const row = colorSetting.controlEl.createDiv({ cls: "fms-icon-row" });
    const swatches = [];
    for (const c of REGION_COLORS) {
      const sw = row.createEl("button", { cls: "fms-swatch" });
      sw.style.backgroundColor = c;
      if (c === this.region.color) sw.addClass("is-active");
      sw.onclick = () => {
        this.region.color = c;
        swatches.forEach((s) => s.removeClass("is-active"));
        sw.addClass("is-active");
      };
      swatches.push(sw);
    }
    new import_obsidian.Setting(contentEl).setName("\uC5F0\uACB0\uB41C \uB178\uD2B8").setDesc(this.region.notePath ?? "\uC5C6\uC74C").addButton(
      (b) => b.setButtonText("\uB178\uD2B8 \uC120\uD0DD").onClick(() => {
        new NoteSuggestModal(this.app, (file) => {
          this.region.notePath = file.path;
          if (!this.region.name) this.region.name = file.basename;
          this.contentEl.empty();
          this.onOpen();
        }).open();
      })
    );
    const footer = new import_obsidian.Setting(contentEl);
    if (this.onDelete) {
      footer.addButton(
        (b) => b.setButtonText("\uC0AD\uC81C").setWarning().onClick(() => {
          this.close();
          this.onDelete?.();
        })
      );
    }
    footer.addButton(
      (b) => b.setButtonText("\uC800\uC7A5").setCta().onClick(() => {
        if (!this.region.name) this.region.name = "\uC774\uB984 \uC5C6\uB294 \uC9C0\uC5ED";
        this.close();
        this.onSave(this.region);
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/view.ts
var VIEW_TYPE_FMAP = "vellum-map-view";
var TOOL_DEFS = [
  { id: "select", icon: "mouse-pointer-2", label: "\uC120\uD0DD/\uC774\uB3D9 \u2014 \uB9C8\uCEE4\xB7\uC9C0\uC5ED\xB7\uADF8\uB9BC \uB4DC\uB798\uADF8\uB85C \uC774\uB3D9, Delete\uB85C \uC0AD\uC81C" },
  { id: "marker", icon: "map-pin", label: "\uB9C8\uCEE4 \uBC30\uCE58 \u2014 \uD074\uB9AD\uD55C \uC704\uCE58\uC5D0 \uB9C8\uCEE4 \uCD94\uAC00" },
  { id: "region", icon: "hexagon", label: "\uC9C0\uC5ED \uADF8\uB9AC\uAE30 \u2014 \uD074\uB9AD\uC73C\uB85C \uAF2D\uC9D3\uC810, \uB354\uBE14\uD074\uB9AD/Enter\uB85C \uC644\uC131" },
  { id: "draw", icon: "pencil", label: "\uC790\uC720 \uADF8\uB9AC\uAE30 \u2014 \uB4DC\uB798\uADF8\uB85C \uACBD\uB85C\xB7\uACE1\uC120 \uADF8\uB9AC\uAE30" },
  { id: "arrow", icon: "move-up-right", label: "\uD654\uC0B4\uD45C \u2014 \uB4DC\uB798\uADF8\uB85C \uBC29\uD5A5 \uD45C\uC2DC" },
  { id: "raise", icon: "arrow-up-circle", label: "\uC9C0\uD615 \uC62C\uB9AC\uAE30 \u2014 \uB4DC\uB798\uADF8\uB85C \uC735\uAE30" },
  { id: "lower", icon: "arrow-down-circle", label: "\uC9C0\uD615 \uB0B4\uB9AC\uAE30 \u2014 \uB4DC\uB798\uADF8\uB85C \uCE68\uAC15" },
  { id: "paint", icon: "paintbrush", label: "\uBC14\uC774\uC634 \uCE60\uD558\uAE30 \u2014 1~5\uB85C \uC885\uB958 \uC120\uD0DD, E \uC9C0\uC6B0\uAC1C" }
];
var DRAW_COLORS = ["#8a1c1c", "#1c1a14", "#2a5a8a", "#1e6e3a", "#7a4a1a", "#6a2c8a"];
var PAINT_BIOMES = [
  { code: B.OCEAN, key: "water", label: "Water" },
  { code: B.GRASS, key: "grass", label: "Grassland" },
  { code: B.FOREST, key: "forest", label: "Forest" },
  { code: B.DESERT, key: "desert", label: "Desert" },
  { code: B.SNOW, key: "snow", label: "Snow" }
];
var VellumView = class extends import_obsidian2.TextFileView {
  constructor(leaf) {
    super(leaf);
    this.map = defaultMapData("\uC9C0\uB3C4");
    this.edits = null;
    this.paint = null;
    this.paintBiome = B.GRASS;
    this.paintErase = false;
    this.paintBarEl = null;
    // Terrain pipeline caches
    this.baseHeight = null;
    this.baseKey = "";
    this.classifier = null;
    this.terrain = null;
    this.layers = null;
    this.contours = null;
    this.contourMinor = null;
    this.contourMajor = null;
    this.bathyPath = null;
    // bathymetric lines
    this.coastPath = null;
    this.riverLines = [];
    // rivers for the brush ribbons
    this.baseImage = null;
    this.imageUrl = null;
    this.toolBtns = /* @__PURE__ */ new Map();
    this.cam = { x: 0, y: 0, scale: 1 };
    this.camFitted = false;
    this.tool = "select";
    this.drawColor = DRAW_COLORS[0];
    this.drawWidth = 3;
    this.drawDashed = true;
    this.drawErase = false;
    this.drawBarEl = null;
    this.currentAnno = null;
    this.hoverMarkerId = null;
    this.selectedRegionId = null;
    this.selectedOrnId = null;
    this.selectedAnnoId = null;
    this.ornBoxes = /* @__PURE__ */ new Map();
    // world-space bounding boxes
    this.dragMode = "none";
    this.dragAnnoId = null;
    this.dragAnnoOrig = null;
    this.dragOrnId = null;
    this.ornStart = { x: 0, y: 0, sizeF: 0, dist: 1 };
    this.dragMarkerId = null;
    this.dragRegionId = null;
    this.dragVertexIdx = -1;
    this.dragOrigPoints = null;
    this.dragStartWorld = { x: 0, y: 0 };
    this.dragMoved = false;
    this.lastPointer = { x: 0, y: 0 };
    this.drawingRegion = null;
    this.brushRadius = 26;
    this.flash = null;
    this.finalizeTimer = null;
    this.regenTimer = null;
    this.renderToken = 0;
    // cancellation token for the progressive render
    this.renderRAF = 0;
    // in-flight rAF handle
    this.fullDetailCanvas = null;
    // full-map pixel cache (at CACHE_SCALE)
    this.cacheValid = false;
    // true = terrain unchanged; draw() uses a cropped blit
    this.detailTimer = null;
    this.worker = null;
    this.workerUrl = null;
    this.workerReqId = 0;
    this.workerReqs = /* @__PURE__ */ new Map();
    this.genToken = 0;
    // cancellation token for async generation
    this.resizeObs = null;
    this.ready = false;
    this.pendingFocusName = null;
    this.grainPattern = null;
    // ── Coastal hatching (copperplate equidistant lines) ─
    this.hatchRows = null;
    this.landHatchRows = null;
    // ── User sticker image cache ─────────────────────────
    this.stickerImages = /* @__PURE__ */ new Map();
    this.stickerLoading = /* @__PURE__ */ new Set();
    // ── Settings panel ───────────────────────────────────
    this.markerListEl = null;
    this.ornListEl = null;
    this.activePanelTab = "terrain";
  }
  getViewType() {
    return VIEW_TYPE_FMAP;
  }
  getIcon() {
    return "map";
  }
  getDisplayText() {
    return this.file?.basename ?? "\uD310\uD0C0\uC9C0 \uC9C0\uB3C4";
  }
  getViewData() {
    this.syncLayersToMap();
    return JSON.stringify(this.map, null, 2);
  }
  setViewData(data, _clear) {
    try {
      this.map = parseMapData(data);
    } catch {
      this.map = defaultMapData(this.file?.basename ?? "\uC9C0\uB3C4");
    }
    const len = this.map.width * this.map.height;
    this.edits = this.map.editsB64 ? b64ToBytes(this.map.editsB64, len) : null;
    this.paint = this.map.paintB64 ? new Uint8Array(b64ToBytes(this.map.paintB64, len).buffer) : null;
    this.camFitted = false;
    if (this.ready) this.rebuild();
  }
  clear() {
    this.map = defaultMapData("\uC9C0\uB3C4");
    this.edits = null;
    this.paint = null;
    this.terrain = null;
    this.layers = null;
    this.baseHeight = null;
    this.baseKey = "";
  }
  /** [[map.fmap#markerName]] subpath link → highlight that marker */
  setEphemeralState(state) {
    const sub = state?.subpath;
    if (typeof sub === "string" && sub.length > 1) {
      const name = decodeURIComponent(sub.replace(/^#/, "")).trim();
      if (!this.focusMarkerByName(name)) this.pendingFocusName = name;
    }
  }
  async onOpen() {
    const content = this.contentEl;
    content.empty();
    content.addClass("fms-content");
    this.rootEl = content.createDiv({ cls: "fms-root" });
    this.rootEl.tabIndex = 0;
    this.canvasEl = this.rootEl.createEl("canvas", { cls: "fms-canvas" });
    this.ctx = this.canvasEl.getContext("2d");
    this.buildToolbar();
    this.panelEl = this.rootEl.createDiv({ cls: "fms-panel" });
    this.hintEl = this.rootEl.createDiv({ cls: "fms-hint" });
    this.buildPaintBar();
    this.buildDrawBar();
    this.bindEvents();
    this.resizeObs = new ResizeObserver(() => this.handleResize());
    this.resizeObs.observe(this.rootEl);
    this.ready = true;
    this.rebuild();
    ensureFontsLoaded(() => this.draw());
  }
  async onClose() {
    this.resizeObs?.disconnect();
    if (this.imageUrl) URL.revokeObjectURL(this.imageUrl);
    if (this.regenTimer) window.clearTimeout(this.regenTimer);
    if (this.finalizeTimer) window.clearTimeout(this.finalizeTimer);
    if (this.detailTimer) window.clearTimeout(this.detailTimer);
    if (this.renderRAF) cancelAnimationFrame(this.renderRAF);
    this.renderToken++;
    this.genToken++;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.workerUrl) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = null;
    }
    this.workerReqs.clear();
  }
  // ── Build / regeneration ─────────────────────────────
  rebuild() {
    this.buildPanel();
    if (this.map.mode === "image" && this.map.baseImagePath) {
      void this.loadBaseImage(this.map.baseImagePath);
    } else {
      this.regenerate();
    }
  }
  renderOpts() {
    return {
      colors: this.map.styleColors,
      coastWidth: this.map.coastWidth,
      coastColor: this.map.coastColor,
      waves: this.map.decor.waves,
      relief: this.map.texture.relief,
      mottle: this.map.texture.mottle
    };
  }
  /** Regenerate the whole pipeline. The noise base is recomputed only when parameters change. */
  /** Prepare the worker (inlined source → Blob URL). On failure, stay null and fall back to sync. */
  ensureWorker() {
    if (this.worker || typeof Worker === "undefined") return;
    try {
      const code = true ? '"use strict";\n(() => {\n  // src/noise.ts\n  function mulberry32(seed) {\n    let a = seed >>> 0;\n    return () => {\n      a |= 0;\n      a = a + 1831565813 | 0;\n      let t = Math.imul(a ^ a >>> 15, 1 | a);\n      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;\n      return ((t ^ t >>> 14) >>> 0) / 4294967296;\n    };\n  }\n  var GRAD = [\n    [1, 1],\n    [-1, 1],\n    [1, -1],\n    [-1, -1],\n    [1, 0],\n    [-1, 0],\n    [0, 1],\n    [0, -1]\n  ];\n  var Noise2D = class {\n    constructor(seed) {\n      const rng = mulberry32(seed);\n      const p = new Uint8Array(256);\n      for (let i = 0; i < 256; i++) p[i] = i;\n      for (let i = 255; i > 0; i--) {\n        const j = Math.floor(rng() * (i + 1));\n        const t = p[i];\n        p[i] = p[j];\n        p[j] = t;\n      }\n      this.perm = new Uint8Array(512);\n      for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];\n    }\n    /** -1..1 */\n    noise(x, y) {\n      const xi = Math.floor(x), yi = Math.floor(y);\n      const xf = x - xi, yf = y - yi;\n      const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);\n      const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);\n      const p = this.perm;\n      const aa = p[p[xi & 255] + (yi & 255)] & 7;\n      const ab = p[p[xi & 255] + (yi + 1 & 255)] & 7;\n      const ba = p[p[xi + 1 & 255] + (yi & 255)] & 7;\n      const bb = p[p[xi + 1 & 255] + (yi + 1 & 255)] & 7;\n      const dot = (g, dx, dy) => g[0] * dx + g[1] * dy;\n      const x1 = dot(GRAD[aa], xf, yf) + u * (dot(GRAD[ba], xf - 1, yf) - dot(GRAD[aa], xf, yf));\n      const x2 = dot(GRAD[ab], xf, yf - 1) + u * (dot(GRAD[bb], xf - 1, yf - 1) - dot(GRAD[ab], xf, yf - 1));\n      return (x1 + v * (x2 - x1)) * 1.4;\n    }\n  };\n  function fbm(n, x, y, octaves, lacunarity = 2, gain = 0.5) {\n    let sum = 0, amp = 1, freq = 1, norm = 0;\n    for (let i = 0; i < octaves; i++) {\n      sum += n.noise(x * freq, y * freq) * amp;\n      norm += amp;\n      amp *= gain;\n      freq *= lacunarity;\n    }\n    return sum / norm;\n  }\n\n  // src/terrain.ts\n  function smoothstep(a, b, x) {\n    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));\n    return t * t * (3 - 2 * t);\n  }\n  var B = {\n    DEEP: 0,\n    OCEAN: 1,\n    BEACH: 2,\n    GRASS: 3,\n    FOREST: 4,\n    DESERT: 5,\n    HILL: 6,\n    MOUNTAIN: 7,\n    SNOW: 8\n  };\n  function generateBase(map) {\n    const w = map.width, h = map.height;\n    const g = map.gen;\n    const nH = new Noise2D(g.seed);\n    const nD = new Noise2D(g.seed + 1013);\n    const nW = new Noise2D(g.seed + 5501);\n    const base = new Float32Array(w * h);\n    const contFreq = 1.2 + g.continents * 0.75;\n    const detOct = Math.max(2, Math.round(3 + g.detail * 3));\n    const detGain = 0.42 + Math.min(g.roughness, 2) * 0.09;\n    const aspect = h / w;\n    const cc = Math.max(0, Math.round(g.continentCount ?? 0));\n    const ic = Math.max(0, Math.round(g.islandCount ?? 0));\n    const useBlobs = cc > 0 || ic > 0;\n    const landAmt = g.landAmount ?? 1;\n    const blobs = [];\n    if (useBlobs) {\n      const rng = mulberry32(g.seed ^ 1715004);\n      const contR = 0.3 / Math.sqrt(Math.max(1, cc)) * landAmt;\n      for (let i = 0; i < cc; i++) {\n        const cx = 0.18 + rng() * 0.64;\n        const cy = 0.18 + rng() * 0.64;\n        const r = contR * (0.72 + rng() * 0.6);\n        const ang = rng() * Math.PI;\n        const sl = r * (0.5 + rng() * 0.25);\n        const ca = Math.cos(ang), sa = Math.sin(ang);\n        const ucy = cy * aspect;\n        blobs.push({\n          cx,\n          cy,\n          r,\n          s: 1,\n          spine: { x0: cx - ca * sl, y0: ucy - sa * sl, x1: cx + ca * sl, y1: ucy + sa * sl, w: r * 0.115 }\n        });\n      }\n      for (let i = 0; i < ic; i++) {\n        blobs.push({\n          cx: 0.06 + rng() * 0.88,\n          cy: 0.06 + rng() * 0.88,\n          r: (0.028 + rng() * 0.045) * landAmt,\n          s: 0.9\n        });\n      }\n    }\n    let mn = Infinity, mx = -Infinity;\n    for (let y = 0; y < h; y++) {\n      const ny = (y / h - 0.5) * aspect;\n      const nyc = y / h;\n      for (let x = 0; x < w; x++) {\n        const nx = x / w - 0.5;\n        const nxc = x / w;\n        let v;\n        if (useBlobs) {\n          const wx = nxc + fbm(nW, nxc * 3, nyc * 3, 4) * 0.12;\n          const wy = nyc + fbm(nW, nxc * 3 + 11, nyc * 3 + 7, 4) * 0.12;\n          let land = 0;\n          for (const b of blobs) {\n            const dx = wx - b.cx, dy = (wy - b.cy) * aspect;\n            const t = Math.hypot(dx, dy) / b.r;\n            if (t < 1.2) {\n              const fall = t < 0.68 ? 1 : Math.max(0, 1 - (t - 0.68) / 0.32);\n              land = Math.max(land, fall * b.s);\n            }\n          }\n          const coastN = fbm(nD, nxc * contFreq * 3 + 7, nyc * contFreq * 3 + 3, detOct, 2, detGain);\n          const edge = land + coastN * 0.22;\n          if (edge < 0.5) {\n            v = edge * 0.9;\n          } else {\n            const inland = Math.min(1, (edge - 0.5) * 2.5);\n            const maskN = (fbm(nH, nxc * 1.7 + 4, nyc * 1.7 + 4, 3) + 1) * 0.5;\n            const rr = fbm(nD, nxc * 3.4 + 20, nyc * 3.4 + 20, 5);\n            const ridge = Math.max(0, 1 - Math.abs(rr) * 1.5);\n            const gate = smoothstep(0.46, 0.76, maskN);\n            let spine = 0;\n            for (const b of blobs) {\n              const sp = b.spine;\n              if (!sp) continue;\n              const uy = wy * aspect;\n              const vx = sp.x1 - sp.x0, vy = sp.y1 - sp.y0;\n              const len2 = vx * vx + vy * vy || 1;\n              let tt = ((wx - sp.x0) * vx + (uy - sp.y0) * vy) / len2;\n              tt = tt < 0 ? 0 : tt > 1 ? 1 : tt;\n              const dxs = wx - (sp.x0 + vx * tt), dys = uy - (sp.y0 + vy * tt);\n              const ds = Math.hypot(dxs, dys);\n              if (ds < sp.w * 1.4) {\n                const prof = Math.max(0, 1 - ds / sp.w);\n                const envelope = Math.sin(Math.PI * tt) ** 0.6;\n                const peaks = 0.55 + 0.45 * ((fbm(nD, wx * 7 + 40, wy * 7 + 40, 3) + 1) * 0.5);\n                spine = Math.max(spine, prof * envelope * peaks * 0.8);\n              }\n            }\n            const mtn = Math.max(ridge * gate, spine) * Math.min(1, inland * 2.5);\n            v = 0.52 + inland * 0.06 + mtn * 0.58 + coastN * 0.02;\n          }\n        } else {\n          const b = fbm(nH, nx * contFreq, ny * contFreq, 4, 2, 0.5);\n          const d = fbm(nD, nx * contFreq * 4 + 7.3, ny * contFreq * 4 + 3.1, detOct, 2, detGain);\n          v = b * 0.7 + d * 0.3 * (0.6 + g.roughness * 0.4);\n        }\n        base[y * w + x] = v;\n        if (v < mn) mn = v;\n        if (v > mx) mx = v;\n      }\n    }\n    if (useBlobs) {\n      for (let i = 0; i < base.length; i++) {\n        let v = base[i];\n        if (v > 0.86) v = 0.86 + (v - 0.86) * 0.38;\n        base[i] = v < 0 ? 0 : v > 1 ? 1 : v;\n      }\n    } else {\n      const span = mx - mn || 1;\n      for (let i = 0; i < base.length; i++) base[i] = (base[i] - mn) / span;\n    }\n    if (g.erosion > 0.01) erode(base, w, h, g.seaLevel, g.erosion, g.seed);\n    return base;\n  }\n  function erode(height, w, h, sea, strength, seed) {\n    const rng = mulberry32(seed ^ 59141);\n    const drops = Math.floor(w * h * 0.18 * strength);\n    const INERTIA = 0.06, CAP = 3.4, MIN_SLOPE = 8e-3;\n    const ERODE = 0.32, DEPOSIT = 0.28, EVAP = 0.02, GRAVITY = 4;\n    for (let d = 0; d < drops; d++) {\n      let px = rng() * (w - 2), py = rng() * (h - 2);\n      let dx = 0, dy = 0, vel = 1, water = 1, sed = 0;\n      for (let life = 0; life < 30; life++) {\n        const xi = px | 0, yi = py | 0;\n        if (xi < 0 || yi < 0 || xi >= w - 1 || yi >= h - 1) break;\n        const fx = px - xi, fy = py - yi;\n        const i00 = yi * w + xi;\n        const h00 = height[i00], h10 = height[i00 + 1];\n        const h01 = height[i00 + w], h11 = height[i00 + w + 1];\n        const gx = (h10 - h00) * (1 - fy) + (h11 - h01) * fy;\n        const gy = (h01 - h00) * (1 - fx) + (h11 - h10) * fx;\n        const oldH = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;\n        if (oldH < sea - 0.03) break;\n        dx = dx * INERTIA - gx * (1 - INERTIA);\n        dy = dy * INERTIA - gy * (1 - INERTIA);\n        const len = Math.hypot(dx, dy);\n        if (len < 1e-8) break;\n        dx /= len;\n        dy /= len;\n        px += dx;\n        py += dy;\n        if (px < 0 || py < 0 || px >= w - 1.001 || py >= h - 1.001) break;\n        const nxi = px | 0, nyi = py | 0;\n        const nfx = px - nxi, nfy = py - nyi;\n        const j = nyi * w + nxi;\n        const newH = height[j] * (1 - nfx) * (1 - nfy) + height[j + 1] * nfx * (1 - nfy) + height[j + w] * (1 - nfx) * nfy + height[j + w + 1] * nfx * nfy;\n        const dh = newH - oldH;\n        const cap = Math.max(-dh, MIN_SLOPE) * vel * water * CAP;\n        if (sed > cap || dh > 0) {\n          const dep = dh > 0 ? Math.min(dh, sed) : (sed - cap) * DEPOSIT;\n          sed -= dep;\n          height[i00] += dep * (1 - fx) * (1 - fy);\n          height[i00 + 1] += dep * fx * (1 - fy);\n          height[i00 + w] += dep * (1 - fx) * fy;\n          height[i00 + w + 1] += dep * fx * fy;\n        } else {\n          const er = Math.min((cap - sed) * ERODE, -dh);\n          sed += er;\n          height[i00] -= er * (1 - fx) * (1 - fy);\n          height[i00 + 1] -= er * fx * (1 - fy);\n          height[i00 + w] -= er * (1 - fx) * fy;\n          height[i00 + w + 1] -= er * fx * fy;\n        }\n        vel = Math.sqrt(Math.max(0.01, vel * vel - dh * GRAVITY));\n        water *= 1 - EVAP;\n      }\n    }\n    for (let i = 0; i < height.length; i++) {\n      const v = height[i];\n      height[i] = v < 0 ? 0 : v > 1 ? 1 : v;\n    }\n  }\n  function composeHeight(base, edit) {\n    const v = base + edit / 254;\n    return v < 0 ? 0 : v > 1 ? 1 : v;\n  }\n  var Classifier = class {\n    constructor(g, w, h) {\n      this.g = g;\n      this.nM = new Noise2D(g.seed + 2027);\n      this.w = w;\n      this.h = h;\n    }\n    biomeAt(x, y, el) {\n      const { g, nM, w, h } = this;\n      const sea = g.seaLevel;\n      if (el < sea - 0.12) return B.DEEP;\n      if (el < sea) return B.OCEAN;\n      const lat = y / h;\n      const polarJit = nM.noise(x / w * 9 + 50, y / h * 9 + 50) * 0.035;\n      const inPolar = g.snow && g.polarNorth > 0 && lat < g.polarNorth + polarJit || g.snow && g.polarSouth > 0 && lat > 1 - g.polarSouth + polarJit;\n      const rel = (el - sea) / Math.max(1e-4, 1 - sea);\n      const temp = 1 - Math.abs(lat * 2 - 1) * 0.9 - rel * 0.55;\n      const moist = fbm(nM, x / w * 5, y / h * 5, 4) * 0.5 + 0.5 + (g.climate - 0.5) * 0.6;\n      if (inPolar || g.snow && rel > 0.9) return B.SNOW;\n      if (rel > 0.66) return B.MOUNTAIN;\n      if (rel > 0.5) return B.HILL;\n      if (rel < 0.035) return B.BEACH;\n      if (g.desert && moist < 0.34 && temp > 0.42) return B.DESERT;\n      if (g.forest && moist > 0.55 && temp > 0.2 && temp < 0.85) return B.FOREST;\n      return B.GRASS;\n    }\n  };\n  function applyPaintAt(biome, paintVal, el, sea) {\n    if (paintVal <= 0) return biome;\n    const b = paintVal - 1;\n    return b === B.OCEAN && el < sea - 0.12 ? B.DEEP : b;\n  }\n  function composeTerrain(map, base, edits, paint) {\n    const w = map.width, h = map.height;\n    const g = map.gen;\n    const sea = g.seaLevel;\n    const height = new Float32Array(w * h);\n    for (let i = 0; i < height.length; i++) {\n      height[i] = composeHeight(base[i], edits ? edits[i] : 0);\n    }\n    let river = new Uint8Array(w * h);\n    let lake = new Uint8Array(w * h);\n    let rivers = [];\n    if (g.rivers) {\n      const hyd = hydrology(height, w, h, sea, g.riverDensity);\n      river = hyd.river;\n      lake = hyd.lake;\n      rivers = hyd.rivers;\n    }\n    const cls = new Classifier(g, w, h);\n    const biome = new Uint8Array(w * h);\n    for (let y = 0; y < h; y++) {\n      for (let x = 0; x < w; x++) {\n        const i = y * w + x;\n        let b = lake[i] ? B.OCEAN : cls.biomeAt(x, y, height[i]);\n        if (paint) b = applyPaintAt(b, paint[i], height[i], sea);\n        biome[i] = b;\n      }\n    }\n    return { w, h, height, biome, river, lake, rivers, seaLevel: sea };\n  }\n  var DX8 = [1, -1, 0, 0, 1, 1, -1, -1];\n  var DY8 = [0, 0, 1, -1, 1, -1, 1, -1];\n  function hydrology(height, w, h, sea, riverDensity) {\n    const n = w * h;\n    const filled = new Float32Array(height);\n    const visited = new Uint8Array(n);\n    const heap = new MinHeap(n);\n    for (let x = 0; x < w; x++) {\n      for (const y of [0, h - 1]) {\n        const i = y * w + x;\n        if (!visited[i]) {\n          visited[i] = 1;\n          heap.push(filled[i], i);\n        }\n      }\n    }\n    for (let y = 1; y < h - 1; y++) {\n      for (const x of [0, w - 1]) {\n        const i = y * w + x;\n        if (!visited[i]) {\n          visited[i] = 1;\n          heap.push(filled[i], i);\n        }\n      }\n    }\n    while (heap.size > 0) {\n      const [level, i] = heap.pop();\n      const x = i % w, y = i / w | 0;\n      for (let d = 0; d < 8; d++) {\n        const nx = x + DX8[d], ny = y + DY8[d];\n        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;\n        const ni = ny * w + nx;\n        if (visited[ni]) continue;\n        visited[ni] = 1;\n        filled[ni] = Math.max(height[ni], level + 1e-5);\n        heap.push(filled[ni], ni);\n      }\n    }\n    const lake = new Uint8Array(n);\n    for (let i = 0; i < n; i++) {\n      if (filled[i] > sea && filled[i] - height[i] > 6e-3) lake[i] = 1;\n    }\n    const flowDir = new Int32Array(n).fill(-1);\n    for (let y = 0; y < h; y++) {\n      for (let x = 0; x < w; x++) {\n        const i = y * w + x;\n        let best = -1, bestDrop = 0;\n        for (let d = 0; d < 8; d++) {\n          const nx = x + DX8[d], ny = y + DY8[d];\n          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;\n          const ni = ny * w + nx;\n          const drop = (filled[i] - filled[ni]) / (d < 4 ? 1 : 1.4142);\n          if (drop > bestDrop) {\n            bestDrop = drop;\n            best = ni;\n          }\n        }\n        flowDir[i] = best;\n      }\n    }\n    const order = new Uint32Array(n);\n    for (let i = 0; i < n; i++) order[i] = i;\n    const sorted = Array.from(order).sort((a, b) => filled[b] - filled[a]);\n    const acc = new Float32Array(n).fill(1);\n    for (const i of sorted) {\n      const d = flowDir[i];\n      if (d >= 0) acc[d] += acc[i];\n    }\n    const T = n / (50 + 620 * Math.max(0.02, riverDensity));\n    const river = new Uint8Array(n);\n    for (let i = 0; i < n; i++) {\n      if (height[i] >= sea && !lake[i] && acc[i] >= T) river[i] = 1;\n    }\n    const rivers = [];\n    const traced = new Int32Array(n);\n    const widthOf = (a) => 0.5 + Math.log2(a / T + 1) * 0.55;\n    const heightRange = Math.max(1e-3, 1 - sea);\n    for (let i = 0; i < n; i++) {\n      if (!river[i] || traced[i]) continue;\n      let isSource = true;\n      const x = i % w, y = i / w | 0;\n      for (let d = 0; d < 8 && isSource; d++) {\n        const nx = x + DX8[d], ny = y + DY8[d];\n        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;\n        const ni = ny * w + nx;\n        if (river[ni] && flowDir[ni] === i) isSource = false;\n      }\n      if (!isSource) continue;\n      const relSrcHeight = (height[i] - sea) / heightRange;\n      if (relSrcHeight < 0.08) continue;\n      const pts = [];\n      const widths = [];\n      const marked = [];\n      const riverIdx = rivers.length + 1;\n      let joins;\n      let cur = i;\n      for (let step = 0; step < w + h; step++) {\n        pts.push([cur % w, cur / w | 0]);\n        widths.push(widthOf(acc[cur]));\n        const next = flowDir[cur];\n        if (next < 0) break;\n        if (height[next] < sea || lake[next]) {\n          const wBase = widthOf(acc[cur]);\n          const flare = [1.25, 1.7, 2.2];\n          let mc = next;\n          for (let k = 0; k < 3 && mc >= 0 && (height[mc] < sea || lake[mc]); k++) {\n            pts.push([mc % w, mc / w | 0]);\n            widths.push(wBase * flare[k]);\n            mc = flowDir[mc];\n          }\n          break;\n        }\n        if (traced[next]) {\n          joins = traced[next] - 1;\n          pts.push([next % w, next / w | 0]);\n          widths.push(widthOf(acc[next]));\n          break;\n        }\n        traced[cur] = riverIdx;\n        marked.push(cur);\n        cur = next;\n      }\n      if (pts.length >= 10) {\n        rivers.push({ pts, widths, joins });\n      } else {\n        for (const m of marked) traced[m] = 0;\n      }\n    }\n    for (let i = 0; i < n; i++) {\n      if (river[i] && height[i] >= sea) {\n        const dent = 4e-3 + 5e-3 * Math.min(1, acc[i] / (T * 10));\n        height[i] = Math.max(sea + 1e-3, height[i] - dent);\n      }\n    }\n    return { river, lake, rivers };\n  }\n  var MinHeap = class {\n    constructor(cap) {\n      this.size = 0;\n      this.keys = new Float64Array(cap + 8);\n      this.vals = new Int32Array(cap + 8);\n    }\n    push(key, val) {\n      let i = this.size++;\n      const { keys, vals } = this;\n      keys[i] = key;\n      vals[i] = val;\n      while (i > 0) {\n        const p = i - 1 >> 1;\n        if (keys[p] <= keys[i]) break;\n        const tk = keys[p];\n        keys[p] = keys[i];\n        keys[i] = tk;\n        const tv = vals[p];\n        vals[p] = vals[i];\n        vals[i] = tv;\n        i = p;\n      }\n    }\n    pop() {\n      const { keys, vals } = this;\n      const outK = keys[0], outV = vals[0];\n      this.size--;\n      keys[0] = keys[this.size];\n      vals[0] = vals[this.size];\n      let i = 0;\n      for (; ; ) {\n        const l = i * 2 + 1, r = l + 1;\n        let m = i;\n        if (l < this.size && keys[l] < keys[m]) m = l;\n        if (r < this.size && keys[r] < keys[m]) m = r;\n        if (m === i) break;\n        const tk = keys[m];\n        keys[m] = keys[i];\n        keys[i] = tk;\n        const tv = vals[m];\n        vals[m] = vals[i];\n        vals[i] = tv;\n        i = m;\n      }\n      return [outK, outV];\n    }\n  };\n\n  // src/worker.ts\n  var ctx = self;\n  ctx.onmessage = (e) => {\n    const { id, map, edits, paint, base: cachedBase } = e.data;\n    const editsArr = edits ? new Int8Array(edits) : null;\n    const paintArr = paint ? new Uint8Array(paint) : null;\n    const base = cachedBase ? new Float32Array(cachedBase) : generateBase(map);\n    const terrain = composeTerrain(map, base, editsArr, paintArr);\n    const transfer = [\n      base.buffer,\n      terrain.height.buffer,\n      terrain.biome.buffer,\n      terrain.river.buffer,\n      terrain.lake.buffer\n    ];\n    ctx.postMessage({ id, base, terrain }, transfer);\n  };\n})();\n' : "";
      if (!code) return;
      this.workerUrl = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
      this.worker = new Worker(this.workerUrl);
      this.worker.onmessage = (e) => {
        const cb = this.workerReqs.get(e.data.id);
        if (cb) {
          this.workerReqs.delete(e.data.id);
          cb(e.data);
        }
      };
      this.worker.onerror = () => {
        this.worker = null;
      };
    } catch {
      this.worker = null;
    }
  }
  workerGenerate(needBase) {
    return new Promise((resolve) => {
      const id = ++this.workerReqId;
      this.workerReqs.set(id, resolve);
      const genMap = { width: this.map.width, height: this.map.height, gen: this.map.gen };
      const editsBuf = this.edits ? this.edits.buffer.slice(0) : null;
      const paintBuf = this.paint ? this.paint.buffer.slice(0) : null;
      const baseBuf = !needBase && this.baseHeight ? this.baseHeight.buffer.slice(0) : null;
      this.worker.postMessage({ id, map: genMap, edits: editsBuf, paint: paintBuf, base: baseBuf });
    });
  }
  /** Terrain regeneration — the heavy work (erosion, hydrology) runs async in the worker so the UI never freezes. */
  async regenerate() {
    const key = JSON.stringify([this.map.gen, this.map.width, this.map.height]);
    const needBase = !this.baseHeight || this.baseKey !== key;
    this.ensureWorker();
    if (this.worker) {
      const token = ++this.genToken;
      if (needBase) this.setHint("\uC9C0\uD615 \uC0DD\uC131 \uC911\u2026");
      let res;
      try {
        res = await this.workerGenerate(needBase);
      } catch {
        this.worker = null;
        this.regenSync(key, needBase);
        return;
      }
      if (token !== this.genToken || !this.ready) return;
      this.baseHeight = res.base;
      this.baseKey = key;
      this.terrain = res.terrain;
      if (needBase) this.setHint("");
    } else {
      this.regenSync(key, needBase);
      return;
    }
    this.finishRegen();
  }
  /** Synchronous fallback (environments without Worker support) */
  regenSync(key, needBase) {
    if (needBase) {
      this.baseHeight = generateBase(this.map);
      this.baseKey = key;
    }
    this.terrain = composeTerrain(this.map, this.baseHeight, this.edits, this.paint);
    this.finishRegen();
  }
  /** Shared pipeline after terrain computation (classification, contours, vectors, render) */
  finishRegen() {
    if (!this.terrain) return;
    this.classifier = new Classifier(this.map.gen, this.map.width, this.map.height);
    this.contours = extractContours(
      this.terrain.height,
      this.terrain.w,
      this.terrain.h,
      this.terrain.seaLevel,
      this.map.gen.precision
    );
    this.buildVectorPaths();
    this.fitCameraOnce();
    this.cacheValid = false;
    this.startProgressiveRender();
    this.draw();
    this.scheduleDetail();
    if (this.pendingFocusName) {
      const name = this.pendingFocusName;
      this.pendingFocusName = null;
      this.focusMarkerByName(name);
    }
  }
  /**
   * Tile-based progressive layer render.
   * Tiles nearest the viewport centre are drawn first, so even a large map fills in
   * gradually instead of freezing in one go.
   */
  startProgressiveRender() {
    if (!this.terrain) return;
    const t2 = this.terrain;
    const token = ++this.renderToken;
    if (this.renderRAF) cancelAnimationFrame(this.renderRAF);
    const layers = allocLayers(t2, this.renderOpts());
    this.layers = layers;
    const TILE = 192;
    const cols = Math.ceil(t2.w / TILE), rows = Math.ceil(t2.h / TILE);
    const { w: vw, h: vh } = this.viewSize();
    const c = this.toWorld(vw / 2, vh / 2);
    const ccx = c.x * cols, ccy = c.y * rows;
    const tiles = [];
    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        tiles.push({ tx, ty, d: Math.hypot(tx + 0.5 - ccx, ty + 0.5 - ccy) });
      }
    }
    tiles.sort((a, b) => a.d - b.d);
    let i = 0;
    const opts = this.renderOpts();
    const step = () => {
      if (token !== this.renderToken || this.terrain !== t2) return;
      const budgetEnd = performance.now() + 10;
      while (i < tiles.length && performance.now() < budgetEnd) {
        const { tx, ty } = tiles[i++];
        const x0 = tx * TILE, y0 = ty * TILE;
        const x1 = Math.min(t2.w - 1, x0 + TILE - 1), y1 = Math.min(t2.h - 1, y0 + TILE - 1);
        renderTile(layers, t2, this.map.style, opts, x0, y0, x1, y1);
      }
      this.draw();
      if (i < tiles.length) {
        this.renderRAF = requestAnimationFrame(step);
      } else {
        this.renderRAF = 0;
        this.setHint("");
      }
    };
    if (tiles.length > 12) this.setHint(`\uC9C0\uB3C4 \uB80C\uB354\uB9C1 \uC911\u2026 (${cols * rows} \uD0C0\uC77C)`);
    step();
  }
  regenDebounced(delay = 250) {
    if (this.regenTimer) window.clearTimeout(this.regenTimer);
    this.regenTimer = window.setTimeout(() => {
      this.regenTimer = null;
      this.regenerate();
    }, delay);
  }
  /** Vector line cache: hand-drawn (rough) bathymetry, major/minor contours, coastline, tapered rivers */
  buildVectorPaths() {
    const cs = this.contours;
    this.contourMinor = null;
    this.contourMajor = null;
    this.bathyPath = null;
    this.coastPath = null;
    this.hatchRows = null;
    this.landHatchRows = null;
    this.riverLines = [];
    if (!cs || !this.terrain) return;
    const sea = this.terrain.seaLevel;
    const seed = this.map.gen.seed;
    let sc = seed * 2 + 17;
    const bathy = new Path2D();
    const minor = new Path2D();
    const major = new Path2D();
    let hasBathy = false;
    let landIdx = 0;
    for (const level of cs.levels) {
      if (level.z < sea - 1e-9) {
        for (const ring of level.rings) {
          sketchToPath(bathy, roughRing(ring, 0.9, sc++), true);
          hasBathy = true;
        }
        continue;
      }
      if (Math.abs(level.z - sea) < 1e-9) {
        const coast = new Path2D();
        for (const ring of level.rings) {
          sketchToPath(coast, roughRing(ring, 1, sc), true);
          sketchToPath(coast, roughRing(ring, 0.7, sc + 5e3), true);
          sc++;
        }
        this.coastPath = coast;
        continue;
      }
      landIdx++;
      const target = landIdx % 3 === 0 ? major : minor;
      for (const ring of level.rings) {
        sketchToPath(target, roughRing(ring, landIdx % 3 === 0 ? 0.85 : 1, sc++), true);
      }
    }
    this.contourMinor = minor;
    this.contourMajor = major;
    this.bathyPath = hasBathy ? bathy : null;
    this.riverLines = [];
    const smoothed = [];
    for (const rv of this.terrain.rivers) {
      if (rv.pts.length < 3) {
        smoothed.push(null);
        continue;
      }
      const simplified = simplifyLine(rv.pts, 0.9);
      const sm = chaikin(roughLine(simplified, 0.95, sc++), 3, false);
      const widths = sm.map((_, i) => {
        const oi = Math.min(rv.widths.length - 1, Math.round(i / (sm.length - 1) * (rv.widths.length - 1)));
        return rv.widths[oi];
      });
      smoothed.push({ pts: sm, widths });
    }
    this.terrain.rivers.forEach((rv, idx) => {
      const line = smoothed[idx];
      if (!line || rv.joins === void 0) return;
      const parent = smoothed[rv.joins];
      if (!parent) return;
      const end = line.pts[line.pts.length - 1];
      let best = -1, bestD = Infinity;
      for (let k = 0; k < parent.pts.length; k++) {
        const dx = parent.pts[k][0] - end[0], dy = parent.pts[k][1] - end[1];
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      }
      if (best >= 0 && bestD < 25) {
        line.pts[line.pts.length - 1] = [parent.pts[best][0], parent.pts[best][1]];
      }
    });
    for (const l of smoothed) if (l) this.riverLines.push(l);
  }
  /**
   * Vector ink-line render (shared by draw & export). unit = screen pixels per cell
   * (draw: cam.scale, export: scale). Contours and coastline use a bleed undercoat +
   * main stroke; rivers are variable-width brush ribbons.
   */
  drawVectorLines(ctx, pal, unit) {
    const px = (target) => target / unit;
    const cl = pal.coastline;
    const cc = this.map.style === "color" ? "40,48,44" : `${cl[0]},${cl[1]},${cl[2]}`;
    if (this.map.showContours && this.bathyPath) {
      ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.08)`;
      ctx.lineWidth = px(0.7);
      ctx.stroke(this.bathyPath);
    }
    if (this.map.showContours) {
      if (this.contourMinor) {
        ctx.strokeStyle = `rgba(${cc},0.05)`;
        ctx.lineWidth = px(2);
        ctx.stroke(this.contourMinor);
        ctx.strokeStyle = `rgba(${cc},0.16)`;
        ctx.lineWidth = px(0.6);
        ctx.stroke(this.contourMinor);
      }
      if (this.contourMajor) {
        ctx.strokeStyle = `rgba(${cc},0.07)`;
        ctx.lineWidth = px(2.6);
        ctx.stroke(this.contourMajor);
        ctx.strokeStyle = `rgba(${cc},0.26)`;
        ctx.lineWidth = px(0.9);
        ctx.stroke(this.contourMajor);
      }
    }
    if (this.map.coastHatching || this.map.landHatching) {
      if (!this.hatchRows) this.buildCoastHatch();
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = px(0.55);
      if (this.map.coastHatching && this.hatchRows) {
        this.hatchRows.forEach((row, k) => {
          ctx.setLineDash([5.2, 3]);
          ctx.lineDashOffset = k * 2.9;
          ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},${row.alpha})`;
          ctx.stroke(row.path);
        });
      }
      if (this.map.landHatching && this.landHatchRows) {
        this.landHatchRows.forEach((row, k) => {
          ctx.setLineDash([4.2, 2.6]);
          ctx.lineDashOffset = k * 2.3 + 1.4;
          ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},${row.alpha})`;
          ctx.stroke(row.path);
        });
      }
      ctx.restore();
    }
    if (this.coastPath) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.12)`;
      ctx.lineWidth = px(2.1);
      ctx.stroke(this.coastPath);
      ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.9)`;
      ctx.lineWidth = px(0.95);
      ctx.stroke(this.coastPath);
    }
    if (this.riverLines.length > 0) {
      const ck = pal.coastline;
      const oc = pal.ocean;
      const isInk = this.map.style === "ink";
      const wAt = (i, n, wArr) => {
        const baseW = Math.min(3, wArr[Math.min(wArr.length - 1, i)] * 0.5 + 0.1);
        const taper = Math.min(1, i / Math.min(5, n - 1));
        return baseW * taper;
      };
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const wr = Math.round(oc[0] * 0.72 + ck[0] * 0.28);
      const wg = Math.round(oc[1] * 0.74 + ck[1] * 0.26);
      const wb = Math.round(oc[2] * 0.78 + ck[2] * 0.22);
      for (const rl of this.riverLines) {
        if (rl.pts.length < 3) continue;
        const n = rl.pts.length;
        ctx.fillStyle = isInk ? `rgba(${ck[0]},${ck[1]},${ck[2]},0.06)` : `rgba(${wr},${wg},${wb},0.2)`;
        ctx.fill(ribbonPath(rl.pts, (t2) => {
          const i = Math.round(t2 * (n - 1));
          return wAt(i, n, rl.widths) * 1.9 * unit + 0.25;
        }));
      }
      const dr = Math.round(pal.deep[0] * 0.62);
      const dg = Math.round(pal.deep[1] * 0.66);
      const db = Math.round(pal.deep[2] * 0.78);
      for (const rl of this.riverLines) {
        if (rl.pts.length < 3) continue;
        const n = rl.pts.length;
        ctx.fillStyle = isInk ? `rgba(${ck[0]},${ck[1]},${ck[2]},0.34)` : `rgba(${dr},${dg},${db},0.5)`;
        ctx.fill(ribbonPath(rl.pts, (t2) => {
          const i = Math.round(t2 * (n - 1));
          return wAt(i, n, rl.widths) * 0.8 * unit + 0.15;
        }));
      }
    }
  }
  /** Rhumb lines (radiating from the compass) — shared by draw() and exportPNG. Call within a world-space context */
  drawRhumbLines(ctx, W, H, s, pal) {
    if (!this.map.showRhumbLines) return;
    const compasses = this.map.ornaments.filter((orn) => orn.type === "compass");
    if (compasses.length === 0) return;
    ctx.save();
    ctx.lineWidth = Math.max(0.3, 0.55 / s);
    const R_max = Math.max(W, H) * 2.2;
    const cl = pal.coastline;
    const inkRGB = `rgba(${cl[0]},${cl[1]},${cl[2]}`;
    const isColor = this.map.style === "color";
    const isInk = this.map.style === "ink";
    for (const comp of compasses) {
      const ccx = comp.x * W, ccy = comp.y * H;
      for (let d = 0; d < 32; d++) {
        const rad = d * Math.PI * 2 / 32;
        const dx = Math.cos(rad) * R_max, dy = Math.sin(rad) * R_max;
        if (d % 8 === 0) {
          ctx.strokeStyle = `${inkRGB},0.42)`;
        } else if (d % 4 === 0) {
          ctx.strokeStyle = `${inkRGB},0.30)`;
        } else if (d % 2 === 0) {
          ctx.strokeStyle = isColor ? "rgba(42,90,138,0.28)" : isInk ? `${inkRGB},0.22)` : "rgba(80,105,70,0.26)";
        } else {
          ctx.strokeStyle = isColor ? "rgba(138,28,28,0.22)" : isInk ? `${inkRGB},0.16)` : "rgba(128,60,45,0.20)";
        }
        ctx.beginPath();
        ctx.moveTo(ccx, ccy);
        ctx.lineTo(ccx + dx, ccy + dy);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // ── Full-map pixel cache ─────────────────────────────
  /** Schedule a full-map re-render when terrain data changes. Never called for pan/zoom. */
  scheduleDetail() {
    this.cacheValid = false;
    if (this.detailTimer) window.clearTimeout(this.detailTimer);
    if (this.map.mode !== "generated" || this.map.fastRender) return;
    this.detailTimer = window.setTimeout(() => {
      this.detailTimer = null;
      this.renderDetail();
    }, 180);
  }
  /**
   * Render the entire map once at CACHE_SCALE and store it in fullDetailCanvas.
   * From then on, pan/zoom/scroll just crop this canvas in draw() — no flicker.
   */
  renderDetail() {
    const t2 = this.terrain, cls = this.classifier;
    if (!t2 || !cls || this.map.mode !== "generated") {
      this.cacheValid = false;
      return;
    }
    const SCALE = 3;
    const CW = t2.w * SCALE, CH = t2.h * SCALE;
    if (!this.fullDetailCanvas) this.fullDetailCanvas = document.createElement("canvas");
    const dc = this.fullDetailCanvas;
    dc.width = CW;
    dc.height = CH;
    const dctx = dc.getContext("2d");
    const img = dctx.createImageData(CW, CH);
    const px = img.data;
    const pal = getPalette(this.map.style, this.map.styleColors);
    const W = t2.w, H = t2.h, sea = t2.seaLevel;
    const relief = this.map.texture.relief ?? 1;
    const mottleAmt = this.map.texture.mottle ?? 1;
    const grain = pal.paperGrain;
    const hAt = (cx, cy) => {
      const x0 = Math.max(0, Math.min(W - 1, Math.floor(cx))), y0 = Math.max(0, Math.min(H - 1, Math.floor(cy)));
      const x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
      const tx = cx - x0, ty = cy - y0;
      const a = t2.height[y0 * W + x0], b = t2.height[y0 * W + x1], c = t2.height[y1 * W + x0], d = t2.height[y1 * W + x1];
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    };
    const coastW2 = Math.max(0, Math.min(12, Math.round(this.map.coastWidth ?? 0)));
    const coastRGB2 = this.map.coastColor && hexToRGB(this.map.coastColor) || [Math.min(255, pal.ocean[0] * 1.16), Math.min(255, pal.ocean[1] * 1.14), Math.min(255, pal.ocean[2] * 1.1)];
    const wd = this.layers ? this.layers.waterDist : null;
    const dAt = (cx, cy) => {
      if (!wd) return 255;
      const x0 = Math.max(0, Math.min(W - 1, Math.floor(cx))), y0 = Math.max(0, Math.min(H - 1, Math.floor(cy)));
      const x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
      const tx = cx - x0, ty = cy - y0;
      const M2 = Math.max(COAST_RING_MAX, coastW2 * 3) + 2;
      const a = Math.min(M2, wd[y0 * W + x0]), b = Math.min(M2, wd[y0 * W + x1]);
      const c = Math.min(M2, wd[y1 * W + x0]), d = Math.min(M2, wd[y1 * W + x1]);
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    };
    const biomeColorAt = (cx, cy) => {
      let rSum = 0, gSum = 0, bSum = 0, wSum = 0;
      const xCenter = Math.round(cx), yCenter = Math.round(cy);
      for (let dy = -1; dy <= 1; dy++) {
        const y = Math.max(0, Math.min(H - 1, yCenter + dy));
        const distY = cy - y;
        for (let dx = -1; dx <= 1; dx++) {
          const x = Math.max(0, Math.min(W - 1, xCenter + dx));
          const distX = cx - x;
          const weight = Math.exp(-(distX * distX + distY * distY) * 1.4);
          const col = biomeColor(pal, t2.biome[y * W + x]);
          rSum += col[0] * weight;
          gSum += col[1] * weight;
          bSum += col[2] * weight;
          wSum += weight;
        }
      }
      return [rSum / wSum, gSum / wSum, bSum / wSum];
    };
    for (let j = 0; j < CH; j++) {
      const cyf = j / SCALE;
      for (let i = 0; i < CW; i++) {
        const cxf = i / SCALE;
        const o = (j * CW + i) * 4;
        const el = hAt(cxf, cyf);
        const ci = Math.min(H - 1, Math.round(cyf)) * W + Math.min(W - 1, Math.round(cxf));
        const col = biomeColorAt(cxf, cyf);
        let r, g, bl;
        if (el < sea || t2.lake[ci]) {
          const rawDepth = Math.min(1, Math.max(0, (sea - el) / 0.25));
          const depth = t2.lake[ci] ? 0.4 : 0.22 + 0.78 * Math.pow(rawDepth, 0.7);
          r = col[0] + (pal.deep[0] - pal.ocean[0]) * depth;
          g = col[1] + (pal.deep[1] - pal.ocean[1]) * depth;
          bl = col[2] + (pal.deep[2] - pal.ocean[2]) * depth;
          const dHere = dAt(cxf, cyf);
          if (coastW2 > 0 && !t2.lake[ci] && dHere <= coastW2 * 3) {
            const f = Math.exp(-(dHere - 1) / (coastW2 * 0.9)) * 0.38;
            r += (coastRGB2[0] - r) * f;
            g += (coastRGB2[1] - g) * f;
            bl += (coastRGB2[2] - bl) * f;
          }
          const ex = oceanExtraShade(cxf, cyf, dHere);
          r += ex;
          g += ex * 0.98;
          bl += ex * 0.9;
        } else {
          const hl = hAt(cxf - 1 / SCALE, cyf), hu = hAt(cxf, cyf - 1 / SCALE);
          const shade = 1 + (hl - el + hu - el) * 4.2 * relief;
          const sc = Math.min(1 + 0.22 * relief, Math.max(1 - 0.22 * relief, shade));
          r = col[0] * sc;
          g = col[1] * sc;
          bl = col[2] * sc;
          if (t2.biome[ci] !== B.SNOW) {
            const wash = landWash(cxf, cyf);
            r += wash[0];
            g += wash[1];
            bl += wash[2];
          }
        }
        const isWater = el < sea || t2.lake[ci];
        const mottleScale = isWater ? 0.45 : 1;
        const mottle = (smoothVal(cxf + 300, cyf + 300, 13) - 0.5) * 22 * mottleAmt * mottleScale;
        r += mottle;
        g += mottle * 0.95;
        bl += mottle * 0.82;
        if (grain > 0) {
          const gg = (hash2(i + 9973, j + 7691) - 0.5) * grain * (isWater ? 0.5 : 1);
          r += gg;
          g += gg;
          bl += gg;
        }
        px[o] = r < 0 ? 0 : r > 255 ? 255 : r;
        px[o + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        px[o + 2] = bl < 0 ? 0 : bl > 255 ? 255 : bl;
        px[o + 3] = 255;
      }
    }
    dctx.putImageData(img, 0, 0);
    if (this.layers) {
      dctx.save();
      dctx.scale(SCALE, SCALE);
      dctx.drawImage(this.layers.stamps, 0, 0, W, H);
      this.drawVectorLines(dctx, pal, 1);
      dctx.restore();
    }
    this.cacheValid = true;
    this.draw();
  }
  // ── Instant brush (incremental updates) ──────────────
  /** Recompute terrain & pixels for the brushed area only — a few ms mid-stroke for instant feedback */
  patchRect(r) {
    if (!this.terrain || !this.baseHeight || !this.classifier || !this.layers) return;
    updateTerrainRect(
      this.terrain,
      this.map,
      this.baseHeight,
      this.edits,
      this.paint,
      this.classifier,
      r.x0,
      r.y0,
      r.x1,
      r.y1
    );
    updateLayersRect(this.layers, this.terrain, this.map.style, this.renderOpts(), r.x0, r.y0, r.x1, r.y1);
    this.cacheValid = false;
    this.draw();
    this.scheduleFinalize();
  }
  /** Full recomputation, including rivers and contours, after the brush lifts */
  scheduleFinalize() {
    if (this.finalizeTimer) window.clearTimeout(this.finalizeTimer);
    this.finalizeTimer = window.setTimeout(() => {
      this.finalizeTimer = null;
      this.regenerate();
    }, 350);
  }
  brushRect(sx, sy) {
    const W = this.map.width, H = this.map.height;
    const wpos = this.toWorld(sx, sy);
    const cx = wpos.x * W, cy = wpos.y * H;
    const r = this.brushRadius / this.cam.scale;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
    if (x0 > x1 || y0 > y1) return null;
    return { x0, y0, x1, y1 };
  }
  applyBrush(sx, sy) {
    const rect = this.brushRect(sx, sy);
    if (!rect) return;
    if (!this.edits) this.edits = new Int8Array(this.map.width * this.map.height);
    const W = this.map.width;
    const wpos = this.toWorld(sx, sy);
    const cx = wpos.x * W, cy = wpos.y * this.map.height;
    const r = this.brushRadius / this.cam.scale;
    const sign = this.tool === "raise" ? 1 : -1;
    for (let y = rect.y0; y <= rect.y1; y++) {
      for (let x = rect.x0; x <= rect.x1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > r) continue;
        const fall = Math.cos(d / r * Math.PI * 0.5);
        const i = y * W + x;
        this.edits[i] = clampI8(this.edits[i] + sign * fall * 4);
      }
    }
    this.patchRect(rect);
  }
  /** Biome paint — when water↔land flips, the elevation delta is corrected as well */
  applyPaintBrush(sx, sy) {
    if (!this.terrain) return;
    const rect = this.brushRect(sx, sy);
    if (!rect) return;
    const W = this.map.width, H = this.map.height;
    if (!this.paint) this.paint = new Uint8Array(W * H);
    if (!this.edits) this.edits = new Int8Array(W * H);
    const wpos = this.toWorld(sx, sy);
    const cx = wpos.x * W, cy = wpos.y * H;
    const r = this.brushRadius / this.cam.scale;
    const sea = this.map.gen.seaLevel;
    const toWater = this.paintBiome === B.OCEAN;
    for (let y = rect.y0; y <= rect.y1; y++) {
      for (let x = rect.x0; x <= rect.x1; x++) {
        if (Math.hypot(x - cx, y - cy) > r) continue;
        const i = y * W + x;
        if (this.paintErase) {
          this.paint[i] = 0;
          continue;
        }
        this.paint[i] = this.paintBiome + 1;
        const cur = this.terrain.height[i];
        if (toWater && cur >= sea) {
          this.edits[i] = clampI8(this.edits[i] - Math.ceil((cur - (sea - 0.05)) * 254));
        } else if (!toWater && cur < sea) {
          this.edits[i] = clampI8(this.edits[i] + Math.ceil((sea + 0.04 - cur) * 254));
        }
      }
    }
    this.patchRect(rect);
  }
  // ── Image mode ───────────────────────────────────────
  async loadBaseImage(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian2.TFile)) {
      new import_obsidian2.Notice(`\uC774\uBBF8\uC9C0\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${path}`);
      return;
    }
    const buf = await this.app.vault.readBinary(file);
    if (this.imageUrl) URL.revokeObjectURL(this.imageUrl);
    this.imageUrl = URL.createObjectURL(new Blob([buf]));
    const img = new Image();
    img.onload = () => {
      this.baseImage = img;
      this.map.width = img.naturalWidth;
      this.map.height = img.naturalHeight;
      this.terrain = null;
      this.layers = null;
      this.fitCameraOnce();
      this.draw();
    };
    img.src = this.imageUrl;
  }
  worldSize() {
    if (this.map.mode === "image" && this.baseImage) {
      return { w: this.baseImage.naturalWidth, h: this.baseImage.naturalHeight };
    }
    return { w: this.map.width, h: this.map.height };
  }
  viewSize() {
    return { w: this.rootEl.clientWidth, h: this.rootEl.clientHeight };
  }
  fitCameraOnce() {
    if (this.camFitted) return;
    const { w: vw, h: vh } = this.viewSize();
    if (vw === 0 || vh === 0) return;
    const { w, h } = this.worldSize();
    const scale = Math.min(vw / w, vh / h) * 0.92;
    this.cam.scale = scale;
    this.cam.x = (vw - w * scale) / 2;
    this.cam.y = (vh - h * scale) / 2;
    this.camFitted = true;
  }
  handleResize() {
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = this.viewSize();
    this.canvasEl.width = Math.max(1, Math.round(w * dpr));
    this.canvasEl.height = Math.max(1, Math.round(h * dpr));
    this.canvasEl.style.width = `${w}px`;
    this.canvasEl.style.height = `${h}px`;
    this.fitCameraOnce();
    this.draw();
  }
  // ── Drawing ──────────────────────────────────────────
  draw() {
    const dpr = window.devicePixelRatio || 1;
    const { w: vw, h: vh } = this.viewSize();
    if (vw === 0 || vh === 0) return;
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = this.map.style === "color" ? "#171c24" : "#3a362f";
    ctx.fillRect(0, 0, vw, vh);
    const { w: W, h: H } = this.worldSize();
    const { x: ox, y: oy, scale: s } = this.cam;
    const pal = getPalette(this.map.style, this.map.styleColors);
    const ink = `rgb(${pal.coastline[0]},${pal.coastline[1]},${pal.coastline[2]})`;
    const useCache = this.cacheValid && this.fullDetailCanvas !== null && !this.map.fastRender;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    ctx.imageSmoothingEnabled = true;
    if (this.map.mode === "image" && this.baseImage) {
      ctx.drawImage(this.baseImage, 0, 0);
    } else if (this.layers) {
      if (useCache) {
        ctx.restore();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const SCALE = 3;
        const cdc = this.fullDetailCanvas;
        const cellX0 = -ox / s, cellY0 = -oy / s;
        const cellX1 = cellX0 + vw / s, cellY1 = cellY0 + vh / s;
        const sx = Math.max(0, cellX0 * SCALE);
        const sy = Math.max(0, cellY0 * SCALE);
        const sx2 = Math.min(cdc.width, cellX1 * SCALE);
        const sy2 = Math.min(cdc.height, cellY1 * SCALE);
        const dstX = (sx / SCALE * s + ox) * dpr;
        const dstY = (sy / SCALE * s + oy) * dpr;
        const dstW = (sx2 - sx) / SCALE * s * dpr;
        const dstH = (sy2 - sy) / SCALE * s * dpr;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        if (dstW > 0 && dstH > 0) ctx.drawImage(cdc, sx, sy, sx2 - sx, sy2 - sy, dstX, dstY, dstW, dstH);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(s, s);
        ctx.imageSmoothingEnabled = true;
      } else {
        ctx.drawImage(this.layers.base, 0, 0);
        ctx.drawImage(this.layers.stamps, 0, 0, this.map.width, this.map.height);
        this.drawVectorLines(ctx, pal, s);
      }
      this.drawRhumbLines(ctx, W, H, s, pal);
      drawMapEffects(ctx, W, H, s, pal.coastline, this.map.decor, this.map.style);
      if (this.map.showGrid) drawCoordinateGrid(ctx, W, H, s, pal.coastline);
    } else if (this.map.mode === "image" && this.baseImage && this.map.showGrid) {
      drawCoordinateGrid(ctx, W, H, s, pal.coastline);
    }
    ctx.restore();
    this.applyPaperGrain(ctx, ox, oy, vw, vh);
    this.drawRegions(ctx, W, H, s, ox, oy);
    this.drawAnnotations(ctx, W, H, s, ox, oy);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    this.ensureStickerImages();
    this.ornBoxes = drawOrnaments(ctx, this.map.ornaments, W, H, s, pal.coastline, this.map.style, this.stickerImages);
    ctx.restore();
    this.drawMarkers(ctx, W, H, s, ox, oy, vw, vh);
    this.drawOrnSelection(ctx, W, H, s, ox, oy);
    this.drawOverlays(ctx, W, H, s, ox, oy);
    this.refreshOrnListActive();
  }
  /** Lay the paper grain in screen space, offset by the pan so the paper appears stuck to the map */
  applyPaperGrain(ctx, ox, oy, vw, vh) {
    if (this.map.mode !== "generated") return;
    if (!this.grainPattern) {
      this.grainPattern = ctx.createPattern(paperGrainTile(), "repeat");
    }
    if (!this.grainPattern) return;
    const g = this.map.texture.grain ?? 0.5;
    if (g <= 1e-3) return;
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = Math.min(1, g);
    const offx = (ox % GRAIN_TILE + GRAIN_TILE) % GRAIN_TILE;
    const offy = (oy % GRAIN_TILE + GRAIN_TILE) % GRAIN_TILE;
    ctx.translate(offx - GRAIN_TILE, offy - GRAIN_TILE);
    ctx.fillStyle = this.grainPattern;
    ctx.fillRect(0, 0, vw + GRAIN_TILE * 2, vh + GRAIN_TILE * 2);
    ctx.restore();
  }
  /** Dashed box + resize handle for the selected placed element (screen coordinates) */
  drawOrnSelection(ctx, W, H, s, ox, oy) {
    if (!this.selectedOrnId) return;
    const box = this.ornBoxes.get(this.selectedOrnId);
    if (!box) return;
    const x = box.x * s + ox, y = box.y * s + oy;
    const w = box.w * s, h = box.h * s;
    ctx.strokeStyle = "rgba(232,182,76,0.95)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
    ctx.setLineDash([]);
    ctx.fillStyle = "#e8b64c";
    ctx.strokeStyle = "#3a3226";
    ctx.beginPath();
    ctx.rect(x + w - 1, y + h - 1, 9, 9);
    ctx.fill();
    ctx.stroke();
  }
  drawRegions(ctx, W, H, s, ox, oy) {
    for (const rg of this.map.regions) {
      if (rg.points.length < 3) continue;
      const selected = rg.id === this.selectedRegionId;
      ctx.beginPath();
      rg.points.forEach(([px, py], idx) => {
        const sx = px * W * s + ox, sy = py * H * s + oy;
        idx === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.fillStyle = hexToRgba(rg.color, selected ? 0.28 : 0.18);
      ctx.fill();
      ctx.strokeStyle = "rgba(28,22,14,0.5)";
      ctx.lineWidth = (selected ? 2.6 : 2) + 1.6;
      ctx.stroke();
      ctx.strokeStyle = hexToRgba(rg.color, 0.95);
      ctx.lineWidth = selected ? 2.6 : 2;
      ctx.setLineDash([7, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      const [cx, cy] = centroid(rg.points);
      const lx = cx * W * s + ox, ly = cy * H * s + oy;
      ctx.font = `600 13px ${FONT_SERIF}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const tw = ctx.measureText(rg.name).width;
      ctx.fillStyle = "rgba(28,24,18,0.72)";
      ctx.fillRect(lx - tw / 2 - 7, ly - 10, tw + 14, 20);
      ctx.fillStyle = "#f0e8d4";
      ctx.fillText(rg.name, lx, ly);
      if (selected) {
        for (const [px, py] of rg.points) {
          const hx = px * W * s + ox, hy = py * H * s + oy;
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = rg.color;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.rect(hx - 4, hy - 4, 8, 8);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
    if (this.drawingRegion && this.drawingRegion.length > 0) {
      ctx.beginPath();
      this.drawingRegion.forEach(([px, py], idx) => {
        const sx = px * W * s + ox, sy = py * H * s + oy;
        idx === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      });
      ctx.strokeStyle = "#e8b64c";
      ctx.lineWidth = 2;
      ctx.stroke();
      for (const [px, py] of this.drawingRegion) {
        ctx.beginPath();
        ctx.arc(px * W * s + ox, py * H * s + oy, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#e8b64c";
        ctx.fill();
      }
    }
  }
  drawAnnotations(ctx, W, H, s, ox, oy) {
    const list = this.currentAnno ? [...this.map.annotations, this.currentAnno] : this.map.annotations;
    for (const a of list) {
      if (a.points.length < 2) continue;
      const px = a.points.map(([x, y]) => [x * W * s + ox, y * H * s + oy]);
      if (a.id === this.selectedAnnoId) {
        ctx.save();
        ctx.strokeStyle = "rgba(232,182,76,0.6)";
        ctx.lineWidth = a.width * s + 6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const hp = new Path2D();
        px.forEach(([x, y], i) => i === 0 ? hp.moveTo(x, y) : hp.lineTo(x, y));
        ctx.stroke(hp);
        ctx.restore();
      }
      strokeAnnotationPx(ctx, a, px, a.width * s);
    }
  }
  /**
   * Marker badge diameter (px). Proportional to the map (WYSIWYG) — unit = screen px per cell.
   * The editor (unit = cam.scale) and export (unit = export scale) share the same formula.
   */
  markerSizePx(m, unit) {
    const { w: W, h: H } = this.worldSize();
    const base = Math.min(W, H) * 0.03 * (this.map.texture.markerScale ?? 1) * (m.size ?? 1);
    return base * unit;
  }
  /** Draw one marker in pixel space (shared by editor & export) */
  paintMarker(ctx, m, sx, sy, size, bold) {
    drawMarkerIcon(ctx, m.icon, sx, sy, size, m.color, this.map.style);
    if (m.name) {
      const fs = Math.max(9, size * 0.44);
      const pal = getPalette(this.map.style, this.map.styleColors);
      const cl = pal.coastline;
      const y = sy + size * 0.18 + fs * 0.62;
      ctx.save();
      ctx.font = `${bold ? "700" : "600"} ${fs}px ${FONT_SERIF}`;
      try {
        ctx.letterSpacing = `${fs * 0.1}px`;
      } catch {
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.strokeStyle = this.map.style === "color" ? "rgba(250,252,255,0.85)" : "rgba(244,236,214,0.85)";
      ctx.lineWidth = Math.max(2.5, fs * 0.3);
      ctx.strokeText(m.name, sx, y);
      ctx.fillStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},${bold ? 1 : 0.92})`;
      ctx.fillText(m.name, sx, y);
      ctx.restore();
    }
  }
  drawMarkers(ctx, W, H, s, ox, oy, vw, vh) {
    for (const m of this.map.markers) {
      const sx = m.x * W * s + ox, sy = m.y * H * s + oy;
      if (sx < -80 || sy < -80 || sx > vw + 80 || sy > vh + 80) continue;
      const hover = m.id === this.hoverMarkerId;
      let size = this.markerSizePx(m, s) * (hover ? 1.12 : 1);
      if (this.flash && Math.abs(this.flash.x - m.x) < 1e-6 && Math.abs(this.flash.y - m.y) < 1e-6) {
        const el = (performance.now() - this.flash.t0) / 1e3;
        size += Math.max(0, Math.sin(el * Math.PI * 3) * size * 0.3 * (1 - el / 2.2));
      }
      this.paintMarker(ctx, m, sx, sy, size, hover);
    }
  }
  drawOverlays(ctx, W, H, s, ox, oy) {
    if (this.flash) {
      const el = (performance.now() - this.flash.t0) / 2200;
      if (el < 1) {
        const sx = this.flash.x * W * s + ox, sy = this.flash.y * H * s + oy - 17;
        for (let k = 0; k < 3; k++) {
          const p = el * 1.4 - k * 0.18;
          if (p < 0 || p > 1) continue;
          ctx.beginPath();
          ctx.arc(sx, sy, 14 + p * 52, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(232,182,76,${(1 - p) * 0.9})`;
          ctx.lineWidth = 3.2 - p * 2;
          ctx.stroke();
        }
        const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 34);
        g.addColorStop(0, `rgba(232,182,76,${0.32 * (1 - el)})`);
        g.addColorStop(1, "rgba(232,182,76,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, 34, 0, Math.PI * 2);
        ctx.fill();
        window.requestAnimationFrame(() => this.draw());
      } else {
        this.flash = null;
      }
    }
    if ((this.tool === "raise" || this.tool === "lower" || this.tool === "paint") && this.map.mode === "generated") {
      ctx.beginPath();
      ctx.arc(this.lastPointer.x, this.lastPointer.y, this.brushRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(232,182,76,0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  // ── Coordinates / hit testing ────────────────────────
  toWorld(sx, sy) {
    const { w: W, h: H } = this.worldSize();
    return {
      x: (sx - this.cam.x) / this.cam.scale / W,
      y: (sy - this.cam.y) / this.cam.scale / H
    };
  }
  hitMarker(sx, sy) {
    const { w: W, h: H } = this.worldSize();
    for (let i = this.map.markers.length - 1; i >= 0; i--) {
      const m = this.map.markers[i];
      const sizePx = this.markerSizePx(m, this.cam.scale);
      const mx = m.x * W * this.cam.scale + this.cam.x;
      const my = m.y * H * this.cam.scale + this.cam.y;
      if (Math.hypot(sx - mx, sy - (my - sizePx * 0.78)) < Math.max(12, sizePx * 0.7)) return m;
    }
    return null;
  }
  hitRegion(x, y) {
    for (let i = this.map.regions.length - 1; i >= 0; i--) {
      if (pointInPolygon(x, y, this.map.regions[i].points)) return this.map.regions[i];
    }
    return null;
  }
  /** Eraser: delete the annotation under the cursor */
  eraseAnnoAt(sx, sy) {
    const a = this.hitAnnotation(sx, sy);
    if (a) {
      this.map.annotations = this.map.annotations.filter((an) => an.id !== a.id);
      if (this.selectedAnnoId === a.id) this.selectedAnnoId = null;
      this.persist();
    }
  }
  /** Annotation (drawing) hit test (screen coordinates) */
  hitAnnotation(sx, sy) {
    const { w: W, h: H } = this.worldSize();
    const s = this.cam.scale;
    for (let i = this.map.annotations.length - 1; i >= 0; i--) {
      const a = this.map.annotations[i];
      const px = a.points.map(([x, y]) => [x * W * s + this.cam.x, y * H * s + this.cam.y]);
      if (px.length >= 2 && distToPolyline(sx, sy, px) < Math.max(7, a.width * s * 0.6 + 5)) return a;
    }
    return null;
  }
  /** Placed-element hit test (screen coordinates → world bbox) */
  hitOrnament(sx, sy) {
    const { w: W, h: H } = this.worldSize();
    const wx = (sx - this.cam.x) / this.cam.scale;
    const wy = (sy - this.cam.y) / this.cam.scale;
    for (let i = this.map.ornaments.length - 1; i >= 0; i--) {
      const orn = this.map.ornaments[i];
      const box = this.ornBoxes.get(orn.id);
      if (!box) continue;
      if (wx >= box.x && wx <= box.x + box.w && wy >= box.y && wy <= box.y + box.h) return orn;
    }
    return null;
  }
  /** Hit test for the selected element's resize handle (screen coordinates) */
  hitOrnHandle(sx, sy) {
    if (!this.selectedOrnId) return null;
    const orn = this.map.ornaments.find((o) => o.id === this.selectedOrnId);
    const box = orn ? this.ornBoxes.get(orn.id) : null;
    if (!orn || !box) return null;
    const hx = (box.x + box.w) * this.cam.scale + this.cam.x;
    const hy = (box.y + box.h) * this.cam.scale + this.cam.y;
    return Math.hypot(sx - hx - 4, sy - hy - 4) < 10 ? orn : null;
  }
  /** Hit test for the selected region's vertices (screen coordinates) */
  hitRegionVertex(sx, sy) {
    if (!this.selectedRegionId) return null;
    const rg = this.map.regions.find((r) => r.id === this.selectedRegionId);
    if (!rg) return null;
    const { w: W, h: H } = this.worldSize();
    for (let i = 0; i < rg.points.length; i++) {
      const hx = rg.points[i][0] * W * this.cam.scale + this.cam.x;
      const hy = rg.points[i][1] * H * this.cam.scale + this.cam.y;
      if (Math.hypot(sx - hx, sy - hy) < 8) return { region: rg, idx: i };
    }
    return null;
  }
  // ── Events ───────────────────────────────────────────
  bindEvents() {
    const el = this.canvasEl;
    this.registerDomEvent(el, "wheel", (e) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 15e-4);
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const ns = Math.min(40, Math.max(0.05, this.cam.scale * factor));
      this.cam.x = mx - (mx - this.cam.x) * (ns / this.cam.scale);
      this.cam.y = my - (my - this.cam.y) * (ns / this.cam.scale);
      this.cam.scale = ns;
      this.draw();
    }, { passive: false });
    this.registerDomEvent(el, "pointerdown", (e) => {
      if (e.button === 2) return;
      el.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      this.lastPointer = { x: sx, y: sy };
      this.dragMoved = false;
      if (this.tool === "select") {
        const m = this.hitMarker(sx, sy);
        if (m) {
          this.dragMode = "marker";
          this.dragMarkerId = m.id;
          return;
        }
        const handleOrn = this.hitOrnHandle(sx, sy);
        if (handleOrn) {
          const box = this.ornBoxes.get(handleOrn.id);
          const ccx = (box.x + box.w / 2) * this.cam.scale + this.cam.x;
          const ccy = (box.y + box.h / 2) * this.cam.scale + this.cam.y;
          this.dragMode = "ornResize";
          this.dragOrnId = handleOrn.id;
          this.ornStart = {
            x: ccx,
            y: ccy,
            sizeF: handleOrn.sizeF,
            dist: Math.max(4, Math.hypot(sx - ccx, sy - ccy))
          };
          return;
        }
        const orn = this.hitOrnament(sx, sy);
        if (orn) {
          this.selectedOrnId = orn.id;
          this.selectedRegionId = null;
          this.dragMode = "ornMove";
          this.dragOrnId = orn.id;
          this.dragStartWorld = this.toWorld(sx, sy);
          this.ornStart = { x: orn.x, y: orn.y, sizeF: orn.sizeF, dist: 1 };
          this.setHint("\uB4DC\uB798\uADF8: \uC774\uB3D9 \xB7 \uBAA8\uC11C\uB9AC \uD578\uB4E4: \uD06C\uAE30 \xB7 \uB354\uBE14\uD074\uB9AD: \uD14D\uC2A4\uD2B8 \uD3B8\uC9D1 \xB7 Delete: \uC0AD\uC81C");
          this.draw();
          return;
        }
        const vtx = this.hitRegionVertex(sx, sy);
        if (vtx) {
          this.dragMode = "regionVertex";
          this.dragRegionId = vtx.region.id;
          this.dragVertexIdx = vtx.idx;
          return;
        }
        const wpos = this.toWorld(sx, sy);
        const rg = this.hitRegion(wpos.x, wpos.y);
        if (rg) {
          this.selectedRegionId = rg.id;
          this.dragMode = "regionMove";
          this.dragRegionId = rg.id;
          this.dragStartWorld = wpos;
          this.dragOrigPoints = rg.points.map((p) => [...p]);
          this.setHint("\uC9C0\uC5ED \uB4DC\uB798\uADF8: \uC774\uB3D9 \xB7 \uAF2D\uC9D3\uC810 \uB4DC\uB798\uADF8: \uBAA8\uC591 \uC218\uC815 \xB7 \uC6B0\uD074\uB9AD: \uBA54\uB274");
          this.draw();
          return;
        }
        const anno = this.hitAnnotation(sx, sy);
        if (anno) {
          this.selectedAnnoId = anno.id;
          this.selectedRegionId = null;
          this.selectedOrnId = null;
          this.dragMode = "annoMove";
          this.dragAnnoId = anno.id;
          this.dragStartWorld = this.toWorld(sx, sy);
          this.dragAnnoOrig = anno.points.map((p) => [...p]);
          this.setHint("\uB4DC\uB798\uADF8: \uC774\uB3D9 \xB7 Delete: \uC0AD\uC81C");
          this.draw();
          return;
        }
        if (this.selectedRegionId || this.selectedOrnId || this.selectedAnnoId) {
          this.selectedRegionId = null;
          this.selectedOrnId = null;
          this.selectedAnnoId = null;
          this.draw();
        }
        this.dragMode = "pan";
        return;
      }
      if (this.tool === "marker") {
        const wpos = this.toWorld(sx, sy);
        if (wpos.x < 0 || wpos.y < 0 || wpos.x > 1 || wpos.y > 1) return;
        this.addMarkerAt(wpos.x, wpos.y);
        return;
      }
      if (this.tool === "region") {
        const wpos = this.toWorld(sx, sy);
        if (!this.drawingRegion) this.drawingRegion = [];
        this.drawingRegion.push([wpos.x, wpos.y]);
        this.setHint("\uAF2D\uC9D3\uC810 " + this.drawingRegion.length + "\uAC1C \u2014 \uB354\uBE14\uD074\uB9AD/Enter\uB85C \uC644\uC131, Esc\uB85C \uCDE8\uC18C");
        this.draw();
        return;
      }
      if ((this.tool === "draw" || this.tool === "arrow") && this.drawErase) {
        this.dragMode = "annoErase";
        this.eraseAnnoAt(sx, sy);
        return;
      }
      if (this.tool === "draw" || this.tool === "arrow") {
        const wpos = this.toWorld(sx, sy);
        this.currentAnno = {
          id: newId(),
          kind: this.tool === "arrow" ? "arrow" : "free",
          points: [[wpos.x, wpos.y]],
          color: this.drawColor,
          width: this.drawWidth,
          dashed: this.drawDashed
        };
        this.dragMode = "anno";
        return;
      }
      if (this.tool === "raise" || this.tool === "lower" || this.tool === "paint") {
        if (this.map.mode !== "generated") {
          new import_obsidian2.Notice("\uC774\uBBF8\uC9C0 \uC9C0\uB3C4\uC5D0\uC11C\uB294 \uC9C0\uD615 \uD3B8\uC9D1\uC744 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
          return;
        }
        this.dragMode = "brush";
        this.tool === "paint" ? this.applyPaintBrush(sx, sy) : this.applyBrush(sx, sy);
      }
    });
    this.registerDomEvent(el, "pointermove", (e) => {
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const dx = sx - this.lastPointer.x, dy = sy - this.lastPointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) this.dragMoved = true;
      const { w: W, h: H } = this.worldSize();
      switch (this.dragMode) {
        case "pan":
          this.cam.x += dx;
          this.cam.y += dy;
          this.lastPointer = { x: sx, y: sy };
          this.draw();
          return;
        case "marker": {
          const m2 = this.map.markers.find((mm) => mm.id === this.dragMarkerId);
          if (m2) {
            const wpos = this.toWorld(sx, sy);
            m2.x = Math.min(1, Math.max(0, wpos.x));
            m2.y = Math.min(1, Math.max(0, wpos.y));
            this.draw();
          }
          this.lastPointer = { x: sx, y: sy };
          return;
        }
        case "regionMove": {
          const rg = this.map.regions.find((r) => r.id === this.dragRegionId);
          if (rg && this.dragOrigPoints) {
            const wpos = this.toWorld(sx, sy);
            const ddx = wpos.x - this.dragStartWorld.x;
            const ddy = wpos.y - this.dragStartWorld.y;
            rg.points = this.dragOrigPoints.map(([px, py]) => [
              Math.min(1, Math.max(0, px + ddx)),
              Math.min(1, Math.max(0, py + ddy))
            ]);
            this.draw();
          }
          this.lastPointer = { x: sx, y: sy };
          return;
        }
        case "regionVertex": {
          const rg = this.map.regions.find((r) => r.id === this.dragRegionId);
          if (rg && this.dragVertexIdx >= 0 && this.dragVertexIdx < rg.points.length) {
            const wpos = this.toWorld(sx, sy);
            rg.points[this.dragVertexIdx] = [
              Math.min(1, Math.max(0, wpos.x)),
              Math.min(1, Math.max(0, wpos.y))
            ];
            this.draw();
          }
          this.lastPointer = { x: sx, y: sy };
          return;
        }
        case "ornMove": {
          const orn = this.map.ornaments.find((o) => o.id === this.dragOrnId);
          if (orn) {
            const wpos = this.toWorld(sx, sy);
            orn.x = Math.min(1.1, Math.max(-0.1, this.ornStart.x + wpos.x - this.dragStartWorld.x));
            orn.y = Math.min(1.1, Math.max(-0.1, this.ornStart.y + wpos.y - this.dragStartWorld.y));
            this.draw();
          }
          this.lastPointer = { x: sx, y: sy };
          return;
        }
        case "ornResize": {
          const orn = this.map.ornaments.find((o) => o.id === this.dragOrnId);
          if (orn) {
            const dist = Math.max(4, Math.hypot(sx - this.ornStart.x, sy - this.ornStart.y));
            orn.sizeF = Math.min(0.4, Math.max(0.01, this.ornStart.sizeF * (dist / this.ornStart.dist)));
            this.draw();
          }
          this.lastPointer = { x: sx, y: sy };
          return;
        }
        case "brush":
          this.tool === "paint" ? this.applyPaintBrush(sx, sy) : this.applyBrush(sx, sy);
          this.lastPointer = { x: sx, y: sy };
          return;
        case "anno": {
          if (this.currentAnno) {
            const wpos = this.toWorld(sx, sy);
            if (this.currentAnno.kind === "arrow") {
              this.currentAnno.points = [this.currentAnno.points[0], [wpos.x, wpos.y]];
            } else {
              const last = this.currentAnno.points[this.currentAnno.points.length - 1];
              if (Math.hypot(wpos.x - last[0], wpos.y - last[1]) * this.worldSize().w > 3) {
                this.currentAnno.points.push([wpos.x, wpos.y]);
              }
            }
            this.draw();
          }
          this.lastPointer = { x: sx, y: sy };
          return;
        }
        case "annoErase":
          this.eraseAnnoAt(sx, sy);
          this.lastPointer = { x: sx, y: sy };
          return;
        case "annoMove": {
          const a = this.map.annotations.find((an) => an.id === this.dragAnnoId);
          if (a && this.dragAnnoOrig) {
            const wpos = this.toWorld(sx, sy);
            const ddx = wpos.x - this.dragStartWorld.x, ddy = wpos.y - this.dragStartWorld.y;
            a.points = this.dragAnnoOrig.map(([px, py]) => [px + ddx, py + ddy]);
            this.draw();
          }
          this.lastPointer = { x: sx, y: sy };
          return;
        }
      }
      this.lastPointer = { x: sx, y: sy };
      const m = this.hitMarker(sx, sy);
      const newHover = m?.id ?? null;
      if (newHover !== this.hoverMarkerId) {
        this.hoverMarkerId = newHover;
        el.style.cursor = m ? "pointer" : this.tool === "select" ? "grab" : "crosshair";
        this.draw();
      } else if (this.tool === "raise" || this.tool === "lower" || this.tool === "paint") {
        this.draw();
      }
    });
    this.registerDomEvent(el, "pointerup", (e) => {
      const mode = this.dragMode;
      this.dragMode = "none";
      if (mode === "marker" && this.dragMarkerId) {
        const m = this.map.markers.find((mm) => mm.id === this.dragMarkerId);
        this.dragMarkerId = null;
        if (!m) return;
        if (this.dragMoved) this.persist();
        else this.openMarker(m);
        return;
      }
      if (mode === "regionMove" || mode === "regionVertex") {
        this.dragRegionId = null;
        this.dragVertexIdx = -1;
        this.dragOrigPoints = null;
        if (this.dragMoved) this.persist();
        return;
      }
      if (mode === "ornMove" || mode === "ornResize") {
        this.dragOrnId = null;
        if (this.dragMoved) this.persist();
        return;
      }
      if (mode === "anno") {
        const a = this.currentAnno;
        this.currentAnno = null;
        if (a && a.points.length >= 2) {
          let span = 0;
          for (let i = 1; i < a.points.length; i++) span += Math.hypot(a.points[i][0] - a.points[i - 1][0], a.points[i][1] - a.points[i - 1][1]);
          if (span * this.worldSize().w > 6) {
            this.map.annotations.push(a);
            this.persist();
          } else {
            this.draw();
          }
        } else {
          this.draw();
        }
        return;
      }
      if (mode === "annoMove") {
        this.dragAnnoId = null;
        this.dragAnnoOrig = null;
        if (this.dragMoved) this.persist();
        return;
      }
      if (mode === "annoErase") return;
      if (mode === "brush") this.persist();
      if (mode === "pan" && this.dragMoved) {
      }
    });
    this.registerDomEvent(el, "dblclick", (e) => {
      if (this.tool === "region" && this.drawingRegion) {
        e.preventDefault();
        this.finishRegion();
        return;
      }
      if (this.tool === "select") {
        const rect = el.getBoundingClientRect();
        const orn = this.hitOrnament(e.clientX - rect.left, e.clientY - rect.top);
        if (orn && (orn.type === "title" || orn.type === "label" || orn.type === "note" || orn.type === "banner")) {
          this.editOrnText(orn);
          return;
        }
        if (this.selectedRegionId) {
          const rg = this.map.regions.find((r) => r.id === this.selectedRegionId);
          if (rg) this.editRegion(rg);
        }
      }
    });
    this.registerDomEvent(el, "contextmenu", (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const m = this.hitMarker(sx, sy);
      if (m) {
        this.markerMenu(m, e);
        return;
      }
      const orn = this.hitOrnament(sx, sy);
      if (orn) {
        this.ornMenu(orn, e);
        return;
      }
      const anno = this.hitAnnotation(sx, sy);
      if (anno) {
        this.annoMenu(anno, e);
        return;
      }
      const wpos = this.toWorld(sx, sy);
      const rg = this.hitRegion(wpos.x, wpos.y);
      if (rg) this.regionMenu(rg, e);
    });
    this.registerDomEvent(this.rootEl, "keydown", (e) => {
      if (this.tool === "region" && this.drawingRegion) {
        if (e.key === "Enter") {
          e.preventDefault();
          this.finishRegion();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          this.drawingRegion = null;
          this.setHint("");
          this.draw();
        }
      }
      if (e.key === "Escape" && (this.selectedRegionId || this.selectedOrnId)) {
        this.selectedRegionId = null;
        this.selectedOrnId = null;
        this.draw();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && this.selectedOrnId) {
        e.preventDefault();
        this.map.ornaments = this.map.ornaments.filter((o) => o.id !== this.selectedOrnId);
        this.selectedOrnId = null;
        this.persist();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && this.selectedAnnoId) {
        e.preventDefault();
        this.map.annotations = this.map.annotations.filter((a) => a.id !== this.selectedAnnoId);
        this.selectedAnnoId = null;
        this.persist();
      }
      if (this.selectedOrnId && (e.ctrlKey || e.metaKey) && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const up = e.key === "ArrowUp";
        if (e.shiftKey) {
          this.reorderById(this.map.ornaments, this.selectedOrnId, up);
        } else if (!this.reorderStep(this.map.ornaments, this.selectedOrnId, up ? 1 : -1)) {
          return;
        }
        this.persist();
        return;
      }
      if (e.key === "[") {
        this.brushRadius = Math.max(6, this.brushRadius - 5);
        this.draw();
      }
      if (e.key === "]") {
        this.brushRadius = Math.min(120, this.brushRadius + 5);
        this.draw();
      }
      if (this.tool === "paint") {
        const n = parseInt(e.key);
        if (n >= 1 && n <= PAINT_BIOMES.length) {
          this.paintBiome = PAINT_BIOMES[n - 1].code;
          this.paintErase = false;
          this.updatePaintBar();
        }
        if (e.key === "e" || e.key === "E") {
          this.paintErase = !this.paintErase;
          this.updatePaintBar();
        }
      }
    });
  }
  // ── Marker / region manipulation ─────────────────────
  addMarkerAt(x, y) {
    const marker = { id: newId(), x, y, name: "", icon: "pin", color: "#c0392b" };
    new MarkerModal(this.app, marker, (m) => {
      this.map.markers.push(m);
      this.persist();
    }).open();
  }
  openMarker(m) {
    if (m.notePath) {
      void this.app.workspace.openLinkText(m.notePath, this.file?.path ?? "", true);
    } else {
      this.editMarker(m);
    }
  }
  editMarker(m) {
    new MarkerModal(
      this.app,
      m,
      (updated) => {
        Object.assign(m, updated);
        this.persist();
      },
      () => {
        this.map.markers = this.map.markers.filter((mm) => mm.id !== m.id);
        this.persist();
      }
    ).open();
  }
  markerMenu(m, e) {
    const menu = new import_obsidian2.Menu();
    if (m.notePath) {
      menu.addItem((it) => it.setTitle("\uB178\uD2B8 \uC5F4\uAE30").setIcon("file-text").onClick(() => {
        void this.app.workspace.openLinkText(m.notePath, this.file?.path ?? "", true);
      }));
    }
    menu.addItem((it) => it.setTitle("\uD3B8\uC9D1").setIcon("pencil").onClick(() => this.editMarker(m)));
    menu.addItem((it) => it.setTitle("\uB9E8 \uC55E\uC73C\uB85C").setIcon("arrow-up-to-line").onClick(() => {
      this.reorderById(this.map.markers, m.id, true);
      this.persist();
    }));
    menu.addItem((it) => it.setTitle("\uB9E8 \uB4A4\uB85C").setIcon("arrow-down-to-line").onClick(() => {
      this.reorderById(this.map.markers, m.id, false);
      this.persist();
    }));
    menu.addItem((it) => it.setTitle("\uC0AD\uC81C").setIcon("trash").onClick(() => {
      this.map.markers = this.map.markers.filter((mm) => mm.id !== m.id);
      this.persist();
    }));
    menu.showAtMouseEvent(e);
  }
  /** Distance-field iso-lines → an array of tidy engraved-line Path2D rows */
  hatchRowsFrom(dist, w, h, isos, seedBase) {
    const field = new Float32Array(dist.length);
    const M2 = COAST_RING_MAX + 2;
    for (let i = 0; i < field.length; i++) field[i] = Math.min(M2, dist[i]);
    const rows = [];
    let sc = seedBase;
    for (const [iso, alpha] of isos) {
      const rings = extractIsoRings(field, w, h, iso, 1.3, 12);
      if (rings.length === 0) continue;
      const path = new Path2D();
      for (const ring of rings) {
        sketchToPath(path, roughRing(chaikin(ring, 1, true), 0.18, sc++), true);
      }
      rows.push({ path, alpha });
    }
    return rows;
  }
  /**
   * Builds the layered dashed water-lining engraved along the coast.
   * Water side (waterDist) and land side (landDistance) separately — spacing widens
   * and lines fade with distance.
   */
  buildCoastHatch() {
    if (!this.layers || !this.terrain) {
      this.hatchRows = null;
      this.landHatchRows = null;
      return;
    }
    const t2 = this.terrain;
    this.hatchRows = this.hatchRowsFrom(
      this.layers.waterDist,
      t2.w,
      t2.h,
      [[2.1, 0.42], [4.3, 0.3], [7, 0.2], [10.6, 0.12]],
      this.map.gen.seed * 3 + 71
    );
    this.landHatchRows = this.hatchRowsFrom(
      landDistance(t2.biome, t2.w, t2.h, 10),
      t2.w,
      t2.h,
      [[1.7, 0.3], [3.4, 0.18], [5.6, 0.1]],
      this.map.gen.seed * 5 + 137
    );
  }
  /** Reorder within an array of the same kind: to the front (top) or back (bottom) */
  reorderById(arr, id, toFront) {
    const idx = arr.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const [item] = arr.splice(idx, 1);
    if (toFront) arr.push(item);
    else arr.unshift(item);
  }
  /** One step forwards (+1) / backwards (-1) — later in the array draws on top */
  reorderStep(arr, id, dir) {
    const idx = arr.findIndex((x) => x.id === id);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= arr.length) return false;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    return true;
  }
  annoMenu(a, e) {
    const menu = new import_obsidian2.Menu();
    menu.addItem((it) => it.setTitle("\uB9E8 \uC55E\uC73C\uB85C").setIcon("arrow-up-to-line").onClick(() => {
      this.reorderById(this.map.annotations, a.id, true);
      this.persist();
    }));
    menu.addItem((it) => it.setTitle("\uB9E8 \uB4A4\uB85C").setIcon("arrow-down-to-line").onClick(() => {
      this.reorderById(this.map.annotations, a.id, false);
      this.persist();
    }));
    menu.addItem((it) => it.setTitle("\uC0AD\uC81C").setIcon("trash").onClick(() => {
      this.map.annotations = this.map.annotations.filter((x) => x.id !== a.id);
      if (this.selectedAnnoId === a.id) this.selectedAnnoId = null;
      this.persist();
    }));
    menu.showAtMouseEvent(e);
  }
  regionMenu(rg, e) {
    const menu = new import_obsidian2.Menu();
    if (rg.notePath) {
      menu.addItem((it) => it.setTitle("\uB178\uD2B8 \uC5F4\uAE30").setIcon("file-text").onClick(() => {
        void this.app.workspace.openLinkText(rg.notePath, this.file?.path ?? "", true);
      }));
    }
    menu.addItem((it) => it.setTitle("\uD3B8\uC9D1").setIcon("pencil").onClick(() => this.editRegion(rg)));
    menu.addItem((it) => it.setTitle("\uAF2D\uC9D3\uC810 \uD3B8\uC9D1").setIcon("move").onClick(() => {
      this.selectedRegionId = rg.id;
      this.tool = "select";
      this.updateToolbarState();
      this.draw();
    }));
    menu.addItem((it) => it.setTitle("\uC0AD\uC81C").setIcon("trash").onClick(() => {
      this.map.regions = this.map.regions.filter((rr) => rr.id !== rg.id);
      this.persist();
    }));
    menu.showAtMouseEvent(e);
  }
  editRegion(rg) {
    new RegionModal(
      this.app,
      rg,
      (updated) => {
        Object.assign(rg, updated);
        this.persist();
      },
      () => {
        this.map.regions = this.map.regions.filter((rr) => rr.id !== rg.id);
        this.persist();
      }
    ).open();
  }
  // ── Placed-element manipulation ──────────────────────
  editOrnText(orn) {
    const heading = orn.type === "title" ? "\uC81C\uBAA9 \uD3B8\uC9D1" : orn.type === "note" ? "\uBA54\uBAA8 \uD3B8\uC9D1 (Ctrl+Enter \uC800\uC7A5)" : orn.type === "banner" ? "\uB9AC\uBCF8 \uBB38\uAD6C \uD3B8\uC9D1" : "\uD14D\uC2A4\uD2B8 \uD3B8\uC9D1";
    new TextEditModal(this.app, heading, orn.text ?? "", orn.type === "note", (v) => {
      orn.text = v;
      this.persist();
    }).open();
  }
  ornMenu(orn, e) {
    const menu = new import_obsidian2.Menu();
    if (orn.type === "title" || orn.type === "label" || orn.type === "note" || orn.type === "banner") {
      menu.addItem((it) => it.setTitle("\uD14D\uC2A4\uD2B8 \uD3B8\uC9D1").setIcon("pencil").onClick(() => this.editOrnText(orn)));
    }
    menu.addItem((it) => it.setTitle("\uC774\uB984 \uC9C0\uC815 (\uB808\uC774\uC5B4)").setIcon("tag").onClick(() => {
      new TextEditModal(this.app, "\uC694\uC18C \uC774\uB984 \uC9C0\uC815 (\uB808\uC774\uC5B4 \uC2DD\uBCC4\uC6A9)", orn.name ?? "", false, (v) => {
        const t2 = v.trim();
        if (t2) orn.name = t2;
        else delete orn.name;
        this.persist();
      }).open();
    }));
    menu.addItem((it) => it.setTitle("\uC55E\uC73C\uB85C \uD55C \uCE78 (Ctrl+\u2191)").setIcon("arrow-up").onClick(() => {
      if (this.reorderStep(this.map.ornaments, orn.id, 1)) this.persist();
    }));
    menu.addItem((it) => it.setTitle("\uB4A4\uB85C \uD55C \uCE78 (Ctrl+\u2193)").setIcon("arrow-down").onClick(() => {
      if (this.reorderStep(this.map.ornaments, orn.id, -1)) this.persist();
    }));
    menu.addItem((it) => it.setTitle("\uB9E8 \uC55E\uC73C\uB85C (Ctrl+Shift+\u2191)").setIcon("arrow-up-to-line").onClick(() => {
      this.reorderById(this.map.ornaments, orn.id, true);
      this.persist();
    }));
    menu.addItem((it) => it.setTitle("\uB9E8 \uB4A4\uB85C (Ctrl+Shift+\u2193)").setIcon("arrow-down-to-line").onClick(() => {
      this.reorderById(this.map.ornaments, orn.id, false);
      this.persist();
    }));
    menu.addItem((it) => it.setTitle("\uC0AD\uC81C").setIcon("trash").onClick(() => {
      this.map.ornaments = this.map.ornaments.filter((o) => o.id !== orn.id);
      if (this.selectedOrnId === orn.id) this.selectedOrnId = null;
      this.persist();
    }));
    menu.showAtMouseEvent(e);
  }
  addOrnament(type, sticker, imagePath) {
    const defaults = {
      compass: { sizeF: 0.062 },
      title: { sizeF: 0.052, text: this.file?.basename ?? "\uC81C\uBAA9" },
      label: { sizeF: 0.035, text: "\uC0C8 \uC9C0\uBA85" },
      note: { sizeF: 0.024, text: "\uBA54\uBAA8 \uB0B4\uC6A9" },
      banner: { sizeF: 0.03, text: "\uB9AC\uBCF8 \uBB38\uAD6C" },
      ship: { sizeF: 0.048 },
      monster: { sizeF: 0.048 },
      sticker: { sizeF: 0.045 }
    };
    const d = defaults[type];
    const { w: vw, h: vh } = this.viewSize();
    const wpos = this.toWorld(vw / 2, vh / 2);
    const orn = {
      id: newId(),
      type,
      x: Math.min(0.95, Math.max(0.05, wpos.x)),
      y: Math.min(0.95, Math.max(0.05, wpos.y)),
      sizeF: d.sizeF,
      text: d.text,
      sticker,
      imagePath
    };
    this.map.ornaments.push(orn);
    this.selectedOrnId = orn.id;
    this.tool = "select";
    this.updateToolbarState();
    const isText = type === "title" || type === "label" || type === "note" || type === "banner";
    this.setHint(isText ? "\uB4DC\uB798\uADF8: \uC774\uB3D9 \xB7 \uBAA8\uC11C\uB9AC \uD578\uB4E4: \uD06C\uAE30 \xB7 \uB354\uBE14\uD074\uB9AD: \uD14D\uC2A4\uD2B8 \uD3B8\uC9D1 \xB7 Delete: \uC0AD\uC81C" : "\uB4DC\uB798\uADF8: \uC774\uB3D9 \xB7 \uBAA8\uC11C\uB9AC \uD578\uB4E4: \uD06C\uAE30 \xB7 Delete: \uC0AD\uC81C");
    this.persist();
    if (isText) this.editOrnText(orn);
  }
  /** Lazily load images for placed custom stickers (redraws on completion) */
  ensureStickerImages() {
    for (const orn of this.map.ornaments) {
      const p = orn.imagePath;
      if (!p || this.stickerImages.has(p) || this.stickerLoading.has(p)) continue;
      this.stickerLoading.add(p);
      const file = this.app.vault.getAbstractFileByPath(p);
      if (!(file instanceof import_obsidian2.TFile)) continue;
      void this.app.vault.readBinary(file).then((buf) => {
        const url = URL.createObjectURL(new Blob([buf]));
        const img = new Image();
        img.onload = () => {
          this.stickerImages.set(p, img);
          this.stickerLoading.delete(p);
          this.draw();
        };
        img.onerror = () => URL.revokeObjectURL(url);
        img.src = url;
      });
    }
  }
  finishRegion() {
    const pts = this.drawingRegion;
    this.drawingRegion = null;
    this.setHint("");
    if (!pts || pts.length < 3) {
      new import_obsidian2.Notice("\uC9C0\uC5ED\uC740 \uCD5C\uC18C 3\uAC1C\uC758 \uAF2D\uC9D3\uC810\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
      this.draw();
      return;
    }
    const region = { id: newId(), name: "", color: "#c0392b", points: pts };
    new RegionModal(this.app, region, (r) => {
      this.map.regions.push(r);
      this.persist();
    }).open();
    this.draw();
  }
  // ── Paint tool settings bar ──────────────────────────
  buildPaintBar() {
    const bar = this.rootEl.createDiv({ cls: "fms-paintbar is-hidden" });
    this.paintBarEl = bar;
    for (let n = 0; n < PAINT_BIOMES.length; n++) {
      const pb = PAINT_BIOMES[n];
      const btn = bar.createDiv({ cls: "fms-paint-btn", attr: { "aria-label": `${pb.label} (${n + 1})` } });
      btn.createSpan({ cls: "fms-paint-swatch", attr: { "data-biome": pb.key } });
      btn.createSpan({ cls: "fms-paint-key", text: String(n + 1) });
      btn.createSpan({ text: pb.label });
      btn.onclick = () => {
        this.paintBiome = pb.code;
        this.paintErase = false;
        this.updatePaintBar();
      };
    }
    const eraseBtn = bar.createDiv({ cls: "fms-paint-btn fms-paint-erase", attr: { "aria-label": "\uC9C0\uC6B0\uAC1C (E) \u2014 \uCE60\uD55C \uBC14\uC774\uC634 \uC81C\uAC70" } });
    (0, import_obsidian2.setIcon)(eraseBtn.createSpan(), "eraser");
    eraseBtn.createSpan({ text: "\uC9C0\uC6B0\uAE30" });
    eraseBtn.onclick = () => {
      this.paintErase = !this.paintErase;
      this.updatePaintBar();
    };
    const sizeWrap = bar.createDiv({ cls: "fms-paint-size" });
    sizeWrap.createSpan({ text: "\uD06C\uAE30" });
    const size = sizeWrap.createEl("input", { type: "range" });
    size.min = "6";
    size.max = "120";
    size.step = "2";
    size.value = String(this.brushRadius);
    size.oninput = () => {
      this.brushRadius = parseInt(size.value);
      this.draw();
    };
    this.updatePaintBar();
  }
  updatePaintBar() {
    const bar = this.paintBarEl;
    if (!bar) return;
    bar.toggleClass("is-hidden", this.tool !== "paint" || this.map.mode !== "generated");
    const pal = getPalette(this.map.style, this.map.styleColors);
    const slotOf = {
      water: pal.ocean,
      grass: pal.grass,
      forest: pal.forest,
      desert: pal.desert,
      snow: pal.snow
    };
    bar.querySelectorAll(".fms-paint-swatch").forEach((sw) => {
      const key = sw.getAttribute("data-biome");
      if (key && slotOf[key]) sw.style.backgroundColor = rgbToHex(slotOf[key]);
    });
    const btns = Array.from(bar.querySelectorAll(".fms-paint-btn"));
    btns.forEach((b, idx) => {
      const isErase = b.hasClass("fms-paint-erase");
      const active = isErase ? this.paintErase : !this.paintErase && PAINT_BIOMES[idx]?.code === this.paintBiome;
      b.toggleClass("is-active", !!active);
    });
  }
  // ── Persistence / resampling ─────────────────────────
  syncLayersToMap() {
    if (this.edits && this.edits.some((v) => v !== 0)) {
      this.map.editsB64 = bytesToB64(this.edits);
    } else {
      delete this.map.editsB64;
    }
    if (this.paint && this.paint.some((v) => v !== 0)) {
      this.map.paintB64 = bytesToB64(new Int8Array(this.paint.buffer));
    } else {
      delete this.map.paintB64;
    }
  }
  resampleEdits(old, ow, oh, nw, nh) {
    const out = new Int8Array(nw * nh);
    for (let y = 0; y < nh; y++) {
      const fy = y / nh * oh;
      const y0 = Math.min(oh - 1, Math.floor(fy)), y1 = Math.min(oh - 1, y0 + 1);
      const ty = fy - y0;
      for (let x = 0; x < nw; x++) {
        const fx = x / nw * ow;
        const x0 = Math.min(ow - 1, Math.floor(fx)), x1 = Math.min(ow - 1, x0 + 1);
        const tx = fx - x0;
        const v = old[y0 * ow + x0] * (1 - tx) * (1 - ty) + old[y0 * ow + x1] * tx * (1 - ty) + old[y1 * ow + x0] * (1 - tx) * ty + old[y1 * ow + x1] * tx * ty;
        out[y * nw + x] = clampI8(v);
      }
    }
    return out;
  }
  persist() {
    this.requestSave();
    this.buildPanelMarkerList();
    this.buildPanelOrnList();
    this.draw();
  }
  // ── PNG export ───────────────────────────────────────
  async exportPNG() {
    const { w: W, h: H } = this.worldSize();
    const scale = this.map.mode === "image" ? 1 : 2;
    const out = document.createElement("canvas");
    out.width = W * scale;
    out.height = H * scale;
    const ctx = out.getContext("2d");
    const pal = getPalette(this.map.style, this.map.styleColors);
    ctx.save();
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    if (this.map.mode === "image" && this.baseImage) {
      ctx.drawImage(this.baseImage, 0, 0);
    } else if (this.layers) {
      if (this.cacheValid && this.fullDetailCanvas) {
        ctx.drawImage(this.fullDetailCanvas, 0, 0, W, H);
      } else {
        ctx.drawImage(this.layers.base, 0, 0);
        ctx.drawImage(this.layers.stamps, 0, 0, this.map.width, this.map.height);
        this.drawVectorLines(ctx, pal, scale);
      }
      this.drawRhumbLines(ctx, W, H, scale, pal);
      drawMapEffects(ctx, W, H, scale, pal.coastline, this.map.decor, this.map.style);
    }
    if (this.map.showGrid) drawCoordinateGrid(ctx, W, H, scale, pal.coastline);
    ctx.restore();
    if (this.map.mode === "generated") {
      const g = this.map.texture.grain ?? 0.5;
      const pat = g > 1e-3 ? ctx.createPattern(paperGrainTile(), "repeat") : null;
      if (pat) {
        ctx.save();
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = Math.min(1, g);
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.restore();
      }
    }
    for (const rg of this.map.regions) {
      if (rg.points.length < 3) continue;
      ctx.beginPath();
      rg.points.forEach(([px, py], idx) => {
        const sx = px * W * scale, sy = py * H * scale;
        idx === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.fillStyle = hexToRgba(rg.color, 0.13);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(rg.color, 0.85);
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([7 * scale, 5 * scale]);
      ctx.stroke();
      ctx.setLineDash([]);
      const [cx, cy] = centroid(rg.points);
      ctx.font = `600 ${13 * scale}px ${FONT_SERIF}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const tw = ctx.measureText(rg.name).width;
      ctx.fillStyle = "rgba(28,24,18,0.72)";
      ctx.fillRect(cx * W * scale - tw / 2 - 7 * scale, cy * H * scale - 10 * scale, tw + 14 * scale, 20 * scale);
      ctx.fillStyle = "#f0e8d4";
      ctx.fillText(rg.name, cx * W * scale, cy * H * scale);
    }
    for (const a of this.map.annotations) {
      if (a.points.length < 2) continue;
      const px = a.points.map(([x, y]) => [x * W * scale, y * H * scale]);
      strokeAnnotationPx(ctx, a, px, a.width * scale);
    }
    ctx.save();
    ctx.scale(scale, scale);
    drawOrnaments(ctx, this.map.ornaments, W, H, scale, pal.coastline, this.map.style, this.stickerImages);
    ctx.restore();
    for (const m of this.map.markers) {
      const sx = m.x * W * scale, sy = m.y * H * scale;
      this.paintMarker(ctx, m, sx, sy, this.markerSizePx(m, scale), false);
    }
    const blob = await new Promise((res) => out.toBlob(res, "image/png"));
    if (!blob) {
      new import_obsidian2.Notice("PNG \uC778\uCF54\uB529\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      return;
    }
    const buf = await blob.arrayBuffer();
    const baseName = this.file?.basename ?? this.map.name;
    const folder = this.file?.parent?.path ?? "";
    const prefix = folder && folder !== "/" ? folder + "/" : "";
    let path = (0, import_obsidian2.normalizePath)(`${prefix}${baseName}.png`);
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = (0, import_obsidian2.normalizePath)(`${prefix}${baseName} ${++n}.png`);
    }
    await this.app.vault.createBinary(path, buf);
    new import_obsidian2.Notice(`\uC9C0\uB3C4\uB97C \uB0B4\uBCF4\uB0C8\uC2B5\uB2C8\uB2E4: ${path}`);
  }
  // ── External integration ─────────────────────────────
  focusMarkerByNote(notePath) {
    const m = this.map.markers.find((mm) => mm.notePath === notePath);
    if (!m) return false;
    this.focusMarker(m);
    return true;
  }
  focusMarkerByName(name) {
    const m = this.map.markers.find((mm) => mm.name === name);
    if (!m) return false;
    this.focusMarker(m);
    return true;
  }
  focusMarker(m) {
    this.updateToolbarState();
    const { w: W, h: H } = this.worldSize();
    const { w: vw, h: vh } = this.viewSize();
    const target = Math.max(this.cam.scale, Math.min(vw / W, vh / H) * 2.2);
    this.cam.scale = target;
    this.cam.x = vw / 2 - m.x * W * target;
    this.cam.y = vh / 2 - m.y * H * target;
    this.flash = { x: m.x, y: m.y, t0: performance.now() };
    this.draw();
  }
  // ── Toolbar ──────────────────────────────────────────
  buildToolbar() {
    const bar = this.rootEl.createDiv({ cls: "fms-toolbar" });
    for (const def of TOOL_DEFS) {
      const btn = bar.createDiv({ cls: "fms-tool-btn", attr: { "aria-label": def.label } });
      (0, import_obsidian2.setIcon)(btn, def.icon);
      btn.onclick = () => {
        this.tool = def.id;
        this.drawingRegion = null;
        this.setHint(def.label);
        this.updateToolbarState();
        this.draw();
      };
      this.toolBtns.set(def.id, btn);
    }
    bar.createDiv({ cls: "fms-tool-sep" });
    const btnExport = bar.createDiv({ cls: "fms-tool-btn", attr: { "aria-label": "PNG\uB85C \uB0B4\uBCF4\uB0B4\uAE30" } });
    (0, import_obsidian2.setIcon)(btnExport, "image-down");
    btnExport.onclick = () => void this.exportPNG();
    const btnPanel = bar.createDiv({ cls: "fms-tool-btn", attr: { "aria-label": "\uC124\uC815 \uD328\uB110 \uC811\uAE30/\uD3BC\uCE58\uAE30" } });
    (0, import_obsidian2.setIcon)(btnPanel, "settings-2");
    btnPanel.onclick = () => this.panelEl.toggleClass("is-hidden", !this.panelEl.hasClass("is-hidden"));
    this.updateToolbarState();
  }
  updateToolbarState() {
    for (const [id, btn] of this.toolBtns) {
      btn.toggleClass("is-active", id === this.tool);
    }
    this.updatePaintBar();
    this.updateDrawBar();
  }
  setHint(text) {
    this.hintEl.setText(text);
    this.hintEl.toggleClass("is-visible", !!text);
  }
  /** Build the panel's top tab bar plus its four tab containers */
  makePanelTabs(root) {
    const bar = root.createDiv({ cls: "fms-tabs" });
    const bodies = root.createDiv({ cls: "fms-tab-bodies" });
    const defs = [
      ["terrain", "\uC9C0\uD615"],
      ["style", "\uAFB8\uBBF8\uAE30"],
      ["elements", "\uC694\uC18C"],
      ["file", "\uD30C\uC77C"]
    ];
    const conts = {};
    const btns = {};
    for (const [key, label] of defs) {
      const btn = bar.createDiv({ cls: "fms-tab", text: label });
      const cont = bodies.createDiv({ cls: "fms-tab-body is-hidden" });
      btn.onclick = () => {
        for (const k in conts) conts[k].toggleClass("is-hidden", k !== key);
        for (const k in btns) btns[k].toggleClass("is-active", k === key);
        this.activePanelTab = key;
      };
      conts[key] = cont;
      btns[key] = btn;
    }
    if (this.map.mode !== "generated" && this.activePanelTab === "terrain") this.activePanelTab = "style";
    const active = conts[this.activePanelTab] ? this.activePanelTab : "style";
    conts[active].removeClass("is-hidden");
    btns[active].addClass("is-active");
    return conts;
  }
  buildPanel() {
    const p = this.panelEl;
    p.empty();
    const tab = this.makePanelTabs(p);
    const tTerrain = tab.terrain, tStyle = tab.style, tElements = tab.elements, tFile = tab.file;
    const isGen = this.map.mode === "generated";
    if (isGen) {
      const secToggles = this.panelSection(tTerrain, "\uC9C0\uD615 \uC0DD\uC131 \uC635\uC158");
      const row = secToggles.createDiv({ cls: "fms-check-row" });
      const toggles = [
        ["rivers", "\uAC15"],
        ["snow", "\uB208"],
        ["desert", "\uC0AC\uB9C9"],
        ["forest", "\uC232"]
      ];
      for (const [key, label] of toggles) {
        const lb = row.createEl("label", { cls: "fms-check" });
        const cb = lb.createEl("input", { type: "checkbox" });
        cb.checked = this.map.gen[key];
        cb.onchange = () => {
          this.map.gen[key] = cb.checked;
          this.requestSave();
          this.regenDebounced(50);
        };
        lb.createSpan({ text: label });
      }
      const secGen = this.panelSection(tTerrain, "\uC0DD\uC131");
      const randBtn = secGen.createEl("button", { text: "\u{1F3B2} \uC644\uC804 \uB79C\uB364 \uC0DD\uC131", cls: "fms-btn" });
      const seedRow = secGen.createDiv({ cls: "fms-row" });
      seedRow.createSpan({ cls: "fms-row-label", text: "\uC2DC\uB4DC" });
      const seedInput = seedRow.createEl("input", { cls: "fms-seed-input", type: "number" });
      seedInput.value = String(this.map.gen.seed);
      seedInput.onchange = () => {
        this.map.gen.seed = parseInt(seedInput.value) || 0;
        this.requestSave();
        this.regenDebounced(50);
      };
      const diceBtn = seedRow.createDiv({ cls: "fms-mini-btn", attr: { "aria-label": "\uC2DC\uB4DC\uB9CC \uBB34\uC791\uC704 (\uC124\uC815 \uC720\uC9C0)" } });
      (0, import_obsidian2.setIcon)(diceBtn, "dices");
      diceBtn.onclick = () => {
        this.map.gen.seed = Math.floor(Math.random() * 1e6);
        seedInput.value = String(this.map.gen.seed);
        this.requestSave();
        this.regenDebounced(50);
      };
      randBtn.onclick = () => {
        const seed = Math.floor(Math.random() * 1e6);
        const keep = this.map.gen;
        this.map.gen = randomizeGenParams(seed);
        this.map.gen.rivers = keep.rivers;
        this.map.gen.snow = keep.snow;
        this.map.gen.desert = keep.desert;
        this.map.gen.forest = keep.forest;
        seedInput.value = String(seed);
        this.requestSave();
        this.buildPanel();
        this.regenerate();
      };
      secGen.createDiv({ cls: "fms-note", text: "\uB300\uB959\xB7\uC12C\xB7\uD574\uC218\uBA74 \uB4F1\uC744 \uC54C\uC544\uC11C \uC815\uD569\uB2C8\uB2E4. \uC138\uBD80 \uC870\uC815\uC740 \uACE0\uAE09 \uC124\uC815\uC5D0\uC11C." });
      const secBase = this.panelSection(tTerrain, "\uACE0\uAE09 \xB7 \uB300\uB959\uACFC \uBC14\uB2E4", true);
      this.slider(secBase, "\uD574\uC218\uBA74 \uB192\uC774", 0.2, 0.75, 0.01, this.map.gen.seaLevel, (v) => this.map.gen.seaLevel = v);
      this.slider(secBase, "\uB300\uB959 \uC218", 0, 8, 1, this.map.gen.continentCount, (v) => this.map.gen.continentCount = v);
      this.slider(secBase, "\uC12C \uC218", 0, 40, 1, this.map.gen.islandCount, (v) => this.map.gen.islandCount = v);
      this.slider(secBase, "\uB300\uB959 \uD06C\uAE30", 0.4, 2, 0.05, this.map.gen.landAmount, (v) => this.map.gen.landAmount = v);
      this.slider(secBase, "\uB300\uB959 \uBD84\uD3EC", 1, 5, 1, this.map.gen.continents, (v) => this.map.gen.continents = v);
      this.slider(secBase, "\uAC70\uCE60\uAE30", 0, 2, 0.05, this.map.gen.roughness, (v) => this.map.gen.roughness = v);
      const secClimate = this.panelSection(tTerrain, "\uACE0\uAE09 \xB7 \uAE30\uD6C4\uC640 \uB514\uD14C\uC77C", true);
      this.slider(secClimate, "\uAE30\uD6C4 \uBD84\uD3EC", 0, 1, 0.01, this.map.gen.climate, (v) => this.map.gen.climate = v);
      this.slider(secClimate, "\uB514\uD14C\uC77C", 0, 2, 0.05, this.map.gen.detail, (v) => this.map.gen.detail = v);
      this.slider(secClimate, "\uC815\uBC00\uB3C4", 0, 2, 0.05, this.map.gen.precision, (v) => this.map.gen.precision = v);
      this.slider(secClimate, "\uBD81\uADF9 \uC124\uC6D0", 0, 0.4, 0.01, this.map.gen.polarNorth, (v) => this.map.gen.polarNorth = v);
      this.slider(secClimate, "\uB0A8\uADF9 \uC124\uC6D0", 0, 0.4, 0.01, this.map.gen.polarSouth, (v) => this.map.gen.polarSouth = v);
      const secWater = this.panelSection(tTerrain, "\uACE0\uAE09 \xB7 \uBB3C\uACFC \uCE68\uC2DD", true);
      this.slider(secWater, "\uCE68\uC2DD", 0, 2, 0.05, this.map.gen.erosion, (v) => this.map.gen.erosion = v);
      this.slider(secWater, "\uAC15 \uBC00\uB3C4", 0, 2, 0.05, this.map.gen.riverDensity, (v) => this.map.gen.riverDensity = v);
      const secReset = this.panelSection(tTerrain, "\uD3B8\uC9D1 \uCD08\uAE30\uD654", true);
      const clearBtn = secReset.createEl("button", { text: "\uC9C0\uD615 \uD3B8\uC9D1 \uCD08\uAE30\uD654", cls: "fms-btn" });
      clearBtn.onclick = () => {
        this.edits = null;
        delete this.map.editsB64;
        this.requestSave();
        this.regenerate();
      };
      const clearPaintBtn = secReset.createEl("button", { text: "\uBC14\uC774\uC634 \uD398\uC778\uD2B8 \uCD08\uAE30\uD654", cls: "fms-btn" });
      clearPaintBtn.onclick = () => {
        this.paint = null;
        delete this.map.paintB64;
        this.requestSave();
        this.regenerate();
      };
      const secSize = this.panelSection(tTerrain, "\uC9C0\uB3C4 \uD06C\uAE30");
      const sizeRow = secSize.createDiv({ cls: "fms-row" });
      const wInput = sizeRow.createEl("input", { cls: "fms-seed-input", type: "number" });
      wInput.value = String(this.map.width);
      sizeRow.createSpan({ cls: "fms-row-label", text: "\xD7" }).style.flex = "0 0 auto";
      const hInput = sizeRow.createEl("input", { cls: "fms-seed-input", type: "number" });
      hInput.value = String(this.map.height);
      const applyBtn = secSize.createEl("button", { text: "\uD06C\uAE30 \uC801\uC6A9", cls: "fms-btn" });
      applyBtn.onclick = () => {
        const nw = Math.max(128, Math.min(3072, Math.round(parseInt(wInput.value) || this.map.width)));
        const nh = Math.max(96, Math.min(3072, Math.round(parseInt(hInput.value) || this.map.height)));
        wInput.value = String(nw);
        hInput.value = String(nh);
        if (nw === this.map.width && nh === this.map.height) return;
        if (this.edits) {
          this.edits = this.resampleEdits(this.edits, this.map.width, this.map.height, nw, nh);
        }
        if (this.paint) {
          const np = new Uint8Array(nw * nh);
          for (let y = 0; y < nh; y++) {
            const oy2 = Math.min(this.map.height - 1, Math.round(y / nh * this.map.height));
            for (let x = 0; x < nw; x++) {
              const ox2 = Math.min(this.map.width - 1, Math.round(x / nw * this.map.width));
              np[y * nw + x] = this.paint[oy2 * this.map.width + ox2];
            }
          }
          this.paint = np;
        }
        this.map.width = nw;
        this.map.height = nh;
        this.camFitted = false;
        this.requestSave();
        this.regenerate();
      };
      secSize.createDiv({ cls: "fms-note", text: "128~3072 \uC140. \uD070 \uC9C0\uB3C4\uB294 \uD0C0\uC77C \uB2E8\uC704\uB85C \uC21C\uCC28 \uB80C\uB354\uB429\uB2C8\uB2E4(\uCCAD\uD06C). \uD074\uC218\uB85D \uC0DD\uC131\uC774 \uB290\uB824\uC9C0\uB2C8 \uC8FC\uC758. \uBE0C\uB7EC\uC2DC \uD3B8\uC9D1\uC740 \uBCF4\uAC04\uB418\uC5B4 \uC720\uC9C0\uB429\uB2C8\uB2E4." });
      const secColors = this.panelSection(tStyle, "\uC9C0\uD615 \uC0C9\uC0C1");
      const pal = getPalette(this.map.style, this.map.styleColors);
      const slotOf = {
        water: pal.ocean,
        grass: pal.grass,
        forest: pal.forest,
        desert: pal.desert,
        snow: pal.snow
      };
      for (const { key, label } of TERRAIN_COLOR_KEYS) {
        const row2 = secColors.createDiv({ cls: "fms-row" });
        const colorInput = row2.createEl("input", { type: "color", cls: "fms-color-input" });
        colorInput.value = this.map.styleColors?.[key] ?? rgbToHex(slotOf[key]);
        row2.createSpan({ cls: "fms-row-label", text: label });
        const hexSpan = row2.createSpan({ cls: "fms-row-value fms-hex", text: colorInput.value });
        colorInput.oninput = () => {
          if (!this.map.styleColors) this.map.styleColors = {};
          this.map.styleColors[key] = colorInput.value;
          hexSpan.setText(colorInput.value);
          this.requestSave();
          this.regenDebounced(120);
          this.updatePaintBar();
        };
      }
      const resetColors = secColors.createEl("button", { text: "\uAE30\uBCF8 \uC0C9\uC0C1 \uBCF5\uC6D0", cls: "fms-btn" });
      resetColors.onclick = () => {
        delete this.map.styleColors;
        this.requestSave();
        this.regenerate();
        this.buildPanel();
        this.updatePaintBar();
      };
      const secCoast = this.panelSection(tStyle, "\uD574\uC548\uC120");
      this.slider(secCoast, "\uD3ED", 0, 12, 1, this.map.coastWidth, (v) => this.map.coastWidth = v);
      const coastRow = secCoast.createDiv({ cls: "fms-row" });
      const coastInput = coastRow.createEl("input", { type: "color", cls: "fms-color-input" });
      coastInput.value = this.map.coastColor ?? rgbToHex([
        Math.min(255, pal.ocean[0] * 1.16),
        Math.min(255, pal.ocean[1] * 1.14),
        Math.min(255, pal.ocean[2] * 1.1)
      ]);
      coastRow.createSpan({ cls: "fms-row-label", text: "\uB760 \uC0C9\uC0C1" });
      const coastReset = coastRow.createEl("button", { text: "\uC790\uB3D9", cls: "fms-mini-text-btn" });
      coastInput.oninput = () => {
        this.map.coastColor = coastInput.value;
        this.requestSave();
        this.regenDebounced(120);
      };
      coastReset.onclick = () => {
        delete this.map.coastColor;
        this.requestSave();
        this.regenerate();
      };
      const secDecor = this.panelSection(tStyle, "\uC804\uCCB4 \uD6A8\uACFC");
      const decorRow = secDecor.createDiv({ cls: "fms-check-row" });
      const decorDefs = [
        ["frame", "\uD14C\uB450\uB9AC"],
        ["waves", "\uD30C\uB3C4"],
        ["vignette", "\uBE44\uB124\uD2B8"]
      ];
      for (const [key, label] of decorDefs) {
        const lb = decorRow.createEl("label", { cls: "fms-check" });
        const cb = lb.createEl("input", { type: "checkbox" });
        cb.checked = this.map.decor[key];
        cb.onchange = () => {
          this.map.decor[key] = cb.checked;
          this.requestSave();
          if (key === "waves") this.regenDebounced(50);
          else this.draw();
        };
        lb.createSpan({ text: label });
      }
      const secTex = this.panelSection(tStyle, "\uC9C8\uAC10", true);
      this.slider(secTex, "\uC885\uC774 \uACB0", 0, 1.2, 0.05, this.map.texture.grain, (v) => this.map.texture.grain = v, false);
      this.slider(secTex, "\uBA85\uC554(\uC6CC\uC2DC)", 0, 2, 0.05, this.map.texture.relief, (v) => this.map.texture.relief = v, true);
      this.slider(secTex, "\uC885\uC774 \uC5BC\uB8E9", 0, 2, 0.05, this.map.texture.mottle, (v) => this.map.texture.mottle = v, true);
      this.slider(secTex, "\uC544\uC774\uCF58 \uD06C\uAE30", 0.5, 3, 0.1, this.map.texture.markerScale, (v) => this.map.texture.markerScale = v, false);
    }
    const secText = this.panelSection(tElements, "\uD14D\uC2A4\uD2B8 \uC694\uC18C");
    const textRow = secText.createDiv({ cls: "fms-orn-row" });
    const textDefs = [
      ["title", "type", "\uC81C\uBAA9"],
      ["label", "case-sensitive", "\uC9C0\uBA85"],
      ["banner", "tag", "\uB9AC\uBCF8 \uBB38\uAD6C"],
      ["note", "sticky-note", "\uBA54\uBAA8"]
    ];
    for (const [type, icon, label] of textDefs) {
      const btn = textRow.createEl("button", { cls: "fms-orn-btn", attr: { "aria-label": `${label} \uCD94\uAC00` } });
      (0, import_obsidian2.setIcon)(btn.createSpan(), icon);
      btn.createSpan({ text: label });
      btn.onclick = () => this.addOrnament(type);
    }
    secText.createDiv({ cls: "fms-note", text: "\uB354\uBE14\uD074\uB9AD\uC73C\uB85C \uD14D\uC2A4\uD2B8 \uD3B8\uC9D1, \uB4DC\uB798\uADF8 \uC774\uB3D9\xB7\uD06C\uAE30 \uC870\uC808\xB7Delete \uC0AD\uC81C." });
    const secDeco = this.panelSection(tElements, "\uAFB8\uBBF8\uAE30 \uC2A4\uD2F0\uCEE4");
    {
      const inkRGB = getPalette(this.map.style, this.map.styleColors).coastline;
      const inkFn = (a) => `rgba(${inkRGB[0]},${inkRGB[1]},${inkRGB[2]},${a})`;
      const makeCell = (grid, label, drawThumb, onClick) => {
        const btn = grid.createEl("button", { cls: "fms-sticker-cell", attr: { "aria-label": `${label} \uCD94\uAC00`, title: label } });
        const cv = btn.createEl("canvas");
        cv.width = 96;
        cv.height = 96;
        const g = cv.getContext("2d");
        if (g) {
          g.lineJoin = "round";
          g.lineCap = "round";
          g.lineWidth = 2.2;
          drawThumb(g);
        }
        btn.createSpan({ cls: "fms-sticker-name", text: label });
        btn.onclick = onClick;
      };
      for (const cat of STICKER_CATS) {
        secDeco.createDiv({ cls: "fms-sticker-cat", text: cat.label });
        const grid = secDeco.createDiv({ cls: "fms-sticker-grid" });
        const legacy = cat.id === "sea" ? [["ship", "\uBC94\uC120"], ["monster", "\uBC14\uB2E4 \uAD34\uBB3C"]] : cat.id === "map" ? [["compass", "\uB098\uCE68\uBC18"]] : [];
        for (const [type, label] of legacy) {
          makeCell(grid, label, (g) => {
            drawOrnaments(g, [{ id: "_t", type, x: 0.5, y: 0.5, sizeF: type === "compass" ? 0.28 : 0.32 }], 96, 96, 1, inkRGB, this.map.style);
          }, () => this.addOrnament(type));
        }
        for (const st of STICKERS.filter((x) => x.cat === cat.id)) {
          makeCell(grid, st.label, (g) => {
            const rr = 36 / Math.max(st.box[0], st.box[1]);
            st.draw(g, 48, 48, rr, inkFn, "rgba(242,232,206,0.92)");
          }, () => this.addOrnament("sticker", st.id));
        }
      }
      const customBtn = secDeco.createEl("button", { text: "\uB0B4 \uC2A4\uD2F0\uCEE4 \uCD94\uAC00 (\uBCFC\uD2B8 \uC774\uBBF8\uC9C0)\u2026", cls: "fms-btn" });
      customBtn.onclick = () => {
        new ImageSuggestModal(this.app, (file) => {
          this.addOrnament("sticker", "custom", file.path);
        }).open();
      };
      secDeco.createDiv({ cls: "fms-note", text: "\uD074\uB9AD\uD574 \uC9C0\uB3C4 \uC911\uC559\uC5D0 \uCD94\uAC00 \u2014 \uB4DC\uB798\uADF8 \uC774\uB3D9\xB7\uD06C\uAE30 \uC870\uC808\xB7Delete \uC0AD\uC81C. \uB0B4 \uC2A4\uD2F0\uCEE4\uB294 \uBCFC\uD2B8\uC758 PNG(\uD22C\uBA85 \uBC30\uACBD \uAD8C\uC7A5)\uB97C \uC0AC\uC6A9\uD569\uB2C8\uB2E4." });
    }
    const secStyle = this.panelSection(tStyle, "\uC2A4\uD0C0\uC77C");
    const styleRow = secStyle.createDiv({ cls: "fms-row" });
    styleRow.createSpan({ cls: "fms-row-label", text: "\uD14C\uB9C8" });
    this.customSelect(
      styleRow,
      [["parchment", "\uC591\uD53C\uC9C0"], ["color", "\uCEEC\uB7EC"], ["ink", "\uC789\uD06C"]],
      this.map.style,
      (v) => {
        this.map.style = v;
        this.requestSave();
        this.regenDebounced(30);
      }
    );
    if (isGen) {
      const contourRow = secStyle.createDiv({ cls: "fms-check-row" });
      const lb = contourRow.createEl("label", { cls: "fms-check" });
      const cb = lb.createEl("input", { type: "checkbox" });
      cb.checked = this.map.showContours;
      cb.onchange = () => {
        this.map.showContours = cb.checked;
        this.requestSave();
        this.cacheValid = false;
        this.scheduleDetail();
        this.draw();
      };
      lb.createSpan({ text: "\uB4F1\uACE0\uC120 \uD45C\uC2DC (2D)" });
      const hatchLb = contourRow.createEl("label", { cls: "fms-check" });
      const hatchCb = hatchLb.createEl("input", { type: "checkbox" });
      hatchCb.checked = this.map.coastHatching;
      hatchCb.onchange = () => {
        this.map.coastHatching = hatchCb.checked;
        this.requestSave();
        this.cacheValid = false;
        this.scheduleDetail();
        this.draw();
      };
      hatchLb.createSpan({ text: "\uD574\uC548 \uD5E4\uCE6D (\uC794\uC120)" });
      const landHatchLb = contourRow.createEl("label", { cls: "fms-check" });
      const landHatchCb = landHatchLb.createEl("input", { type: "checkbox" });
      landHatchCb.checked = this.map.landHatching;
      landHatchCb.onchange = () => {
        this.map.landHatching = landHatchCb.checked;
        this.requestSave();
        this.cacheValid = false;
        this.scheduleDetail();
        this.draw();
      };
      landHatchLb.createSpan({ text: "\uC721\uC9C0 \uD5E4\uCE6D" });
      const gridLb = contourRow.createEl("label", { cls: "fms-check" });
      const gridCb = gridLb.createEl("input", { type: "checkbox" });
      gridCb.checked = this.map.showGrid;
      gridCb.onchange = () => {
        this.map.showGrid = gridCb.checked;
        this.requestSave();
        this.draw();
      };
      gridLb.createSpan({ text: "\uC88C\uD45C \uACA9\uC790" });
      const rhumbLb = contourRow.createEl("label", { cls: "fms-check" });
      const rhumbCb = rhumbLb.createEl("input", { type: "checkbox" });
      rhumbCb.checked = this.map.showRhumbLines;
      rhumbCb.onchange = () => {
        this.map.showRhumbLines = rhumbCb.checked;
        this.requestSave();
        this.draw();
      };
      rhumbLb.createSpan({ text: "\uD48D\uBC30\uC120 \uD45C\uC2DC" });
      const renderRow = secStyle.createDiv({ cls: "fms-check-row" });
      const fastLb = renderRow.createEl("label", { cls: "fms-check" });
      const fastCb = fastLb.createEl("input", { type: "checkbox" });
      fastCb.checked = this.map.fastRender;
      fastCb.onchange = () => {
        this.map.fastRender = fastCb.checked;
        this.requestSave();
        this.cacheValid = false;
        if (this.detailTimer) {
          window.clearTimeout(this.detailTimer);
          this.detailTimer = null;
        }
        this.draw();
        if (!this.map.fastRender) this.scheduleDetail();
      };
      fastLb.createSpan({ text: "\u26A1 \uBE60\uB978 \uB80C\uB354 (\uD488\uC9C8 \uC800\uD558)" });
    }
    const secBg = this.panelSection(tFile, "\uC9C0\uB3C4 \uBC30\uACBD");
    if (this.map.mode === "image") {
      secBg.createDiv({ cls: "fms-note", text: `\uC774\uBBF8\uC9C0: ${this.map.baseImagePath ?? "?"}` });
      const back = secBg.createEl("button", { text: "\uC0DD\uC131 \uC9C0\uD615\uC73C\uB85C \uC804\uD658", cls: "fms-btn" });
      back.onclick = () => {
        this.map.mode = "generated";
        this.map.width = 512;
        this.map.height = 384;
        this.baseImage = null;
        this.paint = null;
        delete this.map.paintB64;
        this.camFitted = false;
        this.requestSave();
        this.rebuild();
      };
    } else {
      const imgBtn = secBg.createEl("button", { text: "\uBCFC\uD2B8 \uC774\uBBF8\uC9C0 \uBD88\uB7EC\uC624\uAE30", cls: "fms-btn" });
      imgBtn.onclick = () => {
        new ImageSuggestModal(this.app, (file) => {
          this.map.mode = "image";
          this.map.baseImagePath = file.path;
          this.camFitted = false;
          this.requestSave();
          this.rebuild();
        }).open();
      };
      secBg.createDiv({ cls: "fms-note", text: "\uC190\uADF8\uB9BC\xB7\uC678\uBD80 \uC81C\uC791 \uC9C0\uB3C4\uB97C \uBD88\uB7EC\uC640 \uB9C8\uCEE4\uB97C \uBC30\uCE58\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." });
    }
    const secExport = this.panelSection(tFile, "\uB0B4\uBCF4\uB0B4\uAE30");
    const exportBtn = secExport.createEl("button", { text: "PNG \uC774\uBBF8\uC9C0\uB85C \uB0B4\uBCF4\uB0B4\uAE30 (2\xD7)", cls: "fms-btn" });
    exportBtn.onclick = () => void this.exportPNG();
    const secLayers = this.panelSection(tElements, "\uBC30\uCE58\uB41C \uC694\uC18C (\uB808\uC774\uC5B4)");
    this.ornListEl = secLayers.createDiv({ cls: "fms-orn-list" });
    this.buildPanelOrnList();
    secLayers.createDiv({ cls: "fms-note", text: "\uBAA9\uB85D \uC704\uCABD = \uC9C0\uB3C4\uC5D0\uC11C \uC55E. \uCE94\uBC84\uC2A4\uC5D0\uC11C Ctrl+\u2191/\u2193(\uD55C \uCE78), Ctrl+Shift+\u2191/\u2193(\uB9E8 \uC55E/\uB4A4)\uB85C\uB3C4 \uC774\uB3D9." });
    const secMk = this.panelSection(tElements, "\uB9C8\uCEE4");
    this.markerListEl = secMk.createDiv({ cls: "fms-marker-list" });
    this.buildPanelMarkerList();
    tFile.createDiv({ cls: "fms-note fms-version", text: `Vellum v${PLUGIN_VERSION}` });
  }
  ornDisplayName(o) {
    if (o.name && o.name.trim()) return o.name.trim();
    const t2 = (s) => (s ?? "").split("\n")[0].slice(0, 14);
    switch (o.type) {
      case "compass":
        return "\uB098\uCE68\uBC18";
      case "ship":
        return "\uBC94\uC120";
      case "monster":
        return "\uBC14\uB2E4 \uAD34\uBB3C";
      case "title":
        return `\uC81C\uBAA9 \xB7 ${t2(o.text)}`;
      case "label":
        return `\uC9C0\uBA85 \xB7 ${t2(o.text)}`;
      case "banner":
        return `\uB9AC\uBCF8 \xB7 ${t2(o.text)}`;
      case "note":
        return `\uBA54\uBAA8 \xB7 ${t2(o.text)}`;
      case "sticker":
        if (o.sticker === "custom") return `\uB0B4 \uC2A4\uD2F0\uCEE4 \xB7 ${(o.imagePath ?? "").split("/").pop() ?? ""}`;
        return getSticker(o.sticker ?? "")?.label ?? "\uC2A4\uD2F0\uCEE4";
    }
  }
  /** Placed-element layer list — top of the list = front of the map (drawn later) */
  buildPanelOrnList() {
    const list = this.ornListEl;
    if (!list) return;
    list.empty();
    if (this.map.ornaments.length === 0) {
      list.createDiv({ cls: "fms-note", text: "\uC694\uC18C\uB97C \uCD94\uAC00\uD558\uBA74 \uC5EC\uAE30\uC11C \uC21C\uC11C\uB97C \uBC14\uAFC0 \uC218 \uC788\uC2B5\uB2C8\uB2E4." });
      return;
    }
    for (let i = this.map.ornaments.length - 1; i >= 0; i--) {
      const orn = this.map.ornaments[i];
      const item = list.createDiv({ cls: `fms-orn-item${orn.id === this.selectedOrnId ? " is-active" : ""}` });
      item.dataset.ornId = orn.id;
      const nm = item.createSpan({ cls: "fms-orn-item-name", text: this.ornDisplayName(orn) });
      if (orn.name && orn.name.trim()) nm.addClass("is-named");
      const rename = () => {
        new TextEditModal(this.app, "\uC694\uC18C \uC774\uB984 \uC9C0\uC815 (\uB808\uC774\uC5B4 \uC2DD\uBCC4\uC6A9)", orn.name ?? "", false, (v) => {
          const t2 = v.trim();
          if (t2) orn.name = t2;
          else delete orn.name;
          this.persist();
        }).open();
      };
      nm.onclick = () => {
        this.selectedOrnId = orn.id;
        this.tool = "select";
        this.updateToolbarState();
        this.draw();
        this.buildPanelOrnList();
      };
      nm.ondblclick = (e) => {
        e.stopPropagation();
        rename();
      };
      const ctl = item.createDiv({ cls: "fms-orn-item-ctl" });
      const mk = (icon, label, fn) => {
        const b = ctl.createEl("button", { cls: "fms-mini-btn", attr: { "aria-label": label, title: label } });
        (0, import_obsidian2.setIcon)(b, icon);
        b.onclick = (e) => {
          e.stopPropagation();
          fn();
        };
      };
      mk("pencil", "\uC774\uB984 \uC9C0\uC815", rename);
      mk("chevron-up", "\uC55E\uC73C\uB85C \uD55C \uCE78", () => {
        if (this.reorderStep(this.map.ornaments, orn.id, 1)) this.persist();
      });
      mk("chevron-down", "\uB4A4\uB85C \uD55C \uCE78", () => {
        if (this.reorderStep(this.map.ornaments, orn.id, -1)) this.persist();
      });
      mk("trash-2", "\uC0AD\uC81C", () => {
        this.map.ornaments = this.map.ornaments.filter((o) => o.id !== orn.id);
        if (this.selectedOrnId === orn.id) this.selectedOrnId = null;
        this.persist();
      });
      item.oncontextmenu = (e) => {
        e.preventDefault();
        this.ornMenu(orn, e);
      };
    }
  }
  /** Refresh only the list highlight on selection change (no rebuild) */
  refreshOrnListActive() {
    const list = this.ornListEl;
    if (!list) return;
    for (const el of Array.from(list.children)) {
      const he = el;
      if (he.dataset?.ornId) he.toggleClass("is-active", he.dataset.ornId === this.selectedOrnId);
    }
  }
  buildPanelMarkerList() {
    const list = this.markerListEl;
    if (!list) return;
    list.empty();
    if (this.map.markers.length === 0) {
      list.createDiv({ cls: "fms-note", text: "\uB9C8\uCEE4 \uB3C4\uAD6C\uB85C \uC9C0\uB3C4\uB97C \uD074\uB9AD\uD574 \uCD94\uAC00\uD558\uC138\uC694." });
      return;
    }
    for (const m of this.map.markers) {
      const item = list.createDiv({ cls: "fms-marker-item" });
      const label = item.createSpan({ cls: "fms-marker-label" });
      const ic = label.createSpan({ cls: "fms-marker-ic" });
      ic.innerHTML = iconSvg(m.icon);
      label.createSpan({ text: m.name });
      if (m.notePath) item.createSpan({ cls: "fms-marker-note", text: "\u{1F517}" });
      item.onclick = () => this.focusMarker(m);
      item.oncontextmenu = (e) => {
        e.preventDefault();
        this.markerMenu(m, e);
      };
    }
  }
  // ── Drawing tool settings bar ────────────────────────
  buildDrawBar() {
    const bar = this.rootEl.createDiv({ cls: "fms-paintbar fms-drawbar is-hidden" });
    this.drawBarEl = bar;
    const swatchRow = bar.createDiv({ cls: "fms-draw-swatches" });
    const swatches = [];
    for (const c of DRAW_COLORS) {
      const sw = swatchRow.createEl("button", { cls: "fms-swatch" });
      sw.style.backgroundColor = c;
      if (c === this.drawColor) sw.addClass("is-active");
      sw.onclick = () => {
        this.drawColor = c;
        swatches.forEach((x) => x.removeClass("is-active"));
        sw.addClass("is-active");
      };
      swatches.push(sw);
    }
    const sizeWrap = bar.createDiv({ cls: "fms-paint-size" });
    sizeWrap.createSpan({ text: "\uAD75\uAE30" });
    const size = sizeWrap.createEl("input", { type: "range" });
    size.min = "1";
    size.max = "12";
    size.step = "0.5";
    size.value = String(this.drawWidth);
    size.oninput = () => {
      this.drawWidth = parseFloat(size.value);
    };
    const dashLb = bar.createEl("label", { cls: "fms-check" });
    const dashCb = dashLb.createEl("input", { type: "checkbox" });
    dashCb.checked = this.drawDashed;
    dashCb.onchange = () => {
      this.drawDashed = dashCb.checked;
    };
    dashLb.createSpan({ text: "\uC810\uC120" });
    const eraseBtn = bar.createDiv({ cls: "fms-paint-btn fms-draw-erase", attr: { "aria-label": "\uC9C0\uC6B0\uAC1C \u2014 \uADF8\uB9BC \uC704\uB97C \uD074\uB9AD/\uB4DC\uB798\uADF8\uD574 \uC0AD\uC81C" } });
    (0, import_obsidian2.setIcon)(eraseBtn.createSpan(), "eraser");
    eraseBtn.createSpan({ text: "\uC9C0\uC6B0\uAC1C" });
    eraseBtn.onclick = () => {
      this.drawErase = !this.drawErase;
      this.updateDrawBar();
    };
  }
  updateDrawBar() {
    const bar = this.drawBarEl;
    if (!bar) return;
    bar.toggleClass("is-hidden", !(this.tool === "draw" || this.tool === "arrow"));
    const eb = bar.querySelector(".fms-draw-erase");
    if (eb) eb.toggleClass("is-active", this.drawErase);
    this.canvasEl.style.cursor = this.drawErase ? "cell" : "crosshair";
  }
  /** Styled custom dropdown (replaces the HTML select) */
  /** A custom dropdown matched to the map theme (no native select) */
  customSelect(parent, options, value, onChange) {
    const wrap = parent.createDiv({ cls: "fms-dd" });
    const btn = wrap.createEl("button", { cls: "fms-dd-btn" });
    const labSpan = btn.createSpan({ cls: "fms-dd-label", text: options.find(([v]) => v === value)?.[1] ?? "" });
    const chev = btn.createSpan({ cls: "fms-dd-chev" });
    (0, import_obsidian2.setIcon)(chev, "chevron-down");
    const pop = wrap.createDiv({ cls: "fms-dd-pop is-hidden" });
    let cur = value;
    for (const [val, lab] of options) {
      const opt = pop.createDiv({ cls: `fms-dd-opt${val === value ? " is-active" : ""}`, text: lab });
      opt.onclick = (e) => {
        e.stopPropagation();
        pop.addClass("is-hidden");
        wrap.removeClass("is-open");
        if (val === cur) return;
        cur = val;
        labSpan.setText(lab);
        pop.findAll(".fms-dd-opt").forEach((el) => el.removeClass("is-active"));
        opt.addClass("is-active");
        onChange(val);
      };
    }
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const opening = pop.hasClass("is-hidden");
      pop.toggleClass("is-hidden", !opening);
      wrap.toggleClass("is-open", opening);
    };
    this.registerDomEvent(document, "click", () => {
      pop.addClass("is-hidden");
      wrap.removeClass("is-open");
    });
  }
  panelSection(parent, title, collapsed = false) {
    const sec = parent.createDiv({ cls: "fms-section" });
    const head = sec.createDiv({ cls: `fms-section-head${collapsed ? " is-collapsed" : ""}`, text: title });
    const body = sec.createDiv({ cls: `fms-section-body${collapsed ? " is-hidden" : ""}` });
    head.onclick = () => {
      const hidden = body.hasClass("is-hidden");
      body.toggleClass("is-hidden", !hidden);
      head.toggleClass("is-collapsed", !hidden);
    };
    return body;
  }
  slider(parent, label, min, max, step, value, apply, regen = true) {
    const block = parent.createDiv({ cls: "fms-slider-block" });
    const header = block.createDiv({ cls: "fms-slider-header" });
    header.createSpan({ cls: "fms-slider-label", text: label });
    const numInput = header.createEl("input", { type: "number", cls: "fms-slider-number" });
    numInput.min = String(min);
    numInput.max = String(max);
    numInput.step = String(step);
    numInput.value = fmt(value, step);
    const sliderContainer = block.createDiv({ cls: "fms-slider-container" });
    const rangeInput = sliderContainer.createEl("input", { type: "range", cls: "fms-slider-range" });
    rangeInput.min = String(min);
    rangeInput.max = String(max);
    rangeInput.step = String(step);
    rangeInput.value = String(value);
    rangeInput.oninput = () => {
      const v = parseFloat(rangeInput.value);
      numInput.value = fmt(v, step);
      apply(v);
      this.requestSave();
      if (regen) this.regenDebounced(180);
      else this.draw();
    };
    numInput.onchange = () => {
      let v = parseFloat(numInput.value);
      if (isNaN(v)) v = value;
      v = Math.max(min, Math.min(max, v));
      numInput.value = fmt(v, step);
      rangeInput.value = String(v);
      apply(v);
      this.requestSave();
      if (regen) this.regenDebounced(180);
      else this.draw();
    };
  }
};
function fmt(v, step) {
  return step >= 1 ? String(Math.round(v)) : v.toFixed(2);
}
function clampI8(v) {
  return Math.max(-127, Math.min(127, Math.round(v)));
}
function hexToRgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(192,57,43,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
function centroid(points) {
  let sx = 0, sy = 0;
  for (const [x, y] of points) {
    sx += x;
    sy += y;
  }
  return [sx / points.length, sy / points.length];
}
function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// src/sample.ts
var import_obsidian3 = require("obsidian");
var FOLDER = "\uD310\uD0C0\uC9C0 \uC9C0\uB3C4 \uC0D8\uD50C";
var NOTES = [
  {
    name: "\uC655\uB3C4 \uC138\uC774\uB3C4\uB77C",
    icon: "castle",
    x: 0.36,
    y: 0.42,
    body: "\uB300\uB959 \uC911\uBD80\uC758 \uC218\uB3C4. \uC740\uBE5B \uCCA8\uD0D1\uC774 \uB298\uC5B4\uC120 \uC131\uCC44 \uB3C4\uC2DC\uB85C, \uC138 \uAC15\uC774 \uB9CC\uB098\uB294 \uC790\uB9AC\uC5D0 \uC138\uC6CC\uC84C\uB2E4.\n\n- \uC778\uAD6C: \uC57D 12\uB9CC\n- \uD1B5\uCE58: \uC138\uC774\uB3C4\uB77C \uC655\uAC00\n- \uBA85\uBB3C: \uC0C8\uBCBD \uC2DC\uC7A5, \uBCC4\uC758 \uB300\uC131\uB2F9"
  },
  {
    name: "\uD56D\uAD6C\uB3C4\uC2DC \uBCA8\uB9C8\uB974",
    icon: "anchor",
    x: 0.62,
    y: 0.58,
    body: "\uB3D9\uBD80 \uD574\uC548 \uCD5C\uB300\uC758 \uBB34\uC5ED\uD56D. \uB0A8\uBC29 \uD5A5\uC2E0\uB8CC\uC640 \uBD81\uBC29 \uBAA8\uD53C\uAC00 \uC774\uACF3\uC5D0\uC11C \uAD50\uCC28\uD55C\uB2E4.\n\n- \uC778\uAD6C: \uC57D 7\uB9CC\n- \uD2B9\uC9D5: \uC790\uC720\uB3C4\uC2DC \uC5F0\uD569 \uC18C\uC18D, \uB4F1\uB300 '\uBD89\uC740 \uB208'"
  },
  {
    name: "\uBD81\uBD80 \uC124\uC6D0 \uAD00\uBB38",
    icon: "mountain",
    x: 0.45,
    y: 0.15,
    body: "\uC124\uC6D0 \uC9C0\uB300\uB85C \uD5A5\uD558\uB294 \uB9C8\uC9C0\uB9C9 \uC694\uC0C8. \uC774 \uB108\uBA38\uB294 \uC9C0\uB3C4\uAC00 \uADF8\uB824\uC9C0\uC9C0 \uC54A\uC740 \uB545\uC774\uB2E4.\n\n- \uC8FC\uB454: \uC11C\uB9AC \uAC10\uC2DC\uB300 300\uBA85\n- \uC804\uC2B9: \uC5BC\uC74C \uBC11\uC5D0 \uC7A0\uB4E0 \uACE0\uB300 \uC6A9"
  },
  {
    name: "\uACE0\uB300 \uC720\uC801 \uCE74\uB974\uB214",
    icon: "temple",
    x: 0.22,
    y: 0.68,
    body: "\uB0A8\uC11C\uBD80 \uBC00\uB9BC\uC5D0 \uBB3B\uD78C \uC120\uC8FC\uBBFC \uBB38\uBA85\uC758 \uC720\uC801. \uD0D0\uC0AC\uB300\uB294 \uC544\uC9C1 \uC9C0\uD558 3\uCE35\uAE4C\uC9C0\uBC16\uC5D0 \uB0B4\uB824\uAC00\uC9C0 \uBABB\uD588\uB2E4.\n\n- \uC704\uD5D8\uB3C4: \uB192\uC74C\n- \uBC1C\uACAC\uBB3C: \uBCC4\uC790\uB9AC \uC6D0\uD310, \uC5B8\uC5B4 \uBBF8\uC0C1\uC758 \uC11D\uD310"
  }
];
async function installSamplePack(app) {
  const vault = app.vault;
  if (!vault.getAbstractFileByPath(FOLDER)) {
    await vault.createFolder(FOLDER);
  }
  const map = defaultMapData("\uC138\uC774\uB3C4\uB77C \uB300\uB959", 151186);
  map.gen.seaLevel = 0.52;
  map.gen.continents = 2;
  map.gen.polarNorth = 0.12;
  map.gen.polarSouth = 0.08;
  for (const n of NOTES) {
    const notePath = `${FOLDER}/${n.name}.md`;
    if (!vault.getAbstractFileByPath(notePath)) {
      const content = `# ${n.name}

${n.body}

---
[[${FOLDER}/\uC138\uC774\uB3C4\uB77C \uB300\uB959.fmap#${n.name}|\u{1F5FA}\uFE0F \uC9C0\uB3C4\uC5D0\uC11C \uBCF4\uAE30]]

> \uC774 \uB178\uD2B8\uB294 Vellum \uC0D8\uD50C\uC785\uB2C8\uB2E4. \uC9C0\uB3C4 \uC704 \uB9C8\uCEE4\uC640 \uC5F0\uACB0\uB418\uC5B4 \uC788\uC73C\uBA70, \uC704 \uB9C1\uD06C\uB97C \uB204\uB974\uBA74 \uC9C0\uB3C4\uC5D0\uC11C \uD574\uB2F9 \uB9C8\uCEE4\uAC00 \uAC15\uC870\uB429\uB2C8\uB2E4.
`;
      await vault.create(notePath, content);
    }
    map.markers.push({
      id: newId(),
      x: n.x,
      y: n.y,
      name: n.name,
      icon: n.icon,
      color: "#c0392b",
      notePath
    });
  }
  map.regions.push({
    id: newId(),
    name: "\uC138\uC774\uB3C4\uB77C \uC655\uAD6D\uB839",
    color: "#c0392b",
    points: [
      [0.28, 0.3],
      [0.46, 0.28],
      [0.52, 0.44],
      [0.44, 0.56],
      [0.3, 0.54]
    ]
  });
  const mapPath = `${FOLDER}/\uC138\uC774\uB3C4\uB77C \uB300\uB959.fmap`;
  const existing = vault.getAbstractFileByPath(mapPath);
  if (existing instanceof import_obsidian3.TFile) {
    new import_obsidian3.Notice("\uC0D8\uD50C \uC9C0\uB3C4\uAC00 \uC774\uBBF8 \uC874\uC7AC\uD569\uB2C8\uB2E4. \uAE30\uC874 \uD30C\uC77C\uC744 \uC5FD\uB2C8\uB2E4.");
    return existing;
  }
  const file = await vault.create(mapPath, JSON.stringify(map, null, 2));
  const readmePath = `${FOLDER}/\uC2DC\uC791\uD558\uAE30.md`;
  if (!vault.getAbstractFileByPath(readmePath)) {
    await vault.create(readmePath, [
      "# Vellum \uC2DC\uC791\uD558\uAE30",
      "",
      "1. [[\uC138\uC774\uB3C4\uB77C \uB300\uB959.fmap|\uC138\uC774\uB3C4\uB77C \uB300\uB959 \uC9C0\uB3C4]]\uB97C \uC5F4\uC5B4\uBCF4\uC138\uC694.",
      "2. **\uC120\uD0DD \uB3C4\uAD6C**\uB85C \uB9C8\uCEE4\uB97C \uD074\uB9AD\uD558\uBA74 \uC5F0\uACB0\uB41C \uB178\uD2B8\uAC00 \uC5F4\uB9BD\uB2C8\uB2E4.",
      "3. **\uB9C8\uCEE4 \uB3C4\uAD6C**\uB85C \uC9C0\uB3C4\uB97C \uD074\uB9AD\uD574 \uC0C8 \uC7A5\uC18C\uB97C \uCD94\uAC00\uD558\uACE0 \uB178\uD2B8\uB97C \uC5F0\uACB0\uD558\uC138\uC694.",
      "4. **\uC9C0\uC5ED \uB3C4\uAD6C**\uB85C \uAD6D\uACBD\uC744 \uADF8\uB9B4 \uC218 \uC788\uC2B5\uB2C8\uB2E4. (\uB354\uBE14\uD074\uB9AD\uC73C\uB85C \uC644\uC131)",
      "5. \uC624\uB978\uCABD **\uC9C0\uD615 \uD0ED**\uC758 \u{1F3B2} \uC644\uC804 \uB79C\uB364 \uC0DD\uC131\uC73C\uB85C \uC0C8\uB85C\uC6B4 \uB300\uB959\uC744 \uBF51\uC544\uBCF4\uC138\uC694. \uC138\uBD80 \uC870\uC815\uC740 \uACE0\uAE09 \uC124\uC815\uC5D0 \uC788\uC2B5\uB2C8\uB2E4.",
      "6. \uB178\uD2B8\uB97C \uC5F4\uC5B4\uB454 \uCC44 \uBA85\uB839\uC5B4 `\uD604\uC7AC \uB178\uD2B8\uB97C \uC9C0\uB3C4\uC5D0\uC11C \uBCF4\uAE30`\uB97C \uC2E4\uD589\uD558\uBA74 \uC9C0\uB3C4\uAC00 \uD574\uB2F9 \uB9C8\uCEE4\uB85C \uC774\uB3D9\uD569\uB2C8\uB2E4.",
      "7. **\uAFB8\uBBF8\uAE30 \uD0ED**\uC5D0\uC11C \uC2A4\uD0C0\uC77C\xB7\uC0C9\uC0C1\xB7\uD574\uC548 \uD5E4\uCE6D\uC744, **\uC694\uC18C \uD0ED**\uC5D0\uC11C \uC2A4\uD2F0\uCEE4\xB7\uB9AC\uBCF8 \uBB38\uAD6C\uB97C \uB354\uD574\uBCF4\uC138\uC694.",
      "8. \uC9C1\uC811 \uADF8\uB9B0 \uC9C0\uB3C4 \uC774\uBBF8\uC9C0\uAC00 \uC788\uB2E4\uBA74 \uD30C\uC77C \uD0ED\uC758 **\uBCFC\uD2B8 \uC774\uBBF8\uC9C0 \uBD88\uB7EC\uC624\uAE30**\uB85C \uAD50\uCCB4\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
      ""
    ].join("\n"));
  }
  return file;
}

// src/i18n.ts
var LOCALE_LABELS = {
  "en": "English (US)",
  "en-GB": "English (UK)",
  "es": "Espa\xF1ol",
  "zh": "\u4E2D\u6587",
  "ja": "\u65E5\u672C\u8A9E",
  "ko": "\uD55C\uAD6D\uC5B4"
};
var current = "en";
function setLocale(l) {
  current = l;
}
var M = {
  // ── Commands / notices ────────────────────────────────
  "cmd.newMapRibbon": { en: "New fantasy map", ko: "\uC0C8 \uD310\uD0C0\uC9C0 \uC9C0\uB3C4" },
  "cmd.newMap": { en: "Create new fantasy map", ko: "\uC0C8 \uD310\uD0C0\uC9C0 \uC9C0\uB3C4 \uB9CC\uB4E4\uAE30" },
  "cmd.installSample": { en: "Install sample pack (onboarding)", ko: "\uC0D8\uD50C\uD329 \uC124\uCE58 (\uC628\uBCF4\uB529)" },
  "cmd.exportPng": { en: "Export map as PNG image", ko: "\uC9C0\uB3C4\uB97C PNG \uC774\uBBF8\uC9C0\uB85C \uB0B4\uBCF4\uB0B4\uAE30" },
  "cmd.locateNote": { en: "Show current note on the map", ko: "\uD604\uC7AC \uB178\uD2B8\uB97C \uC9C0\uB3C4\uC5D0\uC11C \uBCF4\uAE30" },
  "notice.sampleInstalled": { en: "Sample pack installed \u2014 see 'Getting started.md'!", ko: "\uC0D8\uD50C\uD329\uC774 \uC124\uCE58\uB418\uC5C8\uC2B5\uB2C8\uB2E4. 'Getting started.md'\uB97C \uD655\uC778\uD558\uC138\uC694!" },
  "notice.sampleExists": { en: "The sample map already exists \u2014 opening it.", ko: "\uC0D8\uD50C \uC9C0\uB3C4\uAC00 \uC774\uBBF8 \uC874\uC7AC\uD569\uB2C8\uB2E4. \uAE30\uC874 \uD30C\uC77C\uC744 \uC5FD\uB2C8\uB2E4." },
  "notice.noMarkerMap": { en: "No map with a marker linked to this note was found.", ko: "\uC774 \uB178\uD2B8\uC640 \uC5F0\uACB0\uB41C \uB9C8\uCEE4\uAC00 \uC788\uB294 \uC9C0\uB3C4\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4." },
  "notice.imageNoTerrainEdit": { en: "Terrain editing is not available on image maps.", ko: "\uC774\uBBF8\uC9C0 \uC9C0\uB3C4\uC5D0\uC11C\uB294 \uC9C0\uD615 \uD3B8\uC9D1\uC744 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." },
  "notice.regionMinVertices": { en: "A region needs at least 3 vertices.", ko: "\uC9C0\uC5ED\uC740 \uCD5C\uC18C 3\uAC1C\uC758 \uAF2D\uC9D3\uC810\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." },
  "notice.exported": { en: "Map exported: ", ko: "\uC9C0\uB3C4\uB97C \uB0B4\uBCF4\uB0C8\uC2B5\uB2C8\uB2E4: " },
  "notice.pngFailed": { en: "PNG encoding failed.", ko: "PNG \uC778\uCF54\uB529\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4." },
  "notice.imageMissing": { en: "Image not found: ", ko: "\uC774\uBBF8\uC9C0\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: " },
  "view.displayText": { en: "Fantasy map", ko: "\uD310\uD0C0\uC9C0 \uC9C0\uB3C4" },
  // ── Settings ──────────────────────────────────────────
  "settings.language": { en: "Language", ko: "\uC5B8\uC5B4" },
  "settings.languageDesc": {
    en: "Plugin interface language. Open map views refresh immediately; command names apply after restarting Obsidian.",
    ko: "\uD50C\uB7EC\uADF8\uC778 UI \uC5B8\uC5B4\uC785\uB2C8\uB2E4. \uC5F4\uB824 \uC788\uB294 \uC9C0\uB3C4 \uBDF0\uB294 \uC989\uC2DC \uAC31\uC2E0\uB418\uBA70, \uBA85\uB839\uC5B4 \uC774\uB984\uC740 Obsidian \uC7AC\uC2DC\uC791 \uD6C4 \uC801\uC6A9\uB429\uB2C8\uB2E4."
  },
  // ── Tools (toolbar labels double as hints) ────────────
  "tool.select": { en: "Select/move \u2014 drag markers, regions or drawings to move; Delete removes", ko: "\uC120\uD0DD/\uC774\uB3D9 \u2014 \uB9C8\uCEE4\xB7\uC9C0\uC5ED\xB7\uADF8\uB9BC \uB4DC\uB798\uADF8\uB85C \uC774\uB3D9, Delete\uB85C \uC0AD\uC81C" },
  "tool.marker": { en: "Place marker \u2014 click to add a marker", ko: "\uB9C8\uCEE4 \uBC30\uCE58 \u2014 \uD074\uB9AD\uD55C \uC704\uCE58\uC5D0 \uB9C8\uCEE4 \uCD94\uAC00" },
  "tool.region": { en: "Draw region \u2014 click for vertices, double-click/Enter to finish", ko: "\uC9C0\uC5ED \uADF8\uB9AC\uAE30 \u2014 \uD074\uB9AD\uC73C\uB85C \uAF2D\uC9D3\uC810, \uB354\uBE14\uD074\uB9AD/Enter\uB85C \uC644\uC131" },
  "tool.draw": { en: "Freehand \u2014 drag to draw paths and curves", ko: "\uC790\uC720 \uADF8\uB9AC\uAE30 \u2014 \uB4DC\uB798\uADF8\uB85C \uACBD\uB85C\xB7\uACE1\uC120 \uADF8\uB9AC\uAE30" },
  "tool.arrow": { en: "Arrow \u2014 drag to point the way", ko: "\uD654\uC0B4\uD45C \u2014 \uB4DC\uB798\uADF8\uB85C \uBC29\uD5A5 \uD45C\uC2DC" },
  "tool.raise": { en: "Raise terrain \u2014 drag to lift", ko: "\uC9C0\uD615 \uC62C\uB9AC\uAE30 \u2014 \uB4DC\uB798\uADF8\uB85C \uC735\uAE30" },
  "tool.lower": { en: "Lower terrain \u2014 drag to sink", ko: "\uC9C0\uD615 \uB0B4\uB9AC\uAE30 \u2014 \uB4DC\uB798\uADF8\uB85C \uCE68\uAC15" },
  "tool.paint": { en: "Paint biomes \u2014 1\u20135 to choose, E erases", ko: "\uBC14\uC774\uC634 \uCE60\uD558\uAE30 \u2014 1~5\uB85C \uC885\uB958 \uC120\uD0DD, E \uC9C0\uC6B0\uAC1C" },
  "aria.exportPng": { en: "Export as PNG", ko: "PNG\uB85C \uB0B4\uBCF4\uB0B4\uAE30" },
  "aria.togglePanel": { en: "Collapse/expand the settings panel", ko: "\uC124\uC815 \uD328\uB110 \uC811\uAE30/\uD3BC\uCE58\uAE30" },
  // ── Hints ─────────────────────────────────────────────
  "hint.ornSelected": { en: "Drag: move \xB7 corner handle: resize \xB7 double-click: edit text \xB7 Delete: remove", ko: "\uB4DC\uB798\uADF8: \uC774\uB3D9 \xB7 \uBAA8\uC11C\uB9AC \uD578\uB4E4: \uD06C\uAE30 \xB7 \uB354\uBE14\uD074\uB9AD: \uD14D\uC2A4\uD2B8 \uD3B8\uC9D1 \xB7 Delete: \uC0AD\uC81C" },
  "hint.ornSelectedNoText": { en: "Drag: move \xB7 corner handle: resize \xB7 Delete: remove", ko: "\uB4DC\uB798\uADF8: \uC774\uB3D9 \xB7 \uBAA8\uC11C\uB9AC \uD578\uB4E4: \uD06C\uAE30 \xB7 Delete: \uC0AD\uC81C" },
  "hint.regionSelected": { en: "Drag region: move \xB7 drag vertex: reshape \xB7 right-click: menu", ko: "\uC9C0\uC5ED \uB4DC\uB798\uADF8: \uC774\uB3D9 \xB7 \uAF2D\uC9D3\uC810 \uB4DC\uB798\uADF8: \uBAA8\uC591 \uC218\uC815 \xB7 \uC6B0\uD074\uB9AD: \uBA54\uB274" },
  "hint.annoSelected": { en: "Drag: move \xB7 Delete: remove", ko: "\uB4DC\uB798\uADF8: \uC774\uB3D9 \xB7 Delete: \uC0AD\uC81C" },
  "hint.regionVertices": { en: "{n} vertices \u2014 double-click/Enter to finish, Esc to cancel", ko: "\uAF2D\uC9D3\uC810 {n}\uAC1C \u2014 \uB354\uBE14\uD074\uB9AD/Enter\uB85C \uC644\uC131, Esc\uB85C \uCDE8\uC18C" },
  "hint.generating": { en: "Generating terrain\u2026", ko: "\uC9C0\uD615 \uC0DD\uC131 \uC911\u2026" },
  "hint.rendering": { en: "Rendering map\u2026 ({n} tiles)", ko: "\uC9C0\uB3C4 \uB80C\uB354\uB9C1 \uC911\u2026 ({n} \uD0C0\uC77C)" },
  // ── Panel tabs & sections ─────────────────────────────
  "tab.terrain": { en: "Terrain", ko: "\uC9C0\uD615" },
  "tab.style": { en: "Style", ko: "\uAFB8\uBBF8\uAE30" },
  "tab.elements": { en: "Elements", ko: "\uC694\uC18C" },
  "tab.file": { en: "File", ko: "\uD30C\uC77C" },
  "sec.genOptions": { en: "Terrain generation options", ko: "\uC9C0\uD615 \uC0DD\uC131 \uC635\uC158" },
  "gen.rivers": { en: "Rivers", ko: "\uAC15" },
  "gen.snow": { en: "Snow", ko: "\uB208" },
  "gen.desert": { en: "Desert", ko: "\uC0AC\uB9C9" },
  "gen.forest": { en: "Forest", ko: "\uC232" },
  "sec.generate": { en: "Generate", ko: "\uC0DD\uC131" },
  "btn.fullRandom": { en: "\u{1F3B2} Fully random", ko: "\u{1F3B2} \uC644\uC804 \uB79C\uB364 \uC0DD\uC131" },
  "lbl.seed": { en: "Seed", ko: "\uC2DC\uB4DC" },
  "aria.seedOnly": { en: "Randomize the seed only (keep settings)", ko: "\uC2DC\uB4DC\uB9CC \uBB34\uC791\uC704 (\uC124\uC815 \uC720\uC9C0)" },
  "note.generate": { en: "Continents, islands and sea level are chosen for you. Fine-tune in the advanced sections.", ko: "\uB300\uB959\xB7\uC12C\xB7\uD574\uC218\uBA74 \uB4F1\uC744 \uC54C\uC544\uC11C \uC815\uD569\uB2C8\uB2E4. \uC138\uBD80 \uC870\uC815\uC740 \uACE0\uAE09 \uC124\uC815\uC5D0\uC11C." },
  "sec.advLand": { en: "Advanced \xB7 land & sea", ko: "\uACE0\uAE09 \xB7 \uB300\uB959\uACFC \uBC14\uB2E4" },
  "sl.seaLevel": { en: "Sea level", ko: "\uD574\uC218\uBA74 \uB192\uC774" },
  "sl.continentCount": { en: "Continents", ko: "\uB300\uB959 \uC218" },
  "sl.islandCount": { en: "Islands", ko: "\uC12C \uC218" },
  "sl.landAmount": { en: "Continent size", ko: "\uB300\uB959 \uD06C\uAE30" },
  "sl.continents": { en: "Continent spread", ko: "\uB300\uB959 \uBD84\uD3EC" },
  "sl.roughness": { en: "Roughness", ko: "\uAC70\uCE60\uAE30" },
  "sec.advClimate": { en: "Advanced \xB7 climate & detail", ko: "\uACE0\uAE09 \xB7 \uAE30\uD6C4\uC640 \uB514\uD14C\uC77C" },
  "sl.climate": { en: "Climate", ko: "\uAE30\uD6C4 \uBD84\uD3EC" },
  "sl.detail": { en: "Detail", ko: "\uB514\uD14C\uC77C" },
  "sl.precision": { en: "Precision", ko: "\uC815\uBC00\uB3C4" },
  "sl.polarNorth": { en: "North polar snow", ko: "\uBD81\uADF9 \uC124\uC6D0" },
  "sl.polarSouth": { en: "South polar snow", ko: "\uB0A8\uADF9 \uC124\uC6D0" },
  "sec.advWater": { en: "Advanced \xB7 water & erosion", ko: "\uACE0\uAE09 \xB7 \uBB3C\uACFC \uCE68\uC2DD" },
  "sl.erosion": { en: "Erosion", ko: "\uCE68\uC2DD" },
  "sl.riverDensity": { en: "River density", ko: "\uAC15 \uBC00\uB3C4" },
  "sec.resetEdits": { en: "Reset edits", ko: "\uD3B8\uC9D1 \uCD08\uAE30\uD654" },
  "btn.clearEdits": { en: "Reset terrain edits", ko: "\uC9C0\uD615 \uD3B8\uC9D1 \uCD08\uAE30\uD654" },
  "btn.clearPaint": { en: "Reset biome paint", ko: "\uBC14\uC774\uC634 \uD398\uC778\uD2B8 \uCD08\uAE30\uD654" },
  "sec.mapSize": { en: "Map size", ko: "\uC9C0\uB3C4 \uD06C\uAE30" },
  "btn.applySize": { en: "Apply size", ko: "\uD06C\uAE30 \uC801\uC6A9" },
  "note.mapSize": {
    en: "128\u20133072 cells. Large maps render progressively in tiles; bigger maps generate more slowly. Brush edits are interpolated and kept.",
    ko: "128~3072 \uC140. \uD070 \uC9C0\uB3C4\uB294 \uD0C0\uC77C \uB2E8\uC704\uB85C \uC21C\uCC28 \uB80C\uB354\uB429\uB2C8\uB2E4(\uCCAD\uD06C). \uD074\uC218\uB85D \uC0DD\uC131\uC774 \uB290\uB824\uC9C0\uB2C8 \uC8FC\uC758. \uBE0C\uB7EC\uC2DC \uD3B8\uC9D1\uC740 \uBCF4\uAC04\uB418\uC5B4 \uC720\uC9C0\uB429\uB2C8\uB2E4."
  },
  "sec.terrainColors": { en: "Terrain colors", ko: "\uC9C0\uD615 \uC0C9\uC0C1" },
  "btn.resetColors": { en: "Restore default colors", ko: "\uAE30\uBCF8 \uC0C9\uC0C1 \uBCF5\uC6D0" },
  "sec.coast": { en: "Coastline", ko: "\uD574\uC548\uC120" },
  "sl.coastWidth": { en: "Width", ko: "\uD3ED" },
  "lbl.coastColor": { en: "Band color", ko: "\uB760 \uC0C9\uC0C1" },
  "btn.auto": { en: "Auto", ko: "\uC790\uB3D9" },
  "sec.effects": { en: "Whole-map effects", ko: "\uC804\uCCB4 \uD6A8\uACFC" },
  "fx.frame": { en: "Frame", ko: "\uD14C\uB450\uB9AC" },
  "fx.waves": { en: "Waves", ko: "\uD30C\uB3C4" },
  "fx.vignette": { en: "Vignette", ko: "\uBE44\uB124\uD2B8" },
  "sec.texture": { en: "Texture", ko: "\uC9C8\uAC10" },
  "sl.grain": { en: "Paper grain", ko: "\uC885\uC774 \uACB0" },
  "sl.relief": { en: "Shading (wash)", ko: "\uBA85\uC554(\uC6CC\uC2DC)" },
  "sl.mottle": { en: "Paper mottle", ko: "\uC885\uC774 \uC5BC\uB8E9" },
  "sl.markerScale": { en: "Icon size", ko: "\uC544\uC774\uCF58 \uD06C\uAE30" },
  "sec.textElements": { en: "Text elements", ko: "\uD14D\uC2A4\uD2B8 \uC694\uC18C" },
  "orn.title": { en: "Title", ko: "\uC81C\uBAA9" },
  "orn.label": { en: "Place name", ko: "\uC9C0\uBA85" },
  "orn.banner": { en: "Ribbon banner", ko: "\uB9AC\uBCF8 \uBB38\uAD6C" },
  "orn.note": { en: "Note", ko: "\uBA54\uBAA8" },
  "aria.add": { en: "Add {name}", ko: "{name} \uCD94\uAC00" },
  "note.textElements": { en: "Double-click to edit text; drag to move, resize with the handle, Delete removes.", ko: "\uB354\uBE14\uD074\uB9AD\uC73C\uB85C \uD14D\uC2A4\uD2B8 \uD3B8\uC9D1, \uB4DC\uB798\uADF8 \uC774\uB3D9\xB7\uD06C\uAE30 \uC870\uC808\xB7Delete \uC0AD\uC81C." },
  "sec.stickers": { en: "Decorative stickers", ko: "\uAFB8\uBBF8\uAE30 \uC2A4\uD2F0\uCEE4" },
  "btn.customSticker": { en: "Add my sticker (vault image)\u2026", ko: "\uB0B4 \uC2A4\uD2F0\uCEE4 \uCD94\uAC00 (\uBCFC\uD2B8 \uC774\uBBF8\uC9C0)\u2026" },
  "note.stickers": {
    en: "Click to add at the map center \u2014 drag to move, resize, Delete removes. Custom stickers use vault PNGs (transparent background recommended).",
    ko: "\uD074\uB9AD\uD574 \uC9C0\uB3C4 \uC911\uC559\uC5D0 \uCD94\uAC00 \u2014 \uB4DC\uB798\uADF8 \uC774\uB3D9\xB7\uD06C\uAE30 \uC870\uC808\xB7Delete \uC0AD\uC81C. \uB0B4 \uC2A4\uD2F0\uCEE4\uB294 \uBCFC\uD2B8\uC758 PNG(\uD22C\uBA85 \uBC30\uACBD \uAD8C\uC7A5)\uB97C \uC0AC\uC6A9\uD569\uB2C8\uB2E4."
  },
  "sec.styleSec": { en: "Style", ko: "\uC2A4\uD0C0\uC77C" },
  "lbl.theme": { en: "Theme", ko: "\uD14C\uB9C8" },
  "style.parchment": { en: "Parchment", ko: "\uC591\uD53C\uC9C0" },
  "style.color": { en: "Color", ko: "\uCEEC\uB7EC" },
  "style.ink": { en: "Ink", ko: "\uC789\uD06C" },
  "chk.contours": { en: "Show contours (2D)", ko: "\uB4F1\uACE0\uC120 \uD45C\uC2DC (2D)" },
  "chk.coastHatch": { en: "Coastal hatching", ko: "\uD574\uC548 \uD5E4\uCE6D (\uC794\uC120)" },
  "chk.landHatch": { en: "Land hatching", ko: "\uC721\uC9C0 \uD5E4\uCE6D" },
  "chk.grid": { en: "Coordinate grid", ko: "\uC88C\uD45C \uACA9\uC790" },
  "chk.rhumb": { en: "Rhumb lines", ko: "\uD48D\uBC30\uC120 \uD45C\uC2DC" },
  "chk.fast": { en: "\u26A1 Fast render (lower quality)", ko: "\u26A1 \uBE60\uB978 \uB80C\uB354 (\uD488\uC9C8 \uC800\uD558)" },
  "sec.background": { en: "Map background", ko: "\uC9C0\uB3C4 \uBC30\uACBD" },
  "lbl.imagePrefix": { en: "Image: ", ko: "\uC774\uBBF8\uC9C0: " },
  "btn.toGenerated": { en: "Switch to generated terrain", ko: "\uC0DD\uC131 \uC9C0\uD615\uC73C\uB85C \uC804\uD658" },
  "btn.loadImage": { en: "Load vault image", ko: "\uBCFC\uD2B8 \uC774\uBBF8\uC9C0 \uBD88\uB7EC\uC624\uAE30" },
  "note.background": { en: "Load a hand-drawn or external map image and place markers on it.", ko: "\uC190\uADF8\uB9BC\xB7\uC678\uBD80 \uC81C\uC791 \uC9C0\uB3C4\uB97C \uBD88\uB7EC\uC640 \uB9C8\uCEE4\uB97C \uBC30\uCE58\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." },
  "sec.export": { en: "Export", ko: "\uB0B4\uBCF4\uB0B4\uAE30" },
  "btn.exportPng2x": { en: "Export as PNG image (2\xD7)", ko: "PNG \uC774\uBBF8\uC9C0\uB85C \uB0B4\uBCF4\uB0B4\uAE30 (2\xD7)" },
  "sec.layers": { en: "Placed elements (layers)", ko: "\uBC30\uCE58\uB41C \uC694\uC18C (\uB808\uC774\uC5B4)" },
  "note.layers": { en: "Top of the list = front of the map. On the canvas: Ctrl+\u2191/\u2193 one step, Ctrl+Shift+\u2191/\u2193 front/back.", ko: "\uBAA9\uB85D \uC704\uCABD = \uC9C0\uB3C4\uC5D0\uC11C \uC55E. \uCE94\uBC84\uC2A4\uC5D0\uC11C Ctrl+\u2191/\u2193(\uD55C \uCE78), Ctrl+Shift+\u2191/\u2193(\uB9E8 \uC55E/\uB4A4)\uB85C\uB3C4 \uC774\uB3D9." },
  "note.layersEmpty": { en: "Add elements to reorder them here.", ko: "\uC694\uC18C\uB97C \uCD94\uAC00\uD558\uBA74 \uC5EC\uAE30\uC11C \uC21C\uC11C\uB97C \uBC14\uAFC0 \uC218 \uC788\uC2B5\uB2C8\uB2E4." },
  "sec.markers": { en: "Markers", ko: "\uB9C8\uCEE4" },
  "note.markersEmpty": { en: "Click the map with the marker tool to add one.", ko: "\uB9C8\uCEE4 \uB3C4\uAD6C\uB85C \uC9C0\uB3C4\uB97C \uD074\uB9AD\uD574 \uCD94\uAC00\uD558\uC138\uC694." },
  // ── Paint / draw bars ─────────────────────────────────
  "paint.erase": { en: "Erase", ko: "\uC9C0\uC6B0\uAE30" },
  "aria.paintErase": { en: "Eraser (E) \u2014 remove painted biome", ko: "\uC9C0\uC6B0\uAC1C (E) \u2014 \uCE60\uD55C \uBC14\uC774\uC634 \uC81C\uAC70" },
  "lbl.size": { en: "Size", ko: "\uD06C\uAE30" },
  "lbl.width": { en: "Width", ko: "\uAD75\uAE30" },
  "lbl.dashed": { en: "Dashed", ko: "\uC810\uC120" },
  "draw.eraser": { en: "Eraser", ko: "\uC9C0\uC6B0\uAC1C" },
  "aria.drawErase": { en: "Eraser \u2014 click/drag over drawings to delete", ko: "\uC9C0\uC6B0\uAC1C \u2014 \uADF8\uB9BC \uC704\uB97C \uD074\uB9AD/\uB4DC\uB798\uADF8\uD574 \uC0AD\uC81C" },
  // ── Context menus ─────────────────────────────────────
  "menu.openNote": { en: "Open note", ko: "\uB178\uD2B8 \uC5F4\uAE30" },
  "menu.edit": { en: "Edit", ko: "\uD3B8\uC9D1" },
  "menu.front": { en: "Bring to front", ko: "\uB9E8 \uC55E\uC73C\uB85C" },
  "menu.back": { en: "Send to back", ko: "\uB9E8 \uB4A4\uB85C" },
  "menu.delete": { en: "Delete", ko: "\uC0AD\uC81C" },
  "menu.editVertices": { en: "Edit vertices", ko: "\uAF2D\uC9D3\uC810 \uD3B8\uC9D1" },
  "menu.editText": { en: "Edit text", ko: "\uD14D\uC2A4\uD2B8 \uD3B8\uC9D1" },
  "menu.setName": { en: "Set name (layers)", ko: "\uC774\uB984 \uC9C0\uC815 (\uB808\uC774\uC5B4)" },
  "menu.forward": { en: "Forward one step (Ctrl+\u2191)", ko: "\uC55E\uC73C\uB85C \uD55C \uCE78 (Ctrl+\u2191)" },
  "menu.backward": { en: "Back one step (Ctrl+\u2193)", ko: "\uB4A4\uB85C \uD55C \uCE78 (Ctrl+\u2193)" },
  "menu.front2": { en: "To front (Ctrl+Shift+\u2191)", ko: "\uB9E8 \uC55E\uC73C\uB85C (Ctrl+Shift+\u2191)" },
  "menu.back2": { en: "To back (Ctrl+Shift+\u2193)", ko: "\uB9E8 \uB4A4\uB85C (Ctrl+Shift+\u2193)" },
  "aria.rename": { en: "Set name", ko: "\uC774\uB984 \uC9C0\uC815" },
  "aria.forward": { en: "Forward one step", ko: "\uC55E\uC73C\uB85C \uD55C \uCE78" },
  "aria.backward": { en: "Back one step", ko: "\uB4A4\uB85C \uD55C \uCE78" },
  "aria.delete": { en: "Delete", ko: "\uC0AD\uC81C" },
  // ── Modals ────────────────────────────────────────────
  "modal.editMarker": { en: "Edit marker", ko: "\uB9C8\uCEE4 \uD3B8\uC9D1" },
  "modal.newMarker": { en: "New marker", ko: "\uC0C8 \uB9C8\uCEE4" },
  "modal.name": { en: "Name", ko: "\uC774\uB984" },
  "modal.icon": { en: "Icon", ko: "\uC544\uC774\uCF58" },
  "modal.size": { en: "Size", ko: "\uD06C\uAE30" },
  "modal.linkedNote": { en: "Linked note", ko: "\uC5F0\uACB0\uB41C \uB178\uD2B8" },
  "modal.none": { en: "None", ko: "\uC5C6\uC74C" },
  "modal.chooseNote": { en: "Choose note", ko: "\uB178\uD2B8 \uC120\uD0DD" },
  "modal.unlink": { en: "Unlink", ko: "\uC5F0\uACB0 \uD574\uC81C" },
  "modal.delete": { en: "Delete", ko: "\uC0AD\uC81C" },
  "modal.save": { en: "Save", ko: "\uC800\uC7A5" },
  "modal.editRegion": { en: "Edit region", ko: "\uC9C0\uC5ED \uD3B8\uC9D1" },
  "modal.newRegion": { en: "New region", ko: "\uC0C8 \uC9C0\uC5ED" },
  "modal.color": { en: "Color", ko: "\uC0C9\uC0C1" },
  "modal.searchNote": { en: "Search for a note to link...", ko: "\uC5F0\uACB0\uD560 \uB178\uD2B8\uB97C \uAC80\uC0C9..." },
  "modal.searchImage": { en: "Search map images... (png/jpg/webp)", ko: "\uC9C0\uB3C4 \uC774\uBBF8\uC9C0\uB97C \uAC80\uC0C9... (png/jpg/webp)" },
  "heading.editTitle": { en: "Edit title", ko: "\uC81C\uBAA9 \uD3B8\uC9D1" },
  "heading.editNote": { en: "Edit note (Ctrl+Enter saves)", ko: "\uBA54\uBAA8 \uD3B8\uC9D1 (Ctrl+Enter \uC800\uC7A5)" },
  "heading.editBanner": { en: "Edit ribbon text", ko: "\uB9AC\uBCF8 \uBB38\uAD6C \uD3B8\uC9D1" },
  "heading.editText": { en: "Edit text", ko: "\uD14D\uC2A4\uD2B8 \uD3B8\uC9D1" },
  "heading.setName": { en: "Name this element (for the layer list)", ko: "\uC694\uC18C \uC774\uB984 \uC9C0\uC815 (\uB808\uC774\uC5B4 \uC2DD\uBCC4\uC6A9)" },
  // ── Placed-element display names ──────────────────────
  "ornname.compass": { en: "Compass", ko: "\uB098\uCE68\uBC18" },
  "ornname.ship": { en: "Ship", ko: "\uBC94\uC120" },
  "ornname.monster": { en: "Sea monster", ko: "\uBC14\uB2E4 \uAD34\uBB3C" },
  "ornname.title": { en: "Title \xB7 ", ko: "\uC81C\uBAA9 \xB7 " },
  "ornname.label": { en: "Place \xB7 ", ko: "\uC9C0\uBA85 \xB7 " },
  "ornname.banner": { en: "Ribbon \xB7 ", ko: "\uB9AC\uBCF8 \xB7 " },
  "ornname.note": { en: "Note \xB7 ", ko: "\uBA54\uBAA8 \xB7 " },
  "ornname.customSticker": { en: "My sticker \xB7 ", ko: "\uB0B4 \uC2A4\uD2F0\uCEE4 \xB7 " },
  "ornname.sticker": { en: "Sticker", ko: "\uC2A4\uD2F0\uCEE4" },
  // ── Marker icon labels ────────────────────────────────
  "icon.pin": { en: "Pin", ko: "\uD540" },
  "icon.castle": { en: "Castle", ko: "\uC131" },
  "icon.town": { en: "Town", ko: "\uB9C8\uC744" },
  "icon.anchor": { en: "Harbor", ko: "\uD56D\uAD6C" },
  "icon.mountain": { en: "Mountain", ko: "\uC0B0" },
  "icon.tree": { en: "Forest", ko: "\uC232" },
  "icon.tower": { en: "Tower", ko: "\uD0D1" },
  "icon.temple": { en: "Temple", ko: "\uC2E0\uC804" },
  "icon.swords": { en: "Battlefield", ko: "\uC804\uC7A5" },
  "icon.gem": { en: "Treasure", ko: "\uBCF4\uBB3C" },
  "icon.tent": { en: "Camp", ko: "\uC57C\uC601\uC9C0" },
  "icon.star": { en: "Landmark", ko: "\uBA85\uC18C" },
  "icon.x": { en: "X mark", ko: "X \uD45C\uC2DC" },
  "icon.skull": { en: "Danger", ko: "\uC704\uD5D8" },
  "icon.flag": { en: "Flag", ko: "\uAE43\uBC1C" },
  "icon.chest": { en: "Treasure chest", ko: "\uBCF4\uBB3C\uC0C1\uC790" },
  "icon.cross": { en: "Sanctuary", ko: "\uC131\uC18C" },
  // ── Sticker categories & labels ───────────────────────
  "cat.sky": { en: "Sky", ko: "\uD558\uB298" },
  "cat.sea": { en: "Sea", ko: "\uBC14\uB2E4" },
  "cat.land": { en: "Land", ko: "\uB545" },
  "cat.map": { en: "Map", ko: "\uC9C0\uB3C4" },
  "sticker.cloud": { en: "Cloud", ko: "\uAD6C\uB984" },
  "sticker.sun": { en: "Sun", ko: "\uD0DC\uC591" },
  "sticker.moon": { en: "Crescent moon", ko: "\uCD08\uC2B9\uB2EC" },
  "sticker.birds": { en: "Flock of birds", ko: "\uC0C8 \uB5BC" },
  "sticker.whale": { en: "Whale", ko: "\uACE0\uB798" },
  "sticker.fish": { en: "School of fish", ko: "\uBB3C\uACE0\uAE30 \uB5BC" },
  "sticker.whirlpool": { en: "Whirlpool", ko: "\uC18C\uC6A9\uB3CC\uC774" },
  "sticker.waves": { en: "Waves", ko: "\uD30C\uB3C4" },
  "sticker.dragon": { en: "Dragon", ko: "\uB4DC\uB798\uACE4" },
  "sticker.tent": { en: "Camp", ko: "\uC57C\uC601\uC9C0" },
  "sticker.ruins": { en: "Ancient ruins", ko: "\uACE0\uB300 \uC720\uC801" },
  "sticker.tower": { en: "Tower", ko: "\uD0D1" },
  "sticker.wind": { en: "Wind", ko: "\uBC14\uB78C" },
  "sticker.storm": { en: "Storm cloud", ko: "\uD3ED\uD48D \uAD6C\uB984" },
  "sticker.lighthouse": { en: "Lighthouse", ko: "\uB4F1\uB300" },
  "sticker.kraken": { en: "Kraken", ko: "\uD06C\uB77C\uCF04" },
  "sticker.castle": { en: "Castle", ko: "\uC131" },
  "sticker.bridge": { en: "Bridge", ko: "\uB2E4\uB9AC" },
  "sticker.windmill": { en: "Windmill", ko: "\uD48D\uCC28" },
  "sticker.inkblot": { en: "Ink blot", ko: "\uC789\uD06C \uC5BC\uB8E9" },
  "sticker.scroll": { en: "Scroll", ko: "\uB450\uB8E8\uB9C8\uB9AC" },
  "sticker.flourish": { en: "Corner flourish", ko: "\uBAA8\uC11C\uB9AC \uC7A5\uC2DD" }
};
function t(key) {
  const m = M[key];
  if (!m) return key;
  return m[current] ?? m.en;
}

// src/main.ts
var DEFAULT_SETTINGS = {
  locale: "en"
  // English by default; the map's own language is always English
};
var VellumPlugin = class extends import_obsidian4.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    setLocale(this.settings.locale);
    this.registerView(VIEW_TYPE_FMAP, (leaf) => new VellumView(leaf));
    this.registerExtensions(["fmap"], VIEW_TYPE_FMAP);
    this.addSettingTab(new VellumSettingTab(this.app, this));
    this.addRibbonIcon("map", t("cmd.newMapRibbon"), () => void this.createNewMap());
    this.addCommand({
      id: "create-map",
      name: t("cmd.newMap"),
      callback: () => void this.createNewMap()
    });
    this.addCommand({
      id: "install-sample",
      name: t("cmd.installSample"),
      callback: async () => {
        const file = await installSamplePack(this.app);
        if (file) {
          await this.app.workspace.getLeaf(true).openFile(file);
          new import_obsidian4.Notice(t("notice.sampleInstalled"));
        }
      }
    });
    this.addCommand({
      id: "export-png",
      name: t("cmd.exportPng"),
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(VellumView);
        if (!view) return false;
        if (checking) return true;
        void view.exportPNG();
        return true;
      }
    });
    this.addCommand({
      id: "locate-note-on-map",
      name: t("cmd.locateNote"),
      checkCallback: (checking) => {
        const active = this.app.workspace.getActiveFile();
        if (!active || active.extension !== "md") return false;
        if (checking) return true;
        void this.locateNoteOnMap(active);
        return true;
      }
    });
  }
  onunload() {
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  /** Apply a locale change: persist, switch the string table */
  async applyLocale(locale) {
    this.settings.locale = locale;
    setLocale(locale);
    await this.saveSettings();
    new import_obsidian4.Notice(t("notice.restartNeeded") || "Language changed. Please close and reopen map views to apply.");
  }
  async createNewMap() {
    const parent = this.getActiveFolder();
    const base = parent === "/" || parent === "" ? "" : parent + "/";
    let path = (0, import_obsidian4.normalizePath)(`${base}New Map.fmap`);
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = (0, import_obsidian4.normalizePath)(`${base}New Map ${++n}.fmap`);
    }
    const data = defaultMapData(path.replace(/\.fmap$/, "").split("/").pop() ?? "Map");
    data.gen = randomizeGenParams(data.gen.seed);
    const file = await this.app.vault.create(path, JSON.stringify(data, null, 2));
    await this.app.workspace.getLeaf(true).openFile(file);
  }
  getActiveFolder() {
    const active = this.app.workspace.getActiveFile();
    if (active?.parent) return active.parent.path;
    const root = this.app.vault.getRoot();
    return root instanceof import_obsidian4.TFolder ? root.path : "/";
  }
  /** Search every .fmap in the vault for a marker referencing this note, and open that map */
  async locateNoteOnMap(note) {
    const maps = this.app.vault.getFiles().filter((f) => f.extension === "fmap");
    for (const mapFile of maps) {
      try {
        const data = parseMapData(await this.app.vault.cachedRead(mapFile));
        const hit = data.markers.find((m) => m.notePath === note.path);
        if (!hit) continue;
        let targetView = null;
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_FMAP)) {
          const v = leaf.view;
          if (v instanceof VellumView && v.file?.path === mapFile.path) {
            this.app.workspace.revealLeaf(leaf);
            targetView = v;
            break;
          }
        }
        if (!targetView) {
          const leaf = this.app.workspace.getLeaf(true);
          await leaf.openFile(mapFile);
          const v = leaf.view;
          if (v instanceof VellumView) targetView = v;
        }
        let tries = 0;
        const attempt = () => {
          if (targetView?.focusMarkerByNote(note.path)) return;
          if (++tries < 12) window.setTimeout(attempt, 150);
        };
        window.setTimeout(attempt, 100);
        return;
      } catch {
      }
    }
    new import_obsidian4.Notice(t("notice.noMarkerMap"));
  }
};
var VellumSettingTab = class extends import_obsidian4.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian4.Setting(containerEl).setName(t("settings.language")).setDesc(t("settings.languageDesc")).addDropdown((dd) => {
      Object.keys(LOCALE_LABELS).forEach((code) => dd.addOption(code, LOCALE_LABELS[code]));
      dd.setValue(this.plugin.settings.locale);
      dd.onChange(async (v) => {
        await this.plugin.applyLocale(v);
        this.display();
      });
    });
  }
};
