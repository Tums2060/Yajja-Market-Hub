import { mysqlTable, int, text, varchar, timestamp, boolean } from "drizzle-orm/mysql-core";

export const groupsTable = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  adminId: int("admin_id").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupMembersTable = mysqlTable("group_members", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("group_id").notNull(),
  userId: int("user_id").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const groupMessagesTable = mysqlTable("group_messages", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("group_id").notNull(),
  userId: int("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invitesTable = mysqlTable("invites", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("group_id").notNull(),
  fromUserId: int("from_user_id").notNull(),
  toUserId: int("to_user_id").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertGroup = typeof groupsTable.$inferInsert;
export type Group = typeof groupsTable.$inferSelect;
export type GroupMember = typeof groupMembersTable.$inferSelect;
export type GroupMessage = typeof groupMessagesTable.$inferSelect;
export type Invite = typeof invitesTable.$inferSelect;
