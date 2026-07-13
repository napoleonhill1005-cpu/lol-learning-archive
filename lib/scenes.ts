import raw from "@/data/scenes.json";

export type Scene = {
  tagType: string;
  gameTimeMs: number;
  startMs: number;
  endMs: number;
  source: "api-auto" | "manual" | "cv";
  detail: string;
};

export type VideoScenes = {
  matchId: string;
  gameDurationMs: number;
  /** 녹화 시작 시점의 게임 시간(ms). 풀게임 녹화면 0. 영상 점프 = (gameTimeMs - 이 값) */
  videoStartGameTimeMs: number;
  scenes: Scene[];
};

const data = raw as Record<string, VideoScenes>;

export function getScenes(videoId: string): VideoScenes | null {
  return data[videoId] ?? null;
}

/** 태그별 색 (마커·pill 공용, tailwind 클래스) */
export const TAG_STYLE: Record<string, { dot: string; pill: string }> = {
  킬: { dot: "bg-amber-400", pill: "bg-amber-400/20 text-amber-300" },
  데스: { dot: "bg-red-500", pill: "bg-red-500/20 text-red-400" },
  어시스트: { dot: "bg-sky-400", pill: "bg-sky-400/20 text-sky-300" },
  오브젝트: { dot: "bg-purple-400", pill: "bg-purple-400/20 text-purple-300" },
  귀환: { dot: "bg-emerald-400", pill: "bg-emerald-400/20 text-emerald-300" },
  레벨업: { dot: "bg-zinc-400", pill: "bg-zinc-500/20 text-zinc-300" },
};

export const DEFAULT_TAG_STYLE = {
  dot: "bg-zinc-400",
  pill: "bg-zinc-500/20 text-zinc-300",
};

export function fmtGameTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
