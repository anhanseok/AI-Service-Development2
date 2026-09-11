"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null);

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">공유 캘린더</h1>
        <p className="text-sm opacity-70 mb-6">
          {mode === "signin" ? "로그인해서 캘린더를 확인하세요." : "이메일과 비밀번호로 가입하세요."}
        </p>

        <form action={formAction} className="space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder="이메일"
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="비밀번호 (6자 이상)"
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-blue-600 text-white rounded px-3 py-2 text-sm disabled:opacity-50"
          >
            {pending ? "처리 중..." : mode === "signin" ? "로그인" : "회원가입"}
          </button>
        </form>

        {state?.error && <p className="text-sm text-red-600 mt-3">{state.error}</p>}
        {state?.notice && <p className="text-sm text-green-600 mt-3">{state.notice}</p>}

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-sm opacity-70 underline mt-4"
        >
          {mode === "signin" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
        </button>
      </div>
    </main>
  );
}
