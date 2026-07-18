# Design Decision Record (Design Rationale)

Where `ARCHITECTURE.md` covers *what* works and *how*, this document covers **why it was built that way**. Each decision records the alternatives considered, the grounds for the choice, and the trade-offs accepted.

---

## 0. Summary — the one sentence running through this project

> **"Terrain is computed, never stored; coordinates are normalised; the screen is drawn with pure canvas only."**

Almost every decision derives from these three principles. Let's unpack them one by one.

---

## 1. Technology stack — what we used, and what we didn't

### What we used

| Technology | Reason |
|---|---|
| **TypeScript** | The Obsidian API itself ships TS types. With this many data structures (terrain, markers…), compile-time checking pays off handsomely |
| **Canvas 2D API** | A map is ultimately a lump of pixels. One canvas is overwhelmingly faster than thousands of DOM elements |
| **esbuild** | The standard of Obsidian's official plugin template. Bundles in milliseconds |
| **Obsidian API only** | Reuse what the app provides as much as possible: `TextFileView`, `Modal`, `Menu`, `FuzzySuggestModal`, … |

### What we deliberately did **not** use — this part matters more

**① No three.js / WebGL**

If you want 3D, three.js is the easiest road. We chose pure Canvas 2D software rendering anyway, because:

- **Bundle size.** three.js is hundreds of KB at minimum. Our whole plugin is a 64KB `main.js`; a single library several times the size of the product contradicts the "lightweight 3D" requirement head-on.
- **The nature of the requirement.** What users wanted was "3D *as light as feasible* for differentiation", not a real-time game engine. Tilting a heightmap on a 100×100 grid takes a rotation matrix + perspective divide + painter's algorithm — thirty lines of secondary-school maths.
- **Dependency risk.** External libraries drag in version conflicts, security audits and Obsidian-update compatibility issues. Zero dependencies makes that risk vanish wholesale.

**The cost:** we gave up advanced shading, shadows and anti-aliasing. A denser grid would be slow, so it was fixed at 100×100. But for "checking the terrain's relief in 3D", it's plenty.

**② No canvas rendering library (PixiJS etc.) either**

Same reasons. We draw one background image + a few dozen markers + a handful of polygons; a library's scene graph and batching aren't needed. Calling `ctx.drawImage` + `ctx.fillText` directly is simpler and faster.

**③ No state-management library (React etc.) either**

Obsidian views are already an imperative DOM model. The state is one `this.map` object; when it changes, call `draw()` again. Layering React on top just inserts an unnecessary tier between the canvas and a virtual DOM.

---

## 2. Why store a "recipe" instead of the terrain

This is the most important architectural decision.

**Alternative A — store the generated image.** Build the terrain, save a PNG in the vault.
**Alternative B (chosen) — store only the seed and parameters, regenerating on every open.**

Why B:

- **File size.** A 512×384 terrain PNG is hundreds of KB to several MB. `{seed: 151186, seaLevel: 0.52, ...}` is a few hundred bytes. A hundred maps in a vault are heavy as images, feather-light as recipes.
- **Version control & sync.** Because `.fmap` is text (JSON), Git diffs are human-readable and Obsidian Sync handles it efficiently. Binary images can't be diffed and re-upload wholesale every time.
- **Editability.** Move a slider and the terrain changes immediately. With an image, "regenerate" would mean starting over. With recipes, editing *is* parameter adjustment.
- **Exploiting determinism.** The seeded `mulberry32` RNG is deterministic, so the same recipe produces **pixel-identical terrain** on any machine at any time. That is what lets regeneration substitute for storage.

**The cost:** terrain must be computed on every open (50–90ms). Given how often a human actually opens a file, that's negligible — and in exchange we get everything above.

**The compromise — brush edits alone are stored.** Hand-painted terrain edits can't be reduced to a recipe (they're the user's intent, not randomness). So only these are stored, as `editsB64` — not raw pixels but **deltas against the base terrain** compressed into an `Int8Array`. With no edits, the field disappears entirely and the file stays clean.

---

## 3. Why normalised coordinates (0–1)

There are two ways to store a marker.

**Alternative A — pixel coordinates.** `{x: 183, y: 92}`
**Alternative B (chosen) — normalised coordinates.** `{x: 0.36, y: 0.42}` (fractions of the map's width and height)

We chose B because this plugin **crosses between multiple coordinate systems**:

- The map resolution might be 512, or a loaded image might be 4000 pixels.
- The screen zooms and pans.
- 2D and 3D projection coordinates are entirely different.

With pixel coordinates, every one of those transformations would require recomputing and re-storing marker positions, and swapping the image would misalign them. Normalised coordinates store only **the invariant truth of "geographic position"**, and screen pixels are derived at draw time with a single multiplication.

The knock-on effect is large — it is exactly why **generated terrain and image mode share 100% of the marker/region code**. Whatever the background, a marker is at "36% of the width".

---

## 4. Why inherit `TextFileView`

There are several ways to build a custom screen in Obsidian.

- `ItemView` — views unrelated to a file (sidebar panels etc.)
- `FileView` — tied to a file, but you write the save logic
- **`TextFileView` (chosen)** — the framework manages a text file's read/save lifecycle

Why `TextFileView`:

- `.fmap` is fundamentally a text (JSON) file. Implement just `getViewData()`/`setViewData()` and **Obsidian handles save timing, dirty state and conflicts for you**.
- Call `requestSave()` and the app saves with debouncing. We never manage file I/O directly.
- The file explorer, tabs, links — all of Obsidian's file features come along free.

In short, `TextFileView` was the contract where the framework best supports the goal of "treating a map like a file".

---

## 5. Why separate "computing" from "drawing"

The strict split between `terrain.ts` (data) and `render2d.ts`/`render3d.ts` (pixels):

- **Performance — avoiding recomputation.** Change only the style (parchment → ink) and the terrain is unchanged; only the colouring differs. Because they're separate, we skip `terrain` and call only `render`. Mixed together, changing one colour would mean re-running the noise.
- **One data set, two representations.** The same `TerrainResult` is consumed by both the 2D and 3D renderers. Reuse is possible precisely because the terrain logic knows nothing about the screen.
- **Testability.** `terrain.ts` is pure functions (input → output), verifiable in Node without Obsidian. We actually caught a river-generation bug outside the app with `test/debug-rivers.ts`.

This is classic **separation of concerns + pipeline architecture**: `noise → terrain → render → view`. Each stage needs to know only the previous stage's output.

---

## 6. Why these terrain algorithms

**Why Perlin-family gradient noise + fBm?**

- Pure randomness can't be terrain (adjacent pixels are unrelated — TV static). Gradient noise makes **adjacent coordinates connect smoothly**, like natural terrain.
- fBm (stacked octaves) expresses "broad continent outline + mid-scale ranges + fine coastline" **through one set of parameter knobs**. Sliders map directly onto octave count and gain.
- Simplex noise is faster, but has patent and implementation-complexity baggage, and at our resolution Perlin is easily fast enough (~50ms).

**Why `mulberry32`?** Of the seeded RNGs it's the shortest (4 lines) with sufficient quality. We don't need cryptographic strength — only the determinism of "same seed = same map".

**River generation — gradient descent + depression filling.** We coded the physics directly: "water flows downhill". The problem is noise terrain's countless local depressions. The textbook fix is heavy depression-filling preprocessing (Planchon–Darboux etc.); we compromised with a lightweight on-the-fly approach that **nudges a cell up only when a droplet gets stuck**. Not rigorous hydrology, but plenty for "rivers that look right on a map", and much faster.

---

## 6.5. Why 3D moved from a grid mesh to vector contour terraces

The first implementation downsampled the heightmap to a 100×100 grid and depth-sorted ten thousand quads. It worked, but with two complaints: the 2D (smooth pixel terrain) and 3D (angular grid) impressions didn't match, and sorting 10k quads every frame was wasteful.

**The chosen alternative — extract contours as vectors and stack them along z.**

- Marching squares extracts contour polygons from the heightmap (`contours.ts`), simplified with Douglas–Peucker.
- **The same vector data feeds both 2D and 3D.** In 2D it's the contour overlay; in 3D each polygon is raised to its elevation and joined with walls into stepped terraces. The two views share one visual language.
- Occlusion becomes dramatically simpler. Draw from the lowest level up and a top-down camera is naturally correct; depth sorting is needed only for wall quads within a level. Shape count fell from 10k to ~2k, and the render from 25ms to 7–8ms.
- A single "precision" parameter **directly controls vector fidelity** (6–14 levels + simplification strength). The grid approach offered no such intuitive knob.

**The cost:** terrain is quantised into steps and can't express smooth ridgelines. But that's a style, not a defect — the aesthetic of laser-cut terrain models, and a good match for the hand-crafted feel of fantasy maps.

Technical lesson: contours cut off at the map edge can't be filled in 3D, so **the outside of the map is treated as "a very low value", forcing every ring to close**. Holes such as lakes inside islands are handled free of charge by canvas's `evenodd` fill rule (which ignores winding direction, so ring orientation never needs managing either).

---

## 7. Why the interaction design

**Why a tool state machine?** Adding markers, drawing regions, brushing and panning all use the same input: "mouse drag". Branching on a single `this.tool` keeps one event handler and swaps only the per-tool behaviour. Simpler than a separate event system per tool.

**Why debounced regeneration?** Dragging a slider changes the value dozens of times per second. Recomputing terrain each time stutters. So we compute **"once, shortly after you stop"**. Brushes need responsiveness, so they're tuned short (60ms); sliders get more slack (200ms).

**Why draw markers and labels straight in screen space?** Terrain is drawn inside the camera transform (`translate` + `scale`), but if marker icons and text scaled too, letters would balloon when zooming. So only terrain lives inside the transform; text and pins are computed in screen pixels each frame, keeping **stroke widths and sizes constant**.

**Why cache terrain in an offscreen canvas?** Repainting terrain pixel-by-pixel every frame would stutter on a mere pan. The terrain is pre-drawn onto one canvas, and `draw()` blits it wholesale with `drawImage` (GPU-accelerated). The cache refreshes only when the terrain actually changes.

---

## 8. Why the note-link design

**Why embed `notePath` directly in marker data?** There are several ways to tie markers to notes (a separate index file, note frontmatter…), but putting the path right inside the marker object is the simplest and self-contained. The `.fmap` file alone carries the complete link information.

**Why does note→map "scan every .fmap"?** A reverse index (notes knowing their markers) would be fast, but keeping two sources of information in sync risks breakage. A vault realistically has few `.fmap` files (dozens), so a full scan with `cachedRead` at command time preserves a **single source of truth** whilst staying plenty fast. It eliminates cache-invalidation bugs at the root.

**Why use Obsidian's `openLinkText`?** Instead of opening files directly, this API respects the user's Obsidian settings and shortcuts — new tab, split, preview. We don't fight the platform's conventions.

---

## 9. Why the two modes (generated/image) share one code path

Image mode could have been a separate plugin. But because **markers, regions, note links and save logic are completely identical**, branching only the background source on a single `mode` flag is overwhelmingly more economical.

- If the background is `generated`, it's the terrain pipeline; if `image`, a Blob URL — that's the only fork.
- Everything else is shared (thanks to normalised coordinates).

As a result, the fallback feature "put markers on my own hand-drawn map" came along **nearly free**. The normalised-coordinates decision (§3) pays its dividend here.

---

## 10. The prices paid (honest limitations)

A good design document records its weaknesses too.

| Decision | Gained | Lost |
|---|---|---|
| Pure-canvas 3D | 0 dependencies, 64KB | Advanced shading; smoothness on large terrains |
| Recipe-only storage | Light files, version control | Recompute on every open (50–90ms) |
| Full scan (note→map) | No sync bugs | Could slow down with hundreds of maps |
| CPU pixel rendering | Simplicity | Very large resolutions (4K+) are taxing |
| Lightweight river algorithm | Fast | Not rigorous hydrology |

Every one of these prices was accepted deliberately in light of the goal: **"a light map tool that worldbuilders use alongside their notes"**. If the goal had been "a million-polygon GIS viewer", we'd have made the opposite choices (WebGL, tiling, spatial indices). Design is choice in service of a goal, not an absolute right answer.

---

## Appendix — decisions at a glance

```
Goal: a light, portable fantasy-map tool woven into notes
  │
  ├─ Lightness    → pure canvas, 0 dependencies, three.js rejected
  ├─ Portability  → JSON (.fmap) recipe storage, deterministic regeneration
  ├─ Flexibility  → normalised coordinates → unify generated/image/2D/3D spaces
  ├─ Note links   → notePath stored directly + full scan for two-way links
  ├─ Performance  → compute/draw split, offscreen cache, debouncing
  └─ Respect the framework → TextFileView, openLinkText, Modal reuse
```

---

## Addendum — decision log v0.4–v0.11 (2026-07-07 to 07-11)

### 3D removed from the core, split into an add-on (v0.10)
The built-in software 3D (heightmap mesh) delivered little satisfaction for its maintenance cost. **The core keeps zero dependencies**; 3D will be a separate add-on plugin using three.js (not yet started). The core's vector contours become the add-on's input.

### Ink & wash rendering — "low-res colour as wash, detail as vectors" (v0.7+)
Enlarging a cell-resolution bitmap turns hazy (Wonderdraft has the same issue). The fix is the ESRI antique-map technique: **leave the ground colour as a watercolour wash, and lay everything that must stay sharp (coastlines, contours, rivers, glyphs) on top as vectors/supersampling**. A screen-resolution paper-grain overlay adds zoom-independent texture.

### 3× detail cache + progressive tiles (v0.8–0.10)
To get both zoom sharpness (LOD) and freeze-free rendering: when terrain settles, re-render the whole map at 3px per cell in the background → pan/zoom just crops the cache. Initial display fills 192-cell tiles nearest the viewport first, 10ms per frame. **The cost**: the base pixel rules and the LOD pixel rules must be kept identical in two places (mind this when touching the renderer).

### Guaranteed continental spine ranges (v0.11)
Plateau falloff + absolute-scale clamping preserve "plains dominance", but the noise gate alone could produce **a continent with no mountains at all** (seed variance). Rather than widening the global gate, **each continent blob explicitly gets one ridge segment (spine)** — the fantasy-map grammar ("a continent has a mountain spine") is not left to seed luck. The noise-range parameters keep their original balance.

### Coastal concentric rings as a pixel field, not vectors (v0.11)
The equidistant ripple rings of antique charts are drawn as distance-based Gaussian bands over the waterDistance BFS field. Far cheaper than vector contour extraction, and it meshes naturally with dirty-rect brush updates. The LOD samples the same field bilinearly.

### PNG export = reusing the detail cache (v0.11)
Exports used to upscale the cell-resolution base and look hazier than the editor. Fixed by drawing the valid 3× detail cache directly. **WYSIWYG principle**: what you see in the editor is what you export.

### Declared desktop-only (v0.11)
With bundled fonts, styles.css is 400KB and mobile is unverified, so we declare `isDesktopOnly: true` honestly. Reversible after mobile verification.
