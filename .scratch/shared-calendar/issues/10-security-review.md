Part of: map.md
Type: task
Blocked by: 09
Status: open

## Question

완성된 앱에 대해 보안 점검을 수행한다 (사용자가 이번 wayfinder 세션 시작 전 요청한 항목 — 배포 완료 후 진행하기로 확정).

체크리스트:
- `/security-review` 스킬로 인증/인가, API 라우트별 권한 체크, 환경변수 노출 여부 점검
- 특히 확인: 다른 사용자의 캘린더/일정에 API로 직접 접근 가능한지 (IDOR), 초대 API가 임의의 캘린더에 멤버를 추가할 수 있는지
- 발견된 취약점은 심각도순으로 정리 후 수정
