// 운영자 세션 쿠키 읽기/쓰기. 서버(서버 컴포넌트, 서버 액션)에서만 쓴다.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, readSessionToken, type Session } from "./auth";

const COOKIE_NAME = "operator_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7일

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET 환경변수가 없습니다.");
  return value;
}

export async function createSession(operatorId: number, loginId: string) {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const token = createSessionToken({ operatorId, loginId, expiresAt }, secret());
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE_NAME);
}

// 지금 요청이 운영자면 세션을, 아니면 null을 돌려준다.
export async function getOperator(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  return readSessionToken(token, secret(), new Date());
}

// 운영자 전용 페이지/액션의 맨 앞에서 호출한다. 운영자가 아니면 로그인 화면으로 보낸다.
export async function requireOperator(): Promise<Session> {
  const operator = await getOperator();
  if (!operator) redirect("/login");
  return operator;
}
