import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Calendars/events hold foreign keys to public.User. The login action mirrors
// the Supabase Auth user there, but a session can outlive that row (or predate
// the sync), so writes that depend on it make sure it exists first.
export async function ensureUserRow(id: string, email: string) {
  await prisma.user.upsert({
    where: { id },
    update: { email },
    create: { id, email },
  });
}

export async function isCalendarMember(calendarId: string, userId: string) {
  const membership = await prisma.calendarMember.findUnique({
    where: { calendarId_userId: { calendarId, userId } },
  });
  return membership !== null;
}
