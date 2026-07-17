/**
 * 하이트맵 → 벡터 등고선 추출 (마칭 스퀘어) + Douglas-Peucker 단순화.
 * 지도 밖을 매우 낮은 값으로 취급해 모든 등고선이 닫힌 링이 되도록 한다.
 * 좌표 단위는 하이트맵 셀(픽셀)이며, 겹친 링은 evenodd 채우기로 구멍을 표현한다.
 */

export type Ring = [number, number][];

export interface ContourLevel {
  z: number;      // 이 레벨의 등고 높이 (0..1)
  rings: Ring[];
}

export interface ContourSet {
  levels: ContourLevel[];
  step: number;   // 레벨 간 높이 간격
}

/**
 * precision(0..2)에 따라 레벨 수와 단순화 강도를 정해 등고선 집합을 만든다.
 * bathy > 0이면 해수면 아래 등심선도 포함한다 (z < sea, 얕은 것부터 깊은 순 아님 — 오름차순 유지).
 */
export function extractContours(
  height: Float32Array, w: number, h: number,
  sea: number, precision: number, bathy = 2,
): ContourSet {
  // 등고선은 근대 지형도 기법이라 판타지 지도에선 절제 — 기본을 성기게 (정밀도 슬라이더로 추가 가능)
  const levelCount = Math.round(3 + precision * 4);          // 3..11
  const epsilon = Math.max(0.4, 2.2 - precision * 0.9);      // 셀 단위, 정밀할수록 작게
  const step = (1 - sea) / levelCount;

  const levels: ContourLevel[] = [];
  // 해저 등심선 (깊은 순으로 추가해 전체 오름차순 유지)
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
 * 임의 스칼라 필드의 등치선 링 추출 — 해안 헤칭(waterDist 등距離 잔선) 등에 사용.
 * 단순화·미세 링 필터 포함.
 */
export function extractIsoRings(
  field: Float32Array, w: number, h: number, iso: number,
  epsilon = 0.8, minArea = 6,
): Ring[] {
  return marchingSquares(field, w, h, iso)
    .map((r) => simplifyRing(r, epsilon))
    .filter((r) => r.length >= 3 && Math.abs(ringArea(r)) > minArea);
}

/** 열린 폴리라인 단순화 (강줄기용 Douglas-Peucker) */
export function simplifyLine(pts: Ring, epsilon: number): Ring {
  return dpSimplify(pts, epsilon);
}

// ── 마칭 스퀘어 ─────────────────────────────────────────

function marchingSquares(f: Float32Array, w: number, h: number, iso: number): Ring[] {
  const OUT = -10; // 지도 밖 = 항상 등고선 아래 → 링이 경계에서 닫힘
  const sample = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= w || y >= h ? OUT : f[y * w + x];

  // 세그먼트를 평탄 배열로 수집: [x1,y1,x2,y2, ...]
  const segs: number[] = [];
  for (let y = -1; y < h; y++) {
    for (let x = -1; x < w; x++) {
      const a = sample(x, y);         // 좌상
      const b = sample(x + 1, y);     // 우상
      const c = sample(x + 1, y + 1); // 우하
      const d = sample(x, y + 1);     // 좌하
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
      // 각 변 위의 교차점
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
        case 5: // 대각 모호(b,d 위) → 셀 중앙값으로 결정
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
        case 10: // 대각 모호(a,c 위)
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

/** 세그먼트들을 끝점 매칭으로 닫힌 링으로 연결 */
function chainSegments(segs: number[]): Ring[] {
  const count = segs.length / 4;
  const key = (x: number, y: number): string =>
    `${Math.round(x * 1024)},${Math.round(y * 1024)}`;

  // 끝점 → 세그먼트 인덱스 목록
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

    // 꼬리를 계속 연장
    for (;;) {
      const tail = ring[ring.length - 1];
      const tk = key(tail[0], tail[1]);
      if (tk === headKey && ring.length > 2) { ring.pop(); break; } // 닫힘
      const candidates = byPoint.get(tk);
      let next = -1;
      if (candidates) {
        for (const ci of candidates) {
          if (!used[ci]) { next = ci; break; }
        }
      }
      if (next < 0) break; // 열린 채 종료 (수치 오차 등) → 그대로 사용
      used[next] = 1;
      const nx1 = segs[next * 4], ny1 = segs[next * 4 + 1];
      const nx2 = segs[next * 4 + 2], ny2 = segs[next * 4 + 3];
      // 꼬리와 일치하지 않는 쪽 끝점을 붙인다
      if (key(nx1, ny1) === tk) ring.push([nx2, ny2]);
      else ring.push([nx1, ny1]);
    }
    if (ring.length >= 3) rings.push(ring);
  }
  return rings;
}

// ── 단순화 (Douglas-Peucker) ────────────────────────────

export function simplifyRing(ring: Ring, epsilon: number): Ring {
  if (epsilon <= 0 || ring.length < 8) return ring;
  // 닫힌 링: 시작점에서 가장 먼 점을 찾아 두 개의 열린 사슬로 나눠 처리
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
      // 선분까지의 수직 거리²
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
 * Chaikin 코너 컷팅 — 각진 폴리라인을 부드러운 곡선으로.
 * closed=true면 링, false면 열린 선(강줄기)으로 처리한다.
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
