// 로그인하지 않은 투표자를 브라우저 쿠키로 구분한다.
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "voter_token";
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 1년

// 읽기만 한다(페이지에서 사용). 아직 투표한 적 없는 브라우저면 null.
export async function getVoterToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE_NAME)?.value ?? null;
}

// 없으면 새로 만든다. 쿠키를 쓰므로 서버 액션에서만 호출한다.
export async function getOrCreateVoterToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const token = randomUUID();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return token;
}
