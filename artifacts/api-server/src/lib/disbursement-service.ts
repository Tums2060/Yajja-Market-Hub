import { db, ordersTable, vendorsTable, usersTable, riderProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAccessToken, normalizePhone, mpesaConfig, getMpesaBaseUrl } from "./mpesa";
import { logger } from "./logger";
import { formatOrderCode } from "./order-code";

/**
 * Disburses the vendor's portion (order.total - order.deliveryFee) to the vendor's registered payout method
 * using Safaricom Daraja B2B / B2C API, with a simulation fallback if credentials are not configured.
 */
export async function disbursePayoutForOrder(orderId: number): Promise<void> {
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!order) {
    logger.error({ orderId }, "[DISBURSEMENT] Order not found");
    return;
  }

  // Prevent double disbursement
  if (order.disbursementStatus === "completed" || order.disbursementStatus === "processing") {
    logger.info({ orderId, status: order.disbursementStatus }, "[DISBURSEMENT] Payout already completed or processing, skipping");
    return;
  }

  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.id, order.vendorId))
    .limit(1);

  if (!vendor) {
    const errorMsg = "Vendor profile not found for the order";
    logger.error({ orderId, vendorId: order.vendorId }, `[DISBURSEMENT] ${errorMsg}`);
    await db
      .update(ordersTable)
      .set({
        disbursementStatus: "manual_review",
        disbursementError: errorMsg,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, orderId));
    return;
  }

  const payoutMethod = vendor.payoutMethod as {
    type: "till" | "paybill" | "pochi" | "send_money";
    accountNumber: string;
    paybillAccountRef?: string;
  } | null;

  if (!payoutMethod || !payoutMethod.type || !payoutMethod.accountNumber) {
    const errorMsg = "Vendor has no registered payout method";
    logger.warn({ orderId, vendorId: vendor.id }, `[DISBURSEMENT] ${errorMsg}`);
    await db
      .update(ordersTable)
      .set({
        disbursementStatus: "manual_review",
        disbursementError: errorMsg,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, orderId));
    return;
  }

  // Calculate amount to disburse to vendor
  // vendor amount = total paid - platform fee (deliveryFee)
  const vendorAmount = order.total - order.deliveryFee;

  logger.info(
    { orderId, total: order.total, deliveryFee: order.deliveryFee, vendorAmount },
    `[DISBURSEMENT] Calculated vendor payout amount: ${vendorAmount} (Total: ${order.total} - Delivery Fee: ${order.deliveryFee})`
  );

  const initiatorName = process.env.MPESA_INITIATOR_NAME;
  const securityCredential = process.env.MPESA_SECURITY_CREDENTIAL;

  const isConfigured = Boolean(initiatorName && securityCredential);

  if (!isConfigured) {
    // Simulation Mode
    const simulatedReceipt = `SIM-DISB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    logger.info(
      { orderId, vendorId: vendor.id, amount: vendorAmount, payoutMethod },
      "[DISBURSEMENT SIMULATION] Initiating simulated payout (no Daraja initiator credentials)"
    );

    await db
      .update(ordersTable)
      .set({
        disbursementStatus: "completed",
        disbursementReceipt: simulatedReceipt,
        disbursementError: null,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, orderId));

    logger.info({ orderId, receipt: simulatedReceipt }, "[DISBURSEMENT SIMULATION] Simulated payout completed successfully");
    return;
  }

  // Live Mode using Safaricom Daraja API
  try {
    const token = await getAccessToken();
    const orderCode = formatOrderCode(order.id);
    const amount = Math.max(1, Math.round(vendorAmount));

    const timeoutUrl = process.env.MPESA_CALLBACK_TIMEOUT_URL || mpesaConfig.callbackUrl || "https://example.com/timeout";
    const resultUrl = process.env.MPESA_CALLBACK_RESULT_URL || mpesaConfig.callbackUrl || "https://example.com/result";

    let responseData: any;

    if (payoutMethod.type === "till" || payoutMethod.type === "paybill") {
      // B2B Payout
      // IdentifierType: 4 for shortcode/paybill, 2 for store/till
      const recieverIdentifierType = payoutMethod.type === "till" ? "2" : "4";
      const commandId = payoutMethod.type === "till" ? "BusinessBuyGoods" : "BusinessPayBill";

      const body = {
        Initiator: initiatorName,
        SecurityCredential: securityCredential,
        CommandID: commandId,
        SenderIdentifierType: "4", // Our shortcode type (usually shortcode/paybill is 4)
        RecieverIdentifierType: recieverIdentifierType,
        Amount: amount,
        PartyA: mpesaConfig.shortcode,
        PartyB: payoutMethod.accountNumber,
        AccountReference: payoutMethod.paybillAccountRef || orderCode,
        Remarks: `Vendor payout for ${orderCode}`,
        QueueTimeOutURL: timeoutUrl,
        ResultURL: resultUrl,
      };

      logger.info({ orderId, body }, "[DISBURSEMENT] Sending B2B request to Daraja");

      const response = await fetch(`${getMpesaBaseUrl()}/mpesa/b2b/v1/paymentrequest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      responseData = await response.json();
      logger.info({ orderId, responseData }, "[DISBURSEMENT] Received B2B response from Daraja");
    } else {
      // B2C Payout (Pochi / Send Money)
      const phone = normalizePhone(payoutMethod.accountNumber);
      const commandId = "BusinessPayment";

      const body = {
        InitiatorName: initiatorName,
        SecurityCredential: securityCredential,
        CommandID: commandId,
        Amount: amount,
        PartyA: mpesaConfig.shortcode,
        PartyB: phone,
        Remarks: `Vendor payout for ${orderCode}`,
        QueueTimeOutURL: timeoutUrl,
        ResultURL: resultUrl,
        Occasion: "Payout",
      };

      logger.info({ orderId, body }, "[DISBURSEMENT] Sending B2C request to Daraja");

      const response = await fetch(`${getMpesaBaseUrl()}/mpesa/b2c/v1/paymentrequest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      responseData = await response.json();
      logger.info({ orderId, responseData }, "[DISBURSEMENT] Received B2C response from Daraja");
    }

    if (responseData.ResponseCode === "0") {
      const receipt = responseData.ConversationID || responseData.OriginatorConversationID || `DRJ-${Date.now()}`;
      logger.info({ orderId, responseData, receipt }, "[DISBURSEMENT] Daraja payout accepted successfully");

      await db
        .update(ordersTable)
        .set({
          disbursementStatus: "completed",
          disbursementReceipt: receipt,
          disbursementError: null,
          updatedAt: new Date(),
        })
        .where(eq(ordersTable.id, orderId));
    } else {
      const errorMsg = responseData.ResponseDescription || responseData.errorMessage || "Unknown Daraja error";
      logger.error({ orderId, responseData, errorMsg }, `[DISBURSEMENT] Daraja payout rejected: ${errorMsg}`);

      await db
        .update(ordersTable)
        .set({
          disbursementStatus: "manual_review",
          disbursementError: errorMsg,
          updatedAt: new Date(),
        })
        .where(eq(ordersTable.id, orderId));
    }
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    logger.error({ orderId, err }, `[DISBURSEMENT] Exception during payout execution: ${errorMsg}`);

    await db
      .update(ordersTable)
      .set({
        disbursementStatus: "manual_review",
        disbursementError: errorMsg,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, orderId));
  }
}

/**
 * Disburses the rider's portion (order.deliveryFee * 0.80) to the assigned rider's registered phone number
 * via Safaricom Daraja B2C Send Money, with a simulation fallback if credentials are not configured.
 */
export async function disburseRiderPayout(orderId: number): Promise<void> {
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!order) {
    logger.error({ orderId }, "[RIDER PAYOUT] Order not found");
    return;
  }

  if (!order.riderId) {
    logger.warn({ orderId }, "[RIDER PAYOUT] No rider assigned to this order, skipping payout");
    return;
  }

  // Prevent double disbursement
  if (order.riderDisbursementStatus === "completed" || order.riderDisbursementStatus === "processing") {
    logger.info({ orderId, status: order.riderDisbursementStatus }, "[RIDER PAYOUT] Payout already completed or processing, skipping");
    return;
  }

  // Lookup rider's phone number from user account
  const [riderUser] = await db
    .select({ phone: usersTable.phone })
    .from(riderProfilesTable)
    .innerJoin(usersTable, eq(riderProfilesTable.userId, usersTable.id))
    .where(eq(riderProfilesTable.id, order.riderId))
    .limit(1);

  if (!riderUser || !riderUser.phone) {
    const errorMsg = "Rider profile or phone number not found";
    logger.error({ orderId, riderId: order.riderId }, `[RIDER PAYOUT] ${errorMsg}`);
    await db
      .update(ordersTable)
      .set({
        riderDisbursementStatus: "manual_review",
        riderDisbursementError: errorMsg,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, orderId));
    return;
  }

  const riderAmount = order.deliveryFee * 0.80;
  const initiatorName = process.env.MPESA_INITIATOR_NAME;
  const securityCredential = process.env.MPESA_SECURITY_CREDENTIAL;
  const isConfigured = Boolean(initiatorName && securityCredential);

  if (!isConfigured) {
    // Simulation Mode
    const simulatedReceipt = `SIM-RDR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    logger.info(
      { orderId, riderId: order.riderId, amount: riderAmount, phone: riderUser.phone },
      "[RIDER PAYOUT SIMULATION] Initiating simulated rider payout (no Daraja initiator credentials)"
    );

    await db
      .update(ordersTable)
      .set({
        riderDisbursementStatus: "completed",
        riderDisbursementReceipt: simulatedReceipt,
        riderDisbursementError: null,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, orderId));

    logger.info({ orderId, receipt: simulatedReceipt }, "[RIDER PAYOUT SIMULATION] Simulated payout completed successfully");
    return;
  }

  // Live Mode using Safaricom Daraja B2C
  try {
    const token = await getAccessToken();
    const orderCode = formatOrderCode(order.id);
    const amount = Math.max(1, Math.round(riderAmount));
    const phone = normalizePhone(riderUser.phone);

    const timeoutUrl = process.env.MPESA_CALLBACK_TIMEOUT_URL || mpesaConfig.callbackUrl || "https://example.com/timeout";
    const resultUrl = process.env.MPESA_CALLBACK_RESULT_URL || mpesaConfig.callbackUrl || "https://example.com/result";

    const body = {
      InitiatorName: initiatorName,
      SecurityCredential: securityCredential,
      CommandID: "BusinessPayment",
      Amount: amount,
      PartyA: mpesaConfig.shortcode,
      PartyB: phone,
      Remarks: `Rider payout for ${orderCode}`,
      QueueTimeOutURL: timeoutUrl,
      ResultURL: resultUrl,
      Occasion: "Rider Payout",
    };

    logger.info({ orderId, phone, body }, "[RIDER PAYOUT] Sending B2C request to Daraja");

    // Set status to processing before request
    await db
      .update(ordersTable)
      .set({
        riderDisbursementStatus: "processing",
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, orderId));

    const response = await fetch(`${getMpesaBaseUrl()}/mpesa/b2c/v1/paymentrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseData = (await response.json()) as any;
    logger.info({ orderId, responseData }, "[RIDER PAYOUT] Received B2C response from Daraja");

    if (responseData.ResponseCode === "0") {
      const receipt = responseData.ConversationID || responseData.OriginatorConversationID || `DRJ-RDR-${Date.now()}`;
      logger.info({ orderId, responseData, receipt }, "[RIDER PAYOUT] Daraja payout accepted successfully");

      await db
        .update(ordersTable)
        .set({
          riderDisbursementStatus: "completed",
          riderDisbursementReceipt: receipt,
          riderDisbursementError: null,
          updatedAt: new Date(),
        })
        .where(eq(ordersTable.id, orderId));
    } else {
      const errorMsg = responseData.ResponseDescription || responseData.errorMessage || "Unknown Daraja B2C error";
      logger.error({ orderId, responseData, errorMsg }, `[RIDER PAYOUT] Daraja payout rejected: ${errorMsg}`);

      await db
        .update(ordersTable)
        .set({
          riderDisbursementStatus: "manual_review",
          riderDisbursementError: errorMsg,
          updatedAt: new Date(),
        })
        .where(eq(ordersTable.id, orderId));
    }
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    logger.error({ orderId, err }, `[RIDER PAYOUT] Exception during payout execution: ${errorMsg}`);

    await db
      .update(ordersTable)
      .set({
        riderDisbursementStatus: "manual_review",
        riderDisbursementError: errorMsg,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, orderId));
  }
}
