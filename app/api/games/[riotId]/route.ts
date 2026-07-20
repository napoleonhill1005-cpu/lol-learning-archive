/**
 * 최근 솔로랭크 요약 JSON — 자동화(아침 브리핑의 솔랭 복기·녹화 큐 채우기)가
 * RIOT 키 없이 배포된 사이트를 통해 전적을 읽는 통로.
 * 기존 lib/riot.ts 캐시(매치 force-cache, ids 120s)를 그대로 타므로 Riot 부담 없음.
 */
import { getAccount, getRecentGames, getRank } from "@/lib/riot";
import { laneOpponent } from "@/lib/riot-ui";
import { bearerMatches } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ riotId: string }> },
) {
  // GAMES_API_TOKEN 을 설정하면 Bearer 필수(자동화 쪽에도 같은 값 필요).
  // 미설정이면 기존대로 공개 — 프록시 레이트리밋만 적용된다.
  const token = process.env.GAMES_API_TOKEN;
  if (token && !bearerMatches(req, token)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { riotId } = await params;
  const decoded = decodeURIComponent(riotId);
  const [name, tag] = decoded.split("#");
  if (!name || !tag) {
    return Response.json({ error: "bad_riot_id" }, { status: 400 });
  }

  const acct = await getAccount(name, tag);
  if (!acct.ok) {
    return Response.json(
      { error: acct.error },
      { status: acct.error === "not_found" ? 404 : 502 },
    );
  }

  const [rank, games] = await Promise.all([
    getRank(acct.data.puuid),
    getRecentGames(acct.data.puuid, 10),
  ]);
  if (!games.ok) {
    return Response.json({ error: games.error }, { status: 502 });
  }

  return Response.json({
    riotId: decoded,
    rank,
    games: games.data.map((g) => {
      const opp = laneOpponent(g);
      return {
        matchId: g.matchId,
        champion: g.champion,
        lane: g.lane,
        win: g.win,
        kills: g.kills,
        deaths: g.deaths,
        assists: g.assists,
        cs: g.cs,
        csPerMin: g.csPerMin,
        durationMin: g.durationMin,
        killParticipation: g.killParticipation,
        visionScore: g.visionScore,
        endedAt: g.endedAt,
        endedRelative: g.endedRelative,
        patch: g.patch,
        opponent: opp ? { champion: opp.champion, name: opp.name } : null,
      };
    }),
  });
}
