/**
 * 손그림 스타일 선. rough.js의 핵심 아이디어를 경량 구현:
 * 정점에 시드 기반 미세 흔들림을 주고, 필요 시 여러 겹으로 겹쳐 그린다.
 * 결과는 결정론적(시드 고정)이라 한 번 구워 Path2D로 캐시할 수 있다.
 */

import { mulberry32 } from "./noise";

export type Pt = [number, number];

/** 열린 폴리라인을 손그림 곡선 점열로 변환 (셀 좌표계, amp=흔들림 셀) */
export function roughLine(pts: Pt[], amp: number, seed: number): Pt[] {
  if (pts.length < 2) return pts;
  const rng = mulberry32(seed);
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    // 진행 방향의 법선으로 흔들어 선이 종이 위에서 떨리는 느낌
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    let tx = next[0] - prev[0], ty = next[1] - prev[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const nx = -ty, ny = tx;
    const j = (rng() - 0.5) * 2 * amp;
    const jt = (rng() - 0.5) * amp * 0.5; // 접선 방향 미세 흔들림
    out.push([x + nx * j + tx * jt, y + ny * j + ty * jt]);
  }
  return out;
}

/** 닫힌 링을 손그림 점열로 변환 (끝점은 시작점 흔들림과 무관하게 자연스레 벌어짐 허용) */
export function roughRing(ring: Pt[], amp: number, seed: number): Pt[] {
  if (ring.length < 3) return ring;
  const rng = mulberry32(seed);
  const n = ring.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = ring[i];
    const prev = ring[(i - 1 + n) % n];
    const next = ring[(i + 1) % n];
    let tx = next[0] - prev[0], ty = next[1] - prev[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const nx = -ty, ny = tx;
    const j = (rng() - 0.5) * 2 * amp;
    out.push([x + nx * j, y + ny * j]);
  }
  return out;
}

/**
 * 점열을 Path2D에 손그림 스트로크로 추가.
 * passes>1이면 살짝 다른 흔들림으로 겹쳐 그어 잉크가 번진 듯한 이중선.
 */
export function sketchToPath(
  path: Path2D, pts: Pt[], closed: boolean,
): void {
  if (pts.length < 2) return;
  // Catmull-Rom → 부드러운 곡선으로 흔들린 점들을 잇는다
  const p = (i: number): Pt => pts[Math.max(0, Math.min(pts.length - 1, i))];
  path.moveTo(pts[0][0], pts[0][1]);
  const end = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < end; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = closed ? pts[(i + 1) % pts.length] : p(i + 1), p3 = closed ? pts[(i + 2) % pts.length] : p(i + 2);
    // Catmull-Rom → 베지어 제어점
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    path.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
  if (closed) path.closePath();
}

/** 손그림 열린 선 Path2D 생성 */
export function roughLinePath(pts: Pt[], amp: number, seed: number, passes = 1): Path2D {
  const path = new Path2D();
  for (let k = 0; k < passes; k++) {
    sketchToPath(path, roughLine(pts, amp, seed + k * 991), false);
  }
  return path;
}

/** 손그림 닫힌 링 Path2D 생성 */
export function roughRingPath(ring: Pt[], amp: number, seed: number, passes = 1): Path2D {
  const path = new Path2D();
  for (let k = 0; k < passes; k++) {
    sketchToPath(path, roughRing(ring, amp, seed + k * 991), true);
  }
  return path;
}
