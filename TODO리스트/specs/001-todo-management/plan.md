# Implementation Plan: 할 일 관리 (Todo Management)

**Branch**: `001-todo-management` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-todo-management/spec.md`

## Summary

사용자가 할 일을 추가·조회·완료 전환·삭제할 수 있고, 그 결과가 로컬 SQLite 파일에 남아
화면을 다시 열어도 유지되는 기능이다. 화면은 미완료 구역과 완료 구역으로 나뉘며, 여러 탭에
열어둔 경우 5초 이내에 서로의 변경이 반영된다.

기술 접근: Next.js 16 App Router의 Route Handler로 REST 엔드포인트 4개(`GET`/`POST /api/tasks`,
`PATCH`/`DELETE /api/tasks/{id}`)를 만들고, Prisma ORM으로 SQLite 파일(`dev.db`)에 접근한다.
모든 응답은 `{ ok, data }` / `{ ok, error }` 봉투로 통일한다. 자동 갱신은 추가 인프라 없이
클라이언트 5초 폴링으로 구현한다. 근거는 [research.md](./research.md) R-001~R-008에 있다.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js 런타임

**Primary Dependencies**: Next.js 16.3.5 (App Router), React 19.2.8, Tailwind CSS 4,
Prisma ORM + `@prisma/client` (신규 추가)

**Storage**: SQLite 로컬 파일 `dev.db`. 접속 문자열은 `.env`의 `DATABASE_URL="file:./dev.db"`

**Testing**: 자동화 테스트 프레임워크 없음(R-007). 검증은 [quickstart.md](./quickstart.md)의
시나리오 A~F와 `npm run lint`, `npm run build`

**Target Platform**: 최신 데스크톱 브라우저 + 로컬 Node.js 개발 서버. 외부 서비스 가입 불필요

**Project Type**: 단일 Next.js 웹 애플리케이션 (프론트엔드와 API가 한 프로젝트 안에 있음)

**Performance Goals**: 할 일 100건 목록 2초 이내 표시(SC-005), 단일 동작 1초 이내 반영(SC-002),
다른 탭 변경 5초 이내 반영(SC-006)

**Constraints**: 단일 로컬 사용자. 인증 없음. 추가 서버 프로세스나 외부 의존 서비스 없음.
`any` 사용 불가(헌법 원칙 III)

**Scale/Scope**: 할 일 100건 규모, 화면 1개, 엔드포인트 4개, 엔티티 1개

## Constitution Check

*GATE: Phase 0 이전 통과 필수. Phase 1 설계 후 재확인.*

**Phase 0 이전 평가**

| 헌법 항목 | 판정 | 근거 |
|-----------|------|------|
| I. App Router + TypeScript 단일 스택 | PASS | 모든 라우트가 `app/` 아래. `pages/` 없음. 소스 전부 `.ts`/`.tsx` |
| II. JSON 응답 통일 | PASS | 성공·실패 모두 `application/json` 봉투. `ok` 필드로 구분 (R-004) |
| III. any 금지 (NON-NEGOTIABLE) | PASS | 요청 본문을 `unknown`으로 받아 검증 후 좁힘. Prisma가 결과 타입 제공 |
| 기술 스택 제약 — 메이저 버전 유지 | PASS | Next 16.3.5 / React 19.2.8 그대로 |
| 기술 스택 제약 — 스키마 변경 파일 기록 | PASS | `prisma/schema.prisma` + `prisma/migrations/` |
| 기술 스택 제약 — 번들 문서 사전 확인 | PASS | `node_modules/next/dist/docs/01-app/` 확인 완료. `params`가 Promise인 변경을 R-003에 기록 |
| 기술 스택 제약 — 새 의존성 사전 검토 | PASS | Prisma 도입 전 프레임워크 기본 기능·직접 드라이버를 R-001에서 비교. SQLite 접근은 기본 기능으로 불가 |
| 개발 워크플로 — Spec Kit 순서 | PASS | constitution → specify → clarify → plan 진행 중 |
| 개발 워크플로 — lint/build 통과 | 진행 중 | quickstart A단계에서 확인 |

**위반 없음. Phase 0 진행 승인.**

**Phase 1 설계 후 재평가**

| 헌법 항목 | 판정 | 설계에서 확인한 내용 |
|-----------|------|---------------------|
| I. App Router + TypeScript | PASS | 아래 구조 트리에 `pages/`, `.js` 소스 없음 |
| II. JSON 응답 통일 | PASS | [contracts/tasks-api.md](./contracts/tasks-api.md)가 400·404·500까지 전부 JSON으로 규정. quickstart B3·B11이 이를 직접 검증 |
| III. any 금지 | PASS | 계약상 입력이 `title: string`, `completed: boolean` 두 가지뿐이라 `unknown` → 좁히기로 충분. `as any` 필요 지점 없음 |
| 기술 스택 제약 | PASS | data-model.md가 Prisma 생성기 출력 경로를 버전 안내에 맡기도록 명시 — 추측 API 사용 금지 조항 준수 |
| 개발 워크플로 | PASS | 충돌 발견 시 중단 규칙 유지 |

**설계 후에도 위반 없음.** Complexity Tracking에 기재할 항목 없음.

## Project Structure

### Documentation (this feature)

```text
specs/001-todo-management/
├── plan.md              # 이 파일
├── spec.md              # 14~15단계 산출물
├── research.md          # Phase 0 산출물 (R-001~R-008)
├── data-model.md        # Phase 1 산출물
├── quickstart.md        # Phase 1 산출물
├── contracts/
│   └── tasks-api.md     # Phase 1 산출물
├── checklists/
│   └── requirements.md  # 스펙 품질 체크리스트
└── tasks.md             # /speckit-tasks 산출물 (아직 없음)
```

### Source Code (repository root)

```text
app/
├── api/
│   └── tasks/
│       ├── route.ts            # GET(목록), POST(생성)
│       └── [id]/
│           └── route.ts        # PATCH(완료 전환), DELETE(삭제)
├── _components/                # 비라우팅 파일. 밑줄 접두사 = private folder
│   ├── TodoApp.tsx             # 'use client'. 목록 상태, 폴링, 실패 안내 담당
│   ├── TodoForm.tsx            # 제목 입력 + 추가
│   ├── TodoSection.tsx         # 미완료/완료 구역 하나를 그림. 빈 구역 안내 포함
│   └── TodoItem.tsx            # 항목 1건. 완료 토글 + 삭제(확인 포함)
├── layout.tsx                  # 기존 파일
├── page.tsx                    # 기존 파일. TodoApp 을 렌더하도록 교체
└── globals.css                 # 기존 파일

lib/
├── prisma.ts                   # PrismaClient 단일 인스턴스 (개발 중 재생성 방지)
├── api.ts                      # 응답 봉투 생성 + 오류 코드 → HTTP 상태 매핑
├── validation.ts               # unknown 입력 검증 (V-01~V-05). any 없이 좁히는 지점
└── types.ts                    # 클라이언트용 Task 표현(createdAt: string) + 응답 유니온 타입

prisma/
├── schema.prisma               # Task 모델
└── migrations/                 # npx prisma migrate dev 산출물

.env                            # DATABASE_URL="file:./dev.db"
dev.db                          # SQLite 파일. 마이그레이션 시 생성 (git 제외)
```

**Structure Decision**: 단일 Next.js 프로젝트 구조를 쓴다. 프론트엔드와 API가 같은 프로세스에서
동작하므로 backend/frontend를 나누지 않는다. 라우팅되지 않는 UI 파일은 App Router의 private
folder 규약(`_components`)으로 `app/` 안에 둔다 — 번들 문서
`01-getting-started/02-project-structure.md:257`에서 확인한 규약이다. 서버에서만 쓰는 헬퍼는
라우트에서 재사용하기 위해 `lib/`에 분리하며, 이 분리 덕분에 나중에 테스트를 붙이기 쉽다(R-007).

## Complexity Tracking

> Constitution Check에 위반이 없으므로 기재할 항목 없음.
