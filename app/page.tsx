import { videos } from "@/lib/videos";
import Gallery from "./gallery";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  return <Gallery videos={videos} initialTag={tag ?? null} />;
}
