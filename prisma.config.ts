import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "server/prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
    // shadowDatabaseUrl can be added later if you use migrations.
  },
});

