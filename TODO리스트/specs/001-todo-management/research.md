# Phase 0 Research: 할 일 관리 (Todo Management)

**Date**: 2026-09-16 | **Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Technical Context에 남아 있던 미해결 항목을 결정으로 바꾼 기록이다. 각 항목은
결정 / 근거 / 검토했으나 버린 대안 순서로 적는다.

---

## R-001: 데이터 접근 방식

**Decision**: Prisma ORM + SQLite 파일(`dev.db`).

**Rationale**: 사용자 지시로 확정. SQLite는 별도 서버 프로세스나 외부 서비스 가입이 없어
로컬에서 바로 동작하며, `dev.db` 파일 하나로 영속성(FR-011)이 성립한다. Prisma는 스키마
파일이 곧 마이그레이션 기록이 되어 헌법 "기술 스택 제약"의 *스키마 변경은 파일로 기록한다*
조항을 자동으로 만족한다. 생성된 클라이언트가 타입을 제공하므로 원칙 III(any 금지)에도 유리하다.

**Alternatives considered**:
- `better-sqlite3` 직접 사용 — 의존성은 가볍지만 쿼리 결과가 `unknown`이라 타입을 손으로
  붙여야 하고, 마이그레이션 기록 수단이 따로 필요하다.
- 파일 기반 JSON 저장 — 서버가 필요 없다는 장점은 같으나 동시 쓰기에서 데이터가 깨진다.
  FR-016의 다중 탭 시나리오와 정면으로 충돌한다.

---

## R-002: 식별자 타입

**Decision**: `Int` 자동 증가(`@default(autoincrement())`).

**Rationale**: 단일 로컬 사용자·단일 DB 환경이라 전역 고유성이 필요 없다. URL 경로
(`/api/tasks/3`)가 짧고 읽기 쉬우며, 분산 환경에서만 의미가 있는 UUID/cuid의 비용을 치를
이유가 없다.

**Alternatives considered**:
- `cuid()` 문자열 — 여러 DB를 합칠 때 충돌이 없지만 이번 범위에 그런 시나리오가 없다.
- `uuid` — 위와 같은 이유로 제외. 경로가 길어져 수동 검증(curl)만 번거로워진다.

**Consequence**: 경로 파라미터가 정수가 아닐 때(`/api/tasks/abc`) 400을 반환하는 검증이
필요하다. contracts에 명시했다.

---

## R-003: 동적 라우트 파라미터 처리 (Next.js 16)

**Decision**: 핸들러 두 번째 인자의 `params`를 **Promise로 받아 `await`** 한다.

```ts
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

**Rationale**: 번들 문서 `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md:82`
가 "`params`: a promise that resolves to an object"라고 명시한다. 이전 Next.js처럼 동기
객체로 구조 분해하면 동작하지 않는다. 헌법 "기술 스택 제약"이 요구한 사전 문서 확인에서
발견한 항목이다.

**Alternatives considered**:
- 전역 헬퍼 `RouteContext<'/api/tasks/[id]'>` 사용 — 같은 문서 105~121행에 있으며 타입이 더
  강하다. 다만 타입이 `next dev`/`next build`/`next typegen` 실행 후에야 생성되므로, 아직
  한 번도 빌드하지 않은 상태에서 타입 오류로 보이는 혼란이 생긴다. 명시적 Promise 타입을 택했다.

---

## R-004: JSON 응답 스키마

**Decision**: 모든 응답을 다음 두 형태 중 하나로 통일한다.

- 성공: `{ "ok": true, "data": <payload> }`
- 실패: `{ "ok": false, "error": { "code": <문자열 코드>, "message": <사람이 읽는 설명> } }`

**Rationale**: 헌법 원칙 II가 *성공·실패를 구분할 수 있는 필드*를 요구한다. `ok` 하나만 보면
분기가 끝나므로 클라이언트가 HTTP 상태 코드와 본문 구조를 이중으로 해석할 필요가 없다.
`code`는 기계가, `message`는 사람이 쓴다. FR-013이 요구하는 실패 안내가 `message`로 바로 연결된다.

**Alternatives considered**:
- 성공 시 데이터를 최상위에 그대로 반환 — 짧지만 실패 응답과 모양이 달라져 파싱 경로가
  둘로 갈라진다. 원칙 II 위반.
- RFC 7807 problem+json — 표준이지만 `Content-Type`이 `application/problem+json`이 되어
  원칙 II의 "항상 application/json"과 어긋나고, 이 규모에 비해 과하다.

---

## R-005: 완료 토글 방식

**Decision**: `PATCH /api/tasks/{id}` 본문에 `{ "completed": true | false }`를 **명시적으로**
보낸다. 서버가 현재 값을 뒤집지 않는다.

**Rationale**: 서버가 뒤집는 방식은 요청이 중복 전달되면 결과가 달라진다(멱등하지 않다).
FR-016의 다중 탭 환경에서는 같은 요청이 두 번 도착하거나, 다른 탭이 이미 상태를 바꿔둔
상황이 실제로 발생한다. 명시적 값을 보내면 몇 번을 보내도 결과가 같다.

**Alternatives considered**:
- `POST /api/tasks/{id}/toggle` — 의도는 읽기 쉽지만 위의 멱등성 문제가 그대로 남는다.
- `PUT`으로 전체 교체 — 제목까지 함께 보내야 해서 토글 하나에 불필요한 데이터가 오간다.

---

## R-006: 목록 자동 갱신 방식

**Decision**: 클라이언트에서 5초 간격 폴링. 탭이 보이지 않을 때(`document.visibilityState`가
`hidden`)는 폴링을 멈추고, 다시 보이면 즉시 한 번 조회한 뒤 재개한다.

**Rationale**: FR-016과 SC-006이 요구하는 것은 "5초 이내 반영"이지 "즉시"가 아니다. 폴링은
추가 인프라가 0이고 서버 상태를 들고 있을 필요가 없다. 숨은 탭에서 멈추는 처리로 불필요한
질의를 줄인다. 사용자와의 15단계 명확화에서 확정된 방향이다.

**Alternatives considered**:
- SSE(Server-Sent Events) — 지연이 더 짧지만 SQLite가 변경 알림을 제공하지 않아 서버 안에
  이벤트 중계 장치를 따로 만들어야 한다. 개발 서버 재시작마다 그 상태가 사라진다.
- WebSocket — 양방향이 필요 없는 문제에 양방향 채널을 도입하는 것이라 비용 대비 이득이 없다.
- `BroadcastChannel` — 같은 브라우저의 탭끼리는 즉시 동기화되지만 DB 상태를 반영하지 못해
  FR-013의 "화면을 실제 저장 상태와 일치시킨다"를 만족하지 못한다.

---

## R-007: 자동화 테스트 프레임워크

**Decision**: 이번 반복에서는 자동화 테스트 프레임워크를 도입하지 않는다. 검증은
[quickstart.md](./quickstart.md)의 수동 시나리오와 `npm run lint`, `npm run build`로 한다.

**Rationale**: 헌법에 테스트 관련 원칙이 없고(13단계에서 사용자가 제시한 3개 원칙에 테스트가
포함되지 않았다), 스펙에도 테스트 요구가 없다. 헌법 "개발 워크플로"가 정한 완료 조건은
lint와 build 통과다. 없는 요구를 근거로 범위를 늘리지 않는다.

**Alternatives considered**:
- Vitest + 라우트 핸들러 통합 테스트 — 회귀를 자동으로 잡아주지만 설정·작성에 이 기능
  전체와 맞먹는 작업이 붙는다.

**Trade-off (명시)**: 회귀 검출이 사람 손에 달린다. 기능을 더 얹을 계획이라면 그 시점에
Vitest를 추가하는 것이 적절하다. 지금 구조(라우트 핸들러가 얇고 검증 로직이 `lib/`에 분리)는
나중에 테스트를 붙이기 쉽게 되어 있다.

---

## R-008: 목록 정렬과 구역 분리 위치

**Decision**: 서버는 `GET /api/tasks`에서 `createdAt` 내림차순으로 정렬한 **하나의 배열**을
반환한다. 미완료/완료 구역 분리는 클라이언트가 `completed` 값으로 나눈다.

**Rationale**: FR-007은 "각 구역 안에서 최신순"을 요구하는데, 전체를 최신순으로 한 번 정렬한
뒤 나누면 각 구역의 순서도 자동으로 최신순이 된다. 응답을 둘로 나누면 엔드포인트나 응답
구조가 복잡해지고, 토글 시 두 목록을 모두 다시 맞춰야 한다.

**Alternatives considered**:
- `GET /api/tasks?completed=false`로 구역별 2회 호출 — 폴링마다 요청이 2배가 되고, 두 응답
  사이에 상태가 바뀌면 화면이 순간적으로 어긋난다.
