import { b64ToBytes, bytesToB64 } from "../src/types";

// atob/btoa polyfill (Node)
const g = globalThis as Record<string, unknown>;
if (!g.atob) {
  g.atob = (s: string) => Buffer.from(s, "base64").toString("binary");
  g.btoa = (s: string) => Buffer.from(s, "binary").toString("base64");
}

function check(name: string, data: Int8Array): void {
  const enc = bytesToB64(data);
  const dec = b64ToBytes(enc, data.length);
  let ok = true;
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== dec[i]) { ok = false; console.log(`  MISMATCH at ${i}: ${data[i]} != ${dec[i]}`); break; }
  }
  console.log(`${name}: len=${data.length} enc=${enc.length}B (${(enc.length / data.length * 100).toFixed(1)}%) ${ok ? "OK" : "FAIL"}`);
  if (!ok) process.exit(1);
}

const N = 512 * 384;

// 1) 전부 0 (편집 없음 — 실제론 필드 삭제되지만 인코딩도 검증)
check("all-zero", new Int8Array(N));

// 2) 희소 편집 (붓질 몇 번)
const sparse = new Int8Array(N);
for (let i = 5000; i < 5600; i++) sparse[i] = 42;
for (let i = 90000; i < 90900; i++) sparse[i] = -77;
check("sparse", sparse);

// 3) 음수 포함 랜덤 노이즈 (RLE 비효율 → dense 폴백 검증)
const noise = new Int8Array(N);
for (let i = 0; i < N; i++) noise[i] = ((i * 2654435761) % 255) - 127;
check("noise (dense fallback)", noise);

// 4) 구버전 dense 형식 읽기 호환
const legacyData = new Int8Array([1, -1, 127, -127, 0, 55]);
const u8 = new Uint8Array(legacyData.buffer);
let bin = "";
for (const b of u8) bin += String.fromCharCode(b);
const legacyB64 = (g.btoa as (s: string) => string)(bin);
const dec = b64ToBytes(legacyB64, 6);
const legacyOk = Array.from(dec).join() === Array.from(legacyData).join();
console.log(`legacy dense read: ${legacyOk ? "OK" : "FAIL"}`);
if (!legacyOk) process.exit(1);
console.log("ALL PASS");
