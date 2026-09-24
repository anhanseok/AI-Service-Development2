"use client";

import { useActionState, useState } from "react";
import { updatePollAction, type EditPollValues } from "@/app/actions/polls";
import { MAX_OPTIONS, MIN_OPTIONS, type OptionEdit } from "@/lib/poll";

const inputClass = "rounded-md border border-zinc-300 px-3 py-2 text-base font-normal";

type Props = { pollId: number; voteCount: number; initial: EditPollValues };

export default function EditPollForm({ pollId, voteCount, initial }: Props) {
  const [state, action, pending] = useActionState(updatePollAction, undefined);
  const values = state?.values ?? initial;
  const locked = voteCount > 0; // 표가 있으면 기존 선택지는 잠김

  // 새로 추가한 선택지를 구분하려고 화면용 key를 따로 둔다.
  const [options, setOptions] = useState<(OptionEdit & { key: string })[]>(() =>
    values.options.map((o, i) => ({ ...o, key: o.id ? `id-${o.id}` : `init-${i}` })),
  );
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state) setOptions(state.values.options.map((o, i) => ({ ...o, key: o.id ? `id-${o.id}` : `ret-${i}` })));
  }

  const setLabel = (key: string, label: string) =>
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, label } : o)));

  return (
    <form action={action} className="flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-5">
      <input type="hidden" name="pollId" value={pollId} />

      <label className="flex flex-col gap-1 text-sm font-medium">
        질문
        <input
          name="question"
          key={`q-${values.question}`}
          defaultValue={values.question}
          required
          className={inputClass}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">
          선택지 ({MIN_OPTIONS}~{MAX_OPTIONS}개)
        </legend>
        {locked && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            표가 {voteCount}개 들어와서 기존 선택지는 잠겼어요. 새 선택지 추가만 할 수 있어요.
          </p>
        )}
        {options.map((o, i) => {
          const isLocked = locked && o.id !== null;
          return (
            <div key={o.key} className="flex gap-2">
              <input type="hidden" name="optionId" value={o.id ?? ""} />
              <input
                name="optionLabel"
                value={o.label}
                onChange={(e) => setLabel(o.key, e.target.value)}
                readOnly={isLocked}
                placeholder={`선택지 ${i + 1}`}
                required
                className={`${inputClass} flex-1 ${isLocked ? "bg-zinc-100 text-zinc-500" : ""}`}
              />
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => setOptions((prev) => prev.filter((p) => p.key !== o.key))}
                  disabled={options.length <= MIN_OPTIONS}
                  className="rounded-md border border-zinc-300 px-3 text-sm text-zinc-600 disabled:opacity-30"
                  aria-label={`선택지 ${i + 1} 삭제`}
                >
                  삭제
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setOptions((prev) => [...prev, { id: null, label: "", key: `new-${Date.now()}` }])}
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
          key={`d-${values.deadline}`}
          defaultValue={values.deadline}
          required
          className={inputClass}
        />
        <span className="font-normal text-zinc-500">
          마감된 투표도 마감 시간을 뒤로 옮기면 다시 열려요.
        </span>
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
        {pending ? "저장 중…" : "저장하기"}
      </button>
    </form>
  );
}
