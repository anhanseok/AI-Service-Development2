/**
 * 클라이언트와 서버가 공유하는 타입.
 * 계약 정의는 specs/001-todo-management/contracts/tasks-api.md 참고.
 */

/** 중요도 3단계. 저장·전송 표기는 대문자 하나로 고정한다(002 data-model.md). */
export type Priority = "HIGH" | "MEDIUM" | "LOW";

/** 값 검증과 select 목록에 함께 쓰는 단일 출처 */
export const PRIORITIES: readonly Priority[] = ["HIGH", "MEDIUM", "LOW"];

export const DEFAULT_PRIORITY: Priority = "MEDIUM";

/**
 * 정렬용 랭크. 작을수록 위에 온다(FR-107).
 * 저장하지 않고 정렬할 때만 쓴다(002 R-102).
 */
export const PRIORITY_RANK: Record<Priority, number> = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/** 화면 표기 */
export const PRIORITY_LABEL: Record<Priority, string> = {
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

/**
 * API를 통해 오가는 Task 표현.
 * DB의 createdAt은 DateTime이지만 JSON 직렬화를 거치면 ISO 문자열이 되므로
 * 여기서는 Date가 아니라 string이다.
 */
export type Task = {
  id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  createdAt: string;
};

/** 삭제 성공 시 반환되는 최소 payload */
export type DeletedTask = {
  id: number;
};

export type ApiErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
};

/**
 * 모든 응답의 형태. ok 하나로 분기가 끝난다(헌법 원칙 II).
 * 판별 유니온이라 ok === true 분기 안에서는 data가, false 분기에서는 error가 좁혀진다.
 */
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };
