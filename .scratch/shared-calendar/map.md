# Map: 공유 캘린더 (Shared Calendar) — Part 1

## Destination

강남대학교 인공지능전공 "AI 서비스 웹앱 개발 프로세스" 강의자료 Part 1 방법론(Next.js · TypeScript · Tailwind CSS · API Routes · PostgreSQL/Prisma · Vercel)을 그대로 따라, **실제로 동작하는 공유 캘린더 웹앱**을 완성한다.

MVP 범위:
- 일정 CRUD (생성·조회·수정·삭제)
- 초대 기반 캘린더 공유 — 이미 가입된 사용자만 이메일로 초대 가능
- 월간 뷰

이 맵은 계획으로 끝나지 않는다: 결정 티켓뿐 아니라 실제 구현 작업(코딩)까지 티켓으로 관리하고 완료한다.

Part 2(Python AI 추론 서버 확장)는 이 맵의 범위 밖 — 이 맵이 끝난 뒤 별도 맵에서 다룬다.

## Notes

- 기술스택은 강의자료가 이미 지정: Next.js, TypeScript, Tailwind CSS, **Next.js API Routes**(Express 아님 — 간단한 CRUD + Vercel 배포에 적합), **Prisma**(Drizzle 아님 — 강의자료가 초보자용으로 권장), Supabase(PostgreSQL 호스팅 + Auth), Vercel 배포.
- Supabase 프로젝트는 사용자가 이미 보유 중.
- 인증: Supabase Auth (이메일/비밀번호).
- 개인 프로젝트 — GitHub assignee는 본인 단독.
- 리포: anhanseok/AI-Service-Development2 (`my-app/` 디렉토리), 스캐폴딩은 create-next-app 기본 상태에서 시작.
- 매 세션 참고 스킬: 스키마/화면 결정 티켓은 `grilling` + `domain-modeling`, UI 결정 티켓은 `prototype`, 구현 티켓은 일반 코딩(TDD 스킬 활용 가능).

## Decisions so far

- [03-supabase-connection-setup](issues/03-supabase-connection-setup.md): Supabase 연결 정보(DATABASE_URL/DIRECT_URL/URL/anon key/service_role key) `.env.local`에 저장 완료, `.env.example` 동기화. Supabase 대시보드 UI 개편 관련 경로/명칭 메모 남김.
- [01-db-schema-design](issues/01-db-schema-design.md): User/Calendar/CalendarMember/Event 4개 모델 확정, UUID id, role 구분 없음, 캘린더 생성 시 owner도 CalendarMember로 자동 등록. 초안: [01-schema-draft.prisma](issues/01-schema-draft.prisma)
- [02-invite-flow-ui-prototype](issues/02-invite-flow-ui-prototype.md): 사이드바 리스트-상세 레이아웃(Variant A) 채택, 월간 뷰 일정에 시작시간 표시 + 폼에 시작/종료 시간 입력 필수. 프로토타입 라우트는 06/07번 구현 후 삭제 예정.
- [04-prisma-schema-migration](issues/04-prisma-schema-migration.md): Prisma 7.10.0(버전 고정) + `@prisma/adapter-pg`로 구성, `init` 마이그레이션 적용해 Supabase에 4개 테이블 생성. CLI는 `DIRECT_URL`(5432), 런타임은 풀링 `DATABASE_URL`(6543). 런타임 클라이언트: `src/lib/prisma.ts`
- [05-supabase-auth-integration](issues/05-supabase-auth-integration.md): `@supabase/ssr`로 이메일/비밀번호 인증 + 미들웨어 라우트 보호 구현, 로그인 시 `public.User`에 upsert. 개발 편의를 위해 Supabase의 Confirm email을 끔(배포 전 재검토 — 10번 티켓).
- [06-calendar-crud-implementation](issues/06-calendar-crud-implementation.md): 캘린더/일정 CRUD를 API Routes + Variant A 화면으로 구현, 멤버십 기반 권한 체크(남의 캘린더 접근 403) 검증 완료. 스타일링은 범위 밖.
- [07-invite-feature-implementation](issues/07-invite-feature-implementation.md): 이메일 초대 API + 모달 구현. 미가입자 404 / 중복 409 / 제3자 초대 시도 403, 초대 즉시 상대 목록에 노출됨. 스타일링은 [11-ui-styling](issues/11-ui-styling.md)로 분리(사용자 결정: 기능 완료 후 진행).
- [08-integration-testing](issues/08-integration-testing.md): 프로덕션 빌드를 UTC로 띄워 전체 플로우 13항목 통과. **월 경계 일정이 옆 달로 새는 타임존 버그 발견·수정** — 월 범위를 서버가 아닌 브라우저가 절대 시각으로 계산해 보내도록 변경(`from`/`to`). 해외 멤버 간 표시 차이는 의도된 동작으로 남김.

## Not yet specified

- 배포 후 커스텀 도메인 필요 여부

## Out of scope

- 반복 일정(recurring events) — MVP 범위 밖으로 확정
- 알림 기능 (이메일/푸시) — MVP 범위 밖으로 확정
- 실시간 동기화(다른 사용자의 변경이 즉시 반영) — MVP 범위 밖으로 확정
- 미가입자 이메일 초대(가입 유도 플로우) — 가입된 사용자만 초대 가능하도록 확정
- Part 2: Python AI 추론 서버 연동 — 별도 맵에서 진행
