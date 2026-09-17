import { redirect } from "next/navigation";

export default function Home() {
  // 앱의 진입점은 /calendars — 비로그인이면 미들웨어가 /login 으로 보낸다.
  redirect("/calendars");
}
