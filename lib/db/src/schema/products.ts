import { mysqlTable, int, text, timestamp, boolean, double } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const productsTable = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(),
  vendorId: int("vendor_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: double("price").notNull(),
  imageUrl: text("image_url"),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
