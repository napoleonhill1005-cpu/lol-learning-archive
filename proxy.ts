/**
 * 비싼 라우트 보호 프록시 (Next 16: middleware → proxy).
 * /summoner·/compare·/api/games 는 요청 1건이 Riot API 수십 호출로 증폭되므로
 * ① IP당 분당 요청 수 제한 ② riotId 형식 사전 차단으로 증폭 비용을 막는다.
 *
 * 한계: 인스턴스 메모리 기반이라 서버리스 스케일아웃 시 인스턴스별로 창이 따로 돈다.
 * 단일 IP 버스트(스크래퍼·단순 도스)는 충분히 막지만, 분산 공격은 Vercel WAF
 * (Attack Challenge Mode·레이트리밋 룰) 몫이다 — SECURITY.md 참고.
 */

import { NextResponse, type NextRequest } from "next/server";

const WINDOW_MS = 60_000;
const PAGE_LIMIT = 30; // /summoner·/compare — 사람이 분당 30번 검색할 일은 없다
const API_LIMIT = 12; // /api/games — 자동화(아침 브리핑)는 분당 1~2회면 충분

type Window = { start: number; count: number };
const hits = new Map<string, Window>();
const MAX_TRACKED_IPS = 10_000; // 맵 자체가 메모리 공격 표면이 되지 않게 상한

function rateLimited(key: string, limit: number): boolean {
  const now = Date.now();
  const w = hits.get(key);
  if (!w || now - w.start >= WINDOW_MS) {
    if (hits.size >= MAX_TRACKED_IPS) hits.clear();
    hits.set(key, { start: now, count: 1 });
    return false;
  }
  w.count += 1;
  return w.count > limit;
}

function clientIp(req: NextRequest): string {
  // Vercel이 신뢰 가능한 값으로 채워준다. 로컬 dev 에선 둘 다 없어 "local".
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "local"
  );
}

/** Riot ID 사전 검증 — 형식이 아예 틀린 요청은 Riot 호출 전에 끊는다. (게임명 ≤16자, 태그 ≤5자 + 여유) */
function validRiotId(segment: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return false;
  }
  const hash = decoded.indexOf("#");
  if (hash <= 0 || hash !== decoded.lastIndexOf("#")) return false;
  const name = decoded.slice(0, hash);
  const tag = decoded.slice(hash + 1);
  return name.length <= 24 && tag.length >= 1 && tag.length <= 8;
}

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/games/");

  // 1) 형식 불량 riotId 차단 (증폭 비용 발생 전에)
  const riotSegment = isApi
    ? pathname.slice("/api/games/".length)
    : pathname.startsWith("/summoner/")
      ? pathname.slice("/summoner/".length)
      : null;
  if (riotSegment !== null && !validRiotId(riotSegment.split("/")[0])) {
    return isApi
      ? NextResponse.json({ error: "bad_riot_id" }, { status: 400 })
      : NextResponse.redirect(new URL("/", req.url));
  }

  // 2) IP당 레이트리밋 (페이지/전적 API 창을 분리해 자동화와 사람 트래픽이 서로 안 잡아먹게)
  const ip = clientIp(req);
  const limited = isApi
    ? rateLimited(`api:${ip}`, API_LIMIT)
    : rateLimited(`page:${ip}`, PAGE_LIMIT);
  if (limited) {
    return isApi
      ? NextResponse.json(
          { error: "rate_limited" },
          { status: 429, headers: { "Retry-After": "60" } },
        )
      : new NextResponse("요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.", {
          status: 429,
          headers: { "Retry-After": "60", "Content-Type": "text/plain; charset=utf-8" },
        });
  }

  return NextResponse.next();
}

export const config = {
  // /members 는 riotId 분기를 타지 않고 page: 레이트리밋만 탄다 —
  // 접근코드 폼 POST(서버 액션도 같은 경로) 무차별 대입을 30회/분으로 묶는 용도.
  matcher: ["/summoner/:path*", "/compare", "/api/games/:path*", "/members", "/members/:path*"],
};
