import { DecorOpts, Ornament, StyleId } from "./types";
import { FONT_HAND, FONT_SERIF } from "./fonts";
import { getSticker } from "./stickers";

/** User sticker images (path → loaded image) */
export type StickerImages = Map<string, HTMLImageElement>;

type RGB = [number, number, number];

export interface OrnBox { x: number; y: number; w: number; h: number; } // world coordinates

/** Per-style element palette (card ground, fold, ink) */
interface OrnTheme { card: string; fold: string; ink: string; title: string; titleInk: string; }
function ornTheme(style: StyleId): OrnTheme {
  switch (style) {
    case "color":
      return { card: "rgba(252,250,245,0.95)", fold: "rgba(214,222,230,0.95)", ink: "rgba(38,50,64,0.9)", title: "rgba(252,250,245,0.9)", titleInk: "rgba(30,42,56,0.95)" };
    case "ink":
      return { card: "rgba(250,249,244,0.96)", fold: "rgba(224,221,210,0.95)", ink: "rgba(28,26,22,0.92)", title: "rgba(250,249,244,0.92)", titleInk: "rgba(20,18,14,0.95)" };
    default: // parchment
      return { card: "rgba(246,235,206,0.95)", fold: "rgba(220,204,164,0.95)", ink: "rgba(86,62,36,0.9)", title: "rgba(244,231,200,0.86)", titleInk: "rgba(74,52,28,0.95)" };
  }
}

/**
 * Whole-map effects: vignette + border frame.
 * (Compass and title are free-placed elements — see drawOrnaments.)
 */
export function drawMapEffects(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, s: number,
  inkRGB: RGB, decor: DecorOpts, style: StyleId,
): void {
  const ink = (a: number) => `rgba(${inkRGB[0]},${inkRGB[1]},${inkRGB[2]},${a})`;
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

/**
 * Renders the free-placed elements. Drawn in world space so they scale with the map,
 * and returns each element's bounding box (world coordinates) for the view's hit
 * testing and handles.
 */
export function drawOrnaments(
  ctx: CanvasRenderingContext2D,
  ornaments: Ornament[],
  W: number, H: number, s: number,
  inkRGB: RGB,
  style: StyleId = "parchment",
  images?: StickerImages,
): Map<string, OrnBox> {
  const boxes = new Map<string, OrnBox>();
  const ink = (a: number) => `rgba(${inkRGB[0]},${inkRGB[1]},${inkRGB[2]},${a})`;
  const th = ornTheme(style);
  const m = Math.min(W, H);

  for (const orn of ornaments) {
    const cx = orn.x * W, cy = orn.y * H;
    const size = Math.max(4, orn.sizeF * m);

    switch (orn.type) {
      case "sticker": {
        const r = size;
        if (orn.sticker === "custom" && orn.imagePath) {
          // User image sticker: height 2r, aspect ratio preserved
          const img = images?.get(orn.imagePath);
          if (img && img.naturalWidth > 0) {
            const ar = img.naturalWidth / img.naturalHeight;
            const dh = r * 2, dw = dh * ar;
            ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
            boxes.set(orn.id, { x: cx - dw / 2, y: cy - dh / 2, w: dw, h: dh });
          } else {
            // Placeholder whilst loading / on failure
            ctx.save();
            ctx.strokeStyle = ink(0.4);
            ctx.setLineDash([r * 0.16, r * 0.12]);
            ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
            ctx.restore();
            boxes.set(orn.id, { x: cx - r, y: cy - r, w: r * 2, h: r * 2 });
          }
        } else {
          const def = orn.sticker ? getSticker(orn.sticker) : undefined;
          if (def) {
            ctx.save();
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            // Line width scales with sticker size — detail survives even when shrunk
            ctx.lineWidth = Math.max(size * 0.032, 0.55 / s);
            def.draw(ctx, cx, cy, size, ink, style === "color" ? "rgba(250,250,246,0.92)" : "rgba(242,232,206,0.9)");
            ctx.restore();
            boxes.set(orn.id, {
              x: cx - size * def.box[0] * 1.08, y: cy - size * def.box[1] * 1.08,
              w: size * def.box[0] * 2.16, h: size * def.box[1] * 2.16,
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
        const padX = fs * 1.0, padY = fs * 0.46;
        const rx = cx - tw / 2 - padX, ry = cy - fs / 2 - padY;
        const rw = tw + padX * 2, rh = fs + padY * 2;
        ctx.save();
        // Ground (a subtle drop shadow lifts it slightly off the map)
        ctx.shadowColor = "rgba(30,22,10,0.25)";
        ctx.shadowBlur = fs * 0.45;
        ctx.shadowOffsetY = fs * 0.1;
        ctx.fillStyle = th.title;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        // Double border
        ctx.strokeStyle = ink(0.85);
        ctx.lineWidth = Math.max(0.8, 1.4 / s);
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.lineWidth = Math.max(0.4, 0.6 / s);
        const inX = rx + fs * 0.22, inY = ry + fs * 0.22;
        const inW = rw - fs * 0.44, inH = rh - fs * 0.44;
        ctx.strokeRect(inX, inY, inW, inH);
        // Diamond ornaments at the inner border's four corners
        const dm = fs * 0.13;
        ctx.fillStyle = ink(0.8);
        for (const [dx2, dy2] of [[inX, inY], [inX + inW, inY], [inX, inY + inH], [inX + inW, inY + inH]] as const) {
          ctx.beginPath();
          ctx.moveTo(dx2, dy2 - dm);
          ctx.lineTo(dx2 + dm, dy2);
          ctx.lineTo(dx2, dy2 + dm);
          ctx.lineTo(dx2 - dm, dy2);
          ctx.closePath();
          ctx.fill();
        }
        // Short flourishes either side of the text (horizontal line + dot)
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
        // Ribbon banner: a swallow-tailed ribbon text box that stretches to fit the text
        const fs = size;
        const text = orn.text || "Banner";
        ctx.save();
        ctx.font = `600 ${fs}px ${FONT_SERIF}`;
        const tw = ctx.measureText(text).width;
        const hw = tw / 2 + fs * 0.9;   // half-width of the body
        const hh = fs * 0.75;           // half-height of the body
        ctx.lineJoin = "round";
        ctx.strokeStyle = ink(0.85);
        ctx.lineWidth = Math.max(fs * 0.05, 0.5 / s); // scales with size (avoids mushing when shrunk)
        // End folds (back layer, darker)
        ctx.fillStyle = ink(0.32);
        for (const dir of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + dir * hw, cy - hh * 0.62);
          ctx.lineTo(cx + dir * (hw + fs * 0.32), cy + hh * 0.08);
          ctx.lineTo(cx + dir * hw, cy + hh * 0.95);
          ctx.closePath();
          ctx.fill();
        }
        // Swallow-tailed ends
        ctx.fillStyle = th.title;
        for (const dir of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + dir * hw, cy - hh * 0.62);
          ctx.lineTo(cx + dir * (hw + fs * 1.15), cy - hh * 0.38);
          ctx.lineTo(cx + dir * (hw + fs * 0.72), cy + hh * 0.18);  // notch
          ctx.lineTo(cx + dir * (hw + fs * 1.1), cy + hh * 0.82);
          ctx.lineTo(cx + dir * hw, cy + hh * 0.95);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        // Body (arched slightly upwards)
        ctx.beginPath();
        ctx.moveTo(cx - hw, cy - hh);
        ctx.quadraticCurveTo(cx, cy - hh - fs * 0.22, cx + hw, cy - hh);
        ctx.lineTo(cx + hw, cy + hh);
        ctx.quadraticCurveTo(cx, cy + hh - fs * 0.22, cx - hw, cy + hh);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Text (nudged up slightly to sit on the arch's centre)
        ctx.fillStyle = th.titleInk;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, cx, cy - fs * 0.06);
        ctx.restore();
        boxes.set(orn.id, {
          x: cx - hw - fs * 1.2, y: cy - hh - fs * 0.25,
          w: (hw + fs * 1.2) * 2, h: hh * 2 + fs * 0.25,
        });
        break;
      }
      case "label": {
        // Place-name label: serif + letter spacing + faint halo (for sea and range names)
        const fs = size;
        const text = orn.text || "Label";
        ctx.save();
        ctx.font = `600 ${fs}px ${FONT_SERIF}`;
        try { (ctx as unknown as { letterSpacing: string }).letterSpacing = `${fs * 0.22}px`; } catch { /* ignore if unsupported */ }
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
        // Note card: a slip of paper with a folded corner (handwriting face)
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
        // Body (fold at the top right) — soft drop shadow
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
        // Folded ear
        ctx.beginPath();
        ctx.moveTo(rx + rw - fold, ry);
        ctx.lineTo(rx + rw - fold, ry + fold);
        ctx.lineTo(rx + rw, ry + fold);
        ctx.closePath();
        ctx.fillStyle = th.fold;
        ctx.fill();
        ctx.stroke();
        // Text
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
        // Caravel in profile — hull (plank lines), bowsprit, two masts, billowing square sail,
        // triangular jib, pennant, bow waves
        const r = size;
        const lw = Math.max(r * 0.03, 0.55 / s); // line width scales with size (avoids mushing when shrunk)
        const sail = style === "color" ? "#fbf8f0" : "rgba(253,251,244,0.92)";
        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = ink(0.88);
        ctx.lineWidth = lw;

        // Hull
        const hull = new Path2D();
        hull.moveTo(cx - r * 0.95, cy + r * 0.12);                                  // stern rail (high)
        hull.quadraticCurveTo(cx - r * 1.02, cy + r * 0.42, cx - r * 0.78, cy + r * 0.58);
        hull.quadraticCurveTo(cx - r * 0.1, cy + r * 0.82, cx + r * 0.72, cy + r * 0.56); // ship's belly
        hull.lineTo(cx + r * 1.02, cy + r * 0.16);                                  // rising bow
        hull.lineTo(cx + r * 0.78, cy + r * 0.3);
        hull.quadraticCurveTo(cx, cy + r * 0.46, cx - r * 0.68, cy + r * 0.3);
        hull.closePath();
        ctx.fillStyle = style === "color" ? th.card : "rgba(240,230,204,0.9)";
        ctx.fill(hull);
        ctx.stroke(hull);
        // Two plank lines
        ctx.strokeStyle = ink(0.4);
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.82, cy + r * 0.42);
        ctx.quadraticCurveTo(cx, cy + r * 0.62, cx + r * 0.8, cy + r * 0.42);
        ctx.moveTo(cx - r * 0.72, cy + r * 0.52);
        ctx.quadraticCurveTo(cx, cy + r * 0.7, cx + r * 0.66, cy + r * 0.5);
        ctx.stroke();

        // Bowsprit + masts (main and mizzen)
        ctx.strokeStyle = ink(0.85);
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.88, cy + r * 0.22);
        ctx.lineTo(cx + r * 1.32, cy - r * 0.12);   // bowsprit
        ctx.moveTo(cx + r * 0.02, cy + r * 0.4);
        ctx.lineTo(cx + r * 0.02, cy - r * 1.02);   // main mast
        ctx.moveTo(cx - r * 0.6, cy + r * 0.28);
        ctx.lineTo(cx - r * 0.6, cy - r * 0.62);    // mizzen mast
        ctx.stroke();

        // Main sail: a square sail billowing to the left (narrow top yard, wide bottom yard)
        const mainSail = new Path2D();
        mainSail.moveTo(cx - r * 0.34, cy - r * 0.92);
        mainSail.quadraticCurveTo(cx - r * 0.62, cy - r * 0.5, cx - r * 0.42, cy - r * 0.1);
        mainSail.lineTo(cx + r * 0.44, cy - r * 0.1);
        mainSail.quadraticCurveTo(cx + r * 0.5, cy - r * 0.52, cx + r * 0.38, cy - r * 0.92);
        mainSail.closePath();
        ctx.fillStyle = sail;
        ctx.fill(mainSail);
        ctx.stroke(mainSail);
        // Yards
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.34, cy - r * 0.92); ctx.lineTo(cx + r * 0.38, cy - r * 0.92);
        ctx.moveTo(cx - r * 0.42, cy - r * 0.1); ctx.lineTo(cx + r * 0.44, cy - r * 0.1);
        ctx.stroke();

        // Jib (triangular sail): bowsprit ↔ main mast
        const jib = new Path2D();
        jib.moveTo(cx + r * 1.22, cy - r * 0.06);
        jib.lineTo(cx + r * 0.5, cy - r * 0.72);
        jib.quadraticCurveTo(cx + r * 0.62, cy - r * 0.3, cx + r * 0.94, cy + r * 0.02);
        jib.closePath();
        ctx.fill(jib);
        ctx.stroke(jib);

        // Mizzen (lateen sail)
        const mizzen = new Path2D();
        mizzen.moveTo(cx - r * 0.6, cy - r * 0.58);
        mizzen.lineTo(cx - r * 0.6, cy + r * 0.05);
        mizzen.quadraticCurveTo(cx - r * 0.92, cy - r * 0.2, cx - r * 0.6, cy - r * 0.58);
        mizzen.closePath();
        ctx.fill(mizzen);
        ctx.stroke(mizzen);

        // Rigging (thin ropes)
        ctx.strokeStyle = ink(0.35);
        ctx.lineWidth = lw * 0.55;
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.02, cy - r * 1.0); ctx.lineTo(cx + r * 1.28, cy - r * 0.1);
        ctx.moveTo(cx + r * 0.02, cy - r * 1.0); ctx.lineTo(cx - r * 0.88, cy + r * 0.14);
        ctx.stroke();

        // Pennant flag (masthead, downwind)
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.02, cy - r * 1.02);
        ctx.lineTo(cx - r * 0.3, cy - r * 0.94);
        ctx.lineTo(cx + r * 0.02, cy - r * 0.88);
        ctx.closePath();
        ctx.fillStyle = style === "color" ? "#a83c3c" : ink(0.7);
        ctx.fill();

        // Bow waves
        ctx.strokeStyle = ink(0.4);
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx - r * 1.05, cy + r * 0.68);
        ctx.quadraticCurveTo(cx - r * 0.85, cy + r * 0.58, cx - r * 0.66, cy + r * 0.7);
        ctx.moveTo(cx + r * 0.55, cy + r * 0.72);
        ctx.quadraticCurveTo(cx + r * 0.78, cy + r * 0.6, cx + r * 1.0, cy + r * 0.72);
        ctx.stroke();

        ctx.restore();
        boxes.set(orn.id, { x: cx - r * 1.15, y: cy - r * 1.15, w: r * 2.55, h: r * 2.05 });
        break;
      }
      case "monster": {
        // Sea serpent — arched neck + head (open jaws, eye, horn), two finned body humps,
        // tail fluke, spray
        const r = size;
        const lw = Math.max(r * 0.03, 0.55 / s); // line width scales with size (avoids mushing when shrunk)
        const wl = cy + r * 0.32; // waterline
        const body = style === "color" ? "rgba(210,222,214,0.85)" : "rgba(228,216,186,0.8)";
        ctx.save();
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = ink(0.88);
        ctx.lineWidth = lw;

        // Neck + head: an S-shaped neck rising from the water
        const neck = new Path2D();
        neck.moveTo(cx - r * 0.42, wl);
        neck.quadraticCurveTo(cx - r * 0.52, cy - r * 0.3, cx - r * 0.82, cy - r * 0.52);
        // Top of the head → open upper jaw
        neck.quadraticCurveTo(cx - r * 0.98, cy - r * 0.62, cx - r * 1.18, cy - r * 0.56);
        neck.lineTo(cx - r * 1.02, cy - r * 0.46);      // inside the upper jaw
        neck.lineTo(cx - r * 1.14, cy - r * 0.34);      // tip of the lower jaw
        neck.quadraticCurveTo(cx - r * 0.92, cy - r * 0.3, cx - r * 0.78, cy - r * 0.36);
        // Down the front of the neck to the waterline
        neck.quadraticCurveTo(cx - r * 0.6, cy - r * 0.12, cx - r * 0.72, wl);
        neck.closePath();
        ctx.fillStyle = body;
        ctx.fill(neck);
        ctx.stroke(neck);
        // Horn and eye
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.86, cy - r * 0.56);
        ctx.lineTo(cx - r * 0.8, cy - r * 0.74);
        ctx.stroke();
        ctx.fillStyle = ink(0.95);
        ctx.beginPath();
        ctx.arc(cx - r * 0.9, cy - r * 0.5, Math.max(1.2, r * 0.045), 0, Math.PI * 2);
        ctx.fill();

        // Two body humps (semicircles above the waterline) + dorsal spikes
        const humps: [number, number][] = [[cx + r * 0.02, 0.34], [cx + r * 0.62, 0.22]];
        for (const [hx, hr0] of humps) {
          const hr = r * hr0;
          const hump = new Path2D();
          hump.arc(hx, wl, hr, Math.PI, 0);
          hump.closePath();
          ctx.fillStyle = body;
          ctx.fill(hump);
          ctx.stroke(hump);
          // 3–4 dorsal spikes
          ctx.fillStyle = ink(0.55);
          const nSp = hr0 > 0.3 ? 4 : 3;
          for (let k2 = 0; k2 < nSp; k2++) {
            const a = Math.PI + ((k2 + 0.7) / (nSp + 0.4)) * Math.PI;
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

        // Tail: a forked fluke raised out of the water
        const tail = new Path2D();
        tail.moveTo(cx + r * 1.0, wl);
        tail.quadraticCurveTo(cx + r * 1.12, cy - r * 0.02, cx + r * 1.05, cy - r * 0.22);
        tail.quadraticCurveTo(cx + r * 1.28, cy - r * 0.18, cx + r * 1.34, cy - r * 0.34); // outer fluke
        tail.quadraticCurveTo(cx + r * 1.18, cy - r * 0.44, cx + r * 1.02, cy - r * 0.38); // inner fluke
        tail.quadraticCurveTo(cx + r * 0.92, cy - r * 0.1, cx + r * 0.84, wl);
        tail.closePath();
        ctx.fillStyle = body;
        ctx.fill(tail);
        ctx.stroke(tail);

        // Ripples on the water (beneath neck, humps and tail)
        ctx.strokeStyle = ink(0.38);
        ctx.lineWidth = lw * 0.65;
        ctx.beginPath();
        for (const [ox2, len] of [[-0.72, 0.5], [-0.12, 0.42], [0.5, 0.44], [0.86, 0.4]] as const) {
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

/**
 * Coordinate grid border — columns are A·B·C…, rows 1·2·3… (naval chart convention).
 * Drawn in world space so it follows zooming and exports.
 */
export function drawCoordinateGrid(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, s: number, inkRGB: RGB,
): void {
  const m = Math.min(W, H);
  const cell = m / 8;                       // target cell size
  const cols = Math.max(2, Math.round(W / cell));
  const rows = Math.max(2, Math.round(H / cell));
  const cw = W / cols, ch = H / rows;
  const ink = (a: number) => `rgba(${inkRGB[0]},${inkRGB[1]},${inkRGB[2]},${a})`;
  const margin = m * 0.032;

  ctx.save();
  ctx.strokeStyle = ink(0.22);
  ctx.lineWidth = Math.max(0.3, 0.5 / s);
  ctx.beginPath();
  for (let c = 1; c < cols; c++) { ctx.moveTo(c * cw, 0); ctx.lineTo(c * cw, H); }
  for (let r = 1; r < rows; r++) { ctx.moveTo(0, r * ch); ctx.lineTo(W, r * ch); }
  ctx.stroke();

  // Background bands for the border tick labels
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
    const label = String.fromCharCode(65 + (c % 26));
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

function drawCompass(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, s: number,
  ink: (a: number) => string,
): void {
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
  // Outer ring ticks (32 compass points)
  ctx.strokeStyle = ink(0.5);
  ctx.lineWidth = Math.max(0.35, 0.5 / s);
  ctx.beginPath();
  for (let k = 0; k < 32; k++) {
    const ang = (k * Math.PI) / 16;
    const r0 = k % 4 === 0 ? r * 1.06 : r * 1.11;
    ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
    ctx.lineTo(cx + Math.cos(ang) * r * 1.18, cy + Math.sin(ang) * r * 1.18);
  }
  ctx.stroke();
  for (let k = 0; k < 8; k++) {
    const long = k % 2 === 0;
    const ang = (k * Math.PI) / 4 - Math.PI / 2;
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
