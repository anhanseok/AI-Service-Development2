"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null);

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-fg grid place-items-center text-lg">📅</div>
          <span className="text-lg font-semibold tracking-tight">공유 캘린더</span>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
          <h1 className="text-xl font-semibold mb-1">{mode === "signin" ? "로그인" : "회원가입"}</h1>
          <p className="text-sm text-muted mb-5">
            {mode === "signin" ? "캘린더를 확인하려면 로그인하세요." : "이메일과 비밀번호로 시작하세요."}
          </p>

          <form action={formAction} className="space-y-3">
            <input
              name="email"
              type="email"
              required
              placeholder="이메일"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted"
            />
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="비밀번호 (6자 이상)"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={pending}
              className="w-full bg-primary hover:bg-primary-hover text-primary-fg rounded-lg px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {pending ? "처리 중..." : mode === "signin" ? "로그인" : "회원가입"}
            </button>
          </form>

          {state?.error && <p className="text-sm text-danger mt-3">{state.error}</p>}
          {state?.notice && <p className="text-sm text-success mt-3">{state.notice}</p>}
        </div>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-sm text-muted hover:text-foreground transition-colors mt-4 w-full text-center"
        >
          {mode === "signin" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
        </button>
      </div>
    </main>
  );
}
