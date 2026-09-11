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
    const res = await fetch(`/api/calendars/${selectedId}/events?year=${year}&month=${month + 1}`);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setEvents(data.events);
  }, [selectedId, year, month]);

  // Re-sync the visible month whenever the calendar or month changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedId) return;
      const res = await fetch(`/api/calendars/${selectedId}/events?year=${year}&month=${month + 1}`);
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

  return (
    <div className="flex flex-1 min-h-screen">
      <aside className="w-56 border-r p-3 flex flex-col">
        <p className="text-xs font-semibold opacity-60 mb-2">내 캘린더</p>
        <div className="space-y-1 flex-1">
          {calendars.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                c.id === selectedId ? "bg-blue-600 text-white" : "hover:bg-black/5"
              }`}
            >
              {c.name}
            </button>
          ))}
          {calendars.length === 0 && <p className="text-xs opacity-50 px-2">캘린더가 없습니다.</p>}
          <button onClick={createCalendar} className="w-full text-left px-2 py-1.5 rounded text-sm opacity-70 hover:bg-black/5">
            + 새 캘린더
          </button>
        </div>
        <div className="border-t pt-3 mt-3 space-y-2">
          <p className="text-xs opacity-60 break-all">{userEmail}</p>
          <form action={signOut}>
            <button className="text-xs opacity-70 underline">로그아웃</button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-4">
        {error && (
          <div className="mb-3 text-sm text-red-600 flex gap-2">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="underline opacity-70">닫기</button>
          </div>
        )}

        {!selected ? (
          <p className="text-sm opacity-70">왼쪽에서 캘린더를 만들어 시작하세요.</p>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <button onClick={openMembers} className="text-sm border rounded px-3 py-1.5">
                멤버 초대 ({selected._count.members})
              </button>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="text-sm px-2 py-1 border rounded">
                ←
              </button>
              <h3 className="font-medium">
                {year}년 {month + 1}월
              </h3>
              <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="text-sm px-2 py-1 border rounded">
                →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-xs">
              {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                <div key={d} className="text-center opacity-60 pb-1">
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
                  className={`border rounded min-h-20 p-1 ${day ? "cursor-pointer hover:bg-black/5" : "opacity-0"}`}
                >
                  {day && <div className="text-right opacity-70">{day}</div>}
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
                          className="bg-blue-600 text-white text-[10px] rounded px-1 mt-0.5 truncate"
                        >
                          <span className="opacity-80">{toTimeInput(e.startAt)}</span> {e.title}
                        </div>
                      ))}
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {members && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40" onClick={() => setMembers(null)}>
          <div className="bg-white text-black rounded-lg p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-lg">멤버 초대</h2>
              <button onClick={() => setMembers(null)} className="opacity-60">✕</button>
            </div>

            <div className="space-y-2">
              <input
                autoFocus
                type="email"
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="초대할 사람의 이메일"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && invite()}
              />
              <button onClick={invite} className="bg-blue-600 text-white rounded px-4 py-2 text-sm">
                초대
              </button>
              {inviteResult && (
                <p className={`text-sm ${inviteResult.ok ? "text-green-600" : "text-red-600"}`}>{inviteResult.text}</p>
              )}
              <p className="text-xs opacity-60">이미 가입한 사용자만 초대할 수 있습니다.</p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">현재 멤버 ({members.length})</p>
              <ul className="text-sm space-y-1">
                {members.map((m) => (
                  <li key={m.userId}>
                    {m.email}
                    {m.isOwner && <span className="text-xs opacity-60"> · 소유자</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40" onClick={() => setDraft(null)}>
          <div className="bg-white text-black rounded-lg p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-lg">{draft.id ? "일정 수정" : "일정 추가"}</h2>
              <button onClick={() => setDraft(null)} className="opacity-60">✕</button>
            </div>

            <input
              autoFocus
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="일정 제목"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
            <label className="block text-xs opacity-70">
              날짜
              <input
                type="date"
                className="w-full border rounded px-3 py-2 text-sm mt-1"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </label>
            <div className="flex gap-3">
              <label className="flex-1 text-xs opacity-70">
                시작 시간
                <input
                  type="time"
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                  value={draft.startTime}
                  onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                />
              </label>
              <label className="flex-1 text-xs opacity-70">
                종료 시간
                <input
                  type="time"
                  className="w-full border rounded px-3 py-2 text-sm mt-1"
                  value={draft.endTime}
                  onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                />
              </label>
            </div>

            <div className="flex justify-between pt-2">
              {draft.id ? (
                <button onClick={deleteEvent} className="text-red-600 text-sm">
                  삭제
                </button>
              ) : (
                <span />
              )}
              <button onClick={saveEvent} className="bg-blue-600 text-white rounded px-4 py-2 text-sm">
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
