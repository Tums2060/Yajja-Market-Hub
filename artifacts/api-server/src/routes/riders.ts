import { Router } from "express";
import { db, riderProfilesTable, ordersTable, usersTable, orderItemsTable } from "@workspace/db";
import { and, eq, desc, count, inArray } from "drizzle-orm";
import {
  RegisterRiderBody,
  UpdateRiderLocationBody,
} from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";
import { broadcastToUser } from "../lib/ws";

const router = Router();

function serializeRider(
  r: typeof riderProfilesTable.$inferSelect
) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
  };
}

router.post(
  "/riders/register",
  requireAuth,
  async (req, res) => {
    const user = getUser(req);

    const parsed = RegisterRiderBody.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid body",
      });

      return;
    }

    const [existing] = await db
      .select()
      .from(riderProfilesTable)
      .where(eq(riderProfilesTable.userId, user.id))
      .limit(1);

    if (existing) {
      res.status(409).json({
        message: "Rider profile already exists",
      });

      return;
    }

    await db.insert(riderProfilesTable).values({
      userId: user.id,
      ...parsed.data,
    });

    const [rider] = await db
      .select()
      .from(riderProfilesTable)
      .where(eq(riderProfilesTable.userId, user.id))
      .limit(1);

    if (!rider) {
      res.status(500).json({
        message: "Failed to create rider profile",
      });

      return;
    }

    res.status(201).json(
      serializeRider(rider)
    );
  }
);

router.get(
  "/riders/me",
  requireAuth,
  async (req, res) => {
    const user = getUser(req);

    let [rider] = await db
      .select()
      .from(riderProfilesTable)
      .where(eq(riderProfilesTable.userId, user.id))
      .limit(1);

    if (!rider) {
      if (user.role === "rider") {
        await db.insert(riderProfilesTable).values({
          userId: user.id,
          vehicleType: "motorcycle",
        });

        [rider] = await db
          .select()
          .from(riderProfilesTable)
          .where(eq(riderProfilesTable.userId, user.id))
          .limit(1);
      } else {
        res.status(404).json({
          message: "Rider profile not found",
        });

        return;
      }
    }

    res.json(
      serializeRider(rider)
    );
  }
);

router.put(
  "/riders/me",
  requireAuth,
  async (req, res) => {
    const user = getUser(req);

    const parsed =
      UpdateRiderLocationBody.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid body",
      });

      return;
    }

    const updateData: Partial<
      typeof riderProfilesTable.$inferInsert
    > = {
      currentLat: parsed.data.lat,
      currentLng: parsed.data.lng,
    };

    if (parsed.data.isAvailable !== undefined) {
      updateData.isAvailable =
        parsed.data.isAvailable;
    }

    await db
      .update(riderProfilesTable)
      .set(updateData)
      .where(eq(riderProfilesTable.userId, user.id));

    const [rider] = await db
      .select()
      .from(riderProfilesTable)
      .where(eq(riderProfilesTable.userId, user.id))
      .limit(1);

    if (!rider) {
      res.status(404).json({
        message: "Rider profile not found",
      });

      return;
    }

    // Push live location to customers tracking this rider's active deliveries
    const activeOrders = await db
      .select({ id: ordersTable.id, userId: ordersTable.userId })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.riderId, rider.id),
          eq(ordersTable.status, "picked_up")
        )
      );
    for (const o of activeOrders) {
      broadcastToUser(o.userId, {
        type: "rider:location",
        orderId: o.id,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
      });
    }

    res.json(
      serializeRider(rider)
    );
  }
);

// Rider delivery history — delivered orders for the authenticated rider, paginated.
router.get("/rider/orders/history", requireAuth, async (req, res) => {
  const user = getUser(req);
  if (user.role !== "rider") {
    res.status(403).json({ success: false, error: "Rider access required", code: "FORBIDDEN" });
    return;
  }

  const [rider] = await db
    .select()
    .from(riderProfilesTable)
    .where(eq(riderProfilesTable.userId, user.id))
    .limit(1);
  if (!rider) {
    res.status(404).json({ success: false, error: "Rider profile not found", code: "NOT_FOUND" });
    return;
  }

  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
  const offset = (page - 1) * limit;

  const where = and(eq(ordersTable.riderId, rider.id), eq(ordersTable.status, "delivered"));

  const [{ total }] = await db.select({ total: count() }).from(ordersTable).where(where);

  const rows = await db
    .select({
      id: ordersTable.id,
      total: ordersTable.total,
      deliveryFee: ordersTable.deliveryFee,
      deliveryAddress: ordersTable.deliveryAddress,
      deliveryLat: ordersTable.deliveryLat,
      deliveryLng: ordersTable.deliveryLng,
      completedAt: ordersTable.updatedAt,
      createdAt: ordersTable.createdAt,
      customerName: usersTable.name,
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .where(where)
    .orderBy(desc(ordersTable.updatedAt))
    .limit(limit)
    .offset(offset);

  const orderIds = rows.map((r) => r.id);
  const itemsByOrder = new Map<number, { name: string; quantity: number }[]>();
  if (orderIds.length) {
    const items = await db
      .select({ orderId: orderItemsTable.orderId, productName: orderItemsTable.productName, quantity: orderItemsTable.quantity })
      .from(orderItemsTable)
      .where(inArray(orderItemsTable.orderId, orderIds));
    for (const it of items) {
      const list = itemsByOrder.get(it.orderId) ?? [];
      list.push({ name: it.productName, quantity: it.quantity });
      itemsByOrder.set(it.orderId, list);
    }
  }

  const data = rows.map((r) => {
    const its = itemsByOrder.get(r.id) ?? [];
    const itemsSummary = its.map((i) => `${i.quantity}x ${i.name}`).join(", ");
    return {
      id: r.id,
      customerName: (r.customerName ?? "Customer").split(" ")[0],
      itemsSummary,
      itemsCount: its.reduce((s, i) => s + i.quantity, 0),
      total: r.total,
      earnings: r.deliveryFee,
      deliveryAddress: r.deliveryAddress,
      deliveryLat: r.deliveryLat,
      deliveryLng: r.deliveryLng,
      completedAt: r.completedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    };
  });

  res.json({
    data,
    page,
    limit,
    total: total ?? 0,
    totalPages: Math.max(1, Math.ceil((total ?? 0) / limit)),
  });
});

export default router;