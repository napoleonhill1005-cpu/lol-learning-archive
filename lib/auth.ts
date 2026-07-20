// 서버 전용 — Bearer 시크릿 검증. 문자열 !== 비교는 타이밍 차이로 시크릿을
// 한 글자씩 추측할 여지를 주므로 상수 시간 비교를 쓴다.

import { timingSafeEqual } from "node:crypto";

/** 시크릿 미설정이면 항상 거부(fail-closed). */
export function bearerMatches(req: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const given = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(given);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
