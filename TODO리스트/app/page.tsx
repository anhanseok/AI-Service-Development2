import { connection } from "next/server";
import { toTask } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import TodoApp from "./_components/TodoApp";

export default async function Home() {
  // 빌드 시점에 프리렌더되면 목록이 고정된다. 요청 시점에 읽도록 막는다.
  // 근거: node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md
  await connection();

  const rows = await prisma.task.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main className="flex min-h-screen justify-center px-4 py-12 sm:px-6">
      <TodoApp initialTasks={rows.map(toTask)} />
    </main>
  );
}
