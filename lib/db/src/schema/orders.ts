import { pgTable, serial, text, timestamp, integer, real, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const orderStatusEnum = pgEnum("order_status", [
  "pending", "confirmed", "preparing", "ready", "picked_up", "delivered", "cancelled"
]);

export const groupOrderStatusEnum = pgEnum("group_order_status", [
  "pending_payment", "payment_complete", "placed", "cancelled"
]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  vendorId: integer("vendor_id").notNull(),
  riderId: integer("rider_id"),
  groupOrderId: integer("group_order_id"),
  status: orderStatusEnum("status").notNull().default("pending"),
  deliveryAddress: text("delivery_address").notNull(),
  subtotal: real("subtotal").notNull(),
  deliveryFee: real("delivery_fee").notNull().default(2.5),
  total: real("total").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
});

export const groupOrdersTable = pgTable("group_orders", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  initiatedBy: integer("initiated_by").notNull(),
  status: groupOrderStatusEnum("status").notNull().default("pending_payment"),
  deliveryAddress: text("delivery_address").notNull(),
  total: real("total").notNull(),
  amountCollected: real("amount_collected").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const billAssignmentsTable = pgTable("bill_assignments", {
  id: serial("id").primaryKey(),
  groupOrderId: integer("group_order_id").notNull(),
  userId: integer("user_id").notNull(),
  amount: real("amount").notNull(),
  paid: boolean("paid").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true });
export const insertGroupOrderSchema = createInsertSchema(groupOrdersTable).omit({ id: true, createdAt: true });
export const insertBillAssignmentSchema = createInsertSchema(billAssignmentsTable).omit({ id: true, createdAt: true });

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
export type GroupOrder = typeof groupOrdersTable.$inferSelect;
export type BillAssignment = typeof billAssignmentsTable.$inferSelect;
