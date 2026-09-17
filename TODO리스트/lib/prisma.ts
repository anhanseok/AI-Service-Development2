import { PrismaClient } from "@prisma/client";

/**
 * PrismaClient 단일 인스턴스.
 *
 * 개발 중에는 파일이 바뀔 때마다 모듈이 다시 로드되는데, 그때마다 new PrismaClient()를
 * 하면 DB 연결이 계속 쌓인다. globalThis에 보관해 두면 재로드되어도 같은 인스턴스를 쓴다.
 * any를 쓰지 않기 위해 unknown을 거쳐 좁힌다(헌법 원칙 III).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
