import { Router } from "express";
import { db, cartItemsTable, groupCartItemsTable, groupMembersTable, productsTable, vendorsTable, usersTable } from "@workspace/db";
import { broadcastToGroup } from "../lib/ws";
import { eq, and } from "drizzle-orm";
import { AddToCartBody, UpdateCartItemBody } from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";
import { mpesaConfig } from "../lib/mpesa";

const router = Router();

async function getProductWithVendor(productId: number) {
  const [row] = await db.select({ product: productsTable, vendorName: vendorsTable.name })
    .from(productsTable)
    .leftJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(eq(productsTable.id, productId))
    .limit(1);
  return row;
}

function serializeCartItem(item: typeof cartItemsTable.$inferSelect, product: any) {
  return {
    ...item,
    product,
    createdAt: item.createdAt.toISOString(),
  };
}

async function hydrateCartItem(item: typeof cartItemsTable.$inferSelect) {
  const row = await getProductWithVendor(item.productId);
  return serializeCartItem(item, row ? { ...row.product, vendorName: row.vendorName, createdAt: row.product.createdAt.toISOString() } : null);
}

// Individual cart
router.get("/cart", requireAuth, async (req, res) => {
  const user = getUser(req);
  const items = await db.select().from(cartItemsTable).where(eq(cartItemsTable.userId, user.id));

  const enriched = await Promise.all(items.map(async (item) => {
    const row = await getProductWithVendor(item.productId);
    return serializeCartItem(item, row ? { ...row.product, vendorName: row.vendorName, createdAt: row.product.createdAt.toISOString() } : null);
  }));

  const subtotal = enriched.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0);

  // Group by vendor
  const vendorMap = new Map<number, { vendorId: number; vendorName: string; items: typeof enriched; subtotal: number }>();
  for (const item of enriched) {
    if (!item.product) continue;
    const vid = item.product.vendorId;
    const vname = item.product.vendorName || "Unknown";
    if (!vendorMap.has(vid)) vendorMap.set(vid, { vendorId: vid, vendorName: vname, items: [], subtotal: 0 });
    const group = vendorMap.get(vid)!;
    group.items.push(item);
    group.subtotal += item.product.price * item.quantity;
  }

  res.json({
    items: enriched,
    subtotal,
    itemCount: enriched.length,
    deliveryFee: mpesaConfig.deliveryFee,
    vendorGroups: Array.from(vendorMap.values()),
  });
});

router.post("/cart/items", requireAuth, async (req, res) => {
  const user = getUser(req);
  const parsed = AddToCartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }

  // Check if already in cart — upsert
  const [existing] = await db.select().from(cartItemsTable)
    .where(and(eq(cartItemsTable.userId, user.id), eq(cartItemsTable.productId, parsed.data.productId)))
    .limit(1);

  const incomingNotes = parsed.data.notes?.trim() || null;
  let item;
  if (existing) {
    await db.update(cartItemsTable).set({
      quantity: existing.quantity + parsed.data.quantity,
      notes: incomingNotes ?? existing.notes,
    })
      .where(eq(cartItemsTable.id, existing.id));
    [item] = await db.select().from(cartItemsTable).where(eq(cartItemsTable.id, existing.id)).limit(1);
  } else {
    await db.insert(cartItemsTable).values({
      userId: user.id,
      productId: parsed.data.productId,
      quantity: parsed.data.quantity,
      notes: incomingNotes,
    });
    [item] = await db.select().from(cartItemsTable)
      .where(and(eq(cartItemsTable.userId, user.id), eq(cartItemsTable.productId, parsed.data.productId)))
      .limit(1);
  }

  res.status(201).json(await hydrateCartItem(item));
});

router.put("/cart/items/:cartItemId", requireAuth, async (req, res) => {
  const user = getUser(req);
  const cartItemId = parseInt(String(req.params.cartItemId), 10);
  const parsed = UpdateCartItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const [existingItem] = await db.select().from(cartItemsTable)
    .where(and(eq(cartItemsTable.id, cartItemId), eq(cartItemsTable.userId, user.id)))
    .limit(1);
  if (!existingItem) {
    res.status(404).json({ message: "Cart item not found" });
    return;
  }
  await db.update(cartItemsTable).set({ quantity: parsed.data.quantity })
    .where(and(eq(cartItemsTable.id, cartItemId), eq(cartItemsTable.userId, user.id)));
  const [item] = await db.select().from(cartItemsTable).where(eq(cartItemsTable.id, cartItemId)).limit(1);
  res.json(await hydrateCartItem(item));
});

router.delete("/cart/items/:cartItemId", requireAuth, async (req, res) => {
  const user = getUser(req);
  const cartItemId = parseInt(String(req.params.cartItemId), 10);
  const [existingItem] = await db.select().from(cartItemsTable)
    .where(and(eq(cartItemsTable.id, cartItemId), eq(cartItemsTable.userId, user.id)))
    .limit(1);
  if (!existingItem) {
    res.status(404).json({ message: "Cart item not found" });
    return;
  }
  await db.delete(cartItemsTable)
    .where(and(eq(cartItemsTable.id, cartItemId), eq(cartItemsTable.userId, user.id)));
  res.json({ message: "Item removed" });
});

router.delete("/cart/clear", requireAuth, async (req, res) => {
  const user = getUser(req);
  await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, user.id));
  res.json({ message: "Cart cleared" });
});

// Group cart
router.get("/groups/:groupId/cart", requireAuth, async (req, res) => {
  const groupId = parseInt(String(req.params.groupId), 10);
  const items = await db.select().from(groupCartItemsTable).where(eq(groupCartItemsTable.groupId, groupId));

  const enriched = await Promise.all(items.map(async (item) => {
    const row = await getProductWithVendor(item.productId);
    const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, item.userId)).limit(1);
    return {
      ...item,
      userName: userRow?.name || "Unknown",
      product: row ? { ...row.product, vendorName: row.vendorName, createdAt: row.product.createdAt.toISOString() } : null,
      createdAt: item.createdAt.toISOString(),
    };
  }));

  const subtotal = enriched.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0);

  // Member summary
  const memberMap = new Map<number, { userId: number; userName: string; itemCount: number; subtotal: number }>();
  for (const item of enriched) {
    if (!memberMap.has(item.userId)) memberMap.set(item.userId, { userId: item.userId, userName: item.userName, itemCount: 0, subtotal: 0 });
    const m = memberMap.get(item.userId)!;
    m.itemCount += item.quantity;
    m.subtotal += (item.product?.price || 0) * item.quantity;
  }

  res.json({
    items: enriched,
    subtotal,
    itemCount: enriched.length,
    memberSummary: Array.from(memberMap.values()),
  });
});

router.post("/groups/:groupId/cart/items", requireAuth, async (req, res) => {
  const groupId = parseInt(String(req.params.groupId), 10);
  const user = getUser(req);
  const parsed = AddToCartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }

  const [existing] = await db.select().from(groupCartItemsTable)
    .where(and(eq(groupCartItemsTable.groupId, groupId), eq(groupCartItemsTable.userId, user.id), eq(groupCartItemsTable.productId, parsed.data.productId)))
    .limit(1);

  const incomingNotes = parsed.data.notes?.trim() || null;
  let item;
  if (existing) {
    await db.update(groupCartItemsTable).set({
      quantity: existing.quantity + parsed.data.quantity,
      notes: incomingNotes ?? existing.notes,
    })
      .where(eq(groupCartItemsTable.id, existing.id));
    [item] = await db.select().from(groupCartItemsTable).where(eq(groupCartItemsTable.id, existing.id)).limit(1);
  } else {
    await db.insert(groupCartItemsTable).values({
      groupId,
      userId: user.id,
      productId: parsed.data.productId,
      quantity: parsed.data.quantity,
      notes: incomingNotes,
    });
    [item] = await db.select().from(groupCartItemsTable)
      .where(and(eq(groupCartItemsTable.groupId, groupId), eq(groupCartItemsTable.userId, user.id), eq(groupCartItemsTable.productId, parsed.data.productId)))
      .limit(1);
  }

  const row = await getProductWithVendor(item.productId);
  broadcastToGroup(groupId, { type: "cart:update", groupId, actorUserId: user.id });
  res.status(201).json({
    ...item,
    userName: (await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1))[0]?.name || "",
    product: row ? { ...row.product, vendorName: row.vendorName, createdAt: row.product.createdAt.toISOString() } : null,
    createdAt: item.createdAt.toISOString(),
  });
});

router.put("/groups/:groupId/cart/items/:cartItemId", requireAuth, async (req, res) => {
  const user = getUser(req);
  const groupId = parseInt(String(req.params.groupId), 10);
  const cartItemId = parseInt(String(req.params.cartItemId), 10);
  const parsed = UpdateCartItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  if (parsed.data.quantity < 1) {
    res.status(400).json({ message: "Quantity must be at least 1" });
    return;
  }
  // Authz: caller must be a member of the group
  const [membership] = await db.select().from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, user.id)))
    .limit(1);
  if (!membership) {
    res.status(403).json({ message: "Not a member of this group" });
    return;
  }
  // Only the user who added the item can change its quantity
  const [existingItem] = await db.select().from(groupCartItemsTable)
    .where(and(
      eq(groupCartItemsTable.id, cartItemId),
      eq(groupCartItemsTable.groupId, groupId),
      eq(groupCartItemsTable.userId, user.id),
    ))
    .limit(1);
  if (!existingItem) {
    res.status(404).json({ message: "Cart item not found" });
    return;
  }
  await db.update(groupCartItemsTable)
    .set({ quantity: parsed.data.quantity })
    .where(and(
      eq(groupCartItemsTable.id, cartItemId),
      eq(groupCartItemsTable.groupId, groupId),
      eq(groupCartItemsTable.userId, user.id),
    ));
  const [item] = await db.select().from(groupCartItemsTable).where(eq(groupCartItemsTable.id, cartItemId)).limit(1);
  const row = await getProductWithVendor(item.productId);
  broadcastToGroup(groupId, { type: "cart:update", groupId, actorUserId: user.id });
  res.json({
    ...item,
    userName: user.name,
    product: row ? { ...row.product, vendorName: row.vendorName, createdAt: row.product.createdAt.toISOString() } : null,
    createdAt: item.createdAt.toISOString(),
  });
});

router.delete("/groups/:groupId/cart/items/:cartItemId", requireAuth, async (req, res) => {
  const user = getUser(req);
  const groupId = parseInt(String(req.params.groupId), 10);
  const cartItemId = parseInt(String(req.params.cartItemId), 10);
  // Only the user who added the item can remove it from the group cart
  const [existingItem] = await db.select().from(groupCartItemsTable)
    .where(and(
      eq(groupCartItemsTable.id, cartItemId),
      eq(groupCartItemsTable.groupId, groupId),
      eq(groupCartItemsTable.userId, user.id),
    ))
    .limit(1);
  if (!existingItem) {
    res.status(404).json({ message: "Cart item not found" });
    return;
  }
  await db.delete(groupCartItemsTable)
    .where(and(
      eq(groupCartItemsTable.id, cartItemId),
      eq(groupCartItemsTable.groupId, groupId),
      eq(groupCartItemsTable.userId, user.id),
    ));
  broadcastToGroup(groupId, { type: "cart:update", groupId, actorUserId: user.id });
  res.json({ message: "Item removed" });
});

export default router;
