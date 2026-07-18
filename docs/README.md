# Vellum — Landing Page

The static distribution website for Vellum (the Obsidian fantasy-map plugin).
**No build tools, no external requests** — fully self-contained. Drop the folder anywhere and it works.

## Structure

```
docs/
├─ index.html               # one-pager (section markup + inline scroll-effects script; base language en-US)
├─ i18n.js                  # ★ six-locale dictionary + language switcher/routing ★
├─ styles.css               # all styling (parchment & ink editorial theme + language-select styles)
├─ .nojekyll                # disables GitHub Pages' Jekyll processing (serve as-is)
├─ map/                     # ★ user-replaceable hero map ★
│  ├─ hero.jpg              #   swap this one file to change the scroll-showcase map (16:9)
│  └─ README.md             #   recommended specs (1600×900, 16:9)
├─ assets/
│  ├─ feat-terrain.jpg      # feature ① procedural terrain (ranges, rivers)
│  ├─ feat-craft.jpg        # feature ② ink & wash (coastal hatching)
│  ├─ feat-world.jpg        # feature ③ worldbuilding links (markers, labels)
│  ├─ style-parchment.jpg   # Styles hover background — parchment
│  ├─ style-color.jpg       # Styles hover background — colour
│  ├─ style-ink.jpg         # Styles hover background — ink (same map, three styles)
│  ├─ stickers.png          # sticker sheet (transparent background)
│  ├─ favicon.svg           # compass favicon
│  ├─ paper.svg             # paper-grain texture (SVG feTurbulence)
│  └─ fonts/                # bundled fonts (Cinzel, Gaegu) — same as the plugin, self-hosted
└─ download/
   └─ vellum-0.21.0.zip     # plugin distribution package (the download button points here)
```

## Internationalisation (i18n)

The page ships in six locales: **en-US · en-GB · es · zh · ja · ko**.

- The **base markup** in `index.html` is en-US; every translatable element carries a
  `data-i18n` (textContent), `data-i18n-html` (innerHTML) or `data-i18n-alt` (alt) key.
- `i18n.js` holds the dictionary and applies a locale at load time. Resolution order:
  1. `?lang=` URL parameter (shareable link routing, e.g. `index.html?lang=ja`)
  2. `localStorage` (`vellum-lang`, the visitor's previous choice)
  3. `navigator.languages` (browser preference)
  4. `en-US` fallback
- The **language selector** in the nav writes the choice to localStorage and to the URL
  (`history.replaceState`), so the address bar always yields a shareable language link.
- en-GB falls back to en-US per key, overriding only where spellings differ
  (colour/color etc.) — so most copy lives once.

To edit copy: change a key's entry in `i18n.js` for every locale (and, if it's en-US,
the matching base markup in `index.html`).

## Local preview

It's all static files, so any static server will do.

```powershell
npx serve docs -l 8140
# → http://localhost:8140  (try ?lang=ko, ?lang=es …)
```

> Opening via `file://` may break some font/image paths — use a local server.

## Deployment (GitHub Pages)

**Both the web hosting and the zip download work on GitHub Pages as-is.**
All paths are relative and there are no external requests, so a project page
(`user.github.io/repo/`) under a sub-path works fine too.

1. Commit this folder (`docs/`) to the repository.
2. Repository **Settings → Pages → Build and deployment → Source: Deploy from a branch**
   - branch `master`, folder `/docs`.
3. A few minutes later it's live at `https://<user>.github.io/<repo>/`.

- **Download button**: `download/vellum-0.21.0.zip` is served from the same domain, so the
  `download` attribute saves it properly. (GitHub Pages serves `.zip` with the correct MIME type.)
- `.nojekyll` stops Jekyll from touching the files.

> **Netlify / Vercel / Cloudflare Pages** work identically — no build command, publish directory `docs`.

### When a new plugin version ships
1. Put the new zip in `download/` (e.g. `vellum-0.22.0.zip`).
2. Update the download button `href` and the version text (`Vellum v0.21.0`) in `index.html`.
3. (Optional) delete the old zip.

## Swapping the hero map

Overwrite **just `map/hero.jpg`** with your own map. Recommended specs are in `map/README.md`
(summary: **1600×900, 16:9, JPG**). It sits on the scroll paper with `object-fit: contain`,
so it **never squashes or crops**.

## Regenerating the assets (development)

The hero map, three style shots, feature crops and sticker sheet are produced by the
plugin repository's render harness:

```powershell
cd ../plugin
npx esbuild test/render-hero.ts --bundle --platform=node --external:skia-canvas --outfile=test/render-hero.js
node test/render-hero.js
# → refreshes map/hero.jpg + assets/{style-*.jpg, feat-*.jpg, stickers.png}
```

- The map is generated at **16:9 (768×432 cells)** and **the same map is rendered in all
  three styles** (parchment/colour/ink).
- Markers and decorations are placed **terrain-aware** (the harbour on the coast, the
  northern gate on northern land, sea labels/ship/monster on water).
- Feature crops also scan the terrain (densest mountains, coastline, around markers), so a
  new map never crops the wrong spot.

## Technical notes

- **Scroll effects are progressive enhancement.** Without JS or IntersectionObserver — or in a
  throttled background tab — the safety net (`force-show`) guarantees all content displays.
  With `prefers-reduced-motion`, the final state shows without animation.
- **The scroll showcase** (`#showcase`) plays its timeline when the pinned section's progress
  crosses set points (drop at 15%, unfurl at 35%) — triggered, not scroll-scrubbed. Scrolling
  back up rolls it closed again.
- **Styles hover**: pointing at a card spreads that style's actual map across the background in
  a circle (dimmed by a scrim). Cards are `.reveal` elements, focused via `top` and background contrast.
- **Fonts are self-hosted** (the same woff2 as the plugin) — no CDN requests. Korean body text
  falls back to the system serif.
