Part of: map.md
Type: task
Blocked by: 01, 03
Status: open

## Question

확정된 데이터 모델(01번 티켓 결과)을 `schema.prisma`로 작성하고, 확보한 Supabase 연결(03번 티켓 결과)로 마이그레이션을 실행해 실제 테이블을 생성한다.

체크리스트:
- Prisma 설치 및 초기화
- `schema.prisma`에 01번에서 확정한 모델 작성
- `prisma migrate dev`로 로컬에서 마이그레이션 생성 및 Supabase에 적용
- Prisma Client 생성 확인, 간단한 쿼리로 연결 스모크 테스트
