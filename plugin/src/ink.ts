/**
 * Ink, fountain-pen and brush texture rendering. Instead of constant-width vector
 * lines, it uses
 *  - variable-width ribbons (brush pressure / nib), and
 *  - multiple passes with a low-opacity ink bleed,
 * so strokes look like hand-drawn ink.
 */
import { Pt, roughLine, sketchToPath } from "./rough";

/** Densely resample points with Catmull-Rom (for smooth ribbon edges) */
function resample(pts: Pt[], subdiv = 3): Pt[] {
  if (pts.length < 3) return pts.slice();
  const out: Pt[] = [];
  const p = (i: number): Pt => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
    for (let s = 0; s < subdiv; s++) {
      const t = s / subdiv, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/**
 * Variable-width ribbon Path2D. widthAt(t, i) sets the width along the stroke.
 * To taper an end to a point, let widthAt converge to 0.
 */
export function ribbonPath(pts: Pt[], widthAt: (t: number, i: number) => number): Path2D {
  const rs = resample(pts, 3);
  const n = rs.length;
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = rs[Math.max(0, i - 1)], b = rs[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
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

/** Pointed brush ribbon (rivers etc.): linear wStart→wEnd, tapered at both ends */
export function taperedRibbon(pts: Pt[], wStart: number, wEnd: number): Path2D {
  return ribbonPath(pts, (t) => {
    const w = wStart + (wEnd - wStart) * t;
    // Narrow both ends slightly for a brush-pressure feel
    const endTaper = Math.min(1, t / 0.08) * Math.min(1, (1 - t) / 0.06);
    return w * (0.55 + 0.45 * endTaper);
  });
}

export interface InkOpts {
  color: string;
  width: number;
  bleed?: number;   // bleed multiplier (default 2.4)
  bleedAlpha?: number;
  passes?: number;  // overdraw passes (default 2)
  seed?: number;
  amp?: number;     // jitter (cells/px)
  closed?: boolean;
}

function rgbaFrom(color: string, a: number): string {
  // #rrggbb → rgba
  const m = /^#?([0-9a-f]{6})$/i.exec(color);
  if (m) {
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  return color;
}

/**
 * Hand-inked line: a wide low-opacity bleed undercoat plus several thin passes.
 * pts are already in target pixel space. Light enough to call every frame.
 */
export function inkStroke(ctx: CanvasRenderingContext2D, pts: Pt[], o: InkOpts): void {
  if (pts.length < 2) return;
  const passes = o.passes ?? 2;
  const amp = o.amp ?? Math.max(0.5, o.width * 0.35);
  const seed = o.seed ?? 1234;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Bleed undercoat
  const bleed = o.bleed ?? 2.4;
  if (bleed > 0) {
    const p = new Path2D();
    sketchToPath(p, roughLine(pts, amp * 0.6, seed + 700), !!o.closed);
    ctx.strokeStyle = rgbaFrom(o.color, o.bleedAlpha ?? 0.1);
    ctx.lineWidth = o.width * bleed;
    ctx.stroke(p);
  }
  // Multiple passes
  for (let k = 0; k < passes; k++) {
    const p = new Path2D();
    sketchToPath(p, roughLine(pts, amp, seed + k * 811), !!o.closed);
    ctx.strokeStyle = rgbaFrom(o.color, k === 0 ? 0.92 : 0.5);
    ctx.lineWidth = o.width * (k === 0 ? 1 : 0.7);
    ctx.stroke(p);
  }
  ctx.restore();
}

/**
 * Brush arrow: tapered ribbon body plus a clean arrowhead.
 * The head is always clearly wider than the body (natural proportion), with a slightly
 * notched barb at the back.
 */
export function brushArrow(ctx: CanvasRenderingContext2D, pts: Pt[], color: string, width: number, dashed: boolean): void {
  if (pts.length < 2) return;
  const tip = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const nx = -dy, ny = dx; // normal

  const headLen = width * 3.4 + 6;
  const headHalf = width * 1.9 + 4;   // clearly wider than the body
  const barb = 0.32;                  // depth of the rear notch
  const baseX = tip[0] - dx * headLen, baseY = tip[1] - dy * headLen;
  const notchX = tip[0] - dx * headLen * (1 - barb), notchY = tip[1] - dy * headLen * (1 - barb);
  // The body runs only up to the arrowhead notch
  const bodyEnd: Pt = [notchX, notchY];
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
    ctx.fill(taperedRibbon(body, width * 0.5, width * 1.0));
  }

  // Arrowhead (tip → left wing → rear notch → right wing)
  const head = new Path2D();
  head.moveTo(tip[0], tip[1]);
  head.lineTo(baseX + nx * headHalf, baseY + ny * headHalf);
  head.lineTo(notchX, notchY);
  head.lineTo(baseX - nx * headHalf, baseY - ny * headHalf);
  head.closePath();
  ctx.fill(head);
  ctx.restore();
}

/**
 * Build the ribbon's left/right banks (edges) as separate Path2Ds, so the outline
 * can be drawn cleanly without the flat end cuts at either tip.
 */
export function ribbonBanks(pts: Pt[], widthAt: (t: number, i: number) => number): [Path2D, Path2D] {
  const rs = resample(pts, 3);
  const n = rs.length;
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = rs[Math.max(0, i - 1)], b = rs[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const nx = -ty, ny = tx;
    const w = Math.max(0, widthAt(i / (n - 1), i)) / 2;
    left.push([rs[i][0] + nx * w, rs[i][1] + ny * w]);
    right.push([rs[i][0] - nx * w, rs[i][1] - ny * w]);
  }
  
  const leftPath = new Path2D();
  if (left.length > 0) {
    leftPath.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < left.length; i++) leftPath.lineTo(left[i][0], left[i][1]);
  }

  const rightPath = new Path2D();
  if (right.length > 0) {
    rightPath.moveTo(right[0][0], right[0][1]);
    for (let i = 1; i < right.length; i++) rightPath.lineTo(right[i][0], right[i][1]);
  }

  return [leftPath, rightPath];
}
