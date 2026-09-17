---

description: "Task list for 할 일 관리 (Todo Management)"
---

# Tasks: 할 일 관리 (Todo Management)

**Input**: Design documents from `/specs/001-todo-management/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/tasks-api.md](./contracts/tasks-api.md)

**Tests**: 테스트 작업을 포함하지 않는다. 스펙에 테스트 요구가 없고 헌법에도 테스트 원칙이 없다(R-007).
검증은 [quickstart.md](./quickstart.md)의 수동 시나리오와 `npm run lint` / `npm run build`로 한다.

**Organization**: 사용자 스토리 단위로 묶었다. 각 스토리 단계가 끝날 때마다 그 자체로 동작하는
증분이 나온다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일을 건드리고 선행 작업이 없어 병렬 실행 가능
- **[Story]**: 해당 작업이 속한 사용자 스토리 (US1, US2, US3)
- 모든 작업에 정확한 파일 경로를 적는다

## Path Conventions

단일 Next.js 프로젝트 구조다(plan.md의 Structure Decision). 라우트는 `app/`, 라우팅되지 않는
UI는 `app/_components/`, 서버 헬퍼는 `lib/`, DB 스키마는 `prisma/`에 둔다.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prisma와 SQLite를 붙여 `dev.db` 파일이 실제로 생기는 상태까지 만든다.

- [X] T001 `npm install prisma --save-dev` 와 `npm install @prisma/client` 를 실행해 의존성을 `package.json` 에 추가
- [X] T002 [P] 저장소 루트에 `.env` 파일을 만들고 `DATABASE_URL="file:./dev.db"` 한 줄만 작성
- [X] T003 [P] `.gitignore` 에 `dev.db`, `dev.db-journal`, `*.db` 를 추가해 DB 파일이 커밋되지 않게 설정
- [X] T004 `prisma/schema.prisma` 에 datasource(provider `sqlite`, url `env("DATABASE_URL")`)와 `Task` 모델 작성. 필드 제약은 data-model.md를 그대로 따른다 — `id`: `Int` PK 자동 증가, `title`: `String` 필수, `completed`: `Boolean` 기본값 `false`, `createdAt`: `DateTime` 기본값 현재 시각. `title` 에 고유 제약을 두지 않는다(FR-015가 제목 중복을 허용한다)
- [X] T005 `npx prisma migrate dev --name init` 을 실행해 `prisma/migrations/` 와 `dev.db` 를 생성하고, 생성된 마이그레이션 SQL이 `Task` 테이블을 만드는지 확인

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 스토리가 공통으로 쓰는 DB 접근·응답 형식·입력 검증. **이 단계가 끝나기 전에는
어떤 스토리도 시작할 수 없다.**

- [X] T006 [P] `lib/prisma.ts` 에 `PrismaClient` 단일 인스턴스를 만들어 export. 개발 중 모듈이 다시 로드돼도 인스턴스가 중복 생성되지 않도록 `globalThis` 에 보관하는 방식을 쓴다
- [X] T007 [P] `lib/api.ts` 에 응답 봉투 헬퍼 작성 — 성공은 `{ ok: true, data }`, 실패는 `{ ok: false, error: { code, message } }`. 오류 코드 `VALIDATION_ERROR`→400, `NOT_FOUND`→404, `INTERNAL_ERROR`→500 매핑을 포함하고, 모든 응답을 `Response.json()` 으로 반환해 `application/json` 을 보장한다(헌법 원칙 II). 오류 메시지 문구는 contracts/tasks-api.md 표에 적힌 한국어 문장을 그대로 쓴다
- [X] T008 [P] `lib/validation.ts` 에 입력 검증 함수 작성. 요청 본문을 `unknown` 으로 받아 좁히며 `any` 를 쓰지 않는다(헌법 원칙 III). data-model.md의 규칙을 그대로 구현 — V-01 `title` 은 문자열, V-02 앞뒤 공백 제거 후 길이 1 이상, V-03 앞뒤 공백 제거 후 길이 100 이하, V-04 `completed` 는 불리언, V-05 경로 `id` 는 양의 정수로 파싱. 길이는 공백 제거 후 기준으로 센다
- [X] T009 [P] `lib/types.ts` 에 클라이언트가 쓰는 타입 정의 — `Task`(`id: number`, `title: string`, `completed: boolean`, `createdAt: string` — JSON 직렬화 후 ISO 문자열이므로 `Date` 가 아니다)와 API 응답 판별 유니온 타입

---

## Phase 3: User Story 1 - 할 일 기록하고 확인하기 (Priority: P1) 🎯 MVP

**Goal**: 제목을 입력해 할 일을 남기고, 화면을 다시 열어도 그 목록이 그대로 보인다.

**Independent Test**: 할 일을 추가한 뒤 목록에 나타나는지 확인하고, 브라우저를 닫았다 다시 열어
그대로 남아 있는지 확인한다. 완료 토글·삭제 없이도 "적어두는 메모"로 동작한다.

### Implementation for User Story 1

- [X] T010 [US1] `app/api/tasks/route.ts` 에 `GET` 핸들러 구현. `createdAt` 내림차순 단일 배열을 `{ ok: true, data: [...] }` 로 반환하고, 빈 목록은 `[]` 로 정상 응답한다(FR-006, FR-007, FR-012). 이 파일에 `export const dynamic = 'force-static'` 같은 캐시 옵션을 넣지 않는다 — 폴링이 동작하지 않게 된다
- [X] T011 [US1] `app/api/tasks/route.ts` 에 `POST` 핸들러 구현. 본문 `{ title }` 을 T008 검증에 통과시키고, 앞뒤 공백을 제거한 값으로 저장한 뒤 201과 생성된 Task를 반환한다. `completed` 는 항상 `false` 로 시작하며 요청에서 받지 않는다(FR-001~FR-005, FR-015). 본문이 유효한 JSON이 아니면 `VALIDATION_ERROR` 로 처리
- [X] T012 [P] [US1] `app/_components/TodoForm.tsx` 작성. 제목 입력과 추가 버튼. 제출 시 상위에서 받은 핸들러를 호출하고 성공하면 입력란을 비운다
- [X] T013 [P] [US1] `app/_components/TodoItem.tsx` 작성. Task 한 건의 제목을 표시한다(완료 토글·삭제는 US2·US3에서 추가)
- [X] T014 [P] [US1] `app/_components/TodoSection.tsx` 작성. 구역 제목과 Task 배열을 받아 `TodoItem` 목록을 그리고, 배열이 비었으면 그 구역이 비어 있다는 안내를 표시한다(FR-012)
- [X] T015 [US1] `app/_components/TodoApp.tsx` 작성. 최상단에 `'use client'` 를 선언하고 목록 상태를 관리한다. 첫 렌더에 `GET /api/tasks` 를 호출해 목록을 채우고, `TodoForm` 의 추가 요청을 `POST /api/tasks` 로 보낸 뒤 목록을 갱신한다. 미완료 구역을 위, 완료 구역을 아래로 두 개의 `TodoSection` 을 렌더한다(FR-006)
- [X] T016 [US1] `app/page.tsx` 를 `TodoApp` 을 렌더하도록 교체하고, create-next-app 기본 랜딩 내용을 제거

**Checkpoint**: 이 시점에서 할 일을 추가하고 목록에서 확인할 수 있다. 개발 서버를 껐다 켜도
데이터가 남아 있다.

---

## Phase 4: User Story 2 - 완료 여부 표시하기 (Priority: P2)

**Goal**: 각 할 일의 완료 표시를 켜고 끌 수 있고, 항목이 해당 구역으로 이동한다.

**Independent Test**: 목록에 있는 할 일의 완료 표시를 켰다 끄고, 화면을 새로 열어도 그 상태가
유지되는지 확인한다.

### Implementation for User Story 2

- [X] T017 [US2] `app/api/tasks/[id]/route.ts` 를 만들고 `PATCH` 핸들러 구현. **Next.js 16에서는 두 번째 인자의 `params` 가 Promise이므로 `{ params }: { params: Promise<{ id: string }> }` 로 받아 `await` 한 뒤 사용한다**(R-003, 번들 문서 `route.md:82`). 본문 `{ completed }` 값을 그대로 적용하며 서버가 현재 값을 뒤집지 않는다(R-005). 대상이 없으면 404 `NOT_FOUND` 를 JSON으로 반환(FR-014)
- [X] T018 [US2] `app/_components/TodoItem.tsx` 에 완료 토글 컨트롤 추가. 완료된 항목은 시각적으로 구분되게 표시하고, 토글 시 상위 핸들러에 `id` 와 바꿀 `completed` 값을 함께 전달한다
- [X] T019 [US2] `app/_components/TodoApp.tsx` 에 토글 핸들러 추가. `PATCH /api/tasks/{id}` 호출 후 목록을 갱신하고, `completed` 값으로 두 구역을 나눠 배치한다. 전체가 최신순으로 정렬돼 있으므로 각 구역 내부 순서는 별도 정렬 없이 최신순이 된다(R-008, FR-007, FR-008)

**Checkpoint**: 완료 표시를 켜면 항목이 완료 구역으로 내려가고, 끄면 미완료 구역으로 돌아온다.

---

## Phase 5: User Story 3 - 필요 없어진 할 일 지우기 (Priority: P3)

**Goal**: 할 일을 영구 삭제할 수 있고, 삭제 전에 확인을 받는다.

**Independent Test**: 특정 할 일을 삭제한 뒤 목록에서 사라지고 화면을 새로 열어도 돌아오지 않는지,
확인을 취소하면 그대로 남는지 확인한다.

### Implementation for User Story 3

- [X] T020 [US3] `app/api/tasks/[id]/route.ts` 에 `DELETE` 핸들러 추가. T017과 같은 Promise `params` 규약을 따른다. 성공 시 `{ ok: true, data: { id } }` 를 반환하고, 대상이 없으면 404 `NOT_FOUND`(FR-009, FR-014)
- [X] T021 [US3] `app/_components/TodoItem.tsx` 에 삭제 버튼 추가. **확인 단계는 클라이언트에서 처리하며, 사용자가 취소하면 요청 자체를 보내지 않는다**(FR-010, contracts의 DELETE 절)
- [X] T022 [US3] `app/_components/TodoApp.tsx` 에 삭제 핸들러 추가. `DELETE /api/tasks/{id}` 호출 후 목록을 갱신한다

**Checkpoint**: 세 가지 스토리가 모두 동작한다. 스펙의 기능 요구사항 중 자동 갱신(FR-016)과
실패 처리(FR-013)만 남는다.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 세 스토리 전체에 걸치는 요구사항과 완료 조건. **선택 사항이 아니다** — FR-013과
FR-016은 스펙의 기능 요구사항이다.

- [X] T023 `app/_components/TodoApp.tsx` 에 폴링 추가. 5초 간격으로 `GET /api/tasks` 를 호출해 목록을 갱신한다. `document.visibilityState` 가 `hidden` 이면 멈추고, 다시 보이면 즉시 한 번 조회한 뒤 재개한다. 컴포넌트가 언마운트될 때 타이머를 정리한다(FR-016, SC-006, R-006)
- [X] T024 `app/_components/TodoApp.tsx` 에 실패 처리 추가. 응답의 `ok` 가 `false` 면 `error.message` 를 사용자에게 보여주고, 곧바로 목록을 다시 조회해 화면을 실제 저장 상태와 일치시킨다. 404 `NOT_FOUND` 는 다른 탭에서 먼저 삭제한 정상 경로이므로 오류로 요란하게 다루지 않는다(FR-013, FR-014)
- [X] T025 `npm run lint` 를 실행해 통과시킨다. `any` 사용이나 미사용 변수가 남아 있으면 여기서 걸린다(헌법 원칙 III, 개발 워크플로)
- [X] T026 `npm run build` 를 실행해 통과시킨다. 타입 오류가 있으면 여기서 걸린다
- [X] T027 [quickstart.md](./quickstart.md) 의 시나리오 B(API), C(화면), D(다중 탭), E(Prisma Studio로 실제 저장 확인), F(성능 — SC-002, SC-005)를 순서대로 실행하고 결과를 확인한다. **B3·B11(실패 응답이 JSON인지)과 D2(다른 탭에서 삭제된 항목 조작)가 핵심 검증 지점이다**

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup)
      ↓
Phase 2 (Foundational) ← 여기까지 끝나야 스토리 시작 가능
      ↓
Phase 3 (US1, P1) ─── MVP 완성 지점
      ↓
Phase 4 (US2, P2)
      ↓
Phase 5 (US3, P3)
      ↓
Phase 6 (Polish)
```

### User Story Dependencies

- **US1**: Phase 2 완료 외에 선행 스토리 없음. 단독으로 배포 가능한 MVP
- **US2**: US1의 `TodoApp`·`TodoItem` 이 있어야 토글을 붙일 수 있다
- **US3**: US1의 `TodoApp`·`TodoItem` 이 있어야 한다. US2와는 서로 독립이라 순서를 바꿔도 된다

### Within Each User Story

- 라우트 핸들러(T010·T011, T017, T020)와 표시용 컴포넌트(T012~T014, T018, T021)는 서로 독립이다
- `TodoApp.tsx`(T015, T019, T022, T023, T024)는 모든 조각을 모으는 지점이라 항상 마지막이다
- 같은 파일을 고치는 작업은 병렬 불가 — T010과 T011(둘 다 `app/api/tasks/route.ts`),
  T017과 T020(둘 다 `app/api/tasks/[id]/route.ts`)이 여기 해당한다

### Parallel Opportunities

- Phase 1: T002, T003 (서로 다른 파일)
- Phase 2: T006, T007, T008, T009 — 네 파일이 모두 독립이다. 가장 큰 병렬 구간
- Phase 3: T012, T013, T014 (컴포넌트 세 개가 서로 독립)

## Parallel Example: Phase 2

```text
# 네 파일을 동시에 작성 가능:
T006 lib/prisma.ts
T007 lib/api.ts
T008 lib/validation.ts
T009 lib/types.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

T001~T016까지 16개 작업이면 "할 일을 적고 다시 볼 수 있는" 제품이 나온다. 여기서 멈춰도
사용자에게 줄 가치가 있다.

### Incremental Delivery

1. Phase 1~2 (T001~T009): 기반 — 아직 화면에 보이는 것은 없다
2. Phase 3 (T010~T016): **MVP 배포 가능**
3. Phase 4 (T017~T019): 완료 관리 추가
4. Phase 5 (T020~T022): 정리 수단 추가
5. Phase 6 (T023~T027): 다중 탭 갱신·실패 처리·검증

### 작업량 가늠

전체 27개 작업. Phase 1~2가 설정 위주라 빠르고, Phase 3이 가장 무겁다.

## Notes

- `[P]` 는 파일이 겹치지 않는 경우에만 붙였다. 같은 파일을 여러 작업이 고치면 병렬로 돌릴 수 없다
- 각 Checkpoint에서 `npm run dev` 로 실제 동작을 확인하면 문제를 일찍 발견할 수 있다
- 코드를 쓰기 전에 `node_modules/next/dist/docs/` 의 해당 문서를 확인한다(헌법 기술 스택 제약)
