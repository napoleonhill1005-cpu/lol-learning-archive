// 검색 기록·즐겨찾기 — 브라우저 localStorage 저장 (클라이언트 컴포넌트 전용).
// 항목은 정규화된 "이름#태그" 문자열.

const RECENT_KEY = "lolarchive:recent";
const FAV_KEY = "lolarchive:favs";
const RECENT_MAX = 10;

function read(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(key: string, list: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // 저장 불가(프라이빗 모드 등)여도 기능만 조용히 비활성
  }
}

export function getRecent(): string[] {
  return read(RECENT_KEY);
}

export function addRecent(id: string) {
  write(RECENT_KEY, [id, ...read(RECENT_KEY).filter((x) => x !== id)].slice(0, RECENT_MAX));
}

export function removeRecent(id: string) {
  write(RECENT_KEY, read(RECENT_KEY).filter((x) => x !== id));
}

export function getFavorites(): string[] {
  return read(FAV_KEY);
}

export function isFavorite(id: string): boolean {
  return read(FAV_KEY).includes(id);
}

/** 토글 후의 상태를 반환 (true = 즐겨찾기됨) */
export function toggleFavorite(id: string): boolean {
  const list = read(FAV_KEY);
  const on = !list.includes(id);
  write(FAV_KEY, on ? [...list, id] : list.filter((x) => x !== id));
  return on;
}
