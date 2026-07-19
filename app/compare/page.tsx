import type { Metadata } from "next";
import Link from "next/link";
import {
  getAccount,
  getRecentGames,
  getTimelineAnalysis,
  type Account,
  type GameSummary,
  type ParticipantDetail,
  type RiotError,
  type TimelineAnalysis,
} from "@/lib/riot";
import { ERROR_MESSAGE, laneOpponent } from "@/lib/riot-ui";
import { championIconUrl, championKoMap, ddragonVersion } from "@/lib/ddragon";
import { pros, proSlug, getPro, resolveProByName, type Pro } from "@/lib/pros";
import { laneLabel } from "@/lib/videos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "프로와 비교 — 롤 학습 아카이브",
  description: "내 최근 솔로랭크 지표를 프로게이머와 나란히 비교해보세요.",
};

type SideStats = {
  games: number;
  winrate: number;
  kda: number;
  csPerMin: number;
  kp: number;
  cs14: number | null;
  gold15: number | null;
  tlCount: number; // 시간대 지표가 잡힌 게임 수 (14분 이전 종료 게임은 제외됨)
  mostChamps: { champion: string; count: number; wins: number }[];
  mainLane: string;
};

function sideStats(games: GameSummary[], analyses: (TimelineAnalysis | null)[]): SideStats {
  const n = games.length;
  const sum = (f: (g: GameSummary) => number) => games.reduce((a, g) => a + f(g), 0);

  const cs14s: number[] = [];
  const gold15s: number[] = [];
  for (const a of analyses) {
    const c14 = a?.myAt.find((m) => m.minute === 14);
    const g15 = a?.myAt.find((m) => m.minute === 15);
    if (c14) cs14s.push(c14.cs);
    if (g15) gold15s.push(g15.gold);
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  const byChamp = new Map<string, { count: number; wins: number }>();
  const byLane = new Map<string, number>();
  for (const g of games) {
    const c = byChamp.get(g.champion) ?? { count: 0, wins: 0 };
    c.count += 1;
    if (g.win) c.wins += 1;
    byChamp.set(g.champion, c);
    if (g.lane) byLane.set(g.lane, (byLane.get(g.lane) ?? 0) + 1);
  }

  return {
    games: n,
    winrate: n ? (games.filter((g) => g.win).length / n) * 100 : 0,
    kda: (sum((g) => g.kills) + sum((g) => g.assists)) / Math.max(sum((g) => g.deaths), 1),
    csPerMin: n ? sum((g) => g.csPerMin) / n : 0,
    kp: n ? sum((g) => g.killParticipation) / n : 0,
    cs14: avg(cs14s),
    gold15: avg(gold15s),
    tlCount: Math.max(cs14s.length, gold15s.length),
    mostChamps: [...byChamp.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([champion, v]) => ({ champion, ...v })),
    mainLane: [...byLane.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
  };
}

type SideResult = { error: RiotError } | { account: Account; stats: SideStats };

async function loadSide(riotId: string): Promise<SideResult> {
  // 태그 없는 입력은 프로 이름(활동명/영문/본명)으로 시도
  let id = riotId;
  if (!id.includes("#")) {
    const p = resolveProByName(id);
    if (p) id = p.riotId;
  }
  const [gameName, tagLine] = id.split("#");
  if (!gameName?.trim() || !tagLine?.trim()) return { error: "not_found" };
  const account = await getAccount(gameName.trim(), tagLine.trim());
  if (!account.ok) return { error: account.error };
  const games = await getRecentGames(account.data.puuid, 10);
  if (!games.ok) return { error: games.error };
  const analyses = await Promise.all(
    games.data.map((g) =>
      getTimelineAnalysis(g.matchId, g.me.puuid, laneOpponent(g)?.puuid ?? null),
    ),
  );
  return { account: account.data, stats: sideStats(games.data, analyses) };
}

function fmtGold(v: number): string {
  return Math.round(v).toLocaleString("ko-KR");
}

function StatRow({
  label,
  me,
  pro,
  fmt,
}: {
  label: string;
  me: number | null;
  pro: number | null;
  fmt: (v: number) => string;
}) {
  const max = Math.max(me ?? 0, pro ?? 0);
  const width = (v: number | null) =>
    v === null || max <= 0 ? 0 : Math.max((v / max) * 100, 2);
  const meWins = me !== null && pro !== null && me > pro;
  const proWins = me !== null && pro !== null && pro > me;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
      <div className="flex flex-col items-end gap-1">
        <span className={`text-sm tabular-nums ${meWins ? "font-semibold text-sky-300" : "text-zinc-300"}`}>
          {me === null ? "—" : fmt(me)}
        </span>
        <div className="flex h-2 w-full justify-end rounded bg-zinc-800/60">
          <div className="h-2 rounded bg-sky-400/80" style={{ width: `${width(me)}%` }} />
        </div>
      </div>
      <span className="w-20 text-center text-xs text-zinc-400">{label}</span>
      <div className="flex flex-col items-start gap-1">
        <span className={`text-sm tabular-nums ${proWins ? "font-semibold text-amber-300" : "text-zinc-300"}`}>
          {pro === null ? "—" : fmt(pro)}
        </span>
        <div className="h-2 w-full rounded bg-zinc-800/60">
          <div className="h-2 rounded bg-amber-400/90" style={{ width: `${width(pro)}%` }} />
        </div>
      </div>
    </div>
  );
}

function SideCard({
  title,
  subtitle,
  href,
  stats,
  align,
  champKo,
  ddVer,
  accent,
}: {
  title: string;
  subtitle: string;
  href: string;
  stats: SideStats;
  align: "left" | "right";
  champKo: Record<string, string>;
  ddVer: string;
  accent: string;
}) {
  const alignCls = align === "right" ? "items-end text-right" : "items-start text-left";
  return (
    <div className={`flex flex-col gap-2 ${alignCls}`}>
      <Link href={href} className={`text-lg font-bold ${accent} hover:underline`}>
        {title}
      </Link>
      <p className="text-xs text-zinc-400">{subtitle}</p>
      <div className={`flex gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {stats.mostChamps.map((c) => (
          <div key={c.champion} className="flex flex-col items-center gap-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={championIconUrl(ddVer, c.champion)}
              alt={champKo[c.champion] ?? c.champion}
              title={`${champKo[c.champion] ?? c.champion} ${c.wins}승 ${c.count - c.wins}패`}
              className="h-8 w-8 rounded"
            />
            <span className="text-[10px] text-zinc-500">
              {c.wins}승 {c.count - c.wins}패
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ me?: string; pro?: string }>;
}) {
  const { me: meParam, pro: proParam } = await searchParams;
  const myRiotId = (meParam ?? "").trim();
  const pro: Pro | null = proParam ? getPro(proParam) : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-zinc-100">프로와 비교</h1>
        <p className="text-sm text-zinc-400">
          내 최근 솔로랭크 10게임 평균을 프로게이머의 최근 10게임과 나란히 비교합니다.
        </p>
        <form action="/compare" method="GET" className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            name="me"
            defaultValue={myRiotId}
            placeholder="소환사명#태그 (예: Hide on bush#KR1)"
            className="min-w-64 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-400"
          />
          <select
            name="pro"
            defaultValue={pro ? proSlug(pro) : ""}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-400"
          >
            <option value="" disabled>
              프로 선택
            </option>
            {pros.map((p) => (
              <option key={proSlug(p)} value={proSlug(p)}>
                {p.pro} · {laneLabel(p.lane)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-300"
          >
            비교
          </button>
        </form>
      </section>

      {myRiotId && pro && <CompareResult myRiotId={myRiotId} pro={pro} />}

      {!(myRiotId && pro) && (
        <p className="text-sm text-zinc-500">
          소환사명과 프로를 선택하면 승률·KDA·분당 CS·14분 CS·15분 골드·킬관여를 비교해요.
        </p>
      )}
    </div>
  );
}

async function CompareResult({ myRiotId, pro }: { myRiotId: string; pro: Pro }) {
  const [mine, theirs, champKo, ddVer] = await Promise.all([
    loadSide(myRiotId),
    loadSide(pro.riotId),
    championKoMap(),
    ddragonVersion(),
  ]);

  if ("error" in mine || "error" in theirs) {
    const error = "error" in mine ? mine.error : ("error" in theirs ? theirs.error : "unavailable");
    const who = "error" in mine ? `「${myRiotId}」` : `프로 계정(${pro.riotId})`;
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center text-sm text-zinc-300">
        {who} 조회 실패 — {ERROR_MESSAGE[error]}
      </div>
    );
  }

  const laneMismatch = mine.stats.mainLane && mine.stats.mainLane !== pro.lane;

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
          <SideCard
            title={`${mine.account.gameName}#${mine.account.tagLine}`}
            subtitle={`주 포지션 ${mine.stats.mainLane ? laneLabel(mine.stats.mainLane) : "?"} · 최근 ${mine.stats.games}게임`}
            href={`/summoner/${encodeURIComponent(`${mine.account.gameName}#${mine.account.tagLine}`)}`}
            stats={mine.stats}
            align="left"
            champKo={champKo}
            ddVer={ddVer}
            accent="text-sky-300"
          />
          <span className="pt-1 text-sm font-bold text-zinc-500">VS</span>
          <SideCard
            title={pro.pro}
            subtitle={`${laneLabel(pro.lane)} · ${pro.riotId} · 최근 ${theirs.stats.games}게임`}
            href={`/pro/${proSlug(pro)}`}
            stats={theirs.stats}
            align="right"
            champKo={champKo}
            ddVer={ddVer}
            accent="text-amber-300"
          />
        </div>

        <div className="mt-4 border-t border-zinc-800 pt-2">
          <StatRow label="승률" me={mine.stats.winrate} pro={theirs.stats.winrate} fmt={(v) => `${Math.round(v)}%`} />
          <StatRow label="KDA" me={mine.stats.kda} pro={theirs.stats.kda} fmt={(v) => v.toFixed(2)} />
          <StatRow label="CS/분" me={mine.stats.csPerMin} pro={theirs.stats.csPerMin} fmt={(v) => v.toFixed(1)} />
          <StatRow label="14분 CS" me={mine.stats.cs14} pro={theirs.stats.cs14} fmt={(v) => v.toFixed(0)} />
          <StatRow label="15분 골드" me={mine.stats.gold15} pro={theirs.stats.gold15} fmt={fmtGold} />
          <StatRow label="킬관여" me={mine.stats.kp} pro={theirs.stats.kp} fmt={(v) => `${Math.round(v)}%`} />
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs text-zinc-500">
        <p>
          14분 CS·15분 골드는 타임라인이 확보된 게임 기준 (나 {mine.stats.tlCount}/{mine.stats.games} · {pro.pro}{" "}
          {theirs.stats.tlCount}/{theirs.stats.games}게임). 14분 전에 끝난 게임은 제외돼요.
        </p>
        {laneMismatch && (
          <p className="text-amber-400/80">
            ⚠️ 주 포지션이 서로 달라요 (나 {laneLabel(mine.stats.mainLane)} vs {pro.pro}{" "}
            {laneLabel(pro.lane)}) — CS·골드 지표는 포지션 특성 차이를 감안해서 보세요.
          </p>
        )}
        <p>
          {pro.pro}의 플레이가 궁금하다면{" "}
          <Link href={`/pro/${proSlug(pro)}`} className="text-amber-400 hover:underline">
            아카이브 영상
          </Link>
          에서 실제 장면을 확인해보세요.
        </p>
      </div>
    </section>
  );
}
