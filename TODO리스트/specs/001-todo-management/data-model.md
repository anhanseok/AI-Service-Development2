# Data Model: 할 일 관리 (Todo Management)

**Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## 용어 매핑

스펙은 업무 용어로 **할 일(Todo)** 이라고 부른다. 코드·API·DB에서는 **`Task`** 라는 이름을
쓴다(경로 `app/api/tasks`, 모델 `Task`, 테이블 `Task`). 같은 대상이며, 이 문서 이후로는
기술 이름인 `Task`로 통일한다.

## 엔티티: Task

스펙 Key Entities의 "할 일"에 대응한다. 다른 엔티티나 사용자 계정과의 관계가 없는 독립 레코드다.

| 필드 | 타입 | 제약 | 출처 |
|------|------|------|------|
| `id` | `Int` | PK, 자동 증가 | R-002 |
| `title` | `String` | 필수, 앞뒤 공백 제거 후 1~100자 | FR-001, FR-002, FR-003, FR-004 |
| `completed` | `Boolean` | 기본값 `false` | FR-005, FR-008 |
| `createdAt` | `DateTime` | 기본값 현재 시각, 생성 후 불변 | FR-007 |

`title`에 고유 제약을 **두지 않는다**. FR-015가 제목 중복을 명시적으로 허용한다.

## 검증 규칙

서버에서 수행한다. 클라이언트 검증은 사용자 편의를 위한 것이며 서버 검증을 대체하지 않는다.

| 규칙 | 내용 | 위반 시 |
|------|------|---------|
| V-01 | `title`은 문자열이어야 한다 | 400 `VALIDATION_ERROR` |
| V-02 | 앞뒤 공백을 제거한 `title`의 길이가 1 이상이어야 한다 | 400 `VALIDATION_ERROR` |
| V-03 | 앞뒤 공백을 제거한 `title`의 길이가 100 이하여야 한다 | 400 `VALIDATION_ERROR` |
| V-04 | `completed`는 불리언이어야 한다 | 400 `VALIDATION_ERROR` |
| V-05 | 경로의 `id`는 양의 정수로 파싱되어야 한다 | 400 `VALIDATION_ERROR` |
| V-06 | 해당 `id`의 레코드가 존재해야 한다 | 404 `NOT_FOUND` |

저장되는 값은 항상 공백 제거 후의 `title`이다(FR-003). 길이는 제거 후 기준으로 센다.

## 상태 전이

`Task`가 가지는 상태는 `completed` 하나뿐이며 두 값 사이를 자유롭게 오간다.

```text
         PATCH {completed: true}
  미완료 ─────────────────────────▶ 완료
 (false)                            (true)
        ◀─────────────────────────
         PATCH {completed: false}

  생성 ──▶ 미완료 (FR-005: 항상 미완료로 시작)
  미완료/완료 ──DELETE──▶ 삭제 (되돌릴 수 없음, FR-010)
```

전이 규칙:

- 같은 값으로 다시 PATCH해도 성공으로 처리한다. 결과 상태가 요청한 값과 같기 때문이다(R-005).
- 삭제된 레코드에 대한 PATCH·DELETE는 404를 반환한다(V-06, FR-014).

## 화면 표시 규칙

DB에는 구역 개념이 없다. 구역은 조회 결과를 클라이언트가 나누어 만든다(R-008).

- 서버는 `createdAt` 내림차순 단일 배열을 반환한다.
- 클라이언트가 `completed === false`를 미완료 구역, `true`를 완료 구역에 배치한다.
- 미완료 구역이 위, 완료 구역이 아래다(FR-006).
- 전체 정렬이 최신순이므로 각 구역 내부도 자동으로 최신순이 된다(FR-007).

## Prisma 스키마 초안

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Task {
  id        Int      @id @default(autoincrement())
  title     String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

환경 변수는 `.env`에 `DATABASE_URL="file:./dev.db"` 한 줄이다.

`generator client`의 출력 경로는 설치되는 Prisma 버전의 기본값을 따른다. 설치 후
`npx prisma generate`가 안내하는 경로 규약이 위와 다르면 그 안내를 따르고 이 문서를 갱신한다.
버전에 따라 기본 출력 위치가 바뀐 이력이 있어 여기서 미리 고정하지 않는다.

## 규모 가정

SC-005 기준 100건 규모에서 동작하면 충분하다. 인덱스는 PK 외에 두지 않는다. 정렬 대상인
`createdAt`에 인덱스가 없어도 이 규모에서는 체감 차이가 없으며, 필요해지는 시점에 추가한다.
