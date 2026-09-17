# 미니 투두 (SQLite)

인공지능서비스개발2 — SDD(Spec-Driven Development) 실습 과제.

할 일을 추가·조회·완료 처리·삭제하고, 중요도(높음/보통/낮음)를 정할 수 있는 웹 앱이다.
데이터는 로컬 SQLite 파일에 저장되어 브라우저를 닫아도 남는다.

## 실행 방법

```bash
npm install
```

저장소 루트에 `.env` 파일을 만들고 다음 한 줄을 넣는다. (`.env`는 커밋되지 않는다)

```
DATABASE_URL="file:./dev.db"
```

```bash
npx prisma migrate dev    # prisma/dev.db 생성
npm run dev               # http://localhost:3000
```

데이터가 실제로 파일에 저장됐는지 확인하려면:

```bash
npx prisma studio
```

## 기능

- 할 일 추가 (제목 필수, 최대 100자, 중복 제목 허용)
- 미완료 / 완료 두 구역으로 분리 표시
- 완료 여부 토글
- 삭제 (확인 후 실행)
- 중요도 3단계 — 추가할 때 선택, 나중에 변경 가능
- 정렬: 중요도 순(높음→보통→낮음), 같은 등급 안에서는 최신순
- 여러 탭을 열어두면 5초 이내 자동 동기화

## 기술 스택

| 항목 | 사용 |
|------|------|
| 프레임워크 | Next.js 16.3.5 (App Router) |
| UI | React 19.2.8, Tailwind CSS 4 |
| 언어 | TypeScript 5 (strict, `any` 금지) |
| DB | SQLite + Prisma ORM 6.19.3 |

## 구조

```
app/
├── api/tasks/route.ts        GET(목록) POST(생성)
├── api/tasks/[id]/route.ts   PATCH(완료·중요도) DELETE
├── _components/              화면 컴포넌트
└── page.tsx                  서버 컴포넌트. 초기 목록 조회
lib/
├── prisma.ts                 PrismaClient 단일 인스턴스
├── api.ts                    응답 봉투, 정렬
├── validation.ts             입력 검증
└── types.ts                  공유 타입
prisma/schema.prisma          Task 모델
specs/                        SDD 문서 (아래 참고)
```

## SDD 문서

이 과제의 핵심이다. 코드를 쓰기 전에 아래 순서로 문서를 먼저 만들었다.

| 기능 | 문서 |
|------|------|
| 001 할 일 관리 | [specs/001-todo-management/](specs/001-todo-management/) |
| 002 중요도 | [specs/002-task-priority/](specs/002-task-priority/) |

각 폴더에 들어 있는 것:

- `spec.md` — 무엇을·왜 (기술 언급 없음)
- `plan.md` — 어떻게 (스택, 구조, 원칙 준수 검사)
- `research.md` — 설계 결정과 버린 대안
- `data-model.md` — 엔티티, 검증 규칙, 상태 전이
- `contracts/` — API 요청·응답 계약
- `tasks.md` — 실행 단위로 쪼갠 작업 목록
- `quickstart.md` — 검증 시나리오

## API

모든 응답은 성공·실패를 불문하고 JSON이다.

```jsonc
// 성공
{ "ok": true, "data": ... }
// 실패
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "제목을 입력해 주세요." } }
```

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/tasks` | 정렬된 전체 목록 |
| POST | `/api/tasks` | 생성 `{ title, priority? }` |
| PATCH | `/api/tasks/{id}` | 부분 수정 `{ completed?, priority? }` |
| DELETE | `/api/tasks/{id}` | 삭제 |

자세한 계약은 [contracts/tasks-api.md](specs/001-todo-management/contracts/tasks-api.md)와
[contracts/tasks-api-priority.md](specs/002-task-priority/contracts/tasks-api-priority.md) 참고.
