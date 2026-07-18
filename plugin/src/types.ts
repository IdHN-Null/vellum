/** Map data model — persisted as JSON in .fmap files. */
import { mulberry32 } from "./noise";

export const PLUGIN_VERSION = "0.21.0";

export type StyleId = "parchment" | "color" | "ink";

/** Texture customisation (sliders) */
export interface TextureOpts {
  grain: number;      // 0..1.2 screen-space paper-grain overlay strength
  relief: number;     // 0..2 terrain shading (wash) contrast
  mottle: number;     // 0..2 paper mottling
  markerScale: number; // 0.5..3 global icon size multiplier
}

export function defaultTexture(): TextureOpts {
  return { grain: 0.5, relief: 1, mottle: 1, markerScale: 1 };
}

/** Whole-map effect toggles (compass & title became free-placed elements in v0.3) */
export interface DecorOpts {
  compass: boolean;   // (kept for legacy migration)
  frame: boolean;     // border frame
  title: boolean;     // (kept for legacy migration)
  waves: boolean;     // coastal wave marks
  vignette: boolean;  // edge vignette
}

export function defaultDecor(): DecorOpts {
  return { compass: true, frame: true, title: true, waves: true, vignette: true };
}

/** Free-placed map element: draggable, resizable, deletable */
export type OrnamentType = "compass" | "title" | "label" | "note" | "banner" | "ship" | "monster" | "sticker";

export interface Ornament {
  id: string;
  type: OrnamentType;
  x: number;      // 0..1 normalised centre coordinates
  y: number;
  sizeF: number;  // size as a fraction of min(W, H)
  text?: string;  // title/label/note content (\n for line breaks)
  name?: string;  // user-given name for the layer list (no effect on rendering)
  sticker?: string;   // type="sticker": built-in sticker id, or "custom"
  imagePath?: string; // sticker="custom": vault image path (user-made sticker)
}

export function defaultOrnaments(name: string): Ornament[] {
  return [
    { id: newId(), type: "compass", x: 0.89, y: 0.14, sizeF: 0.062 },
    { id: newId(), type: "title", x: 0.5, y: 0.075, sizeF: 0.052, text: name },
  ];
}

export interface GenParams {
  seed: number;
  seaLevel: number;      // 0..1 sea level height
  continents: number;    // 1..5 continent distribution (scale) — affects shape roughness
  continentCount: number; // number of continents (large landmasses; 0 = pure-noise mode)
  islandCount: number;    // number of islands (small landmasses)
  landAmount: number;     // 0..2 continent size multiplier
  roughness: number;     // 0..2 roughness
  climate: number;       // 0..1 climate distribution (moisture bias)
  detail: number;        // 0..2 detail
  precision: number;     // 0..2 vector contour precision (level count & simplification strength)
  erosion: number;       // 0..2 hydraulic erosion strength (droplet simulation)
  riverDensity: number;  // 0..2 river density (flow threshold)
  polarNorth: number;    // 0..0.5 north polar snowfield fraction
  polarSouth: number;    // 0..0.5 south polar snowfield fraction
  rivers: boolean;
  snow: boolean;
  desert: boolean;
  forest: boolean;
}

export interface Marker {
  id: string;
  x: number;             // 0..1 normalised coordinates
  y: number;
  name: string;
  icon: string;          // icon id
  color: string;
  size?: number;         // size multiplier (default 1)
  notePath?: string;     // linked note path
}

export interface Region {
  id: string;
  name: string;
  color: string;
  points: [number, number][]; // 0..1 normalised polygon
  notePath?: string;
}

/** Freehand annotation: path, arrow or free curve (for treasure-map markings) */
export type AnnotationKind = "free" | "arrow" | "line";

export interface Annotation {
  id: string;
  kind: AnnotationKind;
  points: [number, number][]; // 0..1 normalised
  color: string;
  width: number;   // px at scale=1
  dashed: boolean;
}

export interface MapData {
  version: 1;
  name: string;
  width: number;         // heightmap resolution
  height: number;
  mode: "generated" | "image";
  baseImagePath?: string;
  gen: GenParams;
  editsB64?: string;     // Int8 terrain edit deltas (base64)
  paintB64?: string;     // Uint8 biome paint overrides (base64, 0 = none)
  style: StyleId;
  showContours: boolean; // show the 2D contour overlay
  showGrid: boolean;     // coordinate grid border (A·B·C / 1·2·3)
  showRhumbLines: boolean; // show radial navigation lines from the compass
  fastRender: boolean;     // fast render (lower quality, speed first)
  styleColors?: Record<string, string>; // per-biome colour overrides (hex)
  coastWidth: number;    // coastal band width (cells, 0 = off)
  coastColor?: string;   // coastal band colour (automatic when unset)
  coastHatching: boolean; // engraving-style coastal hatching (equidistant water-side lines)
  landHatching: boolean;  // land hatching (fine lines carved inwards from the coast)
  decor: DecorOpts;      // whole-map effect toggles (frame, waves, vignette)
  texture: TextureOpts;  // texture sliders (grain, shading, mottle, icon size)
  ornaments: Ornament[]; // free-placed elements (compass, title, labels, notes)
  markers: Marker[];
  regions: Region[];
  annotations: Annotation[]; // freehand drawings (paths, arrows, free curves)
}

export function defaultGenParams(seed: number): GenParams {
  return {
    seed,
    seaLevel: 0.5,
    continents: 2,
    continentCount: 3,
    islandCount: 8,
    landAmount: 1.0,
    roughness: 1.0,
    climate: 0.55,
    detail: 1.0,
    precision: 1.0,
    erosion: 1.0,
    riverDensity: 1.0,
    polarNorth: 0.1,
    polarSouth: 0.1,
    rivers: true,
    snow: true,
    desert: true,
    forest: true,
  };
}

/**
 * Fully random generation parameters derived from the seed.
 * Users who never touch the advanced settings get a different world with every new
 * map (reproducible from the seed alone).
 */
export function randomizeGenParams(seed: number): GenParams {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const range = (lo: number, hi: number) => lo + rng() * (hi - lo);
  const p = defaultGenParams(seed);
  p.seaLevel = range(0.44, 0.58);
  p.continentCount = 1 + Math.floor(rng() * 5);      // 1..5
  p.islandCount = Math.floor(rng() * 16);            // 0..15
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

export function defaultMapData(name: string, seed?: number): MapData {
  return {
    version: 1,
    name,
    width: 512,
    height: 384,
    mode: "generated",
    gen: defaultGenParams(seed ?? Math.floor(Math.random() * 1000000)),
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
    regions: [],
  };
}

export function parseMapData(raw: string): MapData {
  const d = JSON.parse(raw) as Partial<MapData>;
  const base = defaultMapData(d.name ?? "지도");

  // Migration from v0.2 and earlier: promote fixed decorations (compass, title) to placed elements
  let ornaments: Ornament[];
  if (Array.isArray(d.ornaments)) {
    ornaments = d.ornaments;
  } else {
    ornaments = [];
    const oldDecor = d.decor ?? defaultDecor();
    if (oldDecor.compass !== false) {
      ornaments.push({ id: newId(), type: "compass", x: 0.89, y: 0.14, sizeF: 0.062 });
    }
    if (oldDecor.title !== false) {
      ornaments.push({ id: newId(), type: "title", x: 0.5, y: 0.075, sizeF: 0.052, text: d.name ?? "지도" });
    }
  }

  return {
    ...base,
    ...d,
    version: 1,
    gen: { ...base.gen, ...(d.gen ?? {}) },
    decor: { ...base.decor, ...(d.decor ?? {}) },
    texture: { ...base.texture, ...(d.texture ?? {}) },
    showRhumbLines: d.showRhumbLines !== false,
    fastRender: d.fastRender === true,
    coastHatching: d.coastHatching !== false,
    landHatching: d.landHatching !== false,
    ornaments,
    markers: Array.isArray(d.markers) ? d.markers : [],
    regions: Array.isArray(d.regions) ? d.regions : [],
    annotations: Array.isArray(d.annotations) ? d.annotations : [],
  } as MapData;
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Uint8Array → base64 */
function u8ToB64(u8: Uint8Array): string {
  let s = "";
  const chunk = 8192;
  for (let i = 0; i < u8.length; i += chunk) {
    s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + chunk)));
  }
  return btoa(s);
}

function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** RLE encoding: a sequence of [run length (1..255), value] pairs. The sparser the deltas, the smaller it gets. */
function rleEncode(u8: Uint8Array): Uint8Array {
  const out: number[] = [];
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

function rleDecode(data: Uint8Array, expectedLen: number): Uint8Array {
  const out = new Uint8Array(expectedLen);
  let o = 0;
  for (let i = 0; i + 1 < data.length && o < expectedLen; i += 2) {
    const run = data[i], v = data[i + 1];
    out.fill(v, o, Math.min(expectedLen, o + run));
    o += run;
  }
  return out;
}

/**
 * Int8 grid serialisation. An "R:" prefix marks RLE compression.
 * Keeps file size proportional to the amount actually edited, not the canvas area.
 */
export function bytesToB64(bytes: Int8Array): string {
  const u8 = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rle = rleEncode(u8);
  // In the pathological case where RLE grows the data (noisy input), store it raw
  if (rle.length < u8.length) return "R:" + u8ToB64(rle);
  return u8ToB64(u8);
}

export function b64ToBytes(b64: string, expectedLen: number): Int8Array {
  try {
    let u8: Uint8Array;
    if (b64.startsWith("R:")) {
      u8 = rleDecode(b64ToU8(b64.slice(2)), expectedLen);
    } else {
      u8 = b64ToU8(b64); // legacy dense format
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
