import { getCurrentUser } from "@/lib/auth";
import { listCalendarsForUser } from "@/lib/calendars";
import CalendarWorkspace from "./workspace";

export default async function CalendarsPage() {
  // Middleware already redirects anonymous visitors, so a user is present here.
  const user = (await getCurrentUser())!;
  const calendars = await listCalendarsForUser(user.id);

  return <CalendarWorkspace userEmail={user.email ?? ""} initialCalendars={calendars} />;
}
