import { pgTable, serial, integer, text, timestamp, real, boolean, pgEnum, index } from "drizzle-orm/pg-core";
import { paymentStatusEnum } from "./payments";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "accepted",
  "confirmed",
  "preparing",
  "ready",
  "picked_up",
  "delivered",
  "cancelled",
  "rejected",
]);

export const groupOrderStatusEnum = pgEnum("group_order_status", [
  "pending_payment",
  "payment_complete",
  "placed",
  "cancelled",
]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  vendorId: integer("vendor_id").notNull(),
  riderId: integer("rider_id"),
  groupOrderId: integer("group_order_id"),
  status: orderStatusEnum("status").notNull().default("pending"),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryLat: real("delivery_lat"),
  deliveryLng: real("delivery_lng"),
  subtotal: real("subtotal").notNull(),
  deliveryFee: real("delivery_fee").notNull().default(2.5),
  total: real("total").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  userIdx: index("orders_user_idx").on(t.userId),
  riderIdx: index("orders_rider_idx").on(t.riderId),
  vendorIdx: index("orders_vendor_idx").on(t.vendorId),
  statusIdx: index("orders_status_idx").on(t.status),
  createdAtIdx: index("orders_created_at_idx").on(t.createdAt),
}));

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
  notes: text("notes"),
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

export type InsertOrder = typeof ordersTable.$inferInsert;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
export type GroupOrder = typeof groupOrdersTable.$inferSelect;
export type BillAssignment = typeof billAssignmentsTable.$inferSelect;
