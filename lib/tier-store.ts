/**
 * 티어 스냅샷 축적 (Supabase REST).
 * Riot API에는 과거 티어 이력이 없다(현재 스냅샷만) — 그래서 하루 1행씩 직접 쌓는다.
 * 적립 경로 둘: ① 일일 크론(프로 전원) ② 소환사 검색 시(검색된 계정, 랭크 조회를 재사용하므로 추가 Riot 호출 0).
 * SUPABASE_URL / SUPABASE_SERVICE_KEY 가 없으면 전부 no-op — 페이지는 그래프 없이 정상 렌더.
 */

import type { Rank } from "./riot";

export type TierSnapshot = {
  tier: string;
  division: string;
  lp: number;
  wins: number;
  losses: number;
  capturedOn: string; // YYYY-MM-DD (KST)
};

const BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

export function tierStoreConfigured(): boolean {
  return Boolean(BASE && KEY);
}

function restHeaders(): Record<string, string> {
  return {
    apikey: KEY ?? "",
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
  };
}

/** KST 기준 오늘 — 크론(06:00 KST)과 검색 시 적립이 같은 날짜 키를 쓰게 한다. */
function kstToday(): string {
  return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
}

/** 오늘 스냅샷 1행 upsert. 실패해도 페이지를 막으면 안 되므로 boolean만 돌려준다. */
export async function saveTierSnapshot(
  puuid: string,
  riotId: string,
  rank: Rank,
): Promise<boolean> {
  if (!tierStoreConfigured()) return false;
  try {
    const res = await fetch(
      `${BASE}/rest/v1/tier_snapshots?on_conflict=puuid,captured_on`,
      {
        method: "POST",
        headers: {
          ...restHeaders(),
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify([
          {
            puuid,
            riot_id: riotId,
            tier: rank.tier,
            division: rank.division,
            lp: rank.lp,
            wins: rank.wins,
            losses: rank.losses,
            captured_on: kstToday(),
          },
        ]),
        cache: "no-store",
        signal: AbortSignal.timeout(2_500),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** 오래된 것부터 정렬해서 반환. 실패하면 빈 배열(그래프만 생략). */
export async function getTierHistory(puuid: string, limit = 180): Promise<TierSnapshot[]> {
  if (!tierStoreConfigured()) return [];
  try {
    const res = await fetch(
      `${BASE}/rest/v1/tier_snapshots?puuid=eq.${encodeURIComponent(puuid)}` +
        `&select=tier,division,lp,wins,losses,captured_on&order=captured_on.asc&limit=${limit}`,
      { headers: restHeaders(), cache: "no-store", signal: AbortSignal.timeout(2_500) },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Record<string, unknown>[];
    return rows.map((r) => ({
      tier: String(r.tier ?? ""),
      division: String(r.division ?? ""),
      lp: Number(r.lp ?? 0),
      wins: Number(r.wins ?? 0),
      losses: Number(r.losses ?? 0),
      capturedOn: String(r.captured_on ?? ""),
    }));
  } catch {
    return [];
  }
}
