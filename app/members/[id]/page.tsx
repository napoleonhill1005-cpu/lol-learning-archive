import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { MEMBER_COOKIE, sessionValid } from "@/lib/member-auth";
import { getMemberNote } from "@/lib/member-notes";

function Section({ heading, items }: { heading: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">
        {heading}
      </h2>
      <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-zinc-300">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default async function MemberNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 프록시가 아니라 각 페이지가 독립적으로 검증한다 — 링크 직접 접근 대비.
  const cookie = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!sessionValid(cookie)) redirect("/members");

  const { id } = await params;
  const note = getMemberNote(id);
  if (!note) notFound();

  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/members" className="text-sm text-zinc-400 hover:text-amber-300">
        ← 노트 목록
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">{note.title}</h1>
      <p className="mt-1 text-xs text-zinc-500">
        {note.date} · {note.project}
        {note.tags?.length ? ` · ${note.tags.join(" · ")}` : null}
      </p>

      <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        {note.principle.map((p, i) => (
          <p key={i} className="mt-2 text-sm leading-relaxed text-zinc-200 first:mt-0">
            {p}
          </p>
        ))}
      </section>

      <Section heading="성립 조건" items={note.conditions} />
      <Section heading="반례 — 언제 하면 안 되는가" items={note.counterexamples} />

      {note.scenes.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-400">
            증거 장면
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {note.scenes.map((s, i) => (
              <li key={i}>
                <Link
                  href={`/video/${s.videoId}`}
                  className="block rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:border-amber-400/50"
                >
                  ▶ {s.label}
                  {s.tMs != null && (
                    <span className="ml-2 font-mono text-xs text-zinc-500">
                      {Math.floor(s.tMs / 60000)}:{String(Math.floor((s.tMs % 60000) / 1000)).padStart(2, "0")}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
