import {
  db,
  ordersTable,
  paymentsTable,
  ledgerEntriesTable,
  vendorsTable,
  riderProfilesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { mpesaConfig } from "./mpesa";
import { createNotification } from "./notify";
import { formatOrderCode } from "./order-code";
import { logger } from "./logger";

type Order = typeof ordersTable.$inferSelect;

/**
 * Marks every payment row that shares a CheckoutRequestID as paid (or failed),
 * flips the linked orders to paid, records the escrow hold, and notifies the
 * customer + vendor. Idempotent: already-settled payments are skipped.
 */
export async function settlePaymentByCheckoutId(
  checkoutRequestId: string,
  outcome: {
    success: boolean;
    receipt?: string | null;
    resultCode?: string | null;
    resultDesc?: string | null;
  },
): Promise<{ updated: number }> {
  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.checkoutRequestId, checkoutRequestId));

  let updated = 0;
  for (const payment of payments) {
    if (payment.status === "paid" || payment.status === "failed") continue;

    if (!outcome.success) {
      await db
        .update(paymentsTable)
        .set({
          status: "failed",
          resultCode: outcome.resultCode ?? null,
          resultDesc: outcome.resultDesc ?? null,
          updatedAt: new Date(),
        })
        .where(eq(paymentsTable.id, payment.id));
      await db
        .update(ordersTable)
        .set({ paymentStatus: "failed", updatedAt: new Date() })
        .where(eq(ordersTable.id, payment.orderId));
      updated++;
      continue;
    }

    await db
      .update(paymentsTable)
      .set({
        status: "paid",
        mpesaReceipt: outcome.receipt ?? payment.mpesaReceipt ?? null,
        resultCode: outcome.resultCode ?? "0",
        resultDesc: outcome.resultDesc ?? "Success",
        updatedAt: new Date(),
      })
      .where(eq(paymentsTable.id, payment.id));

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, payment.orderId))
      .limit(1);
    if (!order) continue;

    await db
      .update(ordersTable)
      .set({ paymentStatus: "paid", updatedAt: new Date() })
      .where(eq(ordersTable.id, order.id));

    // Record the escrow hold (money received, held until delivery).
    await db.insert(ledgerEntriesTable).values({
      orderId: order.id,
      paymentId: payment.id,
      beneficiaryUserId: null,
      entryType: "escrow_in",
      amount: order.total,
      status: "held",
      note: "Customer payment held in escrow",
    });

    const code = formatOrderCode(order.id);
    await createNotification({
      userId: order.userId,
      type: "payment",
      title: "Payment received",
      body: `We received your payment for order ${code}. Your order is confirmed.`,
      orderId: order.id,
    });
    const vendorOwnerId = await getVendorOwnerId(order.vendorId);
    if (vendorOwnerId) {
      await createNotification({
        userId: vendorOwnerId,
        type: "order:new",
        title: "New paid order",
        body: `Order ${code} has been paid and is awaiting your acceptance.`,
        orderId: order.id,
      });
    }
    updated++;
  }
  return { updated };
}

/**
 * On delivery, releases the escrow into a vendor payout, a rider payout, and a
 * platform commission. Idempotent per order.
 */
export async function releaseEscrowForOrder(order: Order): Promise<void> {
  if (order.paymentStatus !== "paid") return;

  const existing = await db
    .select()
    .from(ledgerEntriesTable)
    .where(
      and(
        eq(ledgerEntriesTable.orderId, order.id),
        eq(ledgerEntriesTable.entryType, "payout_vendor"),
      ),
    );
  if (existing.length > 0) return; // already released

  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.orderId, order.id))
    .limit(1);

  const commission = round2(order.subtotal * mpesaConfig.commissionRate);
  const vendorPayout = round2(order.subtotal - commission);
  const riderPayout = order.deliveryFee;

  const [vendor] = await db
    .select({ userId: vendorsTable.userId })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, order.vendorId))
    .limit(1);

  let riderUserId: number | null = null;
  if (order.riderId) {
    const [r] = await db
      .select({ userId: riderProfilesTable.userId })
      .from(riderProfilesTable)
      .where(eq(riderProfilesTable.id, order.riderId))
      .limit(1);
    riderUserId = r?.userId ?? null;
  }

  await db.insert(ledgerEntriesTable).values([
    {
      orderId: order.id,
      paymentId: payment?.id ?? null,
      beneficiaryUserId: vendor?.userId ?? null,
      entryType: "payout_vendor" as const,
      amount: vendorPayout,
      status: "released" as const,
      note: "Vendor payout on delivery",
    },
    {
      orderId: order.id,
      paymentId: payment?.id ?? null,
      beneficiaryUserId: riderUserId,
      entryType: "payout_rider" as const,
      amount: riderPayout,
      status: "released" as const,
      note: "Rider delivery fee on delivery",
    },
    {
      orderId: order.id,
      paymentId: payment?.id ?? null,
      beneficiaryUserId: null,
      entryType: "commission" as const,
      amount: commission,
      status: "released" as const,
      note: "Platform commission",
    },
  ]);

  await db
    .update(ledgerEntriesTable)
    .set({ status: "released" })
    .where(
      and(
        eq(ledgerEntriesTable.orderId, order.id),
        eq(ledgerEntriesTable.entryType, "escrow_in"),
      ),
    );

  logger.info(
    { orderId: order.id, vendorPayout, riderPayout, commission },
    "escrow released on delivery",
  );
}

async function getVendorOwnerId(vendorId: number): Promise<number | null> {
  const [v] = await db
    .select({ userId: vendorsTable.userId })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId))
    .limit(1);
  return v?.userId ?? null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
