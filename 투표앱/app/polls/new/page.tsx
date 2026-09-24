import { requireOperator } from "@/lib/session";
import NewPollForm from "./new-poll-form";

export default async function NewPollPage() {
  await requireOperator();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">새 투표 만들기</h1>
      <NewPollForm />
    </div>
  );
}
