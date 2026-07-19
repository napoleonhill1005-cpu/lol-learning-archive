"use client";

import { useMemo, useState } from "react";
import {
  type VideoScenes,
  TAG_STYLE,
  DEFAULT_TAG_STYLE,
  fmtGameTime,
} from "@/lib/scenes";
import {
  segmentPhases,
  phaseOf,
  PHASE_META,
  type PhaseType,
} from "@/lib/phases";

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
  const [phaseFilter, setPhaseFilter] = useState<PhaseType | null>(null);

  const src =
    startSec === null
      ? `https://www.youtube.com/embed/${youtubeId}`
      : `https://www.youtube.com/embed/${youtubeId}?start=${startSec}&autoplay=1`;

  const phases = useMemo(() => (vs ? segmentPhases(vs) : []), [vs]);

  // 영상에 담긴 게임 시간축: videoStartGameTimeMs ~ gameDurationMs.
  // 마커/구간 위치와 점프 계산 모두 이 축 기준 (부분 녹화 영상에서도 일치).
  const axisStart = vs?.videoStartGameTimeMs ?? 0;
  const axisLen = vs ? Math.max(1, vs.gameDurationMs - axisStart) : 1;
  const pos = (gameTimeMs: number) =>
    ((gameTimeMs - axisStart) / axisLen) * 100;

  const tags = useMemo(() => {
    if (!vs) return [];
    const count = new Map<string, number>();
    for (const s of vs.scenes)
      count.set(s.tagType, (count.get(s.tagType) ?? 0) + 1);
    return Array.from(count.entries());
  }, [vs]);

  const visible = useMemo(() => {
    if (!vs) return [];
    let list = vs.scenes;
    if (phaseFilter) list = list.filter((s) => phaseOf(phases, s) === phaseFilter);
    if (tagFilter) list = list.filter((s) => s.tagType === tagFilter);
    return list;
  }, [vs, tagFilter, phaseFilter, phases]);

  const phaseCounts = useMemo(() => {
    const c: Record<PhaseType, number> = { laning: 0, macro: 0, fight: 0 };
    for (const p of phases) c[p.type] += 1;
    return c;
  }, [phases]);

  function jump(gameTimeMs: number) {
    if (!vs) return;
    const sec = Math.max(0, Math.floor((gameTimeMs - vs.videoStartGameTimeMs) / 1000));
    setStartSec(sec);
  }

  /** 현재 재생 지점 이후의 다음 해당 타입 구간으로 점프 (없으면 첫 구간) */
  function jumpNextPhase(type: PhaseType) {
    if (!vs) return;
    const nowMs =
      startSec === null ? axisStart : startSec * 1000 + vs.videoStartGameTimeMs;
    const candidates = phases.filter((p) => p.type === type);
    const next =
      candidates.find((p) => p.startMs > nowMs + 1000) ?? candidates[0];
    if (next) jump(next.startMs);
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

          {/* 구간 보기: 라인전 / 운영 / 한타 */}
          {phases.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-zinc-500">구간 보기</span>
              {(Object.keys(PHASE_META) as PhaseType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => jumpNextPhase(t)}
                  onDoubleClick={() =>
                    setPhaseFilter(phaseFilter === t ? null : t)
                  }
                  title={`클릭: 다음 ${PHASE_META[t].label} 구간 재생 / 더블클릭: 씬 목록 필터`}
                  className={`rounded-full px-2.5 py-0.5 text-xs transition-opacity ${PHASE_META[t].pill} ${
                    phaseFilter && phaseFilter !== t ? "opacity-40" : ""
                  }`}
                >
                  {PHASE_META[t].label}
                  {t === "laning"
                    ? ` ~${fmtGameTime(Math.min(15 * 60_000, vs.gameDurationMs))}`
                    : ` ${phaseCounts[t]}`}
                  {t !== "laning" && " ▶"}
                </button>
              ))}
              {phaseFilter && (
                <button
                  onClick={() => setPhaseFilter(null)}
                  className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  필터 해제 ✕
                </button>
              )}
            </div>
          )}

          {/* 구간 바 + 씬 마커 (영상에 담긴 게임 시간축 기준) */}
          <div className="flex flex-col gap-1">
            <div className="relative h-2.5 w-full overflow-hidden rounded bg-zinc-800">
              {phases.map((p, i) => (
                <button
                  key={i}
                  onClick={() => jump(p.startMs)}
                  title={`${PHASE_META[p.type].label} ${fmtGameTime(p.startMs)}–${fmtGameTime(p.endMs)}${p.events ? ` · 전투 ${p.events}건` : ""}`}
                  className={`absolute top-0 h-full ${PHASE_META[p.type].bar} transition-opacity hover:opacity-100 ${
                    phaseFilter && phaseFilter !== p.type
                      ? "opacity-30"
                      : "opacity-80"
                  }`}
                  style={{
                    left: `${Math.max(0, pos(p.startMs))}%`,
                    width: `${Math.max(0.5, pos(p.endMs) - Math.max(0, pos(p.startMs)))}%`,
                  }}
                />
              ))}
            </div>
            <div className="relative h-6 w-full rounded bg-zinc-800">
              {vs.scenes.map((s, i) => (
                <button
                  key={i}
                  onClick={() => jump(s.gameTimeMs)}
                  title={`${fmtGameTime(s.gameTimeMs)} ${s.tagType} — ${s.detail}`}
                  className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${style(s.tagType).dot} opacity-80 transition-transform hover:scale-150 hover:opacity-100`}
                  style={{ left: `${pos(s.gameTimeMs)}%` }}
                />
              ))}
            </div>
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
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${PHASE_META[phaseOf(phases, s)].pill}`}
                  >
                    {PHASE_META[phaseOf(phases, s)].label}
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
