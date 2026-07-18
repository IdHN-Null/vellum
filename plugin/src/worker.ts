/**
 * Terrain generation worker — runs generateBase (erosion) + composeTerrain (hydrology)
 * in the background. No DOM dependencies (typed arrays + Math only). Result buffers
 * are sent back via transfer.
 */
import { MapData } from "./types";
import { composeTerrain, generateBase } from "./terrain";

interface Req {
  id: number;
  map: Pick<MapData, "width" | "height" | "gen">;
  edits: ArrayBuffer | null;
  paint: ArrayBuffer | null;
  base: ArrayBuffer | null; // cached base heightmap (skips generateBase when present)
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
