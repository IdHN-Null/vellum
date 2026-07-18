# Vellum

🌐 [English (US)](README.md) · **English (UK)** · [Español](README.es.md) · [中文](README.zh.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

**From imagination to map.** A fantasy map generator & editor for Obsidian that lets you create and refine your own worlds.

It runs on pure canvas (ink & wash rendering) with no external libraries, aiming for renders that stand on their own as finished antique maps. Maps are saved as `.fmap` (JSON) files, so version control and sync just work.

## Repository layout

| Folder | Contents |
|---|---|
| [`plugin/`](plugin/) | Plugin **source** (TypeScript), with build, tests and architecture docs |
| [`docs/`](docs/) | Landing page (served via **GitHub Pages**), including the download zip |
| [`dist/`](dist/) | Plugin **distribution** — release zip + unpacked copy (install files only) |

- How to build a distribution from source: see the development section of [`plugin/README.md`](plugin/README.md)
- Architecture & internals: [`plugin/ARCHITECTURE.md`](plugin/ARCHITECTURE.md)
- Design rationale: [`plugin/DESIGN-DECISIONS.md`](plugin/DESIGN-DECISIONS.md)

## Installation (users)

1. Grab the latest `vellum-x.y.z.zip` from [`dist/`](dist/) and unzip it
   (or use the download button on the landing page).
2. Copy `main.js`, `manifest.json` and `styles.css` into your vault's `.obsidian/plugins/vellum/` folder.
   - On Windows, the bundled `install.ps1 "path\to\YourVault"` does it in one line.
3. Enable **Vellum** under Settings → Community plugins.

> Currently desktop-only (mobile untested).

## Development (quick start)

```powershell
cd plugin
npm install
npm run dev    # watch build
npm run build  # type check + production bundle
npm test       # pure-logic unit tests
```

## Contributing / branch rules

This repository uses a `master` (release) / `dev` (integration) / `feat/*` (feature) branch strategy.
Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

## Licence

[MIT](plugin/LICENSE)
