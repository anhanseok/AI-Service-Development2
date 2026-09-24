"use server";

import { revalidatePath } from "next/cache";
import { getPoll, saveVote } from "@/lib/db";
import { checkVote } from "@/lib/poll";
import { getOrCreateVoterToken } from "@/lib/voter";

export type VoteState = { error?: string; saved?: boolean } | undefined;

export async function castVote(_prev: VoteState, formData: FormData): Promise<VoteState> {
  const pollId = Number(formData.get("pollId"));
  const poll = Number.isInteger(pollId) ? await getPoll(pollId) : null;
  if (!poll) return { error: "이 투표는 삭제되었거나 없어요." };

  const raw = formData.get("optionId");
  const optionId = raw === null || raw === "" ? null : Number(raw);

  // 페이지를 마감 전에 열었더라도, 판단은 요청이 도착한 서버 시각으로 한다.
  const check = checkVote(
    { deadline: poll.deadline, optionIds: poll.options.map((o) => o.id) },
    Number.isInteger(optionId) ? optionId : null,
    new Date(),
  );
  if (!check.ok) return { error: check.error };

  const token = await getOrCreateVoterToken();
  await saveVote(poll.id, optionId!, token);
  revalidatePath(`/polls/${poll.id}`);
  return { saved: true };
}
