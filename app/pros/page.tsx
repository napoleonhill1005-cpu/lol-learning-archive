import Link from "next/link";
import type { Metadata } from "next";
import { pros, proSlug, videosOfPro } from "@/lib/pros";
import { laneLabel } from "@/lib/videos";

export const metadata: Metadata = {
  title: "프로 목록 — 롤 학습 아카이브",
};

const LANE_ORDER = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

export default function ProsPage() {
  const sorted = [...pros].sort(
    (a, b) => LANE_ORDER.indexOf(a.lane) - LANE_ORDER.indexOf(b.lane),
  );

  return (
    <div className="flex flex-col gap-5">
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
    </div>
  );
}
