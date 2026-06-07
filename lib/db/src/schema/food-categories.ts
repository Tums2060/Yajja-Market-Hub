import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const foodCategoriesTable = pgTable("food_categories", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const foodItemCategoriesTable = pgTable("food_item_categories", {
  id: serial("id").primaryKey(),
  foodItemId: integer("food_item_id").notNull(),
  categoryId: integer("category_id").notNull(),
});

export type InsertFoodCategory = typeof foodCategoriesTable.$inferInsert;
export type FoodCategory = typeof foodCategoriesTable.$inferSelect;
export type InsertFoodItemCategory = typeof foodItemCategoriesTable.$inferInsert;
export type FoodItemCategory = typeof foodItemCategoriesTable.$inferSelect;
