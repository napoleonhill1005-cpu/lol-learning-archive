// AI 스코어: 게임 내 10명 상대평가 휴리스틱 (0~100).
// KDA·딜량 비중·킬관여·분당 CS·분당 시야를 게임 내 백분위로 환산해 가중합.
// 이긴 팀 1위 = MVP, 진 팀 1위 = ACE (딥롤 관례).

import type { ParticipantDetail } from "./riot";

export type ScoreEntry = { score: number; rank: number; badge: "MVP" | "ACE" | null };

const WEIGHTS = { kda: 0.3, dmg: 0.25, kp: 0.2, cs: 0.15, vision: 0.1 } as const;
type MetricKey = keyof typeof WEIGHTS;

export function aiScores(
  participants: ParticipantDetail[],
  durationMin: number,
): Record<string, ScoreEntry> {
  const teamKills: Record<number, number> = {};
  const teamDamage: Record<number, number> = {};
  for (const p of participants) {
    teamKills[p.teamId] = (teamKills[p.teamId] ?? 0) + p.kills;
    teamDamage[p.teamId] = (teamDamage[p.teamId] ?? 0) + p.damage;
  }

  const min = Math.max(durationMin, 1);
  const metrics = participants.map((p) => ({
    puuid: p.puuid,
    win: p.win,
    kda: (p.kills + p.assists) / Math.max(p.deaths, 1),
    dmg: teamDamage[p.teamId] ? p.damage / teamDamage[p.teamId] : 0,
    kp: teamKills[p.teamId] ? (p.kills + p.assists) / teamKills[p.teamId] : 0,
    cs: p.cs / min,
    vision: p.visionScore / min,
  }));

  // 게임 내 백분위: 나보다 낮은 사람 수 / (n-1)
  const percentile = (values: number[], v: number) =>
    values.filter((x) => x < v).length / Math.max(values.length - 1, 1);

  const scored = metrics.map((m) => {
    let s = 0;
    for (const key of Object.keys(WEIGHTS) as MetricKey[]) {
      s += WEIGHTS[key] * percentile(metrics.map((x) => x[key]), m[key]);
    }
    return { puuid: m.puuid, win: m.win, score: Math.round(s * 100) };
  });

  const out: Record<string, ScoreEntry> = {};
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  sorted.forEach((s, i) => {
    out[s.puuid] = { score: s.score, rank: i + 1, badge: null };
  });
  const winTop = sorted.find((s) => s.win);
  const loseTop = sorted.find((s) => !s.win);
  if (winTop) out[winTop.puuid].badge = "MVP";
  if (loseTop) out[loseTop.puuid].badge = "ACE";
  return out;
}
