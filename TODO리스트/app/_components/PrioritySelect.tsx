"use client";

import {
  PRIORITIES,
  PRIORITY_LABEL,
  type Priority,
} from "@/lib/types";

type Props = {
  value: Priority;
  onChange: (next: Priority) => void;
  /** 스크린 리더용 라벨. 목록에서는 어느 할 일의 중요도인지 구분돼야 한다. */
  ariaLabel: string;
  className?: string;
};

/** 등급별 색. 세 값이 한눈에 구별되어야 한다(FR-110). */
const TONE: Record<Priority, string> = {
  HIGH: "border-red-500/40 text-red-700 dark:text-red-300",
  MEDIUM: "border-amber-500/40 text-amber-700 dark:text-amber-300",
  LOW: "border-black/15 text-black/50 dark:border-white/20 dark:text-white/50",
};

/**
 * 중요도 선택. 표시와 변경을 한 요소가 겸한다(002 R-105).
 * select 를 쓰므로 키보드 조작과 스크린 리더 지원이 기본으로 따라온다.
 */
export default function PrioritySelect({
  value,
  onChange,
  ariaLabel,
  className = "",
}: Props) {
  // select 의 값은 문자열이라 그대로는 Priority 가 아니다.
  // 단언 대신 허용 목록에서 찾아 좁힌다(헌법 원칙 III).
  function handleChange(raw: string) {
    const next = PRIORITIES.find((priority) => priority === raw);
    if (next !== undefined) onChange(next);
  }

  return (
    <select
      value={value}
      onChange={(event) => handleChange(event.target.value)}
      aria-label={ariaLabel}
      className={`shrink-0 rounded-md border bg-transparent px-2 py-1 text-xs font-medium outline-none focus:border-current ${TONE[value]} ${className}`}
    >
      {PRIORITIES.map((priority) => (
        <option key={priority} value={priority}>
          {PRIORITY_LABEL[priority]}
        </option>
      ))}
    </select>
  );
}
