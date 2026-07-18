/**
 * Vector marker icons for the map. A single 24×24-viewBox SVG path is shared
 * between the canvas (Path2D) and the modal (<svg>).
 * Style: parchment badge + ink-stroke glyph.
 */

import { StyleId } from "./types";
import { roughRing, sketchToPath } from "./rough";
import { hexToRGB } from "./render2d";

export interface MarkerIcon {
  id: string;
  label: string;
  d: string; // 24x24 SVG path (stroke-based)
}

export const MARKER_ICONS: MarkerIcon[] = [
  { id: "pin", label: "핀", d: "M12 21s-6.5-7.3-6.5-11.7a6.5 6.5 0 0 1 13 0C18.5 13.7 12 21 12 21zM12 6.8a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z" },
  { id: "castle", label: "성", d: "M6 21V8.5L5 8V4h2.5v2h2V4h5v2h2V4H19v4l-1 .5V21M6 21h12M10 21v-4.5a2 2 0 0 1 4 0V21M9 11h.01M15 11h.01" },
  { id: "town", label: "마을", d: "M3 21v-7l4.5-3.5L12 14v7M12 21v-9l4.5-3.5L21 12v9M3 21h18M6.5 17h.01M16.5 15.5h.01" },
  { id: "anchor", label: "항구", d: "M12 8.5V21M12 8.5a2.7 2.7 0 1 0-.01 0zM4.5 13.5C4.5 18 8 21 12 21s7.5-3 7.5-7.5M4.5 13.5L2.5 15m2-1.5L6.5 15M19.5 13.5L17.5 15m2-1.5l2 1.5" },
  { id: "mountain", label: "산", d: "M2.5 20L9.5 6l4 7.5L16 9.5l5.5 10.5zM7.5 11.5l2-1.5 1.5 2" },
  { id: "tree", label: "숲", d: "M12 21v-4M12 3l4.5 6h-2.5l3.5 5h-3l3 4H6.5l3-4h-3l3.5-5H7.5z" },
  { id: "tower", label: "탑", d: "M8.5 21V8h7v13M8.5 8L7 3.5h2l1 2h4l1-2h2L15.5 8M10.5 21v-4h3v4M11 11h2" },
  { id: "temple", label: "신전", d: "M4 8.5L12 3l8 5.5M5 8.5h14M6.5 11v6M10.2 11v6M13.8 11v6M17.5 11v6M4.5 17.5h15M3.5 21h17" },
  { id: "swords", label: "전장", d: "M5 3.5l12.5 12.5M15 18.5l2.5-2.5M19 20l-2.5-2.5M19 3.5L6.5 16M9 18.5L6.5 16M5 20l2.5-2.5" },
  { id: "gem", label: "보물", d: "M7.5 4h9L21 9.5 12 20.5 3 9.5zM3 9.5h18M12 20.5L8.5 9.5 12 4l3.5 5.5z" },
  { id: "tent", label: "야영지", d: "M12 4.5L3 20h6.5l2.5-4.5L14.5 20H21zM10 8.5l2-2 2 2" },
  { id: "star", label: "명소", d: "M12 3.5l2.5 5.4 5.9.7-4.4 4 1.2 5.8-5.2-2.9-5.2 2.9 1.2-5.8-4.4-4 5.9-.7z" },
  { id: "x", label: "X 표시", d: "M6 6l12 12M18 6L6 18M4.5 4.5l1 1M18.5 4.5l1 1M4.5 19.5l1-1M18.5 19.5l1-1" },
  { id: "skull", label: "위험", d: "M12 3a7 7 0 0 0-4 12.7V18l1.5 1.5h5L16 18v-2.3A7 7 0 0 0 12 3zM9 11h.01M15 11h.01M11 14.5l1-1.5 1 1.5M9.5 20.5v-1M14.5 20.5v-1" },
  { id: "flag", label: "깃발", d: "M6 21V4M6 5h11l-2 3 2 3H6" },
  { id: "chest", label: "보물상자", d: "M4 10h16v9H4zM4 10l2-4h12l2 4M4 13h16M11 10v3h2v-3M11 13a1 1 0 0 0 2 0" },
  { id: "cross", label: "성소", d: "M10 21V9H4V7h6V3h4v4h6v2h-6v12z" },
];

/** Legacy (emoji) icon → new id mapping */
const LEGACY: Record<string, string> = {
  "📍": "pin", "🏰": "castle", "🏘️": "town", "⚓": "anchor",
  "⛰️": "mountain", "🌲": "tree", "🗼": "tower", "🕍": "temple",
  "⚔️": "swords", "💎": "gem", "🐉": "star", "🏛️": "temple",
};

export function normalizeIcon(icon: string): string {
  if (MARKER_ICONS.some((i) => i.id === icon)) return icon;
  return LEGACY[icon] ?? "pin";
}

const path2dCache = new Map<string, Path2D>();

function getPath(id: string): Path2D {
  let p = path2dCache.get(id);
  if (!p) {
    const icon = MARKER_ICONS.find((i) => i.id === id) ?? MARKER_ICONS[0];
    p = new Path2D(icon.d);
    path2dCache.set(id, p);
  }
  return p;
}

/**
 * Draws a marker on the canvas. (cx, cy) is the ground anchor (pin tip),
 * with the badge floating above it. size is the badge diameter.
 */
/** Hand-drawn badge ring cache (fixed seed per icon id — prevents wobble whilst dragging) */
const badgeRingCache = new Map<string, Path2D>();

function badgeRing(id: string): Path2D {
  let p = badgeRingCache.get(id);
  if (!p) {
    let seed = 7;
    for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) | 0;
    const pts: [number, number][] = [];
    const N = 22;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      pts.push([Math.cos(a), Math.sin(a)]); // unit circle — scaled at draw time
    }
    p = new Path2D();
    sketchToPath(p, roughRing(pts, 0.045, seed), true);
    badgeRingCache.set(id, p);
  }
  return p;
}

export function drawMarkerIcon(
  ctx: CanvasRenderingContext2D,
  iconId: string, cx: number, cy: number,
  size: number, accent: string,
  style: StyleId = "parchment",
): void {
  const id = normalizeIcon(iconId);
  const r = size / 2;
  const bcy = cy - size * 0.78; // badge centre

  ctx.save();

  const isInk = style === "ink";
  const inkC: [number, number, number] = isInk ? [60, 55, 45] : [58, 44, 28];
  // Mix the accent colour with ink to desaturate it — keeps garish modern colours from floating on an antique map
  const acc = hexToRGB(accent || "") ?? inkC;
  const mr = Math.round(acc[0] * 0.6 + inkC[0] * 0.4);
  const mg = Math.round(acc[1] * 0.6 + inkC[1] * 0.4);
  const mb = Math.round(acc[2] * 0.6 + inkC[2] * 0.4);
  const inkStr = `rgb(${inkC[0]},${inkC[1]},${inkC[2]})`;

  // Pointer: a stroke tapering like a brush tip (instead of a filled triangle)
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

  // Badge: paper ground + hand-drawn ink ring (double: ink outline + muted accent inner line)
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

  // Glyph (ink stroke)
  ctx.save();
  const gs = (size * 0.68) / 24;
  ctx.translate(cx - 12 * gs, bcy - 12 * gs);
  ctx.scale(gs, gs);
  ctx.lineWidth = 2; // in viewBox (24px) coordinate space
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = inkStr;
  ctx.stroke(getPath(id));
  ctx.restore();
}

/** SVG markup for modal buttons */
export function iconSvg(id: string): string {
  const icon = MARKER_ICONS.find((i) => i.id === id) ?? MARKER_ICONS[0];
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="${icon.d}"/></svg>`;
}
