Part of: map.md
Type: task
Blocked by: 03
Status: resolved

## Question

Supabase Auth(이메일/비밀번호)를 Next.js 앱에 연동해 회원가입/로그인/로그아웃과 세션 보호(로그인 안 하면 캘린더 접근 불가)를 구현한다.

체크리스트:
- Supabase 클라이언트 설정 (브라우저용/서버용 분리)
- 회원가입, 로그인, 로그아웃 페이지/기능
- 인증 미들웨어 또는 서버 컴포넌트에서 세션 체크
- 로그인 후 캘린더 목록 페이지로 리다이렉트

## Answer

`@supabase/ssr` 0.12.7 + `@supabase/supabase-js` 2.116으로 이메일/비밀번호 인증 구현 완료. 브라우저에서 실제 회원가입 → `/calendars` 진입 → `User` 테이블에 행 생성까지 확인함.

구성:
- `src/lib/supabase/server.ts` — 요청마다 새로 만드는 서버 클라이언트. `getAll`/`setAll` 쿠키 방식(구 `get`/`set`/`remove`는 deprecated). Server Component에서는 쿠키 쓰기가 막혀 있어 `setAll`을 try/catch로 감싸고, 실제 세션 갱신은 미들웨어가 담당.
- `src/middleware.ts` — 세션 갱신 + 라우트 보호. matcher는 `/calendars/:path*`와 `/login`. 비로그인 상태로 `/calendars` 접근 시 `/login`으로, 로그인 상태로 `/login` 접근 시 `/calendars`로 리다이렉트. **`supabase.auth.getUser()`를 응답 반환 전에 호출해야** 갱신된 토큰이 쿠키에 써짐.
- `src/app/login/actions.ts` — `signIn` / `signUp` / `signOut` 서버 액션. 로그인 성공 시 `syncUser()`가 `public.User`에 upsert.
- `src/app/login/page.tsx` — 로그인/회원가입 토글 폼 (`useActionState`).
- `src/app/calendars/page.tsx` — 보호된 페이지. **06번 티켓에서 실제 캘린더 워크스페이스로 교체될 임시 화면.**

결정: **Supabase의 Confirm email 설정을 끔** (대시보드 → Authentication → Providers → Email). 이유: 테스트 계정을 여러 개 만들어 초대 기능(07번)을 검증해야 하는데, 켜져 있으면 계정마다 실제 메일 인증이 필요하고 무료 티어는 시간당 발송 수도 제한됨. **실제 서비스로 공개한다면 다시 켜야 함** — 10번(보안 점검) 티켓에서 확인할 것.

다음 세션 참고용 함정:
1. **03번에서 저장된 API 키 2개가 잘못돼 있었음** — anon key 자리에 REST 엔드포인트 URL이 들어가 있었고 service_role도 키 형식이 아니었음. 재입력해서 해결. Supabase 새 UI는 명칭이 Publishable key / Secret key이고 `settings/api-keys` 경로에 있음.
2. **Supabase는 `@example.com` 이메일을 거부함** — 테스트 계정 생성 시 다른 도메인을 쓸 것.
3. 인증 설정은 `GET {SUPABASE_URL}/auth/v1/settings`(apikey 헤더)로 확인 가능 — `mailer_autoconfirm`이 이메일 확인 여부.
