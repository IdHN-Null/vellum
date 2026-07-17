/** 시드 기반 2D 그래디언트 노이즈 + fBm. 외부 의존성 없음. */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

export class Noise2D {
  private perm: Uint8Array;

  constructor(seed: number) {
    const rng = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  /** -1..1 */
  noise(x: number, y: number): number {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const p = this.perm;
    const aa = p[p[xi & 255] + (yi & 255)] & 7;
    const ab = p[p[xi & 255] + ((yi + 1) & 255)] & 7;
    const ba = p[p[(xi + 1) & 255] + (yi & 255)] & 7;
    const bb = p[p[(xi + 1) & 255] + ((yi + 1) & 255)] & 7;
    const dot = (g: number[], dx: number, dy: number) => g[0] * dx + g[1] * dy;
    const x1 = dot(GRAD[aa], xf, yf) + u * (dot(GRAD[ba], xf - 1, yf) - dot(GRAD[aa], xf, yf));
    const x2 = dot(GRAD[ab], xf, yf - 1) + u * (dot(GRAD[bb], xf - 1, yf - 1) - dot(GRAD[ab], xf, yf - 1));
    return (x1 + v * (x2 - x1)) * 1.4;
  }
}

export function fbm(
  n: Noise2D, x: number, y: number,
  octaves: number, lacunarity = 2, gain = 0.5,
): number {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += n.noise(x * freq, y * freq) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}
