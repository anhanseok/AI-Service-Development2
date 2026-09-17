Part of: map.md
Type: grilling
Status: resolved

## Question

공유 캘린더 MVP를 위한 Prisma 데이터 모델을 확정한다.

최소한 다음을 결정해야 한다:
- 테이블(모델) 목록: User, Calendar, CalendarMember(초대/권한), Event 등
- 각 모델의 필드와 타입
- 관계: 한 캘린더에 여러 멤버, 한 캘린더에 여러 이벤트, 멤버의 역할(소유자/편집자/뷰어)이 필요한지
- Supabase Auth의 유저 테이블과 Prisma의 User 모델을 어떻게 연결할지 (auth.users와 public 테이블 매핑)
- id 전략 (uuid vs auto-increment), timestamps 컨벤션

세션에서 `grilling`과 `domain-modeling` 스킬을 호출해 스키마를 확정하고, 결과를 `schema.prisma` 초안으로 남긴다.

## Answer

4개 모델로 확정: User, Calendar, CalendarMember(멤버십 연결 테이블), Event. 초안: [01-schema-draft.prisma](01-schema-draft.prisma)

결정 사항:
- **id 형식**: 전 테이블 UUID. Supabase Auth의 유저 id와 형식을 맞추기 위함 — User.id는 Prisma가 아니라 Supabase Auth가 만든 id를 그대로 씀 (첫 로그인 시 upsert).
- **멤버 권한**: role 구분 없음. Calendar.ownerId로 소유자만 구분, 그 외 멤버는 CalendarMember 전원 동일 권한(CRUD 가능).
- **캘린더 생성 시 규칙**: owner도 자동으로 CalendarMember에 한 행 추가 — "이 캘린더의 멤버인가"만 체크하면 권한 판단이 통일됨 (04/06/07번 티켓에서 이 규칙 그대로 구현).
- **Event.createdById**: 생성자 표시용으로 추가.
- User ↔ Supabase auth.users 연결: Prisma가 auth 스키마를 직접 마이그레이션하지 않고, public.User를 별도로 두고 로그인 시 동기화(05번 티켓에서 구현).
