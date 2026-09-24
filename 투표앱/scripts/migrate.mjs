// 테이블 생성. 여러 번 실행해도 안전하다.
// 실행: npm run db:migrate
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS polls (
    id serial PRIMARY KEY,
    question text NOT NULL,
    deadline timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`;

await sql`
  CREATE TABLE IF NOT EXISTS options (
    id serial PRIMARY KEY,
    poll_id integer NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    label text NOT NULL,
    position integer NOT NULL,
    UNIQUE (poll_id, position)
  )`;

await sql`
  CREATE TABLE IF NOT EXISTS operators (
    id serial PRIMARY KEY,
    login_id text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;

// 브라우저(투표자 토큰)당 투표마다 표 하나. 표를 바꾸면 이 행의 option_id를 고친다.
await sql`
  CREATE TABLE IF NOT EXISTS votes (
    id serial PRIMARY KEY,
    poll_id integer NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id integer NOT NULL REFERENCES options(id) ON DELETE CASCADE,
    voter_token text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (poll_id, voter_token)
  )`;

console.log("마이그레이션 완료: polls, options, operators, votes");
