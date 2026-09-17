# API Contract 변경: 중요도 도입

**Date**: 2026-09-17 | **Base contract**: [../../001-todo-management/contracts/tasks-api.md](../../001-todo-management/contracts/tasks-api.md)

001의 계약을 **대체하지 않고 확장**한다. 응답 봉투(`{ ok, data }` / `{ ok, error }`), 오류 코드,
HTTP 상태 매핑은 그대로다. 아래에 적힌 것만 달라진다.

## Task 표현 변경

필드 하나가 추가된다.

```json
{
  "id": 3,
  "title": "우유 사기",
  "completed": false,
  "priority": "HIGH",
  "createdAt": "2026-09-17T07:30:00.000Z"
}
```

`priority`는 항상 존재하며 `"HIGH"`, `"MEDIUM"`, `"LOW"` 중 하나다. `null`이나 누락은 없다(FR-101).

## 오류 메시지 추가

001의 오류 코드 표는 그대로다. 메시지만 추가된다.

| 상황 | code | message |
|------|------|---------|
| `priority` 가 세 값 중 하나가 아님 (V-07) | `VALIDATION_ERROR` | `중요도는 HIGH, MEDIUM, LOW 중 하나여야 합니다.` |
| PATCH 본문에 바꿀 항목이 없음 (V-08) | `VALIDATION_ERROR` | `변경할 내용이 없습니다.` |

---

## GET /api/tasks — 정렬 규칙 변경

요청은 그대로다. **응답 순서가 바뀐다.**

- 001: `createdAt` 내림차순
- 002: **중요도 랭크 오름차순(HIGH→MEDIUM→LOW) → 같으면 `createdAt` 내림차순** (FR-107, FR-108)

정렬은 서버가 책임진다. 클라이언트는 받은 순서를 그대로 쓰고 `completed`로 구역만 나눈다.

**200 응답 예시**

```json
{
  "ok": true,
  "data": [
    { "id": 5, "title": "발표 준비", "completed": false, "priority": "HIGH",   "createdAt": "2026-09-17T08:00:00.000Z" },
    { "id": 2, "title": "메일 회신", "completed": false, "priority": "HIGH",   "createdAt": "2026-09-17T06:00:00.000Z" },
    { "id": 7, "title": "우유 사기", "completed": false, "priority": "MEDIUM", "createdAt": "2026-09-17T09:00:00.000Z" },
    { "id": 1, "title": "책 정리",   "completed": true,  "priority": "LOW",    "createdAt": "2026-09-17T05:00:00.000Z" }
  ]
}
```

id 7이 id 2보다 나중에 만들어졌는데도 뒤에 오는 것에 주목한다. 중요도가 1차 기준이기 때문이다.

---

## POST /api/tasks — priority 선택 입력 추가

**요청 본문**

```json
{ "title": "발표 준비", "priority": "HIGH" }
```

| 필드 | 필수 | 검증 |
|------|------|------|
| `title` | 예 | 001과 동일 (V-01~V-03) |
| `priority` | **아니오** | 있으면 V-07. 없으면 `MEDIUM` 적용 (FR-103) |

`priority`를 생략한 요청은 001 시절의 요청과 형태가 같다. 즉 **기존 클라이언트를 깨뜨리지 않는다.**

**201 응답**

```json
{ "ok": true, "data": { "id": 8, "title": "발표 준비", "completed": false, "priority": "HIGH", "createdAt": "..." } }
```

**400 응답 예시**

| 입력 | message |
|------|---------|
| `{ "title": "x", "priority": "URGENT" }` | `중요도는 HIGH, MEDIUM, LOW 중 하나여야 합니다.` |
| `{ "title": "x", "priority": "high" }` | 위와 같음 (대소문자 구분) |

---

## PATCH /api/tasks/{id} — priority 변경 추가

새 엔드포인트를 만들지 않고 기존 경로를 확장한다(R-104).

**요청 본문**: 두 필드 모두 선택이지만 **최소 하나는 있어야 한다**(V-08).

```json
{ "priority": "LOW" }
{ "completed": true }
{ "completed": true, "priority": "LOW" }
```

| 필드 | 필수 | 동작 |
|------|------|------|
| `completed` | 아니오 | 있으면 그 값으로 설정 (001 R-005, 서버가 뒤집지 않음) |
| `priority` | 아니오 | 있으면 그 값으로 설정 |

보내지 않은 필드는 **바뀌지 않는다.** 제목은 이 엔드포인트로 바꿀 수 없다(001과 동일).

**200 응답**: 변경 후의 Task 전체

```json
{ "ok": true, "data": { "id": 3, "title": "우유 사기", "completed": false, "priority": "LOW", "createdAt": "..." } }
```

**오류**

| 상황 | HTTP | code | message |
|------|------|------|---------|
| 본문이 `{}` 이거나 두 필드가 모두 없음 | 400 | `VALIDATION_ERROR` | `변경할 내용이 없습니다.` |
| `priority` 값이 세 등급 밖 | 400 | `VALIDATION_ERROR` | `중요도는 HIGH, MEDIUM, LOW 중 하나여야 합니다.` |
| `completed` 가 불리언이 아님 | 400 | `VALIDATION_ERROR` | `완료 여부는 true 또는 false여야 합니다.` |
| `id` 가 정수가 아님 | 400 | `VALIDATION_ERROR` | `잘못된 요청입니다.` |
| 해당 Task 없음 | 404 | `NOT_FOUND` | `이미 삭제된 할 일입니다.` |

## DELETE /api/tasks/{id}

변경 없음.

## 요구사항 추적

| 엔드포인트 | 충족하는 요구사항 |
|------------|-------------------|
| `GET /api/tasks` | FR-107, FR-108, FR-109, FR-110, FR-113, SC-101, SC-104, SC-105 |
| `POST /api/tasks` | FR-101, FR-102, FR-103 |
| `PATCH /api/tasks/{id}` | FR-105, FR-106, FR-111, FR-114 |
| 마이그레이션 기본값 | FR-112 |
