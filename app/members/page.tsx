import Link from "next/link";
import { cookies } from "next/headers";
import { MEMBER_COOKIE, memberFeatureEnabled, sessionValid } from "@/lib/member-auth";
import { memberNotes } from "@/lib/member-notes";
import { UnlockForm } from "./unlock-form";

export default async function MembersPage() {
  const cookie = (await cookies()).get(MEMBER_COOKIE)?.value;
  const unlocked = sessionValid(cookie);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">멤버 노트 아카이브</h1>
      <p className="mt-2 text-sm text-zinc-400">
        유튜브 채널 멤버십 상위 등급 전용 — 매달 발행되는 원리 노트(장면 → 원리 · 조건 ·
        반례)가 여기 쌓입니다.
      </p>

      {!unlocked ? (
        <div className="mt-6">
          {memberFeatureEnabled() ? (
            <UnlockForm />
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
              멤버 공간 준비 중입니다. 유튜브 채널 공지를 기다려주세요.
            </div>
          )}
        </div>
      ) : memberNotes.length === 0 ? (
        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
          첫 노트 준비 중 — 진행 중인 프로젝트의 첫 원리 노트가 발행되면 여기 올라옵니다.
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {memberNotes.map((n) => (
            <li key={n.id}>
              <Link
                href={`/members/${n.id}`}
                className="block rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-amber-400/50"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-zinc-100">{n.title}</span>
                  <span className="shrink-0 text-xs text-zinc-500">{n.date}</span>
                </div>
                <span className="mt-1 inline-block rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {n.project}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
