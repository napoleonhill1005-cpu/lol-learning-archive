"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { type Video, thumbUrl, laneLabel, LANE_LABEL } from "@/lib/videos";
import { matchPros, proSlug } from "@/lib/pros";

const LANES = Object.keys(LANE_LABEL); // TOP/JUNGLE/MID/ADC/SUPPORT

function unique(videos: Video[], pick: (v: Video) => string): string[] {
  const set = new Set<string>();
  for (const v of videos) {
    const val = pick(v);
    if (val) set.add(val);
  }
  return Array.from(set).sort();
}

export default function Gallery({
  videos,
  initialTag,
}: {
  videos: Video[];
  initialTag: string | null;
}) {
  const [query, setQuery] = useState("");
  const [lane, setLane] = useState<string | null>(null);
  const [champion, setChampion] = useState("");
  const [pro, setPro] = useState("");
  const [patch, setPatch] = useState("");
  const [tags, setTags] = useState<string[]>(initialTag ? [initialTag] : []);

  const champions = useMemo(
    () => unique(videos, (v) => v.championKr ?? v.champion),
    [videos],
  );
  const pros = useMemo(() => unique(videos, (v) => v.proKr ?? v.pro), [videos]);
  const patches = useMemo(() => unique(videos, (v) => v.patch), [videos]);
  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    for (const v of videos) v.tags.forEach((t) => set.add(t));
    // URL로 들어온 태그가 데이터에 없어도 pill로 보여서 해제 가능하게
    tags.forEach((t) => set.add(t));
    return Array.from(set).sort();
  }, [videos, tags]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return videos.filter((v) => {
      if (q) {
        const hay = [v.title, v.pro, v.proKr, v.champion, v.championKr]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (lane && v.lane !== lane) return false;
      if (champion && (v.championKr ?? v.champion) !== champion) return false;
      if (pro && (v.proKr ?? v.pro) !== pro) return false;
      if (patch && v.patch !== patch) return false;
      if (tags.length && !tags.every((t) => v.tags.includes(t))) return false;
      return true;
    });
  }, [videos, query, lane, champion, pro, patch, tags]);

  const hasFilter =
    query || lane || champion || pro || patch || tags.length > 0;

  function reset() {
    setQuery("");
    setLane(null);
    setChampion("");
    setPro("");
    setPatch("");
    setTags([]);
  }

  function toggleTag(t: string) {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  const selectCls =
    "rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-amber-400 focus:outline-none";

  return (
    <div className="flex flex-col gap-4">
      {/* 검색창 */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="제목 · 프로 · 챔피언 검색 (한글/영문)"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
      />

      {/* 검색어가 프로 이름에 걸리면 프로 페이지 바로가기 */}
      {query.trim() && matchPros(query).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-zinc-500">프로 페이지:</span>
          {matchPros(query).map((p) => (
            <Link
              key={p.proEn}
              href={`/pro/${proSlug(p)}`}
              className="rounded-full border border-amber-400/50 px-3 py-1 text-amber-300 transition-colors hover:bg-amber-400 hover:text-zinc-950"
            >
              {p.pro} ({laneLabel(p.lane)}) →
            </Link>
          ))}
        </div>
      )}

      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-2">
        {LANES.map((l) => (
          <button
            key={l}
            onClick={() => setLane(lane === l ? null : l)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              lane === l
                ? "bg-amber-400 font-semibold text-zinc-950"
                : "border border-zinc-700 text-zinc-300 hover:border-amber-400"
            }`}
          >
            {laneLabel(l)}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-zinc-700 sm:inline-block" />
        <select
          value={champion}
          onChange={(e) => setChampion(e.target.value)}
          className={selectCls}
        >
          <option value="">챔피언 전체</option>
          {champions.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={pro}
          onChange={(e) => setPro(e.target.value)}
          className={selectCls}
        >
          <option value="">프로 전체</option>
          {pros.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          value={patch}
          onChange={(e) => setPatch(e.target.value)}
          className={selectCls}
        >
          <option value="">패치 전체</option>
          {patches.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* 태그 pill */}
      {tagOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tagOptions.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                tags.includes(t)
                  ? "bg-amber-400 font-semibold text-zinc-950"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* 결과 개수 / 초기화 */}
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>{filtered.length}개 영상</span>
        {hasFilter && (
          <button onClick={reset} className="text-amber-400 hover:underline">
            필터 초기화
          </button>
        )}
      </div>

      {/* 카드 그리드 */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 py-16 text-center text-zinc-500">
          조건에 맞는 영상이 없습니다. 필터를 초기화해 보세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v) => (
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
                <span className="absolute left-2 top-2 rounded bg-zinc-950/80 px-1.5 py-0.5 text-xs font-semibold text-amber-400">
                  {laneLabel(v.lane)}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-3">
                <h2 className="truncate font-semibold text-zinc-100 group-hover:text-amber-300">
                  {v.title}
                </h2>
                <p className="text-sm text-zinc-400">
                  {v.proKr ?? v.pro} · {v.championKr ?? v.champion}
                </p>
                <p className="text-xs text-zinc-500">
                  패치 {v.patch} · {v.result} · KDA {v.kda}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
