"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "../login/actions";

import type { CalendarSummary } from "@/lib/calendars";

type EventItem = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  createdBy: { email: string };
};

type EventDraft = { id?: string; date: string; startTime: string; endTime: string; title: string };

type Member = { userId: string; email: string; name: string | null; isOwner: boolean };

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toTimeInput(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Combines the form's date + time fields into an absolute instant in the
// viewer's own timezone, which is what the API stores.
function toIso(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
}

// The month's first instant as the viewer's clock sees it. Computed here, not
// on the server, because the server runs in UTC and would shift the boundary.
function monthStart(year: number, month: number) {
  return encodeURIComponent(new Date(year, month, 1).toISOString());
}

export default function CalendarWorkspace({
  userEmail,
  initialCalendars,
}: {
  userEmail: string;
  initialCalendars: CalendarSummary[];
}) {
  const [calendars, setCalendars] = useState<CalendarSummary[]>(initialCalendars);
  const [selectedId, setSelectedId] = useState<string | null>(initialCalendars[0]?.id ?? null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; text: string } | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11

  const loadCalendars = useCallback(async () => {
    const res = await fetch("/api/calendars");
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setCalendars(data.calendars);
  }, []);

  const loadEvents = useCallback(async () => {
    if (!selectedId) {
      setEvents([]);
      return;
    }
    const res = await fetch(`/api/calendars/${selectedId}/events?from=${monthStart(year, month)}&to=${monthStart(year, month + 1)}`);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setEvents(data.events);
  }, [selectedId, year, month]);

  // Re-sync the visible month whenever the calendar or month changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedId) return;
      const res = await fetch(`/api/calendars/${selectedId}/events?from=${monthStart(year, month)}&to=${monthStart(year, month + 1)}`);
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) setError(data.error);
      else setEvents(data.events);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, year, month]);

  const createCalendar = async () => {
    const name = window.prompt("새 캘린더 이름");
    if (!name?.trim()) return;
    const res = await fetch("/api/calendars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    await loadCalendars();
    setSelectedId(data.calendar.id);
  };

  const saveEvent = async () => {
    if (!draft || !selectedId) return;
    if (!draft.title.trim()) return setError("일정 제목을 입력해주세요.");

    const payload = {
      title: draft.title,
      startAt: toIso(draft.date, draft.startTime),
      endAt: toIso(draft.date, draft.endTime),
    };

    const res = draft.id
      ? await fetch(`/api/events/${draft.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch(`/api/calendars/${selectedId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    const data = await res.json();
    if (!res.ok) return setError(data.error);

    setDraft(null);
    setError(null);
    await loadEvents();
  };

  const openMembers = async () => {
    if (!selectedId) return;
    setInviteResult(null);
    setInviteEmail("");
    setMembers([]);
    const res = await fetch(`/api/calendars/${selectedId}/members`);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setMembers(data.members);
  };

  const invite = async () => {
    if (!selectedId || !inviteEmail.trim()) return;
    const res = await fetch(`/api/calendars/${selectedId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await res.json();

    if (!res.ok) return setInviteResult({ ok: false, text: data.error });

    setInviteResult({ ok: true, text: `${data.member.email} 님을 초대했습니다.` });
    setInviteEmail("");
    setMembers((prev) => [...(prev ?? []), data.member]);
    await loadCalendars();
  };

  const deleteEvent = async () => {
    if (!draft?.id) return;
    const res = await fetch(`/api/events/${draft.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setDraft(null);
    await loadEvents();
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, (): number | null => null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1),
  );
  const selected = calendars.find((c) => c.id === selectedId) ?? null;

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const fieldClass =
    "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted";

  return (
    <div className="flex flex-1 min-h-screen">
      <aside className="w-60 border-r border-border bg-surface p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-fg grid place-items-center">📅</div>
          <span className="font-semibold tracking-tight">공유 캘린더</span>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 px-1">내 캘린더</p>
        <div className="space-y-0.5 flex-1">
          {calendars.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                c.id === selectedId
                  ? "bg-primary text-primary-fg font-medium"
                  : "text-foreground hover:bg-hover"
              }`}
            >
              {c.name}
            </button>
          ))}
          {calendars.length === 0 && (
            <p className="text-xs text-muted px-3 py-2">아직 캘린더가 없어요.</p>
          )}
          <button
            onClick={createCalendar}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted hover:bg-hover hover:text-foreground transition-colors"
          >
            + 새 캘린더
          </button>
        </div>

        <div className="border-t border-border pt-3 mt-3 space-y-1.5">
          <p className="text-xs text-muted break-all">{userEmail}</p>
          <form action={signOut}>
            <button className="text-xs text-muted hover:text-danger transition-colors">로그아웃</button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-x-auto">
        {error && (
          <div className="mb-4 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 flex justify-between items-center gap-2">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-muted hover:text-foreground">✕</button>
          </div>
        )}

        {!selected ? (
          <div className="h-full grid place-items-center text-center">
            <div>
              <p className="text-4xl mb-3">🗓️</p>
              <p className="text-sm text-muted">왼쪽에서 캘린더를 만들어 시작하세요.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold tracking-tight">{selected.name}</h2>
              <button
                onClick={openMembers}
                className="text-sm border border-border rounded-lg px-3 py-1.5 hover:bg-hover transition-colors"
              >
                멤버 {selected._count.members}명 · 초대
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="w-8 h-8 grid place-items-center border border-border rounded-lg hover:bg-hover transition-colors"
              >
                ←
              </button>
              <h3 className="font-medium text-lg min-w-32 text-center">
                {year}년 {month + 1}월
              </h3>
              <button
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="w-8 h-8 grid place-items-center border border-border rounded-lg hover:bg-hover transition-colors"
              >
                →
              </button>
              <button
                onClick={() => setViewDate(new Date())}
                className="ml-2 text-sm text-muted hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-hover transition-colors"
              >
                오늘
              </button>
            </div>

            <div className="grid grid-cols-7 gap-px bg-border border border-border rounded-xl overflow-hidden min-w-[560px]">
              {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                <div
                  key={d}
                  className={`text-center text-xs font-medium py-2 bg-surface ${
                    i === 0 ? "text-danger" : i === 6 ? "text-primary" : "text-muted"
                  }`}
                >
                  {d}
                </div>
              ))}
              {cells.map((day, i) => (
                <div
                  key={i}
                  onClick={() =>
                    day &&
                    setDraft({
                      date: toDateInput(new Date(year, month, day)),
                      startTime: "09:00",
                      endTime: "10:00",
                      title: "",
                    })
                  }
                  className={`min-h-24 p-1.5 bg-surface ${
                    day ? "cursor-pointer hover:bg-hover transition-colors" : ""
                  }`}
                >
                  {day && (
                    <div className="flex justify-end mb-1">
                      <span
                        className={`text-xs w-6 h-6 grid place-items-center rounded-full ${
                          isToday(day) ? "bg-primary text-primary-fg font-semibold" : "text-muted"
                        }`}
                      >
                        {day}
                      </span>
                    </div>
                  )}
                  {day &&
                    events
                      .filter((e) => new Date(e.startAt).getDate() === day)
                      .map((e) => (
                        <div
                          key={e.id}
                          title={`${toTimeInput(e.startAt)}–${toTimeInput(e.endAt)} ${e.title} · ${e.createdBy.email}`}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setDraft({
                              id: e.id,
                              date: toDateInput(new Date(e.startAt)),
                              startTime: toTimeInput(e.startAt),
                              endTime: toTimeInput(e.endAt),
                              title: e.title,
                            });
                          }}
                          className="bg-primary/15 text-foreground border-l-2 border-primary text-[11px] rounded px-1.5 py-0.5 mt-0.5 truncate hover:bg-primary/25 transition-colors"
                        >
                          <span className="text-primary font-medium">{toTimeInput(e.startAt)}</span> {e.title}
                        </div>
                      ))}
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {members && (
        <ModalShell title="멤버 초대" onClose={() => setMembers(null)}>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                autoFocus
                type="email"
                className={fieldClass}
                placeholder="초대할 사람의 이메일"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && invite()}
              />
              <button
                onClick={invite}
                className="bg-primary hover:bg-primary-hover text-primary-fg rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors"
              >
                초대
              </button>
            </div>
            {inviteResult && (
              <p className={`text-sm ${inviteResult.ok ? "text-success" : "text-danger"}`}>{inviteResult.text}</p>
            )}
            <p className="text-xs text-muted">이미 가입한 사용자만 초대할 수 있습니다.</p>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm font-medium mb-2">현재 멤버 ({members.length})</p>
            <ul className="text-sm space-y-1.5">
              {members.map((m) => (
                <li key={m.userId} className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-hover grid place-items-center text-xs uppercase">
                    {m.email[0]}
                  </span>
                  <span className="truncate">{m.email}</span>
                  {m.isOwner && (
                    <span className="text-[10px] text-primary border border-primary/40 rounded px-1.5 py-0.5">소유자</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </ModalShell>
      )}

      {draft && (
        <ModalShell title={draft.id ? "일정 수정" : "일정 추가"} onClose={() => setDraft(null)}>
          <input
            autoFocus
            className={fieldClass}
            placeholder="일정 제목"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <label className="block text-xs text-muted">
            날짜
            <input
              type="date"
              className={`${fieldClass} mt-1`}
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-xs text-muted">
              시작 시간
              <input
                type="time"
                className={`${fieldClass} mt-1`}
                value={draft.startTime}
                onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
              />
            </label>
            <label className="flex-1 text-xs text-muted">
              종료 시간
              <input
                type="time"
                className={`${fieldClass} mt-1`}
                value={draft.endTime}
                onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
              />
            </label>
          </div>

          <div className="flex justify-between items-center pt-2">
            {draft.id ? (
              <button onClick={deleteEvent} className="text-danger text-sm hover:underline">
                삭제
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={saveEvent}
              className="bg-primary hover:bg-primary-hover text-primary-fg rounded-lg px-5 py-2 text-sm font-medium transition-colors"
            >
              저장
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface text-foreground border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground w-8 h-8 grid place-items-center rounded-lg hover:bg-hover transition-colors">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
