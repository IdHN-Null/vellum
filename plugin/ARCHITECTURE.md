# Vellum — 구조와 동작 원리

이 문서는 플러그인의 전체 구조, 각 모듈의 책임, 그리고 사용자의 조작이 어떤 경로를 거쳐 화면(과 PNG)에 그려지는지를 설명합니다.

---

## 1. 큰 그림 — Obsidian은 이 플러그인을 어떻게 실행하는가

Obsidian 플러그인은 **Obsidian 앱 안에서 실행되는 JavaScript 모듈**입니다. 소스는 여러 `.ts` 파일이지만 빌드하면 `main.js` 하나로 번들됩니다. Obsidian은 볼트의 `.obsidian/plugins/vellum/` 폴더에서 3개 파일만 봅니다.

| 파일 | 역할 |
|---|---|
| `manifest.json` | 플러그인 이름·ID·버전 |
| `main.js` | 모든 TypeScript가 번들된 실행 코드 (Web Worker 소스도 문자열로 인라인됨) |
| `styles.css` | UI 스타일 + base64로 임베드된 폰트 (`FMS Serif`=Cinzel, `FMS Hand`=Gaegu) |

`main.ts`의 `onload()`는 뷰 타입·확장자(`.fmap`)·명령어·리본 아이콘을 **등록**만 하고, 실제 화면은 사용자가 `.fmap` 파일을 열 때 `FantasyMapView`가 만들어지며 시작됩니다.

---

## 2. 파일 지도 — 모듈별 책임

```
src/
├─ main.ts        ← 플러그인 진입점. Obsidian과의 "계약" (뷰·명령·샘플팩 등록)
├─ view.ts        ← 심장. 캔버스 뷰 + 도구/상호작용 + 렌더 오케스트레이션 + 우측 패널 UI
├─ types.ts       ← 데이터 모델(.fmap JSON 스키마) + RLE 직렬화 + 구버전 마이그레이션
├─ noise.ts       ← 시드 기반 노이즈 (mulberry32 · Noise2D · fbm)
├─ terrain.ts     ← 노이즈 → 하이트맵(침식) → 수문(강·호수) → 바이옴 분류
├─ worker.ts      ← generateBase+composeTerrain을 Web Worker에서 실행 (비동기 생성)
├─ contours.ts    ← 하이트맵 → 벡터 등고선 (마칭 스퀘어 + 단순화 + Chaikin)
├─ render2d.ts    ← 픽셀 레이어(수채 워시·해안 동심 잔선) + 글리프 스탬프(나무·언덕·산)
├─ rough.ts       ← 손그림 선 유틸 (시드 흔들림 · roughLine/roughRing/sketchToPath)
├─ ink.ts         ← 잉크 질감 (가변폭 붓 리본 · 번짐 다중패스 · 붓 화살표)
├─ decor.ts       ← 장식 (나침반·제목 카르투슈·라벨·메모·범선·괴물·좌표격자·액자·비네트)
├─ icons.ts       ← 벡터 마커 배지 18종 (SVG 패스 공유)
├─ annotations.ts ← 자유 그리기 주석 스트로크 + 히트테스트
├─ fonts.ts       ← 번들 폰트 패밀리 상수 + 로드 보장
├─ modals.ts      ← 마커/지역/텍스트 편집 모달
└─ sample.ts      ← 온보딩 샘플팩 생성
```

역할 분리 원칙: `terrain.ts`는 **데이터만** 만들고, `render2d.ts`/`view.ts`는 그 데이터를 **픽셀로만** 바꿉니다. 3D 뷰는 v0.10에서 코어에서 제거되었고 추후 별도 애드온 플러그인으로 분리됩니다.

---

## 3. 데이터 모델 — .fmap 파일 (types.ts)

`.fmap`은 JSON 텍스트 파일입니다. 핵심 설계:

- **레시피 저장**: 지형 자체가 아니라 생성 파라미터(`gen`: 시드·해수면·대륙 수·침식 강도…)를 저장 → 파일이 작고, 같은 파일이면 항상 같은 지형이 재현됩니다.
- **델타 저장**: 브러시 편집은 `editsB64`(Int8 고도 델타), 바이옴 페인트는 `paintB64`(Uint8 오버라이드)로 저장. RLE 압축(`"R:"` 접두사) + dense 폴백으로 실제 편집량에 비례하는 크기.
- **정규화 좌표(0~1)**: 마커·지역·주석·배치 요소는 "지도 폭의 36%" 식으로 저장 → 해상도·확대율과 무관하게 항상 올바른 위치.
- **마이그레이션**: `parseMapData()`가 구버전 파일(고정 나침반/제목, dense 인코딩, 이모지 아이콘)을 현재 스키마로 승격합니다.

---

## 4. 지형 파이프라인 (terrain.ts + worker.ts)

```
gen 파라미터
  → generateBase()   블롭 배치(대륙·섬) + 도메인 워핑 + 산맥(등뼈 스파인 ∪ 능선 노이즈)
                     + 물방울 수리 침식        ← 비싸므로 결과 캐시 (브러시 성능 무관)
  → composeTerrain() 편집 델타 합성 → 수문(priority-flood 호수, 유량 누적 강) → 바이옴 분류
```

- **산맥 등뼈(spine)**: 각 대륙 블롭에 내부를 관통하는 능선 세그먼트를 1줄기 보장 — "산맥 없는 대륙"이 나오지 않게 (v0.11). 추가 산맥은 ridged 노이즈 × 저주파 게이트.
- **평야 우선**: 대륙 내부는 plateau falloff로 평평하게 유지 (도시·왕국 배치 적합). 절대 스케일 클램프 — min-max 정규화 금지 (산봉우리가 평원 rel을 왜곡).
- **비동기**: 뷰는 `worker.ts`(esbuild가 iife 번들 → `__WORKER_CODE__`로 인라인 → Blob URL Worker)로 생성을 별도 스레드에서 수행, 실패 시 동기 폴백.

---

## 5. 렌더 파이프라인 (render2d.ts + view.ts)

겹층 구조 — 아래에서 위로:

1. **base 레이어** (셀 해상도 픽셀): 수채 워시 바탕 — 바이옴 색 bilinear 블렌드, 물 깊이 그라데이션, 해안 밝은 띠, **해안 동심 잔선**(`oceanExtraShade`), 수면 결, 육지 식생 워시(`landWash`), 힐셰이딩, 종이 얼룩.
2. **stamps 레이어** (초과표본 ss배): 글리프 — 그림자·수관 음영 있는 나무, 언덕 둔덕 아크, 좌명/우암 면과 해칭이 있는 산, 해안 파도.
3. **벡터 잉크선** (`drawVectorLines`, 화면 해상도): 등심선·등고선(번짐 밑칠+본선)·해안선(이중 패스+해칭)·강(물색 워시+얇은 잉크선).
4. **풍배선·지도 효과·좌표격자** (decor).
5. **지역 → 주석 → 마커 → 배치 요소** (최상단, `reorderById`로 순서 제어).
6. **종이결 오버레이** (`paperGrainTile`, 화면 해상도 repeat — 배율 무관 질감).

핵심 성능 장치 (view.ts):

- **프로그레시브 타일 렌더**: 192셀 타일을 뷰포트 중심 가까운 순으로 rAF 프레임당 ~10ms씩 — 큰 지도도 안 얼어붙음 (`renderToken`으로 취소).
- **3x 상세 캐시** (`renderDetail`): 지형 확정 후 전체 맵을 셀당 3px로 재렌더(높이 쌍선형 + 바이옴 가우시안 + 스탬프·벡터선 bake). pan/zoom은 이 캐시 크롭만 그려서 깜빡임 없음. **base 픽셀 규칙과 반드시 동일하게 유지할 것** (동심 잔선·워시 등).
- **dirty-rect 브러시**: 스트로크 중엔 브러시 영역만 재계산(~수 ms), 붓 떼면 `scheduleFinalize()`가 수문·등고선 포함 전체 재생성.
- **fastRender 토글**: 캐시·LOD 우회, base 업스케일만 (저사양용).

**PNG 내보내기**는 상세 캐시가 유효하면 그것을 사용 — 편집기 화면과 동일한 품질 (WYSIWYG).

---

## 6. 검증

- `npm test` — 순수 로직 단위 테스트 (RLE 왕복, 마이그레이션, 등고선, 지형 분포 가드: 산맥 존재·평야 우세·호수=물).
- `node test/server.mjs` → http://localhost:8137 — 시각 하네스 (합성 렌더, 스타일별, LOD 비교, 워커 동일성 `__workerOK`, 타일 동일성 `__tileMatch`).

렌더 픽셀 규칙을 바꿀 때는 **render2d.paintBaseRect와 view.renderDetail 두 곳을 함께** 바꿔야 합니다 (셀 렌더와 LOD 렌더의 시각 일관성).
