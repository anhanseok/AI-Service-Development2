import type { Metadata } from "next";
import Link from "next/link";
import OperatorMenu from "./operator-menu";
import "./globals.css";

export const metadata: Metadata = {
  title: "투표 앱",
  description: "질문을 올리고 투표하고 결과를 보는 간단한 투표 앱",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="text-lg font-bold">
              투표 앱
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-zinc-600">만든 사람: 안한석</span>
              <OperatorMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
