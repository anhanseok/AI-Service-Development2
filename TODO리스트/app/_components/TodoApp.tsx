"use client";

import { useCallback, useEffect, useState } from "react";
import { MESSAGES } from "@/lib/api";
import type { ApiResponse, Priority, Task } from "@/lib/types";
import TodoForm from "./TodoForm";
import TodoSection from "./TodoSection";

/** SC-006이 요구하는 "5초 이내 반영"을 만족시키는 폴링 주기 */
const POLL_INTERVAL_MS = 5000;

/**
 * 할 일 화면 전체를 묶는 컴포넌트.
 * 목록 상태를 한 곳에서 들고 있고, 자식은 표시와 입력만 맡는다.
 */
type Props = {
  /** 서버 컴포넌트가 첫 렌더에 넘겨주는 목록. 클라이언트 초기 조회가 필요 없다. */
  initialTasks: Task[];
};

export default function TodoApp({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [message, setMessage] = useState<string | null>(null);

  /**
   * 목록을 서버 상태로 맞춘다.
   * 조회가 실패하면 화면에 있던 목록을 그대로 두고 조용히 넘어간다 — 폴링이 5초 뒤 다시 시도한다.
   */
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks");
      const body: ApiResponse<Task[]> = await response.json();
      if (body.ok) {
        setTasks(body.data);
      }
    } catch {
      // 네트워크 오류. 다음 폴링에서 회복된다.
    }
  }, []);

  /**
   * 목록 자동 갱신(FR-016, SC-006).
   * 5초마다 다시 조회하되, 탭이 보이지 않으면 멈추고 돌아왔을 때 즉시 한 번 조회한 뒤 재개한다.
   * 추가 인프라 없이 다중 탭 동기화를 만족시키는 방식이다(R-006).
   */
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      stop();
      timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stop();
      } else {
        void refresh();
        start();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  /**
   * 변경 요청 하나를 보내고 결과를 화면에 반영한다(FR-013).
   *
   * 성공이든 실패든 끝나면 반드시 목록을 다시 조회한다. 다른 탭에서 이미 지운 항목을
   * 건드렸을 때(404 NOT_FOUND) 화면이 틀린 상태로 남지 않게 하는 지점이다(FR-014).
   */
  const send = useCallback(
    async (url: string, init: RequestInit): Promise<boolean> => {
      try {
        const response = await fetch(url, init);
        const body: ApiResponse<unknown> = await response.json();

        if (!body.ok) {
          setMessage(body.error.message);
          return false;
        }

        setMessage(null);
        return true;
      } catch {
        setMessage(MESSAGES.INTERNAL);
        return false;
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  /** 할 일 추가(FR-001). 성공 여부를 폼에 돌려줘 입력란을 비울지 결정하게 한다. */
  const handleAdd = useCallback(
    (title: string, priority: Priority): Promise<boolean> =>
      send("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, priority }),
      }),
    [send],
  );

  /** 중요도 변경(FR-105). 보내지 않은 필드는 서버에서 바뀌지 않는다(002 R-104). */
  const handleChangePriority = useCallback(
    (id: number, priority: Priority): void => {
      void send(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
    },
    [send],
  );

  /** 완료 여부 전환(FR-008). 바꿀 값을 명시적으로 보낸다(R-005). */
  const handleToggle = useCallback(
    (id: number, completed: boolean): void => {
      void send(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
    },
    [send],
  );

  /** 삭제(FR-009). 사용자 확인은 TodoItem에서 이미 받은 뒤 호출된다(FR-010). */
  const handleDelete = useCallback(
    (id: number): void => {
      void send(`/api/tasks/${id}`, { method: "DELETE" });
    },
    [send],
  );

  // 서버가 중요도 순 → 최신순으로 이미 정렬해 보낸다. 나누기만 하면 각 구역 안에서도
  // 같은 순서가 유지된다(002 FR-109, R-102).
  const active = tasks.filter((task) => !task.completed);
  const done = tasks.filter((task) => task.completed);

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">할 일</h1>
      </header>

      <TodoForm onAdd={handleAdd} />

      {message !== null && (
        <p
          role="status"
          className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
        >
          {message}
        </p>
      )}

      <TodoSection
        title="해야 할 일"
        tasks={active}
        emptyMessage="아직 할 일이 없습니다. 위에서 추가해 보세요."
        onToggle={handleToggle}
        onChangePriority={handleChangePriority}
        onDelete={handleDelete}
      />

      <TodoSection
        title="완료"
        tasks={done}
        emptyMessage="완료한 일이 아직 없습니다."
        onToggle={handleToggle}
        onChangePriority={handleChangePriority}
        onDelete={handleDelete}
      />
    </div>
  );
}
