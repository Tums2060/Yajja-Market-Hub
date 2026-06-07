---
name: DB is PostgreSQL-only (MySQL/MariaDB removed)
description: The dual-dialect MySQL/MariaDB layer was deleted; @workspace/db is pure Postgres now.
---

# @workspace/db is PostgreSQL-only

The codebase once carried a dual-dialect layer (Postgres default + a parallel
`schema-mysql/` mirror, `DB_DIALECT` switching, `mysql2`, `IS_MYSQL`). That was
**removed at the user's request** — they switched fully to local PostgreSQL.

**What's gone:** `lib/db/src/schema-mysql/`, `lib/db/drizzle-mysql/`, the `mysql2`
dependency (both `lib/db` and `api-server`), the `mysql2` entry in api-server
`build.mjs` externals, `DB_DIALECT`/`IS_MYSQL`, and all `DB_HOST`/`DB_PORT`/
`DB_NAME`/`DB_USER`/`DB_PASSWORD` discrete-connection env handling.

**What remains:** `lib/db/src/index.ts` is a single `pg` `Pool` from `DATABASE_URL`
+ `drizzle-orm/node-postgres`. The `dbInsertReturning` / `dbUpdateReturning`
helpers are kept (8 callers) but are now thin pg-only wrappers over `.returning()`
— do NOT remove them, route code depends on them.

**Why:** keeping the dual layer was the user's earlier constraint; they reversed it.
Don't reintroduce mysql2/mysql-core unless the user explicitly asks again.

**How to apply:** add new tables only to `lib/db/src/schema/` (pg-core) + the
destructure list in `index.ts`. `drizzle.config.ts` uses **relative** paths
(`./src/schema/index.ts`, out `./drizzle`) — absolute `path.join(__dirname,...)`
paths make `drizzle-kit generate` build a malformed `.//abs/path` and crash (push
tolerated it, generate did not).
