import { defaultMapData } from "../src/types";
import { generateTerrain } from "../src/terrain";
import { extractContours } from "../src/contours";

const map = defaultMapData("t", 151186);
console.log("terrain...");
const t0 = Date.now();
const t = generateTerrain(map, null);
console.log("terrain done", Date.now() - t0, "ms");

console.log("contours...");
const t1 = Date.now();
const cs = extractContours(t.height, t.w, t.h, t.seaLevel, map.gen.precision);
console.log("contours done", Date.now() - t1, "ms");

let rings = 0, pts = 0;
for (const lv of cs.levels) {
  let lp = 0;
  for (const r of lv.rings) { pts += r.length; lp += r.length; }
  rings += lv.rings.length;
  console.log(`  level z=${lv.z.toFixed(2)}: ${lv.rings.length} rings, ${lp} pts`);
}
console.log({ levels: cs.levels.length, rings, pts });
