import { pgTable, serial, integer, text, varchar, doublePrecision, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const savedLocationsTable = pgTable("saved_locations", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  address: text("address").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  customerIdx: index("saved_locations_customer_idx").on(t.customerId),
}));

export type SavedLocation = typeof savedLocationsTable.$inferSelect;
export type InsertSavedLocation = typeof savedLocationsTable.$inferInsert;
