import { db, notificationsTable } from "@workspace/db";
import { broadcastToUser } from "./ws";

export async function createNotification(opts: {
  userId: number;
  type: string;
  title: string;
  body: string;
  orderId?: number | null;
}) {
  const [n] = await db
    .insert(notificationsTable)
    .values({
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
      orderId: opts.orderId ?? null,
    })
    .returning();

  broadcastToUser(opts.userId, {
    type: "notification",
    notification: { ...n, createdAt: n.createdAt.toISOString() },
  });
  return n;
}

/** Friendly customer-facing copy for each order status. */
export function statusMessage(
  status: string,
  code: string,
): { title: string; body: string } | null {
  switch (status) {
    case "accepted":
    case "confirmed":
      return { title: "Order accepted", body: `Your order ${code} was accepted by the vendor.` };
    case "preparing":
      return { title: "Being prepared", body: `The vendor is preparing your order ${code}.` };
    case "ready":
      return { title: "Ready for pickup", body: `Your order ${code} is ready and waiting for a rider.` };
    case "picked_up":
      return { title: "On the way", body: `Your order ${code} has been picked up and is on the way.` };
    case "delivered":
      return { title: "Delivered", body: `Your order ${code} has been delivered. Enjoy!` };
    case "rejected":
      return { title: "Order rejected", body: `Sorry, your order ${code} was rejected by the vendor.` };
    case "cancelled":
      return { title: "Order cancelled", body: `Your order ${code} was cancelled.` };
    default:
      return null;
  }
}
