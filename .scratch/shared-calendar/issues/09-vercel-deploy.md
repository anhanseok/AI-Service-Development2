Part of: map.md
Type: task
Blocked by: 08
Status: resolved

## Question

Vercel에 배포하고, 배포된 환경에서도 Supabase 연결이 정상 동작하는지 확인한다.

체크리스트:
- Vercel 프로젝트 연결 (GitHub 리포 기준 자동 배포)
- Vercel 환경변수에 03번에서 정리한 키 등록
- 배포된 URL에서 회원가입~일정 CRUD~초대 전체 플로우 재확인

## Answer

**배포 완료: https://ai-service-development2.vercel.app**

GitHub 저장소가 이미 Vercel 프로젝트(`ai-service-development2`)에 연결돼 있어 push할 때마다 자동 배포된다. Vercel 환경변수 5개 등록 후 재배포해서 성공.

환경변수 설정 (Production/Preview/Development 모두):
- Secret: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Config: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Vercel은 `NEXT_PUBLIC_` 접두사 변수를 Secret으로 받지 않는다(어차피 브라우저 번들에 들어가는 값).

배포 환경 검증 (실제 URL + 실제 Supabase):
- `/login` 200, 비로그인 `/calendars` → 307 리다이렉트, `/api/calendars` → 401
- 캘린더 생성·일정 생성·월간 조회 = 서버리스에서 Supabase 풀링 연결(6543) 정상
- 멤버 초대 → 상대 목록 노출
- **월 경계 일정 검증 통과** — 08번에서 고친 타임존 버그가 실제 UTC 서버에서도 정상

### 사전에 고친 것: 빌드 실패

첫 자동 배포가 실패했다. 생성된 Prisma 클라이언트(`src/generated/prisma`)는 gitignore 대상이라 저장소에 없고, Vercel의 깨끗한 환경에서는 `@/generated/prisma`를 찾지 못한다. `build` 스크립트를 `prisma generate && next build`로 바꿔 해결 (로컬에서 생성물 삭제 후 재현·검증함).

### 운영 메모
- 마이그레이션은 로컬에서 같은 Supabase DB에 이미 적용했으므로 배포 시 별도 실행 불필요. 앞으로 스키마를 바꾸면 `prisma migrate dev`를 로컬에서 돌린 뒤 커밋할 것(빌드 단계에서 `migrate deploy`는 실행하지 않는다).
- **Supabase 무료 티어는 7일간 요청이 없으면 프로젝트가 일시정지**된다(강의자료에도 언급). 정지되면 배포된 앱의 DB 접근이 실패하니, 시연 전에 대시보드에서 상태를 확인할 것.
