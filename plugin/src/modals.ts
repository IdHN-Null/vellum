import { App, FuzzySuggestModal, Modal, Setting, TFile } from "obsidian";
import { MARKER_ICONS, iconSvg, normalizeIcon } from "./icons";
import { Marker, Region } from "./types";

/** 마크다운 노트 선택 모달 */
export class NoteSuggestModal extends FuzzySuggestModal<TFile> {
  private onChoose: (file: TFile) => void;

  constructor(app: App, onChoose: (file: TFile) => void) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("연결할 노트를 검색...");
  }

  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onChoose(file);
  }
}

/** 볼트 이미지 선택 모달 */
export class ImageSuggestModal extends FuzzySuggestModal<TFile> {
  private onChoose: (file: TFile) => void;

  constructor(app: App, onChoose: (file: TFile) => void) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("지도 이미지를 검색... (png/jpg/webp)");
  }

  getItems(): TFile[] {
    const exts = new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp"]);
    return this.app.vault.getFiles().filter((f) => exts.has(f.extension.toLowerCase()));
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onChoose(file);
  }
}

/** 마커 편집 모달 */
export class MarkerModal extends Modal {
  private marker: Marker;
  private onSave: (m: Marker) => void;
  private onDelete?: () => void;

  constructor(app: App, marker: Marker, onSave: (m: Marker) => void, onDelete?: () => void) {
    super(app);
    this.marker = { ...marker };
    this.onSave = onSave;
    this.onDelete = onDelete;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: this.marker.name ? "마커 편집" : "새 마커" });

    new Setting(contentEl)
      .setName("이름")
      .addText((t) => {
        t.setValue(this.marker.name).onChange((v) => (this.marker.name = v));
        window.setTimeout(() => t.inputEl.focus(), 30);
      });

    const iconSetting = new Setting(contentEl).setName("아이콘");
    const iconRow = iconSetting.controlEl.createDiv({ cls: "fms-icon-row" });
    const iconBtns: HTMLElement[] = [];
    const current = normalizeIcon(this.marker.icon);
    for (const ic of MARKER_ICONS) {
      const btn = iconRow.createEl("button", { cls: "fms-icon-btn", attr: { "aria-label": ic.label } });
      btn.innerHTML = iconSvg(ic.id);
      if (ic.id === current) btn.addClass("is-active");
      btn.onclick = () => {
        this.marker.icon = ic.id;
        iconBtns.forEach((b) => b.removeClass("is-active"));
        btn.addClass("is-active");
      };
      iconBtns.push(btn);
    }

    new Setting(contentEl)
      .setName("크기")
      .addSlider((sl) =>
        sl.setLimits(0.5, 3, 0.1)
          .setValue(this.marker.size ?? 1)
          .setDynamicTooltip()
          .onChange((v) => (this.marker.size = v)),
      );

    new Setting(contentEl)
      .setName("연결된 노트")
      .setDesc(this.marker.notePath ?? "없음")
      .addButton((b) =>
        b.setButtonText("노트 선택").onClick(() => {
          new NoteSuggestModal(this.app, (file) => {
            this.marker.notePath = file.path;
            if (!this.marker.name) this.marker.name = file.basename;
            this.onOpen2();
          }).open();
        }),
      )
      .addExtraButton((b) =>
        b.setIcon("x").setTooltip("연결 해제").onClick(() => {
          delete this.marker.notePath;
          this.onOpen2();
        }),
      );

    const footer = new Setting(contentEl);
    if (this.onDelete) {
      footer.addButton((b) =>
        b.setButtonText("삭제").setWarning().onClick(() => {
          this.close();
          this.onDelete?.();
        }),
      );
    }
    footer.addButton((b) =>
      b.setButtonText("저장").setCta().onClick(() => {
        if (!this.marker.name) this.marker.name = "이름 없는 마커";
        this.close();
        this.onSave(this.marker);
      }),
    );
  }

  /** 노트 연결 변경 후 UI 리프레시 */
  private onOpen2(): void {
    this.contentEl.empty();
    this.onOpen();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/** 배치 요소 텍스트 편집 모달 (라벨·메모·제목) */
export class TextEditModal extends Modal {
  private value: string;
  private heading: string;
  private multiline: boolean;
  private onSave: (v: string) => void;

  constructor(app: App, heading: string, initial: string, multiline: boolean, onSave: (v: string) => void) {
    super(app);
    this.heading = heading;
    this.value = initial;
    this.multiline = multiline;
    this.onSave = onSave;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: this.heading });
    let input: HTMLInputElement | HTMLTextAreaElement;
    if (this.multiline) {
      input = contentEl.createEl("textarea", { cls: "fms-textarea" });
      input.rows = 5;
    } else {
      input = contentEl.createEl("input", { type: "text", cls: "fms-text-input" });
    }
    input.value = this.value;
    input.oninput = () => (this.value = input.value);
    input.onkeydown = (e) => {
      if (e.key === "Enter" && (!this.multiline || e.ctrlKey)) {
        e.preventDefault();
        this.close();
        this.onSave(this.value);
      }
    };
    window.setTimeout(() => input.focus(), 30);

    new Setting(contentEl).addButton((b) =>
      b.setButtonText("저장").setCta().onClick(() => {
        this.close();
        this.onSave(this.value);
      }),
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

const REGION_COLORS = ["#c0392b", "#8e44ad", "#2471a3", "#1e8449", "#b7950b", "#6e2c00", "#5d6d7e"];

/** 지역 편집 모달 */
export class RegionModal extends Modal {
  private region: Region;
  private onSave: (r: Region) => void;
  private onDelete?: () => void;

  constructor(app: App, region: Region, onSave: (r: Region) => void, onDelete?: () => void) {
    super(app);
    this.region = { ...region, points: region.points.map((p) => [...p] as [number, number]) };
    this.onSave = onSave;
    this.onDelete = onDelete;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: this.region.name ? "지역 편집" : "새 지역" });

    new Setting(contentEl)
      .setName("이름")
      .addText((t) => {
        t.setValue(this.region.name).onChange((v) => (this.region.name = v));
        window.setTimeout(() => t.inputEl.focus(), 30);
      });

    const colorSetting = new Setting(contentEl).setName("색상");
    const row = colorSetting.controlEl.createDiv({ cls: "fms-icon-row" });
    const swatches: HTMLElement[] = [];
    for (const c of REGION_COLORS) {
      const sw = row.createEl("button", { cls: "fms-swatch" });
      sw.style.backgroundColor = c;
      if (c === this.region.color) sw.addClass("is-active");
      sw.onclick = () => {
        this.region.color = c;
        swatches.forEach((s) => s.removeClass("is-active"));
        sw.addClass("is-active");
      };
      swatches.push(sw);
    }

    new Setting(contentEl)
      .setName("연결된 노트")
      .setDesc(this.region.notePath ?? "없음")
      .addButton((b) =>
        b.setButtonText("노트 선택").onClick(() => {
          new NoteSuggestModal(this.app, (file) => {
            this.region.notePath = file.path;
            if (!this.region.name) this.region.name = file.basename;
            this.contentEl.empty();
            this.onOpen();
          }).open();
        }),
      );

    const footer = new Setting(contentEl);
    if (this.onDelete) {
      footer.addButton((b) =>
        b.setButtonText("삭제").setWarning().onClick(() => {
          this.close();
          this.onDelete?.();
        }),
      );
    }
    footer.addButton((b) =>
      b.setButtonText("저장").setCta().onClick(() => {
        if (!this.region.name) this.region.name = "이름 없는 지역";
        this.close();
        this.onSave(this.region);
      }),
    );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
