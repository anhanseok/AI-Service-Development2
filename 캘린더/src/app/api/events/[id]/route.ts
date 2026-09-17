import { NextResponse } from "next/server";
import { getCurrentUser, isCalendarMember } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function loadEventForUser(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { error: NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 }) };
  if (!(await isCalendarMember(event.calendarId, userId))) {
    return { error: NextResponse.json({ error: "이 일정에 접근할 권한이 없습니다." }, { status: 403 }) };
  }
  return { event };
}

// PATCH /api/events/:id — 일정 수정
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const { error } = await loadEventForUser(id, user.id);
  if (error) return error;

  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);

  if (!title) return NextResponse.json({ error: "일정 제목을 입력해주세요." }, { status: 400 });
  if (title.length > 200) return NextResponse.json({ error: "일정 제목이 너무 깁니다." }, { status: 400 });
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return NextResponse.json({ error: "시작/종료 시간이 올바르지 않습니다." }, { status: 400 });
  }
  if (endAt < startAt) {
    return NextResponse.json({ error: "종료 시간이 시작 시간보다 빠릅니다." }, { status: 400 });
  }

  const event = await prisma.event.update({
    where: { id },
    data: { title, startAt, endAt },
  });

  return NextResponse.json({ event });
}

// DELETE /api/events/:id — 일정 삭제
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const { error } = await loadEventForUser(id, user.id);
  if (error) return error;

  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
