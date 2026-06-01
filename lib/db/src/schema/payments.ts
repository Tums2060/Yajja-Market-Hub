import { pgTable, serial, integer, text, real, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "pending",
  "paid",
  "failed",
]);

export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "escrow_in",
  "payout_vendor",
  "payout_rider",
  "commission",
  "refund",
]);

export const ledgerEntryStatusEnum = pgEnum("ledger_entry_status", [
  "held",
  "released",
  "reversed",
]);

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  orderCode: text("order_code"),
  userId: integer("user_id").notNull(),
  phone: text("phone").notNull(),
  amount: real("amount").notNull(),
  method: text("method").notNull().default("mpesa"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  simulated: text("simulated").notNull().default("false"),
  checkoutRequestId: text("checkout_request_id"),
  merchantRequestId: text("merchant_request_id"),
  mpesaReceipt: text("mpesa_receipt"),
  resultCode: text("result_code"),
  resultDesc: text("result_desc"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const ledgerEntriesTable = pgTable("ledger_entries", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  paymentId: integer("payment_id"),
  beneficiaryUserId: integer("beneficiary_user_id"),
  entryType: ledgerEntryTypeEnum("entry_type").notNull(),
  amount: real("amount").notNull(),
  status: ledgerEntryStatusEnum("status").notNull().default("held"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Payment = typeof paymentsTable.$inferSelect;
export type InsertPayment = typeof paymentsTable.$inferInsert;
export type LedgerEntry = typeof ledgerEntriesTable.$inferSelect;
export type InsertLedgerEntry = typeof ledgerEntriesTable.$inferInsert;
