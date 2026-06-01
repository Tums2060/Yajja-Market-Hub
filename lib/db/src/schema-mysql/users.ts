import { mysqlTable, int, varchar, text, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";

export const userRoleValues = ["customer", "vendor", "rider", "admin"] as const;

export const usersTable = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: mysqlEnum("role", userRoleValues).notNull().default("customer"),
  phone: varchar("phone", { length: 32 }),
  avatarUrl: text("avatar_url"),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;
