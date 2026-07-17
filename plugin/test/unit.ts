/**
 * 순수 로직 단위 테스트 (DOM 불필요 — node로 실행).
 *   npm test
 * 실패 시 exit 1. 캔버스 렌더링 검증은 test/server.mjs 시각 하네스 참조.
 */
import { defaultMapData, parseMapData, bytesToB64, b64ToBytes } from "../src/types";
import { B, composeTerrain, generateBase } from "../src/terrain";
import { extractContours, simplifyLine, chaikin } from "../src/contours";

let failed = 0;
function check(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failed++;
    console.error(`FAIL  ${name}${detail ? " — " + detail : ""}`);
  }
}

// ── RLE 직렬화 왕복 ─────────────────────────────────────
{
  // 희소 델타 (전형적 편집 패턴)
  const sparse = new Int8Array(4096);
  sparse[100] = 12; sparse[101] = 12; sparse[102] = -8; sparse[4000] = 127;
  const enc = bytesToB64(sparse);
  const dec = b64ToBytes(enc, sparse.length);
  check("RLE 희소 왕복", dec.every((v, i) => v === sparse[i]));
  check("RLE 압축 접두사", enc.startsWith("R:"));
  check("RLE 크기 축소", enc.length < 4096 / 2, `len=${enc.length}`);

  // 노이즈성 데이터 (RLE가 커지는 케이스 → dense 폴백)
  const noisy = new Int8Array(512);
  for (let i = 0; i < noisy.length; i++) noisy[i] = ((i * 37 + 11) % 251) - 125;
  const encN = bytesToB64(noisy);
  const decN = b64ToBytes(encN, noisy.length);
  check("dense 폴백 왕복", decN.every((v, i) => v === noisy[i]));

  // 구버전(dense, 접두사 없음) 호환
  const legacy = btoa(String.fromCharCode(5, 250, 0, 0)); // 5, -6, 0, 0
  const decL = b64ToBytes(legacy, 4);
  check("레거시 dense 디코드", decL[0] === 5 && decL[1] === -6 && decL[2] === 0);

  // 깨진 입력 → 0 배열 (예외 없이)
  const bad = b64ToBytes("!!!not-base64!!!", 16);
  check("손상 입력 안전 폴백", bad.length === 16 && bad.every((v) => v === 0));
}

// ── parseMapData 마이그레이션·기본값 ─────────────────────
{
  // v0.2 이하: ornaments 없음 → decor.compass/title이 배치 요소로 승격
  const old = JSON.stringify({
    version: 1, name: "옛지도", width: 256, height: 192, mode: "generated",
    gen: { seed: 7 }, style: "parchment",
    decor: { compass: true, frame: true, title: true, waves: true, vignette: true },
    markers: [], regions: [],
  });
  const m = parseMapData(old);
  check("구버전 나침반 승격", m.ornaments.some((o) => o.type === "compass"));
  check("구버전 제목 승격", m.ornaments.some((o) => o.type === "title" && o.text === "옛지도"));
  check("gen 기본값 병합", m.gen.seed === 7 && typeof m.gen.continentCount === "number");
  check("annotations 기본 배열", Array.isArray(m.annotations));
  check("texture 기본값", m.texture.markerScale === 1);
  check("showRhumbLines 기본 on", m.showRhumbLines === true);
  check("fastRender 기본 off", m.fastRender === false);
  check("coastHatching 기본 on (구버전 파일 포함)", m.coastHatching === true);
  check("landHatching 기본 on (구버전 파일 포함)", m.landHatching === true);

  // 잘못된 필드 타입 방어
  const weird = parseMapData(JSON.stringify({ name: "x", markers: "oops", regions: null }));
  check("markers 타입 방어", Array.isArray(weird.markers) && weird.markers.length === 0);
}

// ── 등고선 추출 ─────────────────────────────────────────
{
  // 중앙 봉우리 하나 있는 합성 지형
  const w = 64, h = 64;
  const hm = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - 32, y - 32) / 30;
      hm[y * w + x] = Math.max(0, 1 - d);
    }
  }
  const cs = extractContours(hm, w, h, 0.3, 1);
  check("등고선 레벨 존재", cs.levels.length > 2, `levels=${cs.levels.length}`);
  const coast = cs.levels.find((l) => Math.abs(l.z - 0.3) < 1e-9);
  check("해안 레벨 포함", !!coast && coast.rings.length > 0);
  if (coast) {
    const ring = coast.rings[0];
    check("링 좌표 유효", ring.every(([x, y]) => x >= -1 && x <= w && y >= -1 && y <= h));
  }
  // 라인 유틸
  const line: [number, number][] = [[0, 0], [1, 0.01], [2, 0], [3, 0.01], [10, 0]];
  check("simplifyLine 축소", simplifyLine(line, 0.5).length <= line.length);
  check("chaikin 증가", chaikin(line, 1, false).length > line.length);
}

// ── 지형 생성: 대륙 등뼈 산맥 보장·평야 균형 ─────────────
{
  for (const seed of [151186, 4242, 777, 90210]) {
    const m = defaultMapData("t", seed);
    m.width = 256; m.height = 192; // 테스트 속도용 축소
    const t = composeTerrain(m, generateBase(m), null, null);
    let land = 0, mtn = 0, plains = 0, water = 0;
    for (let i = 0; i < t.biome.length; i++) {
      const b = t.biome[i];
      if (b === B.DEEP || b === B.OCEAN) { water++; continue; }
      land++;
      if (b === B.MOUNTAIN) mtn++;
      else if (b !== B.HILL && b !== B.SNOW) plains++;
    }
    const mtnPct = (mtn / Math.max(1, land)) * 100;
    const plainsPct = (plains / Math.max(1, land)) * 100;
    check(`seed ${seed}: 산맥 존재 (등뼈 보장)`, mtnPct > 0.5, `mtn=${mtnPct.toFixed(1)}%`);
    check(`seed ${seed}: 평야 우세 (도시·왕국 적합)`, plainsPct > 55, `plains=${plainsPct.toFixed(1)}%`);
    check(`seed ${seed}: 물·육지 공존`, water > 0 && land > 0);
    check(`seed ${seed}: 강 생성`, t.rivers.length > 0, `rivers=${t.rivers.length}`);
    // 호수 셀은 항상 물 바이옴 (v0.10.1 호수 사라짐 버그 회귀 가드)
    let lakeOK = true;
    for (let i = 0; i < t.lake.length; i++) {
      if (t.lake[i] && t.biome[i] !== B.OCEAN && t.biome[i] !== B.DEEP) { lakeOK = false; break; }
    }
    check(`seed ${seed}: 호수=물 바이옴`, lakeOK);

    // 강 연결 (v0.15 합류 스냅 / v0.16 하구 깔때기 회귀 가드)
    let mouthOK = false, joinValid = true, joinCount = 0, flareOK = true;
    for (const rv of t.rivers) {
      const [ex, ey] = rv.pts[rv.pts.length - 1];
      const endIdx = ey * t.w + ex;
      const endWater = t.biome[endIdx] === B.DEEP || t.biome[endIdx] === B.OCEAN || t.lake[endIdx] === 1;
      if (endWater) {
        mouthOK = true;
        // 하구 깔때기: 끝 폭이 본류 폭보다 넓게 벌어져야 한다
        if (rv.widths[rv.widths.length - 1] <= rv.widths[Math.max(0, rv.widths.length - 4)]) flareOK = false;
      }
      if (rv.joins !== undefined) {
        joinCount++;
        const parent = t.rivers[rv.joins];
        // 합류 인덱스가 유효하고, 합류점이 본류 경로 위의 셀이어야 한다
        if (!parent || !parent.pts.some(([px, py]) => px === ex && py === ey)) joinValid = false;
      }
    }
    check(`seed ${seed}: 하구가 물에 닿음`, mouthOK);
    check(`seed ${seed}: 하구 깔때기 폭 증가`, flareOK);
    check(`seed ${seed}: 합류 인덱스 유효 (${joinCount}개)`, joinValid);
  }
}

if (failed > 0) {
  console.error(`\n${failed}개 실패`);
  process.exit(1);
}
console.log("\n모든 테스트 통과");
