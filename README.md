# 🎮 모두의 게임 (natas-game)

GitHub의 인기 **오픈소스 게임**을 테마별로 모은 **순수 정적 게임 포털**입니다. by **NATAS 팀**.

- 배포: <https://game.spatialhealing.co.kr/>
- 저장소: <https://github.com/dlgodnr5-png/natas-game>
- 멤버십/구독 총괄: [AI WORLD MAKER](https://aiworldmaker.happygold.shop) — 이 포털은 결제/인증 로직을 두지 않고 링크만 합니다.

## 구조

```
natas-game/
├── index.html              # 허브 — 6개 테마 카드
├── vercel.json             # 정적 배포 설정 (cleanUrls)
├── games.json              # 전체 게임 매니페스트
├── LICENSES/index.html     # 출처·라이선스 종합 페이지
├── assets/
│   ├── css/natas.css       # 공용 스타일
│   └── js/natas.js         # 헤더/푸터 주입기 (빌드 불필요)
└── <theme>/                # arcade · puzzle · board-card · action-shooter · strategy-sim · casual
    ├── index.html          #   테마 랜딩 + 게임 카드
    └── <game>/             #   내장 게임 (원본 LICENSE 동봉)
```

## 6개 테마

아케이드 · 퍼즐 · 보드·카드 · 액션·슈팅 · 전략·시뮬 · 캐주얼

## 게임 추가 방법

1. `git clone --depth 1 <repo>` 후, **드롭인 정적**(빌드 불필요)인지 확인.
2. 게임 파일을 `<theme>/<game>/`로 복사하고 **원본 `LICENSE` 파일을 그대로 동봉**.
3. `games.json`에 항목 추가, `<theme>/index.html`에 카드 추가, `LICENSES/index.html`에 행 추가.

## 라이선스 정책

- **내장(vendor)**: MIT · BSD · zlib · CC0 · Unlicense · Apache 등 자유 라이선스 + `LICENSE` 파일 존재 시에만.
- **외부 링크**: GPL/AGPL/네이티브 명작(lichess · Mindustry · OpenRCT2 · OpenTTD 등)은 내장하지 않고 공식 사이트로 링크.
- 각 게임의 저작권/라이선스는 **원저작자**에게 있습니다. 전체 출처는 [`/LICENSES/`](./LICENSES/index.html) 참고.

## 로컬 실행

빌드 불필요. 정적 서버로 루트를 서빙하면 됩니다. 예:

```bash
npx serve .      # 또는
python -m http.server 3000
```

> 절대경로(`/assets/...`)를 사용하므로 `file://`로 직접 열기보다 정적 서버 실행을 권장합니다.
