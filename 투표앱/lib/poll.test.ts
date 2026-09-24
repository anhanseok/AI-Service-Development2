import { describe, expect, it } from "vitest";
import {
  canSeeResult,
  checkVote,
  computeResult,
  deadlineLabel,
  formatKst,
  isOpen,
  parseKstDateTimeLocal,
  sortForHome,
  toKstDateTimeLocal,
  validatePollEdit,
  OPTIONS_LOCKED_ERROR,
  validateNewPoll,
  type PollDraftInput,
} from "./poll";

const deadline = new Date("2026-09-24T09:00:00Z"); // KST 18:00
const at = (ms: number) => new Date(deadline.getTime() + ms);

describe("isOpen", () => {
  it("마감 1초 전에는 진행 중", () => {
    expect(isOpen(deadline, at(-1000))).toBe(true);
  });
  it("마감 시간 정각에는 마감됨", () => {
    expect(isOpen(deadline, at(0))).toBe(false);
  });
  it("마감 1초 후에는 마감됨", () => {
    expect(isOpen(deadline, at(1000))).toBe(false);
  });
});

describe("sortForHome", () => {
  const now = new Date("2026-09-24T00:00:00Z");
  const poll = (id: number, iso: string) => ({ id, question: `Q${id}`, deadline: new Date(iso) });

  it("진행 중(마감 가까운 순)이 먼저, 마감됨(최근 마감 순)이 나중", () => {
    const polls = [
      poll(1, "2026-09-20T00:00:00Z"), // 마감됨, 오래전
      poll(2, "2026-09-30T00:00:00Z"), // 진행 중, 먼 마감
      poll(3, "2026-09-23T00:00:00Z"), // 마감됨, 최근
      poll(4, "2026-09-25T00:00:00Z"), // 진행 중, 가까운 마감
    ];
    expect(sortForHome(polls, now).map((p) => p.id)).toEqual([4, 2, 3, 1]);
  });

  it("빈 목록은 빈 목록", () => {
    expect(sortForHome([], now)).toEqual([]);
  });
});

describe("deadlineLabel", () => {
  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;

  it("마감 시간 정각과 이후에는 '마감됨'", () => {
    expect(deadlineLabel(deadline, at(0))).toBe("마감됨");
    expect(deadlineLabel(deadline, at(1000))).toBe("마감됨");
  });
  it("하루 이상 남으면 일 단위", () => {
    expect(deadlineLabel(deadline, at(-(2 * 24 * HOUR + 5 * HOUR)))).toBe("마감까지 2일 남음");
  });
  it("1시간 이상 하루 미만이면 시간 단위", () => {
    expect(deadlineLabel(deadline, at(-(3 * HOUR + 30 * MIN)))).toBe("마감까지 3시간 남음");
  });
  it("1시간 미만이면 분 단위", () => {
    expect(deadlineLabel(deadline, at(-25 * MIN))).toBe("마감까지 25분 남음");
  });
  it("1분 미만이어도 '1분 남음'", () => {
    expect(deadlineLabel(deadline, at(-1000))).toBe("마감까지 1분 남음");
  });
});

describe("formatKst", () => {
  it("UTC 09:00은 한국 시간 18:00", () => {
    expect(formatKst(deadline)).toBe("2026. 9. 24. 18:00");
  });
  it("UTC 15:30은 한국 시간 다음 날 00:30", () => {
    expect(formatKst(new Date("2026-09-24T15:30:00Z"))).toBe("2026. 9. 25. 00:30");
  });
});

describe("validateNewPoll", () => {
  const now = new Date("2026-09-24T00:00:00Z");
  const later = new Date("2026-09-25T00:00:00Z");
  const base = { question: "점심 뭐 먹지?", options: ["짜장", "짬뽕"], deadline: later };
  const errorsOf = (input: Partial<PollDraftInput>) => {
    const result = validateNewPoll({ ...base, ...input }, now);
    return result.ok ? [] : result.errors;
  };
  const options = (n: number) => Array.from({ length: n }, (_, i) => `선택지${i + 1}`);

  it("올바른 입력은 통과하고 앞뒤 공백을 지운 값을 돌려줌", () => {
    const result = validateNewPoll({ ...base, question: "  점심?  ", options: [" 짜장 ", "짬뽕"] }, now);
    expect(result).toEqual({ ok: true, draft: { question: "점심?", options: ["짜장", "짬뽕"], deadline: later } });
  });

  it("선택지 1개는 거부", () => {
    expect(errorsOf({ options: options(1) })).toContain("선택지는 최소 2개 필요해요.");
  });
  it("선택지 2개와 6개는 통과", () => {
    expect(errorsOf({ options: options(2) })).toEqual([]);
    expect(errorsOf({ options: options(6) })).toEqual([]);
  });
  it("선택지 7개는 거부", () => {
    expect(errorsOf({ options: options(7) })).toContain("선택지는 최대 6개까지 넣을 수 있어요.");
  });
  it("빈 선택지(공백만 있는 것 포함)는 거부", () => {
    expect(errorsOf({ options: ["짜장", "   "] })).toContain("비어 있는 선택지가 있어요.");
  });
  it("중복 선택지는 거부(앞뒤 공백 무시)", () => {
    expect(errorsOf({ options: ["짜장", " 짜장"] })).toContain("같은 선택지가 두 번 이상 들어 있어요.");
  });
  it("빈 질문은 거부", () => {
    expect(errorsOf({ question: "  " })).toContain("질문을 입력해 주세요.");
  });
  it("마감 시간이 없으면 거부", () => {
    expect(errorsOf({ deadline: null })).toContain("마감 시간을 입력해 주세요.");
  });
  it("과거나 지금 시각의 마감 시간은 거부", () => {
    expect(errorsOf({ deadline: new Date(now.getTime() - 1000) })).toContain("마감 시간은 지금보다 뒤여야 해요.");
    expect(errorsOf({ deadline: now })).toContain("마감 시간은 지금보다 뒤여야 해요.");
  });
  it("오류가 여러 개면 모두 알려줌", () => {
    expect(errorsOf({ question: "", options: options(1), deadline: null })).toHaveLength(3);
  });
});

describe("parseKstDateTimeLocal", () => {
  it("입력한 시각을 한국 시간으로 해석(KST 18:00 = UTC 09:00)", () => {
    expect(parseKstDateTimeLocal("2026-09-24T18:00")?.toISOString()).toBe("2026-09-24T09:00:00.000Z");
  });
  it("형식이 틀리거나 비어 있으면 null", () => {
    expect(parseKstDateTimeLocal("")).toBeNull();
    expect(parseKstDateTimeLocal("2026-09-24")).toBeNull();
    expect(parseKstDateTimeLocal("2026-13-45T99:99")).toBeNull();
  });
});

describe("checkVote", () => {
  const poll = { deadline, optionIds: [10, 11, 12] };

  it("진행 중이면 표를 던지거나 바꿀 수 있음(마감 1초 전)", () => {
    expect(checkVote(poll, 11, at(-1000))).toEqual({ ok: true });
  });
  it("마감 시간 정각에는 거부", () => {
    expect(checkVote(poll, 11, at(0))).toEqual({ ok: false, error: "마감된 투표라 더 이상 투표할 수 없어요." });
  });
  it("마감 1초 후에는 거부", () => {
    expect(checkVote(poll, 11, at(1000)).ok).toBe(false);
  });
  it("선택지를 고르지 않으면 거부", () => {
    expect(checkVote(poll, null, at(-1000))).toEqual({ ok: false, error: "선택지를 하나 골라 주세요." });
  });
  it("다른 투표의 선택지는 거부", () => {
    expect(checkVote(poll, 99, at(-1000))).toEqual({ ok: false, error: "이 투표에 없는 선택지예요." });
  });
  it("마감된 투표는 선택지와 상관없이 마감 오류가 먼저", () => {
    expect(checkVote(poll, null, at(1000))).toEqual({ ok: false, error: "마감된 투표라 더 이상 투표할 수 없어요." });
  });
});

describe("canSeeResult", () => {
  const operator = { isOperator: true, hasVoted: false };
  const voted = { isOperator: false, hasVoted: true };
  const notVoted = { isOperator: false, hasVoted: false };

  it("진행 중: 운영자와 표를 던진 투표자만 볼 수 있음", () => {
    expect(canSeeResult(operator, true)).toBe(true);
    expect(canSeeResult(voted, true)).toBe(true);
    expect(canSeeResult(notVoted, true)).toBe(false);
  });
  it("마감 후: 모두 볼 수 있음", () => {
    expect(canSeeResult(operator, false)).toBe(true);
    expect(canSeeResult(voted, false)).toBe(true);
    expect(canSeeResult(notVoted, false)).toBe(true);
  });
});

describe("computeResult", () => {
  const options = [
    { id: 1, label: "짜장면" },
    { id: 2, label: "김치찌개" },
    { id: 3, label: "샌드위치" },
  ];

  it("선택지별 표 수와 %, 전체 표 수", () => {
    expect(computeResult(options, { 1: 3, 2: 1 })).toEqual({
      total: 4,
      rows: [
        { id: 1, label: "짜장면", count: 3, percent: 75 },
        { id: 2, label: "김치찌개", count: 1, percent: 25 },
        { id: 3, label: "샌드위치", count: 0, percent: 0 },
      ],
    });
  });
  it("표가 0개인 선택지도 포함하고 선택지 순서를 유지", () => {
    expect(computeResult(options, { 3: 1 }).rows.map((r) => [r.label, r.count])).toEqual([
      ["짜장면", 0],
      ["김치찌개", 0],
      ["샌드위치", 1],
    ]);
  });
  it("전체 0표면 모두 0%(오류 없음)", () => {
    const result = computeResult(options, {});
    expect(result.total).toBe(0);
    expect(result.rows.map((r) => r.percent)).toEqual([0, 0, 0]);
  });
  it("%는 정수로 반올림(1/3 → 33%, 2/3 → 67%)", () => {
    expect(computeResult(options.slice(0, 2), { 1: 1, 2: 2 }).rows.map((r) => r.percent)).toEqual([33, 67]);
  });
  it("다른 선택지의 표 수는 무시", () => {
    expect(computeResult(options, { 1: 1, 99: 5 }).total).toBe(1);
  });
});

describe("validatePollEdit", () => {
  const current = {
    options: [
      { id: 1, label: "짜장면" },
      { id: 2, label: "김치찌개" },
      { id: 3, label: "샌드위치" },
    ],
  };
  const same = current.options.map((o) => ({ ...o }));
  const future = new Date("2030-01-01T00:00:00Z");
  const input = (options: { id: number | null; label: string }[], extra: object = {}) => ({
    question: "점심 뭐 먹지?",
    options,
    deadline: future,
    ...extra,
  });
  const errorsOf = (voteCount: number, i: ReturnType<typeof input>) => {
    const r = validatePollEdit({ ...current, voteCount }, i);
    return r.ok ? [] : r.errors;
  };

  describe("표 0개", () => {
    it("선택지 이름 바꾸기, 삭제, 추가, 순서 바꾸기 모두 가능", () => {
      const r = validatePollEdit(
        { ...current, voteCount: 0 },
        input([{ id: 3, label: "샐러드" }, { id: 1, label: "짜장면" }, { id: null, label: "라면" }]),
      );
      expect(r).toEqual({
        ok: true,
        plan: {
          question: "점심 뭐 먹지?",
          deadline: future,
          keep: [
            { id: 3, label: "샐러드", position: 0 },
            { id: 1, label: "짜장면", position: 1 },
          ],
          add: [{ label: "라면", position: 2 }],
          remove: [2],
        },
      });
    });
    it("지우고 나서도 2~6개 규칙은 지켜야 함", () => {
      expect(errorsOf(0, input([{ id: 1, label: "짜장면" }]))).toContain("선택지는 최소 2개 필요해요.");
    });
  });

  describe("표 1개 이상", () => {
    it("질문과 마감 시간만 바꾸는 건 가능", () => {
      expect(errorsOf(1, input(same, { question: "새 질문" }))).toEqual([]);
    });
    it("기존 선택지 이름 바꾸기는 거부", () => {
      expect(errorsOf(1, input([{ id: 1, label: "짬뽕" }, same[1], same[2]]))).toContain(OPTIONS_LOCKED_ERROR);
    });
    it("기존 선택지 삭제는 거부", () => {
      expect(errorsOf(1, input([same[0], same[1]]))).toContain(OPTIONS_LOCKED_ERROR);
    });
    it("새 선택지 추가는 가능", () => {
      const r = validatePollEdit({ ...current, voteCount: 1 }, input([...same, { id: null, label: "라면" }]));
      expect(r.ok && r.plan.add).toEqual([{ label: "라면", position: 3 }]);
    });
    it("추가해서 6개까지는 가능, 7개는 거부", () => {
      const add = (n: number) => Array.from({ length: n }, (_, i) => ({ id: null, label: `새${i}` }));
      expect(errorsOf(1, input([...same, ...add(3)]))).toEqual([]);
      expect(errorsOf(1, input([...same, ...add(4)]))).toContain("선택지는 최대 6개까지 넣을 수 있어요.");
    });
  });

  describe("마감 시간", () => {
    it("과거로 바꾸는 것도 가능(바로 마감)", () => {
      expect(errorsOf(1, input(same, { deadline: new Date("2020-01-01T00:00:00Z") }))).toEqual([]);
    });
    it("마감된 투표의 마감 시간을 미래로 옮기면 다시 진행 중", () => {
      const now = new Date("2026-09-24T00:00:00Z");
      const r = validatePollEdit({ ...current, voteCount: 5 }, input(same, { deadline: future }));
      expect(r.ok && isOpen(r.plan.deadline, now)).toBe(true);
    });
    it("마감 시간이 없으면 거부", () => {
      expect(errorsOf(0, input(same, { deadline: null }))).toContain("마감 시간을 입력해 주세요.");
    });
  });

  it("다른 투표의 선택지 id는 거부", () => {
    expect(errorsOf(0, input([...same, { id: 99, label: "해킹" }]))).toContain(
      "이 투표에 없는 선택지가 들어 있어요. 페이지를 새로고침해 주세요.",
    );
  });
});

describe("toKstDateTimeLocal", () => {
  it("UTC 09:00 → 한국 시간 입력값 18:00", () => {
    expect(toKstDateTimeLocal(new Date("2026-09-24T09:00:00Z"))).toBe("2026-09-24T18:00");
  });
  it("parseKstDateTimeLocal과 왕복하면 같은 시각", () => {
    const d = new Date("2026-09-24T15:30:00Z");
    expect(parseKstDateTimeLocal(toKstDateTimeLocal(d))?.getTime()).toBe(d.getTime());
  });
});
