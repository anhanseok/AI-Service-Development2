Part of: map.md
Type: task
Blocked by: 02, 04, 05
Status: resolved

## Question

캘린더/일정 CRUD를 API Routes + UI로 구현한다.

체크리스트:
- API Routes: 캘린더 생성/조회, 일정 생성/조회/수정/삭제
- UI: 캘린더 목록 페이지, 캘린더 상세(월간 뷰), 일정 생성/수정 모달 (02번 프로토타입 반영)
- 권한 체크: 본인이 멤버인 캘린더만 조회/수정 가능

## Answer

캘린더/일정 CRUD 구현 완료. 브라우저에서 캘린더 생성 → 일정 추가/수정/삭제 → 월 이동까지 동작 확인.

API Routes (강의자료의 CRUD 엔드포인트 방식):
- `GET /api/calendars` — 내가 멤버인 캘린더 목록
- `POST /api/calendars` — 생성 (생성자를 owner이자 CalendarMember로 함께 등록)
- `GET /api/calendars/:id/events?year=&month=` — 해당 월 일정
- `POST /api/calendars/:id/events` — 일정 생성
- `PATCH /api/events/:id`, `DELETE /api/events/:id` — 수정/삭제

화면: `src/app/calendars/page.tsx`(서버, 초기 캘린더 목록 조회) + `workspace.tsx`(클라이언트). 02번에서 고른 Variant A 그대로 — 좌측 사이드바 캘린더 목록, 우측 월간 뷰. 일정은 `시작시간 + 제목`으로 표시하고 시작시간순 정렬. 날짜 칸 클릭 → 추가 모달(날짜 프리필), 일정 클릭 → 수정/삭제 모달. 프로토타입에 없던 이전/다음 달 이동 추가(없으면 이번 달 밖 일정을 볼 방법이 없음).

검증 (테스트 계정 2개로 API 직접 호출):
- 비로그인 → 401
- 본인 캘린더 CRUD 전부 정상, 종료<시작 입력은 400으로 거부
- **남의 캘린더 일정 조회/수정/삭제 시도 → 전부 403**, 목록에도 노출 안 됨

구현 중 알게 된 것:
1. **Supabase Auth 계정만 있고 `public.User` 행이 없으면 캘린더 생성이 500**(외래키 위반). 로그인 액션이 동기화하지만 세션이 그 행보다 오래 살 수 있어, `ensureUserRow()`를 `POST /api/calendars`에서도 호출하도록 방어. 일정 생성은 멤버십 확인이 선행되므로 이미 안전.
2. ESLint `react-hooks/set-state-in-effect` — effect에서 데이터 로딩 함수를 호출하면 잡힘. 초기 목록은 서버 컴포넌트에서 props로 내려주고, 월 변경 시 재조회만 effect(취소 플래그 포함)로 남겨 해결. 같은 이유로 프로토타입 라우트의 variant 처리도 `useSearchParams` + Suspense로 교체.
3. 시간은 브라우저 로컬 타임존 기준으로 `date + time`을 합쳐 ISO로 보내고 DB엔 UTC 저장. 타임존이 다른 멤버 간 표시 차이는 08번(통합 테스트)에서 확인할 것.

**디자인/스타일링은 범위 밖** — 기본 테두리와 버튼만 있는 상태.
