# 중고거래

당근마켓 스타일의 동네 중고거래 웹앱. (작업 중)

## 기술 스택

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- Prisma 6 + Neon Postgres
- Vercel 배포

## 로컬 실행

```bash
cd 중고거래
npm install
cp .env.example .env   # Neon 연결 주소 두 개를 채운다
npm run dev
```

`DATABASE_URL`은 pooled 연결(`-pooler` 포함), `DIRECT_URL`은 direct 연결이다.
