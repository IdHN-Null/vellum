/**
 * Hand-drawn style lines. A lightweight take on the core idea of rough.js:
 * apply seeded micro-jitter to vertices and, where needed, overdraw in layers.
 * The result is deterministic (fixed seed), so it can be baked once and cached as a Path2D.
 */

import { mulberry32 } from "./noise";

export type Pt = [number, number];

/** Convert an open polyline into hand-drawn curve points (cell space, amp = jitter in cells) */
export function roughLine(pts: Pt[], amp: number, seed: number): Pt[] {
  if (pts.length < 2) return pts;
  const rng = mulberry32(seed);
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    // Jitter along the normal of the direction of travel, so the line trembles on the paper
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    let tx = next[0] - prev[0], ty = next[1] - prev[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const nx = -ty, ny = tx;
    const j = (rng() - 0.5) * 2 * amp;
    const jt = (rng() - 0.5) * amp * 0.5; // slight tangential jitter
    out.push([x + nx * j + tx * jt, y + ny * j + ty * jt]);
  }
  return out;
}

/** Convert a closed ring into hand-drawn points (the ends may drift apart naturally, independent of the start jitter) */
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
 * Append a point sequence to a Path2D as a hand-drawn stroke.
 * With passes > 1, overdraw with slightly different jitter for a bled double-ink line.
 */
export function sketchToPath(
  path: Path2D, pts: Pt[], closed: boolean,
): void {
  if (pts.length < 2) return;
  // Catmull-Rom → join the jittered points with a smooth curve
  const p = (i: number): Pt => pts[Math.max(0, Math.min(pts.length - 1, i))];
  path.moveTo(pts[0][0], pts[0][1]);
  const end = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < end; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = closed ? pts[(i + 1) % pts.length] : p(i + 1), p3 = closed ? pts[(i + 2) % pts.length] : p(i + 2);
    // Catmull-Rom → Bézier control points
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    path.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
  if (closed) path.closePath();
}

/** Build a hand-drawn open-line Path2D */
export function roughLinePath(pts: Pt[], amp: number, seed: number, passes = 1): Path2D {
  const path = new Path2D();
  for (let k = 0; k < passes; k++) {
    sketchToPath(path, roughLine(pts, amp, seed + k * 991), false);
  }
  return path;
}

/** Build a hand-drawn closed-ring Path2D */
export function roughRingPath(ring: Pt[], amp: number, seed: number, passes = 1): Path2D {
  const path = new Path2D();
  for (let k = 0; k < passes; k++) {
    sketchToPath(path, roughRing(ring, amp, seed + k * 991), true);
  }
  return path;
}
