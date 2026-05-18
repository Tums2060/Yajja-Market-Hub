import { mysqlTable, int, text, timestamp, boolean } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const groupsTable = mysqlTable("groups", {
  id: int("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  description: text("description"),
  adminId: int("admin_id").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupMembersTable = mysqlTable("group_members", {
  id: int("id").primaryKey().autoincrement(),
  groupId: int("group_id").notNull(),
  userId: int("user_id").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const groupMessagesTable = mysqlTable("group_messages", {
  id: int("id").primaryKey().autoincrement(),
  groupId: int("group_id").notNull(),
  userId: int("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invitesTable = mysqlTable("invites", {
  id: int("id").primaryKey().autoincrement(),
  groupId: int("group_id").notNull(),
  fromUserId: int("from_user_id").notNull(),
  toUserId: int("to_user_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGroupSchema = createInsertSchema(groupsTable).omit({ id: true, createdAt: true });
export const insertGroupMemberSchema = createInsertSchema(groupMembersTable).omit({ id: true, joinedAt: true });
export const insertGroupMessageSchema = createInsertSchema(groupMessagesTable).omit({ id: true, createdAt: true });
export const insertInviteSchema = createInsertSchema(invitesTable).omit({ id: true, createdAt: true });

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groupsTable.$inferSelect;
export type GroupMember = typeof groupMembersTable.$inferSelect;
export type GroupMessage = typeof groupMessagesTable.$inferSelect;
export type Invite = typeof invitesTable.$inferSelect;
