import { videos, type Video } from "@/lib/videos";

/** 유저 게임(챔피언/라인)에 맞는 프로 영상 추천: 같은 챔피언 우선, 그다음 같은 라인. */
export function recommendFor(champion: string, lane: string): Video[] {
  const sameChamp = videos.filter((v) => v.champion === champion);
  const sameLane = videos.filter((v) => v.lane === lane && v.champion !== champion);
  return [...sameChamp, ...sameLane];
}
