"use client";

import { useEffect, useState } from "react";
import { addRecent, isFavorite, toggleFavorite } from "@/lib/search-store";

/** 검색 성공 시에만 기록되도록, 소환사 페이지에서 정규화된 이름#태그를 저장한다. */
export function RecordVisit({ id }: { id: string }) {
  useEffect(() => {
    addRecent(id);
  }, [id]);
  return null;
}

export function FavoriteButton({ id }: { id: string }) {
  // localStorage는 서버 렌더에 없으므로 마운트 후 동기화 (hydration mismatch 방지)
  const [fav, setFav] = useState(false);
  useEffect(() => {
    setFav(isFavorite(id));
  }, [id]);
  return (
    <button
      type="button"
      onClick={() => setFav(toggleFavorite(id))}
      title={fav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      className={`self-center text-2xl leading-none transition-colors ${
        fav ? "text-amber-400 hover:text-amber-300" : "text-zinc-600 hover:text-zinc-400"
      }`}
    >
      {fav ? "★" : "☆"}
    </button>
  );
}
