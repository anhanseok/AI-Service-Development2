"use client";

import { useState, type FormEvent } from "react";
import { DEFAULT_PRIORITY, type Priority } from "@/lib/types";
import { TITLE_MAX_LENGTH } from "@/lib/validation";
import PrioritySelect from "./PrioritySelect";

type Props = {
  /** 제목과 중요도를 받아 추가를 시도한다. 성공하면 true를 돌려준다. */
  onAdd: (title: string, priority: Priority) => Promise<boolean>;
};

/**
 * 제목 입력, 중요도 선택, 추가 버튼(FR-001, FR-102).
 * 서버 검증이 본체이고 여기서는 사용자 편의를 위한 안내만 한다.
 */
export default function TodoForm({ onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>(DEFAULT_PRIORITY);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    const added = await onAdd(title, priority);
    setSubmitting(false);

    // 성공했을 때만 비운다. 실패하면 사용자가 고른 값을 살려둬야 고쳐서 다시 낼 수 있다.
    if (added) {
      setTitle("");
      setPriority(DEFAULT_PRIORITY); // FR-104: 중요도도 기본값으로 되돌린다
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="할 일을 입력하세요"
        maxLength={TITLE_MAX_LENGTH}
        aria-label="할 일 제목"
        className="flex-1 rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none placeholder:text-black/40 focus:border-black/40 dark:border-white/20 dark:bg-white/5 dark:placeholder:text-white/40 dark:focus:border-white/50"
      />
      <PrioritySelect
        value={priority}
        onChange={setPriority}
        ariaLabel="새 할 일의 중요도"
        className="px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40"
      >
        추가
      </button>
    </form>
  );
}
