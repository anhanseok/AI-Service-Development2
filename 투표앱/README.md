# 투표 앱

운영자가 질문을 올리면 사람들이 선택지 하나를 골라 투표하고, 결과를 가로 막대 그래프로 보는 웹앱.

- 배포: https://voting-app-sigma-nine.vercel.app
- 기술: Next.js 16 (App Router) + Neon Postgres (`@neondatabase/serverless`) + Tailwind CSS, Vercel 배포
- 만든 사람: 안한석

## 기능

| 누가 | 할 수 있는 것 |
|------|---------------|
| 운영자 | 로그인/로그아웃, 투표 만들기(질문, 선택지 2~6개, 한국 시간 마감), 수정, 삭제, 결과 언제나 보기 |
| 투표자 | 로그인 없이 투표, 마감 전까지 표 바꾸기, 투표 후 결과 보기 |
| 모두 | 마감된 투표의 결과 보기 |

규칙

- 브라우저(쿠키)당 투표마다 1표.
- 마감 시간이 지나면 투표가 거부된다(서버 시각 기준).
- 진행 중인 투표의 결과는 투표한 사람과 운영자만 본다.
- 표가 들어온 뒤에는 기존 선택지를 고치거나 지울 수 없고, 새 선택지 추가만 된다.
- 마감된 투표도 마감 시간을 뒤로 옮기면 다시 열린다.

## 실행

`.env.local`을 만들고 아래 두 값을 넣는다.

```
DATABASE_URL=postgresql://...        # Neon 연결 문자열
SESSION_SECRET=...                   # 아무 긴 무작위 문자열
```

```bash
npm install
npm run db:migrate           # 테이블 생성 (여러 번 실행해도 안전)
npm run db:seed              # 샘플 투표 (선택)
npm run db:create-operator   # 운영자 계정 만들기 (아이디/비밀번호 입력)
npm run dev                  # http://localhost:3000
npm test                     # 규칙 테스트 (Vitest)
```

## 구조

| 경로 | 내용 |
|------|------|
| `lib/poll.ts` | 투표 규칙 전부(마감, 입력 검사, 수정 잠금, 결과 계산, 공개 여부). DB·시계 없이 순수 함수 |
| `lib/auth.ts` | 비밀번호 해시, 세션 토큰 서명 |
| `lib/db.ts` | Neon SQL |
| `lib/session.ts`, `lib/voter.ts` | 운영자 세션 쿠키, 투표자 쿠키 |
| `app/actions/` | 서버 액션(로그인, 투표 만들기/수정/삭제, 투표하기) |
| `CONTEXT.md` | 용어집(운영자, 투표자, 투표, 선택지, 표, 결과 등) |
| `.scratch/voting-app/` | 스펙과 티켓 01~06 |
