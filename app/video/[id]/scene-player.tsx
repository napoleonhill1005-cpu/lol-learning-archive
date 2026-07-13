"use client";

import { useMemo, useState } from "react";
import {
  type VideoScenes,
  TAG_STYLE,
  DEFAULT_TAG_STYLE,
  fmtGameTime,
} from "@/lib/scenes";

function style(tag: string) {
  return TAG_STYLE[tag] ?? DEFAULT_TAG_STYLE;
}

export default function ScenePlayer({
  youtubeId,
  title,
  vs,
}: {
  youtubeId: string;
  title: string;
  vs: VideoScenes | null;
}) {
  // 씬 클릭 시 해당 초부터 자동재생하도록 iframe 을 다시 로드한다.
  const [startSec, setStartSec] = useState<number | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const src =
    startSec === null
      ? `https://www.youtube.com/embed/${youtubeId}`
      : `https://www.youtube.com/embed/${youtubeId}?start=${startSec}&autoplay=1`;

  const tags = useMemo(() => {
    if (!vs) return [];
    const count = new Map<string, number>();
    for (const s of vs.scenes)
      count.set(s.tagType, (count.get(s.tagType) ?? 0) + 1);
    return Array.from(count.entries());
  }, [vs]);

  const visible = useMemo(() => {
    if (!vs) return [];
    return tagFilter
      ? vs.scenes.filter((s) => s.tagType === tagFilter)
      : vs.scenes;
  }, [vs, tagFilter]);

  function jump(gameTimeMs: number) {
    if (!vs) return;
    const sec = Math.max(
      0,
      Math.floor((gameTimeMs - vs.videoStartGameTimeMs) / 1000),
    );
    setStartSec(sec);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-zinc-800">
        <iframe
          key={src}
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>

      {vs && vs.scenes.length > 0 && (
        <section className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold text-zinc-100">
              장면 타임라인{" "}
              <span className="text-sm font-normal text-zinc-500">
                자동 태그 {vs.scenes.length}개 · 클릭하면 해당 구간부터 재생
              </span>
            </h2>
            <span className="text-xs text-zinc-500">
              게임 길이 {fmtGameTime(vs.gameDurationMs)}
            </span>
          </div>

          {/* 타임라인 바: 게임 시간축 위 씬 마커 */}
          <div className="relative h-6 w-full rounded bg-zinc-800">
            {vs.scenes.map((s, i) => (
              <button
                key={i}
                onClick={() => jump(s.gameTimeMs)}
                title={`${fmtGameTime(s.gameTimeMs)} ${s.tagType} — ${s.detail}`}
                className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${style(s.tagType).dot} opacity-80 transition-transform hover:scale-150 hover:opacity-100`}
                style={{
                  left: `${(s.gameTimeMs / vs.gameDurationMs) * 100}%`,
                }}
              />
            ))}
          </div>

          {/* 태그 필터 */}
          <div className="flex flex-wrap gap-1.5">
            {tags.map(([tag, n]) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                className={`rounded-full px-2.5 py-0.5 text-xs transition-opacity ${style(tag).pill} ${
                  tagFilter && tagFilter !== tag ? "opacity-40" : ""
                }`}
              >
                {tag} {n}
              </button>
            ))}
          </div>

          {/* 씬 목록 */}
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
            {visible.map((s, i) => (
              <li key={i}>
                <button
                  onClick={() => jump(s.gameTimeMs)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-zinc-800"
                >
                  <span className="w-12 shrink-0 font-mono text-xs text-zinc-500">
                    {fmtGameTime(s.gameTimeMs)}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${style(s.tagType).pill}`}
                  >
                    {s.tagType}
                  </span>
                  <span className="truncate text-zinc-300">{s.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
