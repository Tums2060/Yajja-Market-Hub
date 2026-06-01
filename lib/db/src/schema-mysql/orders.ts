import { mysqlTable, int, text, timestamp, double, boolean, mysqlEnum } from "drizzle-orm/mysql-core";
import { paymentStatusValues } from "./payments";

export const orderStatusValues = [
  "pending",
  "accepted",
  "confirmed",
  "preparing",
  "ready",
  "picked_up",
  "delivered",
  "cancelled",
  "rejected",
] as const;

export const groupOrderStatusValues = [
  "pending_payment",
  "payment_complete",
  "placed",
  "cancelled",
] as const;

export const ordersTable = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  vendorId: int("vendor_id").notNull(),
  riderId: int("rider_id"),
  groupOrderId: int("group_order_id"),
  status: mysqlEnum("status", orderStatusValues).notNull().default("pending"),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryLat: double("delivery_lat"),
  deliveryLng: double("delivery_lng"),
  subtotal: double("subtotal").notNull(),
  deliveryFee: double("delivery_fee").notNull().default(2.5),
  total: double("total").notNull(),
  paymentStatus: mysqlEnum("payment_status", paymentStatusValues).notNull().default("unpaid"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderItemsTable = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  productId: int("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: double("unit_price").notNull(),
  totalPrice: double("total_price").notNull(),
  notes: text("notes"),
});

export const groupOrdersTable = mysqlTable("group_orders", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("group_id").notNull(),
  initiatedBy: int("initiated_by").notNull(),
  status: mysqlEnum("status", groupOrderStatusValues).notNull().default("pending_payment"),
  deliveryAddress: text("delivery_address").notNull(),
  total: double("total").notNull(),
  amountCollected: double("amount_collected").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const billAssignmentsTable = mysqlTable("bill_assignments", {
  id: int("id").autoincrement().primaryKey(),
  groupOrderId: int("group_order_id").notNull(),
  userId: int("user_id").notNull(),
  amount: double("amount").notNull(),
  paid: boolean("paid").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertOrder = typeof ordersTable.$inferInsert;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
export type GroupOrder = typeof groupOrdersTable.$inferSelect;
export type BillAssignment = typeof billAssignmentsTable.$inferSelect;
