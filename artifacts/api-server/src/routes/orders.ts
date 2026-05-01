import { Router } from "express";
import { db, ordersTable, orderItemsTable, groupOrdersTable, billAssignmentsTable, cartItemsTable, groupCartItemsTable, productsTable, vendorsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateOrderBody, UpdateOrderStatusBody, AssignRiderBody, CreateGroupOrderBody, SubmitBillAssignmentBody } from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

async function enrichOrder(order: typeof ordersTable.$inferSelect) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, order.vendorId)).limit(1);
  return {
    ...order,
    vendorName: vendor?.name || "",
    items,
    status: order.status as string,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

// Individual orders
router.get("/orders", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { status } = req.query as { status?: string };
  let orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, user.id));
  if (status) orders = orders.filter(o => o.status === status);
  const enriched = await Promise.all(orders.map(enrichOrder));
  res.json(enriched);
});

router.post("/orders", requireAuth, async (req, res) => {
  const user = getUser(req);
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }

  const cartItems = await db.select().from(cartItemsTable).where(eq(cartItemsTable.userId, user.id));
  if (cartItems.length === 0) {
    res.status(400).json({ message: "Cart is empty" });
    return;
  }

  // Group by vendor and create one order per vendor
  const vendorMap = new Map<number, typeof cartItems>();
  for (const ci of cartItems) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, ci.productId)).limit(1);
    if (!product) continue;
    if (!vendorMap.has(product.vendorId)) vendorMap.set(product.vendorId, []);
    vendorMap.get(product.vendorId)!.push({ ...ci, productId: ci.productId });
  }

  const createdOrders = [];
  for (const [vendorId, items] of vendorMap) {
    const products = await Promise.all(items.map(i => db.select().from(productsTable).where(eq(productsTable.id, i.productId)).limit(1)));
    const subtotal = products.reduce((s, p, idx) => s + (p[0]?.price || 0) * items[idx].quantity, 0);
    const deliveryFee = 2.5;
    const total = subtotal + deliveryFee;

    const [order] = await db.insert(ordersTable).values({
      userId: user.id,
      vendorId,
      deliveryAddress: parsed.data.deliveryAddress,
      subtotal,
      deliveryFee,
      total,
      notes: parsed.data.notes,
      status: "pending",
    }).returning();

    await db.insert(orderItemsTable).values(
      products.map((p, i) => ({
        orderId: order.id,
        productId: items[i].productId,
        productName: p[0]?.name || "",
        quantity: items[i].quantity,
        unitPrice: p[0]?.price || 0,
        totalPrice: (p[0]?.price || 0) * items[i].quantity,
      }))
    );
    createdOrders.push(await enrichOrder(order));
  }

  // Clear cart
  await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, user.id));

  res.status(201).json(createdOrders[0] || null);
});

router.get("/orders/:orderId", requireAuth, async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  res.json(await enrichOrder(order));
});

router.put("/orders/:orderId/status", requireAuth, async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const [order] = await db.update(ordersTable).set({ status: parsed.data.status as any, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId)).returning();
  if (!order) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  res.json(await enrichOrder(order));
});

router.post("/orders/:orderId/assign-rider", requireAuth, async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const parsed = AssignRiderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const [order] = await db.update(ordersTable).set({ riderId: parsed.data.riderId, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId)).returning();
  if (!order) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  res.json(await enrichOrder(order));
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
  if (status) orders = orders.filter(o => o.status === status);
  const enriched = await Promise.all(orders.map(enrichOrder));
  res.json(enriched);
});

// Rider orders
router.get("/rider-orders", requireAuth, async (req, res) => {
  const { status } = req.query as { status?: string };
  let orders = await db.select().from(ordersTable);
  if (status) {
    orders = orders.filter(o => o.status === status);
  } else {
    orders = orders.filter(o => o.status === "ready" || o.status === "picked_up");
  }
  const enriched = await Promise.all(orders.map(enrichOrder));
  res.json(enriched);
});

// Group orders
router.get("/groups/:groupId/orders", requireAuth, async (req, res) => {
  const groupId = parseInt(req.params.groupId);
  const groupOrders = await db.select().from(groupOrdersTable).where(eq(groupOrdersTable.groupId, groupId));
  const result = await Promise.all(groupOrders.map(async (go) => {
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.groupOrderId, go.id));
    const enrichedOrders = await Promise.all(orders.map(enrichOrder));
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
  const groupId = parseInt(req.params.groupId);
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

  const [groupOrder] = await db.insert(groupOrdersTable).values({
    groupId,
    initiatedBy: user.id,
    deliveryAddress: parsed.data.deliveryAddress,
    total,
    amountCollected: 0,
    status: "pending_payment",
  }).returning();

  res.status(201).json({
    ...groupOrder,
    orders: [],
    billAssignments: [],
    createdAt: groupOrder.createdAt.toISOString(),
  });
});

router.get("/groups/:groupId/orders/:groupOrderId/bill-assignments", requireAuth, async (req, res) => {
  const groupOrderId = parseInt(req.params.groupOrderId);
  const assignments = await db.select().from(billAssignmentsTable).where(eq(billAssignmentsTable.groupOrderId, groupOrderId));
  const enriched = await Promise.all(assignments.map(async (a) => {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, a.userId)).limit(1);
    return { ...a, userName: u?.name || "", createdAt: a.createdAt.toISOString() };
  }));
  res.json(enriched);
});

router.post("/groups/:groupId/orders/:groupOrderId/bill-assignments", requireAuth, async (req, res) => {
  const groupOrderId = parseInt(req.params.groupOrderId);
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
    [assignment] = await db.update(billAssignmentsTable).set({ amount: parsed.data.amount })
      .where(eq(billAssignmentsTable.id, existing.id)).returning();
  } else {
    [assignment] = await db.insert(billAssignmentsTable).values({
      groupOrderId,
      userId: user.id,
      amount: parsed.data.amount,
      paid: false,
    }).returning();
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
  const orderId = parseInt(req.params.orderId);
  const [order] = await db.update(ordersTable).set({ status: "picked_up", updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId)).returning();
  if (!order) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  res.json(await enrichOrder(order));
});

router.post("/riders/deliver/:orderId", requireAuth, async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const [order] = await db.update(ordersTable).set({ status: "delivered", updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId)).returning();
  if (!order) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  res.json(await enrichOrder(order));
});

export default router;
