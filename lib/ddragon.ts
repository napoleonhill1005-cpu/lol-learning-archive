// Data Dragon (키 불필요, 하루 캐시): 챔피언 한글명 + 챔피언/아이템/스펠/룬 아이콘 URL.

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

export function itemIconUrl(version: string, itemId: number): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;
}

/** 소환사 주문 id(숫자) → 아이콘 파일명 (예: 4 → SummonerFlash.png). 실패 시 빈 맵 → 렌더 생략. */
export async function spellIconMap(): Promise<Record<number, string>> {
  try {
    const ver = await ddragonVersion();
    const res = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${ver}/data/ko_KR/summoner.json`,
      { next: { revalidate: 86400 } },
    );
    const data = (await res.json()) as {
      data: Record<string, { key: string; image: { full: string } }>;
    };
    return Object.fromEntries(
      Object.values(data.data).map((s) => [Number(s.key), s.image.full]),
    );
  } catch {
    return {};
  }
}

export function spellIconUrl(version: string, imageFull: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${imageFull}`;
}

export type RuneInfo = { icon: string; name: string };
export type RuneIconMaps = { perk: Record<number, RuneInfo>; style: Record<number, RuneInfo> };

/** 룬 perk id·스타일 id(트리) → 아이콘 경로 + 한글명. 실패 시 빈 맵 → 렌더 생략. */
export async function runeIconMaps(): Promise<RuneIconMaps> {
  try {
    const ver = await ddragonVersion();
    const res = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${ver}/data/ko_KR/runesReforged.json`,
      { next: { revalidate: 86400 } },
    );
    const styles = (await res.json()) as {
      id: number;
      icon: string;
      name: string;
      slots: { runes: { id: number; icon: string; name: string }[] }[];
    }[];
    const perk: Record<number, RuneInfo> = {};
    const style: Record<number, RuneInfo> = {};
    for (const s of styles) {
      style[s.id] = { icon: s.icon, name: s.name };
      for (const slot of s.slots)
        for (const r of slot.runes) perk[r.id] = { icon: r.icon, name: r.name };
    }
    return { perk, style };
  } catch {
    return { perk: {}, style: {} };
  }
}

/** 룬 아이콘은 버전 경로 없이 cdn/img/ 밑에 있다. */
export function runeIconUrl(iconPath: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/${iconPath}`;
}
