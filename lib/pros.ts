import raw from "@/data/pros.json";
import { videos, type Video } from "@/lib/videos";

export type Pro = {
  pro: string; // 한글 이름 (예: 페이커)
  proEn: string; // 영문 (예: Faker)
  lane: string;
  riotId: string; // 현재 솔랭 계정 (이름#태그)
  confidence: string;
  alt: string[];
  realName?: string; // 본명 (예: 이상혁) — 이름 검색용, 확실한 경우에만
};

export const pros = raw as Pro[];

export function proSlug(p: Pro): string {
  return p.proEn.toLowerCase();
}

export function getPro(slug: string): Pro | null {
  return pros.find((p) => proSlug(p) === slug.toLowerCase()) ?? null;
}

/** 이 프로의 아카이브 영상들 (videos.json 의 proKr/pro 매칭) */
export function videosOfPro(p: Pro): Video[] {
  const gameName = p.riotId.split("#")[0];
  return videos.filter(
    (v) => v.proKr === p.pro || v.pro === gameName || v.pro === p.proEn,
  );
}

/** 검색어가 프로 이름(한/영/본명/계정명)에 걸리면 해당 프로 반환 (갤러리 빠른 링크용) */
export function matchPros(query: string): Pro[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return pros.filter(
    (p) =>
      p.pro.toLowerCase().includes(q) ||
      p.proEn.toLowerCase().includes(q) ||
      (p.realName?.toLowerCase().includes(q) ?? false) ||
      p.riotId.toLowerCase().includes(q),
  );
}

/** 활동명/영문/본명/계정명과 정확히 일치하면 해당 프로 — 이름만으로 전적 검색 연결용 */
export function resolveProByName(query: string): Pro | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    pros.find(
      (p) =>
        p.pro.toLowerCase() === q ||
        p.proEn.toLowerCase() === q ||
        p.realName?.toLowerCase() === q ||
        p.riotId.split("#")[0].toLowerCase() === q,
    ) ?? null
  );
}
