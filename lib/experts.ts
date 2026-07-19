import raw from "@/data/experts.json";
import type { ExpertCategory } from "@/lib/expert-classify";

/**
 * 고수 풀 — 프로 외 추적 계정 3종 (장인 / 프로 부캐 / 대리 의심).
 * `scripts/scout-experts.ts`가 후보(candidate)를 적재하고, 사람이 확인하면 confirmed로 승격.
 */
export type Expert = {
  riotId: string; // 이름#태그
  category: ExpertCategory;
  label: string; // 표시명 (예: "암베사 장인", "제우스 부캐 의심")
  champion?: string; // otp: 주챔 (영문)
  championKr?: string;
  lane?: string;
  linkedPro?: string; // pro-smurf: pros.json의 pro(한글명)와 연결 (수동 확정)
  status: "candidate" | "confirmed";
  evidence?: {
    games: number;
    winrate: number;
    topShare: number;
    tier: string;
    level: number;
  };
  note?: string;
  addedAt: string; // YYYY-MM-DD
};

export const experts = raw as Expert[];

export const EXPERT_CATEGORY_META: Record<
  ExpertCategory,
  { label: string; pill: string; desc: string }
> = {
  otp: {
    label: "장인",
    pill: "bg-emerald-400/20 text-emerald-300",
    desc: "한 챔피언 비율 60%+ 고티어",
  },
  "pro-smurf": {
    label: "프로 부캐",
    pill: "bg-amber-400/20 text-amber-300",
    desc: "저레벨 계정 + 마스터급 고승률 (프로 연결은 수동 확정)",
  },
  booster: {
    label: "대리 의심",
    pill: "bg-red-400/20 text-red-300",
    desc: "다챔 고승률 — 플레이 참고용",
  },
};

export function expertsByCategory(): Record<ExpertCategory, Expert[]> {
  const out: Record<ExpertCategory, Expert[]> = {
    otp: [],
    "pro-smurf": [],
    booster: [],
  };
  for (const e of experts) out[e.category]?.push(e);
  return out;
}

/** 챔피언으로 장인 찾기 (비교·추천용) */
export function otpsOfChampion(champion: string): Expert[] {
  const c = champion.toLowerCase();
  return experts.filter(
    (e) =>
      e.category === "otp" &&
      (e.champion?.toLowerCase() === c || e.championKr === champion),
  );
}
