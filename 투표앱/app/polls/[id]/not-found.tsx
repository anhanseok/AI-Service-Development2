import Link from "next/link";

export default function PollNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
      <h1 className="text-xl font-bold">투표를 찾을 수 없어요</h1>
      <p className="text-zinc-500">삭제되었거나 잘못된 주소예요.</p>
      <Link href="/" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
        투표 목록으로
      </Link>
    </div>
  );
}
