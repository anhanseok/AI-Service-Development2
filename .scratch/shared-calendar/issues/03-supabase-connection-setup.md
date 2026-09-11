Part of: map.md
Type: task
Status: resolved

## Question

기존 Supabase 프로젝트에서 이 앱이 쓸 연결 정보를 확보하고 `.env` 구성을 완료한다.

체크리스트:
- Supabase 대시보드에서 연결 문자열(런타임용 Supavisor 6543 포트, 마이그레이션용 direct URL) 확보
- Supabase Auth API URL / anon key / service role key 확보
- `my-app/.env.local` 및 `.env.example`에 필요한 키 정리 (`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 등)
- `.gitignore`에 `.env*.local`이 포함되어 있는지 확인

사용자가 Supabase 대시보드에서 값을 직접 가져와야 하는 부분(HITL)과, 파일 세팅(AFK)이 섞여 있다. 결과로 어떤 키가 어디에 저장됐는지를 답변에 기록한다.

## Answer

일회성 bash 위저드(`setup-supabase-env.sh`, 작업 완료 후 삭제)로 진행. 사용자가 Supabase 대시보드(Project Settings → Database, Settings → API Keys)에서 직접 값을 복사해 터미널에만 입력, 값은 대화에 노출되지 않음.

`my-app/.env.local`에 5개 키 저장 확인 완료 (값은 비공개, 키 이름만 검증):
- `DATABASE_URL` — Transaction pooler(6543, pgbouncer) 연결 문자열, API Routes 런타임용
- `DIRECT_URL` — Direct connection(5432), Prisma 마이그레이션용
- `NEXT_PUBLIC_SUPABASE_URL` — 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/publishable key
- `SUPABASE_SERVICE_ROLE_KEY` — service_role/secret key (서버 전용)

`my-app/.env.example`에 같은 키 이름을 값 없이 동기화. `.gitignore`에 `.env*` 이미 포함되어 있어 추가 작업 불필요.

중간에 겪은 이슈(다음 세션 참고용): Supabase 대시보드 UI가 개편되어 "Connection string" 섹션이 Database Settings 페이지가 아니라 상단 Connect 팝업 → ORMs → Prisma 탭에 있음. "anon key"/"service_role key" 명칭도 각각 "Publishable key"/"Secret key"로 바뀌었고, API Keys는 Settings → API가 아니라 별도 `settings/api-keys` 경로에 있음.
