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
    // 고전 판타지 지도 문법: 땅은 거의 평평한 크림 톤, 지형은 글리프·잉크선이 표현
    // (언덕/산 색 단차를 좁게 — 넓은 갈색 테라스 밴딩 방지)
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

/** 사용자 색 오버라이드 키 → 팔레트 슬롯 */
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

/** 부드러운 값 노이즈 (bilinear) — 종이 얼룩용 */
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
 * 화면 해상도 종이/잉크 결 타일 (한 번 생성 후 캐시).
 * 지도 위에 repeat 패턴으로 얹어 배율과 무관하게 고운 붓펜 질감을 준다.
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
      const speck = hash2(x * 13 + 1, y * 7 + 3);         // 고운 반점
      const fiber = smoothVal(x, y * 0.35, 3.2);          // 결(fiber)
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

/** 해안 동심 잔선(coast rings) 최대 거리 (셀) — waterDistance BFS 범위와 연동 */
export const COAST_RING_MAX = 17;

/** 잔선 위치(셀 거리)와 어둡기 — 해안에서 멀어질수록 간격이 벌어지고 옅어진다 */
const COAST_RINGS: [number, number][] = [[2.4, 13], [4.8, 9], [7.8, 6.5], [11.4, 4.5], [15.6, 3]];

/**
 * 고지도풍 바다 디테일: 수면 결 스트릭 + 해안 동심 잔선.
 * RGB에 더할 스칼라 델타를 돌려준다 (base 렌더와 LOD 상세 렌더 공용).
 */
export function oceanExtraShade(x: number, y: number, d: number): number {
  // 수면 결: 가로로 긴 은은한 스트릭
  let v = (smoothVal(x + 533, y * 3.1 + 97, 9) - 0.5) * 6.5;
  if (d >= 1 && d <= COAST_RING_MAX) {
    for (let k = 0; k < COAST_RINGS.length; k++) {
      const t = (d - COAST_RINGS[k][0]) / 0.7;
      v -= Math.exp(-t * t) * COAST_RINGS[k][1];
    }
  }
  return v;
}

/** 육지 수채 워시 변주: 평지의 밋밋한 단색을 깨는 저주파 식생 얼룩 (RGB 델타) */
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
  coastWidth?: number;  // 해안 띠 폭 (셀)
  coastColor?: string;  // 해안 띠 색 (없으면 자동)
  waves?: boolean;      // 해안 파도 무늬
  relief?: number;      // 명암(워시) 대비 배율 (기본 1)
  mottle?: number;      // 종이 얼룩 배율 (기본 1)
}

/** 지형 레이어: 베이스 픽셀 + 글리프 스탬프 (뷰가 겹쳐 그린다) */
export interface MapLayers {
  base: HTMLCanvasElement;
  stamps: HTMLCanvasElement;
  ss: number;            // 스탬프 초과표본 배율 (확대 시 뭉개짐 완화)
  waterDist: Uint8Array; // 육지로부터 물 셀 거리 (파도·해안띠 공용)
}

function isWaterBiome(b: number): boolean {
  return b === B.DEEP || b === B.OCEAN;
}

const WAVE_DIST = 12;

/** 육지로부터의 물 셀 거리 BFS (maxD 초과는 255) */
function waterDistance(biome: Uint8Array, w: number, h: number, maxD: number): Uint8Array {
  return distanceField(biome, w, h, maxD, true);
}

/** 육지 셀의 물가로부터 거리 (육지 헤칭용) */
export function landDistance(biome: Uint8Array, w: number, h: number, maxD: number): Uint8Array {
  return distanceField(biome, w, h, maxD, false);
}

/** 경계로부터의 셀 거리 BFS — targetWater=true면 물 셀의 육지 거리, false면 육지 셀의 물 거리 */
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

/** 빈 레이어 할당 (픽셀 미렌더) — 프로그레시브 타일 렌더의 시작점 */
export function allocLayers(t: TerrainResult, opts: RenderOpts = {}): MapLayers {
  const base = document.createElement("canvas");
  base.width = t.w;
  base.height = t.h;
  // 나무·산 기호는 고해상도로 그려 확대 시 뭉개짐을 완화 (지도 클수록 배율 낮춤)
  const ss = t.w <= 640 ? 3 : t.w <= 900 ? 2.5 : t.w <= 1600 ? 2 : 1.5;
  const stamps = document.createElement("canvas");
  stamps.width = Math.round(t.w * ss);
  stamps.height = Math.round(t.h * ss);
  return {
    base, stamps, ss,
    waterDist: waterDistance(t.biome, t.w, t.h, Math.max(WAVE_DIST, COAST_RING_MAX, Math.round(opts.coastWidth ?? 0) * 3)),
  };
}

/** 한 타일(셀 사각형)의 베이스+스탬프 렌더 — 프로그레시브 스케줄러가 호출 */
export function renderTile(
  layers: MapLayers, t: TerrainResult, style: StyleId, opts: RenderOpts,
  x0: number, y0: number, x1: number, y1: number,
): void {
  paintBaseRect(layers, t, style, opts, x0, y0, x1, y1);
  stampRect(layers, t, style, opts, x0, y0, x1, y1);
}

/** 전체 레이어 렌더 (동기, 소형·내보내기·하네스용) */
export function renderLayers(t: TerrainResult, style: StyleId, opts: RenderOpts = {}): MapLayers {
  const layers = allocLayers(t, opts);
  renderTile(layers, t, style, opts, 0, 0, t.w - 1, t.h - 1);
  return layers;
}

/**
 * 브러시 영역만 다시 그리기 (즉석 반영).
 * 물↔육지 경계가 바뀌므로 해안띠 거리도 갱신하되, BFS는 선형이라 수 ms.
 */
export function updateLayersRect(
  layers: MapLayers, t: TerrainResult, style: StyleId, opts: RenderOpts,
  x0: number, y0: number, x1: number, y1: number,
): void {
  layers.waterDist = waterDistance(t.biome, t.w, t.h, Math.max(WAVE_DIST, COAST_RING_MAX, Math.round(opts.coastWidth ?? 0) * 3));
  // 해안띠·파도·동심 잔선이 브러시 밖까지 번지므로 여유를 두고 다시 그림
  const pad = Math.max(WAVE_DIST, COAST_RING_MAX, Math.round(opts.coastWidth ?? 0) * 3) + 8;
  const rx0 = Math.max(0, x0 - pad), ry0 = Math.max(0, y0 - pad);
  const rx1 = Math.min(t.w - 1, x1 + pad), ry1 = Math.min(t.h - 1, y1 + pad);
  paintBaseRect(layers, t, style, opts, rx0, ry0, rx1, ry1);
  stampRect(layers, t, style, opts, rx0, ry0, rx1, ry1);
}

/** 픽셀 레이어: 물 깊이·힐셰이딩·해안띠·종이 질감 (해안선·강은 벡터로 그리므로 제외) */
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
        // 얕은 물도 22%는 이미 깊은 색 → 해안 선반이 민트색으로 떠 보이지 않게 램프 압축.
        // 호수는 수면고도가 해수면 이상이라 depth가 0으로 떠 보임 → 중간 깊이 고정.
        const rawDepth = Math.min(1, Math.max(0, (seaLevel - el) / 0.25));
        const depth = t.lake[i] ? 0.4 : 0.22 + 0.78 * Math.pow(rawDepth, 0.7);
        const dp = pal.deep, oc = pal.ocean;
        r = oc[0] + (dp[0] - oc[0]) * depth;
        g = oc[1] + (dp[1] - oc[1]) * depth;
        bl = oc[2] + (dp[2] - oc[2]) * depth;
        // 물가 하이라이트: 좁은 지수 감쇠 밴드 (경계 띠가 아니라 물가의 빛으로 읽히게).
        // 호수는 전체가 밴드에 잠겨 색이 떠 버리므로 제외.
        if (coastW > 0 && !t.lake[i]) {
          const d = layers.waterDist[i];
          if (d <= coastW * 3) {
            const f = Math.exp(-(d - 1) / (coastW * 0.9)) * 0.38;
            r += (coastRGB[0] - r) * f;
            g += (coastRGB[1] - g) * f;
            bl += (coastRGB[2] - bl) * f;
          }
        }
        // 물가선: 육지와 맞닿은 물 픽셀을 살짝 어둡게 (호수 윤곽)
        if (t.lake[i] && layers.waterDist[i] === 1) {
          const ck = pal.coastline;
          r = r * 0.45 + ck[0] * 0.55;
          g = g * 0.45 + ck[1] * 0.55;
          bl = bl * 0.45 + ck[2] * 0.55;
        }
        // 수면 결 + 해안 동심 잔선 (고지도 잔물결)
        const ex = oceanExtraShade(x, y, layers.waterDist[i]);
        r += ex; g += ex * 0.98; bl += ex * 0.9;
      } else {
        // 바이옴 경계 스무딩: 이웃 셀 바이옴 색상을 bilinear 보간하여 경계선을 부드럽게
        // (renderDetail의 Gaussian 3×3보다는 연하지만 드래그 중에도 균일한 렌더링 제공)
        const x1b = Math.min(w - 1, x + 1), y1b = Math.min(h - 1, y + 1);
        const c00 = biomeColor(pal, biome[i]);
        const c10 = biomeColor(pal, biome[y * w + x1b]);
        const c01 = biomeColor(pal, biome[y1b * w + x]);
        const c11 = biomeColor(pal, biome[y1b * w + x1b]);
        // 0.5 offset - half-cell bilinear 중성 보간
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
      // 종이 얼룩 (모든 스타일) — 평평한 디지털 색을 깨뜨려 오래된 종이 느낌.
      // 물은 절반 이하로 — 바다가 얼룩덜룩하면 경계가 지저분해 보인다 (LOD 렌더와 동일 계수)
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

/** 스탬프 레이어: 숲 나무·산 능선 글리프 + 해안 파도 */
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
  ctx.scale(ss, ss); // 셀 좌표로 그리되 ss배 해상도로 래스터화 → 확대에 강함
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

      // 글리프가 해안선·지도 밖을 침범하면 반쪽으로 잘려 보인다 — 발밑이 전부 육지일 때만 찍는다
      const fitsLand = (r: number): boolean => {
        for (const [ox2, oy2] of [[-r, 0], [r, 0], [0, -r], [0, r]] as const) {
          const tx = Math.round(jx + ox2), ty = Math.round(jy + oy2);
          if (tx < 0 || ty < 0 || tx >= w || ty >= h) return false;
          if (isWaterBiome(biome[ty * w + tx])) return false;
        }
        return true;
      };

      if (b === B.FOREST && rnd < 0.85) {
        // 나무: 바닥 그림자 + 몸통 + 손그림식 다면 수관 + 좌하단 음영 (덩어리감)
        const s = 2.2 + rnd * 1.7;
        const radius = s * 0.62;
        const cy = jy - s * 0.15;
        if (!fitsLand(s * 1.15)) continue;

        // 바닥 그림자 (수관이 겹칠 때 숲 덩어리로 읽히게)
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
          // 결정론적 노이즈를 섞어 손선 떨림 구현
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
        // 수관 좌하단 음영 (볼륨)
        ctx.save();
        ctx.clip(canopy);
        ctx.fillStyle = `rgba(${fc[0] * 0.55},${fc[1] * 0.6},${fc[2] * 0.5},0.5)`;
        ctx.beginPath();
        ctx.ellipse(jx - radius * 0.45, cy + radius * 0.45, radius * 0.85, radius * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.stroke(canopy);
      } else if (b === B.HILL && rnd < 0.5) {
        // 언덕: 낮은 둔덕 아크 + 우측 짧은 해칭 (색만 다른 밋밋함 제거)
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
        // 우측 경사 해칭 1~2획
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
        // 해안 파도: 육지 근처 물에 잔물결 획 (고지도 스타일)
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

  // 산: 성긴 별도 그리드 + 행마다 반 칸 엇갈림 — 균일 격자 '삼각형 카펫'이 아니라
  // 겹치는 산줄기(chain)로 읽히게 한다 (Tolkien풍: 크고 굵은 봉우리의 열)
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
        if (b === B.SNOW && (rel < 0.55 || rnd > 0.65)) continue; // 설원엔 드문 설봉만
        // 산: 능선 꺾임 지터 + 좌측면 밝음/우측면 잉크 워시로 볼륨 (판화풍)
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

        // 좌측면: 밝게 (햇빛)
        const leftFace = new Path2D();
        leftFace.moveTo(lbX, lbY);
        leftFace.lineTo(lmx, lmy);
        leftFace.lineTo(peakX, peakY);
        leftFace.lineTo(peakX + s * 0.04, jy + s * 0.5);
        leftFace.closePath();
        ctx.fillStyle = "rgba(255,251,240,0.32)";
        ctx.fill(leftFace);
        // 우측면: 잉크 워시 (그늘)
        const rightFace = new Path2D();
        rightFace.moveTo(peakX, peakY);
        rightFace.lineTo(rmx, rmy);
        rightFace.lineTo(rbX, rbY);
        rightFace.lineTo(peakX + s * 0.04, jy + s * 0.5);
        rightFace.closePath();
        ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.16)`;
        ctx.fill(rightFace);

        // 능선 잉크선
        ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.8)`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(lbX, lbY);
        ctx.lineTo(lmx, lmy);
        ctx.lineTo(peakX, peakY);
        ctx.lineTo(rmx, rmy);
        ctx.lineTo(rbX, rbY);
        ctx.stroke();

        // 산악 음영 해칭 (우측 경사면에 4~6겹의 부드러운 곡선 해칭)
        ctx.strokeStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.4)`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        const hatchCount = 4 + Math.floor(rnd * 3);
        for (let h = 1; h <= hatchCount; h++) {
          const t = h / (hatchCount + 1);
          // 해칭 시작점 (우측 경사면을 따라 이동)
          const startX = peakX + t * (rbX - peakX);
          const startY = peakY + t * (rbY - peakY);

          const hatchLen = s * 0.45 * (1 - t * 0.4) * (0.8 + 0.4 * hash2(jx + h, jy));
          // 직선이 아니라 안쪽으로 살짝 휘어지도록 컨트롤 포인트 설정
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
