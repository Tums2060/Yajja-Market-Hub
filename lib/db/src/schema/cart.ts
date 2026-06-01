import { pgTable, serial, integer, timestamp, text } from "drizzle-orm/pg-core";

export const cartItemsTable = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupCartItemsTable = pgTable("group_cart_items", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertCartItem = typeof cartItemsTable.$inferInsert;
export type CartItem = typeof cartItemsTable.$inferSelect;
export type GroupCartItem = typeof groupCartItemsTable.$inferSelect;
