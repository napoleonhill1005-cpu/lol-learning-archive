/**
 * 멤버 전용 페이지(/members) 접근코드 — 서버 전용.
 *
 * 매달 Vercel 환경변수를 갈아끼우는 대신, MEMBER_CODE_SECRET 하나에서
 * "당월 코드"를 HMAC으로 파생한다(자동 회전). 한 달 코드가 유출돼도
 * 시크릿·다음 달 코드는 역산 불가. 코드는 매달 유튜브 멤버 전용
 * 게시글로 배포하고, 월초 GRACE_DAYS 동안은 전월 코드도 인정한다.
 *
 * 쿠키에는 코드가 아니라 월에 바인딩된 별도 HMAC 토큰을 넣는다 —
 * 위조 불가, 개인 식별자 없음. 비교는 전부 상수 시간(lib/auth.ts와 동일 이유).
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const MEMBER_COOKIE = "member_session";
export const COOKIE_MAX_AGE = 35 * 24 * 3600; // 발급 후 35일이면 다음 코드 공지와 겹친다

const GRACE_DAYS = 7;
// Crockford base32 — 눈으로 옮겨 적는 코드라 O/I/L/U를 뺀다 (0·1로 정규화 흡수)
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** KST 고정 오프셋(+9h, DST 없음)으로 민 Date — UTC 게터가 곧 KST 값이 된다. */
function kstNow(now: number): Date {
  return new Date(now + 9 * 3600_000);
}

function ym(d: Date): string {
  return d.toISOString().slice(0, 7); // "2026-07"
}

/** 당월 + (월초 유예 중이면) 전월. */
function activeMonths(now: number): string[] {
  const d = kstNow(now);
  const months = [ym(d)];
  if (d.getUTCDate() <= GRACE_DAYS) {
    months.push(ym(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 15))));
  }
  return months;
}

export function deriveCode(secret: string, month: string): string {
  const mac = createHmac("sha256", secret).update(`member-code:v1:${month}`).digest();
  let code = "";
  for (let i = 0; i < 8; i++) code += ALPHABET[mac[i] % ALPHABET.length];
  return code;
}

/** 배포용 표기: "XXXX-XXXX" */
export function formatCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** 입력 관용: 대소문자·공백·하이픈 무시, 혼동 문자(O→0, I/L→1) 교정. */
function normalize(input: string): string {
  return input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

function safeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** 시크릿 미설정이면 항상 거부(fail-closed). now 주입은 테스트용. */
export function codeMatches(input: string, now: number = Date.now()): boolean {
  const secret = process.env.MEMBER_CODE_SECRET;
  if (!secret) return false;
  const given = normalize(input);
  return activeMonths(now).some((m) => safeEquals(given, deriveCode(secret, m)));
}

function sessionToken(secret: string, month: string): string {
  return createHmac("sha256", secret).update(`member-session:v1:${month}`).digest("hex");
}

/** 코드 통과 시 쿠키에 넣을 값 — 당월에 바인딩. */
export function currentSessionToken(now: number = Date.now()): string | null {
  const secret = process.env.MEMBER_CODE_SECRET;
  if (!secret) return null;
  return sessionToken(secret, activeMonths(now)[0]);
}

/** 당월·전월 토큰 인정 → 발급 시점 기준 최소 한 달은 재입력 없이 유지된다. */
export function sessionValid(cookieValue: string | undefined, now: number = Date.now()): boolean {
  const secret = process.env.MEMBER_CODE_SECRET;
  if (!secret || !cookieValue) return false;
  const d = kstNow(now);
  const months = [ym(d), ym(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 15)))];
  return months.some((m) => safeEquals(cookieValue, sessionToken(secret, m)));
}

export function memberFeatureEnabled(): boolean {
  return Boolean(process.env.MEMBER_CODE_SECRET);
}
