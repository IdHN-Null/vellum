/**
 * 지형 생성 워커 — generateBase(침식) + composeTerrain(수문)을 백그라운드에서 실행.
 * DOM 의존 없음(typed array + Math). 결과 버퍼는 transfer로 돌려보낸다.
 */
import { MapData } from "./types";
import { composeTerrain, generateBase } from "./terrain";

interface Req {
  id: number;
  map: Pick<MapData, "width" | "height" | "gen">;
  edits: ArrayBuffer | null;
  paint: ArrayBuffer | null;
  base: ArrayBuffer | null; // 캐시된 베이스(있으면 generateBase 생략)
}

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<Req>) => void) | null;
  postMessage: (msg: unknown, transfer?: Transferable[]) => void;
};

ctx.onmessage = (e) => {
  const { id, map, edits, paint, base: cachedBase } = e.data;
  const editsArr = edits ? new Int8Array(edits) : null;
  const paintArr = paint ? new Uint8Array(paint) : null;
  const base = cachedBase ? new Float32Array(cachedBase) : generateBase(map as MapData);
  const terrain = composeTerrain(map as MapData, base, editsArr, paintArr);
  const transfer: Transferable[] = [
    base.buffer, terrain.height.buffer, terrain.biome.buffer,
    terrain.river.buffer, terrain.lake.buffer,
  ];
  ctx.postMessage({ id, base, terrain }, transfer);
};
