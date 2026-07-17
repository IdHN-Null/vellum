# Vellum — 랜딩 페이지

Vellum(Obsidian 판타지 지도 플러그인) 배포용 정적 웹사이트입니다.
**빌드 도구·외부 요청 없이** 완전 자립형 — 폴더를 그대로 어디든 올리면 동작합니다.

## 구조

```
vellum-site/
├─ index.html               # 원페이지 (섹션 마크업 + 스크롤 연출 스크립트 인라인)
├─ styles.css               # 전체 스타일 (양피지·잉크 에디토리얼 테마)
├─ .nojekyll                # GitHub Pages의 Jekyll 처리 비활성 (그대로 서빙)
├─ map/                     # ★ 사용자 교체용 히어로 지도 ★
│  ├─ hero.jpg              #   이 파일만 바꾸면 두루마리 쇼케이스 지도가 바뀜 (16:9)
│  └─ README.md             #   권장 규격(1600×900, 16:9) 안내
├─ assets/
│  ├─ feat-terrain.jpg      # 기능① 절차적 지형 (산맥·강)
│  ├─ feat-craft.jpg        # 기능② 잉크&워시 (해안 헤칭)
│  ├─ feat-world.jpg        # 기능③ 세계관 연동 (마커·라벨)
│  ├─ style-parchment.jpg   # Styles 호버 배경 — 양피지
│  ├─ style-color.jpg       # Styles 호버 배경 — 컬러
│  ├─ style-ink.jpg         # Styles 호버 배경 — 잉크 (셋 다 같은 지도, 다른 스타일)
│  ├─ stickers.png          # 스티커 시트 (투명 배경)
│  ├─ favicon.svg           # 나침반 파비콘
│  ├─ paper.svg             # 종이 결 텍스처 (SVG feTurbulence)
│  └─ fonts/                # 번들 폰트 (Cinzel, Gaegu) — 플러그인과 동일, self-host
└─ download/
   └─ vellum-0.21.0.zip     # 플러그인 배포 패키지 (다운로드 버튼이 가리킴)
```

## 로컬 미리보기

정적 파일이라 아무 정적 서버로도 됩니다.

```powershell
npx serve vellum-site -l 8140
# → http://localhost:8140
```

> `file://`로 직접 열면 폰트·이미지 경로 때문에 일부가 깨질 수 있으니 로컬 서버 사용을 권장합니다.

## 배포 (GitHub Pages)

**웹 호스팅과 zip 다운로드 모두 GitHub Pages에서 그대로 동작합니다.**
모든 경로가 상대경로이고 외부 요청이 없어, 프로젝트 페이지(`user.github.io/repo/`) 하위 경로에서도 문제없습니다.

1. 이 폴더(`vellum-site/`)의 내용을 리포에 올립니다.
   - 리포 **루트에 통째로** 올리거나, `docs/`에 넣습니다.
2. 리포 **Settings → Pages → Build and deployment → Source: Deploy from a branch**
   - 루트에 올렸으면 `main` / `(root)`, `docs/`에 넣었으면 `main` / `docs`.
3. 몇 분 뒤 `https://<user>.github.io/<repo>/` 에서 열립니다.

- **다운로드 버튼**: `download/vellum-0.21.0.zip`을 같은 도메인에서 서빙하므로 `download` 속성으로 정상 저장됩니다. (GitHub Pages가 `.zip`을 올바른 MIME으로 서빙)
- `.nojekyll`이 있어 Jekyll이 파일을 건드리지 않고 그대로 서빙합니다.

> **Netlify / Vercel / Cloudflare Pages** 도 동일 — 빌드 명령 없이 퍼블리시 디렉터리만 `vellum-site`로 지정하면 됩니다.

### 플러그인 새 버전이 나오면
1. `download/`에 새 zip을 넣습니다 (예: `vellum-0.22.0.zip`).
2. `index.html`의 다운로드 버튼 `href`와 버전 표기(`Vellum v0.21.0`)만 바꿉니다.
3. (선택) 이전 zip은 지웁니다.

## 히어로 지도 바꾸기

`map/hero.jpg` **한 파일만** 당신의 지도로 덮어쓰면 됩니다. 권장 규격은 `map/README.md` 참고
(요약: **1600×900, 16:9, JPG**). 두루마리 종이 위에 `object-fit: contain`으로 얹혀 **찌그러지거나 잘리지 않습니다.**

## 에셋 다시 만들기 (개발용)

히어로 지도·스타일 3종·기능 크롭·스티커 시트는 플러그인 저장소의 렌더 하네스로 생성합니다:

```powershell
cd ../fantasy-map-studio
npx esbuild test/render-hero.ts --bundle --platform=node --external:skia-canvas --outfile=test/render-hero.js
node test/render-hero.js
# → map/hero.jpg + assets/{style-*.jpg, feat-*.jpg, stickers.png} 갱신
```

- 지도는 **16:9(768×432 셀)**로 생성하고, **같은 지도를 parchment/color/ink 세 스타일**로 각각 렌더합니다.
- 마커·장식은 **실제 지형을 인식해** 배치합니다 (항구는 해안, 북방 관문은 북쪽 육지, 바다 이름·범선·괴물은 물 위).
- 기능 크롭도 지형을 스캔해 잡으므로(산맥 최밀집·해안·마커 주변) 지도가 바뀌어도 엉뚱한 곳을 자르지 않습니다.

## 기술 노트

- **스크롤 연출은 점진적 향상**입니다. JS·IntersectionObserver가 없거나 탭이 백그라운드로
  throttle돼도 안전망(`force-show`)이 모든 내용을 확정 표시하므로 콘텐츠가 숨겨진 채 남지 않습니다.
  `prefers-reduced-motion`을 켜면 애니메이션 없이 최종 상태로 보여줍니다.
- **두루마리 쇼케이스**(`#showcase`)는 핀 구간의 진행률이 특정 지점(낙하 15% · 펼침 35%)에 닿으면
  타임라인으로 재생됩니다(스크롤 비례 스크럽 아님). 위로 되감으면 다시 말립니다.
- **Styles 호버**는 각 카드에 커서를 올리면 해당 스타일의 실제 지도가 원형으로 퍼지며 배경에 은은히
  깔립니다(스크림으로 채도·명도를 낮춤). 카드는 `.reveal` 요소라 `top`·배경 대비로 포커스를 줍니다.
- **폰트는 self-host**(플러그인과 동일 woff2)라 외부 CDN 요청이 없습니다. 한글 본문은 시스템 명조로 폴백합니다.
