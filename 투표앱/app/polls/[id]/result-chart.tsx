import type { Result } from "@/lib/poll";

type Props = { result: Result; myChoice: number | null };

// 가로 막대 그래프: 선택지 이름이 길어도 읽기 쉽고 휴대폰에서도 잘 보인다.
export default function ResultChart({ result, myChoice }: Props) {
  const top = Math.max(...result.rows.map((r) => r.count));

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">결과</h2>
        <span className="text-sm text-zinc-500">총 {result.total}표</span>
      </div>

      <ul className="flex flex-col gap-3">
        {result.rows.map((r) => {
          const leading = r.count > 0 && r.count === top;
          return (
            <li key={r.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={leading ? "font-bold" : ""}>
                  {r.label}
                  {r.id === myChoice && <span className="ml-2 text-xs font-medium text-blue-600">내 선택</span>}
                </span>
                <span className="shrink-0 tabular-nums text-zinc-600">
                  {r.count}표 · {r.percent}%
                </span>
              </div>
              <div
                className="h-3 w-full overflow-hidden rounded-full bg-zinc-100"
                role="img"
                aria-label={`${r.label} ${r.count}표 ${r.percent}%`}
              >
                <div
                  className={`h-full rounded-full ${leading ? "bg-blue-600" : "bg-blue-300"}`}
                  style={{ width: `${r.percent}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {result.total === 0 && <p className="text-center text-sm text-zinc-500">아직 표가 없어요.</p>}
    </section>
  );
}
