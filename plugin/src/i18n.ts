/**
 * Plugin UI localisation. The interface language is a plugin setting
 * (default: English); strings resolve at call time via t().
 *
 * Deliberately separate from this: text that ends up ON the map
 * (default titles, sample-pack content, new-map filenames) is fixed
 * English — the map's language — regardless of the UI locale.
 */

export type LocaleId = "en" | "en-GB" | "es" | "zh" | "ja" | "ko";

export const LOCALE_LABELS: Record<LocaleId, string> = {
  "en": "English (US)",
  "en-GB": "English (UK)",
  "es": "Español",
  "zh": "中文",
  "ja": "日本語",
  "ko": "한국어",
};

let current: LocaleId = "en";

export function setLocale(l: LocaleId): void {
  current = l;
}

export function getLocale(): LocaleId {
  return current;
}

type Msg = { en: string; "en-GB"?: string; es?: string; zh?: string; ja?: string; ko?: string };

const M: Record<string, Msg> = {
  // ── Commands / notices ────────────────────────────────
  "cmd.newMapRibbon": { en: "New fantasy map", ko: "새 판타지 지도" },
  "cmd.newMap": { en: "Create new fantasy map", ko: "새 판타지 지도 만들기" },
  "cmd.installSample": { en: "Install sample pack (onboarding)", ko: "샘플팩 설치 (온보딩)" },
  "cmd.exportPng": { en: "Export map as PNG image", ko: "지도를 PNG 이미지로 내보내기" },
  "cmd.locateNote": { en: "Show current note on the map", ko: "현재 노트를 지도에서 보기" },
  "notice.sampleInstalled": { en: "Sample pack installed — see 'Getting started.md'!", ko: "샘플팩이 설치되었습니다. 'Getting started.md'를 확인하세요!" },
  "notice.sampleExists": { en: "The sample map already exists — opening it.", ko: "샘플 지도가 이미 존재합니다. 기존 파일을 엽니다." },
  "notice.noMarkerMap": { en: "No map with a marker linked to this note was found.", ko: "이 노트와 연결된 마커가 있는 지도를 찾지 못했습니다." },
  "notice.imageNoTerrainEdit": { en: "Terrain editing is not available on image maps.", ko: "이미지 지도에서는 지형 편집을 사용할 수 없습니다." },
  "notice.regionMinVertices": { en: "A region needs at least 3 vertices.", ko: "지역은 최소 3개의 꼭짓점이 필요합니다." },
  "notice.exported": { en: "Map exported: ", ko: "지도를 내보냈습니다: " },
  "notice.pngFailed": { en: "PNG encoding failed.", ko: "PNG 인코딩에 실패했습니다." },
  "notice.imageMissing": { en: "Image not found: ", ko: "이미지를 찾을 수 없습니다: " },
  "view.displayText": { en: "Fantasy map", ko: "판타지 지도" },

  // ── Settings ──────────────────────────────────────────
  "settings.language": { en: "Language", ko: "언어" },
  "settings.languageDesc": {
    en: "Plugin interface language. Open map views refresh immediately; command names apply after restarting Obsidian.",
    ko: "플러그인 UI 언어입니다. 열려 있는 지도 뷰는 즉시 갱신되며, 명령어 이름은 Obsidian 재시작 후 적용됩니다.",
  },

  // ── Tools (toolbar labels double as hints) ────────────
  "tool.select": { en: "Select/move — drag markers, regions or drawings to move; Delete removes", ko: "선택/이동 — 마커·지역·그림 드래그로 이동, Delete로 삭제" },
  "tool.marker": { en: "Place marker — click to add a marker", ko: "마커 배치 — 클릭한 위치에 마커 추가" },
  "tool.region": { en: "Draw region — click for vertices, double-click/Enter to finish", ko: "지역 그리기 — 클릭으로 꼭짓점, 더블클릭/Enter로 완성" },
  "tool.draw": { en: "Freehand — drag to draw paths and curves", ko: "자유 그리기 — 드래그로 경로·곡선 그리기" },
  "tool.arrow": { en: "Arrow — drag to point the way", ko: "화살표 — 드래그로 방향 표시" },
  "tool.raise": { en: "Raise terrain — drag to lift", ko: "지형 올리기 — 드래그로 융기" },
  "tool.lower": { en: "Lower terrain — drag to sink", ko: "지형 내리기 — 드래그로 침강" },
  "tool.paint": { en: "Paint biomes — 1–5 to choose, E erases", ko: "바이옴 칠하기 — 1~5로 종류 선택, E 지우개" },
  "aria.exportPng": { en: "Export as PNG", ko: "PNG로 내보내기" },
  "aria.togglePanel": { en: "Collapse/expand the settings panel", ko: "설정 패널 접기/펼치기" },

  // ── Hints ─────────────────────────────────────────────
  "hint.ornSelected": { en: "Drag: move · corner handle: resize · double-click: edit text · Delete: remove", ko: "드래그: 이동 · 모서리 핸들: 크기 · 더블클릭: 텍스트 편집 · Delete: 삭제" },
  "hint.ornSelectedNoText": { en: "Drag: move · corner handle: resize · Delete: remove", ko: "드래그: 이동 · 모서리 핸들: 크기 · Delete: 삭제" },
  "hint.regionSelected": { en: "Drag region: move · drag vertex: reshape · right-click: menu", ko: "지역 드래그: 이동 · 꼭짓점 드래그: 모양 수정 · 우클릭: 메뉴" },
  "hint.annoSelected": { en: "Drag: move · Delete: remove", ko: "드래그: 이동 · Delete: 삭제" },
  "hint.regionVertices": { en: "{n} vertices — double-click/Enter to finish, Esc to cancel", ko: "꼭짓점 {n}개 — 더블클릭/Enter로 완성, Esc로 취소" },
  "hint.generating": { en: "Generating terrain…", ko: "지형 생성 중…" },
  "hint.rendering": { en: "Rendering map… ({n} tiles)", ko: "지도 렌더링 중… ({n} 타일)" },

  // ── Panel tabs & sections ─────────────────────────────
  "tab.terrain": { en: "Terrain", ko: "지형" },
  "tab.style": { en: "Style", ko: "꾸미기" },
  "tab.elements": { en: "Elements", ko: "요소" },
  "tab.file": { en: "File", ko: "파일" },
  "sec.genOptions": { en: "Terrain generation options", ko: "지형 생성 옵션" },
  "gen.rivers": { en: "Rivers", ko: "강" },
  "gen.snow": { en: "Snow", ko: "눈" },
  "gen.desert": { en: "Desert", ko: "사막" },
  "gen.forest": { en: "Forest", ko: "숲" },
  "sec.generate": { en: "Generate", ko: "생성" },
  "btn.fullRandom": { en: "Fully random", ko: "완전 랜덤 생성" },
  "lbl.seed": { en: "Seed", ko: "시드" },
  "aria.seedOnly": { en: "Randomize the seed only (keep settings)", ko: "시드만 무작위 (설정 유지)" },
  "note.generate": { en: "Continents, islands and sea level are chosen for you. Fine-tune in the advanced sections.", ko: "대륙·섬·해수면 등을 알아서 정합니다. 세부 조정은 고급 설정에서." },
  "sec.advLand": { en: "Advanced · land & sea", ko: "고급 · 대륙과 바다" },
  "sl.seaLevel": { en: "Sea level", ko: "해수면 높이" },
  "sl.continentCount": { en: "Continents", ko: "대륙 수" },
  "sl.islandCount": { en: "Islands", ko: "섬 수" },
  "sl.landAmount": { en: "Continent size", ko: "대륙 크기" },
  "sl.continents": { en: "Continent spread", ko: "대륙 분포" },
  "sl.roughness": { en: "Roughness", ko: "거칠기" },
  "sec.advClimate": { en: "Advanced · climate & detail", ko: "고급 · 기후와 디테일" },
  "sl.climate": { en: "Climate", ko: "기후 분포" },
  "sl.detail": { en: "Detail", ko: "디테일" },
  "sl.precision": { en: "Precision", ko: "정밀도" },
  "sl.polarNorth": { en: "North polar snow", ko: "북극 설원" },
  "sl.polarSouth": { en: "South polar snow", ko: "남극 설원" },
  "sec.advWater": { en: "Advanced · water & erosion", ko: "고급 · 물과 침식" },
  "sl.erosion": { en: "Erosion", ko: "침식" },
  "sl.riverDensity": { en: "River density", ko: "강 밀도" },
  "sec.resetEdits": { en: "Reset edits", ko: "편집 초기화" },
  "btn.clearEdits": { en: "Reset terrain edits", ko: "지형 편집 초기화" },
  "btn.clearPaint": { en: "Reset biome paint", ko: "바이옴 페인트 초기화" },
  "sec.mapSize": { en: "Map size", ko: "지도 크기" },
  "btn.applySize": { en: "Apply size", ko: "크기 적용" },
  "note.mapSize": {
    en: "128–3072 cells. Large maps render progressively in tiles; bigger maps generate more slowly. Brush edits are interpolated and kept.",
    ko: "128~3072 셀. 큰 지도는 타일 단위로 순차 렌더됩니다(청크). 클수록 생성이 느려지니 주의. 브러시 편집은 보간되어 유지됩니다.",
  },
  "sec.terrainColors": { en: "Terrain colors", ko: "지형 색상" },
  "btn.resetColors": { en: "Restore default colors", ko: "기본 색상 복원" },
  "sec.coast": { en: "Coastline", ko: "해안선" },
  "sl.coastWidth": { en: "Width", ko: "폭" },
  "lbl.coastColor": { en: "Band color", ko: "띠 색상" },
  "btn.auto": { en: "Auto", ko: "자동" },
  "sec.effects": { en: "Whole-map effects", ko: "전체 효과" },
  "fx.frame": { en: "Frame", ko: "테두리" },
  "fx.waves": { en: "Waves", ko: "파도" },
  "fx.vignette": { en: "Vignette", ko: "비네트" },
  "sec.texture": { en: "Texture", ko: "질감" },
  "sl.grain": { en: "Paper grain", ko: "종이 결" },
  "sl.relief": { en: "Shading (wash)", ko: "명암(워시)" },
  "sl.mottle": { en: "Paper mottle", ko: "종이 얼룩" },
  "sl.markerScale": { en: "Icon size", ko: "아이콘 크기" },
  "sec.textElements": { en: "Text elements", ko: "텍스트 요소" },
  "orn.title": { en: "Title", ko: "제목" },
  "orn.label": { en: "Place name", ko: "지명" },
  "orn.banner": { en: "Ribbon banner", ko: "리본 문구" },
  "orn.note": { en: "Note", ko: "메모" },
  "aria.add": { en: "Add {name}", ko: "{name} 추가" },
  "note.textElements": { en: "Double-click to edit text; drag to move, resize with the handle, Delete removes.", ko: "더블클릭으로 텍스트 편집, 드래그 이동·크기 조절·Delete 삭제." },
  "sec.stickers": { en: "Decorative stickers", ko: "꾸미기 스티커" },
  "btn.customSticker": { en: "Add my sticker (vault image)…", ko: "내 스티커 추가 (볼트 이미지)…" },
  "note.stickers": {
    en: "Click to add at the map center — drag to move, resize, Delete removes. Custom stickers use vault PNGs (transparent background recommended).",
    ko: "클릭해 지도 중앙에 추가 — 드래그 이동·크기 조절·Delete 삭제. 내 스티커는 볼트의 PNG(투명 배경 권장)를 사용합니다.",
  },
  "sec.styleSec": { en: "Style", ko: "스타일" },
  "lbl.theme": { en: "Theme", ko: "테마" },
  "style.parchment": { en: "Parchment", ko: "양피지" },
  "style.color": { en: "Color", ko: "컬러" },
  "style.ink": { en: "Ink", ko: "잉크" },
  "chk.contours": { en: "Show contours (2D)", ko: "등고선 표시 (2D)" },
  "chk.coastHatch": { en: "Coastal hatching", ko: "해안 헤칭 (잔선)" },
  "chk.landHatch": { en: "Land hatching", ko: "육지 헤칭" },
  "chk.grid": { en: "Coordinate grid", ko: "좌표 격자" },
  "chk.rhumb": { en: "Rhumb lines", ko: "풍배선 표시" },
  "chk.fast": { en: "Fast render (lower quality)", ko: "빠른 렌더 (품질 저하)" },
  "sec.background": { en: "Map background", ko: "지도 배경" },
  "lbl.imagePrefix": { en: "Image: ", ko: "이미지: " },
  "btn.toGenerated": { en: "Switch to generated terrain", ko: "생성 지형으로 전환" },
  "btn.loadImage": { en: "Load vault image", ko: "볼트 이미지 불러오기" },
  "note.background": { en: "Load a hand-drawn or external map image and place markers on it.", ko: "손그림·외부 제작 지도를 불러와 마커를 배치할 수 있습니다." },
  "sec.export": { en: "Export", ko: "내보내기" },
  "btn.exportPng2x": { en: "Export as PNG image (2×)", ko: "PNG 이미지로 내보내기 (2×)" },
  "sec.layers": { en: "Placed elements (layers)", ko: "배치된 요소 (레이어)" },
  "note.layers": { en: "Top of the list = front of the map. On the canvas: Ctrl+↑/↓ one step, Ctrl+Shift+↑/↓ front/back.", ko: "목록 위쪽 = 지도에서 앞. 캔버스에서 Ctrl+↑/↓(한 칸), Ctrl+Shift+↑/↓(맨 앞/뒤)로도 이동." },
  "note.layersEmpty": { en: "Add elements to reorder them here.", ko: "요소를 추가하면 여기서 순서를 바꿀 수 있습니다." },
  "sec.markers": { en: "Markers", ko: "마커" },
  "note.markersEmpty": { en: "Click the map with the marker tool to add one.", ko: "마커 도구로 지도를 클릭해 추가하세요." },

  // ── Paint / draw bars ─────────────────────────────────
  "paint.erase": { en: "Erase", ko: "지우기" },
  "aria.paintErase": { en: "Eraser (E) — remove painted biome", ko: "지우개 (E) — 칠한 바이옴 제거" },
  "lbl.size": { en: "Size", ko: "크기" },
  "lbl.width": { en: "Width", ko: "굵기" },
  "lbl.dashed": { en: "Dashed", ko: "점선" },
  "draw.eraser": { en: "Eraser", ko: "지우개" },
  "aria.drawErase": { en: "Eraser — click/drag over drawings to delete", ko: "지우개 — 그림 위를 클릭/드래그해 삭제" },

  // ── Context menus ─────────────────────────────────────
  "menu.openNote": { en: "Open note", ko: "노트 열기" },
  "menu.edit": { en: "Edit", ko: "편집" },
  "menu.front": { en: "Bring to front", ko: "맨 앞으로" },
  "menu.back": { en: "Send to back", ko: "맨 뒤로" },
  "menu.delete": { en: "Delete", ko: "삭제" },
  "menu.editVertices": { en: "Edit vertices", ko: "꼭짓점 편집" },
  "menu.editText": { en: "Edit text", ko: "텍스트 편집" },
  "menu.setName": { en: "Set name (layers)", ko: "이름 지정 (레이어)" },
  "menu.forward": { en: "Forward one step (Ctrl+↑)", ko: "앞으로 한 칸 (Ctrl+↑)" },
  "menu.backward": { en: "Back one step (Ctrl+↓)", ko: "뒤로 한 칸 (Ctrl+↓)" },
  "menu.front2": { en: "To front (Ctrl+Shift+↑)", ko: "맨 앞으로 (Ctrl+Shift+↑)" },
  "menu.back2": { en: "To back (Ctrl+Shift+↓)", ko: "맨 뒤로 (Ctrl+Shift+↓)" },
  "aria.rename": { en: "Set name", ko: "이름 지정" },
  "aria.forward": { en: "Forward one step", ko: "앞으로 한 칸" },
  "aria.backward": { en: "Back one step", ko: "뒤로 한 칸" },
  "aria.delete": { en: "Delete", ko: "삭제" },

  // ── Modals ────────────────────────────────────────────
  "modal.editMarker": { en: "Edit marker", ko: "마커 편집" },
  "modal.newMarker": { en: "New marker", ko: "새 마커" },
  "modal.name": { en: "Name", ko: "이름" },
  "modal.icon": { en: "Icon", ko: "아이콘" },
  "modal.size": { en: "Size", ko: "크기" },
  "modal.linkedNote": { en: "Linked note", ko: "연결된 노트" },
  "modal.none": { en: "None", ko: "없음" },
  "modal.chooseNote": { en: "Choose note", ko: "노트 선택" },
  "modal.unlink": { en: "Unlink", ko: "연결 해제" },
  "modal.delete": { en: "Delete", ko: "삭제" },
  "modal.save": { en: "Save", ko: "저장" },
  "modal.editRegion": { en: "Edit region", ko: "지역 편집" },
  "modal.newRegion": { en: "New region", ko: "새 지역" },
  "modal.color": { en: "Color", ko: "색상" },
  "modal.searchNote": { en: "Search for a note to link...", ko: "연결할 노트를 검색..." },
  "modal.searchImage": { en: "Search map images... (png/jpg/webp)", ko: "지도 이미지를 검색... (png/jpg/webp)" },
  "heading.editTitle": { en: "Edit title", ko: "제목 편집" },
  "heading.editNote": { en: "Edit note (Ctrl+Enter saves)", ko: "메모 편집 (Ctrl+Enter 저장)" },
  "heading.editBanner": { en: "Edit ribbon text", ko: "리본 문구 편집" },
  "heading.editText": { en: "Edit text", ko: "텍스트 편집" },
  "heading.setName": { en: "Name this element (for the layer list)", ko: "요소 이름 지정 (레이어 식별용)" },

  // ── Placed-element display names ──────────────────────
  "ornname.compass": { en: "Compass", ko: "나침반" },
  "ornname.ship": { en: "Ship", ko: "범선" },
  "ornname.monster": { en: "Sea monster", ko: "바다 괴물" },
  "ornname.title": { en: "Title · ", ko: "제목 · " },
  "ornname.label": { en: "Place · ", ko: "지명 · " },
  "ornname.banner": { en: "Ribbon · ", ko: "리본 · " },
  "ornname.note": { en: "Note · ", ko: "메모 · " },
  "ornname.customSticker": { en: "My sticker · ", ko: "내 스티커 · " },
  "ornname.sticker": { en: "Sticker", ko: "스티커" },

  // ── Marker icon labels ────────────────────────────────
  "icon.pin": { en: "Pin", ko: "핀" },
  "icon.castle": { en: "Castle", ko: "성" },
  "icon.town": { en: "Town", ko: "마을" },
  "icon.anchor": { en: "Harbor", ko: "항구" },
  "icon.mountain": { en: "Mountain", ko: "산" },
  "icon.tree": { en: "Forest", ko: "숲" },
  "icon.tower": { en: "Tower", ko: "탑" },
  "icon.temple": { en: "Temple", ko: "신전" },
  "icon.swords": { en: "Battlefield", ko: "전장" },
  "icon.gem": { en: "Treasure", ko: "보물" },
  "icon.tent": { en: "Camp", ko: "야영지" },
  "icon.star": { en: "Landmark", ko: "명소" },
  "icon.x": { en: "X mark", ko: "X 표시" },
  "icon.skull": { en: "Danger", ko: "위험" },
  "icon.flag": { en: "Flag", ko: "깃발" },
  "icon.chest": { en: "Treasure chest", ko: "보물상자" },
  "icon.cross": { en: "Sanctuary", ko: "성소" },

  // ── Sticker categories & labels ───────────────────────
  "cat.sky": { en: "Sky", ko: "하늘" },
  "cat.sea": { en: "Sea", ko: "바다" },
  "cat.land": { en: "Land", ko: "땅" },
  "cat.map": { en: "Map", ko: "지도" },
  "sticker.cloud": { en: "Cloud", ko: "구름" },
  "sticker.sun": { en: "Sun", ko: "태양" },
  "sticker.moon": { en: "Crescent moon", ko: "초승달" },
  "sticker.birds": { en: "Flock of birds", ko: "새 떼" },
  "sticker.whale": { en: "Whale", ko: "고래" },
  "sticker.fish": { en: "School of fish", ko: "물고기 떼" },
  "sticker.whirlpool": { en: "Whirlpool", ko: "소용돌이" },
  "sticker.waves": { en: "Waves", ko: "파도" },
  "sticker.dragon": { en: "Dragon", ko: "드래곤" },
  "sticker.tent": { en: "Camp", ko: "야영지" },
  "sticker.ruins": { en: "Ancient ruins", ko: "고대 유적" },
  "sticker.tower": { en: "Tower", ko: "탑" },
  "sticker.wind": { en: "Wind", ko: "바람" },
  "sticker.storm": { en: "Storm cloud", ko: "폭풍 구름" },
  "sticker.lighthouse": { en: "Lighthouse", ko: "등대" },
  "sticker.kraken": { en: "Kraken", ko: "크라켄" },
  "sticker.castle": { en: "Castle", ko: "성" },
  "sticker.bridge": { en: "Bridge", ko: "다리" },
  "sticker.windmill": { en: "Windmill", ko: "풍차" },
  "sticker.inkblot": { en: "Ink blot", ko: "잉크 얼룩" },
  "sticker.scroll": { en: "Scroll", ko: "두루마리" },
  "sticker.flourish": { en: "Corner flourish", ko: "모서리 장식" },
};

/** Translate a key into the current locale (falls back to English, then the key itself). */
export function t(key: string): string {
  const m = M[key];
  if (!m) return key;
  return m[current] ?? m.en;
}

/** t() with {name}-style placeholder substitution. */
export function tf(key: string, vars: Record<string, string | number>): string {
  let s = t(key);
  for (const k in vars) s = s.replace("{" + k + "}", String(vars[k]));
  return s;
}

/** Marker-icon label in the current locale (falls back to the given default). */
export function iconLabel(id: string, fallback = ""): string {
  const m = M["icon." + id];
  return m ? (m[current] ?? m.en) : fallback || id;
}

/** Sticker label in the current locale (falls back to the given default). */
export function stickerLabel(id: string, fallback = ""): string {
  const m = M["sticker." + id];
  return m ? (m[current] ?? m.en) : fallback || id;
}

/** Sticker-category label in the current locale. */
export function catLabel(id: string, fallback = ""): string {
  const m = M["cat." + id];
  return m ? (m[current] ?? m.en) : fallback || id;
}
