import { mysqlTable, int, text, timestamp, boolean, double } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const riderProfilesTable = mysqlTable("rider_profiles", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().unique(),
  vehicleType: text("vehicle_type").notNull(),
  licensePlate: text("license_plate"),
  currentLat: double("current_lat"),
  currentLng: double("current_lng"),
  isAvailable: boolean("is_available").notNull().default(true),
  totalDeliveries: int("total_deliveries").notNull().default(0),
  rating: double("rating").default(5.0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRiderProfileSchema = createInsertSchema(riderProfilesTable).omit({ id: true, createdAt: true });
export type InsertRiderProfile = z.infer<typeof insertRiderProfileSchema>;
export type RiderProfile = typeof riderProfilesTable.$inferSelect;
