/**
 * 고수 계정 분류 휴리스틱 (순수 함수 — 스카우트 스크립트와 공용).
 *
 * 3종 추적 대상:
 * - otp        장인: 최근 게임의 한 챔피언 비율이 압도적
 * - pro-smurf  프로 부캐 의심: 낮은 계정 레벨 + 마스터급 + 고승률 (프로 매핑은 수동 확정)
 * - booster    대리 의심: 다챔 고승률 (비정상적 승률의 비장인 계정)
 */
export type ExpertCategory = "otp" | "pro-smurf" | "booster";

export type ScanStats = {
  games: number; // 표본 게임 수
  winrate: number; // 0~100
  topChampion: string; // 최다 픽 챔피언 (영문)
  topShare: number; // 최다 픽 비율 0~100
  summonerLevel: number;
  tier: string; // CHALLENGER | GRANDMASTER | MASTER | ...
};

export const OTP_MIN_SHARE = 60;
export const OTP_MIN_GAMES = 15;
export const SMURF_MAX_LEVEL = 200;
export const SMURF_MIN_WINRATE = 60;
export const BOOSTER_MIN_WINRATE = 66;
export const BOOSTER_MIN_GAMES = 25;

const HIGH_TIERS = new Set(["CHALLENGER", "GRANDMASTER", "MASTER"]);

/** 해당하는 카테고리 전부 반환 (중복 가능 — 표시 시 primary는 첫 번째) */
export function classify(s: ScanStats): ExpertCategory[] {
  const out: ExpertCategory[] = [];
  if (!HIGH_TIERS.has(s.tier)) return out;

  if (s.games >= OTP_MIN_GAMES && s.topShare >= OTP_MIN_SHARE) out.push("otp");
  if (s.summonerLevel > 0 && s.summonerLevel < SMURF_MAX_LEVEL && s.winrate >= SMURF_MIN_WINRATE)
    out.push("pro-smurf");
  // 장인이 아닌데(챔프폭 넓음) 승률이 비정상적으로 높으면 대리 의심
  if (s.games >= BOOSTER_MIN_GAMES && s.winrate >= BOOSTER_MIN_WINRATE && s.topShare < OTP_MIN_SHARE)
    out.push("booster");

  return out;
}
