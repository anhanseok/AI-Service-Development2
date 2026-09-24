import Link from "next/link";
import { notFound } from "next/navigation";
import { getPoll, getVoteCounts, getVoterChoice } from "@/lib/db";
import { canSeeResult, computeResult, deadlineLabel, formatKst, isOpen } from "@/lib/poll";
import { getOperator } from "@/lib/session";
import { getVoterToken } from "@/lib/voter";
import ResultChart from "./result-chart";
import VoteForm from "./vote-form";

export default async function PollPage({ params }: PageProps<"/polls/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const poll = await getPoll(id);
  if (!poll) notFound();

  const [token, operator] = await Promise.all([getVoterToken(), getOperator()]);
  const myChoice = token ? await getVoterChoice(poll.id, token) : null;
  const now = new Date();
  const open = isOpen(poll.deadline, now);
  const showResult = canSeeResult({ isOperator: operator !== null, hasVoted: myChoice !== null }, open);
  const result = showResult ? computeResult(poll.options, await getVoteCounts(poll.id)) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← 투표 목록
        </Link>
        {operator && (
          <Link
            href={`/polls/${poll.id}/edit`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium"
          >
            수정 · 삭제
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{poll.question}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              open ? "bg-blue-100 text-blue-700" : "bg-zinc-200 text-zinc-600"
            }`}
          >
            {deadlineLabel(poll.deadline, now)}
          </span>
          <span className="text-zinc-500">마감: {formatKst(poll.deadline)} (한국 시간)</span>
        </div>
      </div>

      <VoteForm pollId={poll.id} options={poll.options} myChoice={myChoice} open={open} />

      {result ? (
        <ResultChart result={result} myChoice={myChoice} />
      ) : (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-center text-sm text-zinc-500">
          먼저 투표하면 결과를 볼 수 있어요.
        </p>
      )}
    </div>
  );
}
