import { mysqlTable, int, timestamp, text } from "drizzle-orm/mysql-core";

export const cartItemsTable = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  productId: int("product_id").notNull(),
  quantity: int("quantity").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupCartItemsTable = mysqlTable("group_cart_items", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("group_id").notNull(),
  userId: int("user_id").notNull(),
  productId: int("product_id").notNull(),
  quantity: int("quantity").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertCartItem = typeof cartItemsTable.$inferInsert;
export type CartItem = typeof cartItemsTable.$inferSelect;
export type GroupCartItem = typeof groupCartItemsTable.$inferSelect;
