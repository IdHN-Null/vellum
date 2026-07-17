/**
 * 내장 벡터 스티커 라이브러리 — 하늘·바다·땅·지도 4계열.
 * 모든 스티커는 (cx,cy) 중심, 반경 r 기준의 상대 좌표로 그리고,
 * 지도 잉크 색과 종이 색을 받아 스타일과 조화를 이룬다.
 */

import { ribbonPath } from "./ink";

export type InkFn = (a: number) => string;

type Pt = [number, number];

/** 2차 베지어를 n등분 샘플 (캘리그래피 테이퍼 리본용) */
function sampleQuad(p0: Pt, c: Pt, p1: Pt, n = 14): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, u = 1 - t;
    out.push([
      u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
      u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
    ]);
  }
  return out;
}

/** 안으로 감기는 나선 점열 (캘리그래피 컬) */
function spiralPts(cx: number, cy: number, r0: number, turns: number, phase: number, dir = 1): Pt[] {
  const out: Pt[] = [];
  const total = turns * Math.PI * 2;
  for (let t = 0; t <= total; t += 0.22) {
    const rr = r0 * (1 - t / (total * 1.12));
    out.push([cx + Math.cos(phase + t * dir) * rr, cy + Math.sin(phase + t * dir) * rr]);
  }
  return out;
}

export interface StickerDef {
  id: string;
  label: string;
  cat: "sky" | "sea" | "land" | "map";
  /** 바운딩 박스 절반 크기 (r 배수) [wF, hF] */
  box: [number, number];
  draw: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, ink: InkFn, paper: string) => void;
}

export const STICKER_CATS: { id: StickerDef["cat"]; label: string }[] = [
  { id: "sky", label: "하늘" },
  { id: "sea", label: "바다" },
  { id: "land", label: "땅" },
  { id: "map", label: "지도" },
];

export const STICKERS: StickerDef[] = [
  // ── 하늘 ─────────────────────────────────────────────
  {
    id: "cloud", label: "구름", cat: "sky", box: [1.2, 0.72],
    draw(ctx, cx, cy, r, ink, paper) {
      const lw = ctx.lineWidth;
      // 납작한 층운(stratus) — 밑변이 평평하고 윗면만 뭉실, 아래 각인선으로 판화 느낌
      const base = cy + r * 0.28;
      const p = new Path2D();
      p.moveTo(cx - r * 0.98, base);
      p.quadraticCurveTo(cx - r * 1.06, cy + r * 0.02, cx - r * 0.66, cy - r * 0.06);
      p.quadraticCurveTo(cx - r * 0.56, cy - r * 0.42, cx - r * 0.18, cy - r * 0.34);
      p.quadraticCurveTo(cx + r * 0.06, cy - r * 0.56, cx + r * 0.42, cy - r * 0.34);
      p.quadraticCurveTo(cx + r * 0.7, cy - r * 0.42, cx + r * 0.8, cy - r * 0.08);
      p.quadraticCurveTo(cx + r * 1.08, cy - r * 0.04, cx + r * 0.98, base);
      p.closePath();
      ctx.fillStyle = paper;
      ctx.fill(p);
      ctx.strokeStyle = ink(0.82);
      ctx.stroke(p);
      // 아래 각인선 (수평 결 2줄)
      ctx.strokeStyle = ink(0.35);
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.78, base + r * 0.14); ctx.lineTo(cx + r * 0.5, base + r * 0.14);
      ctx.moveTo(cx - r * 0.5, base + r * 0.28); ctx.lineTo(cx + r * 0.78, base + r * 0.28);
      ctx.stroke();
      ctx.lineWidth = lw;
    },
  },
  {
    id: "sun", label: "태양", cat: "sky", box: [1.05, 1.05],
    draw(ctx, cx, cy, r, ink, paper) {
      // 헤럴드풍 '태양(sun in splendor)' — 얼굴 없이 절제된 광선과 이중 원반
      const lw = ctx.lineWidth;
      // 16방향 뾰족한 광선 (긴/짧은 교대)
      ctx.fillStyle = ink(0.8);
      for (let k = 0; k < 16; k++) {
        const a = (k * Math.PI) / 8;
        const len = k % 2 === 0 ? r * 1.0 : r * 0.66;
        const wj = r * (k % 2 === 0 ? 0.06 : 0.045);
        const px = Math.cos(a), py = Math.sin(a);
        const qx = -py, qy = px;
        ctx.beginPath();
        ctx.moveTo(cx + px * len, cy + py * len);
        ctx.lineTo(cx + px * r * 0.5 + qx * wj, cy + py * r * 0.5 + qy * wj);
        ctx.lineTo(cx + px * r * 0.5 - qx * wj, cy + py * r * 0.5 - qy * wj);
        ctx.closePath();
        ctx.fill();
      }
      // 원반 + 이중 링
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = paper;
      ctx.fill();
      ctx.strokeStyle = ink(0.85);
      ctx.stroke();
      ctx.strokeStyle = ink(0.45);
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.36, 0, Math.PI * 2);
      ctx.stroke();
      // 중심에서 뻗는 짧은 각인선 8개 (표정 대신 방사 문양)
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4 + Math.PI / 8;
        ctx.moveTo(cx + Math.cos(a) * r * 0.12, cy + Math.sin(a) * r * 0.12);
        ctx.lineTo(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3);
      }
      ctx.stroke();
      ctx.lineWidth = lw;
    },
  },
  {
    id: "moon", label: "초승달", cat: "sky", box: [0.95, 0.8],
    draw(ctx, cx, cy, r, ink, paper) {
      const lw = ctx.lineWidth;
      const p = new Path2D();
      p.moveTo(cx + r * 0.2, cy - r * 0.56);
      p.bezierCurveTo(cx - r * 0.78, cy - r * 0.58, cx - r * 0.78, cy + r * 0.58, cx + r * 0.16, cy + r * 0.56);
      p.bezierCurveTo(cx - r * 0.2, cy + r * 0.42, cx - r * 0.22, cy - r * 0.42, cx + r * 0.2, cy - r * 0.56);
      p.closePath();
      ctx.fillStyle = paper;
      ctx.fill(p);
      ctx.strokeStyle = ink(0.85);
      ctx.stroke(p);
      // 안쪽 음영선 (판화 결) — 반짝이 대신
      ctx.strokeStyle = ink(0.4);
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.02, cy - r * 0.4);
      ctx.bezierCurveTo(cx - r * 0.5, cy - r * 0.42, cx - r * 0.5, cy + r * 0.42, cx - r * 0.04, cy + r * 0.4);
      ctx.stroke();
      ctx.lineWidth = lw;
      // 절제된 4각 별 하나 (작게)
      const s = r * 0.13, sx = cx + r * 0.5, sy = cy - r * 0.34;
      ctx.fillStyle = ink(0.6);
      ctx.beginPath();
      ctx.moveTo(sx, sy - s);
      ctx.lineTo(sx + s * 0.22, sy - s * 0.22);
      ctx.lineTo(sx + s, sy);
      ctx.lineTo(sx + s * 0.22, sy + s * 0.22);
      ctx.lineTo(sx, sy + s);
      ctx.lineTo(sx - s * 0.22, sy + s * 0.22);
      ctx.lineTo(sx - s, sy);
      ctx.lineTo(sx - s * 0.22, sy - s * 0.22);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: "birds", label: "새 떼", cat: "sky", box: [0.95, 0.7],
    draw(ctx, cx, cy, r, ink) {
      ctx.strokeStyle = ink(0.75);
      ctx.lineCap = "round";
      const gull = (x: number, y: number, s: number) => {
        ctx.beginPath();
        ctx.moveTo(x - s, y);
        ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.8, x, y);
        ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.8, x + s, y);
        ctx.stroke();
      };
      gull(cx - r * 0.4, cy - r * 0.15, r * 0.34);
      gull(cx + r * 0.3, cy - r * 0.42, r * 0.27);
      gull(cx + r * 0.42, cy + r * 0.22, r * 0.2);
      gull(cx - r * 0.25, cy + r * 0.38, r * 0.16);
    },
  },

  // ── 바다 ─────────────────────────────────────────────
  {
    id: "whale", label: "고래", cat: "sea", box: [1.3, 1.0],
    draw(ctx, cx, cy, r, ink, paper) {
      const lw = ctx.lineWidth;
      // 고래 — 길쭉한 몸통 + 각진 꼬리 지느러미 + 각인선 (동판화 자연지 삽화 느낌)
      const p = new Path2D();
      p.moveTo(cx - r * 1.0, cy + r * 0.04);                                   // 주둥이 끝
      p.quadraticCurveTo(cx - r * 0.9, cy - r * 0.44, cx - r * 0.3, cy - r * 0.46);
      p.quadraticCurveTo(cx + r * 0.4, cy - r * 0.48, cx + r * 0.66, cy - r * 0.16); // 등
      p.lineTo(cx + r * 0.82, cy - r * 0.5);                                   // 꼬리자루→위 갈래
      p.lineTo(cx + r * 1.16, cy - r * 0.44);
      p.lineTo(cx + r * 0.94, cy - r * 0.06);                                  // 갈래 사이 파임
      p.lineTo(cx + r * 1.16, cy + r * 0.28);                                  // 아래 갈래
      p.lineTo(cx + r * 0.8, cy + r * 0.2);
      p.quadraticCurveTo(cx + r * 0.5, cy + r * 0.34, cx - r * 0.1, cy + r * 0.34);
      p.quadraticCurveTo(cx - r * 0.72, cy + r * 0.34, cx - r * 1.0, cy + r * 0.04);
      p.closePath();
      ctx.fillStyle = paper;
      ctx.fill(p);
      ctx.strokeStyle = ink(0.85);
      ctx.stroke(p);
      // 턱선 (입)
      ctx.strokeStyle = ink(0.55);
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.98, cy + r * 0.06);
      ctx.quadraticCurveTo(cx - r * 0.75, cy + r * 0.16, cx - r * 0.4, cy + r * 0.12);
      ctx.stroke();
      // 가슴지느러미
      ctx.strokeStyle = ink(0.85);
      ctx.lineWidth = lw;
      const fin = new Path2D();
      fin.moveTo(cx - r * 0.36, cy + r * 0.26);
      fin.quadraticCurveTo(cx - r * 0.22, cy + r * 0.5, cx + r * 0.02, cy + r * 0.42);
      fin.quadraticCurveTo(cx - r * 0.16, cy + r * 0.3, cx - r * 0.2, cy + r * 0.26);
      fin.closePath();
      ctx.fillStyle = paper;
      ctx.fill(fin); ctx.stroke(fin);
      // 몸통 각인선 2줄
      ctx.strokeStyle = ink(0.35);
      ctx.lineWidth = lw * 0.65;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.55, cy - r * 0.18);
      ctx.quadraticCurveTo(cx, cy - r * 0.28, cx + r * 0.5, cy - r * 0.1);
      ctx.moveTo(cx - r * 0.5, cy - r * 0.04);
      ctx.quadraticCurveTo(cx, cy - r * 0.14, cx + r * 0.48, cy + r * 0.02);
      ctx.stroke();
      ctx.lineWidth = lw;
      // 눈
      ctx.fillStyle = ink(0.9);
      ctx.beginPath();
      ctx.arc(cx - r * 0.68, cy - r * 0.08, Math.max(0.9, r * 0.04), 0, Math.PI * 2);
      ctx.fill();
      // 분수 (V자 두 갈래)
      ctx.strokeStyle = ink(0.6);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.5, cy - r * 0.46);
      ctx.quadraticCurveTo(cx - r * 0.6, cy - r * 0.8, cx - r * 0.78, cy - r * 0.92);
      ctx.moveTo(cx - r * 0.5, cy - r * 0.46);
      ctx.quadraticCurveTo(cx - r * 0.42, cy - r * 0.8, cx - r * 0.3, cy - r * 0.9);
      ctx.stroke();
    },
  },
  {
    id: "fish", label: "물고기 떼", cat: "sea", box: [1.0, 0.8],
    draw(ctx, cx, cy, r, ink, paper) {
      const lw = ctx.lineWidth;
      // 유선형 물고기 — 지느러미·아가미·비늘선 각인 (동판화 어류 삽화)
      const fish = (x: number, y: number, s: number) => {
        const p = new Path2D();
        p.moveTo(x - s, y);                                                 // 주둥이
        p.quadraticCurveTo(x - s * 0.2, y - s * 0.5, x + s * 0.5, y - s * 0.14);
        p.lineTo(x + s * 0.9, y - s * 0.44);                               // 위 꼬리
        p.quadraticCurveTo(x + s * 0.78, y, x + s * 0.9, y + s * 0.44);    // 아래 꼬리
        p.lineTo(x + s * 0.5, y + s * 0.14);
        p.quadraticCurveTo(x - s * 0.2, y + s * 0.5, x - s, y);
        p.closePath();
        ctx.fillStyle = paper;
        ctx.fill(p);
        ctx.strokeStyle = ink(0.82);
        ctx.lineWidth = lw;
        ctx.stroke(p);
        // 아가미선
        ctx.strokeStyle = ink(0.45);
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.moveTo(x - s * 0.5, y - s * 0.22);
        ctx.quadraticCurveTo(x - s * 0.36, y, x - s * 0.5, y + s * 0.22);
        // 등지느러미 결
        ctx.moveTo(x + s * 0.02, y - s * 0.24);
        ctx.lineTo(x + s * 0.16, y - s * 0.34);
        ctx.moveTo(x + s * 0.16, y - s * 0.18);
        ctx.lineTo(x + s * 0.3, y - s * 0.28);
        ctx.stroke();
        ctx.lineWidth = lw;
        // 눈
        ctx.fillStyle = ink(0.85);
        ctx.beginPath();
        ctx.arc(x - s * 0.62, y - s * 0.06, Math.max(0.8, s * 0.06), 0, Math.PI * 2);
        ctx.fill();
      };
      fish(cx - r * 0.32, cy - r * 0.32, r * 0.5);
      fish(cx + r * 0.3, cy + r * 0.06, r * 0.42);
      fish(cx - r * 0.26, cy + r * 0.44, r * 0.34);
    },
  },
  {
    id: "whirlpool", label: "소용돌이", cat: "sea", box: [0.95, 0.95],
    draw(ctx, cx, cy, r, ink) {
      ctx.strokeStyle = ink(0.7);
      ctx.lineCap = "round";
      ctx.beginPath();
      let first = true;
      for (let t = 0; t <= 4.6 * Math.PI; t += 0.15) {
        const rr = r * 0.05 + (r * 0.85 * t) / (4.6 * Math.PI);
        const x = cx + Math.cos(t + 0.8) * rr;
        const y = cy + Math.sin(t + 0.8) * rr * 0.82; // 살짝 눌린 타원
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // 튀는 물방울
      ctx.strokeStyle = ink(0.5);
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.75, cy - r * 0.55);
      ctx.quadraticCurveTo(cx + r * 0.9, cy - r * 0.7, cx + r * 1.0, cy - r * 0.62);
      ctx.moveTo(cx - r * 0.85, cy + r * 0.45);
      ctx.quadraticCurveTo(cx - r * 1.0, cy + r * 0.55, cx - r * 0.95, cy + r * 0.68);
      ctx.stroke();
    },
  },
  {
    id: "waves", label: "파도", cat: "sea", box: [1.05, 0.7],
    draw(ctx, cx, cy, r, ink) {
      ctx.strokeStyle = ink(0.6);
      ctx.lineCap = "round";
      for (let row = 0; row < 3; row++) {
        const y = cy + (row - 1) * r * 0.38;
        const off = row % 2 === 0 ? 0 : r * 0.3;
        for (let k = -1; k <= 1; k++) {
          const x = cx + k * r * 0.6 + off;
          ctx.beginPath();
          ctx.arc(x, y, r * 0.3, Math.PI, Math.PI * 1.9);
          ctx.stroke();
        }
      }
    },
  },

  // ── 땅 ───────────────────────────────────────────────
  {
    id: "dragon", label: "드래곤", cat: "land", box: [1.25, 1.0],
    draw(ctx, cx, cy, r, ink, paper) {
      // 비행 실루엣 — 머리(좌)·큰 박쥐 날개(우상)·화살촉 꼬리(우)가 뚜렷이 분리된 문장풍
      const p = new Path2D();
      p.moveTo(cx - r * 1.15, cy - r * 0.5);                                          // 윗턱 끝
      p.lineTo(cx - r * 0.9, cy - r * 0.4);                                           // 입 안쪽
      p.lineTo(cx - r * 1.06, cy - r * 0.26);                                         // 아랫턱 끝
      p.quadraticCurveTo(cx - r * 0.82, cy - r * 0.24, cx - r * 0.72, cy - r * 0.18); // 턱→목 앞
      p.quadraticCurveTo(cx - r * 0.56, cy - r * 0.06, cx - r * 0.48, cy + r * 0.08); // 가슴
      p.lineTo(cx - r * 0.38, cy + r * 0.28);                                         // 앞다리
      p.lineTo(cx - r * 0.28, cy + r * 0.12);
      p.quadraticCurveTo(cx - r * 0.05, cy + r * 0.3, cx + r * 0.16, cy + r * 0.24);  // 배
      p.lineTo(cx + r * 0.24, cy + r * 0.46);                                         // 뒷다리
      p.lineTo(cx + r * 0.34, cy + r * 0.24);
      p.quadraticCurveTo(cx + r * 0.68, cy + r * 0.22, cx + r * 0.92, cy + r * 0.4);  // 꼬리 아랫면
      p.lineTo(cx + r * 0.94, cy + r * 0.56);                                         // 화살촉
      p.lineTo(cx + r * 1.18, cy + r * 0.42);
      p.lineTo(cx + r * 0.99, cy + r * 0.3);
      p.quadraticCurveTo(cx + r * 0.72, cy + r * 0.06, cx + r * 0.44, cy + r * 0.02); // 꼬리 윗면
      p.lineTo(cx + r * 0.38, cy - r * 0.06);                                         // 날개 뿌리(뒤)
      p.quadraticCurveTo(cx + r * 0.62, cy - r * 0.42, cx + r * 0.56, cy - r * 0.9);  // 날개 뒷변→날개 끝
      p.quadraticCurveTo(cx + r * 0.28, cy - r * 0.58, cx + r * 0.12, cy - r * 0.74); // 막 스캘럽1
      p.quadraticCurveTo(cx - r * 0.06, cy - r * 0.44, cx - r * 0.22, cy - r * 0.52); // 막 스캘럽2
      p.quadraticCurveTo(cx - r * 0.36, cy - r * 0.3, cx - r * 0.46, cy - r * 0.24);  // 날개 앞변→어깨
      p.quadraticCurveTo(cx - r * 0.62, cy - r * 0.34, cx - r * 0.7, cy - r * 0.52);  // 목 뒤
      p.lineTo(cx - r * 0.58, cy - r * 0.72);                                         // 뿔
      p.lineTo(cx - r * 0.78, cy - r * 0.58);                                         // 두개골 뒤
      p.quadraticCurveTo(cx - r * 0.98, cy - r * 0.58, cx - r * 1.15, cy - r * 0.5);  // 이마→윗턱
      p.closePath();
      ctx.fillStyle = ink(0.85);
      ctx.fill(p);
      // 눈 (종이색 점)
      ctx.fillStyle = paper;
      ctx.beginPath();
      ctx.arc(cx - r * 0.88, cy - r * 0.48, Math.max(0.9, r * 0.04), 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: "tent", label: "야영지", cat: "land", box: [1.0, 1.0],
    draw(ctx, cx, cy, r, ink, paper) {
      // 천막
      const p = new Path2D();
      p.moveTo(cx - r * 0.78, cy + r * 0.55);
      p.lineTo(cx, cy - r * 0.62);
      p.lineTo(cx + r * 0.78, cy + r * 0.55);
      p.closePath();
      ctx.fillStyle = paper;
      ctx.fill(p);
      ctx.strokeStyle = ink(0.85);
      ctx.stroke(p);
      // 입구 플랩
      const door = new Path2D();
      door.moveTo(cx - r * 0.2, cy + r * 0.55);
      door.lineTo(cx, cy + r * 0.02);
      door.lineTo(cx + r * 0.2, cy + r * 0.55);
      ctx.fillStyle = ink(0.22);
      ctx.fill(door);
      ctx.stroke(door);
      // 깃대 + 페넌트
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.62);
      ctx.lineTo(cx, cy - r * 0.92);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.92);
      ctx.lineTo(cx + r * 0.3, cy - r * 0.84);
      ctx.lineTo(cx, cy - r * 0.76);
      ctx.closePath();
      ctx.fillStyle = ink(0.7);
      ctx.fill();
      // 지면선
      ctx.strokeStyle = ink(0.5);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.95, cy + r * 0.56);
      ctx.quadraticCurveTo(cx, cy + r * 0.62, cx + r * 0.95, cy + r * 0.56);
      ctx.stroke();
    },
  },
  {
    id: "ruins", label: "고대 유적", cat: "land", box: [1.0, 1.0],
    draw(ctx, cx, cy, r, ink, paper) {
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      // 온전한 기둥 (왼쪽)
      const col = new Path2D();
      col.rect(cx - r * 0.62, cy - r * 0.55, r * 0.28, r * 1.1);
      ctx.fill(col); ctx.stroke(col);
      const cap = new Path2D();
      cap.rect(cx - r * 0.7, cy - r * 0.68, r * 0.44, r * 0.14);
      ctx.fill(cap); ctx.stroke(cap);
      // 부러진 기둥 (오른쪽) — 윗면 들쭉날쭉
      const br = new Path2D();
      br.moveTo(cx + r * 0.12, cy + r * 0.55);
      br.lineTo(cx + r * 0.12, cy - r * 0.1);
      br.lineTo(cx + r * 0.22, cy - r * 0.24);
      br.lineTo(cx + r * 0.3, cy - r * 0.06);
      br.lineTo(cx + r * 0.4, cy - r * 0.18);
      br.lineTo(cx + r * 0.4, cy + r * 0.55);
      br.closePath();
      ctx.fill(br); ctx.stroke(br);
      // 기둥 홈(플루트)
      ctx.strokeStyle = ink(0.3);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.53, cy - r * 0.5); ctx.lineTo(cx - r * 0.53, cy + r * 0.5);
      ctx.moveTo(cx - r * 0.44, cy - r * 0.5); ctx.lineTo(cx - r * 0.44, cy + r * 0.5);
      ctx.moveTo(cx + r * 0.21, cy - r * 0.1); ctx.lineTo(cx + r * 0.21, cy + r * 0.48);
      ctx.moveTo(cx + r * 0.31, cy - r * 0.04); ctx.lineTo(cx + r * 0.31, cy + r * 0.48);
      ctx.stroke();
      // 쓰러진 석재 + 잔해
      ctx.strokeStyle = ink(0.8);
      ctx.save();
      ctx.translate(cx + r * 0.68, cy + r * 0.44);
      ctx.rotate(0.35);
      const drum = new Path2D();
      drum.rect(-r * 0.2, -r * 0.09, r * 0.4, r * 0.18);
      ctx.fillStyle = paper;
      ctx.fill(drum); ctx.stroke(drum);
      ctx.restore();
      ctx.fillStyle = ink(0.5);
      for (const [dx, dy, s] of [[-0.15, 0.5, 0.04], [0.0, 0.53, 0.03], [0.52, 0.55, 0.035]] as const) {
        ctx.beginPath();
        ctx.arc(cx + r * dx, cy + r * dy, r * s, 0, Math.PI * 2);
        ctx.fill();
      }
      // 지면선
      ctx.strokeStyle = ink(0.5);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.9, cy + r * 0.56);
      ctx.lineTo(cx + r * 0.9, cy + r * 0.56);
      ctx.stroke();
    },
  },
  {
    id: "tower", label: "탑", cat: "land", box: [0.85, 1.1],
    draw(ctx, cx, cy, r, ink, paper) {
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      // 몸통 (살짝 테이퍼)
      const body = new Path2D();
      body.moveTo(cx - r * 0.34, cy + r * 0.6);
      body.lineTo(cx - r * 0.26, cy - r * 0.42);
      body.lineTo(cx + r * 0.26, cy - r * 0.42);
      body.lineTo(cx + r * 0.34, cy + r * 0.6);
      body.closePath();
      ctx.fill(body); ctx.stroke(body);
      // 총안 (crenellation)
      const cren = new Path2D();
      cren.moveTo(cx - r * 0.34, cy - r * 0.42);
      cren.lineTo(cx - r * 0.34, cy - r * 0.6);
      cren.lineTo(cx - r * 0.18, cy - r * 0.6);
      cren.lineTo(cx - r * 0.18, cy - r * 0.48);
      cren.lineTo(cx - r * 0.06, cy - r * 0.48);
      cren.lineTo(cx - r * 0.06, cy - r * 0.6);
      cren.lineTo(cx + r * 0.08, cy - r * 0.6);
      cren.lineTo(cx + r * 0.08, cy - r * 0.48);
      cren.lineTo(cx + r * 0.2, cy - r * 0.48);
      cren.lineTo(cx + r * 0.2, cy - r * 0.6);
      cren.lineTo(cx + r * 0.34, cy - r * 0.6);
      cren.lineTo(cx + r * 0.34, cy - r * 0.42);
      cren.closePath();
      ctx.fill(cren); ctx.stroke(cren);
      // 창·문
      ctx.fillStyle = ink(0.75);
      ctx.beginPath();
      ctx.rect(cx - r * 0.035, cy - r * 0.18, r * 0.07, r * 0.2);
      ctx.fill();
      const door = new Path2D();
      door.moveTo(cx - r * 0.11, cy + r * 0.6);
      door.lineTo(cx - r * 0.11, cy + r * 0.34);
      door.arc(cx, cy + r * 0.34, r * 0.11, Math.PI, 0);
      door.lineTo(cx + r * 0.11, cy + r * 0.6);
      ctx.fill(door);
      // 석재 틈 몇 개
      ctx.strokeStyle = ink(0.3);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.2, cy + r * 0.1); ctx.lineTo(cx - r * 0.02, cy + r * 0.1);
      ctx.moveTo(cx + r * 0.04, cy - r * 0.02); ctx.lineTo(cx + r * 0.2, cy - r * 0.02);
      ctx.moveTo(cx - r * 0.16, cy + r * 0.32); ctx.lineTo(cx + r * 0.02, cy + r * 0.32);
      ctx.stroke();
      // 깃발
      ctx.strokeStyle = ink(0.85);
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.27, cy - r * 0.6);
      ctx.lineTo(cx + r * 0.27, cy - r * 0.88);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.27, cy - r * 0.88);
      ctx.lineTo(cx + r * 0.55, cy - r * 0.8);
      ctx.lineTo(cx + r * 0.27, cy - r * 0.72);
      ctx.closePath();
      ctx.fillStyle = ink(0.7);
      ctx.fill();
    },
  },

  // ── 지도 꾸밈 ────────────────────────────────────────
  // (리본 배너는 텍스트를 쓸 수 있는 '리본 문구' 텍스트 요소로 승격되어 제거됨)
];

// ── 확장 세트 ──────────────────────────────────────────
STICKERS.push(
  {
    id: "wind", label: "바람", cat: "sky", box: [1.15, 0.8],
    draw(ctx, cx, cy, r, ink) {
      // 얼굴 없는 돌풍 문양 — 나선 근원에서 뻗어나가 끝이 말리는 바람 줄기 (절제된 기상 기호)
      ctx.strokeStyle = ink(0.75);
      ctx.lineCap = "round";
      const lw = ctx.lineWidth;
      // 근원 나선 (왼쪽)
      const sx = cx - r * 0.7, sy = cy - r * 0.05;
      ctx.beginPath();
      let first = true;
      for (let t = 0; t <= 3.2 * Math.PI; t += 0.25) {
        const rr = r * 0.24 * (1 - t / (3.6 * Math.PI));
        const x = sx + Math.cos(t + Math.PI) * rr, y = sy + Math.sin(t + Math.PI) * rr;
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // 바람 줄기 3가닥 — 오른쪽으로 뻗다가 끝이 말림 (굵기 차등)
      const gust = (y0: number, len: number, curlR: number, wide: number) => {
        ctx.lineWidth = wide;
        ctx.beginPath();
        ctx.moveTo(sx + r * 0.2, sy + y0);
        ctx.quadraticCurveTo(cx + r * 0.1, sy + y0 - r * 0.14, cx + r * len, sy + y0 - r * 0.06);
        ctx.arc(cx + r * (len - 0.02), sy + y0 + curlR - r * 0.06, curlR, -Math.PI * 0.5, Math.PI * 0.9);
        ctx.stroke();
      };
      gust(-r * 0.22, 0.82, r * 0.1, lw);
      gust(r * 0.02, 1.02, r * 0.12, lw * 1.15);
      gust(r * 0.26, 0.72, r * 0.09, lw * 0.85);
      ctx.lineWidth = lw;
    },
  },
  {
    id: "storm", label: "폭풍 구름", cat: "sky", box: [1.0, 1.0],
    draw(ctx, cx, cy, r, ink, paper) {
      // 구름
      const p = new Path2D();
      const oy = cy - r * 0.35;
      p.moveTo(cx - r * 0.72, oy + r * 0.16);
      p.quadraticCurveTo(cx - r * 0.92, oy - r * 0.12, cx - r * 0.5, oy - r * 0.2);
      p.quadraticCurveTo(cx - r * 0.36, oy - r * 0.52, cx - r * 0.02, oy - r * 0.4);
      p.quadraticCurveTo(cx + r * 0.26, oy - r * 0.58, cx + r * 0.48, oy - r * 0.26);
      p.quadraticCurveTo(cx + r * 0.85, oy - r * 0.24, cx + r * 0.78, oy + r * 0.06);
      p.quadraticCurveTo(cx + r * 0.85, oy + r * 0.26, cx + r * 0.5, oy + r * 0.26);
      p.lineTo(cx - r * 0.55, oy + r * 0.26);
      p.quadraticCurveTo(cx - r * 0.8, oy + r * 0.3, cx - r * 0.72, oy + r * 0.16);
      p.closePath();
      ctx.fillStyle = paper;
      ctx.fill(p);
      ctx.strokeStyle = ink(0.85);
      ctx.stroke(p);
      // 번개
      const bolt = new Path2D();
      bolt.moveTo(cx - r * 0.05, cy - r * 0.02);
      bolt.lineTo(cx - r * 0.24, cy + r * 0.34);
      bolt.lineTo(cx - r * 0.08, cy + r * 0.3);
      bolt.lineTo(cx - r * 0.26, cy + r * 0.72);
      bolt.lineTo(cx + r * 0.14, cy + r * 0.22);
      bolt.lineTo(cx - r * 0.02, cy + r * 0.26);
      bolt.lineTo(cx + r * 0.12, cy - r * 0.02);
      bolt.closePath();
      ctx.fillStyle = ink(0.85);
      ctx.fill(bolt);
      // 빗줄기
      ctx.strokeStyle = ink(0.45);
      ctx.beginPath();
      for (const [ox2, oy2] of [[0.32, 0.1], [0.48, 0.2], [0.38, 0.42]] as const) {
        ctx.moveTo(cx + r * ox2, cy + r * oy2);
        ctx.lineTo(cx + r * (ox2 - 0.08), cy + r * (oy2 + 0.2));
      }
      ctx.stroke();
    },
  },
  {
    id: "lighthouse", label: "등대", cat: "sea", box: [1.05, 1.1],
    draw(ctx, cx, cy, r, ink, paper) {
      // 불빛
      ctx.fillStyle = ink(0.18);
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + dir * r * 0.18, cy - r * 0.72);
        ctx.lineTo(cx + dir * r * 1.02, cy - r * 0.95);
        ctx.lineTo(cx + dir * r * 1.02, cy - r * 0.55);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      // 몸통 (테이퍼)
      const body = new Path2D();
      body.moveTo(cx - r * 0.3, cy + r * 0.5);
      body.lineTo(cx - r * 0.16, cy - r * 0.55);
      body.lineTo(cx + r * 0.16, cy - r * 0.55);
      body.lineTo(cx + r * 0.3, cy + r * 0.5);
      body.closePath();
      ctx.fill(body); ctx.stroke(body);
      // 줄무늬 2개
      ctx.fillStyle = ink(0.35);
      const stripe = (t0: number, t1: number) => {
        const lx = (t: number) => cx - r * (0.3 - 0.14 * t);
        const rx = (t: number) => cx + r * (0.3 - 0.14 * t);
        const yy = (t: number) => cy + r * (0.5 - 1.05 * t);
        const sp = new Path2D();
        sp.moveTo(lx(t0), yy(t0));
        sp.lineTo(rx(t0), yy(t0));
        sp.lineTo(rx(t1), yy(t1));
        sp.lineTo(lx(t1), yy(t1));
        sp.closePath();
        ctx.fill(sp);
      };
      stripe(0.18, 0.36);
      stripe(0.55, 0.73);
      // 등롱 + 지붕
      ctx.fillStyle = paper;
      const lantern = new Path2D();
      lantern.rect(cx - r * 0.18, cy - r * 0.78, r * 0.36, r * 0.23);
      ctx.fill(lantern); ctx.stroke(lantern);
      ctx.fillStyle = ink(0.8);
      ctx.beginPath();
      ctx.rect(cx - r * 0.09, cy - r * 0.74, r * 0.18, r * 0.15);
      ctx.fill();
      const roof = new Path2D();
      roof.moveTo(cx - r * 0.22, cy - r * 0.78);
      roof.lineTo(cx, cy - r * 0.98);
      roof.lineTo(cx + r * 0.22, cy - r * 0.78);
      roof.closePath();
      ctx.fillStyle = paper;
      ctx.fill(roof); ctx.stroke(roof);
      // 바위 + 물결
      ctx.fillStyle = paper;
      const rock = new Path2D();
      rock.moveTo(cx - r * 0.6, cy + r * 0.72);
      rock.quadraticCurveTo(cx - r * 0.45, cy + r * 0.42, cx - r * 0.1, cy + r * 0.52);
      rock.quadraticCurveTo(cx + r * 0.25, cy + r * 0.4, cx + r * 0.58, cy + r * 0.7);
      rock.closePath();
      ctx.fill(rock); ctx.stroke(rock);
      ctx.strokeStyle = ink(0.45);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.95, cy + r * 0.8);
      ctx.quadraticCurveTo(cx - r * 0.7, cy + r * 0.68, cx - r * 0.5, cy + r * 0.8);
      ctx.moveTo(cx + r * 0.45, cy + r * 0.82);
      ctx.quadraticCurveTo(cx + r * 0.7, cy + r * 0.7, cx + r * 0.95, cy + r * 0.82);
      ctx.stroke();
    },
  },
  {
    id: "kraken", label: "크라켄", cat: "sea", box: [1.1, 0.95],
    draw(ctx, cx, cy, r, ink, paper) {
      const wl = cy + r * 0.52; // 수면선
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      // 촉수: 중심선을 따라 강하게 테이퍼 + 끝이 갈고리처럼 안으로 말림
      const tentacle = (bx: number, h: number, dir: number, w0: number) => {
        const tipY = wl - r * h;
        const p = new Path2D();
        p.moveTo(bx - r * w0, wl);
        // 바깥면: 완만히 상승
        p.quadraticCurveTo(bx - r * (w0 + 0.06 * dir), wl - r * h * 0.55, bx - r * 0.02 * dir, tipY + r * 0.3);
        // 갈고리 바깥
        p.quadraticCurveTo(bx + r * 0.02 * dir, tipY + r * 0.02, bx + r * 0.24 * dir, tipY + r * 0.02);
        p.quadraticCurveTo(bx + r * 0.34 * dir, tipY + r * 0.04, bx + r * 0.33 * dir, tipY + r * 0.14); // 뾰족 끝
        // 갈고리 안쪽 (파임)
        p.quadraticCurveTo(bx + r * 0.24 * dir, tipY + r * 0.12, bx + r * 0.18 * dir, tipY + r * 0.2);
        p.quadraticCurveTo(bx + r * 0.12 * dir, tipY + r * 0.4, bx + r * w0 * 0.7, wl - r * h * 0.4);
        // 안쪽면: 하강
        p.quadraticCurveTo(bx + r * w0, wl - r * h * 0.2, bx + r * w0, wl);
        p.closePath();
        ctx.fill(p);
        ctx.stroke(p);
      };
      tentacle(cx - r * 0.62, 0.78, -1, 0.15);  // 왼쪽 (왼쪽으로 말림)
      tentacle(cx + r * 0.02, 1.28, 1, 0.19);   // 중앙 큰 것
      tentacle(cx + r * 0.66, 0.62, 1, 0.13);   // 오른쪽
      // 빨판 (안쪽면 따라)
      ctx.fillStyle = ink(0.55);
      for (const [sx2, sy2, s] of [
        [-0.5, 0.18, 0.035], [-0.53, 0.0, 0.03],
        [0.16, -0.1, 0.042], [0.14, -0.34, 0.036], [0.1, -0.56, 0.03],
        [0.76, 0.24, 0.03], [0.74, 0.1, 0.026],
      ] as const) {
        ctx.beginPath();
        ctx.arc(cx + r * sx2, cy + r * sy2, r * s, 0, Math.PI * 2);
        ctx.fill();
      }
      // 수면 파문 + 물보라
      ctx.strokeStyle = ink(0.45);
      ctx.beginPath();
      for (const [ox2, len] of [[-1.0, 0.42], [-0.32, 0.5], [0.4, 0.48]] as const) {
        ctx.moveTo(cx + r * ox2, wl + r * 0.06);
        ctx.quadraticCurveTo(cx + r * (ox2 + len / 2), wl + r * 0.16, cx + r * (ox2 + len), wl + r * 0.06);
      }
      ctx.stroke();
    },
  },
  {
    id: "castle", label: "성", cat: "land", box: [1.05, 1.0],
    draw(ctx, cx, cy, r, ink, paper) {
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      // 성벽
      const wall = new Path2D();
      wall.moveTo(cx - r * 0.55, cy + r * 0.55);
      wall.lineTo(cx - r * 0.55, cy - r * 0.05);
      // 총안
      let wx = -0.55;
      const step = 0.22;
      let up = true;
      while (wx < 0.55 - 0.01) {
        const nx = Math.min(0.55, wx + step * 0.5);
        wall.lineTo(cx + r * nx, cy - r * (up ? 0.2 : 0.05));
        wall.lineTo(cx + r * nx, cy - r * (up ? 0.05 : 0.2));
        wx = nx;
        up = !up;
      }
      wall.lineTo(cx + r * 0.55, cy + r * 0.55);
      wall.closePath();
      ctx.fill(wall); ctx.stroke(wall);
      // 좌우 탑
      for (const dir of [-1, 1]) {
        const tx = cx + dir * r * 0.68;
        const tower = new Path2D();
        tower.rect(tx - r * 0.17, cy - r * 0.5, r * 0.34, r * 1.05);
        ctx.fill(tower); ctx.stroke(tower);
        // 뾰족 지붕
        const roof = new Path2D();
        roof.moveTo(tx - r * 0.22, cy - r * 0.5);
        roof.lineTo(tx, cy - r * 0.88);
        roof.lineTo(tx + r * 0.22, cy - r * 0.5);
        roof.closePath();
        ctx.fill(roof); ctx.stroke(roof);
        // 창
        ctx.fillStyle = ink(0.7);
        ctx.beginPath();
        ctx.rect(tx - r * 0.03, cy - r * 0.28, r * 0.06, r * 0.16);
        ctx.fill();
        ctx.fillStyle = paper;
        // 깃발
        ctx.beginPath();
        ctx.moveTo(tx, cy - r * 0.88);
        ctx.lineTo(tx, cy - r * 1.05);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tx, cy - r * 1.05);
        ctx.lineTo(tx + dir * r * 0.2, cy - r * 0.99);
        ctx.lineTo(tx, cy - r * 0.93);
        ctx.closePath();
        ctx.fillStyle = ink(0.7);
        ctx.fill();
        ctx.fillStyle = paper;
      }
      // 성문
      const gate = new Path2D();
      gate.moveTo(cx - r * 0.14, cy + r * 0.55);
      gate.lineTo(cx - r * 0.14, cy + r * 0.22);
      gate.arc(cx, cy + r * 0.22, r * 0.14, Math.PI, 0);
      gate.lineTo(cx + r * 0.14, cy + r * 0.55);
      ctx.fillStyle = ink(0.72);
      ctx.fill(gate);
      // 지면선
      ctx.strokeStyle = ink(0.5);
      ctx.beginPath();
      ctx.moveTo(cx - r * 1.0, cy + r * 0.56);
      ctx.lineTo(cx + r * 1.0, cy + r * 0.56);
      ctx.stroke();
    },
  },
  {
    id: "bridge", label: "다리", cat: "land", box: [1.05, 0.7],
    draw(ctx, cx, cy, r, ink, paper) {
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      // 아치 2개가 뚫린 석교 몸체
      const body = new Path2D();
      body.moveTo(cx - r * 0.95, cy - r * 0.08);
      body.lineTo(cx + r * 0.95, cy - r * 0.08);
      body.lineTo(cx + r * 0.95, cy + r * 0.32);
      body.lineTo(cx + r * 0.6, cy + r * 0.32);
      body.arc(cx + r * 0.34, cy + r * 0.32, r * 0.26, 0, Math.PI, true);
      body.lineTo(cx - r * 0.08, cy + r * 0.32);
      body.arc(cx - r * 0.34, cy + r * 0.32, r * 0.26, 0, Math.PI, true);
      body.lineTo(cx - r * 0.95, cy + r * 0.32);
      body.closePath();
      ctx.fill(body); ctx.stroke(body);
      // 난간
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.95, cy - r * 0.2);
      ctx.lineTo(cx + r * 0.95, cy - r * 0.2);
      ctx.stroke();
      ctx.strokeStyle = ink(0.4);
      ctx.beginPath();
      for (let k = -4; k <= 4; k++) {
        ctx.moveTo(cx + k * r * 0.21, cy - r * 0.2);
        ctx.lineTo(cx + k * r * 0.21, cy - r * 0.08);
      }
      // 석재 틈
      ctx.moveTo(cx - r * 0.75, cy + r * 0.05); ctx.lineTo(cx - r * 0.55, cy + r * 0.05);
      ctx.moveTo(cx + r * 0.5, cy + r * 0.08); ctx.lineTo(cx + r * 0.7, cy + r * 0.08);
      ctx.stroke();
      // 아치 아래 물결
      ctx.strokeStyle = ink(0.45);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.5, cy + r * 0.42);
      ctx.quadraticCurveTo(cx - r * 0.34, cy + r * 0.34, cx - r * 0.18, cy + r * 0.42);
      ctx.moveTo(cx + r * 0.18, cy + r * 0.42);
      ctx.quadraticCurveTo(cx + r * 0.34, cy + r * 0.34, cx + r * 0.5, cy + r * 0.42);
      ctx.stroke();
    },
  },
  {
    id: "windmill", label: "풍차", cat: "land", box: [1.0, 1.1],
    draw(ctx, cx, cy, r, ink, paper) {
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      const hubY = cy - r * 0.3;
      // 몸통
      const body = new Path2D();
      body.moveTo(cx - r * 0.3, cy + r * 0.6);
      body.lineTo(cx - r * 0.16, hubY + r * 0.1);
      body.lineTo(cx + r * 0.16, hubY + r * 0.1);
      body.lineTo(cx + r * 0.3, cy + r * 0.6);
      body.closePath();
      ctx.fill(body); ctx.stroke(body);
      // 지붕 돔
      const roof = new Path2D();
      roof.moveTo(cx - r * 0.2, hubY + r * 0.1);
      roof.quadraticCurveTo(cx, hubY - r * 0.18, cx + r * 0.2, hubY + r * 0.1);
      roof.closePath();
      ctx.fill(roof); ctx.stroke(roof);
      // 날개 4개 (X자, 격자 무늬)
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + (k * Math.PI) / 2;
        const dx = Math.cos(a), dy = Math.sin(a);
        const px2 = -dy, py2 = dx;
        const L = r * 0.62, Wd = r * 0.12;
        const blade = new Path2D();
        blade.moveTo(cx + dx * r * 0.08, hubY + dy * r * 0.08);
        blade.lineTo(cx + dx * L + px2 * Wd, hubY + dy * L + py2 * Wd);
        blade.lineTo(cx + dx * L - px2 * Wd, hubY + dy * L - py2 * Wd);
        blade.closePath();
        ctx.fill(blade); ctx.stroke(blade);
        // 격자선
        ctx.strokeStyle = ink(0.4);
        ctx.beginPath();
        for (const t of [0.35, 0.6, 0.85]) {
          ctx.moveTo(cx + dx * L * t + px2 * Wd * 0.9, hubY + dy * L * t + py2 * Wd * 0.9);
          ctx.lineTo(cx + dx * L * t - px2 * Wd * 0.9, hubY + dy * L * t - py2 * Wd * 0.9);
        }
        ctx.stroke();
        ctx.strokeStyle = ink(0.85);
      }
      // 축
      ctx.fillStyle = ink(0.85);
      ctx.beginPath();
      ctx.arc(cx, hubY, r * 0.055, 0, Math.PI * 2);
      ctx.fill();
      // 문 + 지면
      ctx.beginPath();
      ctx.rect(cx - r * 0.07, cy + r * 0.38, r * 0.14, r * 0.22);
      ctx.fill();
      ctx.strokeStyle = ink(0.5);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.7, cy + r * 0.61);
      ctx.lineTo(cx + r * 0.7, cy + r * 0.61);
      ctx.stroke();
    },
  },
  {
    id: "inkblot", label: "잉크 얼룩", cat: "map", box: [1.0, 0.9],
    draw(ctx, cx, cy, r, ink) {
      ctx.fillStyle = ink(0.82);
      // 본체: 각진 폴리곤이 아니라 중점 보간 곡선으로 매끈한 유기 블롭
      const n = 12;
      const bp: [number, number][] = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const wob = Math.sin(a * 2 + 0.7) * 0.11 + Math.sin(a * 5 + 2.1) * 0.07;
        const rr = r * (0.42 + wob);
        bp.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.85]);
      }
      const mid = (i: number): [number, number] => {
        const a = bp[i % n], b = bp[(i + 1) % n];
        return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      };
      const blob = new Path2D();
      blob.moveTo(mid(0)[0], mid(0)[1]);
      for (let k = 1; k <= n; k++) blob.quadraticCurveTo(bp[k % n][0], bp[k % n][1], mid(k)[0], mid(k)[1]);
      blob.closePath();
      ctx.fill(blob);
      // 방향성 스파이크 (튄 잉크): 블롭 가장자리에서 뾰족하게
      for (const [a0, len, wd] of [[-0.5, 0.55, 0.09], [2.4, 0.45, 0.08], [1.1, 0.38, 0.06]] as const) {
        const bx = cx + Math.cos(a0) * r * 0.42, by = cy + Math.sin(a0) * r * 0.38;
        const tx = cx + Math.cos(a0) * r * (0.42 + len), ty = cy + Math.sin(a0) * r * (0.38 + len) * 0.85;
        const px2 = -Math.sin(a0) * r * wd, py2 = Math.cos(a0) * r * wd;
        ctx.beginPath();
        ctx.moveTo(bx - px2, by - py2);
        ctx.quadraticCurveTo((bx + tx) / 2, (by + ty) / 2, tx, ty);
        ctx.quadraticCurveTo((bx + tx) / 2, (by + ty) / 2, bx + px2, by + py2);
        ctx.closePath();
        ctx.fill();
      }
      // 스프레이: 스파이크 방향으로 점점 작아지는 방울
      for (const [dx, dy, s] of [
        [0.72, -0.5, 0.055], [0.88, -0.62, 0.035], [1.0, -0.7, 0.02],
        [-0.72, 0.5, 0.045], [-0.88, 0.58, 0.026],
        [0.28, 0.66, 0.03], [0.4, 0.78, 0.018],
      ] as const) {
        ctx.beginPath();
        ctx.arc(cx + r * dx, cy + r * dy, r * s, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  {
    id: "scroll", label: "두루마리", cat: "map", box: [1.2, 0.65],
    draw(ctx, cx, cy, r, ink, paper) {
      const lw = ctx.lineWidth;
      ctx.strokeStyle = ink(0.85);
      ctx.fillStyle = paper;
      // 본지: 양끝이 롤러 뒤로 들어가고, 위아래가 살짝 처지는 낱장
      const sheet = new Path2D();
      sheet.moveTo(cx - r * 0.78, cy - r * 0.3);
      sheet.quadraticCurveTo(cx, cy - r * 0.38, cx + r * 0.78, cy - r * 0.3);
      sheet.lineTo(cx + r * 0.78, cy + r * 0.28);
      sheet.quadraticCurveTo(cx, cy + r * 0.36, cx - r * 0.78, cy + r * 0.28);
      sheet.closePath();
      ctx.fill(sheet); ctx.stroke(sheet);
      // 롤러 밑 말림 음영 (종이가 감기는 부분의 세로 해칭)
      ctx.strokeStyle = ink(0.3);
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      for (const dir of [-1, 1]) {
        for (const t of [0.56, 0.63, 0.7]) {
          ctx.moveTo(cx + dir * r * t, cy - r * 0.26);
          ctx.quadraticCurveTo(cx + dir * r * (t + 0.02), cy, cx + dir * r * t, cy + r * 0.24);
        }
      }
      ctx.stroke();
      ctx.lineWidth = lw;
      // 글줄
      ctx.strokeStyle = ink(0.4);
      ctx.lineWidth = lw * 0.75;
      ctx.beginPath();
      for (const t of [-0.15, -0.02, 0.11]) {
        ctx.moveTo(cx - r * 0.42, cy + r * t);
        ctx.lineTo(cx + r * 0.42, cy + r * (t + 0.015));
      }
      ctx.stroke();
      ctx.lineWidth = lw;
      // 롤러: 본지보다 위아래로 튀어나온 세로 원통 (스타디움 형태) + 단면 나선
      for (const dir of [-1, 1]) {
        const ex = cx + dir * r * 0.88;
        const rw = r * 0.15, rh = r * 0.46;
        const roll = new Path2D();
        roll.moveTo(ex - rw, cy - rh + rw);
        roll.arc(ex, cy - rh + rw, rw, Math.PI, 0);
        roll.lineTo(ex + rw, cy + rh - rw);
        roll.arc(ex, cy + rh - rw, rw, 0, Math.PI);
        roll.closePath();
        ctx.fillStyle = paper;
        ctx.fill(roll);
        ctx.strokeStyle = ink(0.85);
        ctx.stroke(roll);
        // 원통 하이라이트 선
        ctx.strokeStyle = ink(0.3);
        ctx.lineWidth = lw * 0.7;
        ctx.beginPath();
        ctx.moveTo(ex - rw * 0.35, cy - rh + rw * 0.8);
        ctx.lineTo(ex - rw * 0.35, cy + rh - rw * 0.8);
        ctx.stroke();
        ctx.lineWidth = lw;
        // 위쪽 단면의 말린 나선
        ctx.strokeStyle = ink(0.6);
        ctx.beginPath();
        let first = true;
        for (let t = 0; t <= 2.2 * Math.PI; t += 0.3) {
          const rr = rw * 0.75 * (1 - t / (2.6 * Math.PI));
          const x = ex + Math.cos(t + 1.2) * rr, y = cy - rh + rw + Math.sin(t + 1.2) * rr * 0.5;
          if (first) { ctx.beginPath(); ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },
  },
  {
    id: "flourish", label: "모서리 장식", cat: "map", box: [1.1, 1.1],
    draw(ctx, cx, cy, r, ink) {
      // 좌상단 모서리용 — 이중 L 프레임 + 캘리그래피 테이퍼 컬 (펜 눌림이 살아있는 굵기 변화)
      const lw = ctx.lineWidth;
      ctx.strokeStyle = ink(0.75);
      ctx.beginPath();
      ctx.moveTo(cx + r * 1.02, cy - r * 0.92);
      ctx.lineTo(cx - r * 0.74, cy - r * 0.92);
      ctx.quadraticCurveTo(cx - r * 0.92, cy - r * 0.92, cx - r * 0.92, cy - r * 0.74);
      ctx.lineTo(cx - r * 0.92, cy + r * 1.02);
      ctx.stroke();
      ctx.strokeStyle = ink(0.4);
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx + r * 1.02, cy - r * 0.78);
      ctx.lineTo(cx - r * 0.6, cy - r * 0.78);
      ctx.quadraticCurveTo(cx - r * 0.78, cy - r * 0.78, cx - r * 0.78, cy - r * 0.6);
      ctx.lineTo(cx - r * 0.78, cy + r * 1.02);
      ctx.stroke();
      ctx.lineWidth = lw;
      // 중심 컬: 안으로 감기는 나선 (굵기 r*0.09 → 0 테이퍼)
      ctx.fillStyle = ink(0.85);
      const curl = spiralPts(cx - r * 0.34, cy - r * 0.34, r * 0.32, 1.9, Math.PI * 0.72, 1);
      ctx.fill(ribbonPath(curl, (t) => r * 0.09 * (1 - t * 0.92)));
      // 두 갈래 S-줄기: 각 변을 따라 뻗다 끝이 살짝 들림
      const armH = sampleQuad(
        [cx - r * 0.18, cy - r * 0.5], [cx + r * 0.3, cy - r * 0.72], [cx + r * 0.78, cy - r * 0.58],
      );
      ctx.fill(ribbonPath(armH, (t) => r * 0.07 * (1 - t * 0.9)));
      const armV = sampleQuad(
        [cx - r * 0.5, cy - r * 0.18], [cx - r * 0.72, cy + r * 0.3], [cx - r * 0.58, cy + r * 0.78],
      );
      ctx.fill(ribbonPath(armV, (t) => r * 0.07 * (1 - t * 0.9)));
      // 줄기 끝 작은 컬 + 점
      const tipH = spiralPts(cx + r * 0.84, cy - r * 0.64, r * 0.12, 1.4, Math.PI * 1.1, -1);
      ctx.fill(ribbonPath(tipH, (t) => r * 0.045 * (1 - t * 0.9)));
      const tipV = spiralPts(cx - r * 0.64, cy + r * 0.84, r * 0.12, 1.4, Math.PI * 0.4, 1);
      ctx.fill(ribbonPath(tipV, (t) => r * 0.045 * (1 - t * 0.9)));
      // 잎사귀 (채운 물방울) — 줄기 옆에 쌍으로
      ctx.fillStyle = ink(0.6);
      for (const [ang, lx, ly] of [
        [-0.35, 0.22, -0.72], [0.25, 0.5, -0.52],
        [1.92, -0.72, 0.22], [1.32, -0.52, 0.5],
      ] as const) {
        ctx.save();
        ctx.translate(cx + r * lx, cy + r * ly);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(r * 0.13, -r * 0.09, r * 0.26, 0);
        ctx.quadraticCurveTo(r * 0.13, r * 0.06, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // 점 터미널
      ctx.fillStyle = ink(0.7);
      for (const [dx, dy] of [[0.95, -0.68], [-0.68, 0.95]] as const) {
        ctx.beginPath();
        ctx.arc(cx + r * dx, cy + r * dy, r * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
);

const BY_ID = new Map(STICKERS.map((s) => [s.id, s]));

export function getSticker(id: string): StickerDef | undefined {
  return BY_ID.get(id);
}
