/**
 * 일일 티어 스냅샷 크론 (vercel.json: 매일 06:00 KST).
 * 프로 전원 + 추가 트래킹 계정의 현재 솔로랭크를 tier_snapshots 에 1행씩 적립한다.
 * Vercel 크론은 CRON_SECRET 이 설정돼 있으면 Authorization: Bearer 로 넣어서 호출한다.
 */

import { pros } from "@/lib/pros";
import { getAccount, getRank } from "@/lib/riot";
import { saveTierSnapshot, tierStoreConfigured } from "@/lib/tier-store";
import { bearerMatches } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 프로 외에 같이 쌓을 계정 — TRACKED_EXTRA 환경변수(쉼표 구분)로 재정의 가능
const EXTRA_TRACKED = (process.env.TRACKED_EXTRA ?? "나폴레온 힐#KR1")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export async function GET(req: Request) {
  if (!bearerMatches(req, process.env.CRON_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!tierStoreConfigured()) {
    return Response.json({ error: "store_not_configured" }, { status: 503 });
  }

  const targets = [...pros.map((p) => p.riotId), ...EXTRA_TRACKED];
  const saved: string[] = [];
  const unranked: string[] = [];
  const failed: string[] = [];

  // riotFetch 가 전역 스로틀을 걸어주므로 순차 루프면 레이트리밋 걱정 없음 (~28호출)
  for (const riotId of targets) {
    const hash = riotId.lastIndexOf("#");
    const account = await getAccount(riotId.slice(0, hash), riotId.slice(hash + 1));
    if (!account.ok) {
      failed.push(`${riotId}: ${account.error}`);
      continue;
    }
    const rank = await getRank(account.data.puuid);
    if (!rank) {
      unranked.push(riotId);
      continue;
    }
    const ok = await saveTierSnapshot(account.data.puuid, riotId, rank);
    if (ok) saved.push(riotId);
    else failed.push(`${riotId}: db_write_failed`);
  }

  return Response.json({ saved, unranked, failed });
}
