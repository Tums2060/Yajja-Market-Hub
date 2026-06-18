import { Router } from "express";
import { db, ordersTable, paymentsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, getUser } from "../lib/auth";
import {
  isMpesaConfigured,
  stkPush,
  resolveCallbackUrl,
  normalizePhone,
} from "../lib/mpesa";
import { settlePaymentByCheckoutId } from "../lib/payments-core";
import { formatOrderCode } from "../lib/order-code";

const router = Router();

const stkPushBodySchema = z.object({
  orderIds: z.array(z.number()).min(1),
  phone: z.string().min(7),
});

router.post("/payments/stk-push", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const parsed = stkPushBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid body" });
      return;
    }

    const orders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          inArray(ordersTable.id, parsed.data.orderIds),
          eq(ordersTable.userId, user.id),
        ),
      );
    if (orders.length === 0) {
      res.status(404).json({ message: "No matching orders" });
      return;
    }
    if (orders.every((o) => o.paymentStatus === "paid")) {
      res.json({ status: "paid", alreadyPaid: true });
      return;
    }
    // Only (re)charge orders that are not paid and not already mid-flight.
    // An order in "pending" already has an STK push awaiting its callback, so
    // re-pushing would double-charge the customer.
    const unpaid = orders.filter(
      (o) => o.paymentStatus === "unpaid" || o.paymentStatus === "failed",
    );
    if (unpaid.length === 0) {
      res.json({ status: "pending", pending: true });
      return;
    }

    const total = unpaid.reduce((sum, o) => sum + o.total, 0);
    const phone = normalizePhone(parsed.data.phone);
    const accountRef = formatOrderCode(unpaid[0].id);
    const configured = isMpesaConfigured();

    let checkoutRequestId: string;
    let merchantRequestId: string | null = null;

    if (configured) {
      const result = await stkPush({
        phone,
        amount: total,
        accountReference: accountRef,
        description: `Yajja ${accountRef}`,
        callbackUrl: resolveCallbackUrl() || "https://example.com/api/payments/callback",
      });
      checkoutRequestId = result.checkoutRequestId;
      merchantRequestId = result.merchantRequestId;
    } else {
      checkoutRequestId = `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    // One payment row per order, all sharing the CheckoutRequestID so a single
    // callback settles the whole checkout.
    for (const o of unpaid) {
      await db.insert(paymentsTable).values({
        orderId: o.id,
        orderCode: formatOrderCode(o.id),
        userId: user.id,
        phone,
        amount: o.total,
        method: "mpesa",
        status: "pending",
        simulated: configured ? "false" : "true",
        checkoutRequestId,
        merchantRequestId,
      });
      await db
        .update(ordersTable)
        .set({ paymentStatus: "pending", updatedAt: new Date() })
        .where(eq(ordersTable.id, o.id));
    }

    if (!configured) {
      // No keys present: auto-confirm so development works end to end.
      await settlePaymentByCheckoutId(checkoutRequestId, {
        success: true,
        receipt: `SIMULATED-${Date.now()}`,
        resultCode: "0",
        resultDesc: "Simulated payment",
      });
      res.json({ checkoutRequestId, simulated: true, status: "paid", amount: total });
      return;
    }

    res.json({ checkoutRequestId, simulated: false, status: "pending", amount: total });
  } catch (err) {
    req.log?.error({ err }, "stk-push failed");
    res.status(502).json({ message: "Payment request failed", error: String(err) });
  }
});

router.get("/payments/status", requireAuth, async (req, res) => {
  const user = getUser(req);
  const checkoutRequestId = String(req.query.checkoutRequestId || "");
  if (!checkoutRequestId) {
    res.status(400).json({ message: "checkoutRequestId required" });
    return;
  }
  const payments = await db
    .select()
    .from(paymentsTable)
    .where(
      and(
        eq(paymentsTable.checkoutRequestId, checkoutRequestId),
        eq(paymentsTable.userId, user.id),
      ),
    );
  if (payments.length === 0) {
    res.status(404).json({ message: "Payment not found" });
    return;
  }
  const anyFailed = payments.some((p) => p.status === "failed");
  const allPaid = payments.every((p) => p.status === "paid");
  const status = anyFailed ? "failed" : allPaid ? "paid" : "pending";
  res.json({
    status,
    resultDesc: payments[0].resultDesc,
    receipt: payments.find((p) => p.mpesaReceipt)?.mpesaReceipt ?? null,
  });
});

// Developer endpoint to manually simulate M-Pesa callback confirmations on localhost
router.post("/payments/simulate-callback", async (req, res) => {
  try {
    const { checkoutRequestId, success } = req.body;
    if (!checkoutRequestId) {
      res.status(400).json({ message: "checkoutRequestId required" });
      return;
    }
    await settlePaymentByCheckoutId(checkoutRequestId, {
      success: success !== false,
      receipt: `SIMULATED-${Date.now()}`,
      resultCode: success !== false ? "0" : "1",
      resultDesc: success !== false ? "Dev Simulated Callback Success" : "Dev Simulated Callback Failure",
    });
    res.json({ message: "Callback simulated successfully" });
  } catch (err) {
    req.log?.error({ err }, "mpesa simulation callback failed");
    res.status(500).json({ message: "Failed to simulate callback", error: String(err) });
  }
});

// Public Daraja callback — no auth. Safaricom POSTs the STK result here.
router.post("/payments/callback", async (req, res) => {
  try {
    const cb = req.body?.Body?.stkCallback;
    if (cb?.CheckoutRequestID) {
      const resultCode = String(cb.ResultCode);
      const success = resultCode === "0";
      let receipt: string | null = null;
      const items: Array<{ Name: string; Value?: string | number }> =
        cb.CallbackMetadata?.Item || [];
      for (const it of items) {
        if (it.Name === "MpesaReceiptNumber" && it.Value != null) {
          receipt = String(it.Value);
        }
      }
      await settlePaymentByCheckoutId(cb.CheckoutRequestID, {
        success,
        receipt,
        resultCode,
        resultDesc: cb.ResultDesc ?? null,
      });
    }
  } catch (err) {
    req.log?.error({ err }, "mpesa callback handling failed");
  }
  // Always acknowledge so Safaricom does not retry endlessly.
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

export default router;
