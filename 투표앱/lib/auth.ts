// 운영자 인증에 쓰는 순수 함수: 비밀번호 해시, 세션 토큰 서명/검증.
// 쿠키나 DB는 다루지 않는다. 비밀키와 현재 시각은 인자로 받는다.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

// 저장 형식: "scrypt$<salt hex>$<hash hex>"
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

export type Session = {
  operatorId: number;
  loginId: string;
  expiresAt: number; // ms
};

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

// 토큰 형식: "<payload base64url>.<서명>"
export function createSessionToken(session: Session, secret: string): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function readSessionToken(token: string, secret: string, now: Date): Session | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (typeof session.expiresAt !== "number" || session.expiresAt <= now.getTime()) return null;
    return session;
  } catch {
    return null;
  }
}
