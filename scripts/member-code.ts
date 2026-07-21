/**
 * 이달의 멤버 접근코드 출력 — 매달 1일 유튜브 멤버 전용 게시글에 붙여넣는 용도.
 *
 * 실행:  MEMBER_CODE_SECRET=... npm run member-code
 * (Vercel에 설정한 것과 같은 시크릿을 써야 사이트와 코드가 일치한다)
 */
import { deriveCode, formatCode } from "../lib/member-auth.ts";

const secret = process.env.MEMBER_CODE_SECRET;
if (!secret) {
  console.error("MEMBER_CODE_SECRET 환경변수가 필요합니다.");
  process.exit(1);
}

const kst = new Date(Date.now() + 9 * 3600_000);
const month = kst.toISOString().slice(0, 7);
console.log(`${month} 접근코드: ${formatCode(deriveCode(secret, month))}`);

// 월초 7일간은 전월 코드도 유효 — 게시글 교체가 늦어도 멤버가 잠기지 않는다.
if (kst.getUTCDate() <= 7) {
  const prev = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - 1, 15))
    .toISOString()
    .slice(0, 7);
  console.log(`(${prev} 코드도 ${8 - kst.getUTCDate()}일간 유효: ${formatCode(deriveCode(secret, prev))})`);
}
