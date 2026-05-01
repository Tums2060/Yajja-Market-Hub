import { pgTable, serial, text, timestamp, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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

export const insertRiderProfileSchema = createInsertSchema(riderProfilesTable).omit({ id: true, createdAt: true });
export type InsertRiderProfile = z.infer<typeof insertRiderProfileSchema>;
export type RiderProfile = typeof riderProfilesTable.$inferSelect;
