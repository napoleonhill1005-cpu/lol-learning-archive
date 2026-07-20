# 보안 운영 가이드

이 사이트의 위협은 "해킹으로 뭘 털린다"보다 **비용·가용성 공격**이다. 유저 DB·로그인이 없어서
털릴 개인정보 자체가 없고, 대신 ① 요청 증폭(페이지 1회 = Riot API 수십 호출) ② Vercel 함수
사용량 과금 ③ Riot 키 정지가 실제 리스크다.

## 코드에 들어있는 방어 (배포하면 자동 적용)

| 방어 | 위치 | 내용 |
|---|---|---|
| 레이트리밋 | `proxy.ts` | IP당 분당 `/summoner`·`/compare` 30회, `/api/games` 12회 → 초과 시 429 |
| 입력 사전 차단 | `proxy.ts` | 형식 불량 Riot ID는 Riot 호출 전에 400/redirect |
| 보안 헤더 + CSP | `next.config.ts` | XSS·클릭재킹·MIME 스니핑 차단. 외부 리소스는 ddragon·유튜브만 허용 |
| 크론 인증 | `api/cron/tier-snapshot` | `CRON_SECRET` Bearer, 상수 시간 비교, 미설정 시 전부 거부 |
| 전적 API 잠금(선택) | `api/games/[riotId]` | `GAMES_API_TOKEN` 설정 시 Bearer 없으면 401 |
| Riot 호출 스로틀 | `lib/riot.ts` | 전역 60ms 간격 — 우리 쪽에서 Riot 키 정지당할 버스트 방지 |
| Supabase | `supabase/schema.sql` | RLS on + 정책 없음 = service_role(서버 전용)로만 접근. anon 키로는 아무것도 못 읽음 |

**한계**: `proxy.ts` 레이트리밋은 서버리스 인스턴스별 메모리 기반이다. 단일 IP 스크래퍼·버스트는
막지만, **수천 IP 분산(디도스)은 코드로 못 막는다** — 그건 아래 플랫폼 설정 몫.

## Vercel 대시보드에서 켜야 하는 것 (코드로 불가능, 1회 설정)

1. **Firewall → Attack Challenge Mode**: 디도스 감지 시 봇에게 챌린지를 강제. 평소엔 꺼두고
   공격 감지 시 켜는 버튼 — 위치만 알아두면 된다. (L3/L4 디도스 완화는 Vercel이 전 플랜 기본 제공)
2. **Firewall → Rules**: `/summoner/*` 등에 플랫폼 레벨 IP 레이트리밋 룰 추가 가능(proxy.ts보다
   앞단에서 걸러 함수 실행 비용 자체를 아낌).
3. **Settings → Spend Management**: 월 사용량 상한 + 알림 설정. **디도스의 진짜 피해는 다운이
   아니라 과금**이므로 이게 제일 중요하다. 상한 도달 시 자동 일시정지 옵션 켜기.
4. **환경변수 확인**: `CRON_SECRET` 이 실제로 설정돼 있는지 (미설정이면 크론이 401로 아무것도 안
   쌓는다 — fail-closed). `RIOT_API_KEY`·`SUPABASE_SERVICE_KEY` 는 서버 전용(`NEXT_PUBLIC_` 금지).

## 평소 습관

- **키가 새면 로테이션**: Riot 키·Supabase service_role 키가 커밋·로그·스크린샷에 노출됐다 싶으면
  즉시 재발급. `.env*` 는 gitignore 돼 있지만, auto-sync(다른 레포)가 홈 디렉토리 레포를 전부
  자동 커밋하므로 **레포 폴더 안에 키 적힌 메모 파일을 두지 말 것**.
- **의존성**: 분기마다 `npm audit` 한 번. Next 보안 패치(특히 middleware/proxy 관련 CVE)는 바로 반영.
- `/api/games` 를 외부에 알려줄 일이 없으면 `GAMES_API_TOKEN` 을 설정해 잠그는 걸 권장
  (자동화 호출부에 `Authorization: Bearer <토큰>` 헤더 추가 필요).
