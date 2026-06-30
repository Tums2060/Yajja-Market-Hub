import nodemailer from "nodemailer";
import {
  db,
  ordersTable,
  vendorsTable,
  usersTable,
  orderItemsTable,
  riderProfilesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { formatOrderCode } from "./order-code";
import { logger } from "./logger";

const YAJJA_EMAIL = process.env.YAJJA_EMAIL || "";
const YAJJA_EMAIL_PASSWORD = process.env.YAJJA_EMAIL_PASSWORD || "";

const RECIPIENTS = [
  "malobajohn860@gmail.com",
  "yajjaapp@gmail.com",
  "tumainiwamukota@gmail.com",
];

function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: YAJJA_EMAIL,
      pass: YAJJA_EMAIL_PASSWORD,
    },
  });
}

async function sendMail(subject: string, htmlContent: string) {
  if (!YAJJA_EMAIL || !YAJJA_EMAIL_PASSWORD) {
    logger.warn("[EMAIL] Mailer credentials are not configured in .env. Skipping send.");
    return;
  }
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"Yajja Market Hub" <${YAJJA_EMAIL}>`,
      to: RECIPIENTS.join(", "),
      subject,
      html: htmlContent,
    });
    logger.info({ messageId: info.messageId, subject }, "[EMAIL] Notification sent successfully");
  } catch (err) {
    logger.error({ err, subject }, "[EMAIL] Failed to send email");
  }
}

export async function sendPaymentReceivedEmail(orderId: number): Promise<void> {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) return;

    const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1);
    const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, order.vendorId)).limit(1);
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));

    const customerName = customer?.name || "Customer";
    const customerPhone = customer?.phone || order.deliveryAddress; 
    const vendorName = vendor?.name || "Vendor";

    // Format items
    const itemsSummary = items
      .map((item) => `<li>${item.productName} (x${item.quantity}) - KES ${item.totalPrice}</li>`)
      .join("");

    // Payout details
    const payout = vendor?.payoutMethod as {
      type: "till" | "paybill" | "pochi" | "send_money";
      accountNumber: string;
      paybillAccountRef?: string;
    } | null;

    let payoutHtml = "Not configured";
    let actionItemChannel = "manual transfer";
    if (payout) {
      const typeLabel =
        payout.type === "till"
          ? "Till Number"
          : payout.type === "paybill"
          ? "Paybill Number"
          : payout.type === "pochi"
          ? "Pochi la Biashara"
          : "Send Money/Phone Number";
      
      actionItemChannel = `${typeLabel} (${payout.accountNumber})`;
      payoutHtml = `
        <strong>Type:</strong> ${typeLabel}<br/>
        <strong>Account Number / Phone:</strong> ${payout.accountNumber}<br/>
        ${payout.paybillAccountRef ? `<strong>Account Ref (for Paybill):</strong> ${payout.paybillAccountRef}<br/>` : ""}
      `;
    }

    const orderCode = formatOrderCode(order.id);
    const subject = `[Yajja] Payment Received for Order #${orderCode}`;

    const totalFee = order.deliveryFee;
    const yajjaShare = totalFee * 0.15;
    const riderShare = totalFee * 0.85;

    const htmlContent = `
      <div style="font-family: sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 12px;">
        <h2 style="color: #1A2340; border-bottom: 2px solid #1A2340; padding-bottom: 8px;">Yajja Market Hub — Payment Received</h2>
        <p>A new payment has been successfully confirmed via STK Push.</p>
        
        <h3>Customer Information</h3>
        <p>
          <strong>Name:</strong> ${customerName}<br/>
          <strong>Phone Number:</strong> ${customerPhone}
        </p>

        <h3>Order Summary (Order Code: ${orderCode})</h3>
        <ul>
          ${itemsSummary}
        </ul>
        <p><strong>Subtotal (Amount for Vendor):</strong> KES ${order.subtotal}</p>
        <p><strong>Transport Fee:</strong> KES ${order.deliveryFee}</p>
        <p><strong>Total Amount Paid:</strong> <span style="font-size: 1.1em; color: #10B981; font-weight: bold;">KES ${order.total}</span></p>

        <h3>Vendor Payout Details</h3>
        <p>
          <strong>Vendor Name:</strong> ${vendorName}<br/>
          ${payoutHtml}
        </p>

        <h3>Transport Fee Breakdown</h3>
        <p>
          Total Transport Fee Collected: KES ${totalFee}<br/>
          - Yajja (15% Share): KES ${yajjaShare.toFixed(2)}<br/>
          - Rider (85% Share): KES ${riderShare.toFixed(2)} (to be paid upon delivery completion)
        </p>

        <div style="background-color: #F3F4F6; border-left: 4px solid #3B82F6; padding: 12px; border-radius: 6px; margin-top: 20px;">
          <h4 style="margin: 0 0 6px 0; color: #1E3A8A;">Action Item</h4>
          <p style="margin: 0; font-size: 0.95em;">
            Please manually transfer <strong>KES ${order.subtotal}</strong> to <strong>${vendorName}</strong> via <strong>${actionItemChannel}</strong> immediately.
          </p>
        </div>
      </div>
    `;

    await sendMail(subject, htmlContent);
  } catch (err) {
    logger.error({ err, orderId }, "[EMAIL] Error preparing Payment Received email");
  }
}

export async function sendRiderAcceptedEmail(orderId: number): Promise<void> {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order || !order.riderId) return;

    // Lookup rider's details
    const [riderProfile] = await db.select().from(riderProfilesTable).where(eq(riderProfilesTable.id, order.riderId)).limit(1);
    if (!riderProfile) return;

    const [riderUser] = await db.select().from(usersTable).where(eq(usersTable.id, riderProfile.userId)).limit(1);
    if (!riderUser) return;

    const riderName = riderUser.name;
    const riderPhone = riderUser.phone || "N/A";
    const orderCode = formatOrderCode(order.id);
    const subject = `[Yajja] Rider Accepted Order #${orderCode}`;
    const timestamp = new Date().toLocaleString("en-UG", { timeZone: "Africa/Nairobi" });

    const htmlContent = `
      <div style="font-family: sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 12px;">
        <h2 style="color: #1A2340; border-bottom: 2px solid #1A2340; padding-bottom: 8px;">Yajja Market Hub — Rider Accepted Order</h2>
        <p>A rider has claimed and accepted the delivery job.</p>

        <h3>Rider Information</h3>
        <p>
          <strong>Name:</strong> ${riderName}<br/>
          <strong>Phone:</strong> ${riderPhone}<br/>
          <strong>Vehicle Type:</strong> ${riderProfile.vehicleType}<br/>
          <strong>License Plate:</strong> ${riderProfile.licensePlate || "N/A"}
        </p>

        <h3>Order Details</h3>
        <p>
          <strong>Order ID:</strong> ${order.id}<br/>
          <strong>Order Code:</strong> ${orderCode}<br/>
          <strong>Delivery Address:</strong> ${order.deliveryAddress}<br/>
          <strong>Timestamp:</strong> ${timestamp}
        </p>

        <h3>Rider Payout Info</h3>
        <p>
          <strong>Payout Method:</strong> M-Pesa Send Money (B2C) to Phone Number: <strong>${riderPhone}</strong><br/>
          <strong>Rider Payout Amount (due on delivery):</strong> KES ${(order.deliveryFee * 0.85).toFixed(2)}
        </p>
      </div>
    `;

    await sendMail(subject, htmlContent);
  } catch (err) {
    logger.error({ err, orderId }, "[EMAIL] Error preparing Rider Accepted email");
  }
}

export async function sendDeliveryConfirmedEmail(orderId: number): Promise<void> {
  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!order) return;

    const [customer] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1);
    const customerName = customer?.name || "Customer";
    const customerPhone = customer?.phone || "N/A";

    let riderName = "N/A";
    let riderPhone = "N/A";

    if (order.riderId) {
      const [riderProfile] = await db.select().from(riderProfilesTable).where(eq(riderProfilesTable.id, order.riderId)).limit(1);
      if (riderProfile) {
        const [riderUser] = await db.select().from(usersTable).where(eq(usersTable.id, riderProfile.userId)).limit(1);
        if (riderUser) {
          riderName = riderUser.name;
          riderPhone = riderUser.phone || "N/A";
        }
      }
    }

    const orderCode = formatOrderCode(order.id);
    const subject = `[Yajja] Customer Confirmed Delivery — Order #${orderCode}`;
    const timestamp = order.customerConfirmedAt
      ? new Date(order.customerConfirmedAt).toLocaleString("en-UG", { timeZone: "Africa/Nairobi" })
      : new Date().toLocaleString("en-UG", { timeZone: "Africa/Nairobi" });

    const riderOwed = order.deliveryFee * 0.85;

    const htmlContent = `
      <div style="font-family: sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 12px;">
        <h2 style="color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 8px;">Yajja Market Hub — Delivery Confirmed</h2>
        <p>The customer has marked this order as received. The delivery process is complete.</p>

        <h3>Order details</h3>
        <p>
          <strong>Order ID:</strong> ${order.id}<br/>
          <strong>Order Code:</strong> ${orderCode}<br/>
          <strong>Delivery Confirmation Timestamp:</strong> ${timestamp}
        </p>

        <h3>Parties Involved</h3>
        <p>
          <strong>Customer Name:</strong> ${customerName}<br/>
          <strong>Customer Phone:</strong> ${customerPhone}<br/>
          <strong>Rider Name:</strong> ${riderName}<br/>
          <strong>Rider Phone:</strong> ${riderPhone}
        </p>

        <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px; border-radius: 6px; margin-top: 20px;">
          <h4 style="margin: 0 0 6px 0; color: #78350F;">Daily Proof-of-Delivery Record</h4>
          <p style="margin: 0; font-size: 0.95em;">
            <strong>REMINDER:</strong> The rider <strong>${riderName}</strong> is owed <strong>KES ${riderOwed.toFixed(2)}</strong> (85% of KES ${order.deliveryFee} transport fee) for this completed order.
          </p>
        </div>
      </div>
    `;

    await sendMail(subject, htmlContent);
  } catch (err) {
    logger.error({ err, orderId }, "[EMAIL] Error preparing Delivery Confirmed email");
  }
}

export async function sendPasswordResetEmail(
  toEmail: string,
  toName: string,
  resetUrl: string
): Promise<void> {
  if (!YAJJA_EMAIL || !YAJJA_EMAIL_PASSWORD) {
    logger.warn("[EMAIL] Mailer credentials are not configured in .env. Skipping password reset email.");
    return;
  }
  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"Yajja" <${YAJJA_EMAIL}>`,
      to: toEmail,
      subject: "Reset your Yajja password",
      html: `
        <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff;">
          <div style="background: #5c3fb5; padding: 40px 32px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">Yajja</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Everything in order</p>
          </div>
          <div style="padding: 40px 32px; background: #ffffff; border-left: 1px solid #eee; border-right: 1px solid #eee;">
            <h2 style="color: #1a1a2e; font-size: 22px; font-weight: 700; margin: 0 0 12px;">Reset your password</h2>
            <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
              Hi ${toName}, we received a request to reset the password for your Yajja account.
              Click the button below to set a new password. This link expires in <strong>15 minutes</strong>.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #5c3fb5; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 10px;">
                Reset Password
              </a>
            </div>
            <p style="color: #999; font-size: 13px; margin: 28px 0 0; line-height: 1.6;">
              If you didn't request this, you can safely ignore this email — your password won't change.
            </p>
          </div>
          <div style="padding: 20px 32px; background: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #eee; border-top: none;">
            <p style="color: #aaa; font-size: 12px; margin: 0;">© 2026 Yajja · Nairobi, Kenya</p>
          </div>
        </div>
      `,
    });
    logger.info({ messageId: info.messageId, to: toEmail }, "[EMAIL] Password reset email sent successfully");
  } catch (err) {
    logger.error({ err, to: toEmail }, "[EMAIL] Failed to send password reset email");
    throw err;
  }
}

