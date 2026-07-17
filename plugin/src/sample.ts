import { App, Notice, TFile } from "obsidian";
import { MapData, defaultMapData, newId } from "./types";

const FOLDER = "판타지 지도 샘플";

interface SampleNote {
  name: string;
  body: string;
  x: number; y: number;
  icon: string;
}

const NOTES: SampleNote[] = [
  {
    name: "왕도 세이도라",
    icon: "castle",
    x: 0.36, y: 0.42,
    body: "대륙 중부의 수도. 은빛 첨탑이 늘어선 성채 도시로, 세 강이 만나는 자리에 세워졌다.\n\n- 인구: 약 12만\n- 통치: 세이도라 왕가\n- 명물: 새벽 시장, 별의 대성당",
  },
  {
    name: "항구도시 벨마르",
    icon: "anchor",
    x: 0.62, y: 0.58,
    body: "동부 해안 최대의 무역항. 남방 향신료와 북방 모피가 이곳에서 교차한다.\n\n- 인구: 약 7만\n- 특징: 자유도시 연합 소속, 등대 '붉은 눈'",
  },
  {
    name: "북부 설원 관문",
    icon: "mountain",
    x: 0.45, y: 0.15,
    body: "설원 지대로 향하는 마지막 요새. 이 너머는 지도가 그려지지 않은 땅이다.\n\n- 주둔: 서리 감시대 300명\n- 전승: 얼음 밑에 잠든 고대 용",
  },
  {
    name: "고대 유적 카르눔",
    icon: "temple",
    x: 0.22, y: 0.68,
    body: "남서부 밀림에 묻힌 선주민 문명의 유적. 탐사대는 아직 지하 3층까지밖에 내려가지 못했다.\n\n- 위험도: 높음\n- 발견물: 별자리 원판, 언어 미상의 석판",
  },
];

/** 온보딩용 샘플 지도 + 연결된 노트 생성 */
export async function installSamplePack(app: App): Promise<TFile | null> {
  const vault = app.vault;

  if (!vault.getAbstractFileByPath(FOLDER)) {
    await vault.createFolder(FOLDER);
  }

  const map: MapData = defaultMapData("세이도라 대륙", 151186);
  map.gen.seaLevel = 0.52;
  map.gen.continents = 2;
  map.gen.polarNorth = 0.12;
  map.gen.polarSouth = 0.08;

  for (const n of NOTES) {
    const notePath = `${FOLDER}/${n.name}.md`;
    if (!vault.getAbstractFileByPath(notePath)) {
      const content =
        `# ${n.name}\n\n${n.body}\n\n---\n[[${FOLDER}/세이도라 대륙.fmap#${n.name}|🗺️ 지도에서 보기]]\n` +
        `\n> 이 노트는 Vellum 샘플입니다. 지도 위 마커와 연결되어 있으며, 위 링크를 누르면 지도에서 해당 마커가 강조됩니다.\n`;
      await vault.create(notePath, content);
    }
    map.markers.push({
      id: newId(),
      x: n.x, y: n.y,
      name: n.name,
      icon: n.icon,
      color: "#c0392b",
      notePath,
    });
  }

  map.regions.push({
    id: newId(),
    name: "세이도라 왕국령",
    color: "#c0392b",
    points: [
      [0.28, 0.30], [0.46, 0.28], [0.52, 0.44],
      [0.44, 0.56], [0.30, 0.54],
    ],
  });

  const mapPath = `${FOLDER}/세이도라 대륙.fmap`;
  const existing = vault.getAbstractFileByPath(mapPath);
  if (existing instanceof TFile) {
    new Notice("샘플 지도가 이미 존재합니다. 기존 파일을 엽니다.");
    return existing;
  }
  const file = await vault.create(mapPath, JSON.stringify(map, null, 2));

  const readmePath = `${FOLDER}/시작하기.md`;
  if (!vault.getAbstractFileByPath(readmePath)) {
    await vault.create(readmePath, [
      "# Vellum 시작하기",
      "",
      "1. [[세이도라 대륙.fmap|세이도라 대륙 지도]]를 열어보세요.",
      "2. **선택 도구**로 마커를 클릭하면 연결된 노트가 열립니다.",
      "3. **마커 도구**로 지도를 클릭해 새 장소를 추가하고 노트를 연결하세요.",
      "4. **지역 도구**로 국경을 그릴 수 있습니다. (더블클릭으로 완성)",
      "5. 오른쪽 **지형 탭**의 🎲 완전 랜덤 생성으로 새로운 대륙을 뽑아보세요. 세부 조정은 고급 설정에 있습니다.",
      "6. 노트를 열어둔 채 명령어 `현재 노트를 지도에서 보기`를 실행하면 지도가 해당 마커로 이동합니다.",
      "7. **꾸미기 탭**에서 스타일·색상·해안 헤칭을, **요소 탭**에서 스티커·리본 문구를 더해보세요.",
      "8. 직접 그린 지도 이미지가 있다면 파일 탭의 **볼트 이미지 불러오기**로 교체할 수 있습니다.",
      "",
    ].join("\n"));
  }
  return file;
}
