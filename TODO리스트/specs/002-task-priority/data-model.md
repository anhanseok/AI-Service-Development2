# Data Model: 할 일 중요도 (Task Priority)

**Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

001의 [data-model.md](../001-todo-management/data-model.md)를 대체하지 않고 **확장**한다.
용어 매핑(스펙의 "할 일" = 코드의 `Task`)도 그대로 따른다.

## 엔티티 변경: Task

기존 4개 필드에 하나가 추가된다. 나머지 필드의 정의는 001에서 바뀌지 않았다.

| 필드 | 타입 | 제약 | 출처 |
|------|------|------|------|
| `id` | `Int` | PK, 자동 증가 | 001 R-002 |
| `title` | `String` | 필수, 공백 제거 후 1~100자 | 001 FR-001~004 |
| `completed` | `Boolean` | 기본값 `false` | 001 FR-005 |
| **`priority`** | **`Priority`** | **`HIGH` \| `MEDIUM` \| `LOW`, 기본값 `MEDIUM`, NOT NULL** | **FR-101, FR-103, FR-112** |
| `createdAt` | `DateTime` | 기본값 현재 시각, 생성 후 불변 | 001 FR-007 |

`priority`는 `completed`와 독립이다. 완료된 할 일도 중요도를 그대로 가진다(FR-109).

## 중요도 랭크

정렬에만 쓰는 내부 값이다. 저장하지 않는다(R-102).

| 값 | 랭크 | 화면 표기 |
|----|------|-----------|
| `HIGH` | 1 | 높음 |
| `MEDIUM` | 2 | 보통 |
| `LOW` | 3 | 낮음 |

랭크가 작을수록 위에 온다.

## 검증 규칙 (추가분)

001의 V-01~V-06은 그대로 유효하다.

| 규칙 | 내용 | 위반 시 |
|------|------|---------|
| V-07 | `priority`는 `"HIGH"`, `"MEDIUM"`, `"LOW"` 중 하나여야 한다 | 400 `VALIDATION_ERROR` |
| V-08 | PATCH 본문에 `completed`와 `priority` 중 최소 하나가 있어야 한다 | 400 `VALIDATION_ERROR` |

`priority`는 대소문자를 구분한다. `"high"`는 거부한다 — 계약이 정한 표기가 하나뿐이어야
클라이언트마다 다른 표기를 보내는 상황을 막을 수 있다.

POST에서 `priority`가 없으면 검증 실패가 아니라 `MEDIUM`을 적용한다(FR-103).

## 상태 전이

`priority`는 세 값 사이를 자유롭게 오간다. 순서 제약이 없다.

```text
  HIGH ⇄ MEDIUM ⇄ LOW
  HIGH ⇄ LOW            (한 번에 건너뛸 수 있다)

  생성 ──▶ 요청에 지정된 값, 없으면 MEDIUM (FR-103)
```

- 같은 값으로 다시 PATCH해도 성공으로 처리한다. 결과 상태가 요청한 값과 같기 때문이다.
- 삭제된 레코드에 대한 변경은 404다(001 V-06, FR-114).

## 정렬 규칙

FR-107·FR-108이 001의 FR-007을 **대체**한다.

```text
1차 기준: 중요도 랭크 오름차순 (HIGH → MEDIUM → LOW)
2차 기준: createdAt 내림차순 (최신 먼저)
```

구현은 두 단계다(R-102):

1. DB에서 `createdAt` 내림차순으로 조회한다.
2. 그 배열을 랭크로 안정 정렬한다. 안정 정렬이므로 같은 랭크 안에서는 1단계의 최신순이
   그대로 보존된다.

이 방식이 FR-113(항상 같은 순서)을 만족하는 이유: 두 기준이 모두 결정적이고, 안정 정렬은
입력이 같으면 출력도 같다. `createdAt`이 완전히 동일한 두 행이 있더라도 DB가 돌려주는 순서가
같은 한 결과도 같다.

**구역과의 관계**: 정렬은 전체 목록에 한 번 적용된다. 클라이언트가 그 결과를 `completed`로
나누므로, 미완료 구역과 완료 구역 각각의 내부에서도 같은 순서 규칙이 유지된다(FR-109).

## Prisma 스키마 변경

```prisma
enum Priority {
  HIGH
  MEDIUM
  LOW
}

model Task {
  id        Int      @id @default(autoincrement())
  title     String
  completed Boolean  @default(false)
  priority  Priority @default(MEDIUM)
  createdAt DateTime @default(now())
}
```

`prisma migrate diff`로 확인한 실제 SQL은 `"priority" TEXT NOT NULL DEFAULT 'MEDIUM'`이며,
기존 행은 테이블 재생성 과정에서 기본값을 받는다. 별도 데이터 보정이 필요 없다(R-103).
