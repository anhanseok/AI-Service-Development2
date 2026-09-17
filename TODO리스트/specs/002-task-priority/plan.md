# Implementation Plan: 할 일 중요도 (Task Priority)

**Branch**: `002-task-priority` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-task-priority/spec.md`

## Summary

기존 할 일에 High / Medium / Low 세 등급의 중요도를 붙이고, 목록을 중요도 순(같으면 최신순)으로
정렬한다. 추가할 때 고를 수 있고 나중에 바꿀 수도 있다.

기술 접근: Prisma `enum Priority` 를 `Task` 모델에 추가하고 기본값 `MEDIUM` 으로 마이그레이션한다
(기존 행이 자동으로 채워져 FR-112가 마이그레이션만으로 해결된다). 정렬은 DB에서 `createdAt`
내림차순으로 가져온 뒤 서버 코드에서 랭크로 **안정 정렬**해 완성한다. 새 엔드포인트는 만들지
않고 기존 `POST` 와 `PATCH` 를 확장한다. 근거는 [research.md](./research.md) R-101~R-105에 있다.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js 런타임 — 001에서 변경 없음

**Primary Dependencies**: Next.js 16.3.5, React 19.2.8, Tailwind CSS 4, Prisma 6.19.3 —
**새로 추가하는 의존성 없음**

**Storage**: 기존 SQLite `prisma/dev.db`. `Task` 테이블에 `priority TEXT NOT NULL DEFAULT 'MEDIUM'`
컬럼 추가

**Testing**: 001과 동일하게 자동화 테스트 프레임워크 없음(001 R-007). 검증은
[quickstart.md](./quickstart.md) 시나리오 A~E + 001 quickstart 전체(회귀 확인)

**Target Platform**: 변경 없음

**Project Type**: 변경 없음 — 단일 Next.js 웹 애플리케이션

**Performance Goals**: 100건 정렬 목록 2초 이내(SC-104), 중요도 변경 1초 이내 반영(SC-103)

**Constraints**: 001의 제약 유지. 추가로 — 정렬이 결정적이어야 한다(FR-113). 기존 클라이언트를
깨뜨리지 않아야 한다(`priority` 없는 POST 요청이 계속 동작)

**Scale/Scope**: 할 일 100건, 필드 1개 추가, 엔드포인트 2개 확장(신규 0개), 컴포넌트 3개 수정

## Constitution Check

*GATE: Phase 0 이전 통과 필수. Phase 1 설계 후 재확인.*

**Phase 0 이전 평가**

| 헌법 항목 | 판정 | 근거 |
|-----------|------|------|
| I. App Router + TypeScript 단일 스택 | PASS | 기존 파일만 수정. 새 라우트 없음. `.ts`/`.tsx` 유지 |
| II. JSON 응답 통일 | PASS | 새 오류 메시지 2개도 기존 봉투를 그대로 사용 |
| III. any 금지 (NON-NEGOTIABLE) | PASS | Prisma가 `Priority` 타입을 생성. 외부 입력은 `unknown` 에서 좁힘 |
| 기술 스택 제약 — 메이저 버전 유지 | PASS | 버전 변경 없음 |
| 기술 스택 제약 — 스키마 변경 파일 기록 | PASS | `prisma migrate dev` 가 마이그레이션 파일 생성 |
| 기술 스택 제약 — 번들 문서 사전 확인 | PASS | 새 Next.js API를 쓰지 않는다. 001에서 확인한 Promise `params` 규약 유지 |
| 기술 스택 제약 — 새 의존성 사전 검토 | PASS (해당 없음) | 추가 의존성 0개 |
| 개발 워크플로 — Spec Kit 순서 | PASS | specify → plan 진행 중 |
| 개발 워크플로 — lint/build 통과 | 진행 중 | quickstart A단계에서 확인 |

**위반 없음. Phase 0 진행 승인.**

**Phase 1 설계 후 재평가**

| 헌법 항목 | 판정 | 설계에서 확인한 내용 |
|-----------|------|---------------------|
| I. App Router + TypeScript | PASS | 아래 변경 파일 목록에 `pages/`·`.js` 없음 |
| II. JSON 응답 통일 | PASS | [contract](./contracts/tasks-api-priority.md)의 400·404가 모두 기존 JSON 봉투. quickstart P4·P9·P11이 직접 검증 |
| III. any 금지 | PASS | R-101의 enum 선택으로 서버 내부에서 등급이 문자열 리터럴 유니온으로 다뤄진다. 검증 함수가 `unknown` → `Priority` 좁히기를 담당해 `as any` 가 필요한 지점이 없다 |
| 기술 스택 제약 | PASS | enum의 SQLite 지원 여부를 기억이 아니라 `prisma validate` 와 `prisma migrate diff` 실행으로 확인했다(R-101). 추측 API 사용 금지 조항 준수 |
| 개발 워크플로 | PASS | 충돌 시 중단 규칙 유지 |

**설계 후에도 위반 없음.** Complexity Tracking에 기재할 항목 없음.

## Project Structure

### Documentation (this feature)

```text
specs/002-task-priority/
├── plan.md              # 이 파일
├── spec.md              # specify 산출물
├── research.md          # Phase 0 산출물 (R-101~R-105)
├── data-model.md        # Phase 1 산출물
├── quickstart.md        # Phase 1 산출물
├── contracts/
│   └── tasks-api-priority.md   # Phase 1 산출물. 001 계약의 확장분만 기술
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks 산출물 (아직 없음)
```

### Source Code (repository root)

**새 파일 1개**(`PrioritySelect.tsx`)를 제외하면 전부 기존 파일 수정이다.

```text
prisma/
├── schema.prisma               # [수정] enum Priority 추가, Task.priority 필드 추가
└── migrations/                 # [추가] add_priority 마이그레이션 생성됨

lib/
├── types.ts                    # [수정] Priority 타입, Task.priority, 랭크 맵
├── validation.ts               # [수정] parsePriority(V-07), parseTaskPatch(V-08)
├── api.ts                      # [수정] toTask 에 priority 포함, 메시지 2개 추가, 정렬 함수
└── prisma.ts                   # 변경 없음

app/api/tasks/
├── route.ts                    # [수정] GET 정렬 적용, POST priority 선택 입력
└── [id]/route.ts               # [수정] PATCH 부분 수정 방식으로 확장

app/_components/
├── PrioritySelect.tsx          # [추가] 중요도 select. 폼과 목록 항목이 공유한다
├── TodoForm.tsx                # [수정] 중요도 select 추가, 추가 후 기본값 복귀
├── TodoItem.tsx                # [수정] 중요도 select 표시 + 변경
├── TodoSection.tsx             # [수정] onChangePriority 전달
└── TodoApp.tsx                 # [수정] handleChangePriority 추가, handleAdd 시그니처 변경
```

**Structure Decision**: 001의 구조를 그대로 쓴다. 중요도는 별도 모듈로 분리할 만큼 크지 않고,
`Task` 라는 한 엔티티의 속성 하나이므로 기존 파일 안에 자연스럽게 들어간다. 정렬 함수를
`lib/api.ts` 에 두는 이유는 순서가 API 계약의 일부이기 때문이다(R-102) — 라우트 핸들러가
그것을 호출하는 유일한 지점이 된다.

**설계 후 추가된 파일 1개**: 중요도 select 를 추가 폼과 목록 항목 양쪽에서 쓰게 되어
`PrioritySelect.tsx` 로 뽑았다. 같은 마크업을 두 곳에 복제하면 등급 색상·라벨이 어긋날
여지가 생긴다. 계획 시점에는 폼과 항목의 표현이 다를 것으로 보아 예상하지 못했다.

## Complexity Tracking

> Constitution Check에 위반이 없으므로 기재할 항목 없음.
