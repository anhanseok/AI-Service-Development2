import { NextResponse } from "next/server";
import { getCurrentUser, isCalendarMember } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/calendars/:id/events?from=<ISO>&to=<ISO> — 구간 내 일정
//
// 범위를 절대 시각으로 받는 이유: 서버에서 new Date(year, month, 1)로 계산하면
// 서버 시간대(Vercel은 UTC)가 기준이 되어, 보는 사람 기준 월초/월말 일정이
// 옆 달로 새어 나간다. 시간대를 아는 쪽은 브라우저뿐이라 거기서 계산해 보낸다.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id: calendarId } = await params;
  if (!(await isCalendarMember(calendarId, user.id))) {
    return NextResponse.json({ error: "이 캘린더에 접근할 권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = new Date(searchParams.get("from") ?? "");
  const to = new Date(searchParams.get("to") ?? "");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "from, to 쿼리(ISO 시각)가 필요합니다." }, { status: 400 });
  }

  const events = await prisma.event.findMany({
    where: {
      calendarId,
      startAt: { gte: from, lt: to },
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
  if (title.length > 200) return NextResponse.json({ error: "일정 제목이 너무 깁니다." }, { status: 400 });
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
