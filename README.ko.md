# Vellum

🌐 [English (US)](README.md) · [English (UK)](README.en-GB.md) · [Español](README.es.md) · [中文](README.zh.md) · [日本語](README.ja.md) · **한국어**

**상상을 지도로.** 당신만의 판타지 세계를 창조하고 다듬는 Obsidian 지도 생성·편집기.

외부 라이브러리 없이 순수 캔버스(잉크 & 워시 렌더)로 동작하며, 렌더 결과가 그대로 완성된
고지도 이미지가 되는 것을 목표로 합니다. 지도는 `.fmap`(JSON) 파일로 저장되어
버전 관리·동기화가 그대로 됩니다.

## 저장소 구조

| 폴더 | 내용 |
|---|---|
| [`plugin/`](plugin/) | 플러그인 **소스** (TypeScript). 빌드·테스트·아키텍처 문서 포함 |
| [`docs/`](docs/) | 랜딩 페이지 (**GitHub Pages**로 서빙). 다운로드 zip 포함 |
| [`dist/`](dist/) | 플러그인 **배포본** — 릴리스 zip + 압축 해제본 (설치에 필요한 파일만) |

- 소스에서 배포본을 만드는 방법: [`plugin/README.ko.md`](plugin/README.ko.md)의 개발 섹션 참고
- 구조/동작 원리: [`plugin/ARCHITECTURE.md`](plugin/ARCHITECTURE.md) (영어)
- 설계 배경: [`plugin/DESIGN-DECISIONS.md`](plugin/DESIGN-DECISIONS.md) (영어)

## 설치 (사용자)

1. [`dist/`](dist/)의 최신 `vellum-x.y.z.zip`을 받아 압축을 풉니다
   (또는 랜딩 페이지의 다운로드 버튼).
2. 볼트의 `.obsidian/plugins/vellum/` 폴더에 `main.js`, `manifest.json`, `styles.css`를 복사합니다.
   - Windows라면 압축 해제본의 `install.ps1 "볼트 경로"` 한 줄로 끝납니다.
3. Obsidian 설정 → 커뮤니티 플러그인에서 **Vellum**을 활성화합니다.

> 현재 데스크톱 전용입니다 (모바일 미검증).

## 개발 (빠른 시작)

```powershell
cd plugin
npm install
npm run dev    # 감시 빌드
npm run build  # 타입체크 + 프로덕션 번들
npm test       # 순수 로직 단위 테스트
```

## 기여 / 브랜치 규칙

이 저장소는 `master`(배포) / `dev`(통합) / `feat/*`(기능) 브랜치 전략을 사용합니다.
자세한 규칙은 [CONTRIBUTING.ko.md](CONTRIBUTING.ko.md)를 꼭 읽어주세요.

## 라이선스

[MIT](plugin/LICENSE)
