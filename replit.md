# Yajja — Multi-Category Delivery Platform

## Overview

Yajja is a Uganda-based multi-category delivery platform (Food, Liquor, Pharmacy, Household) with individual and group shopping modes, group chat, bill-splitting checkout, weekly leaderboard, vendor portal, rider portal, and admin portal. Built as a pnpm workspace monorepo using TypeScript.

## Portals
- **Customer Portal** (`/`) — shop, cart, checkout, orders, groups with chat & bill-split, leaderboard
- **Vendor Portal** (`/vendor-portal`) — dashboard, order management, product CRUD
- **Rider Portal** (`/rider-portal`) — order assignment, GPS tracking, delivery confirmation
- **Admin Portal** (`/admin-portal`) — dashboard stats, vendor approval, order monitoring, rider & user management

## Seed Users
| Email | Password | Role |
|---|---|---|
| `admin@yajja.com` | `admin123` | admin |
| `kira@yajja.com` | `password123` | customer |
| `mamafua@yajja.com` | `password123` | vendor |
| `kasim@yajja.com` | `password123` | rider |

## Seed Data
- 4 vendors (food, liquor, pharmacy, household) — status: approved
- 13 products across all categories (with `subcategory` field)
- 1 group "Nakasero Crew"
- Rider "Kasim" registered

## Key Features
- **In-app notifications**: persisted `notifications` table + bell in Navbar (unread badge, dropdown). Created on order status changes, new paid order, rider assignment, payment received. Pushed live over WebSocket (`{type:"notification"}`) and surfaced as toasts via `use-realtime-orders`.
- **Payments (M-Pesa Daraja STK Push)**: env-driven. Real STK Push activates automatically when `MPESA_*` keys are set (see `artifacts/api-server/.env.example`); otherwise degrades to auto-confirmed **simulation** so checkout works in dev. Endpoints: `POST /api/payments/stk-push`, `GET /api/payments/status?checkoutRequestId=`, public `POST /api/payments/callback`.
- **Escrow + payout ledger**: `payments` + `ledger_entries` tables. On payment success → `escrow_in` (held). On delivery → released into `payout_vendor` (subtotal − commission), `payout_rider` (delivery fee), `commission` (15% subtotal, `MPESA_COMMISSION_RATE`). Idempotent.
- **Order-flow consistency**: server-side `ALLOWED_TRANSITIONS` guard on `PUT /api/orders/:id/status` (invalid jumps → 400). Riders can only claim **ready + unassigned** orders; double-claim returns 409. Customers can cancel their own **pending** orders (`POST /api/orders/:id/cancel`).
- **Brand color**: Getir-style purple `hsl(258, 62%, 49%)` (light), `hsl(258, 70%, 62%)` (dark). Secondary is warm yellow `hsl(45, 95%, 55%)`.
- **Hero watermark**: `<HeroWatermark />` component scatters food/health/household emojis at low opacity over `bg-primary` sections (home hero, login, register)
- **Glovo-inspired home**: circular category cards, search bar, banner carousel
- **Category page**: horizontal scrollable subcategory tabs (`.scrollbar-hide` utility in CSS)
- **Anti-fraud**: phone required on registration, phone uniqueness enforced, max 5 group memberships
- **Admin**: `requireAdmin` middleware on all `/api/admin/*` routes; JWT auth with role=admin
- **Mobile**: bottom nav bar (`BottomNav.tsx`) shown for customer role only

## Architecture

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL (default) or MariaDB/MySQL, dual-dialect via Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + wouter + TanStack Query + shadcn/ui + Tailwind

## Key Packages
- `artifacts/yajja` — React Vite frontend (`@workspace/yajja`)
- `artifacts/api-server` — Express 5 API (`@workspace/api-server`)
- `lib/db` — Drizzle ORM schema + migrations (`@workspace/db`)
- `lib/api-spec` — OpenAPI spec + Orval codegen (`@workspace/api-spec`)
- `lib/api-client-react` — Generated React Query hooks (`@workspace/api-client-react`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Database Dialect (Postgres / MariaDB-MySQL)
The backend is **dual-dialect**, selected at process start by `DB_DIALECT` (`postgres` default, or `mysql`/`mariadb`). Replit provisions Postgres, so the default keeps working unchanged; MariaDB/MySQL is for running locally.
- **Schemas**: `lib/db/src/schema/` (Postgres, canonical — also the source of all exported TS types) and a parallel `lib/db/src/schema-mysql/` (mysql-core mirror: `int().autoincrement()` PKs, `double` for real, `varchar` for unique/defaulted/short strings, `text` for long, `mysqlEnum` inline). Keep the two sets in sync when changing the schema.
- **Connection** (`lib/db/src/index.ts`): picks `node-postgres` or `mysql2` by `DB_DIALECT`. The active table objects are swapped behind the same `@workspace/db` named exports, typed against the Postgres schema, so route code is dialect-agnostic. Exports `IS_MYSQL`.
- **RETURNING**: MySQL has no `RETURNING`. Never call `.returning()` in app code — use the helpers `dbInsertReturning(table, values)` and `dbUpdateReturning(table, values, where)` from `@workspace/db` (pg uses RETURNING; mysql inserts then re-selects).
- **Connection env for MySQL**: a `mysql://` `DATABASE_URL`, or discrete `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`. Optional `DB_LOG_QUERIES=1` logs SQL. See `artifacts/api-server/.env.example`.
- **Migrations**: `drizzle.config.ts` switches dialect/schema-path/credentials by `DB_DIALECT` (out dir `drizzle/` for pg, `drizzle-mysql/` for mysql). Run `pnpm --filter @workspace/db run push` against whichever dialect `DB_DIALECT` points to.
- **MySQL is dev-only**: Replit provisions only Postgres, so the MySQL path is typecheck-validated but not e2e-tested here. Known cross-dialect caveats: `double` (not exact decimal) for money/coordinates, `timestamp` without timezone, and `varchar(191)` for unique columns. Validate against a real MariaDB/MySQL before relying on it in production.

## DB Schema Notes
- `users` table: `id`, `name`, `email`, `password_hash`, `role` (customer/vendor/rider/admin), `phone`, `createdAt`
- `vendors` table: `status` enum (`pending_review`/`approved`/`rejected`)
- `products` table: `subcategory` text field added for category page tab filtering

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
