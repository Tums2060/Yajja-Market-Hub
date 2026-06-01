import { pgTable, serial, integer, text, timestamp, boolean, real } from "drizzle-orm/pg-core";

export const riderProfilesTable = pgTable("rider_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  vehicleType: text("vehicle_type").notNull(),
  licensePlate: text("license_plate"),
  currentLat: real("current_lat"),
  currentLng: real("current_lng"),
  isAvailable: boolean("is_available").notNull().default(true),
  totalDeliveries: integer("total_deliveries").notNull().default(0),
  rating: real("rating").default(5.0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertRiderProfile = typeof riderProfilesTable.$inferInsert;
export type RiderProfile = typeof riderProfilesTable.$inferSelect;
