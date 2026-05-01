import { pgTable, serial, text, timestamp, integer, boolean, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoryEnum = pgEnum("category", ["food", "liquor", "pharmacy", "household"]);

export const vendorsTable = pgTable("vendors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  category: categoryEnum("category").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  address: text("address"),
  rating: real("rating").default(4.5),
  deliveryTime: text("delivery_time").default("25-35 min"),
  minOrder: real("min_order").default(0),
  isOpen: boolean("is_open").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendorsTable).omit({ id: true, createdAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;
