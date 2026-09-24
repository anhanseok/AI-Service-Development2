"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5">
      <label className="flex flex-col gap-1 text-sm font-medium">
        아이디
        <input
          name="loginId"
          defaultValue={state?.loginId}
          autoComplete="username"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-base font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        비밀번호
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-base font-normal"
        />
      </label>

      {state?.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? "로그인 중…" : "로그인"}
      </button>
    </form>
  );
}
