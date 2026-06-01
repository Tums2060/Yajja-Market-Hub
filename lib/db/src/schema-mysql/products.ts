import { mysqlTable, int, varchar, text, timestamp, boolean, double } from "drizzle-orm/mysql-core";

export const productsTable = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  vendorId: int("vendor_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: double("price").notNull(),
  imageUrl: text("image_url"),
  category: varchar("category", { length: 64 }).notNull(),
  subcategory: varchar("subcategory", { length: 64 }),
  tags: text("tags"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertProduct = typeof productsTable.$inferInsert;
export type Product = typeof productsTable.$inferSelect;
