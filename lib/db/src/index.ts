import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const enableQueryLog = process.env.DB_LOG_QUERIES === "1";

export const db = drizzle(pool, {
  schema,
  logger: enableQueryLog
    ? {
      logQuery(query, params) {
        console.log("[db]", query, params);
      },
    }
    : undefined,
});

export * from "./schema";
