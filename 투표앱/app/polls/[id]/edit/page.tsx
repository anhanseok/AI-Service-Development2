import Link from "next/link";
import { notFound } from "next/navigation";
import { getPoll, getVoteTotal } from "@/lib/db";
import { toKstDateTimeLocal } from "@/lib/poll";
import { requireOperator } from "@/lib/session";
import DeletePollButton from "./delete-poll-button";
import EditPollForm from "./edit-poll-form";

export default async function EditPollPage({ params }: PageProps<"/polls/[id]/edit">) {
  await requireOperator();

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const poll = await getPoll(id);
  if (!poll) notFound();
  const voteCount = await getVoteTotal(poll.id);

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/polls/${poll.id}`} className="text-sm text-zinc-500 hover:underline">
        ← 투표로 돌아가기
      </Link>
      <h1 className="text-2xl font-bold">투표 수정</h1>

      <EditPollForm
        pollId={poll.id}
        voteCount={voteCount}
        initial={{
          question: poll.question,
          options: poll.options.map((o) => ({ id: o.id, label: o.label })),
          deadline: toKstDateTimeLocal(poll.deadline),
        }}
      />

      <section className="flex flex-col gap-2 rounded-lg border border-red-200 bg-white p-5">
        <h2 className="font-bold text-red-700">투표 삭제</h2>
        <p className="text-sm text-zinc-600">
          선택지와 표 {voteCount}개가 함께 지워지고 되돌릴 수 없어요.
        </p>
        <DeletePollButton pollId={poll.id} question={poll.question} />
      </section>
    </div>
  );
}
