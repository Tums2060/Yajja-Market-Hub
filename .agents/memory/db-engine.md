---
name: DB engine is PostgreSQL
description: The Yajja app's real database is PostgreSQL, not MySQL/MariaDB.
---
The provisioned database for this repl is **PostgreSQL** (DATABASE_URL=postgresql://, PGHOST on :5432). It already contains all tables and seed data.

**Why:** At one point the data layer was rewritten to MySQL (mysql2, drizzle-orm/mysql-core), which made every query fail with ECONNREFUSED on :3306 — there is no MySQL server. Some planning docs/user notes still wrongly call it "MariaDB/MySQL".

**How to apply:** Schema files use `drizzle-orm/pg-core` (serial, integer FKs, real for money/coords, pgEnum, timestamp). `lib/db/src/index.ts` uses pg Pool + drizzle-orm/node-postgres. `drizzle.config.ts` dialect = "postgresql". Use `.returning()` (not `$returningId()`). Never reintroduce mysql2/mysql-core. Enum changes need `ALTER TYPE ... ADD VALUE` SQL (non-destructive) since db push won't reorder enum values.
