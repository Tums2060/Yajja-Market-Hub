import { Router } from "express";
import { db, vendorsTable, ordersTable, usersTable } from "@workspace/db";
import { eq, and, ilike, or, gte, lte, sql } from "drizzle-orm";
import { CreateVendorBody, UpdateVendorBody } from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

function serializeVendor(v: typeof vendorsTable.$inferSelect) {
  return { ...v, createdAt: v.createdAt.toISOString() };
}

router.get("/vendors", async (req, res) => {
  const { category, search } = req.query as { category?: string; search?: string };
  let query = db.select().from(vendorsTable).$dynamic();
  const conditions = [];
  if (category) conditions.push(eq(vendorsTable.category, category as any));
  if (search) conditions.push(ilike(vendorsTable.name, `%${search}%`));
  if (conditions.length > 0) query = query.where(and(...conditions));
  const vendors = await query;
  res.json(vendors.map(serializeVendor));
});

router.get("/vendors/me", requireAuth, async (req, res) => {
  const user = getUser(req);
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.userId, user.id)).limit(1);
  if (!vendor) {
    res.status(404).json({ message: "Vendor profile not found" });
    return;
  }
  res.json(serializeVendor(vendor));
});

router.post("/vendors", requireAuth, async (req, res) => {
  const parsed = CreateVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const user = getUser(req);
  const [vendor] = await db.insert(vendorsTable).values({ ...parsed.data, userId: user.id, category: parsed.data.category as any }).returning();
  res.status(201).json(serializeVendor(vendor));
});

router.get("/vendors/:vendorId", async (req, res) => {
  const vendorId = parseInt(req.params.vendorId);
  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, vendorId)).limit(1);
  if (!vendor) {
    res.status(404).json({ message: "Vendor not found" });
    return;
  }
  res.json(serializeVendor(vendor));
});

router.put("/vendors/:vendorId", requireAuth, async (req, res) => {
  const vendorId = parseInt(req.params.vendorId);
  const parsed = UpdateVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const [vendor] = await db.update(vendorsTable).set(parsed.data).where(eq(vendorsTable.id, vendorId)).returning();
  if (!vendor) {
    res.status(404).json({ message: "Vendor not found" });
    return;
  }
  res.json(serializeVendor(vendor));
});

router.get("/vendors/:vendorId/stats", requireAuth, async (req, res) => {
  const vendorId = parseInt(req.params.vendorId);
  const allOrders = await db.select().from(ordersTable).where(eq(ordersTable.vendorId, vendorId));
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());

  const todayOrders = allOrders.filter(o => new Date(o.createdAt) >= todayStart);
  const weekOrders = allOrders.filter(o => new Date(o.createdAt) >= weekStart);
  const pendingOrders = allOrders.filter(o =>
    o.status === "pending" ||
    o.status === "accepted" ||
    o.status === "confirmed" ||
    o.status === "preparing" ||
    o.status === "ready"
  );

  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
  const weekRevenue = weekOrders.reduce((s, o) => s + o.total, 0);
  const totalRevenue = allOrders.reduce((s, o) => s + o.total, 0);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const ordersThisWeek = dayNames.map((day, i) => {
    const dayOrders = weekOrders.filter(o => new Date(o.createdAt).getDay() === i);
    return { day, count: dayOrders.length, revenue: dayOrders.reduce((s, o) => s + o.total, 0) };
  });

  res.json({
    totalOrders: allOrders.length,
    pendingOrders: pendingOrders.length,
    todayRevenue,
    weekRevenue,
    totalRevenue,
    avgRating: 4.5,
    ordersThisWeek,
  });
});

export default router;
