import { fail, MESSAGES, ok, sortByPriority, toTask } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  parseOptionalPriority,
  parseTitle,
  readJsonBody,
} from "@/lib/validation";

/**
 * GET /api/tasks
 *
 * 중요도 순(HIGH→MEDIUM→LOW), 같은 등급 안에서는 최신순으로 정렬한 단일 배열을 반환한다
 * (002 FR-107, FR-108 — 001의 FR-007을 대체).
 *
 * DB에서 createdAt 내림차순으로 가져온 뒤 랭크로 안정 정렬하는 두 단계다. 정렬은 API 계약의
 * 일부라 서버가 책임진다. 미완료/완료 구역 분리만 클라이언트가 completed 값으로 나눈다.
 * 빈 목록은 오류가 아니라 빈 배열이다(FR-012).
 *
 * 이 파일에 캐시 옵션(export const dynamic = 'force-static' 등)을 추가하면
 * 폴링이 갱신되지 않는다. Route Handler는 기본적으로 캐시되지 않는다.
 */
export async function GET(): Promise<Response> {
  try {
    const rows = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
    });
    return ok(sortByPriority(rows.map(toTask)));
  } catch {
    return fail("INTERNAL_ERROR", MESSAGES.INTERNAL);
  }
}

/**
 * POST /api/tasks
 *
 * 새 Task를 만든다. 제목은 앞뒤 공백을 제거한 값으로 저장하고(FR-003),
 * completed는 요청에서 받지 않으며 항상 false로 시작한다(FR-005).
 * 기존 Task와 제목이 같아도 정상 생성한다(FR-015).
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);

  const title = parseTitle(body);
  if (!title.ok) {
    return fail("VALIDATION_ERROR", title.message);
  }

  // priority 는 선택 입력이다. 없으면 MEDIUM 이 적용되므로 priority 를 보내지 않는
  // 기존 클라이언트가 그대로 동작한다(FR-103).
  const priority = parseOptionalPriority(body);
  if (!priority.ok) {
    return fail("VALIDATION_ERROR", priority.message);
  }

  try {
    const created = await prisma.task.create({
      data: { title: title.value, priority: priority.value },
    });
    return ok(toTask(created), 201);
  } catch {
    return fail("INTERNAL_ERROR", MESSAGES.INTERNAL);
  }
}
