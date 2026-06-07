import { mysqlTable, int, varchar, timestamp } from "drizzle-orm/mysql-core";

export const foodCategoriesTable = mysqlTable("food_categories", {
  id: int("id").autoincrement().primaryKey(),
  vendorId: int("vendor_id").notNull(),
  name: varchar("name", { length: 191 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const foodItemCategoriesTable = mysqlTable("food_item_categories", {
  id: int("id").autoincrement().primaryKey(),
  foodItemId: int("food_item_id").notNull(),
  categoryId: int("category_id").notNull(),
});

export type InsertFoodCategory = typeof foodCategoriesTable.$inferInsert;
export type FoodCategory = typeof foodCategoriesTable.$inferSelect;
export type InsertFoodItemCategory = typeof foodItemCategoriesTable.$inferInsert;
export type FoodItemCategory = typeof foodItemCategoriesTable.$inferSelect;
