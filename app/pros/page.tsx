import Link from "next/link";
import type { Metadata } from "next";
import { pros, proSlug, videosOfPro } from "@/lib/pros";
import { laneLabel } from "@/lib/videos";
import { expertsByCategory, EXPERT_CATEGORY_META, type Expert } from "@/lib/experts";
import type { ExpertCategory } from "@/lib/expert-classify";

export const metadata: Metadata = {
  title: "프로·고수 목록 — 롤 학습 아카이브",
};

const LANE_ORDER = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const CATEGORY_ORDER: ExpertCategory[] = ["otp", "pro-smurf", "booster"];

function ExpertCard({ e }: { e: Expert }) {
  const meta = EXPERT_CATEGORY_META[e.category];
  return (
    <Link
      href={`/summoner/${encodeURIComponent(e.riotId)}`}
      className="group flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-amber-400"
    >
      <div>
        <div className="font-semibold text-zinc-100 group-hover:text-amber-300">
          {e.label}
          {e.status === "candidate" && (
            <span className="ml-1.5 text-xs font-normal text-zinc-500">
              후보
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">{e.riotId}</div>
        {e.evidence && (
          <div className="mt-0.5 text-xs text-zinc-500">
            {e.evidence.tier} · 승률 {e.evidence.winrate}%
            {e.category === "otp" && ` · 픽률 ${e.evidence.topShare}%`}
            {e.category === "pro-smurf" && ` · Lv.${e.evidence.level}`}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`rounded-full px-2 py-0.5 text-xs ${meta.pill}`}>
          {meta.label}
        </span>
        {e.lane && (
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-semibold text-amber-400">
            {laneLabel(e.lane)}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function ProsPage() {
  const sorted = [...pros].sort(
    (a, b) => LANE_ORDER.indexOf(a.lane) - LANE_ORDER.indexOf(b.lane),
  );
  const byCat = expertsByCategory();
  const expertTotal = CATEGORY_ORDER.reduce((n, c) => n + byCat[c].length, 0);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-5">
        <h1 className="text-2xl font-bold text-zinc-100">
          추적 중인 프로 <span className="text-zinc-500">{pros.length}명</span>
        </h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p) => {
            const count = videosOfPro(p).length;
            return (
              <Link
                key={p.proEn}
                href={`/pro/${proSlug(p)}`}
                className="group flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-amber-400"
              >
                <div>
                  <div className="font-semibold text-zinc-100 group-hover:text-amber-300">
                    {p.pro}{" "}
                    <span className="text-sm font-normal text-zinc-500">
                      {p.proEn}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">{p.riotId}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-semibold text-amber-400">
                    {laneLabel(p.lane)}
                  </span>
                  <span className="text-xs text-zinc-500">영상 {count}개</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">
            고수 풀 <span className="text-zinc-500">{expertTotal}명</span>
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            프로 외 추적 대상 — 장인·프로 부캐·대리 의심 고승률 계정. 래더
            스캔(<code className="text-zinc-400">npm run scout</code>)으로
            후보를 적재하고 검토 후 확정합니다.
          </p>
        </div>
        {expertTotal === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">
            아직 등록된 고수가 없어요. <code>RIOT_API_KEY=... npm run scout</code>
            로 챌린저 래더를 스캔하면 장인/부캐/대리 의심 후보가 자동
            적재됩니다.
          </p>
        ) : (
          CATEGORY_ORDER.filter((c) => byCat[c].length > 0).map((c) => (
            <div key={c} className="flex flex-col gap-3">
              <h3 className="flex items-baseline gap-2 font-semibold text-zinc-200">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${EXPERT_CATEGORY_META[c].pill}`}
                >
                  {EXPERT_CATEGORY_META[c].label} {byCat[c].length}
                </span>
                <span className="text-xs font-normal text-zinc-500">
                  {EXPERT_CATEGORY_META[c].desc}
                </span>
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {byCat[c].map((e) => (
                  <ExpertCard key={e.riotId} e={e} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
