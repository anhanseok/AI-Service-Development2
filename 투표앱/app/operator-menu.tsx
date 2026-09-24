import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { getOperator } from "@/lib/session";

// 헤더 오른쪽: 로그인 전에는 "운영자 로그인", 로그인 후에는 아이디와 로그아웃 버튼
export default async function OperatorMenu() {
  const operator = await getOperator();

  if (!operator) {
    return (
      <Link href="/login" className="text-zinc-500 underline-offset-2 hover:underline">
        운영자 로그인
      </Link>
    );
  }

  return (
    <form action={logout} className="flex items-center gap-2">
      <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
        {operator.loginId}
      </span>
      <button type="submit" className="text-zinc-500 underline-offset-2 hover:underline">
        로그아웃
      </button>
    </form>
  );
}
