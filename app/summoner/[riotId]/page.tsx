import Link from "next/link";
import type { Metadata } from "next";
import {
  getAccount,
  getRank,
  getRecentGames,
  getTimelineAnalysis,
  type GameSummary,
  type ParticipantDetail,
  type Rank,
  type RiotError,
  type TimelineAnalysis,
} from "@/lib/riot";
import { ERROR_MESSAGE, laneOpponent } from "@/lib/riot-ui";
import {
  championKoMap,
  championIconUrl,
  ddragonVersion,
  itemIconUrl,
  spellIconMap,
  spellIconUrl,
  runeIconMaps,
  runeIconUrl,
  type RuneIconMaps,
} from "@/lib/ddragon";
import { aiScores, type ScoreEntry } from "@/lib/score";
import { recommendFor } from "@/lib/recommend";
import { laneLabel } from "@/lib/videos";
import { resolveProByName } from "@/lib/pros";
import { redirect } from "next/navigation";
import SearchBox from "../../search-box";
import { RecordVisit, FavoriteButton } from "./visit-tools";
import TierGraph from "./tier-graph";
import { getTierHistory, saveTierSnapshot, tierStoreConfigured } from "@/lib/tier-store";

export const dynamic = "force-dynamic";

const TIER_KO: Record<string, string> = {
  IRON: "아이언",
  BRONZE: "브론즈",
  SILVER: "실버",
  GOLD: "골드",
  PLATINUM: "플래티넘",
  EMERALD: "에메랄드",
  DIAMOND: "다이아몬드",
  MASTER: "마스터",
  GRANDMASTER: "그랜드마스터",
  CHALLENGER: "챌린저",
};

const TIER_COLOR: Record<string, string> = {
  IRON: "text-zinc-400",
  BRONZE: "text-orange-400",
  SILVER: "text-zinc-300",
  GOLD: "text-yellow-400",
  PLATINUM: "text-teal-300",
  EMERALD: "text-emerald-400",
  DIAMOND: "text-sky-300",
  MASTER: "text-purple-400",
  GRANDMASTER: "text-red-400",
  CHALLENGER: "text-amber-300",
};

const DIVISION_NUM: Record<string, string> = { I: "1", II: "2", III: "3", IV: "4" };

const SKILL_KEY: Record<number, string> = { 1: "Q", 2: "W", 3: "E", 4: "R" };
const SKILL_COLOR: Record<number, string> = {
  1: "text-amber-300",
  2: "text-sky-300",
  3: "text-emerald-300",
  4: "text-red-400",
};

type IconContext = {
  champKo: Record<string, string>;
  ddVer: string;
  spells: Record<number, string>;
  runes: RuneIconMaps;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ riotId: string }>;
}): Promise<Metadata> {
  const { riotId } = await params;
  return { title: `${decodeURIComponent(riotId)} 전적 — 롤 학습 아카이브` };
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-16 text-center">
      <p className="text-zinc-300">{message}</p>
      <SearchBox />
      <Link href="/" className="text-sm text-amber-400 hover:underline">
        ← 홈으로
      </Link>
    </div>
  );
}

export default async function SummonerPage({
  params,
}: {
  params: Promise<{ riotId: string }>;
}) {
  const { riotId } = await params;
  const decoded = decodeURIComponent(riotId);
  const hash = decoded.lastIndexOf("#");
  if (hash <= 0 || hash === decoded.length - 1) {
    // 태그 없는 검색어는 프로 이름(활동명/영문/본명)으로 시도 — 걸리면 그 계정으로
    const pro = resolveProByName(decoded);
    if (pro) redirect(`/summoner/${encodeURIComponent(pro.riotId)}`);
    return (
      <ErrorBox message="이름#태그 형식으로 검색해주세요. 프로게이머는 이름만으로도 검색돼요 (예: 페이커, 이상혁, Faker)." />
    );
  }
  const gameName = decoded.slice(0, hash).trim();
  const tagLine = decoded.slice(hash + 1).trim();

  const account = await getAccount(gameName, tagLine);
  if (!account.ok) return <ErrorBox message={ERROR_MESSAGE[account.error]} />;

  const [games, rank, champKo, ddVer, spells, runes] = await Promise.all([
    getRecentGames(account.data.puuid),
    getRank(account.data.puuid),
    championKoMap(),
    ddragonVersion(),
    spellIconMap(),
    runeIconMaps(),
  ]);
  if (!games.ok) return <ErrorBox message={ERROR_MESSAGE[games.error]} />;

  // 타임라인(스킬/아이템 빌드, 시간대별 라인전)도 병렬로 — 불변 데이터라 강캐시.
  // 티어 스냅샷은 검색될 때마다 오늘 1행 적립(같은 날 재검색은 갱신) 후 이력을 읽는다 —
  // 랭크 조회를 재사용하므로 추가 Riot 호출은 없고, 타임라인이 더 오래 걸려 지연도 없다.
  const [analyses, tierHistory] = await Promise.all([
    Promise.all(
      games.data.map((g) =>
        getTimelineAnalysis(g.matchId, g.me.puuid, laneOpponent(g)?.puuid ?? null),
      ),
    ),
    (async () => {
      if (!tierStoreConfigured()) return [];
      const id = `${account.data.gameName}#${account.data.tagLine}`;
      if (rank) await saveTierSnapshot(account.data.puuid, id, rank);
      return getTierHistory(account.data.puuid);
    })(),
  ]);

  const ctx: IconContext = { champKo, ddVer, spells, runes };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <RecordVisit id={`${account.data.gameName}#${account.data.tagLine}`} />
      <Link href="/" className="text-sm text-amber-400 hover:underline">
        ← 홈으로
      </Link>

      <ProfileHeader account={account.data} rank={rank} games={games.data} ctx={ctx} />

      <TierGraph history={tierHistory} />

      {games.data.length === 0 ? (
        <p className="py-12 text-center text-zinc-400">최근 솔로랭크 기록이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {games.data.map((g, i) => (
            <GameRow key={g.matchId} game={g} analysis={analyses[i]} ctx={ctx} />
          ))}
        </ul>
      )}

      <p className="text-xs text-zinc-600">
        AI 스코어는 게임 안 10명을 KDA·딜량·킬관여·CS·시야로 상대평가한 자체 점수예요. 게임 옆
        추천은 아카이브에 있는 같은 챔피언·라인 프로 리플레이 영상이에요.
      </p>
    </div>
  );
}

function ProfileHeader({
  account,
  rank,
  games,
  ctx,
}: {
  account: { gameName: string; tagLine: string };
  rank: Rank | null;
  games: GameSummary[];
  ctx: IconContext;
}) {
  const total = games.length;
  const wins = games.filter((g) => g.win).length;
  const kills = games.reduce((s, g) => s + g.kills, 0);
  const deaths = games.reduce((s, g) => s + g.deaths, 0);
  const assists = games.reduce((s, g) => s + g.assists, 0);
  const avgKda = deaths === 0 ? "Perfect" : ((kills + assists) / deaths).toFixed(2);

  const byChamp = new Map<string, { games: number; wins: number }>();
  for (const g of games) {
    const c = byChamp.get(g.champion) ?? { games: 0, wins: 0 };
    c.games += 1;
    if (g.win) c.wins += 1;
    byChamp.set(g.champion, c);
  }
  const most = [...byChamp.entries()].sort((a, b) => b[1].games - a[1].games).slice(0, 3);

  const tierKo = rank ? (TIER_KO[rank.tier] ?? rank.tier) : null;
  const hasDivision = rank && !["MASTER", "GRANDMASTER", "CHALLENGER"].includes(rank.tier);
  const seasonTotal = rank ? rank.wins + rank.losses : 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-bold text-zinc-100">
          {account.gameName}
          <span className="text-zinc-500">#{account.tagLine}</span>
        </h1>
        <FavoriteButton id={`${account.gameName}#${account.tagLine}`} />
        {rank ? (
          <span className="text-sm">
            <span className={`font-semibold ${TIER_COLOR[rank.tier] ?? "text-zinc-300"}`}>
              {tierKo}
              {hasDivision ? ` ${DIVISION_NUM[rank.division] ?? rank.division}` : ""}
            </span>
            <span className="text-zinc-400">
              {" "}
              · {rank.lp} LP · 시즌 {rank.wins}승 {rank.losses}패
              {seasonTotal > 0 ? ` (${Math.round((rank.wins / seasonTotal) * 100)}%)` : ""}
            </span>
          </span>
        ) : (
          <span className="text-sm text-zinc-500">언랭크</span>
        )}
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-400">
          <span>
            최근 {total}게임{" "}
            <span className="text-zinc-200">
              {wins}승 {total - wins}패 ({Math.round((wins / total) * 100)}%)
            </span>
          </span>
          <span>
            평균 평점 <span className="text-amber-300">{avgKda}</span>
          </span>
          <span className="flex items-center gap-2">
            {most.map(([champ, stat]) => (
              <span key={champ} className="flex items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={championIconUrl(ctx.ddVer, champ)}
                  alt={ctx.champKo[champ] ?? champ}
                  title={ctx.champKo[champ] ?? champ}
                  className="h-6 w-6 rounded"
                />
                <span className="text-xs">
                  {stat.wins}승 {stat.games - stat.wins}패
                </span>
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

function ScoreChip({ entry }: { entry: ScoreEntry | undefined }) {
  if (!entry) return null;
  const color =
    entry.score >= 70 ? "text-amber-300" : entry.score >= 45 ? "text-sky-300" : "text-zinc-400";
  return (
    <span className="flex items-center gap-1">
      <span className={`text-[11px] font-semibold ${color}`}>AI {entry.score}</span>
      {entry.badge && (
        <span
          className={`rounded px-1 text-[9px] font-bold ${
            entry.badge === "MVP" ? "bg-amber-400 text-zinc-950" : "bg-purple-400 text-zinc-950"
          }`}
        >
          {entry.badge}
        </span>
      )}
    </span>
  );
}

function ItemSlots({
  items,
  ctx,
  slotClass,
}: {
  items: number[];
  ctx: IconContext;
  slotClass: string;
}) {
  return (
    <div className="flex gap-0.5">
      {items.map((id, i) =>
        id > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={itemIconUrl(ctx.ddVer, id)}
            alt=""
            className={`${slotClass} rounded bg-zinc-800`}
          />
        ) : (
          <span key={i} className={`${slotClass} rounded bg-zinc-800/70`} />
        ),
      )}
    </div>
  );
}

function SpellRuneColumn({ p, ctx }: { p: ParticipantDetail; ctx: IconContext }) {
  const keystone = ctx.runes.perk[p.keystoneId];
  const subStyle = ctx.runes.style[p.subStyleId];
  return (
    <div className="flex gap-0.5">
      <div className="flex flex-col gap-0.5">
        {p.spells.map((id, i) =>
          ctx.spells[id] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={spellIconUrl(ctx.ddVer, ctx.spells[id])}
              alt=""
              className="h-[22px] w-[22px] rounded"
            />
          ) : (
            <span key={i} className="h-[22px] w-[22px] rounded bg-zinc-800/70" />
          ),
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        {keystone ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={runeIconUrl(keystone.icon)}
            alt={keystone.name}
            title={keystone.name}
            className="h-[22px] w-[22px] rounded-full bg-zinc-800"
          />
        ) : (
          <span className="h-[22px] w-[22px] rounded-full bg-zinc-800/70" />
        )}
        {subStyle ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={runeIconUrl(subStyle.icon)}
            alt={subStyle.name}
            title={subStyle.name}
            className="h-[22px] w-[22px] p-0.5"
          />
        ) : (
          <span className="h-[22px] w-[22px] rounded-full bg-zinc-800/70" />
        )}
      </div>
    </div>
  );
}

function summonerHref(p: ParticipantDetail): string | null {
  if (!p.name || !p.tag) return null;
  return `/summoner/${encodeURIComponent(`${p.name}#${p.tag}`)}`;
}

function GameRow({
  game,
  analysis,
  ctx,
}: {
  game: GameSummary;
  analysis: TimelineAnalysis | null;
  ctx: IconContext;
}) {
  const recs = recommendFor(game.champion, game.lane).slice(0, 2);
  const champName = ctx.champKo[game.champion] ?? game.champion;
  const ratio =
    game.deaths === 0 ? "Perfect" : ((game.kills + game.assists) / game.deaths).toFixed(2);
  const team100 = game.participants.filter((p) => p.teamId === 100);
  const team200 = game.participants.filter((p) => p.teamId === 200);
  const scores = aiScores(game.participants, game.durationMin);

  return (
    <li
      className={`rounded-lg border border-zinc-800 bg-zinc-900 border-l-4 ${
        game.win ? "border-l-sky-500" : "border-l-red-500"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
        <div className="flex w-20 flex-col gap-0.5">
          <span className={`text-sm font-semibold ${game.win ? "text-sky-400" : "text-red-400"}`}>
            {game.win ? "승리" : "패배"}
          </span>
          <span className="text-xs text-zinc-500">{game.durationMin}분</span>
          <span className="text-xs text-zinc-600" title={`${game.endedAt} · ${game.patch}`}>
            {game.endedRelative}
          </span>
          <ScoreChip entry={scores[game.me.puuid]} />
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={championIconUrl(ctx.ddVer, game.champion)}
              alt={champName}
              className="h-12 w-12 rounded-md"
            />
            <span className="absolute -bottom-1 -right-1 rounded bg-zinc-950/90 px-1 text-[10px] text-zinc-300">
              {game.me.champLevel}
            </span>
          </div>
          <SpellRuneColumn p={game.me} ctx={ctx} />
          <div className="flex min-w-16 flex-col">
            <span className="text-sm font-semibold text-zinc-100">{champName}</span>
            <span className="text-xs text-zinc-500">{laneLabel(game.lane)}</span>
          </div>
        </div>

        <div className="flex min-w-24 flex-col">
          <span className="text-sm font-medium text-zinc-200">
            {game.kills}/<span className="text-red-400">{game.deaths}</span>/{game.assists}
          </span>
          <span className="text-xs text-zinc-500">
            평점 <span className={ratio === "Perfect" ? "text-amber-300" : ""}>{ratio}</span>
          </span>
          <span className="text-xs text-zinc-500">킬관여 {game.killParticipation}%</span>
        </div>

        <div className="flex min-w-20 flex-col">
          <span className="text-xs text-zinc-400">
            CS {game.cs} <span className="text-zinc-500">({game.csPerMin}/분)</span>
          </span>
          <span className="text-xs text-zinc-400">
            시야 {game.visionScore} <span className="text-zinc-500">(와드 {game.controlWards})</span>
          </span>
          <ItemSlots items={game.me.items} ctx={ctx} slotClass="h-[22px] w-[22px]" />
        </div>

        <div className="hidden gap-x-3 lg:grid lg:grid-cols-2">
          {[team100, team200].map((team, ti) => (
            <div key={ti} className="flex flex-col gap-px">
              {team.map((p) => {
                const href = summonerHref(p);
                const isMe = p.puuid === game.me.puuid;
                const label = (
                  <span className="flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={championIconUrl(ctx.ddVer, p.champion)}
                      alt=""
                      className="h-4 w-4 rounded-sm"
                    />
                    <span
                      className={`w-16 truncate text-[11px] ${
                        isMe ? "font-semibold text-amber-300" : "text-zinc-500"
                      }`}
                    >
                      {p.name || "?"}
                    </span>
                  </span>
                );
                return href && !isMe ? (
                  <Link key={p.puuid} href={href} className="hover:text-zinc-200 hover:underline">
                    {label}
                  </Link>
                ) : (
                  <span key={p.puuid}>{label}</span>
                );
              })}
            </div>
          ))}
        </div>

        <div className="ml-auto flex flex-col items-end gap-1.5">
          {recs.length > 0 ? (
            recs.map((v) => (
              <Link
                key={v.id}
                href={`/video/${v.id}`}
                className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-400 hover:text-zinc-950"
              >
                {v.proKr ?? v.pro} {v.championKr ?? v.champion}
                {v.champion === game.champion ? " (같은 챔피언)" : ` (${laneLabel(v.lane)})`} 보기 →
              </Link>
            ))
          ) : (
            <span className="text-xs text-zinc-600">추천 영상 없음</span>
          )}
        </div>
      </div>

      <details className="group border-t border-zinc-800/70">
        <summary className="cursor-pointer list-none px-3 py-1.5 text-center text-xs text-zinc-500 hover:text-amber-300">
          <span className="group-open:hidden">상세 보기 ▾</span>
          <span className="hidden group-open:inline">접기 ▴</span>
        </summary>
        <Scoreboard game={game} scores={scores} ctx={ctx} />
        <AnalysisBlocks game={game} analysis={analysis} ctx={ctx} />
      </details>
    </li>
  );
}

function Scoreboard({
  game,
  scores,
  ctx,
}: {
  game: GameSummary;
  scores: Record<string, ScoreEntry>;
  ctx: IconContext;
}) {
  const maxDamage = Math.max(...game.participants.map((p) => p.damage), 1);
  const teams = [
    { id: 100, label: "블루팀" },
    { id: 200, label: "레드팀" },
  ];

  return (
    <div className="flex flex-col gap-4 px-3 pb-3">
      {teams.map((t) => {
        const members = game.participants.filter((p) => p.teamId === t.id);
        const win = members[0]?.win ?? false;
        return (
          <div key={t.id} className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th className="pb-1 font-normal">
                    <span className={win ? "text-sky-400" : "text-red-400"}>
                      {t.label} · {win ? "승리" : "패배"}
                    </span>
                  </th>
                  <th className="pb-1 font-normal">AI</th>
                  <th className="pb-1 font-normal">KDA</th>
                  <th className="pb-1 font-normal">피해량</th>
                  <th className="pb-1 font-normal">골드</th>
                  <th className="pb-1 font-normal">CS</th>
                  <th className="pb-1 font-normal">시야</th>
                  <th className="pb-1 font-normal">아이템</th>
                </tr>
              </thead>
              <tbody>
                {members.map((p) => {
                  const isMe = p.puuid === game.me.puuid;
                  const href = summonerHref(p);
                  return (
                    <tr key={p.puuid} className={isMe ? "bg-zinc-800/50" : ""}>
                      <td className="py-1 pr-2">
                        <span className="flex items-center gap-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={championIconUrl(ctx.ddVer, p.champion)}
                            alt={ctx.champKo[p.champion] ?? p.champion}
                            title={ctx.champKo[p.champion] ?? p.champion}
                            className="h-5 w-5 rounded-sm"
                          />
                          {href && !isMe ? (
                            <Link
                              href={href}
                              className="max-w-28 truncate text-zinc-400 hover:text-zinc-100 hover:underline"
                            >
                              {p.name || "?"}
                            </Link>
                          ) : (
                            <span
                              className={`max-w-28 truncate ${
                                isMe ? "font-semibold text-amber-300" : "text-zinc-400"
                              }`}
                            >
                              {p.name || "?"}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-1 pr-2">
                        <ScoreChip entry={scores[p.puuid]} />
                      </td>
                      <td className="py-1 pr-2 whitespace-nowrap text-zinc-300">
                        {p.kills}/<span className="text-red-400">{p.deaths}</span>/{p.assists}
                      </td>
                      <td className="py-1 pr-2">
                        <span className="flex items-center gap-1.5">
                          <span className="w-10 text-right text-zinc-400">
                            {p.damage.toLocaleString()}
                          </span>
                          <span className="h-1.5 w-20 overflow-hidden rounded bg-zinc-800">
                            <span
                              className="block h-full rounded bg-red-400/80"
                              style={{ width: `${Math.round((p.damage / maxDamage) * 100)}%` }}
                            />
                          </span>
                        </span>
                      </td>
                      <td className="py-1 pr-2 text-zinc-400">
                        {(p.gold / 1000).toFixed(1)}k
                      </td>
                      <td className="py-1 pr-2 text-zinc-400">{p.cs}</td>
                      <td className="py-1 pr-2 text-zinc-400">{p.visionScore}</td>
                      <td className="py-1">
                        <ItemSlots items={p.items} ctx={ctx} slotClass="h-[18px] w-[18px]" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function AnalysisBlocks({
  game,
  analysis,
  ctx,
}: {
  game: GameSummary;
  analysis: TimelineAnalysis | null;
  ctx: IconContext;
}) {
  const opp = laneOpponent(game);
  const primaryStyle = ctx.runes.style[game.me.primaryStyleId];
  const hasRunes = game.me.primaryPerks.length > 0 && Object.keys(ctx.runes.perk).length > 0;

  return (
    <div className="grid gap-x-8 gap-y-4 border-t border-zinc-800/70 px-3 py-3 sm:grid-cols-2">
      {hasRunes && (
        <section>
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            룬 빌드
          </h3>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <div className="flex flex-col gap-1">
              {primaryStyle && (
                <span className="mb-0.5 text-[11px] text-zinc-500">{primaryStyle.name}</span>
              )}
              {game.me.primaryPerks.map((id, i) => {
                const rune = ctx.runes.perk[id];
                if (!rune) return null;
                return (
                  <span key={i} className="flex items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={runeIconUrl(rune.icon)}
                      alt=""
                      className={i === 0 ? "h-6 w-6 rounded-full bg-zinc-800" : "h-5 w-5"}
                    />
                    <span className={`text-xs ${i === 0 ? "text-zinc-200" : "text-zinc-400"}`}>
                      {rune.name}
                    </span>
                  </span>
                );
              })}
            </div>
            <div className="flex flex-col gap-1">
              {ctx.runes.style[game.me.subStyleId] && (
                <span className="mb-0.5 text-[11px] text-zinc-500">
                  {ctx.runes.style[game.me.subStyleId].name}
                </span>
              )}
              {game.me.subPerks.map((id, i) => {
                const rune = ctx.runes.perk[id];
                if (!rune) return null;
                return (
                  <span key={i} className="flex items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={runeIconUrl(rune.icon)} alt="" className="h-5 w-5" />
                    <span className="text-xs text-zinc-400">{rune.name}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {analysis && analysis.laneDiffs.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            시간대별 라인전{" "}
            {opp && (
              <span className="normal-case text-zinc-600">
                (vs {ctx.champKo[opp.champion] ?? opp.champion})
              </span>
            )}
          </h3>
          <table className="w-full max-w-64 text-xs">
            <thead>
              <tr className="text-zinc-500">
                <th className="text-left font-normal">시점</th>
                <th className="text-right font-normal">골드 차이</th>
                <th className="text-right font-normal">CS 차이</th>
              </tr>
            </thead>
            <tbody>
              {analysis.laneDiffs.map((d) => (
                <tr key={d.minute}>
                  <td className="py-0.5 text-zinc-400">{d.minute}분</td>
                  <td
                    className={`py-0.5 text-right ${
                      d.goldDiff >= 0 ? "text-sky-400" : "text-red-400"
                    }`}
                  >
                    {d.goldDiff >= 0 ? "+" : ""}
                    {d.goldDiff.toLocaleString()}
                  </td>
                  <td
                    className={`py-0.5 text-right ${
                      d.csDiff >= 0 ? "text-sky-400" : "text-red-400"
                    }`}
                  >
                    {d.csDiff >= 0 ? "+" : ""}
                    {d.csDiff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {analysis && analysis.skillOrder.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            스킬 빌드
          </h3>
          <div className="flex flex-wrap gap-0.5">
            {analysis.skillOrder.map((slot, i) => (
              <span
                key={i}
                className="flex h-9 w-6 flex-col items-center justify-center rounded bg-zinc-800"
              >
                <span className="text-[9px] leading-tight text-zinc-500">{i + 1}</span>
                <span
                  className={`text-[11px] font-bold leading-tight ${
                    SKILL_COLOR[slot] ?? "text-zinc-300"
                  }`}
                >
                  {SKILL_KEY[slot] ?? "?"}
                </span>
              </span>
            ))}
          </div>
        </section>
      )}

      {analysis && analysis.itemBuild.length > 0 && (
        <section className="sm:col-span-2">
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            아이템 빌드
          </h3>
          <div className="flex flex-wrap items-start gap-y-2">
            {analysis.itemBuild.map((step, i) => (
              <span key={i} className="flex items-start">
                <span className="flex flex-col items-center gap-0.5">
                  <span className="flex flex-wrap gap-0.5">
                    {step.items.map((id, j) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={j}
                        src={itemIconUrl(ctx.ddVer, id)}
                        alt=""
                        className="h-[22px] w-[22px] rounded bg-zinc-800"
                      />
                    ))}
                  </span>
                  <span className="text-[10px] text-zinc-600">{step.minute}분</span>
                </span>
                {i < analysis.itemBuild.length - 1 && (
                  <span className="mx-1 mt-1 text-zinc-700">›</span>
                )}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
