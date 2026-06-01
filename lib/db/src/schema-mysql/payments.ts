import { mysqlTable, int, varchar, text, double, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";

export const paymentStatusValues = ["unpaid", "pending", "paid", "failed"] as const;
export const ledgerEntryTypeValues = [
  "escrow_in",
  "payout_vendor",
  "payout_rider",
  "commission",
  "refund",
] as const;
export const ledgerEntryStatusValues = ["held", "released", "reversed"] as const;

export const paymentsTable = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  orderCode: varchar("order_code", { length: 64 }),
  userId: int("user_id").notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  amount: double("amount").notNull(),
  method: varchar("method", { length: 32 }).notNull().default("mpesa"),
  status: mysqlEnum("status", paymentStatusValues).notNull().default("pending"),
  simulated: varchar("simulated", { length: 8 }).notNull().default("false"),
  checkoutRequestId: varchar("checkout_request_id", { length: 191 }),
  merchantRequestId: varchar("merchant_request_id", { length: 191 }),
  mpesaReceipt: varchar("mpesa_receipt", { length: 64 }),
  resultCode: varchar("result_code", { length: 16 }),
  resultDesc: text("result_desc"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const ledgerEntriesTable = mysqlTable("ledger_entries", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  paymentId: int("payment_id"),
  beneficiaryUserId: int("beneficiary_user_id"),
  entryType: mysqlEnum("entry_type", ledgerEntryTypeValues).notNull(),
  amount: double("amount").notNull(),
  status: mysqlEnum("status", ledgerEntryStatusValues).notNull().default("held"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Payment = typeof paymentsTable.$inferSelect;
export type InsertPayment = typeof paymentsTable.$inferInsert;
export type LedgerEntry = typeof ledgerEntriesTable.$inferSelect;
export type InsertLedgerEntry = typeof ledgerEntriesTable.$inferInsert;
