import { Router } from "express";
import { db, usersTable, vendorsTable, ordersTable, riderProfilesTable } from "@workspace/db";
import { eq, and, desc, sql, count, sum } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { Request, Response, NextFunction } from "express";

const router = Router();

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    const user = getUser(req);
    if (user.role !== "admin") {
      res.status(403).json({ message: "Admin access required" });
      return;
    }
    next();
  });
}

// Platform stats dashboard
router.get("/admin/stats", requireAdmin, async (req, res) => {
  const [totalUsers] = await db.select({ count: count() }).from(usersTable);
  const [totalOrders] = await db.select({ count: count() }).from(ordersTable);
  const [totalVendors] = await db.select({ count: count() }).from(vendorsTable);
  const [pendingVendors] = await db.select({ count: count() }).from(vendorsTable).where(eq(vendorsTable.status, "pending_review"));
  const [activeRiders] = await db.select({ count: count() }).from(riderProfilesTable).where(eq(riderProfilesTable.isAvailable, true));

  const allOrders = await db.select().from(ordersTable);
  const totalRevenue = allOrders.reduce((s, o) => s + o.total, 0);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayOrders = allOrders.filter(o => new Date(o.createdAt) >= todayStart);
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const days: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dEnd = new Date(dStart.getTime() + 86400000);
    const dayOrders = allOrders.filter(o => {
      const t = new Date(o.createdAt);
      return t >= dStart && t < dEnd;
    });
    days.push({
      date: d.toLocaleDateString("en-US", { weekday: "short" }),
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      orders: dayOrders.length,
    });
  }

  const pendingOrdersCount = allOrders.filter(o => ["pending", "confirmed", "preparing"].includes(o.status)).length;

  res.json({
    totalUsers: totalUsers.count,
    totalOrders: totalOrders.count,
    totalVendors: totalVendors.count,
    pendingVendors: pendingVendors.count,
    activeRiders: activeRiders.count,
    totalRevenue,
    todayRevenue,
    todayOrders: todayOrders.length,
    pendingOrders: pendingOrdersCount,
    revenueChart: days,
  });
});

// List all vendors with status
router.get("/admin/vendors", requireAdmin, async (req, res) => {
  const vendors = await db.select().from(vendorsTable).orderBy(desc(vendorsTable.createdAt));
  res.json(vendors.map(v => ({ ...v, createdAt: v.createdAt.toISOString() })));
});

// Approve vendor
router.put("/admin/vendors/:vendorId/approve", requireAdmin, async (req, res) => {
  const vendorId = parseInt(req.params.vendorId);
  const [vendor] = await db.update(vendorsTable).set({ status: "approved" }).where(eq(vendorsTable.id, vendorId)).returning();
  if (!vendor) { res.status(404).json({ message: "Vendor not found" }); return; }
  res.json({ ...vendor, createdAt: vendor.createdAt.toISOString() });
});

// Reject vendor
router.put("/admin/vendors/:vendorId/reject", requireAdmin, async (req, res) => {
  const vendorId = parseInt(req.params.vendorId);
  const [vendor] = await db.update(vendorsTable).set({ status: "rejected" }).where(eq(vendorsTable.id, vendorId)).returning();
  if (!vendor) { res.status(404).json({ message: "Vendor not found" }); return; }
  res.json({ ...vendor, createdAt: vendor.createdAt.toISOString() });
});

// List all users
router.get("/admin/users", requireAdmin, async (req, res) => {
  const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, phone: usersTable.phone, createdAt: usersTable.createdAt }).from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })));
});

// List all orders (platform-wide)
router.get("/admin/orders", requireAdmin, async (req, res) => {
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(200);
  res.json(orders.map(o => ({ ...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString() })));
});

// List all riders with profiles
router.get("/admin/riders", requireAdmin, async (req, res) => {
  const riders = await db
    .select({ rider: riderProfilesTable, user: { id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone } })
    .from(riderProfilesTable)
    .leftJoin(usersTable, eq(riderProfilesTable.userId, usersTable.id))
    .orderBy(desc(riderProfilesTable.createdAt));
  res.json(riders.map(r => ({ ...r.rider, user: r.user, createdAt: r.rider.createdAt.toISOString() })));
});

// Toggle rider availability
router.put("/admin/riders/:riderId/toggle", requireAdmin, async (req, res) => {
  const riderId = parseInt(req.params.riderId);
  const [rider] = await db.select().from(riderProfilesTable).where(eq(riderProfilesTable.id, riderId)).limit(1);
  if (!rider) { res.status(404).json({ message: "Rider not found" }); return; }
  const [updated] = await db.update(riderProfilesTable).set({ isAvailable: !rider.isAvailable }).where(eq(riderProfilesTable.id, riderId)).returning();
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

export default router;
