/**
 * 번들된 지도 폰트 (styles.css에 base64로 내장, 오프라인 동작).
 * 라틴은 Cinzel(장식 로마체), 한글은 Gaegu(손글씨). 스택 순서로 자동 분담된다.
 */
export const FONT_SERIF = '"FMS Serif", "FMS Hand", Georgia, serif'; // 라틴→Cinzel, 한글→Gaegu
export const FONT_HAND = '"FMS Hand", "Segoe Script", cursive';      // 손글씨 (한글+라틴)

/** 캔버스가 폰트를 쓰기 전에 로드를 보장 (로드 후 콜백으로 재렌더) */
export function ensureFontsLoaded(cb: () => void): void {
  const fd = (document as unknown as { fonts?: FontFaceSet }).fonts;
  if (!fd) { cb(); return; }
  Promise.all([
    fd.load('600 16px "FMS Serif"'),
    fd.load('600 16px "FMS Hand"'),
  ]).then(() => cb()).catch(() => cb());
}
