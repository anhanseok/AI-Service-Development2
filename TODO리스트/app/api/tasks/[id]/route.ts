import { fail, MESSAGES, ok, toTask } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { parseId, parseTaskPatch, readJsonBody } from "@/lib/validation";

/**
 * Next.js 16에서는 두 번째 인자의 params가 Promise다. await 없이 구조 분해하면 동작하지 않는다.
 * 근거: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md:82
 */
type Context = {
  params: Promise<{ id: string }>;
};

/**
 * PATCH /api/tasks/{id}
 *
 * 완료 여부와 중요도를 바꾼다. 둘 다 선택이지만 최소 하나는 있어야 한다(V-08).
 * 보내지 않은 필드는 바뀌지 않는다 — PATCH 의 부분 수정 규약이다(002 R-104).
 *
 * 서버가 현재 값을 뒤집지 않고 요청받은 값을 그대로 적용하므로 같은 요청을 여러 번 보내도
 * 결과가 같다(001 R-005). 다중 탭 환경에서 중요한 성질이다.
 */
export async function PATCH(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const { id: rawId } = await params;

  const id = parseId(rawId);
  if (!id.ok) {
    return fail("VALIDATION_ERROR", id.message);
  }

  const body = await readJsonBody(request);
  const patch = parseTaskPatch(body);
  if (!patch.ok) {
    return fail("VALIDATION_ERROR", patch.message);
  }

  const existing = await prisma.task.findUnique({ where: { id: id.value } });
  if (existing === null) {
    // 다른 탭에서 먼저 삭제한 경우 정상적으로 도달하는 경로다(FR-014, 002 FR-114).
    return fail("NOT_FOUND", MESSAGES.ALREADY_DELETED);
  }

  try {
    const updated = await prisma.task.update({
      where: { id: id.value },
      data: patch.value,
    });
    return ok(toTask(updated));
  } catch {
    return fail("INTERNAL_ERROR", MESSAGES.INTERNAL);
  }
}

/**
 * DELETE /api/tasks/{id}
 *
 * 영구 삭제한다. 되돌릴 수 없다.
 * 삭제 전 사용자 확인(FR-010)은 클라이언트가 처리하며, 취소하면 이 요청 자체가 오지 않는다.
 */
export async function DELETE(
  _request: Request,
  { params }: Context,
): Promise<Response> {
  const { id: rawId } = await params;

  const id = parseId(rawId);
  if (!id.ok) {
    return fail("VALIDATION_ERROR", id.message);
  }

  const existing = await prisma.task.findUnique({ where: { id: id.value } });
  if (existing === null) {
    return fail("NOT_FOUND", MESSAGES.ALREADY_DELETED);
  }

  try {
    await prisma.task.delete({ where: { id: id.value } });
    return ok({ id: id.value });
  } catch {
    return fail("INTERNAL_ERROR", MESSAGES.INTERNAL);
  }
}
