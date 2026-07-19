// compare · summoner 페이지 공용 헬퍼 (중복 제거 — 2026-07-19 오케스트레이터 #6)
import type { GameSummary, ParticipantDetail, RiotError } from "@/lib/riot";

export const ERROR_MESSAGE: Record<RiotError, string> = {
  not_found: "소환사를 찾지 못했어요. 이름#태그 오타가 없는지 확인해주세요 (KR 서버만 지원).",
  key_expired: "전적 조회 키가 만료됐어요. 운영자가 갱신할 때까지 잠시만 기다려주세요.",
  rate_limited: "요청이 몰리고 있어요. 잠시 후 다시 시도해주세요.",
  unavailable: "Riot 서버 응답이 없어요. 잠시 후 다시 시도해주세요.",
};

/** 같은 포지션의 상대 팀 참가자 (라인전 상대) */
export function laneOpponent(game: GameSummary): ParticipantDetail | undefined {
  if (!game.me.position) return undefined;
  return game.participants.find(
    (p) => p.teamId !== game.me.teamId && p.position === game.me.position,
  );
}
