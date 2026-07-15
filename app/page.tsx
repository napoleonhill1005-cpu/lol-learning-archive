import { videos } from "@/lib/videos";
import Gallery from "./gallery";
import SearchBox from "./search-box";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 px-6 py-10 text-center">
        <h1 className="text-2xl font-bold text-zinc-100 sm:text-3xl">
          내 게임을 <span className="text-amber-400">프로와 비교</span>하며 배우기
        </h1>
        <p className="text-sm text-zinc-400">
          Riot ID로 전적을 검색하면 게임마다 같은 챔피언·라인의 프로 리플레이 영상을 추천해드려요
        </p>
        <SearchBox large />
      </section>
      <Gallery videos={videos} initialTag={tag ?? null} />
    </div>
  );
}
