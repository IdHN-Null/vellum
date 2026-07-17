import { defaultMapData } from "../src/types";
import { generateTerrain } from "../src/terrain";

for (const seed of [151186, 1, 42, 777777, 202607]) {
  const map = defaultMapData("t", seed);
  const t0 = Date.now();
  const t = generateTerrain(map, null);
  let land = 0, river = 0;
  for (let i = 0; i < t.height.length; i++) {
    if (t.height[i] >= map.gen.seaLevel) land++;
    if (t.river[i]) river++;
  }
  console.log({
    seed,
    ms: Date.now() - t0,
    landPct: Math.round((land / t.height.length) * 100),
    riverCells: river,
  });
}
