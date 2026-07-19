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
