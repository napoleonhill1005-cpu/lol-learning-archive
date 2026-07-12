import raw from "@/data/videos.json";

export type Video = {
  id: string;
  youtubeId: string;
  title: string;
  pro: string;
  proKr?: string;
  champion: string;
  championKr?: string;
  lane: string;
  patch: string;
  queue: string;
  result: string;
  kda: string;
  durationMin: number;
  matchId: string;
  tags: string[];
  uploadedAt: string;
};

export const videos: Video[] = raw as Video[];

export function getVideo(id: string): Video | null {
  return videos.find((v) => v.id === id) ?? null;
}

export function thumbUrl(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

export const LANE_LABEL: Record<string, string> = {
  TOP: "탑",
  JUNGLE: "정글",
  MID: "미드",
  ADC: "원딜",
  SUPPORT: "서폿",
};

export function laneLabel(lane: string): string {
  return LANE_LABEL[lane] ?? lane;
}

/** 데이터에서 고유 필터 옵션들을 뽑아낸다 (프로가 늘어나면 자동 반영). */
export function uniqueValues<K extends keyof Video>(key: K): string[] {
  const set = new Set<string>();
  for (const v of videos) {
    const val = v[key];
    if (typeof val === "string" && val) set.add(val);
  }
  return Array.from(set).sort();
}

export function allTags(): string[] {
  const set = new Set<string>();
  for (const v of videos) v.tags.forEach((t) => set.add(t));
  return Array.from(set).sort();
}
