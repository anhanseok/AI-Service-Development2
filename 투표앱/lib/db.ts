// 데이터 접근 계층: Neon SQL만 다룬다. 규칙은 lib/poll.ts에 둔다.
import { neon } from "@neondatabase/serverless";
import type { PollDraft, PollEditPlan, PollSummary } from "./poll";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 환경변수가 없습니다.");
  return neon(url);
}

export type OperatorRecord = {
  id: number;
  loginId: string;
  passwordHash: string;
};

export async function findOperatorByLoginId(loginId: string): Promise<OperatorRecord | null> {
  const rows = await sql()`
    SELECT id, login_id, password_hash FROM operators WHERE login_id = ${loginId}`;
  const r = rows[0];
  if (!r) return null;
  return { id: Number(r.id), loginId: String(r.login_id), passwordHash: String(r.password_hash) };
}

export async function listPolls(): Promise<PollSummary[]> {
  const rows = await sql()`SELECT id, question, deadline FROM polls`;
  return rows.map((r) => ({
    id: Number(r.id),
    question: String(r.question),
    deadline: new Date(r.deadline),
  }));
}

// 투표와 선택지를 한 문장으로 저장한다(중간에 실패하면 둘 다 저장되지 않음).
export async function createPoll(draft: PollDraft): Promise<number> {
  const rows = await sql()`
    WITH new_poll AS (
      INSERT INTO polls (question, deadline)
      VALUES (${draft.question}, ${draft.deadline})
      RETURNING id
    )
    INSERT INTO options (poll_id, label, position)
    SELECT new_poll.id, o.label, o.ord - 1
    FROM new_poll, unnest(${draft.options}::text[]) WITH ORDINALITY AS o(label, ord)
    RETURNING poll_id`;
  return Number(rows[0].poll_id);
}

export type PollDetail = {
  id: number;
  question: string;
  deadline: Date;
  options: { id: number; label: string }[];
};

export async function getPoll(id: number): Promise<PollDetail | null> {
  const db = sql();
  const [polls, options] = await Promise.all([
    db`SELECT id, question, deadline FROM polls WHERE id = ${id}`,
    db`SELECT id, label FROM options WHERE poll_id = ${id} ORDER BY position`,
  ]);
  const p = polls[0];
  if (!p) return null;
  return {
    id: Number(p.id),
    question: String(p.question),
    deadline: new Date(p.deadline),
    options: options.map((o) => ({ id: Number(o.id), label: String(o.label) })),
  };
}

// 이 투표자가 고른 선택지 id. 아직 투표하지 않았으면 null.
export async function getVoterChoice(pollId: number, voterToken: string): Promise<number | null> {
  const rows = await sql()`
    SELECT option_id FROM votes WHERE poll_id = ${pollId} AND voter_token = ${voterToken}`;
  return rows[0] ? Number(rows[0].option_id) : null;
}

// 처음이면 표를 넣고, 이미 있으면 선택지만 바꾼다.
export async function saveVote(pollId: number, optionId: number, voterToken: string): Promise<void> {
  await sql()`
    INSERT INTO votes (poll_id, option_id, voter_token)
    VALUES (${pollId}, ${optionId}, ${voterToken})
    ON CONFLICT (poll_id, voter_token)
    DO UPDATE SET option_id = EXCLUDED.option_id, updated_at = now()`;
}

// 선택지 id → 표 수. 표가 없는 선택지는 빠진다(computeResult가 0으로 채움).
export async function getVoteCounts(pollId: number): Promise<Record<number, number>> {
  const rows = await sql()`
    SELECT option_id, count(*)::int AS count FROM votes WHERE poll_id = ${pollId} GROUP BY option_id`;
  return Object.fromEntries(rows.map((r) => [Number(r.option_id), Number(r.count)]));
}

export async function getVoteTotal(pollId: number): Promise<number> {
  const rows = await sql()`SELECT count(*)::int AS count FROM votes WHERE poll_id = ${pollId}`;
  return Number(rows[0].count);
}

// 수정 계획을 한 트랜잭션으로 반영한다(중간에 실패하면 아무것도 바뀌지 않음).
export async function updatePoll(pollId: number, plan: PollEditPlan): Promise<void> {
  const db = sql();
  await db.transaction([
    db`UPDATE polls SET question = ${plan.question}, deadline = ${plan.deadline}, updated_at = now()
       WHERE id = ${pollId}`,
    // 검사 직후 표가 들어왔을 수 있으니, 표가 없을 때만 지운다.
    db`DELETE FROM options WHERE poll_id = ${pollId} AND id = ANY(${plan.remove}::int[])
       AND NOT EXISTS (SELECT 1 FROM votes WHERE poll_id = ${pollId})`,
    // 순서를 바꿀 때 (poll_id, position) 중복을 피하려고 먼저 임시 위치로 옮긴다.
    db`UPDATE options SET position = position + 1000 WHERE poll_id = ${pollId}`,
    ...plan.keep.map(
      (o) => db`UPDATE options SET label = ${o.label}, position = ${o.position}
                WHERE id = ${o.id} AND poll_id = ${pollId}`,
    ),
    ...plan.add.map(
      (o) => db`INSERT INTO options (poll_id, label, position) VALUES (${pollId}, ${o.label}, ${o.position})`,
    ),
  ]);
}

// 선택지와 표는 ON DELETE CASCADE로 함께 지워진다.
export async function deletePoll(pollId: number): Promise<void> {
  await sql()`DELETE FROM polls WHERE id = ${pollId}`;
}
