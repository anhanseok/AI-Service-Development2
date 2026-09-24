"use server";

import { redirect } from "next/navigation";
import { createPoll, deletePoll, getPoll, getVoteTotal, updatePoll } from "@/lib/db";
import { parseKstDateTimeLocal, validateNewPoll, validatePollEdit, type OptionEdit } from "@/lib/poll";
import { requireOperator } from "@/lib/session";

export type NewPollValues = { question: string; options: string[]; deadline: string };
export type NewPollState = { errors: string[]; values: NewPollValues } | undefined;

export async function createPollAction(_prev: NewPollState, formData: FormData): Promise<NewPollState> {
  await requireOperator(); // 운영자가 아니면 로그인 화면으로 보냄

  const values: NewPollValues = {
    question: String(formData.get("question") ?? ""),
    options: formData.getAll("option").map(String),
    deadline: String(formData.get("deadline") ?? ""),
  };

  const result = validateNewPoll(
    { question: values.question, options: values.options, deadline: parseKstDateTimeLocal(values.deadline) },
    new Date(),
  );
  if (!result.ok) return { errors: result.errors, values };

  await createPoll(result.draft);
  redirect("/");
}

export type EditPollValues = { question: string; options: OptionEdit[]; deadline: string };
export type EditPollState = { errors: string[]; values: EditPollValues } | undefined;

export async function updatePollAction(_prev: EditPollState, formData: FormData): Promise<EditPollState> {
  await requireOperator();

  const pollId = Number(formData.get("pollId"));
  const poll = Number.isInteger(pollId) ? await getPoll(pollId) : null;
  if (!poll) redirect("/");

  // 선택지는 optionId(기존이면 id, 새로 추가면 빈 값)와 optionLabel이 같은 순서로 온다.
  const ids = formData.getAll("optionId").map(String);
  const labels = formData.getAll("optionLabel").map(String);
  const values: EditPollValues = {
    question: String(formData.get("question") ?? ""),
    options: labels.map((label, i) => ({ id: ids[i] ? Number(ids[i]) : null, label })),
    deadline: String(formData.get("deadline") ?? ""),
  };

  const result = validatePollEdit(
    { options: poll.options, voteCount: await getVoteTotal(poll.id) },
    { question: values.question, options: values.options, deadline: parseKstDateTimeLocal(values.deadline) },
  );
  if (!result.ok) return { errors: result.errors, values };

  await updatePoll(poll.id, result.plan);
  redirect(`/polls/${poll.id}`);
}

export async function deletePollAction(formData: FormData): Promise<void> {
  await requireOperator();
  const pollId = Number(formData.get("pollId"));
  if (Number.isInteger(pollId)) await deletePoll(pollId);
  redirect("/");
}
