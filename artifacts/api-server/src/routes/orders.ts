import { Router } from "express";
import { db, dbUpdateReturning, ordersTable, orderItemsTable, groupOrdersTable, billAssignmentsTable, cartItemsTable, groupCartItemsTable, productsTable, vendorsTable, usersTable, riderProfilesTable, groupMembersTable } from "@workspace/db";
import { eq, and, inArray, desc, or, isNull } from "drizzle-orm";
import { UpdateOrderStatusBody, AssignRiderBody, CreateGroupOrderBody, SubmitBillAssignmentBody } from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";
import { broadcastToUser, broadcastToUsers } from "../lib/ws";
import { createNotification, statusMessage } from "../lib/notify";
import { releaseEscrowForOrder } from "../lib/payments-core";
import { disburseRiderPayout } from "../lib/disbursement-service";
import { formatOrderCode } from "../lib/order-code";
import { mpesaConfig } from "../lib/mpesa";
import { z } from "zod";

const router = Router();

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "confirmed", "rejected", "cancelled"],
  accepted: ["preparing", "confirmed", "ready", "cancelled"],
  confirmed: ["preparing", "ready", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["picked_up", "cancelled"],
  picked_up: ["delivered"],
  delivered: [],
  rejected: [],
  cancelled: [],
};

async function getVendorOwnerId(vendorId: number): Promise<number | null> {
  const [v] = await db
    .select({ userId: vendorsTable.userId })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId))
    .limit(1);
  return v?.userId ?? null;
}

async function getRiderOwnerId(riderId: number): Promise<number | null> {
  const [r] = await db
    .select({ userId: riderProfilesTable.userId })
    .from(riderProfilesTable)
    .where(eq(riderProfilesTable.id, riderId))
    .limit(1);
  return r?.userId ?? null;
}

async function notifyOrderParties(
  order: typeof ordersTable.$inferSelect,
  type: string
) {
  const payload = {
    type,
    orderId: order.id,
    orderCode: formatOrderCode(order.id),
    status: order.status as string,
  };
  // Target only the parties involved in this order: customer, vendor owner,
  // and the assigned rider (if any). No global fanout.
  const recipients: number[] = [order.userId];
  const vendorOwnerId = await getVendorOwnerId(order.vendorId);
  if (vendorOwnerId) recipients.push(vendorOwnerId);
  if (order.riderId) {
    const riderOwnerId = await getRiderOwnerId(order.riderId);
    if (riderOwnerId) recipients.push(riderOwnerId);
  }
  broadcastToUsers(recipients, payload);

  const code = formatOrderCode(order.id);
  if (type === "order:status") {
    const msg = statusMessage(order.status as string, code);
    if (msg) {
      await createNotification({
        userId: order.userId,
        type: "order:status",
        title: msg.title,
        body: msg.body,
        orderId: order.id,
      });
    }
  } else if (type === "order:assigned") {
    await createNotification({
      userId: order.userId,
      type: "order:assigned",
      title: "Rider assigned",
      body: `A rider is on the way to pick up your order ${code}.`,
      orderId: order.id,
    });
    if (order.riderId) {
      const riderOwnerId = await getRiderOwnerId(order.riderId);
      if (riderOwnerId) {
        await createNotification({
          userId: riderOwnerId,
          type: "order:assigned",
          title: "New delivery",
          body: `You've been assigned order ${code}.`,
          orderId: order.id,
        });
      }
    }
  }
}

const createOrderBodySchema = z.object({
  deliveryAddress: z.string(),
  notes: z.string().optional(),
  phoneNumber: z.string().optional(),
  customerName: z.string().optional(),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
});

async function enrichOrder(
  order: typeof ordersTable.$inferSelect,
  opts: { hideCoords?: boolean } = {},
) {
  const items = await db.select({
    item: orderItemsTable,
    product: productsTable,
  })
    .from(orderItemsTable)
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .where(eq(orderItemsTable.orderId, order.id));

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, order.vendorId)).limit(1);
  const [customer] = await db.select({ name: usersTable.name, phone: usersTable.phone })
    .from(usersTable)
    .where(eq(usersTable.id, order.userId))
    .limit(1);
  const [rider] = order.riderId
    ? await db.select({ currentLat: riderProfilesTable.currentLat, currentLng: riderProfilesTable.currentLng })
      .from(riderProfilesTable)
      .where(eq(riderProfilesTable.id, order.riderId))
      .limit(1)
    : [null];

  return {
    ...order,
    // Precise delivery coordinates are sensitive: only the customer (owner) and
    // the assigned rider may ever receive them. Vendors and unassigned riders
    // get the human-readable address but never raw lat/lng.
    deliveryLat: opts.hideCoords ? null : order.deliveryLat,
    deliveryLng: opts.hideCoords ? null : order.deliveryLng,
    orderCode: formatOrderCode(order.id),
    vendorName: vendor?.name || "",
    customerName: customer?.name || "",
    customerPhone: customer?.phone || "",
    riderLocation: rider ? { lat: rider.currentLat, lng: rider.currentLng } : null,
    items: items.map(({ item, product }) => ({
      ...item,
      product: product || null,
    })),
    itemCount: items.reduce((sum, row) => sum + row.item.quantity, 0),
    status: order.status as string,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

// Centralized coordinate-visibility policy: precise delivery lat/lng may only
// ever be seen by the customer who owns the order, the rider assigned to it, or
// an admin. Vendors (and everyone else) NEVER receive coordinates. Apply this to
// every endpoint that returns an enriched order so the rule can't drift.
async function canSeeCoords(
  user: { id: number; role: string },
  order: typeof ordersTable.$inferSelect,
): Promise<boolean> {
  if (user.role === "admin") return true;
  if (order.userId === user.id) return true; // customer owner
  if (order.riderId) {
    const [rider] = await db
      .select({ id: riderProfilesTable.id })
      .from(riderProfilesTable)
      .where(eq(riderProfilesTable.userId, user.id))
      .limit(1);
    if (rider && rider.id === order.riderId) return true; // assigned rider
  }
  return false;
}

// Individual orders
router.get("/orders", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { status, orderCode } = req.query as { status?: string; orderCode?: string };
  const conditions = [eq(ordersTable.userId, user.id)];
  if (status) conditions.push(eq(ordersTable.status, status as any));
  const orders = await db.select().from(ordersTable).where(and(...conditions));
  const enriched = await Promise.all(orders.map((o) => enrichOrder(o)));
  const filtered = orderCode ? enriched.filter((order) => order.orderCode === orderCode) : enriched;
  res.json(filtered);
});

router.post("/orders", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const parsed = createOrderBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid body" });
      return;
    }

    const cartItems = await db.select().from(cartItemsTable).where(eq(cartItemsTable.userId, user.id));
    if (cartItems.length === 0) {
      res.status(400).json({ message: "Cart is empty" });
      return;
    }

    const productIds = cartItems.map((item) => item.productId);
    const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Group by vendor and create one order per vendor
    const vendorMap = new Map<number, typeof cartItems>();
    for (const ci of cartItems) {
      const product = productMap.get(ci.productId);
      if (!product) continue;
      if (!vendorMap.has(product.vendorId)) vendorMap.set(product.vendorId, []);
      vendorMap.get(product.vendorId)!.push(ci);
    }

    // Create all orders + their items and clear the cart atomically: a failure
    // partway through must not leave dangling orders or a half-cleared cart.
    const createdOrderRows = await db.transaction(async (tx) => {
      const rows: Array<typeof ordersTable.$inferSelect> = [];
      for (const [vendorId, items] of vendorMap) {
        const subtotal = items.reduce((sum, item) => {
          const product = productMap.get(item.productId);
          return sum + (product?.price || 0) * item.quantity;
        }, 0);
        const deliveryFee = mpesaConfig.deliveryFee;
        const total = subtotal + deliveryFee;

        const [order] = await tx.insert(ordersTable).values({
          userId: user.id,
          vendorId,
          deliveryAddress: parsed.data.deliveryAddress,
          deliveryLat: parsed.data.deliveryLat ?? null,
          deliveryLng: parsed.data.deliveryLng ?? null,
          subtotal,
          deliveryFee,
          total,
          notes: parsed.data.notes,
          status: "pending",
        }).returning();

        await tx.insert(orderItemsTable).values(
          items.map((item) => {
            const product = productMap.get(item.productId);
            const unitPrice = product?.price || 0;
            return {
              orderId: order.id,
              productId: item.productId,
              productName: product?.name || "",
              quantity: item.quantity,
              unitPrice,
              totalPrice: unitPrice * item.quantity,
              notes: item.notes || null,
            };
          })
        );

        rows.push(order);
        // Vendors are notified only once payment is confirmed (see
        // /orders/:orderId/mock-payment-confirm) so they never see unpaid orders.
      }

      // Clear cart as part of the same transaction.
      await tx.delete(cartItemsTable).where(eq(cartItemsTable.userId, user.id));
      return rows;
    });

    const createdOrders = [] as Array<Awaited<ReturnType<typeof enrichOrder>>>;
    for (const order of createdOrderRows) {
      createdOrders.push(await enrichOrder(order));
    }

    // Refresh the customer's own order views.
    broadcastToUser(user.id, { type: "orders:changed" });

    res.status(201).json({
      orderCode: createdOrders[0] ? formatOrderCode(createdOrders[0].id) : null,
      orders: createdOrders,
      primaryOrderId: createdOrders[0]?.id || null,
    });
  } catch (err) {
    console.error("[ORDERS POST] ERROR:", err);
    res.status(500).json({ message: "Internal server error", error: String(err) });
  }
});

router.get("/orders/:orderId", requireAuth, async (req, res) => {
  const orderId = parseInt(String(req.params.orderId), 10);
  const user = getUser(req);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) {
    res.status(404).json({ message: "Order not found" });
    return;
  }

  // Authorization: only the customer who owns the order, the rider assigned to
  // it, the vendor who fulfils it, or an admin may view it. Anyone else is
  // refused — this prevents IDOR enumeration of other customers' orders.
  const isOwner = order.userId === user.id;
  const isAdmin = user.role === "admin";

  let isAssignedRider = false;
  if (order.riderId) {
    const [rider] = await db
      .select({ id: riderProfilesTable.id })
      .from(riderProfilesTable)
      .where(eq(riderProfilesTable.userId, user.id))
      .limit(1);
    isAssignedRider = !!rider && rider.id === order.riderId;
  }

  let isVendorOwner = false;
  {
    const [vendor] = await db
      .select({ id: vendorsTable.id })
      .from(vendorsTable)
      .where(eq(vendorsTable.userId, user.id))
      .limit(1);
    isVendorOwner = !!vendor && vendor.id === order.vendorId;
  }

  if (!isOwner && !isAdmin && !isAssignedRider && !isVendorOwner) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  // Coordinate policy: only owner, assigned rider, or admin get raw lat/lng.
  // The vendor sees the order but never the customer's precise coordinates.
  const hideCoords = !(isOwner || isAdmin || isAssignedRider);
  res.json(await enrichOrder(order, { hideCoords }));
});

// Customer confirms a (mock) payment for their own order. Marks the order paid
// and surfaces it to the vendor as a new incoming order. Status stays "pending"
// so the vendor can accept/reject it through the normal lifecycle.
router.post("/orders/:orderId/mock-payment-confirm", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(String(req.params.orderId), 10);
    const user = getUser(req);
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!existing) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    if (existing.userId !== user.id) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    if (existing.status === "cancelled" || existing.status === "rejected") {
      res.status(400).json({ message: "This order can no longer be paid" });
      return;
    }
    if (existing.paymentStatus === "paid") {
      res.json({ orderId, paymentStatus: existing.paymentStatus, status: existing.status as string });
      return;
    }

    await db.update(ordersTable)
      .set({ paymentStatus: "paid", updatedAt: new Date() })
      .where(eq(ordersTable.id, orderId));
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);

    const code = formatOrderCode(order.id);
    const vendorOwnerId = await getVendorOwnerId(order.vendorId);
    if (vendorOwnerId) {
      await createNotification({
        userId: vendorOwnerId,
        type: "order:new",
        title: "New paid order",
        body: `Order ${code} has been paid and is awaiting your confirmation.`,
        orderId: order.id,
      });
      broadcastToUser(vendorOwnerId, { type: "order:new", orderId: order.id });
    }
    broadcastToUser(order.userId, { type: "orders:changed" });

    res.json({ orderId: order.id, paymentStatus: order.paymentStatus, status: order.status as string });
  } catch (err) {
    req.log.error({ err }, "failed to confirm mock payment");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/orders/:orderId/status", requireAuth, async (req, res) => {
  const orderId = parseInt(String(req.params.orderId), 10);
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!existing) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  // Only the vendor that owns this order, its assigned rider, or an admin may
  // change order status.
  const user = getUser(req);
  if (user.role !== "admin") {
    const vendorOwnerId = await getVendorOwnerId(existing.vendorId);
    const riderOwnerId = existing.riderId ? await getRiderOwnerId(existing.riderId) : null;
    if (user.id !== vendorOwnerId && user.id !== riderOwnerId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
  }
  // Enforce a coherent status lifecycle (admins may override).
  const next = parsed.data.status as string;
  if (user.role !== "admin" && next !== existing.status) {
    const allowed = ALLOWED_TRANSITIONS[existing.status as string] ?? [];
    if (!allowed.includes(next)) {
      res.status(400).json({
        message: `Cannot move order from "${existing.status}" to "${next}".`,
      });
      return;
    }
  }
  await db.update(ordersTable).set({ status: parsed.data.status as any, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  // On delivery, release the escrow into vendor/rider/commission payouts.
  // Idempotent, so the dedicated /riders/deliver route won't double-pay.
  if (order.status === "delivered") {
    await releaseEscrowForOrder(order);
  }
  await notifyOrderParties(order, "order:status");
  res.json(await enrichOrder(order, { hideCoords: !(await canSeeCoords(user, order)) }));
});

// Customer cancels their own order while it is still pending.
router.post("/orders/:orderId/cancel", requireAuth, async (req, res) => {
  const orderId = parseInt(String(req.params.orderId), 10);
  const user = getUser(req);
  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!existing) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  if (existing.userId !== user.id && user.role !== "admin") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  if (existing.status !== "pending") {
    res.status(400).json({ message: "Only pending orders can be cancelled." });
    return;
  }
  await db.update(ordersTable).set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  await notifyOrderParties(order, "order:status");
  res.json(await enrichOrder(order, { hideCoords: !(await canSeeCoords(user, order)) }));
});

// Customer confirms delivery of their order.
// This triggers the rider payout disbursement.
router.post("/orders/:orderId/confirm-delivery", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(String(req.params.orderId), 10);
    const user = getUser(req);
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
    if (!existing) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    if (existing.userId !== user.id && user.role !== "admin") {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    if (existing.status !== "delivered") {
      res.status(400).json({ message: "Delivery can only be confirmed once the order is marked as delivered." });
      return;
    }
    if (existing.customerConfirmedAt) {
      res.json({ message: "Delivery already confirmed.", customerConfirmedAt: existing.customerConfirmedAt.toISOString() });
      return;
    }

    const now = new Date();
    await db.update(ordersTable).set({
      customerConfirmedAt: now,
      updatedAt: now,
    }).where(eq(ordersTable.id, orderId));

    // Trigger rider B2C payout asynchronously
    void disburseRiderPayout(orderId).catch((err) => {
      req.log?.error({ orderId, err }, "Failed to run rider payout B2C");
    });

    res.json({ message: "Delivery confirmed. Rider payout initiated.", customerConfirmedAt: now.toISOString() });
  } catch (err) {
    req.log?.error({ err }, "failed to confirm delivery");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/orders/:orderId/assign-rider", requireAuth, async (req, res) => {
  const orderId = parseInt(String(req.params.orderId), 10);
  const parsed = AssignRiderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!existing) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  // Only the vendor that owns this order, the rider claiming it, or an admin
  // may assign a rider.
  const user = getUser(req);
  if (user.role !== "admin") {
    const vendorOwnerId = await getVendorOwnerId(existing.vendorId);
    const claimingRiderOwnerId = await getRiderOwnerId(parsed.data.riderId);
    if (user.id !== vendorOwnerId && user.id !== claimingRiderOwnerId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
  }
  if (user.role === "admin") {
    // Admins can (re)assign regardless of state.
    await db.update(ordersTable).set({ riderId: parsed.data.riderId, updatedAt: new Date() })
      .where(eq(ordersTable.id, orderId));
  } else {
    // A rider may only claim an order that is READY and not already taken by
    // someone else. The conditional WHERE makes this atomic against races.
    const claimed = await dbUpdateReturning(
      ordersTable,
      { riderId: parsed.data.riderId, updatedAt: new Date() },
      and(
        eq(ordersTable.id, orderId),
        eq(ordersTable.status, "ready"),
        or(isNull(ordersTable.riderId), eq(ordersTable.riderId, parsed.data.riderId)),
      )!,
    );
    if (!claimed) {
      res.status(409).json({
        message: "This order is not available to claim (it must be ready and unassigned).",
      });
      return;
    }
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  await notifyOrderParties(order, "order:assigned");
  res.json(await enrichOrder(order, { hideCoords: !(await canSeeCoords(user, order)) }));
});

// Vendor orders
router.get("/vendor-orders", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { status } = req.query as { status?: string };
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.userId, user.id)).limit(1);
  if (!vendor) {
    res.json([]);
    return;
  }
  let orders = await db.select().from(ordersTable).where(eq(ordersTable.vendorId, vendor.id));
  // Vendors only see orders that have been paid for.
  orders = orders.filter(o => o.paymentStatus === "paid");
  if (status) orders = orders.filter(o => o.status === status);
  // Vendors never receive raw delivery coordinates — address only.
  const enriched = await Promise.all(orders.map((o) => enrichOrder(o, { hideCoords: true })));
  res.json(enriched);
});

// Rider orders
router.get("/rider-orders", requireAuth, async (req, res) => {
  const { status } = req.query as { status?: string };
  const user = getUser(req);
  // Only riders (and admins) may browse the active/claimable order pool.
  if (user.role !== "rider" && user.role !== "admin") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  const [rider] = await db.select().from(riderProfilesTable).where(eq(riderProfilesTable.userId, user.id)).limit(1);

  let orders = await db.select().from(ordersTable);
  if (status) {
    orders = orders.filter((o) => o.status === status);
  } else {
    orders = orders.filter((o) => o.status === "accepted" || o.status === "ready" || o.status === "picked_up");
  }

  if (rider) {
    // A rider sees their own assigned orders (any active status) plus orders
    // that are available to claim — which must be unassigned AND ready.
    orders = orders.filter(
      (o) => o.riderId === rider.id || (!o.riderId && o.status === "ready"),
    );
  }

  // A rider only gets precise coordinates for orders assigned to them; for
  // still-claimable (unassigned) orders they see the address but not lat/lng.
  const enriched = await Promise.all(
    orders.map((o) => enrichOrder(o, { hideCoords: !rider || o.riderId !== rider.id })),
  );
  res.json(enriched);
});

// Group orders
router.get("/groups/:groupId/orders", requireAuth, async (req, res) => {
  const groupId = parseInt(String(req.params.groupId), 10);
  const user = getUser(req);
  // Only members of the group (or an admin) may view its orders — prevents
  // enumerating other groups' orders and the coordinates within them.
  if (user.role !== "admin") {
    const [member] = await db
      .select({ id: groupMembersTable.id })
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, user.id)))
      .limit(1);
    if (!member) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
  }
  const groupOrders = await db.select().from(groupOrdersTable).where(eq(groupOrdersTable.groupId, groupId));
  const result = await Promise.all(groupOrders.map(async (go) => {
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.groupOrderId, go.id));
    // A group member is not necessarily the owner of every order in the group,
    // so apply the per-order coordinate policy to each one.
    const enrichedOrders = await Promise.all(
      orders.map(async (o) => enrichOrder(o, { hideCoords: !(await canSeeCoords(user, o)) })),
    );
    const assignments = await db.select().from(billAssignmentsTable).where(eq(billAssignmentsTable.groupOrderId, go.id));
    const enrichedAssignments = await Promise.all(assignments.map(async (a) => {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, a.userId)).limit(1);
      return { ...a, userName: u?.name || "", createdAt: a.createdAt.toISOString() };
    }));
    return {
      ...go,
      orders: enrichedOrders,
      billAssignments: enrichedAssignments,
      createdAt: go.createdAt.toISOString(),
    };
  }));
  res.json(result);
});

router.post("/groups/:groupId/orders", requireAuth, async (req, res) => {
  const groupId = parseInt(String(req.params.groupId), 10);
  const user = getUser(req);
  const parsed = CreateGroupOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }

  const groupCartItems = await db.select().from(groupCartItemsTable).where(eq(groupCartItemsTable.groupId, groupId));
  if (groupCartItems.length === 0) {
    res.status(400).json({ message: "Group cart is empty" });
    return;
  }

  // Calculate total
  let total = 0;
  for (const ci of groupCartItems) {
    const [p] = await db.select().from(productsTable).where(eq(productsTable.id, ci.productId)).limit(1);
    total += (p?.price || 0) * ci.quantity;
  }

  await db.insert(groupOrdersTable).values({
    groupId,
    initiatedBy: user.id,
    deliveryAddress: parsed.data.deliveryAddress,
    total,
    amountCollected: 0,
    status: "pending_payment",
  });

  const [groupOrder] = await db.select().from(groupOrdersTable)
    .where(and(eq(groupOrdersTable.groupId, groupId), eq(groupOrdersTable.initiatedBy, user.id)))
    .orderBy(groupOrdersTable.id)
    .limit(1);

  res.status(201).json({
    ...groupOrder,
    orders: [],
    billAssignments: [],
    createdAt: groupOrder.createdAt.toISOString(),
  });
});

router.get("/groups/:groupId/orders/:groupOrderId/bill-assignments", requireAuth, async (req, res) => {
  const groupOrderId = parseInt(String(req.params.groupOrderId), 10);
  const assignments = await db.select().from(billAssignmentsTable).where(eq(billAssignmentsTable.groupOrderId, groupOrderId));
  const enriched = await Promise.all(assignments.map(async (a) => {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, a.userId)).limit(1);
    return { ...a, userName: u?.name || "", createdAt: a.createdAt.toISOString() };
  }));
  res.json(enriched);
});

router.post("/groups/:groupId/orders/:groupOrderId/bill-assignments", requireAuth, async (req, res) => {
  const groupOrderId = parseInt(String(req.params.groupOrderId), 10);
  const user = getUser(req);
  const parsed = SubmitBillAssignmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }

  // Upsert
  const [existing] = await db.select().from(billAssignmentsTable)
    .where(and(eq(billAssignmentsTable.groupOrderId, groupOrderId), eq(billAssignmentsTable.userId, user.id)))
    .limit(1);

  let assignment;
  if (existing) {
    await db.update(billAssignmentsTable).set({ amount: parsed.data.amount })
      .where(eq(billAssignmentsTable.id, existing.id));
    [assignment] = await db.select().from(billAssignmentsTable).where(eq(billAssignmentsTable.id, existing.id)).limit(1);
  } else {
    await db.insert(billAssignmentsTable).values({
      groupOrderId,
      userId: user.id,
      amount: parsed.data.amount,
      paid: false,
    });
    [assignment] = await db.select().from(billAssignmentsTable)
      .where(and(eq(billAssignmentsTable.groupOrderId, groupOrderId), eq(billAssignmentsTable.userId, user.id)))
      .limit(1);
  }

  // Check if total is met
  const [groupOrder] = await db.select().from(groupOrdersTable).where(eq(groupOrdersTable.id, groupOrderId)).limit(1);
  if (groupOrder) {
    const allAssignments = await db.select().from(billAssignmentsTable).where(eq(billAssignmentsTable.groupOrderId, groupOrderId));
    const collected = allAssignments.reduce((s, a) => s + a.amount, 0);
    await db.update(groupOrdersTable).set({ amountCollected: collected }).where(eq(groupOrdersTable.id, groupOrderId));
    if (collected >= groupOrder.total) {
      await db.update(groupOrdersTable).set({ status: "payment_complete" }).where(eq(groupOrdersTable.id, groupOrderId));
    }
  }

  res.json({ ...assignment, userName: (await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1))[0]?.name || "", createdAt: assignment.createdAt.toISOString() });
});

// Rider pickup/deliver
router.post("/riders/pickup/:orderId", requireAuth, async (req, res) => {
  const orderId = parseInt(String(req.params.orderId), 10);
  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!existing) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  // Only the rider assigned to this order (or an admin) may mark it picked up.
  const user = getUser(req);
  if (user.role !== "admin") {
    const riderOwnerId = existing.riderId ? await getRiderOwnerId(existing.riderId) : null;
    if (user.id !== riderOwnerId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
  }
  if (!ALLOWED_TRANSITIONS[existing.status as string]?.includes("picked_up")) {
    res.status(400).json({ message: `Cannot pick up an order in "${existing.status}".` });
    return;
  }
  await db.update(ordersTable).set({ status: "picked_up", updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  await notifyOrderParties(order, "order:status");
  res.json(await enrichOrder(order, { hideCoords: !(await canSeeCoords(user, order)) }));
});

router.post("/riders/deliver/:orderId", requireAuth, async (req, res) => {
  const orderId = parseInt(String(req.params.orderId), 10);
  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!existing) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  // Only the rider assigned to this order (or an admin) may mark it delivered.
  const user = getUser(req);
  if (user.role !== "admin") {
    const riderOwnerId = existing.riderId ? await getRiderOwnerId(existing.riderId) : null;
    if (user.id !== riderOwnerId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
  }
  if (!ALLOWED_TRANSITIONS[existing.status as string]?.includes("delivered")) {
    res.status(400).json({ message: `Cannot deliver an order in "${existing.status}".` });
    return;
  }
  await db.update(ordersTable).set({ status: "delivered", updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  await releaseEscrowForOrder(order);
  await notifyOrderParties(order, "order:status");
  res.json(await enrichOrder(order, { hideCoords: !(await canSeeCoords(user, order)) }));
});

export default router;
