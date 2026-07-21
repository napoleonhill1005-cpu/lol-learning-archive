"use server";

import { cookies } from "next/headers";
import {
  codeMatches,
  currentSessionToken,
  COOKIE_MAX_AGE,
  MEMBER_COOKIE,
} from "@/lib/member-auth";

export type UnlockState = { error: string | null };

// 서버 액션은 UI 없이도 직접 POST 가능하다 — 검증은 반드시 이 안에서 한다.
// 쿠키 설정 후 리턴하면 /members 가 같은 라운드트립에 잠금 해제 상태로 리렌더된다.
export async function unlock(_prev: UnlockState, formData: FormData): Promise<UnlockState> {
  const code = String(formData.get("code") ?? "");
  if (!codeMatches(code)) {
    return { error: "코드가 올바르지 않습니다. 이달의 멤버 게시글을 확인해주세요." };
  }
  const token = currentSessionToken();
  if (!token) return { error: "멤버 공간이 아직 준비되지 않았습니다." };
  (await cookies()).set(MEMBER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/members",
    maxAge: COOKIE_MAX_AGE,
  });
  return { error: null };
}
