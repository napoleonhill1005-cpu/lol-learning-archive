import Link from "next/link";
import type { Metadata } from "next";
import { getAccount, getRecentGames, type GameSummary, type RiotError } from "@/lib/riot";
import { championKoMap, championIconUrl, ddragonVersion } from "@/lib/ddragon";
import { recommendFor } from "@/lib/recommend";
import { laneLabel } from "@/lib/videos";
import SearchBox from "../../search-box";

export const dynamic = "force-dynamic";

const ERROR_MESSAGE: Record<RiotError, string> = {
  not_found: "소환사를 찾지 못했어요. 이름#태그 오타가 없는지 확인해주세요 (KR 서버만 지원).",
  key_expired: "전적 조회 키가 만료됐어요. 운영자가 갱신할 때까지 잠시만 기다려주세요.",
  rate_limited: "요청이 몰리고 있어요. 잠시 후 다시 시도해주세요.",
  unavailable: "Riot 서버 응답이 없어요. 잠시 후 다시 시도해주세요.",
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
    return <ErrorBox message="주소 형식이 잘못됐어요. 이름#태그로 검색해주세요." />;
  }
  const gameName = decoded.slice(0, hash).trim();
  const tagLine = decoded.slice(hash + 1).trim();

  const account = await getAccount(gameName, tagLine);
  if (!account.ok) return <ErrorBox message={ERROR_MESSAGE[account.error]} />;

  const [games, champKo, ddVer] = await Promise.all([
    getRecentGames(account.data.puuid),
    championKoMap(),
    ddragonVersion(),
  ]);
  if (!games.ok) return <ErrorBox message={ERROR_MESSAGE[games.error]} />;

  const wins = games.data.filter((g) => g.win).length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <Link href="/" className="text-sm text-amber-400 hover:underline">
        ← 홈으로
      </Link>

      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold text-zinc-100">
          {account.data.gameName}
          <span className="text-zinc-500">#{account.data.tagLine}</span>
        </h1>
        {games.data.length > 0 && (
          <span className="text-sm text-zinc-400">
            최근 솔로랭크 {games.data.length}게임 · {wins}승 {games.data.length - wins}패
          </span>
        )}
      </div>

      {games.data.length === 0 ? (
        <p className="py-12 text-center text-zinc-400">최근 솔로랭크 기록이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {games.data.map((g) => (
            <GameRow key={g.matchId} game={g} champKo={champKo} ddVer={ddVer} />
          ))}
        </ul>
      )}

      <p className="text-xs text-zinc-600">
        게임 옆 추천은 아카이브에 있는 같은 챔피언·라인 프로 리플레이 영상이에요. 아카이브가 커질수록
        추천이 늘어나요.
      </p>
    </div>
  );
}

function GameRow({
  game,
  champKo,
  ddVer,
}: {
  game: GameSummary;
  champKo: Record<string, string>;
  ddVer: string;
}) {
  const recs = recommendFor(game.champion, game.lane).slice(0, 2);
  const champName = champKo[game.champion] ?? game.champion;

  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3 border-l-4 ${
        game.win ? "border-l-sky-500" : "border-l-red-500"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={championIconUrl(ddVer, game.champion)}
        alt={champName}
        className="h-12 w-12 rounded-md"
      />
      <div className="flex min-w-28 flex-col">
        <span className="font-semibold text-zinc-100">{champName}</span>
        <span className="text-xs text-zinc-500">
          {laneLabel(game.lane)} · {game.win ? "승리" : "패배"}
        </span>
      </div>
      <div className="flex min-w-24 flex-col">
        <span className="text-sm font-medium text-zinc-200">
          {game.kills}/<span className="text-red-400">{game.deaths}</span>/{game.assists}
        </span>
        <span className="text-xs text-zinc-500">
          CS {game.cs} ({game.csPerMin}/분)
        </span>
      </div>
      <div className="flex min-w-20 flex-col">
        <span className="text-sm text-zinc-300">{game.durationMin}분</span>
        <span className="text-xs text-zinc-500">
          {game.endedAt} · {game.patch}
        </span>
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
    </li>
  );
}
