import { NextResponse } from "next/server";
import { getCurrentUser, isCalendarMember } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/calendars/:id/members — 멤버 목록
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id: calendarId } = await params;
  if (!(await isCalendarMember(calendarId, user.id))) {
    return NextResponse.json({ error: "이 캘린더에 접근할 권한이 없습니다." }, { status: 403 });
  }

  const calendar = await prisma.calendar.findUnique({
    where: { id: calendarId },
    select: {
      ownerId: true,
      members: {
        orderBy: { createdAt: "asc" },
        select: { userId: true, user: { select: { email: true, name: true } } },
      },
    },
  });

  const members = (calendar?.members ?? []).map((m) => ({
    userId: m.userId,
    email: m.user.email,
    name: m.user.name,
    isOwner: m.userId === calendar?.ownerId,
  }));

  return NextResponse.json({ members });
}

// POST /api/calendars/:id/members — 이메일로 멤버 초대 (가입된 사용자만)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id: calendarId } = await params;
  if (!(await isCalendarMember(calendarId, user.id))) {
    return NextResponse.json({ error: "이 캘린더에 접근할 권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });

  const invitee = await prisma.user.findUnique({ where: { email } });
  if (!invitee) {
    return NextResponse.json({ error: "가입된 사용자만 초대할 수 있습니다." }, { status: 404 });
  }

  if (await isCalendarMember(calendarId, invitee.id)) {
    return NextResponse.json({ error: "이미 이 캘린더의 멤버입니다." }, { status: 409 });
  }

  await prisma.calendarMember.create({ data: { calendarId, userId: invitee.id } });

  return NextResponse.json(
    { member: { userId: invitee.id, email: invitee.email, name: invitee.name, isOwner: false } },
    { status: 201 },
  );
}
