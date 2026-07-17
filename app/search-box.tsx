"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { matchPros, resolveProByName } from "@/lib/pros";
import { laneLabel } from "@/lib/videos";
import {
  getFavorites,
  getRecent,
  isFavorite,
  removeRecent,
  toggleFavorite,
} from "@/lib/search-store";

export default function SearchBox({ large = false }: { large?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [favs, setFavs] = useState<string[]>([]);

  function refresh() {
    setRecent(getRecent());
    setFavs(getFavorites());
  }

  function go(id: string) {
    setError(null);
    setLoading(true);
    setOpen(false);
    router.push(`/summoner/${encodeURIComponent(id)}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    if (!v.includes("#")) {
      const pro = resolveProByName(v);
      if (pro) return go(pro.riotId);
      setError("이름#태그 형식으로 입력하세요. 프로는 이름만으로도 검색돼요 (예: 페이커, 이상혁)");
      return;
    }
    if (!/^.{1,40}#.{1,10}$/.test(v)) {
      setError("이름#태그 형식으로 입력하세요 (예: Hide on bush#KR1)");
      return;
    }
    go(v);
  }

  const suggestions = value.trim() ? matchPros(value).slice(0, 4) : [];
  const showPanel =
    open && (suggestions.length > 0 || favs.length > 0 || recent.length > 0);

  return (
    <form onSubmit={submit} className={`relative w-full ${large ? "max-w-xl" : "max-w-sm"}`}>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onFocus={() => {
            refresh();
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Riot ID 또는 프로 이름 (예: Hide on bush#KR1, 페이커)"
          className={`min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-amber-400 ${
            large ? "px-4 py-3 text-base" : "px-3 py-1.5 text-sm"
          }`}
        />
        <button
          type="submit"
          disabled={loading}
          className={`shrink-0 rounded-lg bg-amber-400 font-semibold text-zinc-950 transition-colors hover:bg-amber-300 disabled:opacity-60 ${
            large ? "px-5 py-3 text-base" : "px-4 py-1.5 text-sm"
          }`}
        >
          {loading ? "검색중..." : "전적 검색"}
        </button>
      </div>
      {error && <p className="mt-2 text-left text-sm text-red-400">{error}</p>}

      {showPanel && (
        <div className="absolute top-full left-0 z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 text-left shadow-xl shadow-black/40">
          {suggestions.length > 0 && (
            <Section label="프로">
              {suggestions.map((p) => (
                <Row key={p.riotId} onPick={() => go(p.riotId)}>
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                    <span className="font-semibold text-amber-300">{p.pro}</span>
                    <span className="text-zinc-500">
                      {" "}
                      · {laneLabel(p.lane)}
                      {p.realName ? ` · ${p.realName}` : ""} · {p.riotId}
                    </span>
                  </span>
                </Row>
              ))}
            </Section>
          )}
          {favs.length > 0 && (
            <Section label="즐겨찾기">
              {favs.map((id) => (
                <Row key={id} onPick={() => go(id)}>
                  <StarButton id={id} onChange={refresh} />
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{id}</span>
                </Row>
              ))}
            </Section>
          )}
          {recent.length > 0 && (
            <Section label="최근 검색">
              {recent.map((id) => (
                <Row key={id} onPick={() => go(id)}>
                  <StarButton id={id} onChange={refresh} />
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">{id}</span>
                  <button
                    type="button"
                    aria-label="기록에서 삭제"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecent(id);
                      refresh();
                    }}
                    className="px-1 text-zinc-600 hover:text-zinc-300"
                  >
                    ✕
                  </button>
                </Row>
              ))}
            </Section>
          )}
        </div>
      )}
    </form>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-800 py-1 last:border-b-0">
      <p className="px-3 pt-1 pb-0.5 text-[11px] font-semibold text-zinc-500">{label}</p>
      {children}
    </div>
  );
}

function Row({ children, onPick }: { children: React.ReactNode; onPick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
      onKeyDown={(e) => e.key === "Enter" && onPick()}
      className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-zinc-800/70"
    >
      {children}
    </div>
  );
}

function StarButton({ id, onChange }: { id: string; onChange: () => void }) {
  const fav = isFavorite(id);
  return (
    <button
      type="button"
      aria-label={fav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(id);
        onChange();
      }}
      className={`text-base leading-none ${fav ? "text-amber-400" : "text-zinc-600 hover:text-zinc-400"}`}
    >
      {fav ? "★" : "☆"}
    </button>
  );
}
