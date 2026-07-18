/**
 * Bundled map fonts (embedded in styles.css as base64, so they work offline).
 * Latin uses Cinzel (decorative roman); Hangul uses Gaegu (handwriting).
 * The font stack order shares the work between them automatically.
 */
export const FONT_SERIF = '"FMS Serif", "FMS Hand", Georgia, serif'; // Latin → Cinzel, Hangul → Gaegu
export const FONT_HAND = '"FMS Hand", "Segoe Script", cursive';      // handwriting (Hangul + Latin)

/** Ensure the fonts are loaded before the canvas uses them (re-render via callback afterwards) */
export function ensureFontsLoaded(cb: () => void): void {
  const fd = (document as unknown as { fonts?: FontFaceSet }).fonts;
  if (!fd) { cb(); return; }
  Promise.all([
    fd.load('600 16px "FMS Serif"'),
    fd.load('600 16px "FMS Hand"'),
  ]).then(() => cb()).catch(() => cb());
}
