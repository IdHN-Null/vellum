# Vellum — Architecture and How It Works

This document explains the plugin's overall structure, each module's responsibilities, and the path a user's action takes on its way to the screen (and to PNG).

---

## 1. The big picture — how Obsidian runs this plugin

An Obsidian plugin is **a JavaScript module that runs inside the Obsidian app**. The source is many `.ts` files, but the build bundles them into a single `main.js`. Obsidian looks at only three files in the vault's `.obsidian/plugins/vellum/` folder.

| File | Role |
|---|---|
| `manifest.json` | Plugin name, ID and version |
| `main.js` | All the TypeScript bundled into executable code (the Web Worker source is inlined as a string too) |
| `styles.css` | UI styles + fonts embedded as base64 (`FMS Serif` = Cinzel, `FMS Hand` = Gaegu) |

`onload()` in `main.ts` only **registers** the view type, the `.fmap` extension, commands and the ribbon icon; the actual screen begins when a user opens an `.fmap` file and the map view is created.

---

## 2. File map — responsibilities by module

```
src/
├─ main.ts        ← plugin entry point; the "contract" with Obsidian (view, commands, sample pack)
├─ view.ts        ← the heart: canvas view + tools/interaction + render orchestration + right panel UI
├─ types.ts       ← data model (.fmap JSON schema) + RLE serialisation + legacy migration
├─ noise.ts       ← seeded noise (mulberry32 · Noise2D · fbm)
├─ terrain.ts     ← noise → heightmap (erosion) → hydrology (rivers, lakes) → biome classification
├─ worker.ts      ← runs generateBase + composeTerrain in a Web Worker (async generation)
├─ contours.ts    ← heightmap → vector contours (marching squares + simplification + Chaikin)
├─ render2d.ts    ← pixel layers (watercolour wash, coastal concentric rings) + glyph stamps (trees, hills, mountains)
├─ rough.ts       ← hand-drawn line utilities (seeded jitter · roughLine/roughRing/sketchToPath)
├─ ink.ts         ← ink texture (variable-width brush ribbons · multi-pass bleed · brush arrows)
├─ decor.ts       ← decorations (compass, title cartouche, labels, notes, ship, monster, grid, frame, vignette)
├─ icons.ts       ← 18 vector marker badges (shared SVG paths)
├─ annotations.ts ← freehand annotation strokes + hit testing
├─ fonts.ts       ← bundled font-family constants + load guarantee
├─ modals.ts      ← marker/region/text editing modals
└─ sample.ts      ← onboarding sample-pack generation
```

Separation principle: `terrain.ts` produces **data only**, and `render2d.ts`/`view.ts` turn that data into **pixels only**. The 3D view was removed from the core in v0.10 and will be split into a separate add-on plugin.

---

## 3. Data model — the .fmap file (types.ts)

`.fmap` is a JSON text file. The key design points:

- **Store the recipe**: not the terrain itself but the generation parameters (`gen`: seed, sea level, continent count, erosion strength…) → files stay tiny, and the same file always reproduces the same terrain.
- **Store deltas**: brush edits are stored as `editsB64` (Int8 elevation deltas), biome paint as `paintB64` (Uint8 overrides). RLE compression (`"R:"` prefix) with a dense fallback keeps size proportional to how much was actually edited.
- **Normalised coordinates (0–1)**: markers, regions, annotations and placed elements are stored as "36% of the map's width" → always correct regardless of resolution or zoom.
- **Migration**: `parseMapData()` promotes legacy files (fixed compass/title, dense encoding, emoji icons) to the current schema.

---

## 4. Terrain pipeline (terrain.ts + worker.ts)

```
gen parameters
  → generateBase()   blob placement (continents, islands) + domain warping + mountains (spine ∪ ridged noise)
                     + droplet hydraulic erosion       ← expensive, so the result is cached (brushes unaffected)
  → composeTerrain() apply edit deltas → hydrology (priority-flood lakes, flow-accumulation rivers) → biome classification
```

- **Mountain spine**: each continent blob is guaranteed one ridge segment running through its interior — so a "continent without mountains" cannot happen (v0.11). Extra ranges come from ridged noise × a low-frequency gate.
- **Plains first**: continent interiors stay flat via a plateau falloff (good for placing cities and kingdoms). Absolute-scale clamping — no min-max normalisation (peaks would distort the plains' relative elevation).
- **Async**: the view runs generation on a separate thread via `worker.ts` (esbuild bundles it as an IIFE → inlined as `__WORKER_CODE__` → Blob URL Worker), with a synchronous fallback on failure.

---

## 5. Render pipeline (render2d.ts + view.ts)

Layered structure, bottom to top:

1. **base layer** (cell-resolution pixels): the watercolour wash — bilinear biome-colour blending, water-depth gradient, bright coastal band, **coastal concentric rings** (`oceanExtraShade`), water-surface grain, land vegetation wash (`landWash`), hillshading, paper mottling.
2. **stamps layer** (supersampled ×ss): glyphs — trees with shadows and canopy shading, hill mound arcs, mountains with lit/shaded faces and hatching, coastal waves.
3. **vector ink lines** (`drawVectorLines`, screen resolution): bathymetry, contours (bleed undercoat + main stroke), coastline (double pass + hatching), rivers (water-colour wash + thin ink line).
4. **Rhumb lines, map effects, coordinate grid** (decor).
5. **Regions → annotations → markers → placed elements** (topmost; order controlled via `reorderById`).
6. **Paper-grain overlay** (`paperGrainTile`, screen-resolution repeat — texture independent of zoom).

Key performance machinery (view.ts):

- **Progressive tile render**: 192-cell tiles, nearest the viewport centre first, ~10ms per rAF frame — large maps never freeze (cancelled via `renderToken`).
- **3× detail cache** (`renderDetail`): once terrain settles, the whole map is re-rendered at 3px per cell (bilinear height + Gaussian biome + stamps & vector lines baked in). Pan/zoom just crops this cache — no flicker. **Must stay pixel-identical to the base render rules** (concentric rings, wash, etc.).
- **Dirty-rect brushes**: mid-stroke only the brushed area is recomputed (~a few ms); on release, `scheduleFinalize()` regenerates everything including hydrology and contours.
- **fastRender toggle**: bypasses the cache and LOD, upscaling the base only (for low-end machines).

**PNG export** uses the detail cache when valid — the same quality as the editor view (WYSIWYG).

---

## 6. Verification

- `npm test` — pure-logic unit tests (RLE round trips, migration, contours, terrain-distribution guards: mountains exist, plains dominate, lakes = water).
- `node test/server.mjs` → http://localhost:8137 — the visual harness (composite render, per-style, LOD comparison, worker equality `__workerOK`, tile equality `__tileMatch`).

When changing render pixel rules, **update render2d.paintBaseRect and view.renderDetail together** (visual consistency between the cell render and the LOD render).
