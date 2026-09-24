import Link from "next/link";
import { connection } from "next/server";
import { getOperator } from "@/lib/session";
import { listPolls } from "@/lib/db";
import { deadlineLabel, formatKst, isOpen, sortForHome } from "@/lib/poll";

export default async function Home() {
  await connection(); // 요청마다 새로 렌더링 (마감 여부가 시간에 따라 바뀜)
  const now = new Date();
  const [polls, operator] = await Promise.all([
    listPolls().then((list) => sortForHome(list, now)),
    getOperator(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">투표 목록</h1>
        {operator && (
          <Link
            href="/polls/new"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
          >
            + 새 투표 만들기
          </Link>
        )}
      </div>

      {polls.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-500">
          아직 등록된 투표가 없어요.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {polls.map((poll) => {
            const open = isOpen(poll.deadline, now);
            return (
              <li key={poll.id}>
                <Link
                  href={`/polls/${poll.id}`}
                  className={`block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 ${open ? "" : "opacity-60"}`}
                >
                  <p className="font-semibold">{poll.question}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${
                        open ? "bg-blue-100 text-blue-700" : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {deadlineLabel(poll.deadline, now)}
                    </span>
                    <span className="text-zinc-500">마감: {formatKst(poll.deadline)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
