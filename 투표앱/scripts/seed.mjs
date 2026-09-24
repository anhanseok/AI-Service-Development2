// 샘플 투표 입력. 투표가 이미 있으면 건너뛴다. --reset 을 붙이면 모두 지우고 다시 넣는다.
// 실행: npm run db:seed  (또는 npm run db:seed -- --reset)
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const reset = process.argv.includes("--reset");

const HOUR = 60 * 60 * 1000;
const fromNow = (hours) => new Date(Date.now() + hours * HOUR);

const samples = [
  { question: "오늘 점심 뭐 먹지?", deadline: fromNow(3), options: ["짜장면", "김치찌개", "샌드위치"] },
  { question: "다음 스터디 요일은?", deadline: fromNow(50), options: ["월요일", "수요일", "금요일"] },
  { question: "MT 장소는 어디가 좋을까?", deadline: fromNow(-2), options: ["가평", "강릉", "춘천", "속초"] },
  { question: "팀 이름 투표", deadline: fromNow(-72), options: ["코드몽키", "버그헌터"] },
];

if (reset) {
  await sql`DELETE FROM polls`;
} else {
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM polls`;
  if (count > 0) {
    console.log(`투표가 이미 ${count}개 있어서 건너뜁니다. 다시 넣으려면 --reset`);
    process.exit(0);
  }
}

for (const s of samples) {
  const [{ id }] = await sql`
    INSERT INTO polls (question, deadline) VALUES (${s.question}, ${s.deadline}) RETURNING id`;
  for (const [i, label] of s.options.entries()) {
    await sql`INSERT INTO options (poll_id, label, position) VALUES (${id}, ${label}, ${i})`;
  }
}

console.log(`샘플 투표 ${samples.length}개 입력 완료`);
