/**
 * Heightmap → vector contour extraction (marching squares) + Douglas-Peucker simplification.
 * The area outside the map is treated as a very low value, so every contour closes into a ring.
 * Coordinates are in heightmap cells (pixels); nested rings express holes via even-odd filling.
 */

export type Ring = [number, number][];

export interface ContourLevel {
  z: number;      // contour height of this level (0..1)
  rings: Ring[];
}

export interface ContourSet {
  levels: ContourLevel[];
  step: number;   // height interval between levels
}

/**
 * Builds the contour set, choosing level count and simplification strength from
 * precision (0..2). With bathy > 0, sub-sea-level bathymetric lines are included
 * as well (z < sea; kept in ascending order, not shallow-to-deep).
 */
export function extractContours(
  height: Float32Array, w: number, h: number,
  sea: number, precision: number, bathy = 2,
): ContourSet {
  // Contours are a modern-cartography technique, so keep them restrained on a fantasy
  // map — sparse by default (the precision slider can add more)
  const levelCount = Math.round(3 + precision * 4);          // 3..11
  const epsilon = Math.max(0.4, 2.2 - precision * 0.9);      // in cells; smaller at higher precision
  const step = (1 - sea) / levelCount;

  const levels: ContourLevel[] = [];
  // Bathymetric lines (added deepest-first so the whole list stays ascending)
  for (let k = bathy; k >= 1; k--) {
    const iso = sea - k * 0.055;
    if (iso <= 0.02) continue;
    const rings = marchingSquares(height, w, h, iso)
      .map((r) => simplifyRing(r, epsilon * 1.4))
      .filter((r) => r.length >= 3 && Math.abs(ringArea(r)) > 12);
    if (rings.length > 0) levels.push({ z: iso, rings });
  }
  for (let k = 0; k < levelCount; k++) {
    const iso = sea + k * step;
    const rings = marchingSquares(height, w, h, iso)
      .map((r) => simplifyRing(r, epsilon))
      .filter((r) => r.length >= 3 && Math.abs(ringArea(r)) > 3);
    if (rings.length > 0) levels.push({ z: iso, rings });
  }
  return { levels, step };
}

/**
 * Extract iso-line rings from an arbitrary scalar field — used for coastal hatching
 * (equidistant waterDist rings) and similar. Includes simplification and a filter
 * for tiny rings.
 */
export function extractIsoRings(
  field: Float32Array, w: number, h: number, iso: number,
  epsilon = 0.8, minArea = 6,
): Ring[] {
  return marchingSquares(field, w, h, iso)
    .map((r) => simplifyRing(r, epsilon))
    .filter((r) => r.length >= 3 && Math.abs(ringArea(r)) > minArea);
}

/** Open polyline simplification (Douglas-Peucker, for rivers) */
export function simplifyLine(pts: Ring, epsilon: number): Ring {
  return dpSimplify(pts, epsilon);
}

// ── Marching squares ────────────────────────────────────

function marchingSquares(f: Float32Array, w: number, h: number, iso: number): Ring[] {
  const OUT = -10; // outside the map = always below the contour → rings close at the border
  const sample = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= w || y >= h ? OUT : f[y * w + x];

  // Collect segments into a flat array: [x1,y1,x2,y2, ...]
  const segs: number[] = [];
  for (let y = -1; y < h; y++) {
    for (let x = -1; x < w; x++) {
      const a = sample(x, y);         // top-left
      const b = sample(x + 1, y);     // top-right
      const c = sample(x + 1, y + 1); // bottom-right
      const d = sample(x, y + 1);     // bottom-left
      let idx = 0;
      if (a >= iso) idx |= 8;
      if (b >= iso) idx |= 4;
      if (c >= iso) idx |= 2;
      if (d >= iso) idx |= 1;
      if (idx === 0 || idx === 15) continue;

      const t = (va: number, vb: number): number => {
        const dv = vb - va;
        return dv === 0 ? 0.5 : (iso - va) / dv;
      };
      // Intersection points on each edge
      const topX = x + t(a, b), topY = y;
      const rightX = x + 1, rightY = y + t(b, c);
      const botX = x + t(d, c), botY = y + 1;
      const leftX = x, leftY = y + t(a, d);
      const put = (x1: number, y1: number, x2: number, y2: number) => segs.push(x1, y1, x2, y2);

      switch (idx) {
        case 1: put(leftX, leftY, botX, botY); break;
        case 2: put(botX, botY, rightX, rightY); break;
        case 3: put(leftX, leftY, rightX, rightY); break;
        case 4: put(topX, topY, rightX, rightY); break;
        case 5: // diagonal ambiguity (b, d above) → resolve via the cell-centre value
          if ((a + b + c + d) / 4 >= iso) {
            put(topX, topY, leftX, leftY); put(botX, botY, rightX, rightY);
          } else {
            put(topX, topY, rightX, rightY); put(leftX, leftY, botX, botY);
          }
          break;
        case 6: put(topX, topY, botX, botY); break;
        case 7: put(leftX, leftY, topX, topY); break;
        case 8: put(leftX, leftY, topX, topY); break;
        case 9: put(topX, topY, botX, botY); break;
        case 10: // diagonal ambiguity (a, c above)
          if ((a + b + c + d) / 4 >= iso) {
            put(topX, topY, rightX, rightY); put(leftX, leftY, botX, botY);
          } else {
            put(topX, topY, leftX, leftY); put(botX, botY, rightX, rightY);
          }
          break;
        case 11: put(topX, topY, rightX, rightY); break;
        case 12: put(leftX, leftY, rightX, rightY); break;
        case 13: put(botX, botY, rightX, rightY); break;
        case 14: put(leftX, leftY, botX, botY); break;
      }
    }
  }
  return chainSegments(segs);
}

/** Chain segments into closed rings via endpoint matching */
function chainSegments(segs: number[]): Ring[] {
  const count = segs.length / 4;
  const key = (x: number, y: number): string =>
    `${Math.round(x * 1024)},${Math.round(y * 1024)}`;

  // Endpoint → list of segment indices
  const byPoint = new Map<string, number[]>();
  for (let i = 0; i < count; i++) {
    for (const k of [key(segs[i * 4], segs[i * 4 + 1]), key(segs[i * 4 + 2], segs[i * 4 + 3])]) {
      const arr = byPoint.get(k);
      if (arr) arr.push(i);
      else byPoint.set(k, [i]);
    }
  }

  const used = new Uint8Array(count);
  const rings: Ring[] = [];

  for (let start = 0; start < count; start++) {
    if (used[start]) continue;
    used[start] = 1;
    const ring: Ring = [
      [segs[start * 4], segs[start * 4 + 1]],
      [segs[start * 4 + 2], segs[start * 4 + 3]],
    ];
    const headKey = key(ring[0][0], ring[0][1]);

    // Keep extending the tail
    for (;;) {
      const tail = ring[ring.length - 1];
      const tk = key(tail[0], tail[1]);
      if (tk === headKey && ring.length > 2) { ring.pop(); break; } // closed
      const candidates = byPoint.get(tk);
      let next = -1;
      if (candidates) {
        for (const ci of candidates) {
          if (!used[ci]) { next = ci; break; }
        }
      }
      if (next < 0) break; // ends open (numerical error etc.) → use as-is
      used[next] = 1;
      const nx1 = segs[next * 4], ny1 = segs[next * 4 + 1];
      const nx2 = segs[next * 4 + 2], ny2 = segs[next * 4 + 3];
      // Append whichever endpoint does not match the tail
      if (key(nx1, ny1) === tk) ring.push([nx2, ny2]);
      else ring.push([nx1, ny1]);
    }
    if (ring.length >= 3) rings.push(ring);
  }
  return rings;
}

// ── Simplification (Douglas-Peucker) ────────────────────

export function simplifyRing(ring: Ring, epsilon: number): Ring {
  if (epsilon <= 0 || ring.length < 8) return ring;
  // Closed ring: find the point farthest from the start and process as two open chains
  let far = 0, farD = -1;
  for (let i = 1; i < ring.length; i++) {
    const dx = ring[i][0] - ring[0][0], dy = ring[i][1] - ring[0][1];
    const d = dx * dx + dy * dy;
    if (d > farD) { farD = d; far = i; }
  }
  const a = dpSimplify(ring.slice(0, far + 1), epsilon);
  const b = dpSimplify(ring.slice(far).concat([ring[0]]), epsilon);
  return a.slice(0, -1).concat(b.slice(0, -1));
}

function dpSimplify(pts: Ring, epsilon: number): Ring {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  const eps2 = epsilon * epsilon;

  while (stack.length > 0) {
    const [s, e] = stack.pop()!;
    if (e - s < 2) continue;
    const [sx, sy] = pts[s], [ex, ey] = pts[e];
    const dx = ex - sx, dy = ey - sy;
    const len2 = dx * dx + dy * dy || 1;
    let maxD = -1, maxI = -1;
    for (let i = s + 1; i < e; i++) {
      // Squared perpendicular distance to the segment
      const px = pts[i][0] - sx, py = pts[i][1] - sy;
      const cross = px * dy - py * dx;
      const d = (cross * cross) / len2;
      if (d > maxD) { maxD = d; maxI = i; }
    }
    if (maxD > eps2) {
      keep[maxI] = 1;
      stack.push([s, maxI], [maxI, e]);
    }
  }
  const out: Ring = [];
  for (let i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
  return out;
}

/**
 * Chaikin corner cutting — turns an angular polyline into a smooth curve.
 * closed=true treats it as a ring; false as an open line (rivers).
 */
export function chaikin(pts: Ring, iterations = 2, closed = true): Ring {
  let cur = pts;
  for (let it = 0; it < iterations; it++) {
    if (cur.length < 3) return cur;
    const out: Ring = [];
    const n = cur.length;
    if (!closed) out.push(cur[0]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const [ax, ay] = cur[i];
      const [bx, by] = cur[(i + 1) % n];
      out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
      out.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    if (!closed) out.push(cur[n - 1]);
    cur = out;
  }
  return cur;
}

export function ringArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return sum / 2;
}
