"use client";

import { useActionState, useState } from "react";
import { createPollAction } from "@/app/actions/polls";
import { MAX_OPTIONS, MIN_OPTIONS } from "@/lib/poll";

const inputClass = "rounded-md border border-zinc-300 px-3 py-2 text-base font-normal";

export default function NewPollForm() {
  const [state, action, pending] = useActionState(createPollAction, undefined);
  // 오류로 돌아오면 입력했던 값을 그대로 보여준다.
  const [options, setOptions] = useState<string[]>(state?.values.options ?? ["", ""]);
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state) setOptions(state.values.options);
  }

  const setOption = (i: number, value: string) =>
    setOptions((prev) => prev.map((o, j) => (j === i ? value : o)));

  return (
    <form action={action} className="flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-5">
      <label className="flex flex-col gap-1 text-sm font-medium">
        질문
        <input
          name="question"
          key={`q-${state?.values.question}`}
          defaultValue={state?.values.question}
          placeholder="예: 오늘 점심 뭐 먹지?"
          required
          className={inputClass}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">
          선택지 ({MIN_OPTIONS}~{MAX_OPTIONS}개)
        </legend>
        {options.map((value, i) => (
          <div key={i} className="flex gap-2">
            <input
              name="option"
              value={value}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`선택지 ${i + 1}`}
              required
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
              disabled={options.length <= MIN_OPTIONS}
              className="rounded-md border border-zinc-300 px-3 text-sm text-zinc-600 disabled:opacity-30"
              aria-label={`선택지 ${i + 1} 삭제`}
            >
              삭제
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setOptions((prev) => [...prev, ""])}
          disabled={options.length >= MAX_OPTIONS}
          className="self-start rounded-md border border-dashed border-zinc-400 px-3 py-1.5 text-sm text-zinc-600 disabled:opacity-30"
        >
          + 선택지 추가
        </button>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm font-medium">
        마감 시간 (한국 시간)
        <input
          name="deadline"
          type="datetime-local"
          key={`d-${state?.values.deadline}`}
          defaultValue={state?.values.deadline}
          required
          className={inputClass}
        />
      </label>

      {state?.errors && state.errors.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? "만드는 중…" : "투표 만들기"}
      </button>
    </form>
  );
}
