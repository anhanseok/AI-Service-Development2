import { describe, expect, it } from "vitest";
import { createSessionToken, hashPassword, readSessionToken, verifyPassword } from "./auth";

describe("비밀번호 해시", () => {
  it("맞는 비밀번호는 통과, 틀린 비밀번호는 거부", () => {
    const stored = hashPassword("secret123");
    expect(verifyPassword("secret123", stored)).toBe(true);
    expect(verifyPassword("secret124", stored)).toBe(false);
  });

  it("같은 비밀번호라도 해시가 매번 다름(솔트)", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("평문이 저장값에 들어가지 않음", () => {
    expect(hashPassword("secret123")).not.toContain("secret123");
  });

  it("형식이 잘못된 저장값은 거부", () => {
    expect(verifyPassword("x", "garbage")).toBe(false);
  });
});

describe("세션 토큰", () => {
  const secret = "test-secret";
  const now = new Date("2026-09-24T00:00:00Z");
  const session = { operatorId: 1, loginId: "admin", expiresAt: now.getTime() + 60_000 };

  it("서명한 토큰은 그대로 읽힘", () => {
    const token = createSessionToken(session, secret);
    expect(readSessionToken(token, secret, now)).toEqual(session);
  });

  it("다른 비밀키로는 읽히지 않음", () => {
    const token = createSessionToken(session, secret);
    expect(readSessionToken(token, "other-secret", now)).toBeNull();
  });

  it("내용을 바꾼 토큰은 거부", () => {
    const token = createSessionToken(session, secret);
    const [, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...session, operatorId: 2 })).toString("base64url");
    expect(readSessionToken(`${forged}.${signature}`, secret, now)).toBeNull();
  });

  it("만료 시각 정각과 이후에는 거부", () => {
    const token = createSessionToken(session, secret);
    expect(readSessionToken(token, secret, new Date(session.expiresAt))).toBeNull();
    expect(readSessionToken(token, secret, new Date(session.expiresAt - 1))).toEqual(session);
  });

  it("형식이 잘못된 토큰은 거부", () => {
    expect(readSessionToken("abc", secret, now)).toBeNull();
    expect(readSessionToken("", secret, now)).toBeNull();
  });
});
