/** 지도 데이터 모델 — .fmap 파일에 JSON으로 저장된다. */
import { mulberry32 } from "./noise";

export const PLUGIN_VERSION = "0.21.0";

export type StyleId = "parchment" | "color" | "ink";

/** 질감 커스터마이즈 (슬라이더) */
export interface TextureOpts {
  grain: number;      // 0..1.2 화면 종이결 오버레이 강도
  relief: number;     // 0..2 지형 명암(워시) 대비
  mottle: number;     // 0..2 종이 얼룩
  markerScale: number; // 0.5..3 전체 아이콘 크기 배율
}

export function defaultTexture(): TextureOpts {
  return { grain: 0.5, relief: 1, mottle: 1, markerScale: 1 };
}

/** 지도 전체 효과 토글 (나침반·제목은 v0.3부터 자유 배치 요소로 이동) */
export interface DecorOpts {
  compass: boolean;   // (구버전 마이그레이션용)
  frame: boolean;     // 테두리 액자
  title: boolean;     // (구버전 마이그레이션용)
  waves: boolean;     // 해안 파도 무늬
  vignette: boolean;  // 가장자리 비네트
}

export function defaultDecor(): DecorOpts {
  return { compass: true, frame: true, title: true, waves: true, vignette: true };
}

/** 자유 배치 지도 요소: 드래그 이동·크기 조절·삭제 가능 */
export type OrnamentType = "compass" | "title" | "label" | "note" | "banner" | "ship" | "monster" | "sticker";

export interface Ornament {
  id: string;
  type: OrnamentType;
  x: number;      // 0..1 정규화 중심 좌표
  y: number;
  sizeF: number;  // min(W,H) 대비 크기 비율
  text?: string;  // title/label/note 내용 (\n 줄바꿈)
  name?: string;  // 레이어 목록 식별용 사용자 지정 이름 (렌더에는 영향 없음)
  sticker?: string;   // type="sticker": 내장 스티커 id, 또는 "custom"
  imagePath?: string; // sticker="custom": 볼트 이미지 경로 (사용자 제작 스티커)
}

export function defaultOrnaments(name: string): Ornament[] {
  return [
    { id: newId(), type: "compass", x: 0.89, y: 0.14, sizeF: 0.062 },
    { id: newId(), type: "title", x: 0.5, y: 0.075, sizeF: 0.052, text: name },
  ];
}

export interface GenParams {
  seed: number;
  seaLevel: number;      // 0..1 해수면 높이
  continents: number;    // 1..5 대륙 분포(스케일) — 형태 거칠기에 영향
  continentCount: number; // 대륙(큰 땅덩이) 개수 (0=순수 노이즈 방식)
  islandCount: number;    // 섬(작은 땅) 개수
  landAmount: number;     // 0..2 대륙 크기 배율
  roughness: number;     // 0..2 거칠기
  climate: number;       // 0..1 기후 분포(습윤 편향)
  detail: number;        // 0..2 디테일
  precision: number;     // 0..2 벡터 등고선 정밀도 (레벨 수·단순화 강도)
  erosion: number;       // 0..2 수리 침식 강도 (물방울 시뮬레이션)
  riverDensity: number;  // 0..2 강 밀도 (유량 임계값)
  polarNorth: number;    // 0..0.5 북극 설원 비율
  polarSouth: number;    // 0..0.5 남극 설원 비율
  rivers: boolean;
  snow: boolean;
  desert: boolean;
  forest: boolean;
}

export interface Marker {
  id: string;
  x: number;             // 0..1 정규화 좌표
  y: number;
  name: string;
  icon: string;          // 아이콘 id
  color: string;
  size?: number;         // 크기 배율 (기본 1)
  notePath?: string;     // 연결된 노트 경로
}

export interface Region {
  id: string;
  name: string;
  color: string;
  points: [number, number][]; // 0..1 정규화 폴리곤
  notePath?: string;
}

/** 자유 그리기 주석: 경로·화살표·자유곡선 (보물지도 표시용) */
export type AnnotationKind = "free" | "arrow" | "line";

export interface Annotation {
  id: string;
  kind: AnnotationKind;
  points: [number, number][]; // 0..1 정규화
  color: string;
  width: number;   // scale=1 기준 px
  dashed: boolean;
}

export interface MapData {
  version: 1;
  name: string;
  width: number;         // 하이트맵 해상도
  height: number;
  mode: "generated" | "image";
  baseImagePath?: string;
  gen: GenParams;
  editsB64?: string;     // Int8 지형 편집 델타 (base64)
  paintB64?: string;     // Uint8 바이옴 페인트 오버라이드 (base64, 0=없음)
  style: StyleId;
  showContours: boolean; // 2D 등고선 오버레이 표시
  showGrid: boolean;     // 좌표 격자 테두리 (A·B·C / 1·2·3)
  showRhumbLines: boolean; // 나침반 방사형 항해선 표시
  fastRender: boolean;     // 빠른 렌더 (품질 저하, 속도 위주)
  styleColors?: Record<string, string>; // 바이옴별 색 오버라이드 (hex)
  coastWidth: number;    // 해안 띠 폭 (셀, 0=끔)
  coastColor?: string;   // 해안 띠 색 (없으면 자동)
  coastHatching: boolean; // 동판화풍 해안 헤칭 (물 쪽 등距離 잔선)
  landHatching: boolean;  // 육지 헤칭 (해안 안쪽으로 새겨지는 잔선)
  decor: DecorOpts;      // 전체 효과 토글 (액자·파도·비네트)
  texture: TextureOpts;  // 질감 슬라이더 (종이결·명암·얼룩·아이콘 크기)
  ornaments: Ornament[]; // 자유 배치 요소 (나침반·제목·라벨·메모)
  markers: Marker[];
  regions: Region[];
  annotations: Annotation[]; // 자유 그리기 (경로·화살표·자유곡선)
}

export function defaultGenParams(seed: number): GenParams {
  return {
    seed,
    seaLevel: 0.5,
    continents: 2,
    continentCount: 3,
    islandCount: 8,
    landAmount: 1.0,
    roughness: 1.0,
    climate: 0.55,
    detail: 1.0,
    precision: 1.0,
    erosion: 1.0,
    riverDensity: 1.0,
    polarNorth: 0.1,
    polarSouth: 0.1,
    rivers: true,
    snow: true,
    desert: true,
    forest: true,
  };
}

/**
 * 시드에서 파생되는 완전 랜덤 생성 파라미터.
 * 고급 설정을 건드리지 않는 사용자는 새 지도마다 다른 세계를 얻는다 (시드만 있으면 재현 가능).
 */
export function randomizeGenParams(seed: number): GenParams {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const range = (lo: number, hi: number) => lo + rng() * (hi - lo);
  const p = defaultGenParams(seed);
  p.seaLevel = range(0.44, 0.58);
  p.continentCount = 1 + Math.floor(rng() * 5);      // 1~5
  p.islandCount = Math.floor(rng() * 16);            // 0~15
  p.landAmount = range(0.75, 1.35);
  p.roughness = range(0.7, 1.3);
  p.climate = range(0.38, 0.68);
  p.detail = range(0.8, 1.2);
  p.erosion = range(0.6, 1.4);
  p.riverDensity = range(0.6, 1.2);
  p.polarNorth = rng() < 0.25 ? 0 : range(0.04, 0.18);
  p.polarSouth = rng() < 0.25 ? 0 : range(0.04, 0.18);
  return p;
}

export function defaultMapData(name: string, seed?: number): MapData {
  return {
    version: 1,
    name,
    width: 512,
    height: 384,
    mode: "generated",
    gen: defaultGenParams(seed ?? Math.floor(Math.random() * 1000000)),
    style: "parchment",
    annotations: [],
    showContours: true,
    showGrid: false,
    showRhumbLines: true,
    fastRender: false,
    coastWidth: 3,
    coastHatching: true,
    landHatching: true,
    decor: defaultDecor(),
    texture: defaultTexture(),
    ornaments: defaultOrnaments(name),
    markers: [],
    regions: [],
  };
}

export function parseMapData(raw: string): MapData {
  const d = JSON.parse(raw) as Partial<MapData>;
  const base = defaultMapData(d.name ?? "지도");

  // v0.2 이하 마이그레이션: 고정 장식(나침반·제목)을 배치 요소로 승격
  let ornaments: Ornament[];
  if (Array.isArray(d.ornaments)) {
    ornaments = d.ornaments;
  } else {
    ornaments = [];
    const oldDecor = d.decor ?? defaultDecor();
    if (oldDecor.compass !== false) {
      ornaments.push({ id: newId(), type: "compass", x: 0.89, y: 0.14, sizeF: 0.062 });
    }
    if (oldDecor.title !== false) {
      ornaments.push({ id: newId(), type: "title", x: 0.5, y: 0.075, sizeF: 0.052, text: d.name ?? "지도" });
    }
  }

  return {
    ...base,
    ...d,
    version: 1,
    gen: { ...base.gen, ...(d.gen ?? {}) },
    decor: { ...base.decor, ...(d.decor ?? {}) },
    texture: { ...base.texture, ...(d.texture ?? {}) },
    showRhumbLines: d.showRhumbLines !== false,
    fastRender: d.fastRender === true,
    coastHatching: d.coastHatching !== false,
    landHatching: d.landHatching !== false,
    ornaments,
    markers: Array.isArray(d.markers) ? d.markers : [],
    regions: Array.isArray(d.regions) ? d.regions : [],
    annotations: Array.isArray(d.annotations) ? d.annotations : [],
  } as MapData;
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Uint8Array → base64 */
function u8ToB64(u8: Uint8Array): string {
  let s = "";
  const chunk = 8192;
  for (let i = 0; i < u8.length; i += chunk) {
    s += String.fromCharCode.apply(null, Array.from(u8.subarray(i, i + chunk)));
  }
  return btoa(s);
}

function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** RLE 인코딩: [런 길이(1..255), 값] 쌍의 나열. 델타가 희소할수록 작아진다. */
function rleEncode(u8: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < u8.length) {
    const v = u8[i];
    let run = 1;
    while (i + run < u8.length && u8[i + run] === v && run < 255) run++;
    out.push(run, v);
    i += run;
  }
  return new Uint8Array(out);
}

function rleDecode(data: Uint8Array, expectedLen: number): Uint8Array {
  const out = new Uint8Array(expectedLen);
  let o = 0;
  for (let i = 0; i + 1 < data.length && o < expectedLen; i += 2) {
    const run = data[i], v = data[i + 1];
    out.fill(v, o, Math.min(expectedLen, o + run));
    o += run;
  }
  return out;
}

/**
 * Int8 격자 직렬화. "R:" 접두사 = RLE 압축.
 * 파일 크기가 캔버스 넓이가 아니라 실제 편집량에 비례하게 한다.
 */
export function bytesToB64(bytes: Int8Array): string {
  const u8 = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rle = rleEncode(u8);
  // RLE가 오히려 커지는 극단적 케이스(노이즈성 데이터)는 원본 저장
  if (rle.length < u8.length) return "R:" + u8ToB64(rle);
  return u8ToB64(u8);
}

export function b64ToBytes(b64: string, expectedLen: number): Int8Array {
  try {
    let u8: Uint8Array;
    if (b64.startsWith("R:")) {
      u8 = rleDecode(b64ToU8(b64.slice(2)), expectedLen);
    } else {
      u8 = b64ToU8(b64); // 구버전 dense 형식
    }
    const out = new Int8Array(expectedLen);
    const n = Math.min(u8.length, expectedLen);
    for (let i = 0; i < n; i++) {
      let v = u8[i];
      if (v > 127) v -= 256;
      out[i] = v;
    }
    return out;
  } catch {
    return new Int8Array(expectedLen);
  }
}
