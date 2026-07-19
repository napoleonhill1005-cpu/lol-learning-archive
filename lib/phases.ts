import type { VideoScenes, Scene } from "@/lib/scenes";

/**
 * 게임을 3종 구간으로 분할한다:
 * - laning: 시작 ~ 15:00 (라인전)
 * - fight:  15분 이후 전투 이벤트(킬/데스/어시스트)가 몰린 구간 (한타·교전)
 * - macro:  15분 이후 전투가 없는 구간 (운영)
 */
export type PhaseType = "laning" | "macro" | "fight";

export type Phase = {
  type: PhaseType;
  startMs: number;
  endMs: number;
  /** fight 구간의 전투 이벤트 수 (라벨용) */
  events?: number;
};

export const LANING_END_MS = 15 * 60_000;

const COMBAT_TAGS = new Set(["킬", "데스", "어시스트"]);
/** 이 간격(ms) 이내로 이어지는 전투 이벤트는 같은 교전으로 묶는다 */
const FIGHT_MERGE_GAP_MS = 60_000;
/** 교전 앞뒤 여유 (진입 무빙·마무리까지 보이게) */
const FIGHT_PAD_BEFORE_MS = 15_000;
const FIGHT_PAD_AFTER_MS = 20_000;
/** 이보다 짧은 운영 구간은 인접 교전에 흡수 (잦은 점프 방지) */
const MIN_MACRO_MS = 30_000;

export function segmentPhases(vs: VideoScenes): Phase[] {
  const duration = vs.gameDurationMs;
  const laningEnd = Math.min(LANING_END_MS, duration);
  const phases: Phase[] = [{ type: "laning", startMs: 0, endMs: laningEnd }];
  if (laningEnd >= duration) return phases;

  // 15분 이후의 전투 이벤트만 교전 클러스터링 대상으로 삼는다.
  // 오브젝트 단독 처치는 전투가 아니므로 제외 (교전과 겹치면 자연히 구간 안에 포함됨).
  const combat = vs.scenes
    .filter((s) => COMBAT_TAGS.has(s.tagType) && s.gameTimeMs >= laningEnd)
    .map((s) => s.gameTimeMs)
    .sort((a, b) => a - b);

  const fights: Phase[] = [];
  for (const t of combat) {
    const last = fights[fights.length - 1];
    if (last && t - (last.endMs - FIGHT_PAD_AFTER_MS) <= FIGHT_MERGE_GAP_MS) {
      last.endMs = Math.min(duration, t + FIGHT_PAD_AFTER_MS);
      last.events = (last.events ?? 0) + 1;
    } else {
      fights.push({
        type: "fight",
        startMs: Math.max(laningEnd, t - FIGHT_PAD_BEFORE_MS),
        endMs: Math.min(duration, t + FIGHT_PAD_AFTER_MS),
        events: 1,
      });
    }
  }

  // 교전 사이의 빈 시간 = 운영 구간. 너무 짧으면 앞 교전에 흡수.
  let cursor = laningEnd;
  for (const f of fights) {
    if (f.startMs - cursor >= MIN_MACRO_MS) {
      phases.push({ type: "macro", startMs: cursor, endMs: f.startMs });
    } else if (phases[phases.length - 1]?.type === "fight") {
      phases[phases.length - 1].endMs = f.startMs;
    }
    phases.push(f);
    cursor = f.endMs;
  }
  if (duration - cursor >= MIN_MACRO_MS) {
    phases.push({ type: "macro", startMs: cursor, endMs: duration });
  } else if (phases[phases.length - 1]) {
    phases[phases.length - 1].endMs = duration;
  }

  return phases;
}

export const PHASE_META: Record<
  PhaseType,
  { label: string; bar: string; pill: string }
> = {
  laning: {
    label: "라인전",
    bar: "bg-sky-500/50",
    pill: "bg-sky-500/20 text-sky-300",
  },
  macro: {
    label: "운영",
    bar: "bg-zinc-600/50",
    pill: "bg-zinc-500/20 text-zinc-300",
  },
  fight: {
    label: "한타",
    bar: "bg-red-500/60",
    pill: "bg-red-500/20 text-red-300",
  },
};

/** 특정 장면이 속한 구간 타입 (씬 목록 필터링용) */
export function phaseOf(phases: Phase[], s: Scene): PhaseType {
  for (const p of phases) {
    if (s.gameTimeMs >= p.startMs && s.gameTimeMs < p.endMs) return p.type;
  }
  return "macro";
}
