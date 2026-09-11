Part of: map.md
Type: task
Blocked by: 01, 03
Status: resolved

## Question

확정된 데이터 모델(01번 티켓 결과)을 `schema.prisma`로 작성하고, 확보한 Supabase 연결(03번 티켓 결과)로 마이그레이션을 실행해 실제 테이블을 생성한다.

체크리스트:
- Prisma 설치 및 초기화
- `schema.prisma`에 01번에서 확정한 모델 작성
- `prisma migrate dev`로 로컬에서 마이그레이션 생성 및 Supabase에 적용
- Prisma Client 생성 확인, 간단한 쿼리로 연결 스모크 테스트

## Answer

마이그레이션 `20260911131027_init` 적용 완료 — Supabase에 User / Calendar / CalendarMember / Event 4개 테이블 생성됨. 스모크 테스트(캘린더+멤버+일정 생성 → 조회 → cascade 삭제) 통과, 잔여 행 0.

구성:
- `prisma/schema.prisma` — 01번 초안대로. 추가한 것: `CalendarMember`/`Event`의 `onDelete: Cascade`(캘린더 삭제 시 정리), `Event @@index([calendarId, startAt])`(월간 뷰 조회용). `User.id`는 `@default(uuid())` 없이 — Supabase Auth가 만든 id를 그대로 쓰기 때문(05번에서 동기화).
- `prisma7.config.ts` — CLI용 datasource는 `DIRECT_URL`(5432). 풀링 URL(6543)로는 마이그레이션이 실패함.
- `src/lib/prisma.ts` — 런타임 클라이언트. 풀링 `DATABASE_URL`(6543)을 `@prisma/adapter-pg`로 연결, 개발 중 핫리로드 때 커넥션 풀이 늘지 않도록 globalThis 싱글턴.

다음 세션 참고용 함정 3가지:
1. **`npm install prisma`가 실패함** — `latest` dist-tag가 8.0.0-rc를 가리키고 그 RC의 의존성(`effect@4.0.0-rc.114`)이 레지스트리에 없음. `prisma@7.10.0`으로 버전 고정해서 설치했음. 업그레이드 시 주의.
2. **Prisma 7은 스키마에 url을 쓰지 않음** — `prisma7.config.ts`로 이동했고, PostgreSQL 런타임은 드라이버 어댑터(`@prisma/adapter-pg` + `pg`)가 필수. `env()` 헬퍼는 `.env.local`을 스스로 읽지 않아서 config 상단에서 `dotenv`로 명시적으로 로드해야 함.
3. **03번에서 저장된 URL 2개에 문제가 있었음** — `DIRECT_URL`은 빈 값, `DATABASE_URL`은 비밀번호 오타. 사용자가 DIRECT_URL을 다시 입력한 뒤, 그 값에서 포트만 6543으로 바꿔 DATABASE_URL을 재생성해 해결. 연결 문제가 재발하면 두 URL을 각각 `pg`로 따로 테스트해볼 것.

`npm audit` 경고 4건(high)은 Prisma CLI(devDependency)의 하위 의존성 `mysql2`/`deepmerge-ts` 건 — PostgreSQL만 쓰므로 런타임 영향 없고, `audit fix --force`는 깨진 8.0.0-rc로 올려서 적용하지 않음.
