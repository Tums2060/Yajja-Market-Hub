---
name: Dual-dialect DB (Postgres default + MySQL/MariaDB)
description: How @workspace/db supports both Postgres and MySQL behind one import surface, and the constraints that keeps stable.
---

# Dual-dialect @workspace/db

Backend runs Postgres (Replit default) or MySQL/MariaDB, chosen at process start by `DB_DIALECT` (`postgres` default | `mysql` | `mariadb`). MySQL is local/dev-only — Replit has no MySQL server, so that path is typecheck-only and NOT e2e-validated here.

## Single import surface, swapped at runtime
`lib/db/src/index.ts` exports `db` typed as the canonical `NodePgDatabase<typeof pgSchema>`. Runtime table objects are swapped with:
`export const { usersTable, ... } = activeSchema;` (activeSchema = pg or mysql set) **followed by** `export * from "./schema"`.
**Why:** the explicit destructured named exports *shadow* the trailing `export *`, so consumers keep `import { ordersTable } from "@workspace/db"` and get the dialect-correct runtime object, while the star still supplies pg types + enum objects. TS does NOT raise TS2308 here (a local explicit export legally overrides a star re-export). Don't "fix" this into two star exports — that would collide.
**How to apply:** when adding a table, add it to BOTH `lib/db/src/schema/` (canonical types) and the mirror `lib/db/src/schema-mysql/`, and add its name to the destructure list in index.ts.

## No RETURNING on MySQL
Never call `.returning()` in app code. Use `dbInsertReturning(table, values)` / `dbUpdateReturning(table, values, where)` from `@workspace/db`. Pg uses RETURNING; MySQL inserts then re-selects by `insertId`, and for updates decides success via the UPDATE's `affectedRows` (atomic) before re-selecting the row by the same predicate.
**Why:** affectedRows gating prevents spurious "no match" (e.g. false 409 on the atomic rider-claim) when a concurrent mutation lands between the update and the read-back.

## Externalized driver must be a runtime dep of the bundling artifact
`mysql2` is in `artifacts/api-server/build.mjs` esbuild `external` list, so the bundle keeps a runtime `import "mysql2/promise"` even on the pg path. Therefore `mysql2` must be a dependency of **api-server** (not only lib/db) or pg startup crashes on an unresolved import.
**Why:** externalized imports are resolved from the running artifact's node_modules at runtime, not bundled.

## Cross-dialect type caveats (dev-only, accepted)
MySQL mirror uses `int().autoincrement()` PKs, `double` for `real` (incl. money/coords — not exact decimal), `varchar(191)` for unique/token cols (utf8mb4 index limit), `text` for long strings, `mysqlEnum` inline, `timestamp` without timezone (pg uses `withTimezone` on some). These are acceptable for the local MySQL path but are NOT exact equivalents of the pg schema.
