import type { Metadata } from "next";

// 멤버 전용 구역 전체 noindex — 하위 세그먼트에서 robots를 재정의하면 통째로
// 덮어써지므로 여기 한 번만 선언한다.
export const metadata: Metadata = {
  title: "멤버 노트 — 롤 학습 아카이브",
  robots: { index: false, follow: false },
};

export default function MembersLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
