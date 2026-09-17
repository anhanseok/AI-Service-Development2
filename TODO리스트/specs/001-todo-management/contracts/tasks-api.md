# API Contract: /api/tasks

**Date**: 2026-09-16 | **Data model**: [../data-model.md](../data-model.md) | **Research**: [../research.md](../research.md)

헌법 원칙 II에 따라 **모든 응답은 성공·실패를 불문하고 `application/json`** 이다. HTML 에러
페이지나 평문 본문을 반환하는 경로가 있어서는 안 된다.

## 공통 응답 봉투 (R-004)

성공:

```json
{ "ok": true, "data": <payload> }
```

실패:

```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "제목을 입력해 주세요." } }
```

`ok` 하나로 분기가 끝난다. `code`는 기계가 읽고, `message`는 사용자에게 그대로 보여줄 수 있는
한국어 문장이다(FR-013).

### 오류 코드

| code | HTTP | 발생 조건 |
|------|------|-----------|
| `VALIDATION_ERROR` | 400 | 본문·경로 파라미터가 검증 규칙 V-01~V-05를 위반 |
| `NOT_FOUND` | 404 | 요청한 `id`의 Task가 없음 (V-06, FR-014) |
| `INTERNAL_ERROR` | 500 | 그 외 처리 실패 |

본문이 유효한 JSON이 아니면 `VALIDATION_ERROR`로 처리한다.

## Task 표현

```json
{
  "id": 3,
  "title": "우유 사기",
  "completed": false,
  "createdAt": "2026-09-16T07:30:00.000Z"
}
```

`createdAt`은 ISO 8601 UTC 문자열이다.

---

## GET /api/tasks

모든 Task를 `createdAt` 내림차순으로 반환한다(R-008). 미완료/완료 분리는 클라이언트가 한다.

**요청**: 본문 없음. 쿼리 파라미터 없음.

**200 응답**

```json
{
  "ok": true,
  "data": [
    { "id": 3, "title": "우유 사기", "completed": false, "createdAt": "2026-09-16T07:30:00.000Z" },
    { "id": 1, "title": "보고서 제출", "completed": true, "createdAt": "2026-09-16T06:00:00.000Z" }
  ]
}
```

Task가 하나도 없으면 `data`는 빈 배열 `[]`이다. 빈 목록은 오류가 아니다(FR-012).

폴링이 이 엔드포인트를 5초마다 호출한다(R-006). 응답이 캐시되면 갱신이 동작하지 않으므로
캐시되지 않아야 한다. Next.js 16의 Route Handler는 기본적으로 캐시되지 않으며,
`export const dynamic = 'force-static'` 같은 캐시 옵션을 이 파일에 추가해서는 안 된다.

---

## POST /api/tasks

새 Task를 만든다.

**요청 본문**

```json
{ "title": "우유 사기" }
```

| 필드 | 필수 | 검증 |
|------|------|------|
| `title` | 예 | V-01, V-02, V-03. 앞뒤 공백을 제거한 값이 저장된다 |

`completed`와 `id`는 요청에서 받지 않는다. 새 Task는 항상 `completed: false`로 시작한다(FR-005).
제목이 기존 Task와 같아도 정상 생성한다(FR-015).

**201 응답**

```json
{ "ok": true, "data": { "id": 4, "title": "우유 사기", "completed": false, "createdAt": "2026-09-16T08:00:00.000Z" } }
```

**400 응답 예시**

| 입력 | message |
|------|---------|
| `{ "title": "" }` 또는 `{ "title": "   " }` | `제목을 입력해 주세요.` |
| `title`이 101자 이상 | `제목은 100자까지 입력할 수 있습니다.` |
| `title` 누락 또는 문자열이 아님 | `제목을 입력해 주세요.` |

---

## PATCH /api/tasks/{id}

완료 여부를 바꾼다. 서버는 현재 값을 뒤집지 않고 요청받은 값을 그대로 적용한다(R-005).
같은 값으로 여러 번 호출해도 결과가 같다.

**경로 파라미터**: `id` — 양의 정수. Next.js 16에서는 핸들러의 `params`가 Promise이므로
`await` 후 사용한다(R-003).

**요청 본문**

```json
{ "completed": true }
```

`title`은 이 엔드포인트로 바꿀 수 없다. 제목 수정은 이번 범위 밖이다.

**200 응답**

```json
{ "ok": true, "data": { "id": 3, "title": "우유 사기", "completed": true, "createdAt": "2026-09-16T07:30:00.000Z" } }
```

**오류**

| 상황 | HTTP | code | message |
|------|------|------|---------|
| `completed`가 불리언이 아님 | 400 | `VALIDATION_ERROR` | `완료 여부는 true 또는 false여야 합니다.` |
| `id`가 정수가 아님 | 400 | `VALIDATION_ERROR` | `잘못된 요청입니다.` |
| 해당 Task 없음 | 404 | `NOT_FOUND` | `이미 삭제된 할 일입니다.` |

404는 다른 탭에서 먼저 삭제한 경우 정상적으로 발생한다. 클라이언트는 이 응답을 받으면
안내를 띄우고 목록을 다시 조회한다(FR-013, FR-014).

---

## DELETE /api/tasks/{id}

Task를 영구 삭제한다. 되돌릴 수 없다.

삭제 전 사용자 확인(FR-010)은 **클라이언트에서** 처리한다. 확인을 취소하면 이 요청 자체를
보내지 않는다. 서버에 확인 단계는 없다.

**요청**: 본문 없음.

**200 응답**

```json
{ "ok": true, "data": { "id": 3 } }
```

**오류**

| 상황 | HTTP | code | message |
|------|------|------|---------|
| `id`가 정수가 아님 | 400 | `VALIDATION_ERROR` | `잘못된 요청입니다.` |
| 해당 Task 없음 | 404 | `NOT_FOUND` | `이미 삭제된 할 일입니다.` |

## 요구사항 추적

| 엔드포인트 | 충족하는 요구사항 |
|------------|-------------------|
| `GET /api/tasks` | FR-006, FR-007, FR-011, FR-012, FR-016, SC-005, SC-006 |
| `POST /api/tasks` | FR-001, FR-002, FR-003, FR-004, FR-005, FR-015 |
| `PATCH /api/tasks/{id}` | FR-008, FR-011, FR-014 |
| `DELETE /api/tasks/{id}` | FR-009, FR-011, FR-014 |
| 공통 봉투·오류 코드 | 헌법 원칙 II, FR-013 |
