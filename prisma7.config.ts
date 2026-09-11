import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js reads .env.local automatically; the Prisma CLI does not.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need Supabase's direct connection (5432); the pooled 6543 URL
    // used at runtime rejects the statements migrate issues.
    url: env("DIRECT_URL"),
  },
});
