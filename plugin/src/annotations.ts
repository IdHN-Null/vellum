import { Annotation } from "./types";
import { sketchToPath } from "./rough";
import { brushArrow, inkStroke } from "./ink";

/** Draw one annotation in pixel space (ptsPx: points already converted to screen/export pixels) */
export function strokeAnnotationPx(
  ctx: CanvasRenderingContext2D,
  a: Annotation,
  ptsPx: [number, number][],
  widthPx: number,
): void {
  if (ptsPx.length < 2) return;
  const w = Math.max(1, widthPx);

  if (a.kind === "arrow") {
    brushArrow(ctx, ptsPx, a.color, w, a.dashed);
    return;
  }
  if (a.dashed) {
    // Dashed path
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
  // Solid freehand curve: multi-pass ink + bleed
  inkStroke(ctx, ptsPx, { color: a.color, width: w, closed: false, passes: 2, bleed: 2, amp: Math.max(0.6, w * 0.3) });
}

/** Minimum point-to-polyline distance (for hit testing, in pixels) */
export function distToPolyline(px: number, py: number, ptsPx: [number, number][]): number {
  let best = Infinity;
  for (let i = 0; i < ptsPx.length - 1; i++) {
    const [ax, ay] = ptsPx[i], [bx, by] = ptsPx[i + 1];
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    let t = ((px - ax) * dx + (py - ay) * dy) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = ax + t * dx, cy = ay + t * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (d < best) best = d;
  }
  return best;
}
