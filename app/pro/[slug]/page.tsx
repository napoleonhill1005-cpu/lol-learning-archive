import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { pros, proSlug, getPro, videosOfPro } from "@/lib/pros";
import { laneLabel, thumbUrl } from "@/lib/videos";

export function generateStaticParams() {
  return pros.map((p) => ({ slug: proSlug(p) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getPro(slug);
  return { title: p ? `${p.pro} — 롤 학습 아카이브` : "프로 없음" };
}

export default async function ProPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getPro(slug);
  if (!p) notFound();

  const list = videosOfPro(p);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/pros" className="text-sm text-amber-400 hover:underline">
        ← 프로 목록
      </Link>

      <header className="flex items-baseline gap-3">
        <h1 className="text-3xl font-bold text-zinc-100">{p.pro}</h1>
        <span className="text-lg text-zinc-500">{p.proEn}</span>
        <span className="rounded bg-zinc-800 px-2 py-0.5 text-sm font-semibold text-amber-400">
          {laneLabel(p.lane)}
        </span>
      </header>
      <p className="text-sm text-zinc-500">
        솔랭 계정: <span className="text-zinc-300">{p.riotId}</span>
        {p.alt.length > 0 && (
          <span className="ml-2">(부계정: {p.alt.join(", ")})</span>
        )}
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-zinc-100">
          아카이브 영상 <span className="text-zinc-500">{list.length}개</span>
        </h2>
        {list.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-700 py-12 text-center text-zinc-500">
            아직 이 프로의 영상이 없습니다. 수집·렌더 파이프라인이 채우는 중.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((v) => (
              <Link
                key={v.id}
                href={`/video/${v.id}`}
                className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition-colors hover:border-amber-400"
              >
                <div className="relative aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbUrl(v.youtubeId)}
                    alt={v.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <h3 className="truncate font-semibold text-zinc-100 group-hover:text-amber-300">
                    {v.title}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    패치 {v.patch} · {v.result} · KDA {v.kda}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
