import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getVideo, videos, laneLabel } from "@/lib/videos";

export function generateStaticParams() {
  return videos.map((v) => ({ id: v.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const video = getVideo(id);
  return { title: video ? `${video.title} — 롤 학습 아카이브` : "영상 없음" };
}

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const video = getVideo(id);
  if (!video) notFound();

  const meta: [string, string][] = [
    ["프로", `${video.proKr ?? video.pro} (${video.pro})`],
    ["챔피언", `${video.championKr ?? video.champion} (${video.champion})`],
    ["라인", laneLabel(video.lane)],
    ["패치", video.patch],
    ["큐", video.queue],
    ["결과", video.result],
    ["KDA", video.kda],
    ["길이", `${video.durationMin}분`],
    ["매치", video.matchId],
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <Link href="/" className="text-sm text-amber-400 hover:underline">
        ← 목록으로
      </Link>

      <div className="aspect-video w-full overflow-hidden rounded-lg border border-zinc-800">
        <iframe
          src={`https://www.youtube.com/embed/${video.youtubeId}`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>

      <h1 className="text-2xl font-bold text-zinc-100">{video.title}</h1>

      <dl className="flex flex-wrap gap-2">
        {meta.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-sm"
          >
            <dt className="text-zinc-500">{label}</dt>
            <dd className="font-medium text-zinc-200">{value}</dd>
          </div>
        ))}
      </dl>

      {video.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {video.tags.map((t) => (
            <Link
              key={t}
              href={`/?tag=${encodeURIComponent(t)}`}
              className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300 transition-colors hover:bg-amber-400 hover:text-zinc-950"
            >
              #{t}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
