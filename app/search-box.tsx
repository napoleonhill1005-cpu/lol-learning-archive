"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBox({ large = false }: { large?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!/^.{1,40}#.{1,10}$/.test(v)) {
      setError("이름#태그 형식으로 입력하세요 (예: Hide on bush#KR1)");
      return;
    }
    setError(null);
    setLoading(true);
    router.push(`/summoner/${encodeURIComponent(v)}`);
  }

  return (
    <form onSubmit={submit} className={`w-full ${large ? "max-w-xl" : "max-w-sm"}`}>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Riot ID (예: Hide on bush#KR1)"
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
    </form>
  );
}
