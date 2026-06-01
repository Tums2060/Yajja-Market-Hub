import { mysqlTable, int, varchar, text, timestamp, boolean, double, mysqlEnum } from "drizzle-orm/mysql-core";

export const categoryValues = ["food", "liquor", "pharmacy", "household"] as const;
export const vendorStatusValues = ["pending_review", "approved", "rejected"] as const;

export const vendorsTable = mysqlTable("vendors", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: text("name").notNull(),
  ownerName: text("owner_name"),
  category: mysqlEnum("category", categoryValues).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  address: text("address"),
  lat: double("lat"),
  lng: double("lng"),
  rating: double("rating").default(4.5),
  deliveryTime: varchar("delivery_time", { length: 64 }).default("25-35 min"),
  minOrder: double("min_order").default(0),
  isOpen: boolean("is_open").notNull().default(true),
  status: mysqlEnum("status", vendorStatusValues).notNull().default("approved"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertVendor = typeof vendorsTable.$inferInsert;
export type Vendor = typeof vendorsTable.$inferSelect;
