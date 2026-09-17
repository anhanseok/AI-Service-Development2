import { MESSAGES } from "./api";
import { DEFAULT_PRIORITY, PRIORITIES, type Priority } from "./types";

/** data-model.md V-03: 앞뒤 공백을 제거한 제목의 최대 길이 */
export const TITLE_MAX_LENGTH = 100;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

/**
 * unknown 을 객체로 좁힌다. any 를 쓰지 않는 검증의 출발점(헌법 원칙 III).
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 요청 본문을 unknown 으로 읽는다.
 * 본문이 비었거나 JSON 이 아니면 undefined 를 돌려주고, 호출한 쪽이 VALIDATION_ERROR 로 처리한다.
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

/**
 * V-01 title 은 문자열
 * V-02 앞뒤 공백 제거 후 길이 1 이상
 * V-03 앞뒤 공백 제거 후 길이 100 이하
 * 통과하면 공백이 제거된 값을 돌려준다(FR-003). 길이는 제거 후 기준으로 센다.
 */
export function parseTitle(body: unknown): ValidationResult<string> {
  if (!isRecord(body)) {
    return { ok: false, message: MESSAGES.TITLE_REQUIRED };
  }

  const { title } = body;
  if (typeof title !== "string") {
    return { ok: false, message: MESSAGES.TITLE_REQUIRED };
  }

  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: MESSAGES.TITLE_REQUIRED };
  }
  if (trimmed.length > TITLE_MAX_LENGTH) {
    return { ok: false, message: MESSAGES.TITLE_TOO_LONG };
  }

  return { ok: true, value: trimmed };
}

/**
 * V-04 completed 는 불리언.
 * 서버가 현재 값을 뒤집지 않고 받은 값을 그대로 적용하므로(R-005) 값 자체가 필요하다.
 */
export function parseCompleted(body: unknown): ValidationResult<boolean> {
  if (!isRecord(body)) {
    return { ok: false, message: MESSAGES.COMPLETED_INVALID };
  }

  const { completed } = body;
  if (typeof completed !== "boolean") {
    return { ok: false, message: MESSAGES.COMPLETED_INVALID };
  }

  return { ok: true, value: completed };
}

/**
 * unknown 문자열을 Priority 로 좁힌다. 대소문자를 구분하므로 "high" 는 거부된다 —
 * 표기가 하나여야 클라이언트마다 다른 형태를 보내는 상황을 막을 수 있다(V-07).
 */
function isPriority(value: unknown): value is Priority {
  return (
    typeof value === "string" && PRIORITIES.includes(value as Priority)
  );
}

/**
 * V-07 (POST 용) 중요도는 선택 입력이다.
 * 없으면 오류가 아니라 기본값 MEDIUM 을 적용한다(FR-103).
 */
export function parseOptionalPriority(
  body: unknown,
): ValidationResult<Priority> {
  if (!isRecord(body)) {
    return { ok: true, value: DEFAULT_PRIORITY };
  }

  const { priority } = body;
  if (priority === undefined) {
    return { ok: true, value: DEFAULT_PRIORITY };
  }
  if (!isPriority(priority)) {
    return { ok: false, message: MESSAGES.PRIORITY_INVALID };
  }

  return { ok: true, value: priority };
}

/** PATCH 로 바꿀 수 있는 항목. 보내지 않은 필드는 바뀌지 않는다(002 R-104). */
export type TaskPatch = {
  completed?: boolean;
  priority?: Priority;
};

/**
 * V-04 + V-07 + V-08 을 한 번에 본다.
 *
 * completed 와 priority 는 각각 선택이지만 최소 하나는 있어야 한다. 빈 객체를 거부하는
 * 이유는, 아무것도 바꾸지 않는 요청이 성공으로 보이면 필드 이름 오타 같은 클라이언트
 * 버그가 조용히 묻히기 때문이다.
 */
export function parseTaskPatch(body: unknown): ValidationResult<TaskPatch> {
  if (!isRecord(body)) {
    return { ok: false, message: MESSAGES.NOTHING_TO_UPDATE };
  }

  const patch: TaskPatch = {};
  const { completed, priority } = body;

  if (completed !== undefined) {
    if (typeof completed !== "boolean") {
      return { ok: false, message: MESSAGES.COMPLETED_INVALID };
    }
    patch.completed = completed;
  }

  if (priority !== undefined) {
    if (!isPriority(priority)) {
      return { ok: false, message: MESSAGES.PRIORITY_INVALID };
    }
    patch.priority = priority;
  }

  if (patch.completed === undefined && patch.priority === undefined) {
    return { ok: false, message: MESSAGES.NOTHING_TO_UPDATE };
  }

  return { ok: true, value: patch };
}

/**
 * V-05 경로 파라미터 id 는 양의 정수.
 * "3.5", "abc", "-1", "" 은 모두 거부한다.
 */
export function parseId(raw: string): ValidationResult<number> {
  if (!/^[0-9]+$/.test(raw)) {
    return { ok: false, message: MESSAGES.BAD_REQUEST };
  }

  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { ok: false, message: MESSAGES.BAD_REQUEST };
  }

  return { ok: true, value: id };
}
