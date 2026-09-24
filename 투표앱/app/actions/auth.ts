"use server";

import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/auth";
import { findOperatorByLoginId } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";

export type LoginState = { error?: string; loginId?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!loginId || !password) {
    return { error: "아이디와 비밀번호를 모두 입력해 주세요.", loginId };
  }

  const operator = await findOperatorByLoginId(loginId);
  if (!operator || !verifyPassword(password, operator.passwordHash)) {
    return { error: "아이디 또는 비밀번호가 올바르지 않아요.", loginId };
  }

  await createSession(operator.id, operator.loginId);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
