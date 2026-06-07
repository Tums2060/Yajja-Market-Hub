# Yajja — Local Setup (PostgreSQL)

Yajja is a pnpm-workspace monorepo. The database is **PostgreSQL only**.

## Prerequisites

- Node.js 24
- pnpm (`npm install -g pnpm`)
- A local PostgreSQL server

## Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp artifacts/api-server/.env.example artifacts/api-server/.env
# then edit artifacts/api-server/.env and set DATABASE_URL to your local Postgres, e.g.
#   DATABASE_URL=postgresql://localhost:5432/yajja_market
# (lib/db reads DATABASE_URL too — set it there as well, or export it in your shell)

# 3. Create the database in PostgreSQL
createdb yajja_market

# 4. Apply the database schema
#    Either run the generated migrations:
pnpm --filter @workspace/db run migrate
#    …or push the schema directly (dev convenience):
pnpm --filter @workspace/db run push

# 5. Start the dev servers
#    On Replit these run as workflows automatically. Locally, start each artifact:
pnpm --filter @workspace/api-server run dev   # Express API
pnpm --filter @workspace/yajja run dev        # React + Vite frontend
```

## Database commands (`@workspace/db`)

| Command | Purpose |
|---|---|
| `pnpm --filter @workspace/db run generate` | Generate SQL migration files from the schema into `lib/db/drizzle/` |
| `pnpm --filter @workspace/db run migrate` | Apply migrations to the database in `DATABASE_URL` |
| `pnpm --filter @workspace/db run push` | Push the schema directly without migration files (dev only) |

## Notes

- The schema lives in `lib/db/src/schema/` (Drizzle `pg-core`) and is the single
  source of all exported TypeScript types.
- `DATABASE_URL` is the only required DB variable. On Replit it is provisioned
  automatically; locally you supply it via `.env`.
- Set `DB_LOG_QUERIES=1` to log every SQL query during development.
- Run `pnpm run typecheck` for a full type check across the monorepo.
