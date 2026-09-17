# Phase 0 Research: 할 일 중요도 (Task Priority)

**Date**: 2026-09-17 | **Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

001-todo-management의 R-001~R-008은 그대로 유효하다. 여기에는 중요도 도입으로 새로 결정한
것만 적는다.

---

## R-101: 중요도 저장 타입

**Decision**: Prisma `enum Priority { HIGH MEDIUM LOW }` 를 쓰고 `priority Priority @default(MEDIUM)`
로 선언한다.

**Rationale**: 사용자 지시는 "SQLite가 enum을 지원하지 않으므로 문자열로 저장"이었으나, 설치된
Prisma 6.19.3에서 확인한 결과 **그 전제가 맞지 않았다**. `prisma validate`가 SQLite + enum 스키마를
통과시켰고, `prisma migrate diff`가 만드는 SQL은 다음과 같다:

```sql
"priority" TEXT NOT NULL DEFAULT 'MEDIUM'
```

즉 저장 형태는 지시하신 대로 **문자열 그대로**다. 달라지는 것은 Prisma가 `Priority` 타입을
생성해 준다는 점뿐이며, 이 덕분에 서버 코드에서 등급을 다룰 때 오타가 컴파일 단계에서 잡힌다.
헌법 원칙 III(타입 안전성)에 유리하고 잃는 것이 없다.

**Alternatives considered**:
- `String` + 애플리케이션 상수 — 원래 지시안. DB 표현은 동일하지만 `"HIGHH"` 같은 오타를
  런타임에서야 발견한다.
- `Int` 랭크(1·2·3) 저장 — DB에서 바로 정렬할 수 있으나, 응답·화면에서 매번 이름으로 바꿔야
  하고 DB를 직접 열었을 때 숫자만 보여 읽기 어렵다.

**주의**: enum이라고 해서 서버 입력 검증을 생략하지 않는다. 외부에서 들어온 문자열은 여전히
`unknown`에서 좁혀 세 값 중 하나인지 확인한다(FR-106).

## R-102: 정렬을 어디서 하는가

**Decision**: DB에서 `createdAt` 내림차순으로 가져온 뒤, **서버 코드에서** 중요도 랭크로
안정 정렬(stable sort)한다. 정렬된 결과를 `GET /api/tasks` 응답으로 내보낸다.

**Rationale**: 저장값이 `'HIGH' | 'MEDIUM' | 'LOW'` 문자열이라 DB의 `ORDER BY priority` 는
사전순으로 `HIGH < LOW < MEDIUM` 이 되어 원하는 순서가 나오지 않는다. 랭크 매핑이 필요한데,
그 매핑을 SQL에 넣으면(CASE 식) Prisma의 타입 있는 쿼리 밖으로 나가야 한다.

JavaScript의 `Array.prototype.sort` 는 ES2019부터 안정 정렬이 보장된다. 따라서 `createdAt`
내림차순으로 이미 정렬된 배열을 랭크로만 한 번 더 정렬하면, 같은 등급 안에서는 원래의 최신순이
그대로 유지된다. FR-108과 FR-113(같은 조건이면 항상 같은 순서)이 한 번에 만족된다.

정렬을 서버에 두는 이유는 순서가 API 계약의 일부이기 때문이다. 클라이언트가 정렬하면 계약을
검증할 방법이 curl로는 없어진다.

**Alternatives considered**:
- `ORDER BY CASE priority WHEN 'HIGH' THEN 1 ... END` 원시 SQL — DB가 정렬을 맡아 대용량에
  유리하지만, 이 규모(SC-104 기준 100건)에서 얻을 것이 없고 타입 안전성을 잃는다.
- 랭크 전용 정수 컬럼 추가 — DB 정렬은 가능해지나 같은 정보를 두 컬럼에 중복 저장하게 되고,
  둘이 어긋날 여지가 생긴다.
- 클라이언트 정렬 — 001의 R-008(구역 분리)과 달리, 순서는 계약이라 서버가 책임져야 한다.

**한계 (명시)**: 건수가 수천 건 규모로 커지면 전체를 메모리에 올려 정렬하는 방식이 부담이 된다.
그 시점에는 랭크 컬럼 + DB 정렬 + 페이지네이션으로 옮기는 것이 맞다.

## R-103: 기존 데이터 처리

**Decision**: 마이그레이션이 컬럼을 `NOT NULL DEFAULT 'MEDIUM'` 으로 추가하게 두고, 별도의
데이터 보정 스크립트를 쓰지 않는다.

**Rationale**: `prisma migrate diff` 로 확인한 실제 SQL이 기존 행을 새 테이블로 옮기면서
`priority` 를 기본값으로 채운다. FR-112(기존 할 일은 Medium)가 마이그레이션만으로 충족된다.

**Alternatives considered**:
- 컬럼을 nullable로 추가하고 코드에서 `?? 'MEDIUM'` 처리 — 코드 곳곳에 기본값 처리가 흩어지고,
  "값이 없는 상태"라는 네 번째 상태가 생겨 FR-101(정확히 하나의 등급)과 어긋난다.

## R-104: 중요도 변경 경로

**Decision**: 새 엔드포인트를 만들지 않고 기존 `PATCH /api/tasks/{id}` 를 확장한다. 본문은
`completed` 와 `priority` 를 각각 선택적으로 받되, **둘 중 최소 하나는 있어야** 한다.

**Rationale**: 사용자 지시이자 REST 관점에서도 자연스럽다. PATCH는 부분 수정을 뜻하므로 보낸
필드만 바꾸는 동작이 규약에 맞다. 엔드포인트가 늘지 않아 클라이언트의 호출 지점도 그대로다.

빈 객체 `{}` 를 거부하는 이유는, 아무것도 바꾸지 않는 요청이 성공으로 보이면 클라이언트의
버그(필드 이름 오타 등)가 조용히 묻히기 때문이다.

**Alternatives considered**:
- `PATCH /api/tasks/{id}/priority` 전용 경로 — 의도는 명확하나 엔드포인트가 늘고, 완료 여부와
  중요도를 함께 바꾸고 싶을 때 요청이 두 번 나간다.
- `PUT` 전체 교체 — 제목까지 매번 보내야 한다. 001의 R-005에서 이미 기각한 방식이다.

## R-105: 중요도 선택 UI 형태

**Decision**: 추가 폼에서는 `select` 드롭다운, 목록의 각 항목에서도 같은 `select` 를 쓴다.

**Rationale**: 값이 세 개뿐이라 라디오 버튼도 가능하지만, 목록의 항목마다 라디오 3개가 붙으면
한 줄이 지나치게 길어진다. `select` 는 한 칸만 차지하면서 현재 값을 그대로 보여주므로
FR-110(각 할 일에 중요도 표시)과 FR-105(변경 가능)를 한 요소로 동시에 만족한다.

키보드만으로 조작할 수 있고 스크린 리더가 읽을 수 있다는 점도 기본으로 따라온다.

**Alternatives considered**:
- 읽기 전용 배지 + 별도 편집 버튼 — 표시는 깔끔하나 변경에 클릭이 한 번 더 든다.
- 클릭할 때마다 순환하는 배지 — 요소는 하나로 줄지만 어느 방향으로 바뀌는지 예측하기 어렵고,
  원하는 값까지 여러 번 눌러야 한다.
