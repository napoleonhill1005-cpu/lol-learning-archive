import raw from "@/data/member-notes.json";

/**
 * 멤버 전용 원리 노트 — 파이프라인(lol-analysis-os) STEP 2 산출물의 재포장.
 * 임의 생성 금지: 실제 노트 발행 때만 항목을 추가한다 (data/*.json 원칙).
 */
/**
 * 장면 링크는 둘 중 하나:
 * - videoId  → 사이트 내부 /video/[id] (아카이브의 프로 리플레이 영상)
 * - youtubeId → 유튜브 직링크 + tMs 타임스탬프 (무편집 분석 영상 등 멤버 전용 영상.
 *   멤버 전용은 임베드가 아니라 링크로 보내야 시청자의 유튜브 로그인이 적용된다)
 */
export type MemberNoteScene = {
  label: string;
  tMs?: number;
  videoId?: string;
  youtubeId?: string;
};

export type MemberNote = {
  id: string; // slug, 예: "2026-08-zeus-ranged-01"
  date: string; // "2026-08-05"
  title: string;
  project: string; // 파이프라인 프로젝트명, 예: "zeus-ranged-matchup"
  principle: string[]; // 원리 — 문단 배열
  conditions: string[]; // 성립 조건
  counterexamples: string[]; // 반례 — 언제 하면 안 되는가
  scenes: MemberNoteScene[];
  tags?: string[];
};

export const memberNotes: MemberNote[] = (raw as MemberNote[]).slice().sort((a, b) =>
  b.date.localeCompare(a.date),
);

export function getMemberNote(id: string): MemberNote | null {
  return memberNotes.find((n) => n.id === id) ?? null;
}
