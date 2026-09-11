import { NextResponse } from "next/server";
import { getCurrentUser, isCalendarMember } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/calendars/:id/events?year=2026&month=9 — 해당 월의 일정
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id: calendarId } = await params;
  if (!(await isCalendarMember(calendarId, user.id))) {
    return NextResponse.json({ error: "이 캘린더에 접근할 권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month")); // 1-12
  if (!year || !month) {
    return NextResponse.json({ error: "year, month 쿼리가 필요합니다." }, { status: 400 });
  }

  const events = await prisma.event.findMany({
    where: {
      calendarId,
      startAt: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      },
    },
    orderBy: { startAt: "asc" },
    include: { createdBy: { select: { email: true } } },
  });

  return NextResponse.json({ events });
}

// POST /api/calendars/:id/events — 일정 생성
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id: calendarId } = await params;
  if (!(await isCalendarMember(calendarId, user.id))) {
    return NextResponse.json({ error: "이 캘린더에 접근할 권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);

  if (!title) return NextResponse.json({ error: "일정 제목을 입력해주세요." }, { status: 400 });
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return NextResponse.json({ error: "시작/종료 시간이 올바르지 않습니다." }, { status: 400 });
  }
  if (endAt < startAt) {
    return NextResponse.json({ error: "종료 시간이 시작 시간보다 빠릅니다." }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: { calendarId, title, startAt, endAt, createdById: user.id },
  });

  return NextResponse.json({ event }, { status: 201 });
}
