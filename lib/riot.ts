// 서버 전용 Riot API 클라이언트. RIOT_API_KEY 환경변수 사용 — 클라이언트 컴포넌트에서 import 금지.
// KR 고정: account-v1 / match-v5 는 regional(asia) 라우팅.

const REGIONAL = "https://asia.api.riotgames.com";
const QUEUE_RANKED_SOLO = 420;

export type RiotError = "not_found" | "key_expired" | "rate_limited" | "unavailable";

export type Account = { puuid: string; gameName: string; tagLine: string };

/** 전적 리스트 한 줄에 필요한 요약. lane 은 videos.json 과 같은 표기(TOP|JUNGLE|MID|ADC|SUPPORT). */
export type GameSummary = {
  matchId: string;
  champion: string;
  lane: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  csPerMin: number;
  durationMin: number;
  endedAt: string;
  patch: string;
};

export type RiotResult<T> = { ok: true; data: T } | { ok: false; error: RiotError };

const POS_TO_LANE: Record<string, string> = {
  TOP: "TOP",
  JUNGLE: "JUNGLE",
  MIDDLE: "MID",
  BOTTOM: "ADC",
  UTILITY: "SUPPORT",
};

async function riotFetch(
  path: string,
  init: RequestInit & { next?: { revalidate: number } },
): Promise<RiotResult<unknown>> {
  const key = process.env.RIOT_API_KEY;
  if (!key) return { ok: false, error: "key_expired" };
  let res: Response;
  try {
    res = await fetch(`${REGIONAL}${path}`, {
      ...init,
      headers: { "X-Riot-Token": key },
    });
  } catch {
    return { ok: false, error: "unavailable" };
  }
  if (res.status === 404) return { ok: false, error: "not_found" };
  if (res.status === 401 || res.status === 403) return { ok: false, error: "key_expired" };
  if (res.status === 429) return { ok: false, error: "rate_limited" };
  if (!res.ok) return { ok: false, error: "unavailable" };
  return { ok: true, data: await res.json() };
}

export async function getAccount(gameName: string, tagLine: string): Promise<RiotResult<Account>> {
  const r = await riotFetch(
    `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    { next: { revalidate: 3600 } },
  );
  return r as RiotResult<Account>;
}

/** 최근 솔로랭크 게임 요약 목록. 매치 상세는 불변이라 강하게 캐시한다. */
export async function getRecentGames(puuid: string, count = 10): Promise<RiotResult<GameSummary[]>> {
  const ids = await riotFetch(
    `/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}&queue=${QUEUE_RANKED_SOLO}`,
    { next: { revalidate: 120 } },
  );
  if (!ids.ok) return ids;

  const games = await Promise.all(
    (ids.data as string[]).map(async (matchId) => {
      const m = await riotFetch(`/lol/match/v5/matches/${matchId}`, { cache: "force-cache" });
      if (!m.ok) return null;
      return toSummary(matchId, m.data, puuid);
    }),
  );
  return { ok: true, data: games.filter((g): g is GameSummary => g !== null) };
}

function toSummary(matchId: string, match: unknown, puuid: string): GameSummary | null {
  const info = (match as { info: Record<string, unknown> }).info;
  const participants = info.participants as Record<string, unknown>[];
  const p = participants.find((x) => x.puuid === puuid);
  if (!p) return null;

  const durationSec = Number(info.gameDuration ?? 0);
  const cs = Number(p.totalMinionsKilled ?? 0) + Number(p.neutralMinionsKilled ?? 0);
  const endedAt = new Date(Number(info.gameEndTimestamp ?? 0)).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    matchId,
    champion: String(p.championName ?? ""),
    lane: POS_TO_LANE[String(p.teamPosition ?? "")] ?? String(p.teamPosition ?? ""),
    win: Boolean(p.win),
    kills: Number(p.kills ?? 0),
    deaths: Number(p.deaths ?? 0),
    assists: Number(p.assists ?? 0),
    cs,
    csPerMin: durationSec > 0 ? Math.round((cs / (durationSec / 60)) * 10) / 10 : 0,
    durationMin: Math.round(durationSec / 60),
    endedAt,
    patch: String(info.gameVersion ?? "").split(".").slice(0, 2).join("."),
  };
}
