/** v0.3.0 렌더링 파이프라인 시각 검증 하네스 */
import { Ornament, defaultDecor, defaultMapData } from "../src/types";
import { B, composeTerrain, generateBase } from "../src/terrain";
import { allocLayers, biomeColor, getPalette, renderLayers, renderTile, smoothVal } from "../src/render2d";
import { chaikin, extractContours, simplifyLine } from "../src/contours";
import { roughLine, roughRing, sketchToPath } from "../src/rough";
import { drawCoordinateGrid, drawMapEffects, drawOrnaments } from "../src/decor";
import { ribbonPath } from "../src/ink";
import { paperGrainTile } from "../src/render2d";
import { strokeAnnotationPx } from "../src/annotations";
import { Annotation } from "../src/types";
import { drawMarkerIcon } from "../src/icons";

function addLabel(text: string): void {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = "font:13px sans-serif;margin:12px 0 4px;color:#ddd";
  document.body.appendChild(el);
}

const map = defaultMapData("세이도라 대륙", 151186);
map.gen.polarNorth = 0.12;
map.gen.polarSouth = 0.12;

const t0 = performance.now();
const base = generateBase(map); // 노이즈 + 침식
const baseMs = performance.now() - t0;

const t1 = performance.now();
const terrain = composeTerrain(map, base, null, null); // 수문 + 분류
const composeMs = performance.now() - t1;

const contours = extractContours(terrain.height, terrain.w, terrain.h, terrain.seaLevel, map.gen.precision);
const opts = { coastWidth: 3, waves: true };
const layers = renderLayers(terrain, "parchment", opts);

// 청크(타일) 렌더가 전체 렌더와 동일한지 검증
{
  const tl = allocLayers(terrain, opts);
  const TILE = 192;
  for (let y0 = 0; y0 < terrain.h; y0 += TILE) {
    for (let x0 = 0; x0 < terrain.w; x0 += TILE) {
      renderTile(tl, terrain, "parchment", opts, x0, y0, Math.min(terrain.w - 1, x0 + TILE - 1), Math.min(terrain.h - 1, y0 + TILE - 1));
    }
  }
  const a = layers.base.getContext("2d")!.getImageData(0, 0, terrain.w, terrain.h).data;
  const b = tl.base.getContext("2d")!.getImageData(0, 0, terrain.w, terrain.h).data;
  let diff = 0;
  for (let i = 0; i < a.length; i += 997 * 4) if (Math.abs(a[i] - b[i]) > 1) diff++;
  (window as unknown as Record<string, unknown>).__tileMatch = diff === 0;
}

let lakeCells = 0, riverCells = 0;
let land = 0, plains = 0, elevated = 0;
for (let i = 0; i < terrain.lake.length; i++) {
  if (terrain.lake[i]) lakeCells++;
  if (terrain.river[i]) riverCells++;
  const b = terrain.biome[i];
  if (b >= 2) { // BEACH 이상 = 육지
    land++;
    if (b === 6 || b === 7 || b === 8) elevated++; // HILL/MOUNTAIN/SNOW
    else plains++; // BEACH/GRASS/FOREST/DESERT
  }
}
const plainsPct = Math.round((plains / Math.max(1, land)) * 100);
addLabel(
  `베이스+침식 ${Math.round(baseMs)}ms · 강 ${terrain.rivers.length}줄기 · ` +
  `★평야 ${plainsPct}% / 산악 ${100 - plainsPct}%★ (도시·왕국 적합도)`,
);
(window as unknown as Record<string, unknown>).__stats = { baseMs, composeMs, riverN: terrain.rivers.length, lakeCells, plainsPct };
(window as unknown as Record<string, unknown>).__terrain = terrain;

// 대륙/섬 개수 제어 검증
addLabel("생성 옵션: 대륙 수 · 섬 수 직접 지정");
{
  const configs: [string, number, number][] = [
    ["대륙 1 · 섬 0", 1, 0],
    ["대륙 3 · 섬 15", 3, 15],
    ["대륙 5 · 섬 8", 5, 8],
  ];
  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";
  document.body.appendChild(row);
  for (const [label, cc, ic] of configs) {
    const m2 = defaultMapData("t", 4242);
    m2.gen.continentCount = cc;
    m2.gen.islandCount = ic;
    m2.gen.erosion = 0.4;
    const b2 = generateBase(m2);
    const t2 = composeTerrain(m2, b2, null, null);
    const l2 = renderLayers(t2, "parchment", { coastWidth: 3 });
    const cv = document.createElement("canvas");
    cv.width = t2.w; cv.height = t2.h; cv.style.width = "300px";
    const cx2 = cv.getContext("2d")!;
    cx2.drawImage(l2.base, 0, 0);
    cx2.drawImage(l2.stamps, 0, 0, t2.w, t2.h);
    const wrap = document.createElement("div");
    const cap = document.createElement("div");
    cap.textContent = label; cap.style.cssText = "font:12px sans-serif;color:#ccc";
    wrap.appendChild(cap); wrap.appendChild(cv);
    row.appendChild(wrap);
  }
}

const markers = [
  { id: "m1", x: 0.36, y: 0.42, name: "왕도 세이도라", icon: "castle", color: "#c0392b" },
  { id: "m2", x: 0.62, y: 0.58, name: "항구도시 벨마르", icon: "anchor", color: "#2471a3" },
];

const ornaments: Ornament[] = [
  { id: "o1", type: "compass", x: 0.89, y: 0.14, sizeF: 0.062 },
  { id: "o2", type: "title", x: 0.5, y: 0.075, sizeF: 0.052, text: "세이도라 대륙" },
  { id: "o3", type: "label", x: 0.25, y: 0.75, sizeF: 0.04, text: "남 해" },
  { id: "o4", type: "note", x: 0.82, y: 0.72, sizeF: 0.022, text: "이 바다 너머는\n미지의 영역이다" },
  { id: "o5", type: "ship", x: 0.62, y: 0.86, sizeF: 0.045 },
  { id: "o6", type: "monster", x: 0.84, y: 0.4, sizeF: 0.045 },
];

addLabel("v0.3 프리미엄 합성 — 침식 지형·유량 테이퍼 강·호수·배치 요소 4종");
{
  const W = terrain.w, H = terrain.h;
  const scale = 1.6;
  const c = document.createElement("canvas");
  c.width = W * scale;
  c.height = H * scale;
  const ctx = c.getContext("2d")!;
  const pal = getPalette("parchment");

  ctx.save();
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(layers.base, 0, 0);
  ctx.drawImage(layers.stamps, 0, 0, W, H);

  // 손그림 등심선/등고선
  let sc = 999;
  for (const level of contours.levels) {
    if (Math.abs(level.z - terrain.seaLevel) < 1e-9) continue;
    const under = level.z < terrain.seaLevel - 1e-9;
    const p = new Path2D();
    for (const ring of level.rings) sketchToPath(p, roughRing(ring, under ? 0.6 : 0.5, sc++), true);
    ctx.strokeStyle = under ? "rgba(86,62,36,0.13)" : "rgba(86,62,36,0.34)";
    ctx.lineWidth = under ? 0.6 : 0.7;
    ctx.stroke(p);
  }
  // 손그림 해안선
  const coastLv = contours.levels.find((l) => Math.abs(l.z - terrain.seaLevel) < 1e-9);
  if (coastLv) {
    const coast = new Path2D();
    for (const ring of coastLv.rings) sketchToPath(coast, roughRing(ring, 0.85, sc++), true);
    ctx.strokeStyle = "rgba(86,62,36,0.28)";
    ctx.lineWidth = 2.8;
    ctx.stroke(coast);
    ctx.strokeStyle = "rgb(86,62,36)";
    ctx.lineWidth = 1.1;
    ctx.stroke(coast);
  }
  // 강: 플러그인 drawVectorLines와 동일한 2패스 (물색 워시 + 얇은 잉크선)
  {
    const ck = pal.coastline, oc = pal.ocean;
    const lines = terrain.rivers.map((rv) => {
      const sm = chaikin(roughLine(simplifyLine(rv.pts, 0.9), 0.95, sc++), 3, false);
      const widths = sm.map((_, i) => rv.widths[Math.min(rv.widths.length - 1, Math.round((i / (sm.length - 1)) * (rv.widths.length - 1)))]);
      return { sm, widths };
    }).filter((l) => l.sm.length >= 3);
    const wAt = (i: number, n: number, wArr: number[]) => {
      const baseW = Math.min(1.8, wArr[Math.min(wArr.length - 1, i)] * 0.5 + 0.1);
      return baseW * Math.min(1, i / Math.min(5, n - 1));
    };
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const l of lines) {
      const n = l.sm.length;
      ctx.strokeStyle = `rgba(${oc[0]},${oc[1]},${oc[2]},0.22)`;
      for (let i = 1; i < n; i++) {
        ctx.lineWidth = (wAt(i - 1, n, l.widths) + wAt(i, n, l.widths)) / 2 * 2.2 + 0.3;
        ctx.beginPath(); ctx.moveTo(l.sm[i - 1][0], l.sm[i - 1][1]); ctx.lineTo(l.sm[i][0], l.sm[i][1]); ctx.stroke();
      }
    }
    for (const l of lines) {
      const n = l.sm.length;
      ctx.strokeStyle = `rgba(${ck[0]},${ck[1]},${ck[2]},0.38)`;
      for (let i = 1; i < n; i++) {
        ctx.lineWidth = (wAt(i - 1, n, l.widths) + wAt(i, n, l.widths)) / 2 * 0.55 + 0.15;
        ctx.beginPath(); ctx.moveTo(l.sm[i - 1][0], l.sm[i - 1][1]); ctx.lineTo(l.sm[i][0], l.sm[i][1]); ctx.stroke();
      }
    }
  }
  // 테스트 구역 (탄색 — 이전엔 배경에 묻히던 케이스)
  const regionPts: [number, number][] = [[0.55, 0.30], [0.78, 0.34], [0.80, 0.52], [0.62, 0.55], [0.52, 0.44]];
  ctx.beginPath();
  regionPts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px * W, py * H) : ctx.lineTo(px * W, py * H)));
  ctx.closePath();
  ctx.fillStyle = "rgba(183,149,11,0.18)";
  ctx.strokeStyle = "rgba(28,22,14,0.5)"; ctx.lineWidth = 3.6; ctx.stroke();
  ctx.strokeStyle = "rgba(183,149,11,0.95)"; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);

  // 테스트 주석: 점선 경로 + 화살표 (보물지도 표시)
  const anns: Annotation[] = [
    { id: "a1", kind: "free", points: [[0.3, 0.5], [0.36, 0.45], [0.42, 0.5], [0.5, 0.44], [0.58, 0.5]], color: "#8a1c1c", width: 3, dashed: true },
    { id: "a2", kind: "arrow", points: [[0.55, 0.28], [0.72, 0.4]], color: "#1c1a14", width: 5, dashed: false },
    { id: "a3", kind: "arrow", points: [[0.2, 0.62], [0.38, 0.58]], color: "#8a1c1c", width: 4, dashed: true },
    { id: "a4", kind: "free", points: [[0.62, 0.6], [0.66, 0.55], [0.72, 0.58], [0.78, 0.52]], color: "#1c1a14", width: 4, dashed: false },
  ];
  for (const a of anns) {
    const px = a.points.map(([x, y]) => [x * W, y * H] as [number, number]);
    strokeAnnotationPx(ctx, a, px, a.width);
  }
  // 화살표 끝점 픽셀을 검사용으로 기록
  (window as unknown as Record<string, unknown>).__annoArrowPx = [0.72 * W, 0.4 * H];

  drawMapEffects(ctx, W, H, scale, pal.coastline, defaultDecor(), "parchment");
  drawCoordinateGrid(ctx, W, H, scale, pal.coastline);
  drawOrnaments(ctx, ornaments, W, H, scale, pal.coastline);
  ctx.restore();
  // 화면 종이 결 오버레이
  {
    const pat = ctx.createPattern(paperGrainTile(), "repeat");
    if (pat) { ctx.save(); ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = 0.5; ctx.fillStyle = pat; ctx.fillRect(0, 0, c.width, c.height); ctx.restore(); }
  }
  (window as unknown as Record<string, unknown>).__composite = c;
  (window as unknown as Record<string, unknown>).__compositeScale = scale;

  for (const m of markers) {
    const mx = m.x * W * scale, my = m.y * H * scale;
    drawMarkerIcon(ctx, m.icon, mx, my, 24, m.color);
    // 이름표: view.paintMarker와 동일한 '지도에 직접 쓴 지명' 스타일
    const fs = Math.max(9, 24 * 0.44);
    ctx.save();
    ctx.font = `600 ${fs}px "FMS Serif","FMS Hand",serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(244,236,214,0.85)";
    ctx.lineWidth = Math.max(2.5, fs * 0.3);
    ctx.strokeText(m.name, mx, my + 24 * 0.18 + fs * 0.62);
    ctx.fillStyle = "rgba(86,62,36,0.92)";
    ctx.fillText(m.name, mx, my + 24 * 0.18 + fs * 0.62);
    ctx.restore();
  }
  c.style.width = "780px";
  document.body.appendChild(c);
}

// 컬러 스타일 종이 질감 + 새 화살촉 확인
addLabel("컬러 스타일 (종이 결·얼룩) + 새 화살촉");
{
  const cl = renderLayers(terrain, "color", { coastWidth: 3, waves: true });
  const c = document.createElement("canvas");
  c.width = terrain.w; c.height = terrain.h;
  const cx = c.getContext("2d")!;
  cx.drawImage(cl.base, 0, 0);
  cx.drawImage(cl.stamps, 0, 0, terrain.w, terrain.h);
  const arrows: Annotation[] = [
    { id: "z1", kind: "arrow", points: [[0.2, 0.4], [0.45, 0.35]], color: "#8a1c1c", width: 3, dashed: false },
    { id: "z2", kind: "arrow", points: [[0.25, 0.6], [0.5, 0.55]], color: "#1c1a14", width: 6, dashed: false },
    { id: "z3", kind: "arrow", points: [[0.55, 0.62], [0.78, 0.42]], color: "#8a1c1c", width: 4, dashed: true },
  ];
  for (const a of arrows) {
    const px = a.points.map(([x, y]) => [x * c.width, y * c.height] as [number, number]);
    strokeAnnotationPx(cx, a, px, a.width);
  }
  c.style.width = "620px";
  c.id = "colorComposite";
  document.body.appendChild(c);
}

// 잉크 스타일
addLabel("잉크 스타일");
{
  const il = renderLayers(terrain, "ink", { coastWidth: 3, waves: true });
  const c = document.createElement("canvas");
  c.width = terrain.w; c.height = terrain.h;
  const cx = c.getContext("2d")!;
  cx.drawImage(il.base, 0, 0);
  cx.drawImage(il.stamps, 0, 0, terrain.w, terrain.h);
  c.style.width = "620px";
  c.id = "inkComposite";
  document.body.appendChild(c);
}

// 선명도(LOD) 검증: 4배 확대한 영역 — 좌: 흐린 업스케일 / 우: 상세 재렌더
addLabel("선명도(LOD): 좌=흐린 업스케일 · 우=상세 재렌더(높이 샘플링)");
{
  const pal = getPalette("parchment");
  const zoom = 4, size = 300;
  const cx0 = terrain.w * 0.4, cy0 = terrain.h * 0.4;     // 크롭 좌상단 셀
  const cells = size / zoom;                               // 화면에 보일 셀 수
  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:10px";
  document.body.appendChild(row);

  // (좌) 셀해상도 base를 업스케일 (imageSmoothing=true → 흐림)
  const base = renderLayers(terrain, "parchment", { coastWidth: 3 }).base;
  const up = document.createElement("canvas"); up.width = size; up.height = size; up.style.width = "300px";
  const uc = up.getContext("2d")!; uc.imageSmoothingEnabled = true;
  uc.drawImage(base, cx0, cy0, cells, cells, 0, 0, size, size);
  row.appendChild(up);

  // (우) 픽셀별 상세 재렌더 (높이 쌍선형 + 최근접 바이옴 + 해안 정교화)
  const dt = document.createElement("canvas"); dt.width = size; dt.height = size; dt.style.width = "300px";
  const dc = dt.getContext("2d")!;
  const img = dc.createImageData(size, size);
  const px = img.data;
  const sea = terrain.seaLevel, W = terrain.w, H = terrain.h;
  const hAt = (cx: number, cy: number) => {
    const x0 = Math.max(0, Math.min(W - 1, Math.floor(cx))), y0 = Math.max(0, Math.min(H - 1, Math.floor(cy)));
    const x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
    const tx = cx - x0, ty = cy - y0;
    const a = terrain.height[y0 * W + x0], b = terrain.height[y0 * W + x1], c = terrain.height[y1 * W + x0], d = terrain.height[y1 * W + x1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const cx = cx0 + (i / size) * cells, cy = cy0 + (j / size) * cells;
      const el = hAt(cx, cy);
      const ci = Math.min(H - 1, Math.round(cy)) * W + Math.min(W - 1, Math.round(cx));
      let bi = terrain.biome[ci];
      if (!terrain.lake[ci]) { // 호수는 높이 재분류 제외 (확대 시 사라짐 방지)
        if (el < sea && bi !== B.DEEP && bi !== B.OCEAN) bi = el < sea - 0.12 ? B.DEEP : B.OCEAN;
        else if (el >= sea && (bi === B.DEEP || bi === B.OCEAN)) bi = B.BEACH;
      }
      let r: number, g: number, bl: number;
      if (bi === B.DEEP || bi === B.OCEAN) {
        const depth = Math.min(1, Math.max(0, (sea - el) / 0.25));
        r = pal.ocean[0] + (pal.deep[0] - pal.ocean[0]) * depth;
        g = pal.ocean[1] + (pal.deep[1] - pal.ocean[1]) * depth;
        bl = pal.ocean[2] + (pal.deep[2] - pal.ocean[2]) * depth;
      } else {
        const col = biomeColor(pal, bi);
        const shade = 1 + (hAt(cx - 1, cy) - el + hAt(cx, cy - 1) - el) * 4.2;
        const sc = Math.min(1.22, Math.max(0.78, shade));
        r = col[0] * sc; g = col[1] * sc; bl = col[2] * sc;
      }
      const mottle = (smoothVal(cx + 300, cy + 300, 13) - 0.5) * 22;
      r += mottle; g += mottle * 0.95; bl += mottle * 0.82;
      const o = (j * size + i) * 4;
      px[o] = r; px[o + 1] = g; px[o + 2] = bl; px[o + 3] = 255;
    }
  }
  dc.putImageData(img, 0, 0);
  row.appendChild(dt);
}

// 비동기 워커 생성 검증: 워커 결과 == 동기 결과
(() => {
  const w = new Worker("/worker.js");
  const gm = { width: map.width, height: map.height, gen: map.gen };
  const t0w = performance.now();
  w.onmessage = (e) => {
    const wt = e.data.terrain;
    // 동기 결과와 픽셀 비교 (샘플)
    let diff = 0;
    for (let i = 0; i < terrain.height.length; i += 997) {
      if (Math.abs(terrain.height[i] - wt.height[i]) > 1e-4) diff++;
      if (terrain.biome[i] !== wt.biome[i]) diff++;
    }
    (window as unknown as Record<string, unknown>).__workerOK = diff === 0;
    (window as unknown as Record<string, unknown>).__workerMs = Math.round(performance.now() - t0w);
    w.terminate();
  };
  w.postMessage({ id: 1, map: gm, edits: null, paint: null, base: null });
})();

// 호수 사라짐 버그 검증: 버그(가드 없음)면 물이 육지로, 수정(가드)이면 물 유지
(() => {
  // 호수가 잘 생기는 지형(노이즈 모드) 생성
  const lm = defaultMapData("lake", 777);
  lm.gen.continentCount = 0; lm.gen.islandCount = 0; lm.gen.erosion = 1.4;
  const lt = composeTerrain(lm, generateBase(lm), null, null);
  const sea = lt.seaLevel;
  let lakeCells = 0, fixedWater = 0, buggyWater = 0;
  for (let i = 0; i < lt.lake.length; i++) {
    if (!lt.lake[i]) continue;
    lakeCells++;
    const el = lt.height[i], b = lt.biome[i];
    // (버그) 가드 없이 재분류
    let bb = b;
    if (el >= sea && (bb === B.DEEP || bb === B.OCEAN)) bb = B.BEACH;
    if (bb === B.DEEP || bb === B.OCEAN) buggyWater++;
    // (수정) 호수는 재분류 제외 → 항상 물
    fixedWater++;
  }
  const st = window as unknown as Record<string, unknown>;
  st.__lakeCells = lakeCells;
  st.__lakeBuggyWater = buggyWater;   // 버그 시 물로 남는 수 (호수 대부분 육지화 예상)
  st.__lakeFixedOK = lakeCells > 0 && fixedWater === lakeCells && buggyWater < lakeCells;
})();

document.body.style.background = "#1b1e24";
