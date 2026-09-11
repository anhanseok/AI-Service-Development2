"use client";

// PROTOTYPE — throwaway UI for wayfinder ticket 02 (shared-calendar).
// Question: what should the calendar workspace layout look like?
// Three structurally different variants, switchable via ?variant=A|B|C
// or the floating bottom bar / arrow keys. New throwaway route (sub-shape B):
// there's no existing calendar page yet to embed variants into.
// Delete this whole route once a variant is picked and folded into real pages.

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type EventItem = { id: string; title: string; day: number; startTime: string; endTime: string };
type Member = { email: string; name: string };
type CalendarData = {
  id: string;
  name: string;
  members: Member[];
  events: EventItem[];
};

const ME = { email: "me@test.com", name: "나" };
// Simulates "가입된 사용자만 초대 가능" — only these emails succeed in the invite modal.
const REGISTERED_EMAILS = ["me@test.com", "friend@test.com", "teammate@test.com"];

const initialCalendars: CalendarData[] = [
  {
    id: "cal-1",
    name: "가족 일정",
    members: [ME, { email: "friend@test.com", name: "친구" }],
    events: [
      { id: "e1", title: "병원 예약", day: 5, startTime: "10:30", endTime: "11:30" },
      { id: "e2", title: "생일 파티", day: 14, startTime: "18:00", endTime: "21:00" },
    ],
  },
  {
    id: "cal-2",
    name: "스터디 그룹",
    members: [ME],
    events: [{ id: "e3", title: "스크럼", day: 8, startTime: "09:00", endTime: "09:30" }],
  },
];

function monthGridInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const label = `${year}년 ${month + 1}월`;
  return { daysInMonth, firstWeekday, label };
}

function useCalendarWorkspace() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [calendars, setCalendars] = useState<CalendarData[]>(initialCalendars);
  const [currentCalendarId, setCurrentCalendarId] = useState(initialCalendars[0].id);
  const [eventModal, setEventModal] = useState<
    { mode: "create"; day: number } | { mode: "edit"; event: EventItem } | null
  >(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const currentCalendar = calendars.find((c) => c.id === currentCalendarId)!;

  const saveEvent = (data: { title: string; day: number; startTime: string; endTime: string }) => {
    setCalendars((prev) =>
      prev.map((c) => {
        if (c.id !== currentCalendarId) return c;
        if (eventModal?.mode === "edit") {
          return { ...c, events: c.events.map((e) => (e.id === eventModal.event.id ? { ...e, ...data } : e)) };
        }
        return { ...c, events: [...c.events, { id: crypto.randomUUID(), ...data }] };
      }),
    );
    setEventModal(null);
  };

  const deleteEvent = () => {
    if (eventModal?.mode !== "edit") return;
    const targetId = eventModal.event.id;
    setCalendars((prev) =>
      prev.map((c) => (c.id === currentCalendarId ? { ...c, events: c.events.filter((e) => e.id !== targetId) } : c)),
    );
    setEventModal(null);
  };

  const inviteMember = (email: string) => {
    setCalendars((prev) =>
      prev.map((c) =>
        c.id === currentCalendarId && !c.members.some((m) => m.email === email)
          ? { ...c, members: [...c.members, { email, name: email.split("@")[0] }] }
          : c,
      ),
    );
  };

  return {
    loggedIn,
    setLoggedIn,
    calendars,
    currentCalendar,
    currentCalendarId,
    setCurrentCalendarId,
    eventModal,
    setEventModal,
    inviteModalOpen,
    setInviteModalOpen,
    saveEvent,
    deleteEvent,
    inviteMember,
  };
}

type Workspace = ReturnType<typeof useCalendarWorkspace>;

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-3 border rounded-lg p-6">
        <h1 className="text-xl font-semibold">공유 캘린더 로그인</h1>
        <p className="text-sm opacity-70">프로토타입입니다 — 아무 값이나 두고 로그인 버튼을 누르세요.</p>
        <input className="w-full border rounded px-3 py-2 text-sm" placeholder="이메일" defaultValue={ME.email} />
        <input className="w-full border rounded px-3 py-2 text-sm" type="password" placeholder="비밀번호" defaultValue="password" />
        <button onClick={onLogin} className="w-full bg-blue-600 text-white rounded px-3 py-2 text-sm">
          로그인
        </button>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40" onClick={onClose}>
      <div
        className="bg-white text-black rounded-lg p-6 w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="opacity-60">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EventModal({
  initial,
  defaultDay,
  onSave,
  onDelete,
  onClose,
}: {
  initial?: EventItem;
  defaultDay?: number;
  onSave: (e: { title: string; day: number; startTime: string; endTime: string }) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [day, setDay] = useState(initial?.day ?? defaultDay ?? 1);
  const [startTime, setStartTime] = useState(initial?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "10:00");
  return (
    <Modal title={initial ? "일정 수정" : "일정 추가"} onClose={onClose}>
      <input
        className="w-full border rounded px-3 py-2 text-sm"
        placeholder="일정 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <label className="block text-xs opacity-70">
        날짜
        <input
          className="w-full border rounded px-3 py-2 text-sm mt-1"
          type="number"
          min={1}
          max={31}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
        />
      </label>
      <div className="flex gap-3">
        <label className="flex-1 text-xs opacity-70">
          시작 시간
          <input
            className="w-full border rounded px-3 py-2 text-sm mt-1"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </label>
        <label className="flex-1 text-xs opacity-70">
          종료 시간
          <input
            className="w-full border rounded px-3 py-2 text-sm mt-1"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </label>
      </div>
      <div className="flex justify-between pt-2">
        {initial && onDelete ? (
          <button onClick={onDelete} className="text-red-600 text-sm">
            삭제
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={() => title.trim() && onSave({ title, day, startTime, endTime })}
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm"
        >
          저장
        </button>
      </div>
    </Modal>
  );
}

function InviteModal({
  members,
  onInvite,
  onClose,
}: {
  members: Member[];
  onInvite: (email: string) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = () => {
    const value = email.trim();
    if (!value) return;
    if (REGISTERED_EMAILS.includes(value)) {
      onInvite(value);
      setMessage({ ok: true, text: `${value} 님을 초대했습니다.` });
      setEmail("");
    } else {
      setMessage({ ok: false, text: "가입된 사용자만 초대할 수 있습니다." });
    }
  };

  return (
    <Modal title="멤버 초대" onClose={onClose}>
      <div className="space-y-2">
        <input
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="이메일로 초대 (예: friend@test.com)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button onClick={submit} className="bg-blue-600 text-white rounded px-4 py-2 text-sm">
          초대
        </button>
        {message && <p className={`text-sm ${message.ok ? "text-green-600" : "text-red-600"}`}>{message.text}</p>}
      </div>
      <div className="pt-4 border-t">
        <p className="text-sm font-medium mb-2">현재 멤버</p>
        <ul className="text-sm space-y-1">
          {members.map((m) => (
            <li key={m.email}>
              {m.name} ({m.email})
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

function MonthGrid({
  calendar,
  onDayClick,
  onEventClick,
}: {
  calendar: CalendarData;
  onDayClick: (day: number) => void;
  onEventClick: (event: EventItem) => void;
}) {
  const { daysInMonth, firstWeekday, label } = monthGridInfo();
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, (): number | null => null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1),
  );
  return (
    <div>
      <h3 className="font-medium mb-2">{label}</h3>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="text-center opacity-60 pb-1">
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={`border rounded min-h-16 p-1 ${day ? "cursor-pointer hover:bg-black/5" : "opacity-0"}`}
            onClick={() => day && onDayClick(day)}
          >
            {day && <div className="text-right opacity-70">{day}</div>}
            {day &&
              calendar.events
                .filter((e) => e.day === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((e) => (
                  <div
                    key={e.id}
                    title={`${e.startTime}–${e.endTime} ${e.title}`}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEventClick(e);
                    }}
                    className="bg-blue-600 text-white text-[10px] rounded px-1 mt-0.5 truncate"
                  >
                    <span className="opacity-80">{e.startTime}</span> {e.title}
                  </div>
                ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Variant A: sidebar list + detail (master-detail, desktop-app feel) ──────
function VariantA({ ws }: { ws: Workspace }) {
  if (!ws.loggedIn) return <LoginScreen onLogin={() => ws.setLoggedIn(true)} />;
  return (
    <div className="flex flex-1">
      <aside className="w-56 border-r p-3 space-y-1">
        <p className="text-xs font-semibold opacity-60 mb-2">내 캘린더</p>
        {ws.calendars.map((c) => (
          <button
            key={c.id}
            onClick={() => ws.setCurrentCalendarId(c.id)}
            className={`w-full text-left px-2 py-1.5 rounded text-sm ${
              c.id === ws.currentCalendarId ? "bg-blue-600 text-white" : "hover:bg-black/5"
            }`}
          >
            {c.name}
          </button>
        ))}
        <button className="w-full text-left px-2 py-1.5 rounded text-sm opacity-40 mt-2" disabled>
          + 새 캘린더 (미구현)
        </button>
      </aside>
      <main className="flex-1 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{ws.currentCalendar.name}</h2>
          <button onClick={() => ws.setInviteModalOpen(true)} className="text-sm border rounded px-3 py-1.5">
            멤버 초대 ({ws.currentCalendar.members.length})
          </button>
        </div>
        <MonthGrid
          calendar={ws.currentCalendar}
          onDayClick={(day) => ws.setEventModal({ mode: "create", day })}
          onEventClick={(event) => ws.setEventModal({ mode: "edit", event })}
        />
      </main>
    </div>
  );
}

// ── Variant B: card dashboard → full-screen detail on click ────────────────
function VariantB({ ws }: { ws: Workspace }) {
  const [view, setView] = useState<"dashboard" | "detail">("dashboard");
  if (!ws.loggedIn) return <LoginScreen onLogin={() => ws.setLoggedIn(true)} />;

  if (view === "dashboard") {
    return (
      <div className="flex-1 p-6">
        <h2 className="text-lg font-semibold mb-4">내 캘린더</h2>
        <div className="grid grid-cols-2 gap-4 max-w-2xl">
          {ws.calendars.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                ws.setCurrentCalendarId(c.id);
                setView("detail");
              }}
              className="border rounded-lg p-4 text-left hover:shadow"
            >
              <p className="font-medium">{c.name}</p>
              <p className="text-xs opacity-60 mt-1">
                {c.members.length}명 참여 · 일정 {c.events.length}개
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <button onClick={() => setView("dashboard")} className="text-sm opacity-70 mb-4">
        ← 캘린더 목록
      </button>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{ws.currentCalendar.name}</h2>
        <button onClick={() => ws.setInviteModalOpen(true)} className="text-sm border rounded px-3 py-1.5">
          멤버 초대
        </button>
      </div>
      <MonthGrid
        calendar={ws.currentCalendar}
        onDayClick={(day) => ws.setEventModal({ mode: "create", day })}
        onEventClick={(event) => ws.setEventModal({ mode: "edit", event })}
      />
    </div>
  );
}

// ── Variant C: horizontal tabs + floating action button (mobile-first) ─────
function VariantC({ ws }: { ws: Workspace }) {
  if (!ws.loggedIn) return <LoginScreen onLogin={() => ws.setLoggedIn(true)} />;
  return (
    <div className="flex-1 flex flex-col relative">
      <div className="flex gap-2 border-b px-4 pt-3">
        {ws.calendars.map((c) => (
          <button
            key={c.id}
            onClick={() => ws.setCurrentCalendarId(c.id)}
            className={`px-3 py-2 text-sm rounded-t ${
              c.id === ws.currentCalendarId ? "border-b-2 border-blue-600 font-medium" : "opacity-60"
            }`}
          >
            {c.name}
          </button>
        ))}
        <button onClick={() => ws.setInviteModalOpen(true)} className="ml-auto text-sm opacity-70 self-center">
          ⚙ 멤버 ({ws.currentCalendar.members.length})
        </button>
      </div>
      <div className="p-4 flex-1">
        <MonthGrid
          calendar={ws.currentCalendar}
          onDayClick={(day) => ws.setEventModal({ mode: "create", day })}
          onEventClick={(event) => ws.setEventModal({ mode: "edit", event })}
        />
      </div>
      <button
        onClick={() => ws.setEventModal({ mode: "create", day: 1 })}
        className="fixed bottom-20 right-6 w-12 h-12 rounded-full bg-blue-600 text-white text-2xl shadow-lg"
      >
        +
      </button>
    </div>
  );
}

const VARIANTS = [
  { key: "A", name: "사이드바 리스트-상세" },
  { key: "B", name: "카드 대시보드" },
  { key: "C", name: "탭 + 플로팅 버튼" },
] as const;

function PrototypeSwitcher({ current, onChange }: { current: string; onChange: (key: string) => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      const idx = VARIANTS.findIndex((v) => v.key === current);
      if (e.key === "ArrowLeft") onChange(VARIANTS[(idx - 1 + VARIANTS.length) % VARIANTS.length].key);
      if (e.key === "ArrowRight") onChange(VARIANTS[(idx + 1) % VARIANTS.length].key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, onChange]);

  if (process.env.NODE_ENV === "production") return null;

  const idx = VARIANTS.findIndex((v) => v.key === current);
  const label = VARIANTS[idx];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-black text-white rounded-full px-4 py-2 shadow-xl text-sm">
      <button onClick={() => onChange(VARIANTS[(idx - 1 + VARIANTS.length) % VARIANTS.length].key)}>←</button>
      <span className="font-medium">
        {label.key} ({label.name})
      </span>
      <button onClick={() => onChange(VARIANTS[(idx + 1) % VARIANTS.length].key)}>→</button>
    </div>
  );
}

function SharedCalendarPrototype() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ws = useCalendarWorkspace();

  const param = searchParams.get("variant");
  const variant = VARIANTS.some((def) => def.key === param) ? param! : "A";
  const changeVariant = (key: string) => router.replace(`?variant=${key}`, { scroll: false });

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-yellow-100 text-yellow-900 text-xs px-4 py-2 border-b">
        🧪 PROTOTYPE — wayfinder 02번 티켓. 로그인은 아무 값이나. 초대는 friend@test.com / teammate@test.com만
        성공(가입자 시뮬레이션), 그 외 이메일은 실패 메시지가 떠요.
      </div>
      {variant === "A" && <VariantA ws={ws} />}
      {variant === "B" && <VariantB ws={ws} />}
      {variant === "C" && <VariantC ws={ws} />}

      {ws.eventModal && (
        <EventModal
          initial={ws.eventModal.mode === "edit" ? ws.eventModal.event : undefined}
          defaultDay={ws.eventModal.mode === "create" ? ws.eventModal.day : undefined}
          onSave={ws.saveEvent}
          onDelete={ws.eventModal.mode === "edit" ? ws.deleteEvent : undefined}
          onClose={() => ws.setEventModal(null)}
        />
      )}
      {ws.inviteModalOpen && (
        <InviteModal
          members={ws.currentCalendar.members}
          onInvite={ws.inviteMember}
          onClose={() => ws.setInviteModalOpen(false)}
        />
      )}

      <PrototypeSwitcher current={variant} onChange={changeVariant} />
    </div>
  );
}

export default function SharedCalendarPrototypePage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense>
      <SharedCalendarPrototype />
    </Suspense>
  );
}
