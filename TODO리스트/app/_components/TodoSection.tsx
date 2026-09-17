"use client";

import type { Priority, Task } from "@/lib/types";
import TodoItem from "./TodoItem";

type Props = {
  title: string;
  tasks: Task[];
  /** 이 구역에 항목이 하나도 없을 때 보여줄 문구(FR-012) */
  emptyMessage: string;
  onToggle: (id: number, completed: boolean) => void;
  onChangePriority: (id: number, priority: Priority) => void;
  onDelete: (id: number) => void;
};

/**
 * 미완료 또는 완료 구역 하나를 그린다(FR-006).
 * 배열이 비면 목록 대신 안내 문구를 보여준다.
 */
export default function TodoSection({
  title,
  tasks,
  emptyMessage,
  onToggle,
  onChangePriority,
  onDelete,
}: Props) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">
        {title} <span className="font-normal">({tasks.length})</span>
      </h2>

      {tasks.length === 0 ? (
        <p className="rounded-md border border-dashed border-black/15 px-3 py-6 text-center text-sm text-black/40 dark:border-white/20 dark:text-white/40">
          {emptyMessage}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TodoItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onChangePriority={onChangePriority}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
