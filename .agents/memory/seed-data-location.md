---
name: Seed data has no static source file
description: Where Yajja's product/vendor seed data lives and how to modify it
---

Yajja's seed data (products, vendors, group, users) exists **only as rows in the
PostgreSQL DB** — there is no static seed script or fixture file in the repo to grep
or edit (searching product names like "Matoke"/"Rolex Special" finds nothing in source).

**How to apply:** To add/change seed values (e.g. populating the `tags` column for
existing products, fixing demo data), run SQL `UPDATE`/`INSERT` directly against the DB
(via `executeSql` in code_execution) rather than looking for a seed file. Changes
persist in the DB and survive restarts.

**Why:** The original seeding was done once and its source is gone; the live DB is the
source of truth for demo data.
