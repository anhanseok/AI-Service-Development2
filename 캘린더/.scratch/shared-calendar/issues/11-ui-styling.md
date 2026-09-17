Part of: map.md
Type: prototype
Blocked by: 07
Status: resolved

## Question

기능이 모두 구현된 화면에 디자인을 입힌다. 06번까지는 동작에만 집중해 기본 테두리/버튼 상태로 남겨뒀고, 사용자가 "기능 다 끝난 뒤 꾸미기"로 결정함.

정해야 할 것:
- 전체 톤 (색상 팔레트, 다크모드 지원 여부 — 현재 `globals.css`에 `prefers-color-scheme` 변수가 있지만 화면들은 이를 거의 쓰지 않음)
- 월간 뷰 밀도: 셀 높이, 일정이 많을 때 처리(더보기 표시 등)
- 일정 색상 구분 필요 여부 (캘린더별 색상 vs 단색)
- 빈 상태 / 로딩 / 에러 표시 방식 (현재는 최소한의 텍스트만)
- 모바일 화면 대응 범위 (사이드바를 어떻게 접을지)

대상 화면: `/login`, `/calendars`(사이드바 + 월간 뷰 + 일정 모달 + 초대 모달).

`prototype` 스킬로 스타일 변형안을 비교한 뒤 적용할 것. 이 티켓이 끝나면 `src/app/prototype/shared-calendar` 라우트도 함께 삭제(02번 티켓 참고).

## Answer

"깔끔한 모던" 톤 + **라이트/다크 둘 다** 지원으로 확정·적용 완료.

- `globals.css`에 역할 기반 디자인 토큰 정의(surface/foreground/muted/border/hover/primary/danger/success 등). 라이트를 기본으로 두고 `@media (prefers-color-scheme: dark)`에서 값만 교체 → OS/브라우저 테마 따라 자동 전환. Tailwind v4 `@theme inline`으로 토큰을 유틸리티 색으로 노출(`bg-surface`, `text-muted` 등).
- 로그인: 카드형 폼 + 인디고 포인트 + 로고.
- 캘린더: 사이드바(로고/구분선/호버), 격자 월간 뷰(요일 색 구분, **오늘 날짜 원형 강조**, 일정은 좌측 보더 알약), "오늘" 버튼 추가, 본문 가로 스크롤 컨테이너로 좁은 화면 대응.
- 모달: 배경 블러 + 둥근 카드로 통일. 중복됐던 두 모달의 셸을 `ModalShell` 컴포넌트로 추출. 멤버 목록에 이니셜 아바타.
- 입력/버튼 포커스 링을 `globals.css`에서 토큰 색으로 통일.

프로덕션 빌드 성공, tsc/eslint 통과. **`src/app/prototype/shared-calendar` 라우트 삭제 완료**(02·10번 티켓 약속대로) — 배포 URL에서 목업이 사라짐.

남긴 것: 모바일에서 사이드바를 접는 완전 반응형은 범위 밖(본문만 가로 스크롤로 처리). 필요해지면 별도 티켓.
