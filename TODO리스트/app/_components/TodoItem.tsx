"use client";

import type { Priority, Task } from "@/lib/types";
import PrioritySelect from "./PrioritySelect";

type Props = {
  task: Task;
  /** 바꿀 값을 명시적으로 전달한다. 서버가 뒤집지 않으므로 여기서 결정한다(R-005). */
  onToggle: (id: number, completed: boolean) => void;
  onChangePriority: (id: number, priority: Priority) => void;
  onDelete: (id: number) => void;
};

/**
 * 할 일 한 건. 완료 토글, 제목, 중요도 선택, 삭제 버튼.
 */
export default function TodoItem({
  task,
  onToggle,
  onChangePriority,
  onDelete,
}: Props) {
  /**
   * 삭제 확인(FR-010). 취소하면 요청 자체를 보내지 않는다.
   * 실행 취소 기능이 범위 밖이라 이 확인이 유일한 안전장치다.
   */
  function handleDelete() {
    const confirmed = window.confirm(
      `"${task.title}"을(를) 삭제할까요? 되돌릴 수 없습니다.`,
    );
    if (confirmed) onDelete(task.id);
  }

  return (
    <li className="flex items-center gap-3 rounded-md border border-black/10 bg-white px-3 py-2 dark:border-white/15 dark:bg-white/5">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id, !task.completed)}
        aria-label={`${task.title} 완료 표시`}
        className="size-4 shrink-0 accent-current"
      />
      <span
        className={`flex-1 text-sm break-all ${
          task.completed ? "text-black/40 line-through dark:text-white/40" : ""
        }`}
      >
        {task.title}
      </span>
      <PrioritySelect
        value={task.priority}
        onChange={(priority) => onChangePriority(task.id, priority)}
        ariaLabel={`${task.title} 중요도`}
      />
      <button
        type="button"
        onClick={handleDelete}
        aria-label={`${task.title} 삭제`}
        className="shrink-0 rounded px-2 py-1 text-xs text-black/45 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-white/45 dark:hover:text-red-400"
      >
        삭제
      </button>
    </li>
  );
}
