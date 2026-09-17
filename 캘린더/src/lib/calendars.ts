import { prisma } from "@/lib/prisma";

export type CalendarSummary = {
  id: string;
  name: string;
  ownerId: string;
  _count: { members: number; events: number };
};

export function listCalendarsForUser(userId: string): Promise<CalendarSummary[]> {
  return prisma.calendar.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      ownerId: true,
      _count: { select: { members: true, events: true } },
    },
  });
}
