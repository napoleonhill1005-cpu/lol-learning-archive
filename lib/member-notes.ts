import raw from "@/data/member-notes.json";

/**
 * 멤버 전용 원리 노트 — 파이프라인(lol-analysis-os) STEP 2 산출물의 재포장.
 * 임의 생성 금지: 실제 노트 발행 때만 항목을 추가한다 (data/*.json 원칙).
 */
export type MemberNote = {
  id: string; // slug, 예: "2026-08-zeus-ranged-01"
  date: string; // "2026-08-05"
  title: string;
  project: string; // 파이프라인 프로젝트명, 예: "zeus-ranged-matchup"
  principle: string[]; // 원리 — 문단 배열
  conditions: string[]; // 성립 조건
  counterexamples: string[]; // 반례 — 언제 하면 안 되는가
  scenes: { label: string; videoId: string; tMs?: number }[]; // /video/[id] 링크
  tags?: string[];
};

export const memberNotes: MemberNote[] = (raw as MemberNote[]).slice().sort((a, b) =>
  b.date.localeCompare(a.date),
);

export function getMemberNote(id: string): MemberNote | null {
  return memberNotes.find((n) => n.id === id) ?? null;
}
