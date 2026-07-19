import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, normalizePath } from "obsidian";
import { VellumView, VIEW_TYPE_FMAP } from "./view";
import { defaultMapData, parseMapData, randomizeGenParams } from "./types";
import { installSamplePack } from "./sample";
import { LOCALE_LABELS, LocaleId, setLocale, t } from "./i18n";

interface VellumSettings {
  locale: LocaleId;
}

const DEFAULT_SETTINGS: VellumSettings = {
  locale: "en", // English by default; the map's own language is always English
};

export default class VellumPlugin extends Plugin {
  settings: VellumSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    setLocale(this.settings.locale);

    this.registerView(VIEW_TYPE_FMAP, (leaf) => new VellumView(leaf));
    this.registerExtensions(["fmap"], VIEW_TYPE_FMAP);
    this.addSettingTab(new VellumSettingTab(this.app, this));

    this.addRibbonIcon("map", t("cmd.newMapRibbon"), () => void this.createNewMap());

    this.addCommand({
      id: "create-map",
      name: t("cmd.newMap"),
      callback: () => void this.createNewMap(),
    });

    this.addCommand({
      id: "install-sample",
      name: t("cmd.installSample"),
      callback: async () => {
        const file = await installSamplePack(this.app);
        if (file) {
          await this.app.workspace.getLeaf(true).openFile(file);
          new Notice(t("notice.sampleInstalled"));
        }
      },
    });

    this.addCommand({
      id: "export-png",
      name: t("cmd.exportPng"),
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
      name: t("cmd.locateNote"),
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

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /** Apply a locale change: persist, switch the string table, refresh open map views */
  async applyLocale(locale: LocaleId): Promise<void> {
    this.settings.locale = locale;
    setLocale(locale);
    await this.saveSettings();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_FMAP)) {
      const v = leaf.view;
      if (v instanceof VellumView) await v.refreshUI();
    }
  }

  private async createNewMap(): Promise<void> {
    const parent = this.getActiveFolder();
    const base = parent === "/" || parent === "" ? "" : parent + "/";
    // Map content is always English — the filename becomes the on-map title
    let path = normalizePath(`${base}New Map.fmap`);
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(path)) {
      path = normalizePath(`${base}New Map ${++n}.fmap`);
    }
    const data = defaultMapData(path.replace(/\.fmap$/, "").split("/").pop() ?? "Map");
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
    new Notice(t("notice.noMarkerMap"));
  }
}

class VellumSettingTab extends PluginSettingTab {
  private plugin: VellumPlugin;

  constructor(app: App, plugin: VellumPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName(t("settings.language"))
      .setDesc(t("settings.languageDesc"))
      .addDropdown((dd) => {
        (Object.keys(LOCALE_LABELS) as LocaleId[]).forEach((code) => dd.addOption(code, LOCALE_LABELS[code]));
        dd.setValue(this.plugin.settings.locale);
        dd.onChange(async (v) => {
          await this.plugin.applyLocale(v as LocaleId);
          this.display(); // re-render this tab in the new language
        });
      });
  }
}
