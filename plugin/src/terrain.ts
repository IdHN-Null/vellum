import { GenParams, MapData } from "./types";
import { Noise2D, fbm, mulberry32 } from "./noise";

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** 바이옴 코드 */
export const B = {
  DEEP: 0,
  OCEAN: 1,
  BEACH: 2,
  GRASS: 3,
  FOREST: 4,
  DESERT: 5,
  HILL: 6,
  MOUNTAIN: 7,
  SNOW: 8,
} as const;

/** 벡터 강줄기: 점 + 점별 폭(셀 단위, 유량에 비례해 하류로 갈수록 굵어짐) */
export interface RiverPath {
  pts: [number, number][];
  widths: number[];
  /** 합류하는 본류의 rivers 배열 인덱스 (렌더에서 끝점을 본류 중심선에 스냅) */
  joins?: number;
}

export interface TerrainResult {
  w: number;
  h: number;
  height: Float32Array; // 0..1
  biome: Uint8Array;
  river: Uint8Array;    // 0/1 강 마스크
  lake: Uint8Array;     // 0/1 호수 마스크
  rivers: RiverPath[];
  seaLevel: number;
}

/**
 * 시드·파라미터 → 정규화 노이즈 + 수리 침식 하이트맵 (편집·강 미적용).
 * 침식은 비싸지만(수만 물방울) 이 결과가 캐시되므로 브러시 성능에 영향 없다.
 */
export function generateBase(map: MapData): Float32Array {
  const w = map.width, h = map.height;
  const g = map.gen;
  const nH = new Noise2D(g.seed);
  const nD = new Noise2D(g.seed + 1013);
  const nW = new Noise2D(g.seed + 5501); // 도메인 워핑용

  const base = new Float32Array(w * h);
  const contFreq = 1.2 + g.continents * 0.75;
  const detOct = Math.max(2, Math.round(3 + g.detail * 3));
  const detGain = 0.42 + Math.min(g.roughness, 2) * 0.09;
  const aspect = h / w;

  // 대륙·섬 중심 배치 (개수 명시 제어). continentCount=0이면 순수 노이즈 방식.
  const cc = Math.max(0, Math.round(g.continentCount ?? 0));
  const ic = Math.max(0, Math.round(g.islandCount ?? 0));
  const useBlobs = cc > 0 || ic > 0;
  const landAmt = g.landAmount ?? 1;
  interface Spine { x0: number; y0: number; x1: number; y1: number; w: number; }
  interface Blob { cx: number; cy: number; r: number; s: number; spine?: Spine; }
  const blobs: Blob[] = [];
  if (useBlobs) {
    const rng = mulberry32(g.seed ^ 0x1a2b3c);
    const contR = (0.30 / Math.sqrt(Math.max(1, cc))) * landAmt;
    for (let i = 0; i < cc; i++) {
      const cx = 0.18 + rng() * 0.64;
      const cy = 0.18 + rng() * 0.64;
      const r = contR * (0.72 + rng() * 0.6);
      // 산맥 등뼈: 대륙마다 내부를 관통하는 능선 1줄기 보장 (판타지 지도 문법)
      const ang = rng() * Math.PI;
      const sl = r * (0.5 + rng() * 0.25);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const ucy = cy * aspect; // 거리 계산은 aspect 보정 공간에서
      blobs.push({
        cx, cy, r, s: 1,
        spine: { x0: cx - ca * sl, y0: ucy - sa * sl, x1: cx + ca * sl, y1: ucy + sa * sl, w: r * 0.115 },
      });
    }
    for (let i = 0; i < ic; i++) {
      blobs.push({
        cx: 0.06 + rng() * 0.88,
        cy: 0.06 + rng() * 0.88,
        r: (0.028 + rng() * 0.045) * landAmt,
        s: 0.9,
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
      let v: number;

      if (useBlobs) {
        // 도메인 워핑: 좌표를 노이즈로 밀어 원형 블롭을 유기적으로
        const wx = nxc + fbm(nW, nxc * 3, nyc * 3, 4) * 0.12;
        const wy = nyc + fbm(nW, nxc * 3 + 11, nyc * 3 + 7, 4) * 0.12;
        // 평원(plateau) 마스크: 내부는 평평(1), 해안 근처서만 하강 → 돔이 아닌 평지 중심
        let land = 0;
        for (const b of blobs) {
          const dx = wx - b.cx, dy = (wy - b.cy) * aspect;
          const t = Math.hypot(dx, dy) / b.r;
          if (t < 1.2) {
            const fall = t < 0.68 ? 1 : Math.max(0, 1 - (t - 0.68) / 0.32);
            land = Math.max(land, fall * b.s);
          }
        }
        const coastN = fbm(nD, nxc * contFreq * 3 + 7, nyc * contFreq * 3 + 3, detOct, 2, detGain);
        const edge = land + coastN * 0.22; // 해안선 거칠기

        if (edge < 0.5) {
          v = edge * 0.9; // 바다: 0..0.45 (멀수록 깊게)
        } else {
          const inland = Math.min(1, (edge - 0.5) * 2.5);
          // 산맥: 저주파 마스크로 위치를 정하고, 능선(ridged) 노이즈로 선형 산맥 형성
          const maskN = (fbm(nH, nxc * 1.7 + 4, nyc * 1.7 + 4, 3) + 1) * 0.5;
          const rr = fbm(nD, nxc * 3.4 + 20, nyc * 3.4 + 20, 5);
          const ridge = Math.max(0, 1 - Math.abs(rr) * 1.5);
          const gate = smoothstep(0.46, 0.76, maskN);
          // 대륙 등뼈 산맥: 세그먼트 거리 기반, 봉우리 노이즈로 굴곡
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
              const envelope = Math.sin(Math.PI * tt) ** 0.6; // 양끝 테이퍼
              const peaks = 0.55 + 0.45 * ((fbm(nD, wx * 7 + 40, wy * 7 + 40, 3) + 1) * 0.5);
              spine = Math.max(spine, prof * envelope * peaks * 0.8);
            }
          }
          const mtn = Math.max(ridge * gate, spine) * Math.min(1, inland * 2.5);
          // 평원은 넓고 낮게, 산맥은 선형으로 도드라지게 → 도시·왕국에 적합
          // (진폭 0.58: 침식 후에도 MOUNTAIN 분류 임계를 넘는 능선이 남도록)
          v = 0.52 + inland * 0.06 + mtn * 0.58 + coastN * 0.02;
        }
      } else {
        // 기존 순수 노이즈 방식 (continentCount=섬=0)
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
    // 절대 스케일 유지 (정규화하면 산봉우리 높이에 따라 평원 rel이 왜곡돼 산악화됨).
    // 고고도는 소프트 압축 — 하드 클램프가 만드는 '설원 고원 카펫'(넓은 rel=1 평면) 방지,
    // 만년설은 진짜 봉우리 끝에만 남는다.
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

/**
 * 물방울 수리 침식 — 경사면을 깎아 계곡을 새기고 저지대에 퇴적한다.
 * 절차 노이즈 특유의 '고른 울퉁불퉁함'이 사라지고 배수 지형이 생긴다.
 */
function erode(
  height: Float32Array, w: number, h: number,
  sea: number, strength: number, seed: number,
): void {
  const rng = mulberry32(seed ^ 0xe705);
  const drops = Math.floor(w * h * 0.18 * strength);
  const INERTIA = 0.06, CAP = 3.4, MIN_SLOPE = 0.008;
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
      // 쌍선형 그래디언트·높이
      const gx = (h10 - h00) * (1 - fy) + (h11 - h01) * fy;
      const gy = (h01 - h00) * (1 - fx) + (h11 - h10) * fx;
      const oldH = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;
      if (oldH < sea - 0.03) break; // 바다 도달

      dx = dx * INERTIA - gx * (1 - INERTIA);
      dy = dy * INERTIA - gy * (1 - INERTIA);
      const len = Math.hypot(dx, dy);
      if (len < 1e-8) break;
      dx /= len; dy /= len;
      px += dx; py += dy;
      if (px < 0 || py < 0 || px >= w - 1.001 || py >= h - 1.001) break;

      const nxi = px | 0, nyi = py | 0;
      const nfx = px - nxi, nfy = py - nyi;
      const j = nyi * w + nxi;
      const newH =
        height[j] * (1 - nfx) * (1 - nfy) + height[j + 1] * nfx * (1 - nfy) +
        height[j + w] * (1 - nfx) * nfy + height[j + w + 1] * nfx * nfy;
      const dh = newH - oldH;
      const cap = Math.max(-dh, MIN_SLOPE) * vel * water * CAP;

      if (sed > cap || dh > 0) {
        const dep = (dh > 0 ? Math.min(dh, sed) : (sed - cap) * DEPOSIT);
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

/** 베이스 + 편집 델타 → 최종 고도 (한 셀) */
export function composeHeight(base: number, edit: number): number {
  const v = base + edit / 254;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** 바이옴 분류기 — 전체/부분 재분류가 동일 규칙을 공유 */
export class Classifier {
  private g: GenParams;
  private nM: Noise2D;
  private w: number;
  private h: number;

  constructor(g: GenParams, w: number, h: number) {
    this.g = g;
    this.nM = new Noise2D(g.seed + 2027);
    this.w = w;
    this.h = h;
  }

  biomeAt(x: number, y: number, el: number): number {
    const { g, nM, w, h } = this;
    const sea = g.seaLevel;
    if (el < sea - 0.12) return B.DEEP;
    if (el < sea) return B.OCEAN;

    const lat = y / h;
    const polarJit = nM.noise((x / w) * 9 + 50, (y / h) * 9 + 50) * 0.035;
    const inPolar =
      (g.snow && g.polarNorth > 0 && lat < g.polarNorth + polarJit) ||
      (g.snow && g.polarSouth > 0 && lat > 1 - g.polarSouth + polarJit);

    const rel = (el - sea) / Math.max(0.0001, 1 - sea);
    const temp = 1 - Math.abs(lat * 2 - 1) * 0.9 - rel * 0.55;
    const moist = fbm(nM, (x / w) * 5, (y / h) * 5, 4) * 0.5 + 0.5 + (g.climate - 0.5) * 0.6;

    if (inPolar || (g.snow && rel > 0.9)) return B.SNOW;
    if (rel > 0.66) return B.MOUNTAIN;
    if (rel > 0.5) return B.HILL;
    if (rel < 0.035) return B.BEACH;
    if (g.desert && moist < 0.34 && temp > 0.42) return B.DESERT;
    if (g.forest && moist > 0.55 && temp > 0.2 && temp < 0.85) return B.FOREST;
    return B.GRASS;
  }
}

/** 페인트 오버라이드 적용 (한 셀) */
export function applyPaintAt(
  biome: number, paintVal: number, el: number, sea: number,
): number {
  if (paintVal <= 0) return biome;
  const b = paintVal - 1;
  return b === B.OCEAN && el < sea - 0.12 ? B.DEEP : b;
}

/** 전체 지형 합성: 고도 → 수문(호수·강) → 분류 → 페인트 */
export function composeTerrain(
  map: MapData,
  base: Float32Array,
  edits: Int8Array | null,
  paint: Uint8Array | null,
): TerrainResult {
  const w = map.width, h = map.height;
  const g = map.gen;
  const sea = g.seaLevel;

  const height = new Float32Array(w * h);
  for (let i = 0; i < height.length; i++) {
    height[i] = composeHeight(base[i], edits ? edits[i] : 0);
  }

  let river: Uint8Array = new Uint8Array(w * h);
  let lake: Uint8Array = new Uint8Array(w * h);
  let rivers: RiverPath[] = [];
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

/** 브러시 영역만 재계산 (수문은 finalize에서) */
export function updateTerrainRect(
  t: TerrainResult,
  map: MapData,
  base: Float32Array,
  edits: Int8Array | null,
  paint: Uint8Array | null,
  cls: Classifier,
  x0: number, y0: number, x1: number, y1: number,
): void {
  const w = t.w;
  const sea = map.gen.seaLevel;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * w + x;
      const el = composeHeight(base[i], edits ? edits[i] : 0);
      t.height[i] = el;
      let b = t.lake[i] && el >= sea ? B.OCEAN : cls.biomeAt(x, y, el);
      if (paint) b = applyPaintAt(b, paint[i], el, sea);
      t.biome[i] = b;
      if (el < sea) { t.river[i] = 0; t.lake[i] = 0; }
    }
  }
}

// ── 수문 시뮬레이션: 웅덩이 채우기 → 유향 → 유량 누적 → 강·호수 ──

interface Hydrology {
  river: Uint8Array;
  lake: Uint8Array;
  rivers: RiverPath[];
}

const DX8 = [1, -1, 0, 0, 1, 1, -1, -1];
const DY8 = [0, 0, 1, -1, 1, -1, 1, -1];

function hydrology(
  height: Float32Array, w: number, h: number,
  sea: number, riverDensity: number,
): Hydrology {
  const n = w * h;

  // 1) Priority-flood 웅덩이 채우기 (경계에서 낮은 순으로 물을 채워 스필 레벨 결정)
  //    epsilon 기울기를 더해 평탄면에서도 배수 방향이 생기게 한다.
  const filled = new Float32Array(height);
  const visited = new Uint8Array(n);
  const heap = new MinHeap(n);
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const i = y * w + x;
      if (!visited[i]) { visited[i] = 1; heap.push(filled[i], i); }
    }
  }
  for (let y = 1; y < h - 1; y++) {
    for (const x of [0, w - 1]) {
      const i = y * w + x;
      if (!visited[i]) { visited[i] = 1; heap.push(filled[i], i); }
    }
  }
  while (heap.size > 0) {
    const [level, i] = heap.pop();
    const x = i % w, y = (i / w) | 0;
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

  // 2) 호수: 채워진 높이가 원 지형보다 유의미하게 높고 해수면 위인 곳
  const lake = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (filled[i] > sea && filled[i] - height[i] > 0.006) lake[i] = 1;
  }

  // 3) 유향: 채워진 표면에서 가장 가파른 하강 이웃
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
        if (drop > bestDrop) { bestDrop = drop; best = ni; }
      }
      flowDir[i] = best;
    }
  }

  // 4) 유량 누적: 높은 곳부터 하류로 물을 흘려보낸다
  const order = new Uint32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  // Float32 키 내림차순 정렬
  const sorted = Array.from(order).sort((a, b) => filled[b] - filled[a]);
  const acc = new Float32Array(n).fill(1);
  for (const i of sorted) {
    const d = flowDir[i];
    if (d >= 0) acc[d] += acc[i];
  }

  // 5) 강 셀: 유량이 임계값을 넘는 육지.
  // 임계값이 낮으면 지도 전체가 실핏줄 강으로 덮여 지저분해진다 — 큰 물줄기 위주로.
  const T = n / (50 + 620 * Math.max(0.02, riverDensity));
  const river = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (height[i] >= sea && !lake[i] && acc[i] >= T) river[i] = 1;
  }

  // 6) 벡터 강줄기 추적: 발원지에서 하류로, 유량에 따라 폭 증가.
  // traced에는 (강 인덱스+1)을 기록 — 지류가 어느 본류에 합류하는지 알 수 있다.
  const rivers: RiverPath[] = [];
  const traced = new Int32Array(n);
  const widthOf = (a: number): number => 0.5 + Math.log2(a / T + 1) * 0.55;

  // 지형 높이 범위 (정규화용)
  const heightRange = Math.max(0.001, 1.0 - sea);

  for (let i = 0; i < n; i++) {
    if (!river[i] || traced[i]) continue;
    // 발원지: 상류에 강 셀이 없는 강 셀
    let isSource = true;
    const x = i % w, y = (i / w) | 0;
    for (let d = 0; d < 8 && isSource; d++) {
      const nx = x + DX8[d], ny = y + DY8[d];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (river[ni] && flowDir[ni] === i) isSource = false;
    }
    if (!isSource) continue;

    // 발원지가 해수면 근처(저지대)에 있으면 바다에서 흘러들어오는 것처럼 보이는 단편이 생성됨.
    // 지형 높이의 상위 92% 이하인 저지대 셀에서는 발원지로 인정하지 않음.
    const relSrcHeight = (height[i] - sea) / heightRange;
    if (relSrcHeight < 0.08) continue;

    const pts: [number, number][] = [];
    const widths: number[] = [];
    const marked: number[] = [];
    const riverIdx = rivers.length + 1; // 임시 id (traced에 기록)
    let joins: number | undefined;
    let cur = i;
    for (let step = 0; step < w + h; step++) {
      pts.push([cur % w, (cur / w) | 0]);
      widths.push(widthOf(acc[cur]));

      const next = flowDir[cur];
      if (next < 0) break;

      // 하구: 물속으로 3셀 연장 + 폭을 깔때기처럼 벌려 바다로 스며드는 어귀(estuary)를 만든다
      if (height[next] < sea || lake[next]) {
        const wBase = widthOf(acc[cur]);
        const flare = [1.25, 1.7, 2.2];
        let mc = next;
        for (let k = 0; k < 3 && mc >= 0 && (height[mc] < sea || lake[mc]); k++) {
          pts.push([mc % w, (mc / w) | 0]);
          widths.push(wBase * flare[k]);
          mc = flowDir[mc];
        }
        break;
      }

      if (traced[next]) {
        // 본류 합류: 합류 셀까지만 긋고, 어느 본류인지 기록 (렌더가 본류 중심선에 스냅)
        joins = traced[next] - 1;
        pts.push([next % w, (next / w) | 0]);
        widths.push(widthOf(acc[next]));
        break;
      }
      traced[cur] = riverIdx;
      marked.push(cur);
      cur = next;
    }
    // 짧은 단편은 버린다 — 강은 소수의 긴 물줄기가 그림이 된다.
    // 버린 강의 traced 흔적은 지워 지류 합류 인덱스가 어긋나지 않게 한다.
    if (pts.length >= 10) {
      rivers.push({ pts, widths, joins });
    } else {
      for (const m of marked) traced[m] = 0;
    }
  }

  // 7) 강바닥을 살짝 파서 음영 부여
  for (let i = 0; i < n; i++) {
    if (river[i] && height[i] >= sea) {
      const dent = 0.004 + 0.005 * Math.min(1, acc[i] / (T * 10));
      height[i] = Math.max(sea + 0.001, height[i] - dent);
    }
  }

  return { river, lake, rivers };
}

/** (키, 인덱스) 최소 힙 — priority flood용 */
class MinHeap {
  private keys: Float64Array;
  private vals: Int32Array;
  size = 0;

  constructor(cap: number) {
    this.keys = new Float64Array(cap + 8);
    this.vals = new Int32Array(cap + 8);
  }

  push(key: number, val: number): void {
    let i = this.size++;
    const { keys, vals } = this;
    keys[i] = key; vals[i] = val;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= keys[i]) break;
      const tk = keys[p]; keys[p] = keys[i]; keys[i] = tk;
      const tv = vals[p]; vals[p] = vals[i]; vals[i] = tv;
      i = p;
    }
  }

  pop(): [number, number] {
    const { keys, vals } = this;
    const outK = keys[0], outV = vals[0];
    this.size--;
    keys[0] = keys[this.size]; vals[0] = vals[this.size];
    let i = 0;
    for (;;) {
      const l = i * 2 + 1, r = l + 1;
      let m = i;
      if (l < this.size && keys[l] < keys[m]) m = l;
      if (r < this.size && keys[r] < keys[m]) m = r;
      if (m === i) break;
      const tk = keys[m]; keys[m] = keys[i]; keys[i] = tk;
      const tv = vals[m]; vals[m] = vals[i]; vals[i] = tv;
      i = m;
    }
    return [outK, outV];
  }
}
