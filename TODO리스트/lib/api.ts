import type { ApiErrorCode, ApiResponse, Priority, Task } from "./types";
import { PRIORITY_RANK } from "./types";

/** DB가 돌려주는 행의 모양. Prisma를 직접 import하지 않고 구조로만 받는다. */
type TaskRow = {
  id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  createdAt: Date;
};

/**
 * DB 행을 API 표현으로 바꾼다.
 * createdAt이 Date에서 ISO 문자열이 되는 지점이다(lib/types.ts의 Task 참고).
 */
export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    priority: row.priority,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * 중요도 순으로 정렬한다(FR-107).
 *
 * 입력은 반드시 createdAt 내림차순으로 **이미 정렬된** 배열이어야 한다.
 * Array.prototype.sort 는 ES2019부터 안정 정렬이 보장되므로, 랭크로만 한 번 더 정렬하면
 * 같은 등급 안에서는 입력 순서(= 최신순)가 그대로 보존된다. 그래서 2차 정렬 기준을
 * 직접 넣지 않는다 — 넣으면 오히려 안정성에 기대는 이 성질이 가려진다(002 R-102).
 *
 * 같은 입력에 대해 항상 같은 출력이 나오므로 FR-113(조회할 때마다 같은 순서)도 만족한다.
 */
export function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  );
}

/**
 * 오류 코드 → HTTP 상태 매핑.
 * contracts/tasks-api.md의 "오류 코드" 표와 일치해야 한다.
 */
const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

/**
 * 사용자에게 그대로 보여줄 수 있는 오류 문구.
 * contracts/tasks-api.md의 표에 적힌 문장을 그대로 쓴다.
 */
export const MESSAGES = {
  TITLE_REQUIRED: "제목을 입력해 주세요.",
  TITLE_TOO_LONG: "제목은 100자까지 입력할 수 있습니다.",
  COMPLETED_INVALID: "완료 여부는 true 또는 false여야 합니다.",
  BAD_REQUEST: "잘못된 요청입니다.",
  ALREADY_DELETED: "이미 삭제된 할 일입니다.",
  PRIORITY_INVALID: "중요도는 HIGH, MEDIUM, LOW 중 하나여야 합니다.",
  NOTHING_TO_UPDATE: "변경할 내용이 없습니다.",
  INTERNAL: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
} as const;

/**
 * 성공 응답. 헌법 원칙 II에 따라 항상 application/json 이다.
 * Response.json() 이 Content-Type 을 자동으로 붙인다.
 */
export function ok<T>(data: T, status: number = 200): Response {
  const body: ApiResponse<T> = { ok: true, data };
  return Response.json(body, { status });
}

/**
 * 실패 응답. 상태 코드가 무엇이든 본문은 JSON 이다.
 * HTML 에러 페이지가 나가는 경로가 있으면 안 된다.
 */
export function fail(code: ApiErrorCode, message: string): Response {
  const body: ApiResponse<never> = { ok: false, error: { code, message } };
  return Response.json(body, { status: STATUS_BY_CODE[code] });
}
