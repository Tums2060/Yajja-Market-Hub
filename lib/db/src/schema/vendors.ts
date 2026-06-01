import { pgTable, serial, integer, text, timestamp, boolean, real, pgEnum } from "drizzle-orm/pg-core";

export const categoryEnum = pgEnum("category", ["food", "liquor", "pharmacy", "household"]);
export const vendorStatusEnum = pgEnum("vendor_status", ["pending_review", "approved", "rejected"]);

export const vendorsTable = pgTable("vendors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  ownerName: text("owner_name"),
  category: categoryEnum("category").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  address: text("address"),
  lat: real("lat"),
  lng: real("lng"),
  rating: real("rating").default(4.5),
  deliveryTime: text("delivery_time").default("25-35 min"),
  minOrder: real("min_order").default(0),
  isOpen: boolean("is_open").notNull().default(true),
  status: vendorStatusEnum("status").notNull().default("approved"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertVendor = typeof vendorsTable.$inferInsert;
export type Vendor = typeof vendorsTable.$inferSelect;
