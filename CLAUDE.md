# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 레포에서 작업할 때의 가이드다.

## 이 레포의 정체 — 📦 실제 제품 (배포 사이트)

**"롤 학습 아카이브"** — 프로게이머 솔로랭크 리플레이를 챔피언·프로·패치·태그로 검색하고, *"내 게임 vs 프로"* 로 비교하는 **배포 중인 실제 사이트**. Next.js 16 + React 19 + Tailwind 4 + Supabase, Vercel 배포. 상세 구조·스택은 `README.md`.

문서 워크스페이스가 아니라 **라이브 제품**이다. 코드 변경이 곧 유저 화면 변경.

## 3레포 중 내 위치 (역할 분리)

이 사이트는 3개 레포로 나뉜 프로젝트의 **산출물(제품)** 이다:

- 🧭 **기획** = [`lol-matchup-lab`](https://github.com/napoleonhill1005-cpu/lol-matchup-lab) — 왜/무엇을 만드는가(니치·해자·로드맵).
- ⚙️ **제품 파이프라인** = [`lol-analysis-os`](https://github.com/napoleonhill1005-cpu/lol-analysis-os) — 유튜브 영상 + 장면/원리 데이터를 만드는 제작 파이프라인. 그 산출물이 이 사이트의 `data/*.json`으로 들어온다.
- 📦 **실제 제품** = **이 레포**.

## 아키텍처 메모

- **라우트**: 홈(검색+갤러리) · `/pros` · `/pro/[slug]` · `/compare` · `/summoner/[riotId]`(티어 그래프) · `/video/[id]`(장면 플레이어) · `/members`(멤버 노트 아카이브 — `MEMBER_CODE_SECRET`에서 월별 접근코드 HMAC 파생, `npm run member-code`로 이달 코드 출력) · `/api/cron/tier-snapshot`(일일 크론).
- **데이터 소스**: 정적 `data/*.json`(videos·pros·scenes) + Riot API(`lib/riot.ts`) + Data Dragon(`lib/ddragon.ts`) + Supabase(`lib/tier-store.ts`·`search-store.ts`).
- **추천 로직**: `lib/recommend.ts`·`lib/score.ts` — 검색한 소환사의 게임 챔피언·라인과 같은 프로 영상을 매칭.
- **Supabase**: `supabase/schema.sql`의 `tier_snapshots`. RLS on + 정책 없음 = `service_role`(서버 전용) 키로만 접근.

## 손댈 때 주의

- **AGENTS.md 규칙 먼저**: 이 Next.js 버전은 학습데이터와 다를 수 있음 → 코드 작성 전 `node_modules/next/dist/docs/`의 해당 가이드를 확인. (아래 import 유지)
- `data/*.json`은 **파이프라인(`lol-analysis-os`) 산출물**이다. 영상·장면을 임의 생성하지 말고 실제 데이터만 등록. 스키마 변경 시 `lib/`의 로더와 페이지가 함께 깨지니 로더부터 점검.
- Riot API 키·Supabase `service_role` 키·`.env`는 코드/커밋에 남기지 말 것.

@AGENTS.md
