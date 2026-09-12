import { NextResponse } from "next/server";
import { ensureUserRow, getCurrentUser } from "@/lib/auth";
import { listCalendarsForUser } from "@/lib/calendars";
import { prisma } from "@/lib/prisma";

// GET /api/calendars — 내가 멤버인 캘린더 목록
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  return NextResponse.json({ calendars: await listCalendarsForUser(user.id) });
}

// POST /api/calendars — 캘린더 생성 (생성자는 owner이자 멤버)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "캘린더 이름을 입력해주세요." }, { status: 400 });
  if (name.length > 100) return NextResponse.json({ error: "캘린더 이름이 너무 깁니다." }, { status: 400 });

  await ensureUserRow(user.id, user.email ?? "");

  const calendar = await prisma.calendar.create({
    data: {
      name,
      ownerId: user.id,
      members: { create: { userId: user.id } },
    },
    select: { id: true, name: true, ownerId: true },
  });

  return NextResponse.json({ calendar }, { status: 201 });
}
