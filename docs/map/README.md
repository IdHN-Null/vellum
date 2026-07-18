# Hero Map Image (replaceable)

**`hero.jpg`** in this folder is the map displayed large on the landing page's first screen (the hero).
**Swap just this file for your own map** and the site's first impression changes. (No other file needs touching.)

## Specs

| Item | Recommended |
|---|---|
| Filename | `hero.jpg` (overwrite with the same name) |
| Ratio | **16 : 9** (wide) |
| Size | **1600 × 900 px** recommended · minimum 1200 × 675 px |
| Format | JPG (recommended, light) or PNG |
| Weight | under 500KB recommended (loading speed) |

> It sits on the scroll paper with `object-fit: contain`, so it **never squashes or crops**.
> A slightly different ratio is safe, but the closer to 16:9, the better the paper margins balance.

## Exporting a map from Vellum

1. Open your map in Vellum → right panel **File tab → export as PNG**.
2. Save the generated PNG as `hero.jpg` (or convert to JPG) and overwrite it in this folder.
   - For a wide map, set Terrain tab **advanced settings → map size** to `768 × 432` (16:9).
     A 2× export gives 1536×864 — almost exactly the recommended spec.

## Regenerating the default image (development)

Rebuild the example map with the plugin repository's render harness:

```powershell
cd ../../plugin
node test/render-hero.js   # → refreshes docs/map/hero.jpg
```
