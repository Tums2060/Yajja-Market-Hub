import { drizzle as pgDrizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import {
  type SQL,
  type InferInsertModel,
  type InferSelectModel,
} from "drizzle-orm";
import { type PgTable } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * PostgreSQL database layer (node-postgres + Drizzle ORM).
 *
 * The connection string comes from `DATABASE_URL`. On Replit this is set
 * automatically by the provisioned Postgres database; for local development
 * copy `.env.example` to `.env` and point it at your local Postgres instance.
 */
type DB = NodePgDatabase<typeof schema>;

const enableQueryLog = process.env.DB_LOG_QUERIES === "1";
const logger = enableQueryLog
  ? {
    logQuery(query: string, params: unknown[]) {
      console.log("[db]", query, params);
    },
  }
  : undefined;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pgPoolMax = Number(process.env.DB_POOL_MAX) || 10;
const pgPool = new PgPool({
  connectionString: process.env.DATABASE_URL,
  max: pgPoolMax,
});
export const db: DB = pgDrizzle(pgPool, { schema, logger });
export const pool = pgPool;

export const {
  usersTable,
  vendorsTable,
  productsTable,
  cartItemsTable,
  groupCartItemsTable,
  groupsTable,
  groupMembersTable,
  groupMessagesTable,
  invitesTable,
  riderProfilesTable,
  notificationsTable,
  paymentsTable,
  ledgerEntriesTable,
  ordersTable,
  orderItemsTable,
  groupOrdersTable,
  billAssignmentsTable,
  passwordResetTokensTable,
  foodCategoriesTable,
  foodItemCategoriesTable,
  savedLocationsTable,
} = schema;

export * from "./schema";

/**
 * Insert a row and return it (uses Postgres `RETURNING`).
 */
export async function dbInsertReturning<T extends PgTable>(
  table: T,
  values: InferInsertModel<T>,
): Promise<InferSelectModel<T>> {
  const [row] = await (db as any).insert(table).values(values).returning();
  return row as InferSelectModel<T>;
}

/**
 * Update rows matching `where` and return the (first) updated row
 * (uses Postgres `RETURNING`).
 */
export async function dbUpdateReturning<T extends PgTable>(
  table: T,
  values: Partial<InferInsertModel<T>>,
  where: SQL,
): Promise<InferSelectModel<T> | undefined> {
  const [row] = await (db as any).update(table).set(values).where(where).returning();
  return row as InferSelectModel<T> | undefined;
}
