// 서버 전용 Riot API 클라이언트. RIOT_API_KEY 환경변수 사용 — 클라이언트 컴포넌트에서 import 금지.
// KR 고정: account-v1 / match-v5 는 regional(asia), league-v4 는 platform(kr) 라우팅.

import { unstable_cache } from "next/cache";

const REGIONAL = "https://asia.api.riotgames.com";
const PLATFORM = "https://kr.api.riotgames.com";
const QUEUE_RANKED_SOLO = 420;

export type RiotError = "not_found" | "key_expired" | "rate_limited" | "unavailable";

export type Account = { puuid: string; gameName: string; tagLine: string };

/** 솔로랭크 티어. division 은 I~IV (마스터 이상은 의미 없음). */
export type Rank = {
  tier: string;
  division: string;
  lp: number;
  wins: number;
  losses: number;
};

/** 스코어보드/명단에 쓰는 참가자 1명 상세. items 는 7칸(장신구 마지막), 0 = 빈 슬롯. */
export type ParticipantDetail = {
  puuid: string;
  name: string;
  tag: string;
  champion: string;
  champLevel: number;
  teamId: number;
  position: string; // 원본 teamPosition (라인 상대 매칭용)
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damage: number;
  visionScore: number;
  items: number[];
  spells: [number, number];
  keystoneId: number;
  subStyleId: number;
  primaryStyleId: number;
  primaryPerks: number[]; // 키스톤 포함 4개
  subPerks: number[]; // 2개
};

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
  endedRelative: string;
  patch: string;
  killParticipation: number; // 0~100 (%)
  visionScore: number;
  controlWards: number;
  gold: number;
  damage: number;
  me: ParticipantDetail;
  participants: ParticipantDetail[];
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
  url: string,
  init: RequestInit & { next?: { revalidate: number } },
): Promise<RiotResult<unknown>> {
  const key = process.env.RIOT_API_KEY;
  if (!key) return { ok: false, error: "key_expired" };
  let res: Response;
  try {
    res = await fetch(url, {
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
    `${REGIONAL}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    { next: { revalidate: 3600 } },
  );
  return r as RiotResult<Account>;
}

/** 솔로랭크 티어. 실패/언랭이면 null — 페이지는 티어 없이도 정상 렌더해야 한다. */
export async function getRank(puuid: string): Promise<Rank | null> {
  const r = await riotFetch(`${PLATFORM}/lol/league/v4/entries/by-puuid/${puuid}`, {
    next: { revalidate: 300 },
  });
  if (!r.ok) return null;
  const entries = r.data as Record<string, unknown>[];
  const solo = entries.find((e) => e.queueType === "RANKED_SOLO_5x5");
  if (!solo) return null;
  return {
    tier: String(solo.tier ?? ""),
    division: String(solo.rank ?? ""),
    lp: Number(solo.leaguePoints ?? 0),
    wins: Number(solo.wins ?? 0),
    losses: Number(solo.losses ?? 0),
  };
}

/** 최근 솔로랭크 게임 요약 목록. 매치 상세는 불변이라 강하게 캐시한다. */
export async function getRecentGames(puuid: string, count = 10): Promise<RiotResult<GameSummary[]>> {
  const ids = await riotFetch(
    `${REGIONAL}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}&queue=${QUEUE_RANKED_SOLO}`,
    { next: { revalidate: 120 } },
  );
  if (!ids.ok) return ids;

  const games = await Promise.all(
    (ids.data as string[]).map(async (matchId) => {
      const m = await riotFetch(`${REGIONAL}/lol/match/v5/matches/${matchId}`, {
        cache: "force-cache",
      });
      if (!m.ok) return null;
      return toSummary(matchId, m.data, puuid);
    }),
  );
  return { ok: true, data: games.filter((g): g is GameSummary => g !== null) };
}

function toParticipant(p: Record<string, unknown>): ParticipantDetail {
  const perks = p.perks as
    | { styles?: { style?: number; selections?: { perk?: number }[] }[] }
    | undefined;
  const primary = perks?.styles?.[0];
  const sub = perks?.styles?.[1];
  return {
    puuid: String(p.puuid ?? ""),
    name: String(p.riotIdGameName ?? p.summonerName ?? ""),
    tag: String(p.riotIdTagline ?? ""),
    champion: String(p.championName ?? ""),
    champLevel: Number(p.champLevel ?? 0),
    teamId: Number(p.teamId ?? 0),
    position: String(p.teamPosition ?? ""),
    win: Boolean(p.win),
    kills: Number(p.kills ?? 0),
    deaths: Number(p.deaths ?? 0),
    assists: Number(p.assists ?? 0),
    cs: Number(p.totalMinionsKilled ?? 0) + Number(p.neutralMinionsKilled ?? 0),
    gold: Number(p.goldEarned ?? 0),
    damage: Number(p.totalDamageDealtToChampions ?? 0),
    visionScore: Number(p.visionScore ?? 0),
    items: [
      Number(p.item0 ?? 0),
      Number(p.item1 ?? 0),
      Number(p.item2 ?? 0),
      Number(p.item3 ?? 0),
      Number(p.item4 ?? 0),
      Number(p.item5 ?? 0),
      Number(p.item6 ?? 0),
    ],
    spells: [Number(p.summoner1Id ?? 0), Number(p.summoner2Id ?? 0)],
    keystoneId: Number(primary?.selections?.[0]?.perk ?? 0),
    subStyleId: Number(sub?.style ?? 0),
    primaryStyleId: Number(primary?.style ?? 0),
    primaryPerks: (primary?.selections ?? []).map((s) => Number(s.perk ?? 0)),
    subPerks: (sub?.selections ?? []).map((s) => Number(s.perk ?? 0)),
  };
}

function relativeTime(ts: number): string {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function toSummary(matchId: string, match: unknown, puuid: string): GameSummary | null {
  const info = (match as { info: Record<string, unknown> }).info;
  const rawParticipants = info.participants as Record<string, unknown>[];
  const raw = rawParticipants.find((x) => x.puuid === puuid);
  if (!raw) return null;

  const participants = rawParticipants.map(toParticipant);
  const me = participants.find((x) => x.puuid === puuid)!;

  const durationSec = Number(info.gameDuration ?? 0);
  const endTs = Number(info.gameEndTimestamp ?? 0);
  const endedAt = new Date(endTs).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // 킬관여: challenges 값(0~1) 우선, 없으면 팀 킬 합으로 계산.
  const challenges = raw.challenges as Record<string, unknown> | undefined;
  let kp = Number(challenges?.killParticipation ?? NaN);
  if (!Number.isFinite(kp)) {
    const teamKills = participants
      .filter((x) => x.teamId === me.teamId)
      .reduce((sum, x) => sum + x.kills, 0);
    kp = teamKills > 0 ? (me.kills + me.assists) / teamKills : 0;
  }

  return {
    matchId,
    champion: me.champion,
    lane: POS_TO_LANE[String(raw.teamPosition ?? "")] ?? String(raw.teamPosition ?? ""),
    win: me.win,
    kills: me.kills,
    deaths: me.deaths,
    assists: me.assists,
    cs: me.cs,
    csPerMin: durationSec > 0 ? Math.round((me.cs / (durationSec / 60)) * 10) / 10 : 0,
    durationMin: Math.round(durationSec / 60),
    endedAt,
    endedRelative: relativeTime(endTs),
    patch: String(info.gameVersion ?? "").split(".").slice(0, 2).join("."),
    killParticipation: Math.round(kp * 100),
    visionScore: me.visionScore,
    controlWards: Number(raw.visionWardsBoughtInGame ?? 0),
    gold: me.gold,
    damage: me.damage,
    me,
    participants,
  };
}

// ---------- 매치 타임라인 (시간대별 라인전 / 스킬 빌드 / 아이템 빌드) ----------

export type LaneDiff = { minute: number; goldDiff: number; csDiff: number };
export type ItemBuildStep = { minute: number; items: number[] };

export type TimelineAnalysis = {
  laneDiffs: LaneDiff[]; // 라인 상대 대비 (상대 없으면 빈 배열)
  skillOrder: number[]; // 찍은 순서. 1=Q 2=W 3=E 4=R
  itemBuild: ItemBuildStep[];
};

type TimelineFrame = {
  participantFrames?: Record<
    string,
    { totalGold?: number; minionsKilled?: number; jungleMinionsKilled?: number }
  >;
  events?: {
    type?: string;
    participantId?: number;
    skillSlot?: number;
    itemId?: number;
    beforeId?: number;
    timestamp?: number;
  }[];
};

// 타임라인 원본은 1~3MB라 Next 데이터 캐시(항목당 2MB, Vercel)에 못 들어간다.
// → fetch 는 no-store 로 받고, 추출한 분석 결과(수 KB)만 unstable_cache 로 저장.
// 끝난 게임의 불변 데이터라 무기한 캐시(revalidate: false).
// 실패 시엔 throw 해서 캐시에 남기지 않는다(다음 요청에서 재시도).
const cachedTimelineAnalysis = unstable_cache(
  async (matchId: string, myPuuid: string, oppPuuid: string | null): Promise<TimelineAnalysis> => {
    const r = await riotFetch(`${REGIONAL}/lol/match/v5/matches/${matchId}/timeline`, {
      cache: "no-store",
    });
    if (!r.ok) throw new Error(r.error);
    return extractTimeline(r.data, myPuuid, oppPuuid);
  },
  ["timeline-analysis-v1"],
  { revalidate: false },
);

/** 실패 시 null — 분석 섹션만 생략하고 페이지는 정상 렌더. */
export async function getTimelineAnalysis(
  matchId: string,
  myPuuid: string,
  oppPuuid: string | null,
): Promise<TimelineAnalysis | null> {
  try {
    return await cachedTimelineAnalysis(matchId, myPuuid, oppPuuid);
  } catch {
    return null;
  }
}

function extractTimeline(
  tl: unknown,
  myPuuid: string,
  oppPuuid: string | null,
): TimelineAnalysis {
  const data = tl as {
    metadata?: { participants?: string[] };
    info?: { frames?: TimelineFrame[] };
  };
  const puuids = data.metadata?.participants ?? [];
  const frames = data.info?.frames ?? [];
  const myId = puuids.indexOf(myPuuid) + 1;
  const oppId = oppPuuid ? puuids.indexOf(oppPuuid) + 1 : 0;

  const laneDiffs: LaneDiff[] = [];
  if (myId > 0 && oppId > 0) {
    for (const minute of [5, 10, 15, 20]) {
      const pf = frames[minute]?.participantFrames;
      const mine = pf?.[String(myId)];
      const theirs = pf?.[String(oppId)];
      if (!mine || !theirs) continue;
      const csOf = (f: typeof mine) =>
        Number(f.minionsKilled ?? 0) + Number(f.jungleMinionsKilled ?? 0);
      laneDiffs.push({
        minute,
        goldDiff: Number(mine.totalGold ?? 0) - Number(theirs.totalGold ?? 0),
        csDiff: csOf(mine) - csOf(theirs),
      });
    }
  }

  const skillOrder: number[] = [];
  const purchases: { minute: number; itemId: number }[] = [];
  for (const frame of frames) {
    for (const e of frame.events ?? []) {
      if (e.participantId !== myId) continue;
      if (e.type === "SKILL_LEVEL_UP" && e.skillSlot) {
        skillOrder.push(e.skillSlot);
      } else if (e.type === "ITEM_PURCHASED" && e.itemId) {
        purchases.push({ minute: Math.floor(Number(e.timestamp ?? 0) / 60000), itemId: e.itemId });
      } else if (e.type === "ITEM_UNDO" && e.beforeId) {
        const i = purchases.map((x) => x.itemId).lastIndexOf(e.beforeId);
        if (i >= 0) purchases.splice(i, 1);
      }
    }
  }

  const itemBuild: ItemBuildStep[] = [];
  for (const p of purchases) {
    const last = itemBuild[itemBuild.length - 1];
    if (last && last.minute === p.minute) last.items.push(p.itemId);
    else itemBuild.push({ minute: p.minute, items: [p.itemId] });
  }

  return { laneDiffs, skillOrder, itemBuild };
}
