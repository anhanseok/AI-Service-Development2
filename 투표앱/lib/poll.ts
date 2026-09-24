// 투표 도메인 모듈: 모든 규칙은 여기 둔다.
// 함수는 일반 데이터와 "현재 시각(now)"만 받는다. DB나 시계를 직접 건드리지 않는다.

export type PollSummary = {
  id: number;
  question: string;
  deadline: Date;
};

const TIME_ZONE = "Asia/Seoul";

export function isOpen(deadline: Date, now: Date): boolean {
  return now.getTime() < deadline.getTime();
}

// 진행 중인 투표는 마감이 가까운 순, 마감된 투표는 최근 마감 순. 진행 중이 항상 먼저.
export function sortForHome<T extends { deadline: Date }>(polls: T[], now: Date): T[] {
  const open = polls
    .filter((p) => isOpen(p.deadline, now))
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  const closed = polls
    .filter((p) => !isOpen(p.deadline, now))
    .sort((a, b) => b.deadline.getTime() - a.deadline.getTime());
  return [...open, ...closed];
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function deadlineLabel(deadline: Date, now: Date): string {
  if (!isOpen(deadline, now)) return "마감됨";
  const left = deadline.getTime() - now.getTime();
  if (left >= DAY) return `마감까지 ${Math.floor(left / DAY)}일 남음`;
  if (left >= HOUR) return `마감까지 ${Math.floor(left / HOUR)}시간 남음`;
  return `마감까지 ${Math.max(1, Math.floor(left / MINUTE))}분 남음`;
}

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

export type PollDraftInput = {
  question: string;
  options: string[];
  deadline: Date | null;
};

export type PollDraft = {
  question: string;
  options: string[];
  deadline: Date;
};

export type DraftResult = { ok: true; draft: PollDraft } | { ok: false; errors: string[] };

// 만들기와 수정에 공통인 검사: 질문, 선택지 2~6개, 빈/중복 선택지, 마감 시간 형식.
// 앞뒤 공백을 지운 값으로 판단한다.
function contentErrors(question: string, labels: string[], deadline: Date | null): string[] {
  const errors: string[] = [];
  if (!question) errors.push("질문을 입력해 주세요.");

  if (labels.length < MIN_OPTIONS) errors.push(`선택지는 최소 ${MIN_OPTIONS}개 필요해요.`);
  if (labels.length > MAX_OPTIONS) errors.push(`선택지는 최대 ${MAX_OPTIONS}개까지 넣을 수 있어요.`);
  if (labels.some((o) => !o)) errors.push("비어 있는 선택지가 있어요.");
  const filled = labels.filter(Boolean);
  if (new Set(filled).size !== filled.length) errors.push("같은 선택지가 두 번 이상 들어 있어요.");

  if (!deadline || Number.isNaN(deadline.getTime())) errors.push("마감 시간을 입력해 주세요.");
  return errors;
}

// 투표 만들기 입력 검사. 앞뒤 공백은 지운 값으로 판단하고 돌려준다.
export function validateNewPoll(input: PollDraftInput, now: Date): DraftResult {
  const question = input.question.trim();
  const options = input.options.map((o) => o.trim());
  const errors = contentErrors(question, options, input.deadline);
  if (input.deadline && !errors.includes("마감 시간을 입력해 주세요.") && !isOpen(input.deadline, now)) {
    errors.push("마감 시간은 지금보다 뒤여야 해요.");
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, draft: { question, options, deadline: input.deadline! } };
}

// 수정 화면에서 온 선택지: 기존 선택지는 id가 있고, 새로 추가한 선택지는 id가 null.
export type OptionEdit = { id: number | null; label: string };

export type PollEditInput = {
  question: string;
  options: OptionEdit[];
  deadline: Date | null;
};

export type PollEditPlan = {
  question: string;
  deadline: Date;
  keep: { id: number; label: string; position: number }[];
  add: { label: string; position: number }[];
  remove: number[];
};

export type EditResult = { ok: true; plan: PollEditPlan } | { ok: false; errors: string[] };

export const OPTIONS_LOCKED_ERROR = "표가 들어온 뒤에는 기존 선택지를 고치거나 지울 수 없어요. 새 선택지 추가만 할 수 있어요.";

// 투표 수정 검사.
// - 질문과 마감 시간은 언제든 바꿀 수 있다(과거로 옮기면 바로 마감, 미래로 옮기면 다시 열림).
// - 표가 없으면 선택지를 자유롭게 고치거나 지울 수 있다.
// - 표가 하나라도 있으면 기존 선택지는 잠기고, 새 선택지 추가만 된다.
export function validatePollEdit(
  current: { options: { id: number; label: string }[]; voteCount: number },
  input: PollEditInput,
): EditResult {
  const question = input.question.trim();
  const options = input.options.map((o) => ({ id: o.id, label: o.label.trim() }));
  const errors = contentErrors(question, options.map((o) => o.label), input.deadline);

  const currentIds = new Set(current.options.map((o) => o.id));
  if (options.some((o) => o.id !== null && !currentIds.has(o.id))) {
    errors.push("이 투표에 없는 선택지가 들어 있어요. 페이지를 새로고침해 주세요.");
  }

  if (current.voteCount > 0) {
    const locked = current.options.some((existing) => {
      const edited = options.find((o) => o.id === existing.id);
      return !edited || edited.label !== existing.label;
    });
    if (locked) errors.push(OPTIONS_LOCKED_ERROR);
  }

  if (errors.length > 0) return { ok: false, errors };

  const keptIds = new Set(options.flatMap((o) => (o.id === null ? [] : [o.id])));
  return {
    ok: true,
    plan: {
      question,
      deadline: input.deadline!,
      keep: options.flatMap((o, position) => (o.id === null ? [] : [{ id: o.id, label: o.label, position }])),
      add: options.flatMap((o, position) => (o.id === null ? [{ label: o.label, position }] : [])),
      remove: current.options.filter((o) => !keptIds.has(o.id)).map((o) => o.id),
    },
  };
}

export type VoteCheck = { ok: true } | { ok: false; error: string };

// 표를 던지거나 바꿀 수 있는지. 새 표와 표 바꾸기는 같은 규칙을 따른다.
export function checkVote(
  poll: { deadline: Date; optionIds: number[] },
  optionId: number | null,
  now: Date,
): VoteCheck {
  if (!isOpen(poll.deadline, now)) return { ok: false, error: "마감된 투표라 더 이상 투표할 수 없어요." };
  if (optionId === null) return { ok: false, error: "선택지를 하나 골라 주세요." };
  if (!poll.optionIds.includes(optionId)) return { ok: false, error: "이 투표에 없는 선택지예요." };
  return { ok: true };
}

// 결과 공개: 운영자는 항상, 마감 후에는 모두, 진행 중에는 표를 던진 투표자만.
export function canSeeResult(viewer: { isOperator: boolean; hasVoted: boolean }, open: boolean): boolean {
  return viewer.isOperator || !open || viewer.hasVoted;
}

export type ResultRow = { id: number; label: string; count: number; percent: number };
export type Result = { total: number; rows: ResultRow[] };

// 선택지 순서를 그대로 유지하고, 표가 0개인 선택지도 포함한다. %는 정수로 반올림.
export function computeResult(
  options: { id: number; label: string }[],
  counts: Record<number, number>,
): Result {
  const rows = options.map((o) => ({ id: o.id, label: o.label, count: counts[o.id] ?? 0 }));
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return {
    total,
    rows: rows.map((r) => ({ ...r, percent: total === 0 ? 0 : Math.round((r.count / total) * 100) })),
  };
}

// <input type="datetime-local"> 값("2026-09-24T18:00")을 한국 시간으로 읽는다.
// 서버가 UTC에서 돌아도 입력한 시각이 KST로 해석된다.
export function parseKstDateTimeLocal(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// 한국 시간 기준 <input type="datetime-local"> 값. 수정 화면의 기본값에 쓴다.
export function toKstDateTimeLocal(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 16);
}

// 예: "2026. 9. 24. 18:00" — 서버 환경(ICU)마다 오전/오후 표기가 달라서 24시간제로 직접 조립한다.
export function formatKst(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}. ${get("month")}. ${get("day")}. ${get("hour")}:${get("minute")}`;
}
