// Data Dragon (키 불필요, 하루 캐시): 챔피언 한글명 + 아이콘 URL.

const FALLBACK_VERSION = "16.13.1";

export async function ddragonVersion(): Promise<string> {
  try {
    const res = await fetch("https://ddragon.leagueoflegends.com/api/versions.json", {
      next: { revalidate: 86400 },
    });
    const versions = (await res.json()) as string[];
    return versions[0] ?? FALLBACK_VERSION;
  } catch {
    return FALLBACK_VERSION;
  }
}

/** 영문 챔피언 id → 한글명 (예: Yone → 요네). 실패 시 빈 맵 → 영문명 그대로 표시. */
export async function championKoMap(): Promise<Record<string, string>> {
  try {
    const ver = await ddragonVersion();
    const res = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${ver}/data/ko_KR/champion.json`,
      { next: { revalidate: 86400 } },
    );
    const data = (await res.json()) as { data: Record<string, { name: string }> };
    return Object.fromEntries(Object.entries(data.data).map(([id, c]) => [id, c.name]));
  } catch {
    return {};
  }
}

export function championIconUrl(version: string, champion: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion}.png`;
}
