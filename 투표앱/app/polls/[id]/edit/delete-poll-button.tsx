"use client";

import { deletePollAction } from "@/app/actions/polls";

export default function DeletePollButton({ pollId, question }: { pollId: number; question: string }) {
  return (
    <form
      action={deletePollAction}
      onSubmit={(e) => {
        if (!confirm(`"${question}" 투표를 삭제할까요?\n선택지와 표도 모두 지워지고 되돌릴 수 없어요.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="pollId" value={pollId} />
      <button type="submit" className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white">
        삭제하기
      </button>
    </form>
  );
}
