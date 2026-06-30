import { pgTable, serial, text, timestamp, pgEnum, index, boolean } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["customer", "vendor", "rider", "admin", "super_admin"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("customer"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  roleIdx: index("users_role_idx").on(t.role),
  createdAtIdx: index("users_created_at_idx").on(t.createdAt),
}));

export type InsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;
