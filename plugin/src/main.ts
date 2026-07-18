import { Notice, Plugin, TFile, TFolder, normalizePath } from "obsidian";
import { VellumView, VIEW_TYPE_FMAP } from "./view";
import { defaultMapData, parseMapData, randomizeGenParams } from "./types";
import { installSamplePack } from "./sample";

export default class VellumPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE_FMAP, (leaf) => new VellumView(leaf));
    this.registerExtensions(["fmap"], VIEW_TYPE_FMAP);

    this.addRibbonIcon("map", "새 판타지 지도", () => void this.createNewMap());

    this.addCommand({
      id: "create-map",
      name: "새 판타지 지도 만들기",
      callback: () => void this.createNewMap(),
    });

    this.addCommand({
      id: "install-sample",
      name: "샘플팩 설치 (온보딩)",
      callback: async () => {
        const file = await installSamplePack(this.app);
        if (file) {
          await this.app.workspace.getLeaf(true).openFile(file);
          new Notice("샘플팩이 설치되었습니다. '시작하기.md'를 확인하세요!");
        }
      },
    });

    this.addCommand({
      id: "export-png",
      name: "지도를 PNG 이미지로 내보내기",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(VellumView);
        if (!view) return false;
        if (checking) return true;
        void view.exportPNG();
        return true;
      },
    });

    this.addCommand({
      id: "locate-note-on-map",
      name: "현재 노트를 지도에서 보기",
      checkCallback: (checking) => {
        const active = this.app.workspace.getActiveFile();
        if (!active || active.extension !== "md") return false;
        if (checking) return true;
        void this.locateNoteOnMap(active);
        return true;
      },
    });
  }

  onunload(): void {
    // Obsidian cleans up registered views/extensions automatically.
  }

  private async createNewMap(): Promise<void> {
    const parent = this.getActiveFolder();
    const base = parent === "/" || parent === "" ? "" : parent + "/";
    let path = normalizePath(`${base}새 지도.fmap`);
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = normalizePath(`${base}새 지도 ${++n}.fmap`);
    }
    const data = defaultMapData(path.replace(/\.fmap$/, "").split("/").pop() ?? "지도");
    // A new map is a fully random world — advanced settings live in the panel (reproducible via seed)
    data.gen = randomizeGenParams(data.gen.seed);
    const file = await this.app.vault.create(path, JSON.stringify(data, null, 2));
    await this.app.workspace.getLeaf(true).openFile(file);
  }

  private getActiveFolder(): string {
    const active = this.app.workspace.getActiveFile();
    if (active?.parent) return active.parent.path;
    const root = this.app.vault.getRoot();
    return root instanceof TFolder ? root.path : "/";
  }

  /** Search every .fmap in the vault for a marker referencing this note, and open that map */
  private async locateNoteOnMap(note: TFile): Promise<void> {
    const maps = this.app.vault.getFiles().filter((f) => f.extension === "fmap");
    for (const mapFile of maps) {
      try {
        const data = parseMapData(await this.app.vault.cachedRead(mapFile));
        const hit = data.markers.find((m) => m.notePath === note.path);
        if (!hit) continue;

        // Reuse an already-open view if there is one
        let targetView: VellumView | null = null;
        for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_FMAP)) {
          const v = leaf.view;
          if (v instanceof VellumView && v.file?.path === mapFile.path) {
            this.app.workspace.revealLeaf(leaf);
            targetView = v;
            break;
          }
        }
        if (!targetView) {
          const leaf = this.app.workspace.getLeaf(true);
          await leaf.openFile(mapFile);
          const v = leaf.view;
          if (v instanceof VellumView) targetView = v;
        }
        // Retry focusing until the view has loaded its data
        let tries = 0;
        const attempt = () => {
          if (targetView?.focusMarkerByNote(note.path)) return;
          if (++tries < 12) window.setTimeout(attempt, 150);
        };
        window.setTimeout(attempt, 100);
        return;
      } catch {
        // Skip corrupted map files
      }
    }
    new Notice("이 노트와 연결된 마커가 있는 지도를 찾지 못했습니다.");
  }
}
