/**
 * Vellum landing page i18n — six locales, no build step.
 *
 * Language resolution order:
 *   1. ?lang= URL parameter  (link routing, e.g. index.html?lang=ja)
 *   2. localStorage           (the visitor's previous choice)
 *   3. navigator.languages    (browser preference)
 *   4. en-US                  (fallback — also the language of the base markup)
 *
 * Markup contract:
 *   data-i18n="key"      → textContent is replaced
 *   data-i18n-html="key" → innerHTML is replaced (keys whose copy carries markup)
 *   data-i18n-alt="key"  → the alt attribute is replaced
 * en-GB falls back to en-US for any key it does not override.
 */
(function () {
  "use strict";

  var LANGS = {
    "en-US": "English (US)",
    "en-GB": "English (UK)",
    "es": "Español",
    "zh": "中文",
    "ja": "日本語",
    "ko": "한국어",
  };

  /* ── Dictionary ──────────────────────────────────────── */
  var D = {
    "meta.title": {
      "en-US": "Vellum — From Imagination to Map",
      "es": "Vellum — De la imaginación al mapa",
      "zh": "Vellum — 把想象绘成地图",
      "ja": "Vellum — 想像を地図に",
      "ko": "Vellum — 상상을 지도로",
    },
    "meta.desc": {
      "en-US": "A fantasy map generator & editor for Obsidian. Procedural terrain, ink-and-wash antique rendering, note integration.",
      "es": "Generador y editor de mapas de fantasía para Obsidian. Terreno procedural, render de mapa antiguo a tinta y aguada, integración con notas.",
      "zh": "Obsidian 的奇幻地图生成与编辑器。程序化地形、水墨古地图渲染、笔记联动。",
      "ja": "Obsidian のファンタジー地図生成・編集プラグイン。プロシージャル地形、インク＆ウォッシュの古地図レンダリング、ノート連携。",
      "ko": "당신만의 판타지 세계를 창조하고 다듬는 Obsidian 지도 생성·편집기. 절차적 지형, 잉크&워시 고지도 렌더, 노트 연동.",
    },

    "nav.features": { "en-US": "Features", "es": "Funciones", "zh": "功能", "ja": "機能", "ko": "기능" },
    "nav.stickers": { "en-US": "Stickers", "es": "Pegatinas", "zh": "贴纸", "ja": "ステッカー", "ko": "스티커" },
    "nav.start": { "en-US": "Get started", "es": "Empezar", "zh": "入门", "ja": "はじめる", "ko": "시작하기" },
    "nav.download": { "en-US": "Download", "es": "Descargar", "zh": "下载", "ja": "ダウンロード", "ko": "다운로드" },
    "nav.install": { "en-US": "Install", "es": "Instalar", "zh": "安装", "ja": "インストール", "ko": "설치하기" },

    "hero.eyebrow": {
      "en-US": "A map studio for Obsidian",
      "es": "Un estudio de mapas para Obsidian",
      "zh": "Obsidian 地图工作室",
      "ja": "Obsidian の地図スタジオ",
      "ko": "Obsidian 지도 스튜디오",
    },
    "hero.title": {
      "en-US": "From imagination, to map.",
      "es": "De la imaginación, al mapa.",
      "zh": "把想象，绘成地图。",
      "ja": "想像を、地図に。",
      "ko": "상상을, 지도로.",
    },
    "hero.lede": {
      "en-US": "Shape your own fantasy world, paint it in ink and wash, and weave it into your notes.",
      "es": "Da forma a tu propio mundo de fantasía, píntalo a tinta y aguada, y entrelázalo con tus notas.",
      "zh": "塑造属于你的奇幻世界，以水墨绘制，再与笔记编织为一体。",
      "ja": "自分だけのファンタジー世界を形づくり、インクとウォッシュで描き、ノートと結び合わせる。",
      "ko": "당신만의 판타지 세계를 빚고, 잉크와 워시로 그려내고, 노트와 하나로 엮습니다.",
    },
    "hero.ctaPrimary": { "en-US": "Get started free", "es": "Empieza gratis", "zh": "免费开始", "ja": "無料で始める", "ko": "무료로 시작하기" },
    "hero.ctaText": { "en-US": "Explore features", "es": "Ver funciones", "zh": "浏览功能", "ja": "機能を見る", "ko": "기능 둘러보기" },
    "hero.scroll": { "en-US": "Scroll", "es": "Desplázate", "zh": "滚动", "ja": "スクロール", "ko": "스크롤" },

    "showcase.title": {
      "en-US": "Unroll it — a whole world.",
      "es": "Desenróllalo: un mundo entero.",
      "zh": "展开，即是一个世界。",
      "ja": "広げれば、ひとつの世界。",
      "ko": "펼치면, 하나의 세계.",
    },
    "showcase.p": {
      "en-US": "Erosion and rivers, ranges and coasts awaken as a hand-drawn antique map.",
      "es": "La erosión y los ríos, cordilleras y costas despiertan como un mapa antiguo dibujado a mano.",
      "zh": "侵蚀与河流、山脉与海岸，苏醒为一幅手绘古地图。",
      "ko": "침식과 강, 산맥과 해안이 손으로 그린 고지도로 깨어납니다.",
      "ja": "浸食と川、山脈と海岸が、手描きの古地図として目を覚まします。",
    },

    "feat1.title": {
      "en-US": "One seed,<br>one continent.",
      "es": "Una semilla,<br>un continente.",
      "zh": "一个种子，<br>一片大陆。",
      "ja": "ひとつのシードで、<br>ひとつの大陸を。",
      "ko": "시드 하나로,<br>대륙 하나.",
    },
    "feat1.p1": {
      "en-US": "Droplet erosion and flow-based hydrology are layered over noise, carving valleys and rivers naturally. Every continent gets a mountain spine, and one roll of the dice reveals an entirely new world.",
      "es": "Sobre el ruido se aplican erosión por gotas e hidrología de caudal, tallando valles y ríos de forma natural. Cada continente recibe una columna montañosa, y una tirada de dados revela un mundo completamente nuevo.",
      "zh": "在噪声之上叠加水滴侵蚀与流量水文，峡谷与河流自然成形。每片大陆都有山脉脊梁，掷一次骰子便是全新世界。",
      "ja": "ノイズに水滴浸食と流量水文を重ね、谷と川が自然に刻まれます。大陸ごとに山脈の背骨が通り、サイコロひと振りで全く新しい世界が現れます。",
      "ko": "노이즈에 물방울 침식과 유량 수문을 더해, 계곡과 강줄기가 자연스럽게 새겨집니다. 대륙마다 산맥 등뼈가 놓이고, 주사위 한 번이면 완전히 새로운 세계가 나타납니다.",
    },
    "feat1.p2": {
      "en-US": "The same seed always brings back the same terrain.",
      "es": "La misma semilla siempre devuelve el mismo terreno.",
      "zh": "相同的种子，永远还原相同的地形。",
      "ja": "同じシードは、いつでも同じ地形に戻ります。",
      "ko": "같은 시드는 언제든 같은 지형으로 돌아옵니다.",
    },
    "feat1.n1": { "en-US": "Droplet erosion", "es": "Erosión por gotas", "zh": "水滴侵蚀", "ja": "水滴浸食", "ko": "물방울 침식" },
    "feat1.n2": { "en-US": "Flow hydrology", "es": "Hidrología de caudal", "zh": "流量水文", "ja": "流量水文", "ko": "유량 수문" },
    "feat1.n3": { "en-US": "Infinitely reproducible", "es": "Reproducible siempre", "zh": "无限复现", "ja": "何度でも再現", "ko": "무한 재현" },

    "feat2.title": {
      "en-US": "The grain of a<br>hand-drawn map.",
      "es": "La textura de un<br>mapa hecho a mano.",
      "zh": "手绘古地图的<br>纸墨质感。",
      "ja": "手描き古地図の<br>風合い。",
      "ko": "손으로 그린<br>고지도의 결.",
    },
    "feat2.p1": {
      "en-US": "Fountain-pen coastlines and contours sit on a watercolor wash, with copperplate hatching engraved layer by layer along the shore. Zoom in — the vector detail never falls apart.",
      "en-GB": "Fountain-pen coastlines and contours sit on a watercolour wash, with copperplate hatching engraved layer by layer along the shore. Zoom in — the vector detail never falls apart.",
      "es": "Costas y curvas de nivel a pluma estilográfica sobre una aguada de acuarela, con rayado calcográfico grabado capa a capa a lo largo de la costa. Acércate: el detalle vectorial nunca se rompe.",
      "zh": "水彩渲染之上是钢笔勾勒的海岸线与等高线，沿岸层层刻出铜版画细线。任意放大，矢量细节也不会崩坏。",
      "ja": "水彩ウォッシュの上に万年筆の海岸線と等高線を重ね、海岸に沿って銅版画のハッチングを幾重にも刻みます。拡大してもベクターの精細さは崩れません。",
      "ko": "수채 워시 위에 만년필 해안선과 등고선을 얹고, 해안을 따라 동판화 잔선을 겹겹이 새깁니다. 크게 확대해도 벡터 디테일이 무너지지 않습니다.",
    },
    "feat2.n1": { "en-US": "Fountain-pen coasts", "es": "Costas a estilográfica", "zh": "钢笔海岸线", "ja": "万年筆の海岸線", "ko": "만년필 해안선" },
    "feat2.n2": { "en-US": "Copperplate hatching", "es": "Rayado calcográfico", "zh": "铜版画细线", "ja": "銅版画ハッチング", "ko": "동판화 헤칭" },
    "feat2.n3": { "en-US": "Woodcut mountains", "es": "Montañas de grabado", "zh": "版画风山脉", "ja": "版画風の山々", "ko": "판화풍 산맥" },

    "feat3.title": {
      "en-US": "Map and notes,<br>as one.",
      "es": "Mapa y notas,<br>en uno.",
      "zh": "地图与笔记，<br>合而为一。",
      "ja": "地図とノートを、<br>ひとつに。",
      "ko": "지도와 노트를,<br>하나로.",
    },
    "feat3.p1": {
      "en-US": "Drop markers on capitals and ruins, link them to Obsidian notes, and one click opens the lore. You can jump back from a note to its place on the map, too.",
      "es": "Coloca marcadores en capitales y ruinas, enlázalos a notas de Obsidian, y un clic abre la historia. También puedes volver desde una nota a su lugar en el mapa.",
      "zh": "在都城与遗迹上放置标记并关联 Obsidian 笔记，一键打开设定文档；也能从笔记跳回地图上的那个位置。",
      "ja": "都や遺跡にマーカーを置いて Obsidian ノートにリンクすれば、ワンクリックで設定ノートが開きます。ノートから地図上のその場所へ戻ることもできます。",
      "ko": "수도와 유적에 마커를 찍고 옵시디언 문서를 연결하면, 클릭 한 번으로 설정 노트가 열립니다. 노트에서 지도의 그 장소로 되돌아올 수도 있습니다.",
    },
    "feat3.p2": {
      "en-US": "Regions, ribbon banners, freehand drawings — your worldbuilding lives right on the map.",
      "es": "Regiones, cintas con texto, dibujos a mano alzada: tu worldbuilding vive directamente en el mapa.",
      "zh": "区域、缎带题字、自由绘制——你的世界观直接呈现在地图上。",
      "ja": "地域・リボンの文言・フリーハンド描画まで、世界観をそのまま地図の上に。",
      "ko": "지역·리본 문구·자유 그림까지, 세계관을 지도 위에 그대로 담습니다.",
    },
    "feat3.n1": { "en-US": "18 marker icons", "es": "18 iconos de marcador", "zh": "18 种标记", "ja": "マーカー18種", "ko": "마커 18종" },
    "feat3.n2": { "en-US": "Regions & banners", "es": "Regiones y cintas", "zh": "区域与缎带", "ja": "地域とリボン", "ko": "지역·리본 문구" },
    "feat3.n3": { "en-US": "Two-way note links", "es": "Enlaces bidireccionales", "zh": "笔记双向链接", "ja": "ノート双方向リンク", "ko": "노트 양방향 링크" },

    "stickers.title": {
      "en-US": "Twenty-five flourishes for the empty seas.",
      "es": "Veinticinco adornos para llenar los márgenes.",
      "zh": "二十五种装饰，点缀地图留白。",
      "ja": "余白を飾る、25 種のオーナメント。",
      "ko": "여백을 채우는, 스물다섯 가지 장식.",
    },
    "stickers.p": {
      "en-US": "One click places them on the map — ink and paper tones that quietly match your style.",
      "es": "Un clic y están en el mapa: tonos de tinta y papel que se funden con tu estilo.",
      "zh": "一键放上地图。墨色与纸色随风格静静相融。",
      "ja": "ワンクリックで地図の上へ。インクと紙のトーンがスタイルに静かに馴染みます。",
      "ko": "클릭 한 번으로 지도 위에. 잉크와 종이 톤이 스타일에 맞춰 조용히 어우러집니다.",
    },
    "stickers.c1": {
      "en-US": "<b>Sky</b>cloud · sun · wind",
      "es": "<b>Cielo</b>nube · sol · viento",
      "zh": "<b>天空</b>云 · 太阳 · 风",
      "ja": "<b>空</b>雲・太陽・風",
      "ko": "<b>하늘</b>구름·태양·바람",
    },
    "stickers.c2": {
      "en-US": "<b>Sea</b>ship · whale · kraken · lighthouse",
      "es": "<b>Mar</b>barco · ballena · kraken · faro",
      "zh": "<b>海洋</b>帆船 · 鲸 · 海妖 · 灯塔",
      "ja": "<b>海</b>帆船・鯨・クラーケン・灯台",
      "ko": "<b>바다</b>범선·고래·크라켄·등대",
    },
    "stickers.c3": {
      "en-US": "<b>Land</b>dragon · castle · ruins · windmill",
      "es": "<b>Tierra</b>dragón · castillo · ruinas · molino",
      "zh": "<b>陆地</b>龙 · 城堡 · 遗迹 · 风车",
      "ja": "<b>陸</b>ドラゴン・城・遺跡・風車",
      "ko": "<b>땅</b>드래곤·성·유적·풍차",
    },
    "stickers.c4": {
      "en-US": "<b>Map</b>compass · scroll · +your PNG",
      "es": "<b>Mapa</b>brújula · pergamino · +tu PNG",
      "zh": "<b>地图</b>罗盘 · 卷轴 · +自定义 PNG",
      "ja": "<b>地図</b>羅針盤・巻物・＋自作 PNG",
      "ko": "<b>지도</b>나침반·두루마리·＋내 PNG",
    },

    "styles.title": {
      "en-US": "Same world, different brush.",
      "es": "El mismo mundo, otro pincel.",
      "zh": "同一个世界，不同的笔触。",
      "ja": "同じ世界、異なる筆。",
      "ko": "같은 세계, 다른 붓.",
    },
    "styles.p": {
      "en-US": "Three hand-crafted looks, with every biome color yours to change.",
      "en-GB": "Three hand-crafted looks, with every biome colour yours to change.",
      "es": "Tres estilos artesanales, con los colores de bioma a tu gusto.",
      "zh": "三种手作风格，群系颜色也可自由调整。",
      "ja": "3 つの手ざわり、バイオームの色も自由自在。",
      "ko": "세 가지 손맛으로, 바이옴 색까지 자유롭게.",
    },
    "styles.parchment": {
      "en-US": "Warm parchment and sepia ink. The most classic antique map.",
      "es": "Pergamino cálido y tinta sepia. El mapa antiguo más clásico.",
      "zh": "温暖羊皮纸配深褐墨水，最经典的古地图。",
      "ja": "温かな羊皮紙にセピアのインク。最も古典的な古地図。",
      "ko": "따뜻한 양피지에 세피아 잉크. 가장 고전적인 고지도.",
    },
    "styles.color": {
      "en-US": "Vivid seas and green lands. An illustration-like color tone.",
      "en-GB": "Vivid seas and green lands. An illustration-like colour tone.",
      "es": "Mares vivos y tierras verdes. Un tono de color de ilustración.",
      "zh": "鲜明的海洋与翠绿大地，插画般的色调。",
      "ja": "鮮やかな海と緑の大地。挿絵のようなカラートーン。",
      "ko": "선명한 바다와 초록 대지. 삽화 같은 컬러 톤.",
    },
    "styles.ink": {
      "en-US": "Monochrome pen work. An engraving in paper and ink alone.",
      "es": "Dibujo a pluma en blanco y negro. Un grabado solo con papel y tinta.",
      "zh": "黑白钢笔画，仅以纸与墨绘成的版画。",
      "ja": "白黒のペン画。紙とインクだけで描いた版画。",
      "ko": "흑백 펜화. 종이와 잉크만으로 그린 판화.",
    },

    "tut.title": {
      "en-US": "Three steps are all it takes.",
      "es": "Tres pasos bastan.",
      "zh": "三步即可。",
      "ja": "3 ステップで十分。",
      "ko": "세 걸음이면 충분합니다.",
    },
    "tut.p": {
      "en-US": "The Vellum flow is simple — generate, refine, connect.",
      "es": "El flujo de Vellum es simple: crear, refinar, conectar.",
      "zh": "Vellum 的流程很简单——生成、打磨、连接。",
      "ja": "Vellum の流れはシンプル——つくる、ととのえる、つなぐ。",
      "ko": "Vellum의 흐름은 단순합니다 — 만들고, 다듬고, 잇는 것.",
    },
    "tut.s1t": { "en-US": "Generate", "es": "Crear", "zh": "生成", "ja": "つくる", "ko": "만들기" },
    "tut.s1p": {
      "en-US": "Roll the dice in the Terrain tab until a continent you love appears.",
      "es": "Lanza los dados en la pestaña Terreno hasta que aparezca un continente que te encante.",
      "zh": "在地形页掷骰子，直到出现你心仪的大陆。",
      "ja": "地形タブでサイコロを振り、気に入る大陸が出るまで生成。",
      "ko": "지형 탭에서 주사위를 굴려, 마음에 드는 대륙이 나올 때까지 생성합니다.",
    },
    "tut.s2t": { "en-US": "Refine", "es": "Refinar", "zh": "打磨", "ja": "ととのえる", "ko": "다듬기" },
    "tut.s2p": {
      "en-US": "Sculpt the terrain with brushes, then tune style, colors and hatching to taste.",
      "en-GB": "Sculpt the terrain with brushes, then tune style, colours and hatching to taste.",
      "es": "Esculpe el terreno con pinceles y ajusta estilo, colores y rayado a tu gusto.",
      "zh": "用笔刷修整地形，按喜好调整风格、颜色与细线。",
      "ja": "ブラシで地形を整え、スタイル・色・ハッチングを好みに調整。",
      "ko": "브러시로 지형을 손보고, 스타일과 색·헤칭을 취향껏 조절합니다.",
    },
    "tut.s3t": { "en-US": "Connect", "es": "Conectar", "zh": "连接", "ja": "つなぐ", "ko": "잇기" },
    "tut.s3p": {
      "en-US": "Drop markers and link notes, weaving your worldbuilding into a single map.",
      "es": "Coloca marcadores y enlaza notas, tejiendo tu mundo en un solo mapa.",
      "zh": "放置标记、关联笔记，把世界观织入一张地图。",
      "ja": "マーカーを置いてノートをリンクし、世界観をひとつの地図に。",
      "ko": "마커를 찍고 노트를 연결해, 세계관을 하나의 지도로 엮습니다.",
    },

    "dl.title": {
      "en-US": "Your first continent, <span class=\"lite\">today.</span>",
      "es": "Tu primer continente, <span class=\"lite\">hoy.</span>",
      "zh": "现在，<span class=\"lite\">开启第一片大陆。</span>",
      "ja": "いま、<span class=\"lite\">最初の大陸を。</span>",
      "ko": "지금, <span class=\"lite\">첫 대륙을.</span>",
    },
    "dl.p": {
      "en-US": "Obsidian 1.4.0+ · desktop. Runs on pure canvas with no external libraries.",
      "es": "Obsidian 1.4.0+ · escritorio. Funciona con canvas puro, sin bibliotecas externas.",
      "zh": "Obsidian 1.4.0 及以上 · 桌面版。纯 Canvas 实现，无外部依赖。",
      "ja": "Obsidian 1.4.0 以上・デスクトップ。外部ライブラリなしの純粋な Canvas で動作。",
      "ko": "Obsidian 1.4.0 이상 · 데스크톱. 외부 라이브러리 없이 순수 캔버스로 동작합니다.",
    },
    "dl.meta": {
      "en-US": "MIT License · © 2026 Altair",
      "en-GB": "MIT Licence · © 2026 Altair",
      "es": "Licencia MIT · © 2026 Altair",
      "zh": "MIT 许可证 · © 2026 Altair",
      "ja": "MIT ライセンス · © 2026 Altair",
      "ko": "MIT 라이선스 · © 2026 Altair",
    },
    "dl.installTitle": { "en-US": "Install", "es": "Instalación", "zh": "安装", "ja": "インストール", "ko": "설치" },
    "dl.step1": {
      "en-US": "Unzip and find <b>main.js · manifest.json · styles.css</b>.",
      "es": "Descomprime y localiza <b>main.js · manifest.json · styles.css</b>.",
      "zh": "解压后确认 <b>main.js · manifest.json · styles.css</b>。",
      "ja": "解凍して <b>main.js · manifest.json · styles.css</b> を確認。",
      "ko": "압축을 풀고 <b>main.js · manifest.json · styles.css</b>를 확인합니다.",
    },
    "dl.step2": {
      "en-US": "Copy them into your vault's <code>.obsidian/plugins/vellum/</code>. <span style=\"color:var(--ink-faint)\">(On Windows, the bundled <code>install.ps1</code> does it in one go.)</span>",
      "es": "Cópialos en <code>.obsidian/plugins/vellum/</code> de tu bóveda. <span style=\"color:var(--ink-faint)\">(En Windows, el <code>install.ps1</code> incluido lo hace de una vez.)</span>",
      "zh": "复制到库的 <code>.obsidian/plugins/vellum/</code>。<span style=\"color:var(--ink-faint)\">（Windows 可用附带的 <code>install.ps1</code> 一键完成）</span>",
      "ja": "ボールトの <code>.obsidian/plugins/vellum/</code> にコピー。<span style=\"color:var(--ink-faint)\">（Windows は同梱の <code>install.ps1</code> で一発）</span>",
      "ko": "볼트의 <code>.obsidian/plugins/vellum/</code>에 복사합니다. <span style=\"color:var(--ink-faint)\">(Windows는 동봉된 <code>install.ps1</code>로 한 번에)</span>",
    },
    "dl.step3": {
      "en-US": "Enable <b>Vellum</b> under Settings → <b>Community plugins</b>.",
      "es": "Activa <b>Vellum</b> en Ajustes → <b>Plugins de la comunidad</b>.",
      "zh": "在设置 → <b>第三方插件</b> 中启用 <b>Vellum</b>。",
      "ja": "設定 → <b>コミュニティプラグイン</b> で <b>Vellum</b> を有効化。",
      "ko": "설정 → <b>커뮤니티 플러그인</b>에서 <b>Vellum</b>을 켭니다.",
    },
    "dl.step4": {
      "en-US": "Command palette → <b>샘플팩 설치</b> (install sample pack) gives you an example map to start from.",
      "es": "Paleta de comandos → <b>샘플팩 설치</b> (instalar pack de ejemplo) te da un mapa de muestra para empezar.",
      "zh": "命令面板 → <b>샘플팩 설치</b>（安装示例包），获取示例地图即可上手。",
      "ja": "コマンドパレット → <b>샘플팩 설치</b>（サンプルパックをインストール）で例の地図を入手して開始。",
      "ko": "명령 팔레트 → <b>샘플팩 설치</b>로 예제 지도를 받아 시작합니다.",
    },
    "dl.migrate": {
      "en-US": "<b>Coming from Fantasy Map Studio?</b> Your map files (<code>.fmap</code>) open as-is. After installing, disable the old plugin — running both may conflict.",
      "es": "<b>¿Venías usando Fantasy Map Studio?</b> Tus mapas (<code>.fmap</code>) se abren tal cual. Tras instalar, desactiva el plugin antiguo: tener ambos activos puede causar conflictos.",
      "zh": "<b>之前在用 Fantasy Map Studio？</b>地图文件（<code>.fmap</code>）可直接打开。安装后请停用旧插件——两者同时启用可能冲突。",
      "ja": "<b>以前 Fantasy Map Studio をお使いでしたか？</b>地図ファイル（<code>.fmap</code>）はそのまま開けます。インストール後は旧プラグインを無効化してください——両方有効だと競合の恐れがあります。",
      "ko": "<b>이전에 Fantasy Map Studio를 쓰셨나요?</b> 지도 파일(<code>.fmap</code>)은 그대로 열립니다. 새로 설치한 뒤 기존 플러그인은 비활성화하세요 — 둘 다 켜져 있으면 충돌할 수 있습니다.",
    },

    "footer.tagline": {
      "en-US": "From imagination to map — an Obsidian cartography tool for worldbuilders.",
      "es": "De la imaginación al mapa: una herramienta de cartografía para creadores de mundos en Obsidian.",
      "zh": "把想象绘成地图——为世界观创作者打造的 Obsidian 地图工具。",
      "ja": "想像を地図に——世界観クリエイターのための Obsidian 地図ツール。",
      "ko": "상상을 지도로. — 세계관 창작자를 위한 Obsidian 지도 도구.",
    },

    "alt.hero": {
      "en-US": "A fantasy map generated with Vellum — the continent of Estella",
      "es": "Un mapa de fantasía generado con Vellum: el continente de Estella",
      "zh": "用 Vellum 生成的奇幻地图——埃斯特拉大陆",
      "ja": "Vellum で生成したファンタジー地図——エステラ大陸",
      "ko": "Vellum으로 생성한 판타지 지도 — 에스텔라 대륙",
    },
    "alt.terrain": {
      "en-US": "Generated mountain ranges, rivers and contour lines",
      "es": "Cordilleras, ríos y curvas de nivel generados",
      "zh": "生成的山脉、河流与等高线",
      "ja": "生成された山脈・川・等高線",
      "ko": "생성된 산맥과 강, 등고선",
    },
    "alt.craft": {
      "en-US": "Coastline and copperplate hatching detail",
      "es": "Detalle de costa y rayado calcográfico",
      "zh": "海岸线与铜版画细线细节",
      "ja": "海岸線と銅版画ハッチングのディテール",
      "ko": "해안선과 동판화 헤칭 디테일",
    },
    "alt.world": {
      "en-US": "Markers and place-name labels on the map",
      "es": "Marcadores y etiquetas de topónimos en el mapa",
      "zh": "地图上的标记与地名标签",
      "ja": "地図上のマーカーと地名ラベル",
      "ko": "지도 위 마커와 지명 라벨",
    },
    "alt.stickers": {
      "en-US": "Vellum's built-in stickers — compass, dragon, castle, whale, lighthouse, kraken, sun, windmill, tower, scroll and more",
      "es": "Pegatinas integradas de Vellum: brújula, dragón, castillo, ballena, faro, kraken, sol, molino, torre, pergamino y más",
      "zh": "Vellum 内置贴纸——罗盘、龙、城堡、鲸、灯塔、海妖、太阳、风车、塔、卷轴等",
      "ja": "Vellum 内蔵ステッカー——羅針盤・ドラゴン・城・鯨・灯台・クラーケン・太陽・風車・塔・巻物など",
      "ko": "Vellum 내장 스티커 — 나침반·용·성·고래·등대·크라켄·태양·풍차·탑·두루마리 등",
    },
  };

  /* ── Resolution & application ────────────────────────── */

  function normalise(tag) {
    if (!tag) return null;
    var t = String(tag).toLowerCase();
    if (t === "en-gb") return "en-GB";
    if (t.indexOf("en") === 0) return "en-US";
    if (t.indexOf("es") === 0) return "es";
    if (t.indexOf("zh") === 0) return "zh";
    if (t.indexOf("ja") === 0) return "ja";
    if (t.indexOf("ko") === 0) return "ko";
    return null;
  }

  function resolve() {
    var url = null;
    try { url = new URLSearchParams(location.search).get("lang"); } catch (e) { /* very old browsers */ }
    var fromUrl = normalise(url);
    if (fromUrl) return fromUrl;
    var stored = null;
    try { stored = localStorage.getItem("vellum-lang"); } catch (e) { /* storage blocked */ }
    if (stored && LANGS[stored]) return stored;
    var prefs = navigator.languages || [navigator.language];
    for (var i = 0; i < prefs.length; i++) {
      var n = normalise(prefs[i]);
      if (n) return n;
    }
    return "en-US";
  }

  function t(key, lang) {
    var entry = D[key];
    if (!entry) return null;
    return entry[lang] != null ? entry[lang] : entry["en-US"];
  }

  function apply(lang) {
    document.documentElement.lang = lang;
    document.title = t("meta.title", lang);
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("meta.desc", lang));

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n"), lang);
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n-html"), lang);
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n-alt"), lang);
      if (v != null) el.setAttribute("alt", v);
    });

    var cur = document.getElementById("langCur");
    if (cur) cur.textContent = LANGS[lang] || lang;
    var menu = document.getElementById("langMenu");
    if (menu) {
      Array.prototype.forEach.call(menu.children, function (li) {
        var active = li.getAttribute("data-lang") === lang;
        li.classList.toggle("is-active", active);
        li.setAttribute("aria-selected", active ? "true" : "false");
      });
    }
  }

  function setLang(lang, updateUrl) {
    apply(lang);
    try { localStorage.setItem("vellum-lang", lang); } catch (e) { /* storage blocked */ }
    if (updateUrl && history.replaceState) {
      var u = new URL(location.href);
      u.searchParams.set("lang", lang);
      history.replaceState(null, "", u);
    }
  }

  /* ── Switcher UI (custom dropdown, matching the map theme) ── */
  var dd = document.getElementById("langDd");
  var btn = document.getElementById("langBtn");
  var menu = document.getElementById("langMenu");
  if (dd && btn && menu) {
    Object.keys(LANGS).forEach(function (code) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("data-lang", code);
      li.setAttribute("tabindex", "-1");
      li.textContent = LANGS[code];
      li.addEventListener("click", function () {
        setLang(code, true);
        close();
        btn.focus();
      });
      menu.appendChild(li);
    });

    var isOpen = function () { return dd.classList.contains("is-open"); };
    var close = function () {
      dd.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    };
    var open = function () {
      dd.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      var active = menu.querySelector(".is-active") || menu.firstElementChild;
      if (active) active.focus();
    };

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      isOpen() ? close() : open();
    });
    document.addEventListener("click", function (e) {
      if (isOpen() && !dd.contains(e.target)) close();
    });
    dd.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); btn.focus(); return; }
      if (!isOpen()) return;
      var items = Array.prototype.slice.call(menu.children);
      var idx = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); (items[idx + 1] || items[0]).focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); (items[idx - 1] || items[items.length - 1]).focus(); }
      else if ((e.key === "Enter" || e.key === " ") && idx >= 0) { e.preventDefault(); items[idx].click(); }
    });
  }

  // Initial application (do not touch the URL on auto-detection)
  apply(resolve());
})();
