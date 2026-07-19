# lol-learning-archive — 롤 학습 아카이브 (📦 실제 제품)

> **프로게이머 솔로랭크 리플레이를 챔피언·프로·패치·태그로 검색하는 학습 아카이브.**
> 핵심 경험: *"내 게임을 프로와 비교하며 배우기"* — Riot ID로 전적을 검색하면, 게임마다 같은 챔피언·라인의 프로 리플레이 영상을 추천한다.

배포되는 **실제 사이트**다. 문서 저장소가 아니라 라이브 제품이므로, 여기 손댈 땐 실제 유저가 보는 화면이 바뀐다는 걸 전제로 작업할 것.

## 이 프로젝트는 3개 레포로 나뉜다 — 기획 · 제품 파이프라인 · 실제 제품

| 레포 | 역할 | 무엇 | 코드? |
|---|---|---|---|
| [`lol-matchup-lab`](https://github.com/napoleonhill1005-cpu/lol-matchup-lab) | 🧭 **기획** | 무엇을·왜 만드는가 — 니치·해자·로드맵(Phase) | 문서만 |
| [`lol-analysis-os`](https://github.com/napoleonhill1005-cpu/lol-analysis-os) | ⚙️ **제품 파이프라인** | 콘텐츠(유튜브 영상 + 장면/원리 데이터)를 만드는 제작 파이프라인(OS) | 문서+스크립트 |
| **`lol-learning-archive`** (여기) | 📦 **실제 제품** | 배포 사이트 — 파이프라인 산출물을 대중이 검색·비교 | 앱 코드 |

흐름: **기획(왜/무엇)** → **제품 파이프라인(영상·장면 제작)** → **실제 제품(사이트에 축적·검색)**.
👉 **지금 이 레포 = 실제 제품(사이트 코드).** 왜/무엇을 만드는지는 `lol-matchup-lab`, 사이트에 올라갈 영상·장면을 만드는 과정은 `lol-analysis-os`.

## 스택

- **Next.js 16** (App Router) + **React 19** + **Tailwind 4** — TypeScript. 패키지 매니저 npm.
- **Supabase** — 티어 스냅샷 축적(계정당 하루 1행). `service_role` 키(서버 전용)로만 접근(RLS on, 정책 없음).
- **Riot API** — 소환사 전적·티어 조회(`lib/riot.ts`). **Data Dragon** — 챔피언 메타(`lib/ddragon.ts`).
- 배포: Vercel(`vercel.json`).

## 구조

```
app/
  page.tsx                     홈: Riot ID 검색창 + 영상 갤러리
  pros/page.tsx                프로 목록
  pro/[slug]/page.tsx          프로별 페이지
  compare/page.tsx             내 게임 ↔ 프로 비교
  summoner/[riotId]/           소환사 페이지(티어 그래프 SVG · 방문 도구)
  video/[id]/                  영상 페이지 + 장면 플레이어(유튜브 타임스탬프)
  api/cron/tier-snapshot/      일일 크론: 티어 스냅샷 적립
lib/
  riot.ts · ddragon.ts         외부 API (Riot 전적/티어, 챔피언 메타)
  recommend.ts · score.ts      챔피언·라인 기준 프로 영상 추천/점수
  pros.ts · videos.ts · scenes.ts   data/*.json 로더
  tier-store.ts · search-store.ts   Supabase 티어/검색 적립
data/
  videos.json                  프로 솔랭 리플레이 영상 (파이프라인 산출물이 여기로 들어옴)
  pros.json                    프로 → Riot ID 매핑
  scenes.json                  장면(원리) 데이터
supabase/schema.sql            tier_snapshots 테이블 (SQL Editor에서 1회 실행)
```

## 콘텐츠는 어디서 오나

`data/videos.json`·`data/scenes.json`의 영상·장면은 **`lol-analysis-os` 파이프라인의 산출물**이다(프로 리플레이 → 유튜브 영상 → 여기 등록). 새 영상/장면을 임의로 지어내지 말고, 파이프라인에서 나온 실제 데이터를 등록할 것.

## 개발 명령어

```bash
npm install
npm run dev        # next dev (localhost:3000)
npm run build      # next build
npm run start      # 프로덕션 서버
```

환경변수(Riot API 키, Supabase URL/`service_role` 키 등)는 Vercel/로컬 `.env`에 설정. 커밋 금지.

## 주의

- **AGENTS.md 규칙**: 이 Next.js는 학습데이터의 버전과 다를 수 있음 → 코드 작성 전 `node_modules/next/dist/docs/`의 해당 가이드를 먼저 볼 것.
- Riot API 키·Supabase `service_role` 키·`.env`는 코드/커밋에 남기지 말 것.
- `data/*.json` 스키마를 바꾸면 `lib/`의 로더(`videos.ts`·`pros.ts`·`scenes.ts`)와 페이지가 같이 깨진다 — 필드 추가/변경 시 로더부터 확인.
