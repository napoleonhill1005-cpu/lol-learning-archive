/**
 * 고수 스카우트 — KR 챌린저/그마 래더를 스캔해 장인/프로부캐/대리 의심 계정을
 * data/experts.json에 후보(candidate)로 적재한다. 기존 confirmed 항목은 보존.
 *
 * 실행:  RIOT_API_KEY=RGAPI-... npm run scout            (상위 30명)
 *        RIOT_API_KEY=... npm run scout -- --max 100     (표본 확대)
 *        RIOT_API_KEY=... npm run scout -- --gm           (그랜드마스터 포함)
 *
 * 개발 키 레이트리밋(100회/2분)에 맞춰 요청당 1.6초 간격 — 30계정 ≈ 10분.
 * 매일 조금씩 돌려 적재하는 용도. 결과 검토 후 status를 confirmed로 바꿔 커밋.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { classify, type ScanStats } from "../lib/expert-classify.ts";

const REGIONAL = "https://asia.api.riotgames.com";
const PLATFORM = "https://kr.api.riotgames.com";
const QUEUE = 420;
const MATCH_SAMPLE = 12;
const SPACING_MS = 1600; // ~75회/2분

const KEY = process.env.RIOT_API_KEY;
if (!KEY) {
  console.error("RIOT_API_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

const args = process.argv.slice(2);
const MAX = Number(args[args.indexOf("--max") + 1]) || 30;
const INCLUDE_GM = args.includes("--gm");
const OUT = new URL("../data/experts.json", import.meta.url).pathname;

let lastReq = 0;
async function rf(url: string): Promise<unknown | null> {
  const wait = lastReq + SPACING_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastReq = Date.now();
  const res = await fetch(url, { headers: { "X-Riot-Token": KEY! } });
  if (res.status === 429) {
    const retry = Number(res.headers.get("retry-after") ?? 10);
    console.log(`  429 — ${retry}s 대기`);
    await new Promise((r) => setTimeout(r, retry * 1000 + 500));
    return rf(url);
  }
  if (!res.ok) return null;
  return res.json();
}

type LadderEntry = { puuid?: string; leaguePoints: number; wins: number; losses: number };

async function ladder(tier: "challenger" | "grandmaster"): Promise<LadderEntry[]> {
  const d = (await rf(
    `${PLATFORM}/lol/league/v4/${tier}leagues/by-queue/RANKED_SOLO_5x5`,
  )) as { entries?: LadderEntry[] } | null;
  return (d?.entries ?? []).sort((a, b) => b.leaguePoints - a.leaguePoints);
}

async function main() {
  console.log(`래더 스캔 시작 (상위 ${MAX}명${INCLUDE_GM ? ", 그마 포함" : ""})`);
  let entries = (await ladder("challenger")).map((e) => ({ ...e, tier: "CHALLENGER" }));
  if (INCLUDE_GM) {
    const gm = (await ladder("grandmaster")).map((e) => ({ ...e, tier: "GRANDMASTER" }));
    entries = entries.concat(gm);
  }
  entries = entries.filter((e) => e.puuid).slice(0, MAX);
  console.log(`대상 ${entries.length}계정 — 예상 소요 ~${Math.ceil((entries.length * (MATCH_SAMPLE + 3) * SPACING_MS) / 60000)}분`);

  const existing = JSON.parse(readFileSync(OUT, "utf8")) as { riotId: string; status: string }[];
  const known = new Set(existing.map((e) => e.riotId));
  const found: unknown[] = [];

  for (const [i, entry] of entries.entries()) {
    const puuid = entry.puuid!;
    const acct = (await rf(
      `${REGIONAL}/riot/account/v1/accounts/by-puuid/${puuid}`,
    )) as { gameName?: string; tagLine?: string } | null;
    if (!acct?.gameName) continue;
    const riotId = `${acct.gameName}#${acct.tagLine}`;
    if (known.has(riotId)) continue;

    const summ = (await rf(
      `${PLATFORM}/lol/summoner/v4/summoners/by-puuid/${puuid}`,
    )) as { summonerLevel?: number } | null;

    const ids = (await rf(
      `${REGIONAL}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${MATCH_SAMPLE}&queue=${QUEUE}`,
    )) as string[] | null;
    if (!ids?.length) continue;

    const champs = new Map<string, number>();
    let wins = 0;
    let games = 0;
    const lanes = new Map<string, number>();
    for (const id of ids) {
      const m = (await rf(`${REGIONAL}/lol/match/v5/matches/${id}`)) as {
        info?: { participants?: Record<string, unknown>[] };
      } | null;
      const p = m?.info?.participants?.find((x) => x.puuid === puuid);
      if (!p) continue;
      games++;
      if (p.win) wins++;
      const c = String(p.championName ?? "");
      champs.set(c, (champs.get(c) ?? 0) + 1);
      const lane = String(p.teamPosition ?? "");
      if (lane) lanes.set(lane, (lanes.get(lane) ?? 0) + 1);
    }
    if (games === 0) continue;

    const [topChampion, topCount] = [...champs.entries()].sort((a, b) => b[1] - a[1])[0];
    const mainLane = [...lanes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    // 래더 시즌 전체 승률(신뢰도 높음)과 표본 승률 중 표본이 크면 표본 사용
    const seasonGames = entry.wins + entry.losses;
    const winrate =
      seasonGames >= 30
        ? Math.round((entry.wins / seasonGames) * 100)
        : Math.round((wins / games) * 100);

    const stats: ScanStats = {
      games: Math.max(games, seasonGames),
      winrate,
      topChampion,
      topShare: Math.round((topCount / games) * 100),
      summonerLevel: Number(summ?.summonerLevel ?? 0),
      tier: entry.tier,
    };
    const cats = classify(stats);
    console.log(
      `[${i + 1}/${entries.length}] ${riotId} — ${stats.tier} lv${stats.summonerLevel} 승률${winrate}% ${topChampion}(${stats.topShare}%) → ${cats.join(",") || "-"}`,
    );
    if (cats.length === 0) continue;

    const primary = cats[0];
    found.push({
      riotId,
      category: primary,
      label:
        primary === "otp"
          ? `${topChampion} 장인`
          : primary === "pro-smurf"
            ? "프로 부캐 의심"
            : "대리 의심 고승률",
      champion: primary === "otp" ? topChampion : undefined,
      lane: { TOP: "TOP", JUNGLE: "JUNGLE", MIDDLE: "MID", BOTTOM: "ADC", UTILITY: "SUPPORT" }[mainLane],
      status: "candidate",
      evidence: {
        games: stats.games,
        winrate,
        topShare: stats.topShare,
        tier: stats.tier,
        level: stats.summonerLevel,
      },
      note: cats.length > 1 ? `복수 판정: ${cats.join(", ")}` : undefined,
      addedAt: new Date().toISOString().slice(0, 10),
    });
  }

  writeFileSync(OUT, JSON.stringify([...existing, ...found], null, 2) + "\n");
  console.log(`\n완료 — 신규 후보 ${found.length}건 적재 (총 ${existing.length + found.length}건) → data/experts.json`);
  console.log("검토 후 status를 confirmed로 바꾸고, 프로 부캐는 linkedPro를 채워 커밋하세요.");
}

main();
