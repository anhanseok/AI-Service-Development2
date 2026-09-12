Part of: map.md
Type: task
Blocked by: 09
Status: resolved

## Question

완성된 앱에 대해 보안 점검을 수행한다 (사용자가 이번 wayfinder 세션 시작 전 요청한 항목 — 배포 완료 후 진행하기로 확정).

체크리스트:
- `/security-review` 스킬로 인증/인가, API 라우트별 권한 체크, 환경변수 노출 여부 점검
- 특히 확인: 다른 사용자의 캘린더/일정에 API로 직접 접근 가능한지 (IDOR), 초대 API가 임의의 캘린더에 멤버를 추가할 수 있는지
- 발견된 취약점은 심각도순으로 정리 후 수정

## 배포 과정에서 추가된 확인 항목

- **DB 비밀번호 재설정 필요**: 09번 배포 중 `.env.local`의 연결 문자열이 IDE 선택을 통해 대화 로그에 평문 노출됨. Supabase 대시보드 → Database → Reset password로 교체하고, `.env.local`과 Vercel 환경변수(`DATABASE_URL`, `DIRECT_URL`) 양쪽을 갱신할 것.
- **Supabase Confirm email 재검토**: 05번에서 테스트 편의를 위해 꺼둠. 실제 공개 서비스라면 다시 켜야 함.
- **Supabase RLS(Row Level Security) 상태 확인**: 현재 권한 통제는 API Routes의 멤버십 체크에만 의존한다. `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 브라우저에 공개되므로, Supabase REST API로 테이블에 직접 접근이 가능한지(RLS가 꺼져 있는지) 확인 필요. 열려 있다면 API를 우회해 남의 일정을 읽을 수 있다.

## Answer

### 통과한 항목

- **API 우회 접근 차단됨.** 브라우저에 공개되는 anon 키로 Supabase REST API를 직접 호출해 4개 테이블 읽기와 Event 삽입을 시도 → 전부 `42501 insufficient_privilege`. 이유는 두 겹: (1) `public`의 모든 테이블에 RLS가 ON이고 정책이 없어 기본 거부, (2) `anon`/`authenticated` 역할에 SELECT/INSERT/UPDATE/DELETE 권한이 애초에 없음(Prisma가 만든 테이블이라 Data API용 권한이 부여되지 않았다). **즉 데이터 접근 경로는 우리 API Routes 하나뿐이다.**
- **모든 API 라우트가 인증을 확인한다.** 4개 라우트 파일 전부 `getCurrentUser()`로 401 처리. 캘린더 하위 리소스는 `isCalendarMember()`로 403 처리(`/api/calendars`의 목록·생성은 멤버십 대상이 없으므로 해당 없음 — 목록은 쿼리에서 멤버십으로 필터).
- **IDOR 없음.** 06·07번에서 타 계정으로 조회/수정/삭제/초대를 시도해 모두 403 확인.
- **service_role 키가 앱 코드에서 쓰이지 않는다.** `src/` 전체에 참조 없음(검증용 스크립트만 사용했음).
- **클라이언트 컴포넌트가 서버 전용 환경변수를 참조하지 않는다.** `NEXT_PUBLIC_` 외 `process.env` 사용은 프로토타입의 `NODE_ENV` 한 건뿐.
- **저장소에 비밀값 없음.** `.env*`는 gitignore, `.env.example`은 키 이름만.

### 고친 것

- 일정 제목/캘린더 이름에 길이 제한 추가(200자/100자). 이전에는 무제한이라 거대한 문자열을 저장할 수 있었다.

### 남은 조치 — 사용자 작업 필요

1. **[높음] DB 비밀번호 재설정.** 09번 진행 중 `.env.local`의 연결 문자열이 IDE 선택으로 대화 로그에 평문 노출됨. Supabase → Database → Reset password 후 `.env.local`과 Vercel의 `DATABASE_URL`·`DIRECT_URL` 갱신.
2. **[중간] Vercel에서 `SUPABASE_SERVICE_ROLE_KEY` 삭제.** 앱이 쓰지 않는 키를 배포 환경에 두면 유출 표면만 넓어진다. 로컬 `.env.local`에는 검증 스크립트용으로 남겨도 된다.
3. **[중간] Confirm email 재검토.** 05번에서 테스트 편의로 끔. 꺼진 상태에서는 남의 이메일 주소로 가입해 그 주소의 "가입된 사용자"가 될 수 있다(사칭 + 초대 대상 가로채기). 실제 공개 서비스로 쓸 거면 켤 것.
4. **[낮음] 프로토타입 라우트 삭제.** `/prototype/shared-calendar`가 배포 URL에 공개돼 있다. 데이터는 만지지 않는 목업이지만 혼란을 준다 — 11번 티켓에서 함께 제거.
5. **[낮음] `anon`/`authenticated`의 TRUNCATE 권한 회수 검토.** 현재 REST API로는 호출 경로가 없어 악용 불가하지만 불필요한 권한이다.

### 의도적으로 남긴 것

- **초대 API의 가입 여부 노출.** 미가입 이메일에 404 + "가입된 사용자만 초대할 수 있습니다"를 돌려주므로, 로그인한 사용자가 특정 이메일의 가입 여부를 확인할 수 있다(user enumeration). 01·02번에서 확정한 UX가 이 안내를 요구하고, 공격에 로그인이 필요하며 수업 프로젝트 규모라 그대로 둔다. 공개 서비스로 키울 경우 응답을 일반화하거나 초대 요청에 rate limit을 걸 것.
- **CSRF 방어 장치 없음.** API Routes가 `application/json`만 받아 `request.json()`으로 파싱하므로 폼 기반 교차 사이트 요청은 통하지 않고, 서버 액션은 Next.js가 origin을 검사한다. 별도 토큰은 두지 않았다.
