import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "롤 학습 아카이브",
  description:
    "프로게이머 솔로랭크 리플레이를 챔피언·프로·패치·태그로 검색하는 학습 아카이브",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-baseline gap-3 px-4 py-4">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-amber-400 hover:text-amber-300"
            >
              롤 학습 아카이브
            </Link>
            <span className="hidden text-sm text-zinc-400 sm:inline">
              프로 솔랭 리플레이 · 챔피언/프로/패치/태그 검색
            </span>
            <nav className="ml-auto flex gap-4 text-sm">
              <Link href="/" className="text-zinc-300 hover:text-amber-300">
                영상
              </Link>
              <Link href="/pros" className="text-zinc-300 hover:text-amber-300">
                프로
              </Link>
              <Link href="/compare" className="text-zinc-300 hover:text-amber-300">
                비교
              </Link>
              <Link href="/members" className="text-zinc-300 hover:text-amber-300">
                멤버
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="flex flex-col gap-2 border-t border-zinc-800 px-4 py-6 text-center text-xs text-zinc-500">
          <p>롤 학습 아카이브 — 프로게이머 솔로랭크 리플레이 학습용 비공식 아카이브</p>
          <p className="mx-auto max-w-3xl text-zinc-600">
            LoL Learning Archive isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the
            views or opinions of Riot Games or anyone officially involved in producing or managing
            Riot Games properties. Riot Games, and all associated properties are trademarks or
            registered trademarks of Riot Games, Inc.
          </p>
        </footer>
      </body>
    </html>
  );
}
