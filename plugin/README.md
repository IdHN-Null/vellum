# Vellum (Obsidian plugin)

🌐 **English (US)** · [English (UK)](README.en-GB.md) · [Español](README.es.md) · [中文](README.zh.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

**From imagination to map.** A fantasy map generator & editor for creating and refining your own worlds.
It runs on pure canvas with no external libraries, aiming for renders that stand on their own as finished antique maps.

## Feature summary

**Terrain generation**
- **Fully random generation** — by default, one click chooses continents, islands, sea level and climate for you (reproducible via seed). Fine-tuning lives in the collapsed **advanced settings**
- **Procedural generation + hydraulic erosion** — seeded generation plus a droplet-erosion simulation carves real valleys and alluvial plains
- **A guaranteed mountain spine per continent** — ridge chains drawn as Tolkien-style ranges
- **Advanced hydrology** — flow-accumulation branching rivers (thickening downstream), priority-flood natural lakes, bathymetric lines
- **Async generation** — terrain is computed in a Web Worker, so even large maps never freeze the UI

**Ink & wash rendering (antique-map style)**
- Watercolor wash base + crisp pen-ink vector detail (coastlines, contours, rivers), with LOD re-rendering when zoomed
- **Coastal concentric rings** — the equidistant ripple rings of antique charts, plus water-surface streaks
- **Coastal / land hatching** — copperplate-style dashed lines engraved in layers on both sides of the coast (individually toggleable)
- **Glyph stamps** — forests as shaded tree clusters, hills as mound arcs, mountains as woodcut peaks with shaded faces and hatching
- **Texture sliders** for grain, shading, mottle and icon size; three styles (parchment/color/ink); customizable biome colors
- Coordinate grid (A·B·C / 1·2·3), compass rhumb lines, frame/waves/vignette toggles

**Editing tools**
- **Terrain brushes** — raise/lower (`[` `]` for brush size)
- **Biome paint** — Water/Grassland/Forest/Desert/Snow brushes (1–5, E to erase). Painting water/land also corrects the elevation
- **Freehand annotations** — paths, lines and arrows (dashed supported) with color/width options — great for treasure maps
- **18 marker icons** — map-style vector badges (castle, town, harbor, mountain, forest, tower, temple, battlefield, chest, skull, flag, X and more) with size control
- **Region polygons** — click out borders, with name labels and colors
- **Text elements** — title cartouche, place-name labels, **ribbon banners (text on a ribbon)**, note cards. Drag to move, resize, double-click to edit
- **25 decorative stickers** — one click from a thumbnail grid. Sky (cloud, sun, crescent, birds, wind, storm) / Sea (ship, sea serpent, whale, fish, whirlpool, waves, lighthouse, kraken) / Land (dragon, camp, ruins, tower, castle, bridge, windmill) / Map (compass, ink blot, scroll, corner flourish). **You can also add your own vault PNGs as stickers**
- **Ink-style marker badges** — hand-drawn rings + ink glyphs + muted accent colors that suit an antique map
- Layer ordering (front/back) via the context menu

**Vault integration**
- Two-way marker ↔ note links (click a marker → open its note; `현재 노트를 지도에서 보기` command to jump the other way)
- `[[map.fmap#markerName]]` subpath links focus a specific marker
- `.fmap` is JSON, so version control and sync just work
- **PNG export** — saved into the vault at the same high quality (3× detail cache) as the editor view
- **Image map mode** — place markers and regions over your own hand-drawn map image
- **Sample pack** — the `샘플팩 설치 (온보딩)` command generates an example map with linked notes

> The 3D view was split out of the core. It will return later as a separate add-on plugin (three.js).

## Installation

### Option 1 — script
```powershell
cd vellum
.\install.ps1 "C:\path\to\YourVault"
```

> **Troubleshooting**: If you get an error stating the script "is not digitally signed" or cannot be loaded, it is blocked by Windows execution policy. You can unblock the file by running `Unblock-File -Path .\install.ps1` first, or bypass the policy temporarily by running: `powershell -ExecutionPolicy Bypass -File .\install.ps1 "C:\path\to\YourVault"`

### Option 2 — manual
1. Create the `.obsidian/plugins/vellum/` folder in your vault.
2. Copy the three files: `main.js`, `manifest.json`, `styles.css`.
3. Enable **Vellum** under Obsidian Settings → Community plugins.

> After replacing the files, toggle the plugin off/on or restart Obsidian. Check the version shown at the bottom of the right panel.
> Currently desktop-only (mobile untested — bundled fonts, large canvases).

## Getting started
1. Command palette (Ctrl+P) → run **샘플팩 설치 (온보딩)** (install sample pack) → see `판타지 지도 샘플/시작하기.md`.
2. Create new maps via the ribbon map icon or the **새 판타지 지도 만들기** (new fantasy map) command (`.fmap` file).

> Note: the plugin UI is currently in Korean.

## Tools (left toolbar)
| Tool | Action |
|---|---|
| Select | Drag: pan the map / drag markers, elements, drawings: move / click a marker: open its note / right-click: menu |
| Marker | Add a marker where you click (name, icon, note link) |
| Region | Click to add vertices; double-click/Enter to finish, Esc to cancel |
| Draw/Arrow | Drag for free curves and arrows (color, width and dashes in the bottom bar) |
| Raise/Lower | Drag to edit terrain (generated maps only) |
| Paint | Paint biomes — pick type and size in the bottom bar (1–5, E) |

The right panel has four tabs: **Terrain / Style / Elements / File**.

## Development
```powershell
npm install
npm run dev    # watch build
npm run build  # type check + production bundle
npm test       # pure-logic unit tests (RLE, migrations, contours, terrain distribution)
```
Rendering-pipeline visual tests: `node test/server.mjs`, then open http://localhost:8137
(refresh the bundle with `npx esbuild test/preview.ts --bundle --outfile=test/preview.js`)

## License
MIT
