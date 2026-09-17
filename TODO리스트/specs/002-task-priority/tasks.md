---

description: "Task list for 할 일 중요도 (Task Priority)"
---

# Tasks: 할 일 중요도 (Task Priority)

**Input**: Design documents from `/specs/002-task-priority/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/tasks-api-priority.md](./contracts/tasks-api-priority.md)

**Tests**: 테스트 작업을 포함하지 않는다. 001 R-007의 결정을 그대로 따른다. 검증은
[quickstart.md](./quickstart.md)와 `npm run lint` / `npm run build`로 한다.

**Organization**: 사용자 스토리 단위로 묶었다. 001과 달리 **새로 만드는 파일이 없고 전부 기존
파일 수정**이라, 같은 파일을 건드리는 작업이 많아 `[P]` 표시가 적다.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 다른 파일을 건드리고 선행 작업이 없어 병렬 실행 가능
- **[Story]**: 해당 작업이 속한 사용자 스토리 (US1, US2, US3)
- 모든 작업에 정확한 파일 경로를 적는다

## Path Conventions

001과 동일. 라우트는 `app/`, UI는 `app/_components/`, 서버 헬퍼는 `lib/`, 스키마는 `prisma/`.

---

## Phase 1: Setup (Schema & Migration)

**Purpose**: DB에 `priority` 컬럼을 만들고 기존 할 일이 MEDIUM으로 채워지는 것까지 확인한다.

- [X] T101 `prisma/schema.prisma` 에 `enum Priority { HIGH MEDIUM LOW }` 를 추가하고 `Task` 모델에 `priority Priority @default(MEDIUM)` 필드를 추가한다. data-model.md의 제약을 그대로 따른다 — 세 값만 허용, 기본값 `MEDIUM`, NOT NULL. `title` 등 기존 필드는 건드리지 않는다
- [X] T102 `npx prisma migrate dev --name add_priority` 를 실행한다. 생성된 마이그레이션 SQL에 `"priority" TEXT NOT NULL DEFAULT 'MEDIUM'` 이 포함되는지, 기존 행을 새 테이블로 옮기는 `INSERT ... SELECT` 가 있는지 확인한다(R-103)
- [X] T103 마이그레이션 직후 `curl.exe http://localhost:3000/api/tasks` 로 **기존 할 일이 모두 `"priority":"MEDIUM"` 으로 나오는지** 확인한다. 이 확인은 데이터를 지우기 전에 해야 한다 — 빈 DB에서는 FR-112를 검증할 수 없다

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 타입·검증·직렬화·정렬. **이 단계가 끝나기 전에는 어떤 스토리도 시작할 수 없다.**

- [X] T104 [P] `lib/types.ts` 에 중요도 타입 추가 — `Priority = "HIGH" | "MEDIUM" | "LOW"`, `Task` 에 `priority: Priority` 필드 추가, 정렬용 랭크 맵 `PRIORITY_RANK`(`HIGH`:1, `MEDIUM`:2, `LOW`:3)와 화면 표기 맵(`높음`/`보통`/`낮음`)을 data-model.md의 표 그대로 정의한다
- [X] T105 [P] `lib/validation.ts` 에 검증 함수 추가 — V-07 `parsePriority`: 값이 `"HIGH"`, `"MEDIUM"`, `"LOW"` 중 하나인지 확인하며 **대소문자를 구분한다**(`"high"` 는 거부). `unknown` 에서 좁히며 `any` 를 쓰지 않는다. V-08: PATCH 본문에 `completed` 와 `priority` 중 최소 하나가 있는지 확인하는 함수를 함께 만든다. POST에서 `priority` 가 없는 것은 오류가 아니라 `MEDIUM` 적용이다(FR-103)
- [X] T106 `lib/api.ts` 의 `toTask` 에 `priority` 를 포함시키고, `MESSAGES` 에 두 문구를 contracts 표 그대로 추가한다 — `중요도는 HIGH, MEDIUM, LOW 중 하나여야 합니다.`, `변경할 내용이 없습니다.`
- [X] T107 `lib/api.ts` 에 정렬 함수 `sortByPriority` 를 추가한다. **`createdAt` 내림차순으로 이미 정렬된 배열**을 받아 `PRIORITY_RANK` 로만 한 번 더 정렬한다. `Array.prototype.sort` 가 안정 정렬이므로 같은 등급 안에서는 최신순이 그대로 보존된다 — 2차 정렬 기준을 직접 넣지 않는다(R-102, FR-108, FR-113)

---

## Phase 3: User Story 1 - 급한 일을 위로 올리기 (Priority: P1) 🎯 MVP

**Goal**: 목록이 중요도 순(같으면 최신순)으로 정렬되어 보인다.

**Independent Test**: 서로 다른 중요도의 할 일을 DB에 직접 넣거나 API로 만든 뒤, `GET /api/tasks`
응답이 `HIGH → MEDIUM → LOW` 순인지 확인한다. 화면에서 고르는 기능(US2) 없이도 검증된다.

### Implementation for User Story 1

- [X] T108 [US1] `app/api/tasks/route.ts` 의 `GET` 핸들러에 정렬을 적용한다. `findMany` 의 `orderBy: { createdAt: "desc" }` 는 그대로 두고, 결과를 `sortByPriority` 에 통과시킨 뒤 응답한다. 정렬은 서버가 책임진다 — 클라이언트는 받은 순서를 그대로 쓴다(R-102, FR-107, FR-109)
- [X] T109 [P] [US1] `app/_components/TodoItem.tsx` 에 현재 중요도를 표시한다. 세 등급이 서로 구별되게 보여야 한다(FR-110). 변경 컨트롤은 US3에서 붙인다

**Checkpoint**: 목록이 중요도 순으로 정렬되고 각 항목에 등급이 보인다. 아직 등급을 고르거나
바꿀 수는 없어 전부 MEDIUM이다.

---

## Phase 4: User Story 2 - 추가할 때 중요도 고르기 (Priority: P2)

**Goal**: 할 일을 추가하면서 세 등급 중 하나를 고를 수 있다.

**Independent Test**: 추가 폼에서 HIGH를 골라 할 일을 만든 뒤 그 할 일이 HIGH로 저장되고 목록
맨 위 묶음에 나타나는지 확인한다.

### Implementation for User Story 2

- [X] T110 [US2] `app/api/tasks/route.ts` 의 `POST` 핸들러에 `priority` 선택 입력을 추가한다. 본문에 있으면 T105의 검증을 거치고, **없으면 검증 실패가 아니라 `MEDIUM` 을 적용한다**(FR-103). `priority` 없는 요청이 계속 동작해야 기존 클라이언트가 깨지지 않는다
- [X] T111 [US2] `app/_components/TodoForm.tsx` 에 중요도 `select` 를 추가한다. 기본 선택은 "보통"(`MEDIUM`)이고, **추가에 성공하면 제목 입력과 함께 기본값으로 되돌린다**(FR-104). 실패하면 사용자가 고른 값을 유지한다
- [X] T112 [US2] `app/_components/TodoApp.tsx` 의 `handleAdd` 가 제목과 함께 중요도를 받아 `POST /api/tasks` 본문에 실어 보내도록 시그니처를 바꾼다

**Checkpoint**: 중요도를 골라 추가할 수 있고, 고른 등급에 맞는 위치에 나타난다.

---

## Phase 5: User Story 3 - 나중에 중요도 바꾸기 (Priority: P3)

**Goal**: 이미 만든 할 일의 중요도를 바꿀 수 있다.

**Independent Test**: 목록의 LOW 항목을 HIGH로 바꾼 뒤 HIGH 묶음으로 이동하는지, 화면을 새로
열어도 유지되는지 확인한다.

### Implementation for User Story 3

- [X] T113 [US3] `app/api/tasks/[id]/route.ts` 의 `PATCH` 를 부분 수정 방식으로 확장한다. `completed` 와 `priority` 를 각각 선택으로 받되 **최소 하나는 있어야 한다**(V-08, 없으면 `변경할 내용이 없습니다.`). 보내지 않은 필드는 바꾸지 않는다. 기존의 Promise `params` 규약과 404 처리는 그대로 유지한다(R-104, FR-105, FR-106)
- [X] T114 [US3] `app/_components/TodoItem.tsx` 의 중요도 표시를 `select` 로 바꿔 그 자리에서 변경할 수 있게 한다. 표시와 변경을 한 요소가 겸한다(R-105). 키보드로 조작 가능해야 한다
- [X] T115 [US3] `app/_components/TodoSection.tsx` 가 `onChangePriority` 를 `TodoItem` 에 전달하도록 props를 추가한다
- [X] T116 [US3] `app/_components/TodoApp.tsx` 에 `handleChangePriority` 를 추가한다. 기존 `send` 헬퍼를 재사용해 `PATCH /api/tasks/{id}` 에 `{ priority }` 만 보내고, 실패 시 안내와 목록 재동기화는 `send` 가 이미 처리한다(FR-111, FR-114)

**Checkpoint**: 세 스토리가 모두 동작한다.

---

## Phase 6: Polish & Validation

- [X] T117 `npm run lint` 를 통과시킨다. React Compiler 규칙(effect 안 setState 금지)에 걸리지 않는지 특히 확인한다 — 001에서 이 규칙에 한 번 걸렸다
- [X] T118 `npm run build` 를 통과시킨다
- [X] T119 [quickstart.md](./quickstart.md) 의 B(API), **B-정렬(S1~S3)**, C(화면), D(다중 탭), E(성능)를 실행한다. **S2(같은 등급 안에서 최신순 유지)와 C7(완료 항목의 중요도 변경이 구역을 넘지 않음)이 핵심 검증 지점이다**
- [X] T120 001의 [quickstart.md](../001-todo-management/quickstart.md) 시나리오 B·C·D를 다시 실행해 **회귀가 없는지** 확인한다. 특히 B9(정렬)는 이제 FR-108 규칙으로 바뀌었으므로 001 기준이 아니라 002 기준으로 판정한다

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (스키마·마이그레이션)
      ↓
Phase 2 (타입·검증·정렬)  ← 여기까지 끝나야 스토리 시작 가능
      ↓
Phase 3 (US1, P1) ─── 정렬 동작 시작
      ↓
Phase 4 (US2, P2)
      ↓
Phase 5 (US3, P3)
      ↓
Phase 6 (검증)
```

### User Story Dependencies

- **US1**: Phase 2 완료 외에 선행 스토리 없음. 정렬만으로 단독 검증 가능
- **US2**: US1이 없어도 저장은 되지만, 정렬이 없으면 고른 값의 효과가 보이지 않는다
- **US3**: US1의 `TodoItem` 중요도 표시를 `select` 로 교체하므로 US1이 선행돼야 한다

### Within Each User Story

- 라우트 핸들러(T108, T110, T113)와 컴포넌트(T109, T111, T114)는 서로 독립이다
- `TodoApp.tsx`(T112, T116)는 조각을 모으는 지점이라 각 스토리의 마지막이다
- 같은 파일을 고치는 작업은 병렬 불가 — T108과 T110(둘 다 `app/api/tasks/route.ts`),
  T109와 T114(둘 다 `TodoItem.tsx`), T106과 T107(둘 다 `lib/api.ts`)이 여기 해당한다

### Parallel Opportunities

- Phase 2: T104와 T105 (`types.ts` / `validation.ts`). T106·T107은 같은 `api.ts` 라 순차
- Phase 3: T108과 T109 (라우트 / 컴포넌트)

001에 비해 병렬 구간이 좁다. 새 파일을 만드는 대신 기존 파일을 고치는 기능이기 때문이다.

## Implementation Strategy

### MVP First (User Story 1 Only)

T101~T109까지 9개 작업이면 정렬이 동작한다. 다만 등급을 고를 수단이 없어 전부 MEDIUM이라,
이 기능에서는 US2까지 가야 사용자에게 의미가 생긴다. **실질 MVP는 T101~T112.**

### Incremental Delivery

1. Phase 1~2 (T101~T107): 기반 — 화면 변화 없음
2. Phase 3 (T108~T109): 정렬 + 등급 표시
3. Phase 4 (T110~T112): **실질 사용 가능 지점**
4. Phase 5 (T113~T116): 사후 변경
5. Phase 6 (T117~T120): 검증 + 회귀 확인

### 작업량 가늠

전체 20개 작업. 001(27개)보다 작고, 새 파일이 없어 각 작업의 크기도 작다.

## Notes

- FR/SC/T 번호를 100번대로 시작해 001과 겹치지 않게 했다
- T120(회귀 확인)을 빠뜨리지 않는다. 정렬 규칙이 바뀌었으므로 001의 기존 동작이 깨지기 쉽다
- 코드를 쓰기 전에 `node_modules/next/dist/docs/` 의 해당 문서를 확인한다(헌법 기술 스택 제약)
