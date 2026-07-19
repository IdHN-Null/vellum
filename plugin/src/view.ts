import { Menu, Notice, TextFileView, TFile, WorkspaceLeaf, setIcon, normalizePath } from "obsidian";
import {
  MapData, Marker, Ornament, OrnamentType, PLUGIN_VERSION, Region, StyleId,
  b64ToBytes, bytesToB64, defaultMapData, newId, parseMapData, randomizeGenParams,
} from "./types";
import {
  B, Classifier, TerrainResult,
  composeTerrain, generateBase, updateTerrainRect,
} from "./terrain";
import {
  COAST_RING_MAX, GRAIN_TILE, MapLayers, Palette, RenderOpts, TERRAIN_COLOR_KEYS,
  allocLayers, biomeColor, getPalette, hash2, hexToRGB, landDistance, landWash, oceanExtraShade, paperGrainTile, renderTile, rgbToHex, smoothVal, updateLayersRect,
} from "./render2d";

import { ContourSet, chaikin, extractContours, extractIsoRings, simplifyLine } from "./contours";
import { roughLine, roughRing, sketchToPath } from "./rough";
import { OrnBox, StickerImages, drawCoordinateGrid, drawMapEffects, drawOrnaments } from "./decor";
import { STICKERS, STICKER_CATS, getSticker } from "./stickers";
import { ribbonPath } from "./ink";
import { drawMarkerIcon, iconSvg } from "./icons";
import { FONT_SERIF, ensureFontsLoaded } from "./fonts";
import { Annotation } from "./types";
import { distToPolyline, strokeAnnotationPx } from "./annotations";
import { ImageSuggestModal, MarkerModal, RegionModal, TextEditModal } from "./modals";

export const VIEW_TYPE_FMAP = "vellum-map-view";

/** Worker source inlined at build time (esbuild define) */
declare const __WORKER_CODE__: string;

type Tool = "select" | "marker" | "region" | "raise" | "lower" | "paint" | "draw" | "arrow";

const TOOL_DEFS: { id: Tool; icon: string; label: string }[] = [
  { id: "select", icon: "mouse-pointer-2", label: "선택/이동 — 마커·지역·그림 드래그로 이동, Delete로 삭제" },
  { id: "marker", icon: "map-pin", label: "마커 배치 — 클릭한 위치에 마커 추가" },
  { id: "region", icon: "hexagon", label: "지역 그리기 — 클릭으로 꼭짓점, 더블클릭/Enter로 완성" },
  { id: "draw", icon: "pencil", label: "자유 그리기 — 드래그로 경로·곡선 그리기" },
  { id: "arrow", icon: "move-up-right", label: "화살표 — 드래그로 방향 표시" },
  { id: "raise", icon: "arrow-up-circle", label: "지형 올리기 — 드래그로 융기" },
  { id: "lower", icon: "arrow-down-circle", label: "지형 내리기 — 드래그로 침강" },
  { id: "paint", icon: "paintbrush", label: "바이옴 칠하기 — 1~5로 종류 선택, E 지우개" },
];

const DRAW_COLORS = ["#8a1c1c", "#1c1a14", "#2a5a8a", "#1e6e3a", "#7a4a1a", "#6a2c8a"];

/** Biomes the paint brush can apply (shortcut order 1–5) */
const PAINT_BIOMES: { code: number; key: string; label: string }[] = [
  { code: B.OCEAN, key: "water", label: "Water" },
  { code: B.GRASS, key: "grass", label: "Grassland" },
  { code: B.FOREST, key: "forest", label: "Forest" },
  { code: B.DESERT, key: "desert", label: "Desert" },
  { code: B.SNOW, key: "snow", label: "Snow" },
];

interface Rect { x0: number; y0: number; x1: number; y1: number; }

export class VellumView extends TextFileView {
  private map: MapData = defaultMapData("지도");
  private edits: Int8Array | null = null;
  private paint: Uint8Array | null = null;
  private paintBiome: number = B.GRASS;
  private paintErase = false;
  private paintBarEl: HTMLElement | null = null;

  // Terrain pipeline caches
  private baseHeight: Float32Array | null = null;
  private baseKey = "";
  private classifier: Classifier | null = null;
  private terrain: TerrainResult | null = null;
  private layers: MapLayers | null = null;
  private contours: ContourSet | null = null;
  private contourMinor: Path2D | null = null;
  private contourMajor: Path2D | null = null;
  private bathyPath: Path2D | null = null;   // bathymetric lines
  private coastPath: Path2D | null = null;
  private riverLines: { pts: [number, number][]; widths: number[] }[] = []; // rivers for the brush ribbons
  private baseImage: HTMLImageElement | null = null;
  private imageUrl: string | null = null;

  private rootEl!: HTMLElement;
  private canvasEl!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private panelEl!: HTMLElement;
  private hintEl!: HTMLElement;
  private toolBtns = new Map<string, HTMLElement>();

  private cam = { x: 0, y: 0, scale: 1 };
  private camFitted = false;
  private tool: Tool = "select";

  private drawColor = DRAW_COLORS[0];
  private drawWidth = 3;
  private drawDashed = true;
  private drawErase = false;
  private drawBarEl: HTMLElement | null = null;
  private currentAnno: Annotation | null = null;

  private hoverMarkerId: string | null = null;
  private selectedRegionId: string | null = null;
  private selectedOrnId: string | null = null;
  private selectedAnnoId: string | null = null;
  private ornBoxes: Map<string, OrnBox> = new Map(); // world-space bounding boxes
  private dragMode: "none" | "pan" | "marker" | "brush" | "regionMove" | "regionVertex" | "ornMove" | "ornResize" | "anno" | "annoMove" | "annoErase" = "none";
  private dragAnnoId: string | null = null;
  private dragAnnoOrig: [number, number][] | null = null;
  private dragOrnId: string | null = null;
  private ornStart = { x: 0, y: 0, sizeF: 0, dist: 1 };
  private dragMarkerId: string | null = null;
  private dragRegionId: string | null = null;
  private dragVertexIdx = -1;
  private dragOrigPoints: [number, number][] | null = null;
  private dragStartWorld = { x: 0, y: 0 };
  private dragMoved = false;
  private lastPointer = { x: 0, y: 0 };
  private drawingRegion: [number, number][] | null = null;
  private brushRadius = 26;
  private flash: { x: number; y: number; t0: number } | null = null;

  private finalizeTimer: number | null = null;
  private regenTimer: number | null = null;
  private renderToken = 0;      // cancellation token for the progressive render
  private renderRAF = 0;        // in-flight rAF handle
  private fullDetailCanvas: HTMLCanvasElement | null = null; // full-map pixel cache (at CACHE_SCALE)
  private cacheValid = false;  // true = terrain unchanged; draw() uses a cropped blit
  private detailTimer: number | null = null;
  private worker: Worker | null = null;
  private workerUrl: string | null = null;
  private workerReqId = 0;
  private workerReqs = new Map<number, (d: { base: Float32Array; terrain: TerrainResult }) => void>();
  private genToken = 0;         // cancellation token for async generation
  private resizeObs: ResizeObserver | null = null;
  private ready = false;
  private pendingFocusName: string | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string { return VIEW_TYPE_FMAP; }
  getIcon(): string { return "map"; }
  getDisplayText(): string { return this.file?.basename ?? "판타지 지도"; }

  getViewData(): string {
    this.syncLayersToMap();
    return JSON.stringify(this.map, null, 2);
  }

  setViewData(data: string, _clear: boolean): void {
    try {
      this.map = parseMapData(data);
    } catch {
      this.map = defaultMapData(this.file?.basename ?? "지도");
    }
    const len = this.map.width * this.map.height;
    this.edits = this.map.editsB64 ? b64ToBytes(this.map.editsB64, len) : null;
    this.paint = this.map.paintB64
      ? new Uint8Array(b64ToBytes(this.map.paintB64, len).buffer)
      : null;
    this.camFitted = false;
    if (this.ready) this.rebuild();
  }

  clear(): void {
    this.map = defaultMapData("지도");
    this.edits = null;
    this.paint = null;
    this.terrain = null;
    this.layers = null;
    this.baseHeight = null;
    this.baseKey = "";
  }

  /** [[map.fmap#markerName]] subpath link → highlight that marker */
  setEphemeralState(state: unknown): void {
    const sub = (state as { subpath?: string } | null)?.subpath;
    if (typeof sub === "string" && sub.length > 1) {
      const name = decodeURIComponent(sub.replace(/^#/, "")).trim();
      if (!this.focusMarkerByName(name)) this.pendingFocusName = name;
    }
  }

  async onOpen(): Promise<void> {
    const content = this.contentEl;
    content.empty();
    content.addClass("fms-content");
    this.rootEl = content.createDiv({ cls: "fms-root" });
    this.rootEl.tabIndex = 0;

    this.canvasEl = this.rootEl.createEl("canvas", { cls: "fms-canvas" });
    this.ctx = this.canvasEl.getContext("2d")!;

    this.buildToolbar();
    this.panelEl = this.rootEl.createDiv({ cls: "fms-panel" });
    this.hintEl = this.rootEl.createDiv({ cls: "fms-hint" });
    this.buildPaintBar();
    this.buildDrawBar();

    this.bindEvents();
    this.resizeObs = new ResizeObserver(() => this.handleResize());
    this.resizeObs.observe(this.rootEl);

    this.ready = true;
    this.rebuild();
    ensureFontsLoaded(() => this.draw()); // re-render once the bundled fonts have loaded
  }

  async onClose(): Promise<void> {
    this.resizeObs?.disconnect();
    if (this.imageUrl) URL.revokeObjectURL(this.imageUrl);
    if (this.regenTimer) window.clearTimeout(this.regenTimer);
    if (this.finalizeTimer) window.clearTimeout(this.finalizeTimer);
    if (this.detailTimer) window.clearTimeout(this.detailTimer);
    if (this.renderRAF) cancelAnimationFrame(this.renderRAF);
    this.renderToken++;
    this.genToken++;
    if (this.worker) { this.worker.terminate(); this.worker = null; }
    if (this.workerUrl) { URL.revokeObjectURL(this.workerUrl); this.workerUrl = null; }
    this.workerReqs.clear();
  }

  // ── Build / regeneration ─────────────────────────────

  private rebuild(): void {
    this.buildPanel();
    if (this.map.mode === "image" && this.map.baseImagePath) {
      void this.loadBaseImage(this.map.baseImagePath);
    } else {
      this.regenerate();
    }
  }

  private renderOpts(): RenderOpts {
    return {
      colors: this.map.styleColors,
      coastWidth: this.map.coastWidth,
      coastColor: this.map.coastColor,
      waves: this.map.decor.waves,
      relief: this.map.texture.relief,
      mottle: this.map.texture.mottle,
    };
  }

  /** Regenerate the whole pipeline. The noise base is recomputed only when parameters change. */
  /** Prepare the worker (inlined source → Blob URL). On failure, stay null and fall back to sync. */
  private ensureWorker(): void {
    if (this.worker || typeof Worker === "undefined") return;
    try {
      const code = typeof __WORKER_CODE__ === "string" ? __WORKER_CODE__ : "";
      if (!code) return;
      this.workerUrl = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
      this.worker = new Worker(this.workerUrl);
      this.worker.onmessage = (e: MessageEvent) => {
        const cb = this.workerReqs.get(e.data.id);
        if (cb) { this.workerReqs.delete(e.data.id); cb(e.data); }
      };
      this.worker.onerror = () => { this.worker = null; }; // fall back to sync on error
    } catch {
      this.worker = null;
    }
  }

  private workerGenerate(needBase: boolean): Promise<{ base: Float32Array; terrain: TerrainResult }> {
    return new Promise((resolve) => {
      const id = ++this.workerReqId;
      this.workerReqs.set(id, resolve);
      const genMap = { width: this.map.width, height: this.map.height, gen: this.map.gen };
      // Buffers are copied (not transferred) — the main thread must keep ownership
      const editsBuf = this.edits ? this.edits.buffer.slice(0) : null;
      const paintBuf = this.paint ? this.paint.buffer.slice(0) : null;
      const baseBuf = !needBase && this.baseHeight ? this.baseHeight.buffer.slice(0) : null;
      this.worker!.postMessage({ id, map: genMap, edits: editsBuf, paint: paintBuf, base: baseBuf });
    });
  }

  /** Terrain regeneration — the heavy work (erosion, hydrology) runs async in the worker so the UI never freezes. */
  private async regenerate(): Promise<void> {
    const key = JSON.stringify([this.map.gen, this.map.width, this.map.height]);
    const needBase = !this.baseHeight || this.baseKey !== key;
    this.ensureWorker();

    if (this.worker) {
      const token = ++this.genToken;
      if (needBase) this.setHint("지형 생성 중…");
      let res: { base: Float32Array; terrain: TerrainResult };
      try {
        res = await this.workerGenerate(needBase);
      } catch {
        this.worker = null;
        this.regenSync(key, needBase);
        return;
      }
      if (token !== this.genToken || !this.ready) return; // superseded by a newer request
      this.baseHeight = res.base;
      this.baseKey = key;
      this.terrain = res.terrain;
      if (needBase) this.setHint("");
    } else {
      this.regenSync(key, needBase);
      return; // regenSync handles the rest of the pipeline
    }

    this.finishRegen();
  }

  /** Synchronous fallback (environments without Worker support) */
  private regenSync(key: string, needBase: boolean): void {
    if (needBase) {
      this.baseHeight = generateBase(this.map);
      this.baseKey = key;
    }
    this.terrain = composeTerrain(this.map, this.baseHeight!, this.edits, this.paint);
    this.finishRegen();
  }

  /** Shared pipeline after terrain computation (classification, contours, vectors, render) */
  private finishRegen(): void {
    if (!this.terrain) return;
    this.classifier = new Classifier(this.map.gen, this.map.width, this.map.height);
    this.contours = extractContours(
      this.terrain.height, this.terrain.w, this.terrain.h,
      this.terrain.seaLevel, this.map.gen.precision,
    );
    this.buildVectorPaths();
    this.fitCameraOnce();
    this.cacheValid = false;
    this.startProgressiveRender();
    this.draw();
    this.scheduleDetail();
    if (this.pendingFocusName) {
      const name = this.pendingFocusName;
      this.pendingFocusName = null;
      this.focusMarkerByName(name);
    }
  }

  /**
   * Tile-based progressive layer render.
   * Tiles nearest the viewport centre are drawn first, so even a large map fills in
   * gradually instead of freezing in one go.
   */
  private startProgressiveRender(): void {
    if (!this.terrain) return;
    const t = this.terrain;
    const token = ++this.renderToken;
    if (this.renderRAF) cancelAnimationFrame(this.renderRAF);

    const layers = allocLayers(t, this.renderOpts());
    this.layers = layers;

    const TILE = 192;
    const cols = Math.ceil(t.w / TILE), rows = Math.ceil(t.h / TILE);
    // Sort tiles by distance from the cell under the viewport centre
    const { w: vw, h: vh } = this.viewSize();
    const c = this.toWorld(vw / 2, vh / 2);
    const ccx = c.x * cols, ccy = c.y * rows;
    const tiles: { tx: number; ty: number; d: number }[] = [];
    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        tiles.push({ tx, ty, d: Math.hypot(tx + 0.5 - ccx, ty + 0.5 - ccy) });
      }
    }
    tiles.sort((a, b) => a.d - b.d);

    let i = 0;
    const opts = this.renderOpts();
    const step = () => {
      if (token !== this.renderToken || this.terrain !== t) return; // cancelled
      const budgetEnd = performance.now() + 10; // only ~10ms of work per frame
      while (i < tiles.length && performance.now() < budgetEnd) {
        const { tx, ty } = tiles[i++];
        const x0 = tx * TILE, y0 = ty * TILE;
        const x1 = Math.min(t.w - 1, x0 + TILE - 1), y1 = Math.min(t.h - 1, y0 + TILE - 1);
        renderTile(layers, t, this.map.style, opts, x0, y0, x1, y1);
      }
      this.draw();
      if (i < tiles.length) {
        this.renderRAF = requestAnimationFrame(step);
      } else {
        this.renderRAF = 0;
        this.setHint("");
      }
    };
    if (tiles.length > 12) this.setHint(`지도 렌더링 중… (${cols * rows} 타일)`);
    step();
  }

  private regenDebounced(delay = 250): void {
    if (this.regenTimer) window.clearTimeout(this.regenTimer);
    this.regenTimer = window.setTimeout(() => {
      this.regenTimer = null;
      this.regenerate();
    }, delay);
  }

  /** Vector line cache: hand-drawn (rough) bathymetry, major/minor contours, coastline, tapered rivers */
  private buildVectorPaths(): void {
    const cs = this.contours;
    this.contourMinor = null;
    this.contourMajor = null;
    this.bathyPath = null;
    this.coastPath = null;
    this.hatchRows = null; // terrain changed → rebuild hatching too (built lazily once waterDist is ready)
    this.landHatchRows = null;
    this.riverLines = [];
    if (!cs || !this.terrain) return;
    const sea = this.terrain.seaLevel;
    const seed = this.map.gen.seed;
    let sc = seed * 2 + 17; // a different jitter seed per ring

    // Contours: split into bathymetry / coast / land (minor & major) — double hand-drawn passes for ink texture
    const bathy = new Path2D();
    const minor = new Path2D();
    const major = new Path2D();
    let hasBathy = false;
    let landIdx = 0;
    for (const level of cs.levels) {
      if (level.z < sea - 1e-9) {
        for (const ring of level.rings) {
          sketchToPath(bathy, roughRing(ring, 0.9, sc++), true);
          hasBathy = true;
        }
        continue;
      }
      if (Math.abs(level.z - sea) < 1e-9) {
        // Hatching removed here — random-length curved hatching looked like 'fur' and hurt the aesthetic.
        // The water side (concentric rings) is handled by the pixel layer.
        const coast = new Path2D();
        for (const ring of level.rings) {
          // Double pass: a hand-drawn coastline the ink has crossed twice
          sketchToPath(coast, roughRing(ring, 1.0, sc), true);
          sketchToPath(coast, roughRing(ring, 0.7, sc + 5000), true);
          sc++;
        }
        this.coastPath = coast;
        continue;
      }
      landIdx++;
      const target = landIdx % 3 === 0 ? major : minor; // a major contour every 3 levels
      for (const ring of level.rings) {
        sketchToPath(target, roughRing(ring, landIdx % 3 === 0 ? 0.85 : 1.0, sc++), true);
      }
    }
    this.contourMinor = minor;
    this.contourMajor = major;
    this.bathyPath = hasBathy ? bathy : null;

    // Rivers: simplify → meander jitter → smoothing (thickening downstream).
    // Aggressively simplify the straight runs the D8 flow directions create, then jitter into natural bends.
    this.riverLines = [];
    const smoothed: ({ pts: [number, number][]; widths: number[] } | null)[] = [];
    for (const rv of this.terrain.rivers) {
      if (rv.pts.length < 3) { smoothed.push(null); continue; }
      const simplified = simplifyLine(rv.pts, 0.9);
      const sm = chaikin(roughLine(simplified, 0.95, sc++), 3, false);
      // Resample the width array to sm's length
      const widths = sm.map((_, i) => {
        const oi = Math.min(rv.widths.length - 1, Math.round((i / (sm.length - 1)) * (rv.widths.length - 1)));
        return rv.widths[oi];
      });
      smoothed.push({ pts: sm, widths });
    }
    // Snap each tributary's endpoint to the nearest point on its parent's (jittered) rendered centreline — seamless confluences
    this.terrain.rivers.forEach((rv, idx) => {
      const line = smoothed[idx];
      if (!line || rv.joins === undefined) return;
      const parent = smoothed[rv.joins];
      if (!parent) return;
      const end = line.pts[line.pts.length - 1];
      let best = -1, bestD = Infinity;
      for (let k = 0; k < parent.pts.length; k++) {
        const dx = parent.pts[k][0] - end[0], dy = parent.pts[k][1] - end[1];
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = k; }
      }
      // If the snap distance is abnormally large (5+ cells), leave it as-is
      if (best >= 0 && bestD < 25) {
        line.pts[line.pts.length - 1] = [parent.pts[best][0], parent.pts[best][1]];
      }
    });
    for (const l of smoothed) if (l) this.riverLines.push(l);
  }

  /**
   * Vector ink-line render (shared by draw & export). unit = screen pixels per cell
   * (draw: cam.scale, export: scale). Contours and coastline use a bleed undercoat +
   * main stroke; rivers are variable-width brush ribbons.
   */
  private drawVectorLines(ctx: CanvasRenderingContext2D, pal: Palette, unit: number): void {
    const px = (target: number) => target / unit; // target screen px → line width in cells
    const cl = pal.coastline;
    const cc = this.map.style === "color" ? "40,48,44" : `${cl[0]},${cl[1]},${cl[2]}`;

    if (this.map.showContours && this.bathyPath) {
      ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.08)`;
      ctx.lineWidth = px(0.7);
      ctx.stroke(this.bathyPath);
    }
    // Contours are subtle supporting information — too dark and they become 'wood-grain terraces' that clutter the map
    if (this.map.showContours) {
      if (this.contourMinor) {
        ctx.strokeStyle = `rgba(${cc},0.05)`;  // bleed undercoat
        ctx.lineWidth = px(2);
        ctx.stroke(this.contourMinor);
        ctx.strokeStyle = `rgba(${cc},0.16)`;
        ctx.lineWidth = px(0.6);
        ctx.stroke(this.contourMinor);
      }
      if (this.contourMajor) {
        ctx.strokeStyle = `rgba(${cc},0.07)`;
        ctx.lineWidth = px(2.6);
        ctx.stroke(this.contourMajor);
        ctx.strokeStyle = `rgba(${cc},0.26)`;
        ctx.lineWidth = px(0.9);
        ctx.stroke(this.contourMajor);
      }
    }
    // Coastal hatching: equidistant dashed lines (copperplate water-lining) — beneath the main coast stroke.
    // Water side and land side toggle independently.
    if (this.map.coastHatching || this.map.landHatching) {
      if (!this.hatchRows) this.buildCoastHatch();
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = px(0.55);
      if (this.map.coastHatching && this.hatchRows) {
        this.hatchRows.forEach((row, k) => {
          ctx.setLineDash([5.2, 3.0]);
          ctx.lineDashOffset = k * 2.9; // offset the dash phase per row — hand-drawn feel
          ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},${row.alpha})`;
          ctx.stroke(row.path);
        });
      }
      if (this.map.landHatching && this.landHatchRows) {
        this.landHatchRows.forEach((row, k) => {
          ctx.setLineDash([4.2, 2.6]); // slightly tighter dashes on the land side
          ctx.lineDashOffset = k * 2.3 + 1.4;
          ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},${row.alpha})`;
          ctx.stroke(row.path);
        });
      }
      ctx.restore();
    }
    // Coastline: fountain-pen ink — a thin, dark pen line, not a fat marker band.
    // coastPath is double-ring geometry with different jitter, so a thin stroke reads as a pen passing twice.
    if (this.coastPath) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.12)`;
      ctx.lineWidth = px(2.1);
      ctx.stroke(this.coastPath);
      ctx.strokeStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},0.9)`;
      ctx.lineWidth = px(0.95);
      ctx.stroke(this.coastPath);
    }
    if (this.riverLines.length > 0) {
      const ck = pal.coastline;
      const oc = pal.ocean;
      const isInk = this.map.style === "ink";

      // Width: thread-thin at the source → gently thickening downstream.
      // The 3.0 cap leaves headroom so the estuary funnel (width data ×2.2) survives.
      const wAt = (i: number, n: number, wArr: number[]) => {
        const baseW = Math.min(3.0, wArr[Math.min(wArr.length - 1, i)] * 0.5 + 0.1);
        const taper = Math.min(1, i / Math.min(5, n - 1));
        return baseW * taper;
      };

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Per-segment strokes overlap their round-cap alpha and create dotted artefacts → fill a variable-width ribbon in one go
      // Pass 1: pale water-colour wash — mixed with a little ink to desaturate (prevents garish blue capillaries)
      const wr = Math.round(oc[0] * 0.72 + ck[0] * 0.28);
      const wg = Math.round(oc[1] * 0.74 + ck[1] * 0.26);
      const wb = Math.round(oc[2] * 0.78 + ck[2] * 0.22);
      for (const rl of this.riverLines) {
        if (rl.pts.length < 3) continue;
        const n = rl.pts.length;
        ctx.fillStyle = isInk
          ? `rgba(${ck[0]},${ck[1]},${ck[2]},0.06)`
          : `rgba(${wr},${wg},${wb},0.2)`;
        ctx.fill(ribbonPath(rl.pts, (t) => {
          const i = Math.round(t * (n - 1));
          return wAt(i, n, rl.widths) * 1.9 * unit + 0.25;
        }));
      }

      // Pass 2: depth core — deep water colour rather than ink brown (makes the river's centre look deep)
      const dr = Math.round(pal.deep[0] * 0.62);
      const dg = Math.round(pal.deep[1] * 0.66);
      const db = Math.round(pal.deep[2] * 0.78);
      for (const rl of this.riverLines) {
        if (rl.pts.length < 3) continue;
        const n = rl.pts.length;
        ctx.fillStyle = isInk
          ? `rgba(${ck[0]},${ck[1]},${ck[2]},0.34)`
          : `rgba(${dr},${dg},${db},0.5)`;
        ctx.fill(ribbonPath(rl.pts, (t) => {
          const i = Math.round(t * (n - 1));
          return wAt(i, n, rl.widths) * 0.8 * unit + 0.15;
        }));
      }
    }
  }

  /** Rhumb lines (radiating from the compass) — shared by draw() and exportPNG. Call within a world-space context */
  private drawRhumbLines(ctx: CanvasRenderingContext2D, W: number, H: number, s: number, pal: Palette): void {
    if (!this.map.showRhumbLines) return;
    const compasses = this.map.ornaments.filter((orn) => orn.type === "compass");
    if (compasses.length === 0) return;
    ctx.save();
    ctx.lineWidth = Math.max(0.3, 0.55 / s);
    const R_max = Math.max(W, H) * 2.2;
    const cl = pal.coastline;
    const inkRGB = `rgba(${cl[0]},${cl[1]},${cl[2]}`;
    const isColor = this.map.style === "color";
    const isInk = this.map.style === "ink";
    for (const comp of compasses) {
      const ccx = comp.x * W, ccy = comp.y * H;
      for (let d = 0; d < 32; d++) {
        const rad = (d * Math.PI * 2) / 32;
        const dx = Math.cos(rad) * R_max, dy = Math.sin(rad) * R_max;
        if (d % 8 === 0) {
          ctx.strokeStyle = `${inkRGB},0.42)`;
        } else if (d % 4 === 0) {
          ctx.strokeStyle = `${inkRGB},0.30)`;
        } else if (d % 2 === 0) {
          ctx.strokeStyle = isColor ? "rgba(42,90,138,0.28)" : (isInk ? `${inkRGB},0.22)` : "rgba(80,105,70,0.26)");
        } else {
          ctx.strokeStyle = isColor ? "rgba(138,28,28,0.22)" : (isInk ? `${inkRGB},0.16)` : "rgba(128,60,45,0.20)");
        }
        ctx.beginPath();
        ctx.moveTo(ccx, ccy);
        ctx.lineTo(ccx + dx, ccy + dy);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── Full-map pixel cache ─────────────────────────────

  /** Schedule a full-map re-render when terrain data changes. Never called for pan/zoom. */
  private scheduleDetail(): void {
    this.cacheValid = false;
    if (this.detailTimer) window.clearTimeout(this.detailTimer);
    if (this.map.mode !== "generated" || this.map.fastRender) return;
    this.detailTimer = window.setTimeout(() => {
      this.detailTimer = null;
      this.renderDetail();
    }, 180);
  }

  /**
   * Render the entire map once at CACHE_SCALE and store it in fullDetailCanvas.
   * From then on, pan/zoom/scroll just crop this canvas in draw() — no flicker.
   */
  private renderDetail(): void {
    const t = this.terrain, cls = this.classifier;
    if (!t || !cls || this.map.mode !== "generated") { this.cacheValid = false; return; }

    const SCALE = 3; // pixels per cell (512×384 → 1536×1152 cache)
    const CW = t.w * SCALE, CH = t.h * SCALE;

    if (!this.fullDetailCanvas) this.fullDetailCanvas = document.createElement("canvas");
    const dc = this.fullDetailCanvas;
    dc.width = CW; dc.height = CH;
    const dctx = dc.getContext("2d")!;
    const img = dctx.createImageData(CW, CH);
    const px = img.data;

    const pal = getPalette(this.map.style, this.map.styleColors);
    const W = t.w, H = t.h, sea = t.seaLevel;
    const relief = this.map.texture.relief ?? 1;
    const mottleAmt = this.map.texture.mottle ?? 1;
    const grain = pal.paperGrain;

    const hAt = (cx: number, cy: number): number => {
      const x0 = Math.max(0, Math.min(W - 1, Math.floor(cx))), y0 = Math.max(0, Math.min(H - 1, Math.floor(cy)));
      const x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
      const tx = cx - x0, ty = cy - y0;
      const a = t.height[y0 * W + x0], b = t.height[y0 * W + x1], c = t.height[y1 * W + x0], d = t.height[y1 * W + x1];
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    };

    // Shoreline highlight parameters (identical to the base render's paintBaseRect)
    const coastW2 = Math.max(0, Math.min(12, Math.round(this.map.coastWidth ?? 0)));
    const coastRGB2: [number, number, number] = (this.map.coastColor && hexToRGB(this.map.coastColor)) ||
      [Math.min(255, pal.ocean[0] * 1.16), Math.min(255, pal.ocean[1] * 1.14), Math.min(255, pal.ocean[2] * 1.1)];

    // Water distance field for coastal concentric rings (cell resolution → bilinear sample, 255 sentinel clamped)
    const wd = this.layers ? this.layers.waterDist : null;
    const dAt = (cx: number, cy: number): number => {
      if (!wd) return 255;
      const x0 = Math.max(0, Math.min(W - 1, Math.floor(cx))), y0 = Math.max(0, Math.min(H - 1, Math.floor(cy)));
      const x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
      const tx = cx - x0, ty = cy - y0;
      const M = Math.max(COAST_RING_MAX, coastW2 * 3) + 2;
      const a = Math.min(M, wd[y0 * W + x0]), b = Math.min(M, wd[y0 * W + x1]);
      const c = Math.min(M, wd[y1 * W + x0]), d = Math.min(M, wd[y1 * W + x1]);
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    };

    const biomeColorAt = (cx: number, cy: number): [number, number, number] => {
      let rSum = 0, gSum = 0, bSum = 0, wSum = 0;
      const xCenter = Math.round(cx), yCenter = Math.round(cy);
      for (let dy = -1; dy <= 1; dy++) {
        const y = Math.max(0, Math.min(H - 1, yCenter + dy));
        const distY = cy - y;
        for (let dx = -1; dx <= 1; dx++) {
          const x = Math.max(0, Math.min(W - 1, xCenter + dx));
          const distX = cx - x;
          const weight = Math.exp(-(distX * distX + distY * distY) * 1.4);
          const col = biomeColor(pal, t.biome[y * W + x]);
          rSum += col[0] * weight; gSum += col[1] * weight; bSum += col[2] * weight; wSum += weight;
        }
      }
      return [rSum / wSum, gSum / wSum, bSum / wSum];
    };

    for (let j = 0; j < CH; j++) {
      const cyf = j / SCALE;
      for (let i = 0; i < CW; i++) {
        const cxf = i / SCALE;
        const o = (j * CW + i) * 4;
        const el = hAt(cxf, cyf);
        const ci = Math.min(H - 1, Math.round(cyf)) * W + Math.min(W - 1, Math.round(cxf));
        const col = biomeColorAt(cxf, cyf);
        let r: number, g: number, bl: number;

        if (el < sea || t.lake[ci]) {
          // Same water-colour rules as the base render: ramp compression + fixed mid-depth lakes + shoreline highlight
          const rawDepth = Math.min(1, Math.max(0, (sea - el) / 0.25));
          const depth = t.lake[ci] ? 0.4 : 0.22 + 0.78 * Math.pow(rawDepth, 0.7);
          r = col[0] + (pal.deep[0] - pal.ocean[0]) * depth;
          g = col[1] + (pal.deep[1] - pal.ocean[1]) * depth;
          bl = col[2] + (pal.deep[2] - pal.ocean[2]) * depth;
          const dHere = dAt(cxf, cyf);
          if (coastW2 > 0 && !t.lake[ci] && dHere <= coastW2 * 3) {
            const f = Math.exp(-(dHere - 1) / (coastW2 * 0.9)) * 0.38;
            r += (coastRGB2[0] - r) * f;
            g += (coastRGB2[1] - g) * f;
            bl += (coastRGB2[2] - bl) * f;
          }
          // Surface grain + coastal concentric rings (same antique-map detail as the base render)
          const ex = oceanExtraShade(cxf, cyf, dHere);
          r += ex; g += ex * 0.98; bl += ex * 0.9;
        } else {
          const hl = hAt(cxf - 1 / SCALE, cyf), hu = hAt(cxf, cyf - 1 / SCALE);
          const shade = 1 + (hl - el + hu - el) * 4.2 * relief;
          const sc = Math.min(1 + 0.22 * relief, Math.max(1 - 0.22 * relief, shade));
          r = col[0] * sc; g = col[1] * sc; bl = col[2] * sc;
          if (t.biome[ci] !== B.SNOW) {
            const wash = landWash(cxf, cyf);
            r += wash[0]; g += wash[1]; bl += wash[2];
          }
        }
        const isWater = el < sea || t.lake[ci];
        const mottleScale = isWater ? 0.45 : 1.0;
        const mottle = (smoothVal(cxf + 300, cyf + 300, 13) - 0.5) * 22 * mottleAmt * mottleScale;
        r += mottle; g += mottle * 0.95; bl += mottle * 0.82;
        if (grain > 0) {
          const gg = (hash2(i + 9973, j + 7691) - 0.5) * grain * (isWater ? 0.5 : 1.0);
          r += gg; g += gg; bl += gg;
        }
        px[o]     = r  < 0 ? 0 : r  > 255 ? 255 : r;
        px[o + 1] = g  < 0 ? 0 : g  > 255 ? 255 : g;
        px[o + 2] = bl < 0 ? 0 : bl > 255 ? 255 : bl;
        px[o + 3] = 255;
      }
    }
    dctx.putImageData(img, 0, 0);

    // Bake the stamps and vector lines permanently into the canvas
    if (this.layers) {
      dctx.save();
      dctx.scale(SCALE, SCALE);
      // Stamps (trees, mountains)
      dctx.drawImage(this.layers.stamps, 0, 0, W, H);
      // Vector lines (coastline, contours, rivers)
      // SCALE is already applied, so pass unit = 1 to render at 1× proportions
      this.drawVectorLines(dctx, pal, 1);
      dctx.restore();
    }

    this.cacheValid = true;
    this.draw();
  }

  // ── Instant brush (incremental updates) ──────────────

  /** Recompute terrain & pixels for the brushed area only — a few ms mid-stroke for instant feedback */
  private patchRect(r: Rect): void {
    if (!this.terrain || !this.baseHeight || !this.classifier || !this.layers) return;
    updateTerrainRect(
      this.terrain, this.map, this.baseHeight, this.edits, this.paint,
      this.classifier, r.x0, r.y0, r.x1, r.y1,
    );
    updateLayersRect(this.layers, this.terrain, this.map.style, this.renderOpts(), r.x0, r.y0, r.x1, r.y1);
    this.cacheValid = false; // cache is invalid whilst editing → scheduleDetail re-renders once the brush lifts
    this.draw();
    this.scheduleFinalize();
  }

  /** Full recomputation, including rivers and contours, after the brush lifts */
  private scheduleFinalize(): void {
    if (this.finalizeTimer) window.clearTimeout(this.finalizeTimer);
    this.finalizeTimer = window.setTimeout(() => {
      this.finalizeTimer = null;
      this.regenerate();
    }, 350);
  }

  private brushRect(sx: number, sy: number): Rect | null {
    const W = this.map.width, H = this.map.height;
    const wpos = this.toWorld(sx, sy);
    const cx = wpos.x * W, cy = wpos.y * H;
    const r = this.brushRadius / this.cam.scale;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
    if (x0 > x1 || y0 > y1) return null;
    return { x0, y0, x1, y1 };
  }

  private applyBrush(sx: number, sy: number): void {
    const rect = this.brushRect(sx, sy);
    if (!rect) return;
    if (!this.edits) this.edits = new Int8Array(this.map.width * this.map.height);
    const W = this.map.width;
    const wpos = this.toWorld(sx, sy);
    const cx = wpos.x * W, cy = wpos.y * this.map.height;
    const r = this.brushRadius / this.cam.scale;
    const sign = this.tool === "raise" ? 1 : -1;
    for (let y = rect.y0; y <= rect.y1; y++) {
      for (let x = rect.x0; x <= rect.x1; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > r) continue;
        const fall = Math.cos((d / r) * Math.PI * 0.5);
        const i = y * W + x;
        this.edits[i] = clampI8(this.edits[i] + sign * fall * 4);
      }
    }
    this.patchRect(rect);
  }

  /** Biome paint — when water↔land flips, the elevation delta is corrected as well */
  private applyPaintBrush(sx: number, sy: number): void {
    if (!this.terrain) return;
    const rect = this.brushRect(sx, sy);
    if (!rect) return;
    const W = this.map.width, H = this.map.height;
    if (!this.paint) this.paint = new Uint8Array(W * H);
    if (!this.edits) this.edits = new Int8Array(W * H);
    const wpos = this.toWorld(sx, sy);
    const cx = wpos.x * W, cy = wpos.y * H;
    const r = this.brushRadius / this.cam.scale;
    const sea = this.map.gen.seaLevel;
    const toWater = this.paintBiome === B.OCEAN;

    for (let y = rect.y0; y <= rect.y1; y++) {
      for (let x = rect.x0; x <= rect.x1; x++) {
        if (Math.hypot(x - cx, y - cy) > r) continue;
        const i = y * W + x;
        if (this.paintErase) { this.paint[i] = 0; continue; }
        this.paint[i] = this.paintBiome + 1;
        const cur = this.terrain.height[i];
        if (toWater && cur >= sea) {
          this.edits[i] = clampI8(this.edits[i] - Math.ceil((cur - (sea - 0.05)) * 254));
        } else if (!toWater && cur < sea) {
          this.edits[i] = clampI8(this.edits[i] + Math.ceil(((sea + 0.04) - cur) * 254));
        }
      }
    }
    this.patchRect(rect);
  }

  // ── Image mode ───────────────────────────────────────

  private async loadBaseImage(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(`이미지를 찾을 수 없습니다: ${path}`);
      return;
    }
    const buf = await this.app.vault.readBinary(file);
    if (this.imageUrl) URL.revokeObjectURL(this.imageUrl);
    this.imageUrl = URL.createObjectURL(new Blob([buf]));
    const img = new Image();
    img.onload = () => {
      this.baseImage = img;
      this.map.width = img.naturalWidth;
      this.map.height = img.naturalHeight;
      this.terrain = null;
      this.layers = null;
      this.fitCameraOnce();
      this.draw();
    };
    img.src = this.imageUrl;
  }

  private worldSize(): { w: number; h: number } {
    if (this.map.mode === "image" && this.baseImage) {
      return { w: this.baseImage.naturalWidth, h: this.baseImage.naturalHeight };
    }
    return { w: this.map.width, h: this.map.height };
  }

  private viewSize(): { w: number; h: number } {
    return { w: this.rootEl.clientWidth, h: this.rootEl.clientHeight };
  }

  private fitCameraOnce(): void {
    if (this.camFitted) return;
    const { w: vw, h: vh } = this.viewSize();
    if (vw === 0 || vh === 0) return;
    const { w, h } = this.worldSize();
    const scale = Math.min(vw / w, vh / h) * 0.92;
    this.cam.scale = scale;
    this.cam.x = (vw - w * scale) / 2;
    this.cam.y = (vh - h * scale) / 2;
    this.camFitted = true;
  }

  private handleResize(): void {
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = this.viewSize();
    this.canvasEl.width = Math.max(1, Math.round(w * dpr));
    this.canvasEl.height = Math.max(1, Math.round(h * dpr));
    this.canvasEl.style.width = `${w}px`;
    this.canvasEl.style.height = `${h}px`;
    this.fitCameraOnce();
    this.draw();
    // Window resizing doesn't change terrain data, so no cache re-render is needed
  }

  // ── Drawing ──────────────────────────────────────────

  private draw(): void {
    const dpr = window.devicePixelRatio || 1;
    const { w: vw, h: vh } = this.viewSize();
    if (vw === 0 || vh === 0) return;
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = this.map.style === "color" ? "#171c24" : "#3a362f";
    ctx.fillRect(0, 0, vw, vh);

    const { w: W, h: H } = this.worldSize();
    const { x: ox, y: oy, scale: s } = this.cam;
    const pal = getPalette(this.map.style, this.map.styleColors);
    const ink = `rgb(${pal.coastline[0]},${pal.coastline[1]},${pal.coastline[2]})`;

    // If the full-map cache is valid, crop the right region via the camera transform (no re-render)
    const useCache = this.cacheValid && this.fullDetailCanvas !== null && !this.map.fastRender;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    ctx.imageSmoothingEnabled = true;

    if (this.map.mode === "image" && this.baseImage) {
      ctx.drawImage(this.baseImage, 0, 0);
    } else if (this.layers) {
      if (useCache) {
        // Crop-draw only the region of the full-map cache under the current viewport
        // fullDetailCanvas is at SCALE=3: cell coordinate × 3 = cache pixel coordinate
        ctx.restore();
        // Reset the transform to draw directly in physical pixels
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const SCALE = 3;
        const cdc = this.fullDetailCanvas!;
        // Cell range the camera currently shows
        const cellX0 = -ox / s, cellY0 = -oy / s;
        const cellX1 = cellX0 + vw / s, cellY1 = cellY0 + vh / s;
        // Cache coordinate range (clamped)
        const sx = Math.max(0, cellX0 * SCALE);
        const sy = Math.max(0, cellY0 * SCALE);
        const sx2 = Math.min(cdc.width, cellX1 * SCALE);
        const sy2 = Math.min(cdc.height, cellY1 * SCALE);
        
        // Screen destination (in physical pixels)
        const dstX = ((sx / SCALE) * s + ox) * dpr;
        const dstY = ((sy / SCALE) * s + oy) * dpr;
        const dstW = ((sx2 - sx) / SCALE) * s * dpr;
        const dstH = ((sy2 - sy) / SCALE) * s * dpr;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        if (dstW > 0 && dstH > 0) ctx.drawImage(cdc, sx, sy, sx2 - sx, sy2 - sy, dstX, dstY, dstW, dstH);
        
        // Restore the default CSS-pixel transform for vector rendering
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(s, s);
        ctx.imageSmoothingEnabled = true;
      } else {
        ctx.drawImage(this.layers.base, 0, 0);
        ctx.drawImage(this.layers.stamps, 0, 0, this.map.width, this.map.height);
        this.drawVectorLines(ctx, pal, s);
      }

      // Draw the rhumb lines (radiating from the compass centre)
      this.drawRhumbLines(ctx, W, H, s, pal);

      drawMapEffects(ctx, W, H, s, pal.coastline, this.map.decor, this.map.style);
      if (this.map.showGrid) drawCoordinateGrid(ctx, W, H, s, pal.coastline);
    } else if (this.map.mode === "image" && this.baseImage && this.map.showGrid) {
      drawCoordinateGrid(ctx, W, H, s, pal.coastline);
    }
    ctx.restore();

    // Screen-resolution paper-grain overlay (brush-pen texture independent of zoom — pans with the map)
    this.applyPaperGrain(ctx, ox, oy, vw, vh);

    // Layer order: regions → drawings/lines/arrows → placed elements (stickers, text) → markers on top
    // (markers are information, so decorative stickers never cover them)
    this.drawRegions(ctx, W, H, s, ox, oy);
    this.drawAnnotations(ctx, W, H, s, ox, oy);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    this.ensureStickerImages();
    this.ornBoxes = drawOrnaments(ctx, this.map.ornaments, W, H, s, pal.coastline, this.map.style, this.stickerImages);
    ctx.restore();

    this.drawMarkers(ctx, W, H, s, ox, oy, vw, vh);
    this.drawOrnSelection(ctx, W, H, s, ox, oy);
    this.drawOverlays(ctx, W, H, s, ox, oy);
    this.refreshOrnListActive();
  }

  private grainPattern: CanvasPattern | null = null;

  /** Lay the paper grain in screen space, offset by the pan so the paper appears stuck to the map */
  private applyPaperGrain(ctx: CanvasRenderingContext2D, ox: number, oy: number, vw: number, vh: number): void {
    if (this.map.mode !== "generated") return;
    if (!this.grainPattern) {
      this.grainPattern = ctx.createPattern(paperGrainTile(), "repeat");
    }
    if (!this.grainPattern) return;
    const g = this.map.texture.grain ?? 0.5;
    if (g <= 0.001) return;
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = Math.min(1, g);
    const offx = ((ox % GRAIN_TILE) + GRAIN_TILE) % GRAIN_TILE;
    const offy = ((oy % GRAIN_TILE) + GRAIN_TILE) % GRAIN_TILE;
    ctx.translate(offx - GRAIN_TILE, offy - GRAIN_TILE);
    ctx.fillStyle = this.grainPattern;
    ctx.fillRect(0, 0, vw + GRAIN_TILE * 2, vh + GRAIN_TILE * 2);
    ctx.restore();
  }

  /** Dashed box + resize handle for the selected placed element (screen coordinates) */
  private drawOrnSelection(
    ctx: CanvasRenderingContext2D, W: number, H: number, s: number, ox: number, oy: number,
  ): void {
    if (!this.selectedOrnId) return;
    const box = this.ornBoxes.get(this.selectedOrnId);
    if (!box) return;
    const x = box.x * s + ox, y = box.y * s + oy;
    const w = box.w * s, h = box.h * s;
    ctx.strokeStyle = "rgba(232,182,76,0.95)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
    ctx.setLineDash([]);
    // Resize handle (bottom right)
    ctx.fillStyle = "#e8b64c";
    ctx.strokeStyle = "#3a3226";
    ctx.beginPath();
    ctx.rect(x + w - 1, y + h - 1, 9, 9);
    ctx.fill();
    ctx.stroke();
  }

  private drawRegions(
    ctx: CanvasRenderingContext2D, W: number, H: number, s: number, ox: number, oy: number,
  ): void {
    for (const rg of this.map.regions) {
      if (rg.points.length < 3) continue;
      const selected = rg.id === this.selectedRegionId;
      ctx.beginPath();
      rg.points.forEach(([px, py], idx) => {
        const sx = px * W * s + ox, sy = py * H * s + oy;
        idx === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.fillStyle = hexToRgba(rg.color, selected ? 0.28 : 0.18);
      ctx.fill();
      // Dark underline (always visible) with a coloured dashed line on top → the border holds on any background or colour
      ctx.strokeStyle = "rgba(28,22,14,0.5)";
      ctx.lineWidth = (selected ? 2.6 : 2) + 1.6;
      ctx.stroke();
      ctx.strokeStyle = hexToRgba(rg.color, 0.95);
      ctx.lineWidth = selected ? 2.6 : 2;
      ctx.setLineDash([7, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Label (serif subheading style)
      const [cx, cy] = centroid(rg.points);
      const lx = cx * W * s + ox, ly = cy * H * s + oy;
      ctx.font = `600 13px ${FONT_SERIF}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const tw = ctx.measureText(rg.name).width;
      ctx.fillStyle = "rgba(28,24,18,0.72)";
      ctx.fillRect(lx - tw / 2 - 7, ly - 10, tw + 14, 20);
      ctx.fillStyle = "#f0e8d4";
      ctx.fillText(rg.name, lx, ly);
      // Vertex handles for the selected region
      if (selected) {
        for (const [px, py] of rg.points) {
          const hx = px * W * s + ox, hy = py * H * s + oy;
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = rg.color;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.rect(hx - 4, hy - 4, 8, 8);
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    // Preview whilst drawing a region
    if (this.drawingRegion && this.drawingRegion.length > 0) {
      ctx.beginPath();
      this.drawingRegion.forEach(([px, py], idx) => {
        const sx = px * W * s + ox, sy = py * H * s + oy;
        idx === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      });
      ctx.strokeStyle = "#e8b64c";
      ctx.lineWidth = 2;
      ctx.stroke();
      for (const [px, py] of this.drawingRegion) {
        ctx.beginPath();
        ctx.arc(px * W * s + ox, py * H * s + oy, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#e8b64c";
        ctx.fill();
      }
    }
  }

  private drawAnnotations(
    ctx: CanvasRenderingContext2D, W: number, H: number, s: number, ox: number, oy: number,
  ): void {
    const list = this.currentAnno ? [...this.map.annotations, this.currentAnno] : this.map.annotations;
    for (const a of list) {
      if (a.points.length < 2) continue;
      const px = a.points.map(([x, y]) => [x * W * s + ox, y * H * s + oy] as [number, number]);
      // Selection highlight
      if (a.id === this.selectedAnnoId) {
        ctx.save();
        ctx.strokeStyle = "rgba(232,182,76,0.6)";
        ctx.lineWidth = a.width * s + 6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const hp = new Path2D();
        px.forEach(([x, y], i) => (i === 0 ? hp.moveTo(x, y) : hp.lineTo(x, y)));
        ctx.stroke(hp);
        ctx.restore();
      }
      strokeAnnotationPx(ctx, a, px, a.width * s);
    }
  }

  /**
   * Marker badge diameter (px). Proportional to the map (WYSIWYG) — unit = screen px per cell.
   * The editor (unit = cam.scale) and export (unit = export scale) share the same formula.
   */
  private markerSizePx(m: Marker, unit: number): number {
    const { w: W, h: H } = this.worldSize();
    const base = Math.min(W, H) * 0.03 * (this.map.texture.markerScale ?? 1) * (m.size ?? 1);
    return base * unit;
  }

  /** Draw one marker in pixel space (shared by editor & export) */
  private paintMarker(
    ctx: CanvasRenderingContext2D, m: Marker, sx: number, sy: number, size: number, bold: boolean,
  ): void {
    drawMarkerIcon(ctx, m.icon, sx, sy, size, m.color, this.map.style);
    if (m.name) {
      // Name tag: a place name written directly on the map instead of a box — paper halo + ink serif + letter spacing
      const fs = Math.max(9, size * 0.44);
      const pal = getPalette(this.map.style, this.map.styleColors);
      const cl = pal.coastline;
      const y = sy + size * 0.18 + fs * 0.62;

      ctx.save();
      ctx.font = `${bold ? "700" : "600"} ${fs}px ${FONT_SERIF}`;
      try { (ctx as unknown as { letterSpacing: string }).letterSpacing = `${fs * 0.1}px`; } catch { /* ignore if unsupported */ }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      // Paper-coloured halo (keeps the text readable over terrain)
      ctx.strokeStyle = this.map.style === "color" ? "rgba(250,252,255,0.85)" : "rgba(244,236,214,0.85)";
      ctx.lineWidth = Math.max(2.5, fs * 0.3);
      ctx.strokeText(m.name, sx, y);
      ctx.fillStyle = `rgba(${cl[0]},${cl[1]},${cl[2]},${bold ? 1 : 0.92})`;
      ctx.fillText(m.name, sx, y);
      ctx.restore();
    }
  }

  private drawMarkers(
    ctx: CanvasRenderingContext2D, W: number, H: number, s: number,
    ox: number, oy: number, vw: number, vh: number,
  ): void {
    for (const m of this.map.markers) {
      const sx = m.x * W * s + ox, sy = m.y * H * s + oy;
      if (sx < -80 || sy < -80 || sx > vw + 80 || sy > vh + 80) continue;
      const hover = m.id === this.hoverMarkerId;
      let size = this.markerSizePx(m, s) * (hover ? 1.12 : 1);
      // The marker pulses during a focus flash
      if (this.flash && Math.abs(this.flash.x - m.x) < 1e-6 && Math.abs(this.flash.y - m.y) < 1e-6) {
        const el = (performance.now() - this.flash.t0) / 1000;
        size += Math.max(0, Math.sin(el * Math.PI * 3) * size * 0.3 * (1 - el / 2.2));
      }
      this.paintMarker(ctx, m, sx, sy, size, hover);
    }
  }

  private drawOverlays(
    ctx: CanvasRenderingContext2D, W: number, H: number, s: number, ox: number, oy: number,
  ): void {
    // Focus flash: layered ripple rings + glow
    if (this.flash) {
      const el = (performance.now() - this.flash.t0) / 2200;
      if (el < 1) {
        const sx = this.flash.x * W * s + ox, sy = this.flash.y * H * s + oy - 17;
        for (let k = 0; k < 3; k++) {
          const p = el * 1.4 - k * 0.18;
          if (p < 0 || p > 1) continue;
          ctx.beginPath();
          ctx.arc(sx, sy, 14 + p * 52, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(232,182,76,${(1 - p) * 0.9})`;
          ctx.lineWidth = 3.2 - p * 2;
          ctx.stroke();
        }
        const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 34);
        g.addColorStop(0, `rgba(232,182,76,${0.32 * (1 - el)})`);
        g.addColorStop(1, "rgba(232,182,76,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, 34, 0, Math.PI * 2);
        ctx.fill();
        window.requestAnimationFrame(() => this.draw());
      } else {
        this.flash = null;
      }
    }

    // Brush cursor
    if ((this.tool === "raise" || this.tool === "lower" || this.tool === "paint") && this.map.mode === "generated") {
      ctx.beginPath();
      ctx.arc(this.lastPointer.x, this.lastPointer.y, this.brushRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(232,182,76,0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // ── Coordinates / hit testing ────────────────────────

  private toWorld(sx: number, sy: number): { x: number; y: number } {
    const { w: W, h: H } = this.worldSize();
    return {
      x: (sx - this.cam.x) / this.cam.scale / W,
      y: (sy - this.cam.y) / this.cam.scale / H,
    };
  }

  private hitMarker(sx: number, sy: number): Marker | null {
    const { w: W, h: H } = this.worldSize();
    for (let i = this.map.markers.length - 1; i >= 0; i--) {
      const m = this.map.markers[i];
      const sizePx = this.markerSizePx(m, this.cam.scale);
      const mx = m.x * W * this.cam.scale + this.cam.x;
      const my = m.y * H * this.cam.scale + this.cam.y;
      // Badge centre sits size*0.78 above the anchor; hit radius = badge radius + margin
      if (Math.hypot(sx - mx, sy - (my - sizePx * 0.78)) < Math.max(12, sizePx * 0.7)) return m;
    }
    return null;
  }

  private hitRegion(x: number, y: number): Region | null {
    for (let i = this.map.regions.length - 1; i >= 0; i--) {
      if (pointInPolygon(x, y, this.map.regions[i].points)) return this.map.regions[i];
    }
    return null;
  }

  /** Eraser: delete the annotation under the cursor */
  private eraseAnnoAt(sx: number, sy: number): void {
    const a = this.hitAnnotation(sx, sy);
    if (a) {
      this.map.annotations = this.map.annotations.filter((an) => an.id !== a.id);
      if (this.selectedAnnoId === a.id) this.selectedAnnoId = null;
      this.persist();
    }
  }

  /** Annotation (drawing) hit test (screen coordinates) */
  private hitAnnotation(sx: number, sy: number): Annotation | null {
    const { w: W, h: H } = this.worldSize();
    const s = this.cam.scale;
    for (let i = this.map.annotations.length - 1; i >= 0; i--) {
      const a = this.map.annotations[i];
      const px = a.points.map(([x, y]) => [x * W * s + this.cam.x, y * H * s + this.cam.y] as [number, number]);
      if (px.length >= 2 && distToPolyline(sx, sy, px) < Math.max(7, a.width * s * 0.6 + 5)) return a;
    }
    return null;
  }

  /** Placed-element hit test (screen coordinates → world bbox) */
  private hitOrnament(sx: number, sy: number): Ornament | null {
    const { w: W, h: H } = this.worldSize();
    void W; void H;
    const wx = (sx - this.cam.x) / this.cam.scale;
    const wy = (sy - this.cam.y) / this.cam.scale;
    for (let i = this.map.ornaments.length - 1; i >= 0; i--) {
      const orn = this.map.ornaments[i];
      const box = this.ornBoxes.get(orn.id);
      if (!box) continue;
      if (wx >= box.x && wx <= box.x + box.w && wy >= box.y && wy <= box.y + box.h) return orn;
    }
    return null;
  }

  /** Hit test for the selected element's resize handle (screen coordinates) */
  private hitOrnHandle(sx: number, sy: number): Ornament | null {
    if (!this.selectedOrnId) return null;
    const orn = this.map.ornaments.find((o) => o.id === this.selectedOrnId);
    const box = orn ? this.ornBoxes.get(orn.id) : null;
    if (!orn || !box) return null;
    const hx = (box.x + box.w) * this.cam.scale + this.cam.x;
    const hy = (box.y + box.h) * this.cam.scale + this.cam.y;
    return Math.hypot(sx - hx - 4, sy - hy - 4) < 10 ? orn : null;
  }

  /** Hit test for the selected region's vertices (screen coordinates) */
  private hitRegionVertex(sx: number, sy: number): { region: Region; idx: number } | null {
    if (!this.selectedRegionId) return null;
    const rg = this.map.regions.find((r) => r.id === this.selectedRegionId);
    if (!rg) return null;
    const { w: W, h: H } = this.worldSize();
    for (let i = 0; i < rg.points.length; i++) {
      const hx = rg.points[i][0] * W * this.cam.scale + this.cam.x;
      const hy = rg.points[i][1] * H * this.cam.scale + this.cam.y;
      if (Math.hypot(sx - hx, sy - hy) < 8) return { region: rg, idx: i };
    }
    return null;
  }

  // ── Events ───────────────────────────────────────────

  private bindEvents(): void {
    const el = this.canvasEl;

    this.registerDomEvent(el, "wheel", (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const ns = Math.min(40, Math.max(0.05, this.cam.scale * factor));
      this.cam.x = mx - (mx - this.cam.x) * (ns / this.cam.scale);
      this.cam.y = my - (my - this.cam.y) * (ns / this.cam.scale);
      this.cam.scale = ns;
      this.draw();
      // Zooming doesn't change terrain data, so the cache stays valid — no re-render
    }, { passive: false });

    this.registerDomEvent(el, "pointerdown", (e: PointerEvent) => {
      if (e.button === 2) return;
      el.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      this.lastPointer = { x: sx, y: sy };
      this.dragMoved = false;

      if (this.tool === "select") {
        const m = this.hitMarker(sx, sy);
        if (m) { this.dragMode = "marker"; this.dragMarkerId = m.id; return; }
        // Placed elements: resize handle first, then the body
        const handleOrn = this.hitOrnHandle(sx, sy);
        if (handleOrn) {
          const box = this.ornBoxes.get(handleOrn.id)!;
          const ccx = (box.x + box.w / 2) * this.cam.scale + this.cam.x;
          const ccy = (box.y + box.h / 2) * this.cam.scale + this.cam.y;
          this.dragMode = "ornResize";
          this.dragOrnId = handleOrn.id;
          this.ornStart = {
            x: ccx, y: ccy, sizeF: handleOrn.sizeF,
            dist: Math.max(4, Math.hypot(sx - ccx, sy - ccy)),
          };
          return;
        }
        const orn = this.hitOrnament(sx, sy);
        if (orn) {
          this.selectedOrnId = orn.id;
          this.selectedRegionId = null;
          this.dragMode = "ornMove";
          this.dragOrnId = orn.id;
          this.dragStartWorld = this.toWorld(sx, sy);
          this.ornStart = { x: orn.x, y: orn.y, sizeF: orn.sizeF, dist: 1 };
          this.setHint("드래그: 이동 · 모서리 핸들: 크기 · 더블클릭: 텍스트 편집 · Delete: 삭제");
          this.draw();
          return;
        }
        const vtx = this.hitRegionVertex(sx, sy);
        if (vtx) {
          this.dragMode = "regionVertex";
          this.dragRegionId = vtx.region.id;
          this.dragVertexIdx = vtx.idx;
          return;
        }
        const wpos = this.toWorld(sx, sy);
        const rg = this.hitRegion(wpos.x, wpos.y);
        if (rg) {
          this.selectedRegionId = rg.id;
          this.dragMode = "regionMove";
          this.dragRegionId = rg.id;
          this.dragStartWorld = wpos;
          this.dragOrigPoints = rg.points.map((p) => [...p] as [number, number]);
          this.setHint("지역 드래그: 이동 · 꼭짓점 드래그: 모양 수정 · 우클릭: 메뉴");
          this.draw();
          return;
        }
        // Annotation (drawing) hit → select & move
        const anno = this.hitAnnotation(sx, sy);
        if (anno) {
          this.selectedAnnoId = anno.id;
          this.selectedRegionId = null;
          this.selectedOrnId = null;
          this.dragMode = "annoMove";
          this.dragAnnoId = anno.id;
          this.dragStartWorld = this.toWorld(sx, sy);
          this.dragAnnoOrig = anno.points.map((p) => [...p] as [number, number]);
          this.setHint("드래그: 이동 · Delete: 삭제");
          this.draw();
          return;
        }
        if (this.selectedRegionId || this.selectedOrnId || this.selectedAnnoId) {
          this.selectedRegionId = null;
          this.selectedOrnId = null;
          this.selectedAnnoId = null;
          this.draw();
        }
        this.dragMode = "pan";
        return;
      }
      if (this.tool === "marker") {
        const wpos = this.toWorld(sx, sy);
        if (wpos.x < 0 || wpos.y < 0 || wpos.x > 1 || wpos.y > 1) return;
        this.addMarkerAt(wpos.x, wpos.y);
        return;
      }
      if (this.tool === "region") {
        const wpos = this.toWorld(sx, sy);
        if (!this.drawingRegion) this.drawingRegion = [];
        this.drawingRegion.push([wpos.x, wpos.y]);
        this.setHint("꼭짓점 " + this.drawingRegion.length + "개 — 더블클릭/Enter로 완성, Esc로 취소");
        this.draw();
        return;
      }
      if ((this.tool === "draw" || this.tool === "arrow") && this.drawErase) {
        this.dragMode = "annoErase";
        this.eraseAnnoAt(sx, sy);
        return;
      }
      if (this.tool === "draw" || this.tool === "arrow") {
        const wpos = this.toWorld(sx, sy);
        this.currentAnno = {
          id: newId(),
          kind: this.tool === "arrow" ? "arrow" : "free",
          points: [[wpos.x, wpos.y]],
          color: this.drawColor,
          width: this.drawWidth,
          dashed: this.drawDashed,
        };
        this.dragMode = "anno";
        return;
      }
      if (this.tool === "raise" || this.tool === "lower" || this.tool === "paint") {
        if (this.map.mode !== "generated") {
          new Notice("이미지 지도에서는 지형 편집을 사용할 수 없습니다.");
          return;
        }
        this.dragMode = "brush";
        this.tool === "paint" ? this.applyPaintBrush(sx, sy) : this.applyBrush(sx, sy);
      }
    });

    this.registerDomEvent(el, "pointermove", (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const dx = sx - this.lastPointer.x, dy = sy - this.lastPointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) this.dragMoved = true;
      const { w: W, h: H } = this.worldSize();

      switch (this.dragMode) {
        case "pan":
          this.cam.x += dx; this.cam.y += dy;
          this.lastPointer = { x: sx, y: sy };
          this.draw();
          return;
        case "marker": {
          const m = this.map.markers.find((mm) => mm.id === this.dragMarkerId);
          if (m) {
            const wpos = this.toWorld(sx, sy);
            m.x = Math.min(1, Math.max(0, wpos.x));
            m.y = Math.min(1, Math.max(0, wpos.y));
            this.draw();
          }
          this.lastPointer = { x: sx, y: sy };
          return;
        }
        case "regionMove": {
          const rg = this.map.regions.find((r) => r.id === this.dragRegionId);
          if (rg && this.dragOrigPoints) {
            const wpos = this.toWorld(sx, sy);
            const ddx = wpos.x - this.dragStartWorld.x;
            const ddy = wpos.y - this.dragStartWorld.y;
            rg.points = this.dragOrigPoints.map(([px, py]) => [
              Math.min(1, Math.max(0, px + ddx)),
              Math.min(1, Math.max(0, py + ddy)),
            ] as [number, number]);
            this.draw();
          }
          this.lastPointer = { x: sx, y: sy };
          return;
        }
        case "regionVertex": {
          const rg = this.map.regions.find((r) => r.id === this.dragRegionId);
          if (rg && this.dragVertexIdx >= 0 && this.dragVertexIdx < rg.points.length) {
            const wpos = this.toWorld(sx, sy);
            rg.points[this.dragVertexIdx] = [
              Math.min(1, Math.max(0, wpos.x)),
              Math.min(1, Math.max(0, wpos.y)),
            ];
            this.draw();
          }
          this.lastPointer = { x: sx, y: sy };
          return;
        }
        case "ornMove": {
          const orn = this.map.ornaments.find((o) => o.id === this.dragOrnId);
          if (orn) {
            const wpos = this.toWorld(sx, sy);
            orn.x = Math.min(1.1, Math.max(-0.1, this.ornStart.x + wpos.x - this.dragStartWorld.x));
            orn.y = Math.min(1.1, Math.max(-0.1, this.ornStart.y + wpos.y - this.dragStartWorld.y));
            this.draw();
          }
          this.lastPointer = { x: sx, y: sy };
          return;
        }
        case "ornResize": {
          const orn = this.map.ornaments.find((o) => o.id === this.dragOrnId);
          if (orn) {
            const dist = Math.max(4, Math.hypot(sx - this.ornStart.x, sy - this.ornStart.y));
            orn.sizeF = Math.min(0.4, Math.max(0.01, this.ornStart.sizeF * (dist / this.ornStart.dist)));
            this.draw();
          }
          this.lastPointer = { x: sx, y: sy };
          return;
        }
        case "brush":
          this.tool === "paint" ? this.applyPaintBrush(sx, sy) : this.applyBrush(sx, sy);
          this.lastPointer = { x: sx, y: sy };
          return;
        case "anno": {
          if (this.currentAnno) {
            const wpos = this.toWorld(sx, sy);
            if (this.currentAnno.kind === "arrow") {
              this.currentAnno.points = [this.currentAnno.points[0], [wpos.x, wpos.y]];
            } else {
              const last = this.currentAnno.points[this.currentAnno.points.length - 1];
              // Only add a point after moving a minimum distance (smooth and light)
              if (Math.hypot(wpos.x - last[0], wpos.y - last[1]) * this.worldSize().w > 3) {
                this.currentAnno.points.push([wpos.x, wpos.y]);
              }
            }
            this.draw();
          }
          this.lastPointer = { x: sx, y: sy };
          return;
        }
        case "annoErase":
          this.eraseAnnoAt(sx, sy);
          this.lastPointer = { x: sx, y: sy };
          return;
        case "annoMove": {
          const a = this.map.annotations.find((an) => an.id === this.dragAnnoId);
          if (a && this.dragAnnoOrig) {
            const wpos = this.toWorld(sx, sy);
            const ddx = wpos.x - this.dragStartWorld.x, ddy = wpos.y - this.dragStartWorld.y;
            a.points = this.dragAnnoOrig.map(([px, py]) => [px + ddx, py + ddy] as [number, number]);
            this.draw();
          }
          this.lastPointer = { x: sx, y: sy };
          return;
        }
      }

      this.lastPointer = { x: sx, y: sy };
      const m = this.hitMarker(sx, sy);
      const newHover = m?.id ?? null;
      if (newHover !== this.hoverMarkerId) {
        this.hoverMarkerId = newHover;
        el.style.cursor = m ? "pointer" : this.tool === "select" ? "grab" : "crosshair";
        this.draw();
      } else if (this.tool === "raise" || this.tool === "lower" || this.tool === "paint") {
        this.draw(); // refresh the brush cursor
      }
    });

    this.registerDomEvent(el, "pointerup", (e: PointerEvent) => {
      const mode = this.dragMode;
      this.dragMode = "none";
      if (mode === "marker" && this.dragMarkerId) {
        const m = this.map.markers.find((mm) => mm.id === this.dragMarkerId);
        this.dragMarkerId = null;
        if (!m) return;
        if (this.dragMoved) this.persist();
        else this.openMarker(m);
        return;
      }
      if (mode === "regionMove" || mode === "regionVertex") {
        this.dragRegionId = null;
        this.dragVertexIdx = -1;
        this.dragOrigPoints = null;
        if (this.dragMoved) this.persist();
        return;
      }
      if (mode === "ornMove" || mode === "ornResize") {
        this.dragOrnId = null;
        if (this.dragMoved) this.persist();
        return;
      }
      if (mode === "anno") {
        const a = this.currentAnno;
        this.currentAnno = null;
        if (a && a.points.length >= 2) {
          // Minimum length check (ignores stray clicks)
          let span = 0;
          for (let i = 1; i < a.points.length; i++) span += Math.hypot(a.points[i][0] - a.points[i - 1][0], a.points[i][1] - a.points[i - 1][1]);
          if (span * this.worldSize().w > 6) {
            this.map.annotations.push(a);
            this.persist();
          } else {
            this.draw();
          }
        } else {
          this.draw();
        }
        return;
      }
      if (mode === "annoMove") {
        this.dragAnnoId = null;
        this.dragAnnoOrig = null;
        if (this.dragMoved) this.persist();
        return;
      }
      if (mode === "annoErase") return;
      if (mode === "brush") this.persist();
      if (mode === "pan" && this.dragMoved) {
        // Panning doesn't change terrain data, so the cache stays valid — no re-render
      }
    });

    this.registerDomEvent(el, "dblclick", (e: MouseEvent) => {
      if (this.tool === "region" && this.drawingRegion) {
        e.preventDefault();
        this.finishRegion();
        return;
      }
      if (this.tool === "select") {
        const rect = el.getBoundingClientRect();
        const orn = this.hitOrnament(e.clientX - rect.left, e.clientY - rect.top);
        // Only text-bearing elements are double-click editable (compass, ship and monster are pure decoration)
        if (orn && (orn.type === "title" || orn.type === "label" || orn.type === "note" || orn.type === "banner")) {
          this.editOrnText(orn);
          return;
        }
        if (this.selectedRegionId) {
          const rg = this.map.regions.find((r) => r.id === this.selectedRegionId);
          if (rg) this.editRegion(rg);
        }
      }
    });

    this.registerDomEvent(el, "contextmenu", (e: MouseEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
      const m = this.hitMarker(sx, sy);
      if (m) { this.markerMenu(m, e); return; }
      const orn = this.hitOrnament(sx, sy);
      if (orn) { this.ornMenu(orn, e); return; }
      const anno = this.hitAnnotation(sx, sy);
      if (anno) { this.annoMenu(anno, e); return; }
      const wpos = this.toWorld(sx, sy);
      const rg = this.hitRegion(wpos.x, wpos.y);
      if (rg) this.regionMenu(rg, e);
    });

    this.registerDomEvent(this.rootEl, "keydown", (e: KeyboardEvent) => {
      if (this.tool === "region" && this.drawingRegion) {
        if (e.key === "Enter") { e.preventDefault(); this.finishRegion(); }
        if (e.key === "Escape") {
          e.preventDefault();
          this.drawingRegion = null;
          this.setHint("");
          this.draw();
        }
      }
      if (e.key === "Escape" && (this.selectedRegionId || this.selectedOrnId)) {
        this.selectedRegionId = null;
        this.selectedOrnId = null;
        this.draw();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && this.selectedOrnId) {
        e.preventDefault();
        this.map.ornaments = this.map.ornaments.filter((o) => o.id !== this.selectedOrnId);
        this.selectedOrnId = null;
        this.persist();
      }
      if ((e.key === "Delete" || e.key === "Backspace") && this.selectedAnnoId) {
        e.preventDefault();
        this.map.annotations = this.map.annotations.filter((a) => a.id !== this.selectedAnnoId);
        this.selectedAnnoId = null;
        this.persist();
      }
      // Move the selected element between layers: Ctrl+↑/↓ one step, Ctrl+Shift+↑/↓ front/back
      if (this.selectedOrnId && (e.ctrlKey || e.metaKey) && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const up = e.key === "ArrowUp";
        if (e.shiftKey) {
          this.reorderById(this.map.ornaments, this.selectedOrnId, up);
        } else if (!this.reorderStep(this.map.ornaments, this.selectedOrnId, up ? 1 : -1)) {
          return; // already at the end — no save/redraw needed
        }
        this.persist();
        return;
      }
      if (e.key === "[") { this.brushRadius = Math.max(6, this.brushRadius - 5); this.draw(); }
      if (e.key === "]") { this.brushRadius = Math.min(120, this.brushRadius + 5); this.draw(); }
      if (this.tool === "paint") {
        const n = parseInt(e.key);
        if (n >= 1 && n <= PAINT_BIOMES.length) {
          this.paintBiome = PAINT_BIOMES[n - 1].code;
          this.paintErase = false;
          this.updatePaintBar();
        }
        if (e.key === "e" || e.key === "E") {
          this.paintErase = !this.paintErase;
          this.updatePaintBar();
        }
      }
    });
  }

  // ── Marker / region manipulation ─────────────────────

  private addMarkerAt(x: number, y: number): void {
    const marker: Marker = { id: newId(), x, y, name: "", icon: "pin", color: "#c0392b" };
    new MarkerModal(this.app, marker, (m) => {
      this.map.markers.push(m);
      this.persist();
    }).open();
  }

  private openMarker(m: Marker): void {
    if (m.notePath) {
      void this.app.workspace.openLinkText(m.notePath, this.file?.path ?? "", true);
    } else {
      this.editMarker(m);
    }
  }

  private editMarker(m: Marker): void {
    new MarkerModal(
      this.app, m,
      (updated) => {
        Object.assign(m, updated);
        this.persist();
      },
      () => {
        this.map.markers = this.map.markers.filter((mm) => mm.id !== m.id);
        this.persist();
      },
    ).open();
  }

  private markerMenu(m: Marker, e: MouseEvent): void {
    const menu = new Menu();
    if (m.notePath) {
      menu.addItem((it) => it.setTitle("노트 열기").setIcon("file-text").onClick(() => {
        void this.app.workspace.openLinkText(m.notePath!, this.file?.path ?? "", true);
      }));
    }
    menu.addItem((it) => it.setTitle("편집").setIcon("pencil").onClick(() => this.editMarker(m)));
    menu.addItem((it) => it.setTitle("맨 앞으로").setIcon("arrow-up-to-line").onClick(() => {
      this.reorderById(this.map.markers, m.id, true); this.persist();
    }));
    menu.addItem((it) => it.setTitle("맨 뒤로").setIcon("arrow-down-to-line").onClick(() => {
      this.reorderById(this.map.markers, m.id, false); this.persist();
    }));
    menu.addItem((it) => it.setTitle("삭제").setIcon("trash").onClick(() => {
      this.map.markers = this.map.markers.filter((mm) => mm.id !== m.id);
      this.persist();
    }));
    menu.showAtMouseEvent(e);
  }

  // ── Coastal hatching (copperplate equidistant lines) ─

  private hatchRows: { path: Path2D; alpha: number }[] | null = null;
  private landHatchRows: { path: Path2D; alpha: number }[] | null = null;

  /** Distance-field iso-lines → an array of tidy engraved-line Path2D rows */
  private hatchRowsFrom(
    dist: Uint8Array, w: number, h: number,
    isos: [number, number][], seedBase: number,
  ): { path: Path2D; alpha: number }[] {
    const field = new Float32Array(dist.length);
    const M = COAST_RING_MAX + 2;
    for (let i = 0; i < field.length; i++) field[i] = Math.min(M, dist[i]);
    const rows: { path: Path2D; alpha: number }[] = [];
    let sc = seedBase;
    for (const [iso, alpha] of isos) {
      const rings = extractIsoRings(field, w, h, iso, 1.3, 12);
      if (rings.length === 0) continue;
      const path = new Path2D();
      for (const ring of rings) {
        // Soften the marching-squares stairs with Chaikin and add only the faintest jitter — tidy engraved lines
        sketchToPath(path, roughRing(chaikin(ring, 1, true), 0.18, sc++), true);
      }
      rows.push({ path, alpha });
    }
    return rows;
  }

  /**
   * Builds the layered dashed water-lining engraved along the coast.
   * Water side (waterDist) and land side (landDistance) separately — spacing widens
   * and lines fade with distance.
   */
  private buildCoastHatch(): void {
    if (!this.layers || !this.terrain) { this.hatchRows = null; this.landHatchRows = null; return; }
    const t = this.terrain;
    this.hatchRows = this.hatchRowsFrom(
      this.layers.waterDist, t.w, t.h,
      [[2.1, 0.42], [4.3, 0.3], [7.0, 0.2], [10.6, 0.12]],
      this.map.gen.seed * 3 + 71,
    );
    // Land side: three short rows just inside the coast — an engraved map's land shading
    this.landHatchRows = this.hatchRowsFrom(
      landDistance(t.biome, t.w, t.h, 10), t.w, t.h,
      [[1.7, 0.3], [3.4, 0.18], [5.6, 0.1]],
      this.map.gen.seed * 5 + 137,
    );
  }

  /** Reorder within an array of the same kind: to the front (top) or back (bottom) */
  private reorderById<T extends { id: string }>(arr: T[], id: string, toFront: boolean): void {
    const idx = arr.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const [item] = arr.splice(idx, 1);
    if (toFront) arr.push(item); else arr.unshift(item);
  }

  /** One step forwards (+1) / backwards (-1) — later in the array draws on top */
  private reorderStep<T extends { id: string }>(arr: T[], id: string, dir: 1 | -1): boolean {
    const idx = arr.findIndex((x) => x.id === id);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= arr.length) return false;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    return true;
  }

  private annoMenu(a: Annotation, e: MouseEvent): void {
    const menu = new Menu();
    menu.addItem((it) => it.setTitle("맨 앞으로").setIcon("arrow-up-to-line").onClick(() => {
      this.reorderById(this.map.annotations, a.id, true); this.persist();
    }));
    menu.addItem((it) => it.setTitle("맨 뒤로").setIcon("arrow-down-to-line").onClick(() => {
      this.reorderById(this.map.annotations, a.id, false); this.persist();
    }));
    menu.addItem((it) => it.setTitle("삭제").setIcon("trash").onClick(() => {
      this.map.annotations = this.map.annotations.filter((x) => x.id !== a.id);
      if (this.selectedAnnoId === a.id) this.selectedAnnoId = null;
      this.persist();
    }));
    menu.showAtMouseEvent(e);
  }

  private regionMenu(rg: Region, e: MouseEvent): void {
    const menu = new Menu();
    if (rg.notePath) {
      menu.addItem((it) => it.setTitle("노트 열기").setIcon("file-text").onClick(() => {
        void this.app.workspace.openLinkText(rg.notePath!, this.file?.path ?? "", true);
      }));
    }
    menu.addItem((it) => it.setTitle("편집").setIcon("pencil").onClick(() => this.editRegion(rg)));
    menu.addItem((it) => it.setTitle("꼭짓점 편집").setIcon("move").onClick(() => {
      this.selectedRegionId = rg.id;
      this.tool = "select";
      this.updateToolbarState();
      this.draw();
    }));
    menu.addItem((it) => it.setTitle("삭제").setIcon("trash").onClick(() => {
      this.map.regions = this.map.regions.filter((rr) => rr.id !== rg.id);
      this.persist();
    }));
    menu.showAtMouseEvent(e);
  }

  private editRegion(rg: Region): void {
    new RegionModal(
      this.app, rg,
      (updated) => {
        Object.assign(rg, updated);
        this.persist();
      },
      () => {
        this.map.regions = this.map.regions.filter((rr) => rr.id !== rg.id);
        this.persist();
      },
    ).open();
  }

  // ── Placed-element manipulation ──────────────────────

  private editOrnText(orn: Ornament): void {
    const heading = orn.type === "title" ? "제목 편집" : orn.type === "note" ? "메모 편집 (Ctrl+Enter 저장)" : orn.type === "banner" ? "리본 문구 편집" : "텍스트 편집";
    new TextEditModal(this.app, heading, orn.text ?? "", orn.type === "note", (v) => {
      orn.text = v;
      this.persist();
    }).open();
  }

  private ornMenu(orn: Ornament, e: MouseEvent): void {
    const menu = new Menu();
    if (orn.type === "title" || orn.type === "label" || orn.type === "note" || orn.type === "banner") {
      menu.addItem((it) => it.setTitle("텍스트 편집").setIcon("pencil").onClick(() => this.editOrnText(orn)));
    }
    menu.addItem((it) => it.setTitle("이름 지정 (레이어)").setIcon("tag").onClick(() => {
      new TextEditModal(this.app, "요소 이름 지정 (레이어 식별용)", orn.name ?? "", false, (v) => {
        const t = v.trim();
        if (t) orn.name = t; else delete orn.name;
        this.persist();
      }).open();
    }));
    menu.addItem((it) => it.setTitle("앞으로 한 칸 (Ctrl+↑)").setIcon("arrow-up").onClick(() => {
      if (this.reorderStep(this.map.ornaments, orn.id, 1)) this.persist();
    }));
    menu.addItem((it) => it.setTitle("뒤로 한 칸 (Ctrl+↓)").setIcon("arrow-down").onClick(() => {
      if (this.reorderStep(this.map.ornaments, orn.id, -1)) this.persist();
    }));
    menu.addItem((it) => it.setTitle("맨 앞으로 (Ctrl+Shift+↑)").setIcon("arrow-up-to-line").onClick(() => {
      this.reorderById(this.map.ornaments, orn.id, true); this.persist();
    }));
    menu.addItem((it) => it.setTitle("맨 뒤로 (Ctrl+Shift+↓)").setIcon("arrow-down-to-line").onClick(() => {
      this.reorderById(this.map.ornaments, orn.id, false); this.persist();
    }));
    menu.addItem((it) => it.setTitle("삭제").setIcon("trash").onClick(() => {
      this.map.ornaments = this.map.ornaments.filter((o) => o.id !== orn.id);
      if (this.selectedOrnId === orn.id) this.selectedOrnId = null;
      this.persist();
    }));
    menu.showAtMouseEvent(e);
  }

  private addOrnament(type: OrnamentType, sticker?: string, imagePath?: string): void {
    const defaults: Record<OrnamentType, { sizeF: number; text?: string }> = {
      compass: { sizeF: 0.062 },
      title: { sizeF: 0.052, text: this.file?.basename ?? "제목" },
      label: { sizeF: 0.035, text: "새 지명" },
      note: { sizeF: 0.024, text: "메모 내용" },
      banner: { sizeF: 0.03, text: "리본 문구" },
      ship: { sizeF: 0.048 },
      monster: { sizeF: 0.048 },
      sticker: { sizeF: 0.045 },
    };
    const d = defaults[type];
    // Place at the world coordinates of the screen centre
    const { w: vw, h: vh } = this.viewSize();
    const wpos = this.toWorld(vw / 2, vh / 2);
    const orn: Ornament = {
      id: newId(), type,
      x: Math.min(0.95, Math.max(0.05, wpos.x)),
      y: Math.min(0.95, Math.max(0.05, wpos.y)),
      sizeF: d.sizeF, text: d.text,
      sticker, imagePath,
    };
    this.map.ornaments.push(orn);
    this.selectedOrnId = orn.id;
    this.tool = "select";
    this.updateToolbarState();
    const isText = type === "title" || type === "label" || type === "note" || type === "banner";
    this.setHint(isText
      ? "드래그: 이동 · 모서리 핸들: 크기 · 더블클릭: 텍스트 편집 · Delete: 삭제"
      : "드래그: 이동 · 모서리 핸들: 크기 · Delete: 삭제");
    this.persist();
    if (isText) this.editOrnText(orn);
  }

  // ── User sticker image cache ─────────────────────────

  private stickerImages: StickerImages = new Map();
  private stickerLoading = new Set<string>();

  /** Lazily load images for placed custom stickers (redraws on completion) */
  private ensureStickerImages(): void {
    for (const orn of this.map.ornaments) {
      const p = orn.imagePath;
      if (!p || this.stickerImages.has(p) || this.stickerLoading.has(p)) continue;
      this.stickerLoading.add(p);
      const file = this.app.vault.getAbstractFileByPath(p);
      if (!(file instanceof TFile)) continue;
      void this.app.vault.readBinary(file).then((buf) => {
        const url = URL.createObjectURL(new Blob([buf]));
        const img = new Image();
        img.onload = () => {
          this.stickerImages.set(p, img);
          this.stickerLoading.delete(p);
          this.draw();
        };
        img.onerror = () => URL.revokeObjectURL(url);
        img.src = url;
      });
    }
  }

  private finishRegion(): void {
    const pts = this.drawingRegion;
    this.drawingRegion = null;
    this.setHint("");
    if (!pts || pts.length < 3) {
      new Notice("지역은 최소 3개의 꼭짓점이 필요합니다.");
      this.draw();
      return;
    }
    const region: Region = { id: newId(), name: "", color: "#c0392b", points: pts };
    new RegionModal(this.app, region, (r) => {
      this.map.regions.push(r);
      this.persist();
    }).open();
    this.draw();
  }

  // ── Paint tool settings bar ──────────────────────────

  private buildPaintBar(): void {
    const bar = this.rootEl.createDiv({ cls: "fms-paintbar is-hidden" });
    this.paintBarEl = bar;

    for (let n = 0; n < PAINT_BIOMES.length; n++) {
      const pb = PAINT_BIOMES[n];
      const btn = bar.createDiv({ cls: "fms-paint-btn", attr: { "aria-label": `${pb.label} (${n + 1})` } });
      btn.createSpan({ cls: "fms-paint-swatch", attr: { "data-biome": pb.key } });
      btn.createSpan({ cls: "fms-paint-key", text: String(n + 1) });
      btn.createSpan({ text: pb.label });
      btn.onclick = () => {
        this.paintBiome = pb.code;
        this.paintErase = false;
        this.updatePaintBar();
      };
    }

    const eraseBtn = bar.createDiv({ cls: "fms-paint-btn fms-paint-erase", attr: { "aria-label": "지우개 (E) — 칠한 바이옴 제거" } });
    setIcon(eraseBtn.createSpan(), "eraser");
    eraseBtn.createSpan({ text: "지우기" });
    eraseBtn.onclick = () => {
      this.paintErase = !this.paintErase;
      this.updatePaintBar();
    };

    const sizeWrap = bar.createDiv({ cls: "fms-paint-size" });
    sizeWrap.createSpan({ text: "크기" });
    const size = sizeWrap.createEl("input", { type: "range" });
    size.min = "6"; size.max = "120"; size.step = "2";
    size.value = String(this.brushRadius);
    size.oninput = () => {
      this.brushRadius = parseInt(size.value);
      this.draw();
    };

    this.updatePaintBar();
  }

  private updatePaintBar(): void {
    const bar = this.paintBarEl;
    if (!bar) return;
    bar.toggleClass("is-hidden", this.tool !== "paint" || this.map.mode !== "generated");
    const pal = getPalette(this.map.style, this.map.styleColors);
    const slotOf: Record<string, [number, number, number]> = {
      water: pal.ocean, grass: pal.grass, forest: pal.forest, desert: pal.desert, snow: pal.snow,
    };
    bar.querySelectorAll<HTMLElement>(".fms-paint-swatch").forEach((sw) => {
      const key = sw.getAttribute("data-biome");
      if (key && slotOf[key]) sw.style.backgroundColor = rgbToHex(slotOf[key]);
    });
    const btns = Array.from(bar.querySelectorAll<HTMLElement>(".fms-paint-btn"));
    btns.forEach((b, idx) => {
      const isErase = b.hasClass("fms-paint-erase");
      const active = isErase
        ? this.paintErase
        : !this.paintErase && PAINT_BIOMES[idx]?.code === this.paintBiome;
      b.toggleClass("is-active", !!active);
    });
  }

  // ── Persistence / resampling ─────────────────────────

  private syncLayersToMap(): void {
    if (this.edits && this.edits.some((v) => v !== 0)) {
      this.map.editsB64 = bytesToB64(this.edits);
    } else {
      delete this.map.editsB64;
    }
    if (this.paint && this.paint.some((v) => v !== 0)) {
      this.map.paintB64 = bytesToB64(new Int8Array(this.paint.buffer));
    } else {
      delete this.map.paintB64;
    }
  }

  private resampleEdits(old: Int8Array, ow: number, oh: number, nw: number, nh: number): Int8Array {
    const out = new Int8Array(nw * nh);
    for (let y = 0; y < nh; y++) {
      const fy = (y / nh) * oh;
      const y0 = Math.min(oh - 1, Math.floor(fy)), y1 = Math.min(oh - 1, y0 + 1);
      const ty = fy - y0;
      for (let x = 0; x < nw; x++) {
        const fx = (x / nw) * ow;
        const x0 = Math.min(ow - 1, Math.floor(fx)), x1 = Math.min(ow - 1, x0 + 1);
        const tx = fx - x0;
        const v =
          old[y0 * ow + x0] * (1 - tx) * (1 - ty) +
          old[y0 * ow + x1] * tx * (1 - ty) +
          old[y1 * ow + x0] * (1 - tx) * ty +
          old[y1 * ow + x1] * tx * ty;
        out[y * nw + x] = clampI8(v);
      }
    }
    return out;
  }

  private persist(): void {
    this.requestSave();
    this.buildPanelMarkerList();
    this.buildPanelOrnList();
    this.draw();
  }

  // ── PNG export ───────────────────────────────────────

  async exportPNG(): Promise<void> {
    const { w: W, h: H } = this.worldSize();
    const scale = this.map.mode === "image" ? 1 : 2;
    const out = document.createElement("canvas");
    out.width = W * scale;
    out.height = H * scale;
    const ctx = out.getContext("2d")!;
    const pal = getPalette(this.map.style, this.map.styleColors);

    ctx.save();
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    if (this.map.mode === "image" && this.baseImage) {
      ctx.drawImage(this.baseImage, 0, 0);
    } else if (this.layers) {
      if (this.cacheValid && this.fullDetailCanvas) {
        // 3× detail cache (stamps & vector lines included) — same high quality as the editor view
        ctx.drawImage(this.fullDetailCanvas, 0, 0, W, H);
      } else {
        ctx.drawImage(this.layers.base, 0, 0);
        ctx.drawImage(this.layers.stamps, 0, 0, this.map.width, this.map.height);
        this.drawVectorLines(ctx, pal, scale);
      }
      this.drawRhumbLines(ctx, W, H, scale, pal);
      drawMapEffects(ctx, W, H, scale, pal.coastline, this.map.decor, this.map.style);
    }
    if (this.map.showGrid) drawCoordinateGrid(ctx, W, H, scale, pal.coastline);
    ctx.restore();

    // Paper-grain overlay (identical to the editor)
    if (this.map.mode === "generated") {
      const g = this.map.texture.grain ?? 0.5;
      const pat = g > 0.001 ? ctx.createPattern(paperGrainTile(), "repeat") : null;
      if (pat) {
        ctx.save();
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = Math.min(1, g);
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.restore();
      }
    }

    // Regions & markers (export pixel coordinates)
    for (const rg of this.map.regions) {
      if (rg.points.length < 3) continue;
      ctx.beginPath();
      rg.points.forEach(([px, py], idx) => {
        const sx = px * W * scale, sy = py * H * scale;
        idx === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      });
      ctx.closePath();
      ctx.fillStyle = hexToRgba(rg.color, 0.13);
      ctx.fill();
      ctx.strokeStyle = hexToRgba(rg.color, 0.85);
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([7 * scale, 5 * scale]);
      ctx.stroke();
      ctx.setLineDash([]);
      const [cx, cy] = centroid(rg.points);
      ctx.font = `600 ${13 * scale}px ${FONT_SERIF}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const tw = ctx.measureText(rg.name).width;
      ctx.fillStyle = "rgba(28,24,18,0.72)";
      ctx.fillRect(cx * W * scale - tw / 2 - 7 * scale, cy * H * scale - 10 * scale, tw + 14 * scale, 20 * scale);
      ctx.fillStyle = "#f0e8d4";
      ctx.fillText(rg.name, cx * W * scale, cy * H * scale);
    }
    // Annotations (drawings)
    for (const a of this.map.annotations) {
      if (a.points.length < 2) continue;
      const px = a.points.map(([x, y]) => [x * W * scale, y * H * scale] as [number, number]);
      strokeAnnotationPx(ctx, a, px, a.width * scale);
    }
    // Placed elements (stickers, text) → markers on top — same layer order as the editor
    ctx.save();
    ctx.scale(scale, scale);
    drawOrnaments(ctx, this.map.ornaments, W, H, scale, pal.coastline, this.map.style, this.stickerImages);
    ctx.restore();
    for (const m of this.map.markers) {
      const sx = m.x * W * scale, sy = m.y * H * scale;
      // Same map-proportional formula as the editor (unit = scale) → WYSIWYG
      this.paintMarker(ctx, m, sx, sy, this.markerSizePx(m, scale), false);
    }

    const blob = await new Promise<Blob | null>((res) => out.toBlob(res, "image/png"));
    if (!blob) {
      new Notice("PNG 인코딩에 실패했습니다.");
      return;
    }
    const buf = await blob.arrayBuffer();
    const baseName = this.file?.basename ?? this.map.name;
    const folder = this.file?.parent?.path ?? "";
    const prefix = folder && folder !== "/" ? folder + "/" : "";
    let path = normalizePath(`${prefix}${baseName}.png`);
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = normalizePath(`${prefix}${baseName} ${++n}.png`);
    }
    await this.app.vault.createBinary(path, buf);
    new Notice(`지도를 내보냈습니다: ${path}`);
  }

  // ── External integration ─────────────────────────────

  focusMarkerByNote(notePath: string): boolean {
    const m = this.map.markers.find((mm) => mm.notePath === notePath);
    if (!m) return false;
    this.focusMarker(m);
    return true;
  }

  focusMarkerByName(name: string): boolean {
    const m = this.map.markers.find((mm) => mm.name === name);
    if (!m) return false;
    this.focusMarker(m);
    return true;
  }

  focusMarker(m: Marker): void {
    this.updateToolbarState();
    const { w: W, h: H } = this.worldSize();
    const { w: vw, h: vh } = this.viewSize();
    const target = Math.max(this.cam.scale, Math.min(vw / W, vh / H) * 2.2);
    this.cam.scale = target;
    this.cam.x = vw / 2 - m.x * W * target;
    this.cam.y = vh / 2 - m.y * H * target;
    this.flash = { x: m.x, y: m.y, t0: performance.now() };
    this.draw();
  }

  // ── Toolbar ──────────────────────────────────────────

  private buildToolbar(): void {
    const bar = this.rootEl.createDiv({ cls: "fms-toolbar" });
    for (const def of TOOL_DEFS) {
      const btn = bar.createDiv({ cls: "fms-tool-btn", attr: { "aria-label": def.label } });
      setIcon(btn, def.icon);
      btn.onclick = () => {
        this.tool = def.id;
        this.drawingRegion = null;
        this.setHint(def.label);
        this.updateToolbarState();
        this.draw();
      };
      this.toolBtns.set(def.id, btn);
    }
    bar.createDiv({ cls: "fms-tool-sep" });

    const btnExport = bar.createDiv({ cls: "fms-tool-btn", attr: { "aria-label": "PNG로 내보내기" } });
    setIcon(btnExport, "image-down");
    btnExport.onclick = () => void this.exportPNG();

    const btnPanel = bar.createDiv({ cls: "fms-tool-btn", attr: { "aria-label": "설정 패널 접기/펼치기" } });
    setIcon(btnPanel, "settings-2");
    btnPanel.onclick = () => this.panelEl.toggleClass("is-hidden", !this.panelEl.hasClass("is-hidden"));

    this.updateToolbarState();
  }

  private updateToolbarState(): void {
    for (const [id, btn] of this.toolBtns) {
      btn.toggleClass("is-active", id === this.tool);
    }
    this.updatePaintBar();
    this.updateDrawBar();
  }

  private setHint(text: string): void {
    this.hintEl.setText(text);
    this.hintEl.toggleClass("is-visible", !!text);
  }

  // ── Settings panel ───────────────────────────────────

  private markerListEl: HTMLElement | null = null;
  private ornListEl: HTMLElement | null = null;
  private activePanelTab = "terrain";

  /** Build the panel's top tab bar plus its four tab containers */
  private makePanelTabs(root: HTMLElement): Record<string, HTMLElement> {
    const bar = root.createDiv({ cls: "fms-tabs" });
    const bodies = root.createDiv({ cls: "fms-tab-bodies" });
    const defs: [string, string][] = [
      ["terrain", "지형"], ["style", "꾸미기"], ["elements", "요소"], ["file", "파일"],
    ];
    const conts: Record<string, HTMLElement> = {};
    const btns: Record<string, HTMLElement> = {};
    for (const [key, label] of defs) {
      const btn = bar.createDiv({ cls: "fms-tab", text: label });
      const cont = bodies.createDiv({ cls: "fms-tab-body is-hidden" });
      btn.onclick = () => {
        for (const k in conts) conts[k].toggleClass("is-hidden", k !== key);
        for (const k in btns) btns[k].toggleClass("is-active", k === key);
        this.activePanelTab = key;
      };
      conts[key] = cont;
      btns[key] = btn;
    }
    if (this.map.mode !== "generated" && this.activePanelTab === "terrain") this.activePanelTab = "style";
    const active = conts[this.activePanelTab] ? this.activePanelTab : "style";
    conts[active].removeClass("is-hidden");
    btns[active].addClass("is-active");
    return conts;
  }

  private buildPanel(): void {
    const p = this.panelEl;
    p.empty();
    const tab = this.makePanelTabs(p);
    const tTerrain = tab.terrain, tStyle = tab.style, tElements = tab.elements, tFile = tab.file;

    const isGen = this.map.mode === "generated";

    if (isGen) {
      const secToggles = this.panelSection(tTerrain, "지형 생성 옵션");
      const row = secToggles.createDiv({ cls: "fms-check-row" });
      const toggles: [keyof typeof this.map.gen, string][] = [
        ["rivers", "강"], ["snow", "눈"], ["desert", "사막"], ["forest", "숲"],
      ];
      for (const [key, label] of toggles) {
        const lb = row.createEl("label", { cls: "fms-check" });
        const cb = lb.createEl("input", { type: "checkbox" });
        cb.checked = this.map.gen[key] as boolean;
        cb.onchange = () => {
          (this.map.gen[key] as boolean) = cb.checked;
          this.requestSave();
          this.regenDebounced(50);
        };
        lb.createSpan({ text: label });
      }

      // Generation: the default is one-shot "fully random" — fine-tuning lives in the advanced settings below
      const secGen = this.panelSection(tTerrain, "생성");
      const randBtn = secGen.createEl("button", { text: "완전 랜덤 생성", cls: "fms-btn" });
      const seedRow = secGen.createDiv({ cls: "fms-row" });
      seedRow.createSpan({ cls: "fms-row-label", text: "시드" });
      const seedInput = seedRow.createEl("input", { cls: "fms-seed-input", type: "number" });
      seedInput.value = String(this.map.gen.seed);
      seedInput.onchange = () => {
        this.map.gen.seed = parseInt(seedInput.value) || 0;
        this.requestSave();
        this.regenDebounced(50);
      };
      const diceBtn = seedRow.createDiv({ cls: "fms-mini-btn", attr: { "aria-label": "시드만 무작위 (설정 유지)" } });
      setIcon(diceBtn, "dices");
      diceBtn.onclick = () => {
        this.map.gen.seed = Math.floor(Math.random() * 1000000);
        seedInput.value = String(this.map.gen.seed);
        this.requestSave();
        this.regenDebounced(50);
      };
      randBtn.onclick = () => {
        // Randomise the seed plus every generation parameter derived from it (same seed = same world)
        const seed = Math.floor(Math.random() * 1000000);
        const keep = this.map.gen; // keep the toggles (rivers, snow, desert, forest)
        this.map.gen = randomizeGenParams(seed);
        this.map.gen.rivers = keep.rivers;
        this.map.gen.snow = keep.snow;
        this.map.gen.desert = keep.desert;
        this.map.gen.forest = keep.forest;
        seedInput.value = String(seed);
        this.requestSave();
        this.buildPanel(); // refresh the advanced slider values
        this.regenerate();
      };
      secGen.createDiv({ cls: "fms-note", text: "대륙·섬·해수면 등을 알아서 정합니다. 세부 조정은 고급 설정에서." });

      // Advanced settings: all terrain parameters (collapsed by default)
      const secBase = this.panelSection(tTerrain, "고급 · 대륙과 바다", true);
      this.slider(secBase, "해수면 높이", 0.2, 0.75, 0.01, this.map.gen.seaLevel, (v) => (this.map.gen.seaLevel = v));
      this.slider(secBase, "대륙 수", 0, 8, 1, this.map.gen.continentCount, (v) => (this.map.gen.continentCount = v));
      this.slider(secBase, "섬 수", 0, 40, 1, this.map.gen.islandCount, (v) => (this.map.gen.islandCount = v));
      this.slider(secBase, "대륙 크기", 0.4, 2, 0.05, this.map.gen.landAmount, (v) => (this.map.gen.landAmount = v));
      this.slider(secBase, "대륙 분포", 1, 5, 1, this.map.gen.continents, (v) => (this.map.gen.continents = v));
      this.slider(secBase, "거칠기", 0, 2, 0.05, this.map.gen.roughness, (v) => (this.map.gen.roughness = v));

      const secClimate = this.panelSection(tTerrain, "고급 · 기후와 디테일", true);
      this.slider(secClimate, "기후 분포", 0, 1, 0.01, this.map.gen.climate, (v) => (this.map.gen.climate = v));
      this.slider(secClimate, "디테일", 0, 2, 0.05, this.map.gen.detail, (v) => (this.map.gen.detail = v));
      this.slider(secClimate, "정밀도", 0, 2, 0.05, this.map.gen.precision, (v) => (this.map.gen.precision = v));
      this.slider(secClimate, "북극 설원", 0, 0.4, 0.01, this.map.gen.polarNorth, (v) => (this.map.gen.polarNorth = v));
      this.slider(secClimate, "남극 설원", 0, 0.4, 0.01, this.map.gen.polarSouth, (v) => (this.map.gen.polarSouth = v));

      const secWater = this.panelSection(tTerrain, "고급 · 물과 침식", true);
      this.slider(secWater, "침식", 0, 2, 0.05, this.map.gen.erosion, (v) => (this.map.gen.erosion = v));
      this.slider(secWater, "강 밀도", 0, 2, 0.05, this.map.gen.riverDensity, (v) => (this.map.gen.riverDensity = v));

      const secReset = this.panelSection(tTerrain, "편집 초기화", true);
      const clearBtn = secReset.createEl("button", { text: "지형 편집 초기화", cls: "fms-btn" });
      clearBtn.onclick = () => {
        this.edits = null;
        delete this.map.editsB64;
        this.requestSave();
        this.regenerate();
      };
      const clearPaintBtn = secReset.createEl("button", { text: "바이옴 페인트 초기화", cls: "fms-btn" });
      clearPaintBtn.onclick = () => {
        this.paint = null;
        delete this.map.paintB64;
        this.requestSave();
        this.regenerate();
      };

      // Map size
      const secSize = this.panelSection(tTerrain, "지도 크기");
      const sizeRow = secSize.createDiv({ cls: "fms-row" });
      const wInput = sizeRow.createEl("input", { cls: "fms-seed-input", type: "number" });
      wInput.value = String(this.map.width);
      sizeRow.createSpan({ cls: "fms-row-label", text: "×" }).style.flex = "0 0 auto";
      const hInput = sizeRow.createEl("input", { cls: "fms-seed-input", type: "number" });
      hInput.value = String(this.map.height);
      const applyBtn = secSize.createEl("button", { text: "크기 적용", cls: "fms-btn" });
      applyBtn.onclick = () => {
        const nw = Math.max(128, Math.min(3072, Math.round(parseInt(wInput.value) || this.map.width)));
        const nh = Math.max(96, Math.min(3072, Math.round(parseInt(hInput.value) || this.map.height)));
        wInput.value = String(nw);
        hInput.value = String(nh);
        if (nw === this.map.width && nh === this.map.height) return;
        if (this.edits) {
          this.edits = this.resampleEdits(this.edits, this.map.width, this.map.height, nw, nh);
        }
        if (this.paint) {
          const np = new Uint8Array(nw * nh);
          for (let y = 0; y < nh; y++) {
            const oy2 = Math.min(this.map.height - 1, Math.round((y / nh) * this.map.height));
            for (let x = 0; x < nw; x++) {
              const ox2 = Math.min(this.map.width - 1, Math.round((x / nw) * this.map.width));
              np[y * nw + x] = this.paint[oy2 * this.map.width + ox2];
            }
          }
          this.paint = np;
        }
        this.map.width = nw;
        this.map.height = nh;
        this.camFitted = false;
        this.requestSave();
        this.regenerate();
      };
      secSize.createDiv({ cls: "fms-note", text: "128~3072 셀. 큰 지도는 타일 단위로 순차 렌더됩니다(청크). 클수록 생성이 느려지니 주의. 브러시 편집은 보간되어 유지됩니다." });

      // Terrain colours
      const secColors = this.panelSection(tStyle, "지형 색상");
      const pal = getPalette(this.map.style, this.map.styleColors);
      const slotOf: Record<string, [number, number, number]> = {
        water: pal.ocean, grass: pal.grass, forest: pal.forest, desert: pal.desert, snow: pal.snow,
      };
      for (const { key, label } of TERRAIN_COLOR_KEYS) {
        const row = secColors.createDiv({ cls: "fms-row" });
        const colorInput = row.createEl("input", { type: "color", cls: "fms-color-input" });
        colorInput.value = this.map.styleColors?.[key] ?? rgbToHex(slotOf[key]);
        row.createSpan({ cls: "fms-row-label", text: label });
        const hexSpan = row.createSpan({ cls: "fms-row-value fms-hex", text: colorInput.value });
        colorInput.oninput = () => {
          if (!this.map.styleColors) this.map.styleColors = {};
          this.map.styleColors[key] = colorInput.value;
          hexSpan.setText(colorInput.value);
          this.requestSave();
          this.regenDebounced(120);
          this.updatePaintBar();
        };
      }
      const resetColors = secColors.createEl("button", { text: "기본 색상 복원", cls: "fms-btn" });
      resetColors.onclick = () => {
        delete this.map.styleColors;
        this.requestSave();
        this.regenerate();
        this.buildPanel();
        this.updatePaintBar();
      };

      // Coastline
      const secCoast = this.panelSection(tStyle, "해안선");
      this.slider(secCoast, "폭", 0, 12, 1, this.map.coastWidth, (v) => (this.map.coastWidth = v));
      const coastRow = secCoast.createDiv({ cls: "fms-row" });
      const coastInput = coastRow.createEl("input", { type: "color", cls: "fms-color-input" });
      coastInput.value = this.map.coastColor ?? rgbToHex([
        Math.min(255, pal.ocean[0] * 1.16), Math.min(255, pal.ocean[1] * 1.14), Math.min(255, pal.ocean[2] * 1.1),
      ]);
      coastRow.createSpan({ cls: "fms-row-label", text: "띠 색상" });
      const coastReset = coastRow.createEl("button", { text: "자동", cls: "fms-mini-text-btn" });
      coastInput.oninput = () => {
        this.map.coastColor = coastInput.value;
        this.requestSave();
        this.regenDebounced(120);
      };
      coastReset.onclick = () => {
        delete this.map.coastColor;
        this.requestSave();
        this.regenerate();
      };

      // Whole-map effects
      const secDecor = this.panelSection(tStyle, "전체 효과");
      const decorRow = secDecor.createDiv({ cls: "fms-check-row" });
      const decorDefs: [keyof typeof this.map.decor, string][] = [
        ["frame", "테두리"], ["waves", "파도"], ["vignette", "비네트"],
      ];
      for (const [key, label] of decorDefs) {
        const lb = decorRow.createEl("label", { cls: "fms-check" });
        const cb = lb.createEl("input", { type: "checkbox" });
        cb.checked = this.map.decor[key];
        cb.onchange = () => {
          this.map.decor[key] = cb.checked;
          this.requestSave();
          if (key === "waves") this.regenDebounced(50); // stamp layer needs rebuilding
          else this.draw();
        };
        lb.createSpan({ text: label });
      }

      // Texture (custom sliders)
      const secTex = this.panelSection(tStyle, "질감", true);
      // grain & icon size redraw immediately (draw); shading & mottle regenerate the base
      this.slider(secTex, "종이 결", 0, 1.2, 0.05, this.map.texture.grain, (v) => (this.map.texture.grain = v), false);
      this.slider(secTex, "명암(워시)", 0, 2, 0.05, this.map.texture.relief, (v) => (this.map.texture.relief = v), true);
      this.slider(secTex, "종이 얼룩", 0, 2, 0.05, this.map.texture.mottle, (v) => (this.map.texture.mottle = v), true);
      this.slider(secTex, "아이콘 크기", 0.5, 3, 0.1, this.map.texture.markerScale, (v) => (this.map.texture.markerScale = v), false);
    }

    // Map elements (free placement) — text elements separated from pure decorations
    const secText = this.panelSection(tElements, "텍스트 요소");
    const textRow = secText.createDiv({ cls: "fms-orn-row" });
    const textDefs: [OrnamentType, string, string][] = [
      ["title", "type", "제목"],
      ["label", "case-sensitive", "지명"],
      ["banner", "tag", "리본 문구"],
      ["note", "sticky-note", "메모"],
    ];
    for (const [type, icon, label] of textDefs) {
      const btn = textRow.createEl("button", { cls: "fms-orn-btn", attr: { "aria-label": `${label} 추가` } });
      setIcon(btn.createSpan(), icon);
      btn.createSpan({ text: label });
      btn.onclick = () => this.addOrnament(type);
    }
    secText.createDiv({ cls: "fms-note", text: "더블클릭으로 텍스트 편집, 드래그 이동·크기 조절·Delete 삭제." });

    const secDeco = this.panelSection(tElements, "꾸미기 스티커");
    {
      const inkRGB = getPalette(this.map.style, this.map.styleColors).coastline;
      const inkFn = (a: number) => `rgba(${inkRGB[0]},${inkRGB[1]},${inkRGB[2]},${a})`;
      // Preview thumbnail buttons (hover to see the name)
      const makeCell = (grid: HTMLElement, label: string, drawThumb: (g: CanvasRenderingContext2D) => void, onClick: () => void) => {
        const btn = grid.createEl("button", { cls: "fms-sticker-cell", attr: { "aria-label": `${label} 추가`, title: label } });
        const cv = btn.createEl("canvas");
        cv.width = 96;
        cv.height = 96;
        const g = cv.getContext("2d");
        if (g) {
          g.lineJoin = "round";
          g.lineCap = "round";
          g.lineWidth = 2.2;
          drawThumb(g);
        }
        btn.createSpan({ cls: "fms-sticker-name", text: label });
        btn.onclick = onClick;
      };
      for (const cat of STICKER_CATS) {
        secDeco.createDiv({ cls: "fms-sticker-cat", text: cat.label });
        const grid = secDeco.createDiv({ cls: "fms-sticker-grid" });
        // File the legacy decorations under their proper categories (sea: ship & monster / map: compass)
        const legacy: [OrnamentType, string][] =
          cat.id === "sea" ? [["ship", "범선"], ["monster", "바다 괴물"]] :
          cat.id === "map" ? [["compass", "나침반"]] : [];
        for (const [type, label] of legacy) {
          makeCell(grid, label, (g) => {
            drawOrnaments(g, [{ id: "_t", type, x: 0.5, y: 0.5, sizeF: type === "compass" ? 0.28 : 0.32 }], 96, 96, 1, inkRGB, this.map.style);
          }, () => this.addOrnament(type));
        }
        for (const st of STICKERS.filter((x) => x.cat === cat.id)) {
          makeCell(grid, st.label, (g) => {
            const rr = 36 / Math.max(st.box[0], st.box[1]);
            st.draw(g, 48, 48, rr, inkFn, "rgba(242,232,206,0.92)");
          }, () => this.addOrnament("sticker", st.id));
        }
      }
      // User-made stickers (vault images)
      const customBtn = secDeco.createEl("button", { text: "내 스티커 추가 (볼트 이미지)…", cls: "fms-btn" });
      customBtn.onclick = () => {
        new ImageSuggestModal(this.app, (file) => {
          this.addOrnament("sticker", "custom", file.path);
        }).open();
      };
      secDeco.createDiv({ cls: "fms-note", text: "클릭해 지도 중앙에 추가 — 드래그 이동·크기 조절·Delete 삭제. 내 스티커는 볼트의 PNG(투명 배경 권장)를 사용합니다." });
    }

    // Style
    const secStyle = this.panelSection(tStyle, "스타일");
    const styleRow = secStyle.createDiv({ cls: "fms-row" });
    styleRow.createSpan({ cls: "fms-row-label", text: "테마" });
    this.customSelect(
      styleRow,
      [["parchment", "양피지"], ["color", "컬러"], ["ink", "잉크"]],
      this.map.style,
      (v) => {
        this.map.style = v as StyleId;
        this.requestSave();
        this.regenDebounced(30);
      },
    );
    if (isGen) {
      const contourRow = secStyle.createDiv({ cls: "fms-check-row" });
      const lb = contourRow.createEl("label", { cls: "fms-check" });
      const cb = lb.createEl("input", { type: "checkbox" });
      cb.checked = this.map.showContours;
      cb.onchange = () => {
        this.map.showContours = cb.checked;
        this.requestSave();
        this.cacheValid = false; // contours are baked into the detail cache, so a re-render is needed
        this.scheduleDetail();
        this.draw();
      };
      lb.createSpan({ text: "등고선 표시 (2D)" });

      const hatchLb = contourRow.createEl("label", { cls: "fms-check" });
      const hatchCb = hatchLb.createEl("input", { type: "checkbox" });
      hatchCb.checked = this.map.coastHatching;
      hatchCb.onchange = () => {
        this.map.coastHatching = hatchCb.checked;
        this.requestSave();
        this.cacheValid = false;
        this.scheduleDetail();
        this.draw();
      };
      hatchLb.createSpan({ text: "해안 헤칭 (잔선)" });

      const landHatchLb = contourRow.createEl("label", { cls: "fms-check" });
      const landHatchCb = landHatchLb.createEl("input", { type: "checkbox" });
      landHatchCb.checked = this.map.landHatching;
      landHatchCb.onchange = () => {
        this.map.landHatching = landHatchCb.checked;
        this.requestSave();
        this.cacheValid = false;
        this.scheduleDetail();
        this.draw();
      };
      landHatchLb.createSpan({ text: "육지 헤칭" });

      const gridLb = contourRow.createEl("label", { cls: "fms-check" });
      const gridCb = gridLb.createEl("input", { type: "checkbox" });
      gridCb.checked = this.map.showGrid;
      gridCb.onchange = () => {
        this.map.showGrid = gridCb.checked;
        this.requestSave();
        this.draw();
      };
      gridLb.createSpan({ text: "좌표 격자" });

      const rhumbLb = contourRow.createEl("label", { cls: "fms-check" });
      const rhumbCb = rhumbLb.createEl("input", { type: "checkbox" });
      rhumbCb.checked = this.map.showRhumbLines;
      rhumbCb.onchange = () => {
        this.map.showRhumbLines = rhumbCb.checked;
        this.requestSave();
        this.draw();
      };
      rhumbLb.createSpan({ text: "풍배선 표시" });

      // Fast render (lower quality) checkbox
      const renderRow = secStyle.createDiv({ cls: "fms-check-row" });
      const fastLb = renderRow.createEl("label", { cls: "fms-check" });
      const fastCb = fastLb.createEl("input", { type: "checkbox" });
      fastCb.checked = this.map.fastRender;
      fastCb.onchange = () => {
        this.map.fastRender = fastCb.checked;
        this.requestSave();
        this.cacheValid = false; // reset cache state when toggling fastRender
        if (this.detailTimer) { window.clearTimeout(this.detailTimer); this.detailTimer = null; }
        this.draw();
        if (!this.map.fastRender) this.scheduleDetail();
      };
      fastLb.createSpan({ text: "빠른 렌더 (품질 저하)" });
    }

    // Background (image mode)
    const secBg = this.panelSection(tFile, "지도 배경");
    if (this.map.mode === "image") {
      secBg.createDiv({ cls: "fms-note", text: `이미지: ${this.map.baseImagePath ?? "?"}` });
      const back = secBg.createEl("button", { text: "생성 지형으로 전환", cls: "fms-btn" });
      back.onclick = () => {
        this.map.mode = "generated";
        this.map.width = 512;
        this.map.height = 384;
        this.baseImage = null;
        this.paint = null;
        delete this.map.paintB64;
        this.camFitted = false;
        this.requestSave();
        this.rebuild();
      };
    } else {
      const imgBtn = secBg.createEl("button", { text: "볼트 이미지 불러오기", cls: "fms-btn" });
      imgBtn.onclick = () => {
        new ImageSuggestModal(this.app, (file) => {
          this.map.mode = "image";
          this.map.baseImagePath = file.path;
          this.camFitted = false;
          this.requestSave();
          this.rebuild();
        }).open();
      };
      secBg.createDiv({ cls: "fms-note", text: "손그림·외부 제작 지도를 불러와 마커를 배치할 수 있습니다." });
    }

    // Export
    const secExport = this.panelSection(tFile, "내보내기");
    const exportBtn = secExport.createEl("button", { text: "PNG 이미지로 내보내기 (2×)", cls: "fms-btn" });
    exportBtn.onclick = () => void this.exportPNG();

    // Placed-element layer list
    const secLayers = this.panelSection(tElements, "배치된 요소 (레이어)");
    this.ornListEl = secLayers.createDiv({ cls: "fms-orn-list" });
    this.buildPanelOrnList();
    secLayers.createDiv({ cls: "fms-note", text: "목록 위쪽 = 지도에서 앞. 캔버스에서 Ctrl+↑/↓(한 칸), Ctrl+Shift+↑/↓(맨 앞/뒤)로도 이동." });

    // Marker list
    const secMk = this.panelSection(tElements, "마커");
    this.markerListEl = secMk.createDiv({ cls: "fms-marker-list" });
    this.buildPanelMarkerList();

    tFile.createDiv({ cls: "fms-note fms-version", text: `Vellum v${PLUGIN_VERSION}` });
  }

  private ornDisplayName(o: Ornament): string {
    if (o.name && o.name.trim()) return o.name.trim();
    const t = (s?: string) => (s ?? "").split("\n")[0].slice(0, 14);
    switch (o.type) {
      case "compass": return "나침반";
      case "ship": return "범선";
      case "monster": return "바다 괴물";
      case "title": return `제목 · ${t(o.text)}`;
      case "label": return `지명 · ${t(o.text)}`;
      case "banner": return `리본 · ${t(o.text)}`;
      case "note": return `메모 · ${t(o.text)}`;
      case "sticker":
        if (o.sticker === "custom") return `내 스티커 · ${(o.imagePath ?? "").split("/").pop() ?? ""}`;
        return getSticker(o.sticker ?? "")?.label ?? "스티커";
    }
  }

  /** Placed-element layer list — top of the list = front of the map (drawn later) */
  private buildPanelOrnList(): void {
    const list = this.ornListEl;
    if (!list) return;
    list.empty();
    if (this.map.ornaments.length === 0) {
      list.createDiv({ cls: "fms-note", text: "요소를 추가하면 여기서 순서를 바꿀 수 있습니다." });
      return;
    }
    // Later in the array = drawn on top → list is reversed so the top row is the front
    for (let i = this.map.ornaments.length - 1; i >= 0; i--) {
      const orn = this.map.ornaments[i];
      const item = list.createDiv({ cls: `fms-orn-item${orn.id === this.selectedOrnId ? " is-active" : ""}` });
      item.dataset.ornId = orn.id;
      const nm = item.createSpan({ cls: "fms-orn-item-name", text: this.ornDisplayName(orn) });
      if (orn.name && orn.name.trim()) nm.addClass("is-named");
      const rename = () => {
        new TextEditModal(this.app, "요소 이름 지정 (레이어 식별용)", orn.name ?? "", false, (v) => {
          const t2 = v.trim();
          if (t2) orn.name = t2; else delete orn.name;
          this.persist();
        }).open();
      };
      nm.onclick = () => {
        this.selectedOrnId = orn.id;
        this.tool = "select";
        this.updateToolbarState();
        this.draw();
        this.buildPanelOrnList();
      };
      nm.ondblclick = (e) => { e.stopPropagation(); rename(); };
      const ctl = item.createDiv({ cls: "fms-orn-item-ctl" });
      const mk = (icon: string, label: string, fn: () => void) => {
        const b = ctl.createEl("button", { cls: "fms-mini-btn", attr: { "aria-label": label, title: label } });
        setIcon(b, icon);
        b.onclick = (e) => { e.stopPropagation(); fn(); };
      };
      mk("pencil", "이름 지정", rename);
      mk("chevron-up", "앞으로 한 칸", () => {
        if (this.reorderStep(this.map.ornaments, orn.id, 1)) this.persist();
      });
      mk("chevron-down", "뒤로 한 칸", () => {
        if (this.reorderStep(this.map.ornaments, orn.id, -1)) this.persist();
      });
      mk("trash-2", "삭제", () => {
        this.map.ornaments = this.map.ornaments.filter((o) => o.id !== orn.id);
        if (this.selectedOrnId === orn.id) this.selectedOrnId = null;
        this.persist();
      });
      item.oncontextmenu = (e) => { e.preventDefault(); this.ornMenu(orn, e); };
    }
  }

  /** Refresh only the list highlight on selection change (no rebuild) */
  private refreshOrnListActive(): void {
    const list = this.ornListEl;
    if (!list) return;
    for (const el of Array.from(list.children)) {
      const he = el as HTMLElement;
      if (he.dataset?.ornId) he.toggleClass("is-active", he.dataset.ornId === this.selectedOrnId);
    }
  }

  private buildPanelMarkerList(): void {
    const list = this.markerListEl;
    if (!list) return;
    list.empty();
    if (this.map.markers.length === 0) {
      list.createDiv({ cls: "fms-note", text: "마커 도구로 지도를 클릭해 추가하세요." });
      return;
    }
    for (const m of this.map.markers) {
      const item = list.createDiv({ cls: "fms-marker-item" });
      const label = item.createSpan({ cls: "fms-marker-label" });
      const ic = label.createSpan({ cls: "fms-marker-ic" });
      ic.innerHTML = iconSvg(m.icon);
      label.createSpan({ text: m.name });
      if (m.notePath) item.createSpan({ cls: "fms-marker-note", text: "🔗" });
      item.onclick = () => this.focusMarker(m);
      item.oncontextmenu = (e) => { e.preventDefault(); this.markerMenu(m, e); };
    }
  }

  // ── Drawing tool settings bar ────────────────────────

  private buildDrawBar(): void {
    const bar = this.rootEl.createDiv({ cls: "fms-paintbar fms-drawbar is-hidden" });
    this.drawBarEl = bar;

    const swatchRow = bar.createDiv({ cls: "fms-draw-swatches" });
    const swatches: HTMLElement[] = [];
    for (const c of DRAW_COLORS) {
      const sw = swatchRow.createEl("button", { cls: "fms-swatch" });
      sw.style.backgroundColor = c;
      if (c === this.drawColor) sw.addClass("is-active");
      sw.onclick = () => {
        this.drawColor = c;
        swatches.forEach((x) => x.removeClass("is-active"));
        sw.addClass("is-active");
      };
      swatches.push(sw);
    }

    const sizeWrap = bar.createDiv({ cls: "fms-paint-size" });
    sizeWrap.createSpan({ text: "굵기" });
    const size = sizeWrap.createEl("input", { type: "range" });
    size.min = "1"; size.max = "12"; size.step = "0.5";
    size.value = String(this.drawWidth);
    size.oninput = () => { this.drawWidth = parseFloat(size.value); };

    const dashLb = bar.createEl("label", { cls: "fms-check" });
    const dashCb = dashLb.createEl("input", { type: "checkbox" });
    dashCb.checked = this.drawDashed;
    dashCb.onchange = () => { this.drawDashed = dashCb.checked; };
    dashLb.createSpan({ text: "점선" });

    const eraseBtn = bar.createDiv({ cls: "fms-paint-btn fms-draw-erase", attr: { "aria-label": "지우개 — 그림 위를 클릭/드래그해 삭제" } });
    setIcon(eraseBtn.createSpan(), "eraser");
    eraseBtn.createSpan({ text: "지우개" });
    eraseBtn.onclick = () => {
      this.drawErase = !this.drawErase;
      this.updateDrawBar();
    };
  }

  private updateDrawBar(): void {
    const bar = this.drawBarEl;
    if (!bar) return;
    bar.toggleClass("is-hidden", !(this.tool === "draw" || this.tool === "arrow"));
    const eb = bar.querySelector<HTMLElement>(".fms-draw-erase");
    if (eb) eb.toggleClass("is-active", this.drawErase);
    this.canvasEl.style.cursor = this.drawErase ? "cell" : "crosshair";
  }

  /** Styled custom dropdown (replaces the HTML select) */
  /** A custom dropdown matched to the map theme (no native select) */
  private customSelect(
    parent: HTMLElement,
    options: [string, string][],
    value: string,
    onChange: (v: string) => void,
  ): void {
    const wrap = parent.createDiv({ cls: "fms-dd" });
    const btn = wrap.createEl("button", { cls: "fms-dd-btn" });
    const labSpan = btn.createSpan({ cls: "fms-dd-label", text: options.find(([v]) => v === value)?.[1] ?? "" });
    const chev = btn.createSpan({ cls: "fms-dd-chev" });
    setIcon(chev, "chevron-down");
    const pop = wrap.createDiv({ cls: "fms-dd-pop is-hidden" });
    let cur = value;
    for (const [val, lab] of options) {
      const opt = pop.createDiv({ cls: `fms-dd-opt${val === value ? " is-active" : ""}`, text: lab });
      opt.onclick = (e) => {
        e.stopPropagation();
        pop.addClass("is-hidden");
        wrap.removeClass("is-open");
        if (val === cur) return;
        cur = val;
        labSpan.setText(lab);
        pop.findAll(".fms-dd-opt").forEach((el) => el.removeClass("is-active"));
        opt.addClass("is-active");
        onChange(val);
      };
    }
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const opening = pop.hasClass("is-hidden");
      pop.toggleClass("is-hidden", !opening);
      wrap.toggleClass("is-open", opening);
    };
    this.registerDomEvent(document, "click", () => {
      pop.addClass("is-hidden");
      wrap.removeClass("is-open");
    });
  }

  private panelSection(parent: HTMLElement, title: string, collapsed = false): HTMLElement {
    const sec = parent.createDiv({ cls: "fms-section" });
    const head = sec.createDiv({ cls: `fms-section-head${collapsed ? " is-collapsed" : ""}`, text: title });
    const body = sec.createDiv({ cls: `fms-section-body${collapsed ? " is-hidden" : ""}` });
    head.onclick = () => {
      const hidden = body.hasClass("is-hidden");
      body.toggleClass("is-hidden", !hidden);
      head.toggleClass("is-collapsed", !hidden);
    };
    return body;
  }

  private slider(
    parent: HTMLElement, label: string,
    min: number, max: number, step: number, value: number,
    apply: (v: number) => void,
    regen = true,
  ): void {
    const block = parent.createDiv({ cls: "fms-slider-block" });
    const header = block.createDiv({ cls: "fms-slider-header" });
    header.createSpan({ cls: "fms-slider-label", text: label });
    
    const numInput = header.createEl("input", { type: "number", cls: "fms-slider-number" });
    numInput.min = String(min);
    numInput.max = String(max);
    numInput.step = String(step);
    numInput.value = fmt(value, step);

    const sliderContainer = block.createDiv({ cls: "fms-slider-container" });
    const rangeInput = sliderContainer.createEl("input", { type: "range", cls: "fms-slider-range" });
    rangeInput.min = String(min);
    rangeInput.max = String(max);
    rangeInput.step = String(step);
    rangeInput.value = String(value);

    rangeInput.oninput = () => {
      const v = parseFloat(rangeInput.value);
      numInput.value = fmt(v, step);
      apply(v);
      this.requestSave();
      if (regen) this.regenDebounced(180);
      else this.draw();
    };

    numInput.onchange = () => {
      let v = parseFloat(numInput.value);
      if (isNaN(v)) v = value;
      v = Math.max(min, Math.min(max, v));
      numInput.value = fmt(v, step);
      rangeInput.value = String(v);
      apply(v);
      this.requestSave();
      if (regen) this.regenDebounced(180);
      else this.draw();
    };
  }
}

// ── Utilities ───────────────────────────────────────────

function fmt(v: number, step: number): string {
  return step >= 1 ? String(Math.round(v)) : v.toFixed(2);
}

function clampI8(v: number): number {
  return Math.max(-127, Math.min(127, Math.round(v)));
}

function hexToRgba(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(192,57,43,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function centroid(points: [number, number][]): [number, number] {
  let sx = 0, sy = 0;
  for (const [x, y] of points) { sx += x; sy += y; }
  return [sx / points.length, sy / points.length];
}

function pointInPolygon(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
