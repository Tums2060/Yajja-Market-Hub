import { drizzle as pgDrizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import { drizzle as mysqlDrizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  eq,
  type SQL,
  type InferInsertModel,
  type InferSelectModel,
} from "drizzle-orm";
import { type PgTable } from "drizzle-orm/pg-core";
import * as pgSchema from "./schema";
import * as mysqlSchema from "./schema-mysql";

/**
 * Dual-dialect database layer.
 *
 * Default is PostgreSQL (what Replit provisions). Set `DB_DIALECT=mysql`
 * (or `mariadb`) to run against a MariaDB/MySQL server instead — the rest of
 * the application code is unchanged because the active table objects are
 * swapped here and `RETURNING` is abstracted behind the helpers below.
 */
const dialect = (process.env.DB_DIALECT ?? "postgres").toLowerCase();
export const IS_MYSQL = dialect === "mysql" || dialect === "mariadb";

// The canonical/typed view of the schema is always the Postgres one, so all
// downstream code type-checks against a single dialect even when MySQL runs.
type DB = NodePgDatabase<typeof pgSchema>;

const enableQueryLog = process.env.DB_LOG_QUERIES === "1";
const logger = enableQueryLog
  ? {
    logQuery(query: string, params: unknown[]) {
      console.log("[db]", query, params);
    },
  }
  : undefined;

function mysqlConnection(): string | mysql.PoolOptions {
  const url = process.env.DATABASE_URL;
  if (url && /^mysql:\/\//i.test(url)) return url;
  return {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME,
  };
}

function makeDb(): { db: DB; pool: unknown } {
  if (IS_MYSQL) {
    const conn = mysqlConnection();
    const mysqlPool = typeof conn === "string"
      ? mysql.createPool(conn)
      : mysql.createPool(conn);
    const mysqlDb = mysqlDrizzle(mysqlPool, {
      schema: mysqlSchema,
      mode: "default",
      logger,
    });
    return { db: mysqlDb as unknown as DB, pool: mysqlPool };
  }
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  const pgPool = new PgPool({ connectionString: process.env.DATABASE_URL });
  return { db: pgDrizzle(pgPool, { schema: pgSchema, logger }), pool: pgPool };
}

const created = makeDb();
export const db: DB = created.db;
export const pool = created.pool;

// Runtime-active table objects, typed as the canonical Postgres schema. These
// explicit exports shadow the `export *` below so consumers keep importing
// table names directly (`import { ordersTable } from "@workspace/db"`).
const activeSchema = (IS_MYSQL ? mysqlSchema : pgSchema) as unknown as typeof pgSchema;
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
} = activeSchema;

// Types (and the Postgres enum objects) come from the canonical schema.
export * from "./schema";

/**
 * Insert a row and return it. MySQL/MariaDB has no `RETURNING`, so on that
 * dialect we read back the row by its auto-increment id.
 */
export async function dbInsertReturning<T extends PgTable>(
  table: T,
  values: InferInsertModel<T>,
): Promise<InferSelectModel<T>> {
  if (IS_MYSQL) {
    const result = await (db as any).insert(table).values(values);
    const insertId = Array.isArray(result)
      ? result[0]?.insertId
      : result?.insertId;
    const [row] = await (db as any)
      .select()
      .from(table)
      .where(eq((table as any).id, insertId));
    return row as InferSelectModel<T>;
  }
  const [row] = await (db as any).insert(table).values(values).returning();
  return row as InferSelectModel<T>;
}

/**
 * Update rows matching `where` and return the (first) updated row. On MySQL we
 * re-select with the same predicate since `RETURNING` is unavailable.
 */
export async function dbUpdateReturning<T extends PgTable>(
  table: T,
  values: Partial<InferInsertModel<T>>,
  where: SQL,
): Promise<InferSelectModel<T> | undefined> {
  if (IS_MYSQL) {
    // Success is decided by the UPDATE's affectedRows (atomic), so a concurrent
    // mutation between the update and the read-back cannot cause a false "no
    // match". The re-select (same predicate) just fetches the row to return.
    const result = await (db as any).update(table).set(values).where(where);
    const affected = Array.isArray(result)
      ? result[0]?.affectedRows
      : result?.affectedRows;
    if (!affected) return undefined;
    const [row] = await (db as any).select().from(table).where(where);
    return row as InferSelectModel<T> | undefined;
  }
  const [row] = await (db as any).update(table).set(values).where(where).returning();
  return row as InferSelectModel<T> | undefined;
}
