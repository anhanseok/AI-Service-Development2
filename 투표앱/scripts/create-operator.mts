// 운영자 계정을 만든다. 같은 아이디가 있으면 비밀번호를 바꾼다.
// 실행: npm run db:create-operator
// 아이디와 비밀번호는 실행 중에 입력받는다(코드나 명령어 기록에 남지 않게).
import { neon } from "@neondatabase/serverless";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { hashPassword } from "../lib/auth.ts";

// 한 줄씩 읽는다. 직접 타이핑해도, 파이프로 넘겨도 동작한다.
const rl = createInterface({ input: stdin, output: stdout });
const lines = rl[Symbol.asyncIterator]();
async function ask(prompt: string): Promise<string> {
  stdout.write(prompt);
  const { value } = await lines.next();
  return value ?? "";
}
const loginId = (await ask("운영자 아이디: ")).trim();
const password = await ask("비밀번호(8자 이상): ");
rl.close();

if (!loginId) {
  console.error("아이디가 비어 있어요.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("비밀번호는 8자 이상이어야 해요.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL!);
await sql`
  INSERT INTO operators (login_id, password_hash)
  VALUES (${loginId}, ${hashPassword(password)})
  ON CONFLICT (login_id) DO UPDATE SET password_hash = EXCLUDED.password_hash`;

console.log(`운영자 '${loginId}' 계정을 저장했어요.`);
