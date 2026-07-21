"use client";

import { useActionState } from "react";
import { unlock, type UnlockState } from "./actions";

const initialState: UnlockState = { error: null };

export function UnlockForm() {
  const [state, formAction, pending] = useActionState(unlock, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-5"
    >
      <label htmlFor="member-code" className="text-sm font-medium text-zinc-200">
        이달의 접근코드
      </label>
      <input
        id="member-code"
        name="code"
        type="text"
        required
        autoComplete="off"
        placeholder="XXXX-XXXX"
        className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono tracking-widest text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-amber-400 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
      >
        {pending ? "확인 중…" : "입장"}
      </button>
      <p aria-live="polite" className="min-h-5 text-sm text-red-400">
        {state.error}
      </p>
      <p className="text-xs text-zinc-500">
        코드는 매달 유튜브 채널의 <span className="text-zinc-300">멤버 전용 게시글</span>로
        공지됩니다. 대소문자·하이픈은 구분하지 않아요.
      </p>
    </form>
  );
}
