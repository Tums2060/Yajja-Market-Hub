import { mysqlTable, int, text, timestamp, boolean, double, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const vendorsTable = mysqlTable("vendors", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  name: text("name").notNull(),
  category: mysqlEnum("category", ["food", "liquor", "pharmacy", "household"]).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  address: text("address"),
  rating: double("rating").default(4.5),
  deliveryTime: text("delivery_time").default("25-35 min"),
  minOrder: double("min_order").default(0),
  isOpen: boolean("is_open").notNull().default(true),
  status: mysqlEnum("status", ["pending_review", "approved", "rejected"]).notNull().default("approved"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendorsTable).omit({ id: true, createdAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;
