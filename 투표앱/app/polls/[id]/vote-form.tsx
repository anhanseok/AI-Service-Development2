"use client";

import { useActionState } from "react";
import { castVote } from "@/app/actions/votes";

type Props = {
  pollId: number;
  options: { id: number; label: string }[];
  myChoice: number | null;
  open: boolean;
};

export default function VoteForm({ pollId, options, myChoice, open }: Props) {
  const [state, action, pending] = useActionState(castVote, undefined);
  const myLabel = options.find((o) => o.id === myChoice)?.label;

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5">
      <input type="hidden" name="pollId" value={pollId} />
      {myLabel && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
          내 선택: <strong>{myLabel}</strong>
          {open && " · 마감 전까지 바꿀 수 있어요."}
        </p>
      )}

      <fieldset disabled={!open || pending} className="flex flex-col gap-2">
        <legend className="sr-only">선택지</legend>
        {options.map((o) => (
          <label
            key={`${o.id}-${myChoice}`}
            className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-200 px-3 py-3 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
          >
            <input type="radio" name="optionId" value={o.id} defaultChecked={o.id === myChoice} className="size-4" />
            <span>{o.label}</span>
          </label>
        ))}
      </fieldset>

      {state?.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.saved && !pending && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          투표가 저장됐어요.
        </p>
      )}

      {open ? (
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {pending ? "저장 중…" : myChoice ? "표 바꾸기" : "투표하기"}
        </button>
      ) : (
        <p className="text-center text-sm text-zinc-500">마감된 투표예요.</p>
      )}
    </form>
  );
}
