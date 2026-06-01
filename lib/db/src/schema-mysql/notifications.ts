import { mysqlTable, int, varchar, text, boolean, timestamp } from "drizzle-orm/mysql-core";

export const notificationsTable = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  orderId: int("order_id"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
