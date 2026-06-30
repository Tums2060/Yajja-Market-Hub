import { Router } from "express";
import { db, dbUpdateReturning, usersTable, vendorsTable, ordersTable, riderProfilesTable } from "@workspace/db";
import { eq, and, desc, sql, count, sum } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { Request, Response, NextFunction } from "express";

const router = Router();

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    const user = getUser(req);
    if (user.role !== "admin" && user.role !== "super_admin") {
      res.status(403).json({ message: "Admin access required" });
      return;
    }
    next();
  });
}

async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    const user = getUser(req);
    if (user.role !== "super_admin") {
      res.status(403).json({ message: "Super Admin access required" });
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
  const vendorId = parseInt(String(req.params.vendorId), 10);
  const vendor = await dbUpdateReturning(vendorsTable, { status: "approved" }, eq(vendorsTable.id, vendorId));
  if (!vendor) { res.status(404).json({ message: "Vendor not found" }); return; }
  res.json({ ...vendor, createdAt: vendor.createdAt.toISOString() });
});

// Reject vendor
router.put("/admin/vendors/:vendorId/reject", requireAdmin, async (req, res) => {
  const vendorId = parseInt(String(req.params.vendorId), 10);
  const vendor = await dbUpdateReturning(vendorsTable, { status: "rejected" }, eq(vendorsTable.id, vendorId));
  if (!vendor) { res.status(404).json({ message: "Vendor not found" }); return; }
  res.json({ ...vendor, createdAt: vendor.createdAt.toISOString() });
});

// List all users
router.get("/admin/users", requireAdmin, async (req, res) => {
  const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, phone: usersTable.phone, isActive: usersTable.isActive, createdAt: usersTable.createdAt }).from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })));
});

// Deactivate a user account (blocks future authenticated requests)
router.put("/admin/users/:userId/deactivate", requireAdmin, async (req, res) => {
  const userId = parseInt(String(req.params.userId), 10);
  const admin = getUser(req);
  if (userId === admin.id) {
    res.status(400).json({ success: false, error: "You cannot deactivate your own account", code: "INVALID_OPERATION" });
    return;
  }

  // Find target user first
  const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!targetUser) {
    res.status(404).json({ success: false, error: "User not found", code: "NOT_FOUND" });
    return;
  }

  // Protect Super Admin from normal admins
  if (targetUser.role === "super_admin" && admin.role !== "super_admin") {
    res.status(403).json({ success: false, error: "Forbidden: You cannot modify or deactivate the Super Admin", code: "FORBIDDEN" });
    return;
  }

  const updated = await dbUpdateReturning(usersTable, { isActive: false }, eq(usersTable.id, userId));
  if (!updated) { res.status(404).json({ success: false, error: "User not found", code: "NOT_FOUND" }); return; }
  const { passwordHash: _p, ...out } = updated;
  res.json({ ...out, createdAt: out.createdAt.toISOString() });
});

// Reactivate a user account
router.put("/admin/users/:userId/activate", requireAdmin, async (req, res) => {
  const userId = parseInt(String(req.params.userId), 10);
  const admin = getUser(req);

  // Find target user first
  const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!targetUser) {
    res.status(404).json({ success: false, error: "User not found", code: "NOT_FOUND" });
    return;
  }

  // Protect Super Admin from normal admins
  if (targetUser.role === "super_admin" && admin.role !== "super_admin") {
    res.status(403).json({ success: false, error: "Forbidden: You cannot modify or activate the Super Admin", code: "FORBIDDEN" });
    return;
  }

  const updated = await dbUpdateReturning(usersTable, { isActive: true }, eq(usersTable.id, userId));
  if (!updated) { res.status(404).json({ success: false, error: "User not found", code: "NOT_FOUND" }); return; }
  const { passwordHash: _p, ...out } = updated;
  res.json({ ...out, createdAt: out.createdAt.toISOString() });
});

// Create a new admin account (Super Admin only)
router.post("/admin/users/create-admin", requireSuperAdmin, async (req, res) => {
  const { name, email, password, phone } = req.body ?? {};

  if (!name || !email || !password) {
    res.status(400).json({ success: false, error: "Name, email, and password are required", code: "VALIDATION_ERROR" });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ success: false, error: "Invalid email format", code: "VALIDATION_ERROR" });
    return;
  }

  // Check if email already exists
  const [existingEmail] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existingEmail) {
    res.status(409).json({ success: false, error: "Email already registered", code: "CONFLICT" });
    return;
  }

  // Check if phone number already exists
  if (phone) {
    const [existingPhone] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.phone, phone))
      .limit(1);

    if (existingPhone) {
      res.status(409).json({ success: false, error: "Phone number already in use", code: "CONFLICT" });
      return;
    }
  }

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.default.hash(password, 10);

  const [newAdmin] = await db
    .insert(usersTable)
    .values({
      name,
      email,
      passwordHash,
      role: "admin",
      phone: phone || null,
      isActive: true,
    })
    .returning();

  const { passwordHash: _, ...out } = newAdmin;
  res.status(201).json({ success: true, user: { ...out, createdAt: out.createdAt.toISOString() } });
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
  const riderId = parseInt(String(req.params.riderId), 10);
  const [rider] = await db.select().from(riderProfilesTable).where(eq(riderProfilesTable.id, riderId)).limit(1);
  if (!rider) { res.status(404).json({ message: "Rider not found" }); return; }
  const updated = await dbUpdateReturning(riderProfilesTable, { isAvailable: !rider.isAvailable }, eq(riderProfilesTable.id, riderId));
  if (!updated) { res.status(404).json({ message: "Rider not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

// Suspend a rider (set unavailable)
router.put("/admin/riders/:riderId/suspend", requireAdmin, async (req, res) => {
  const riderId = parseInt(String(req.params.riderId), 10);
  const updated = await dbUpdateReturning(riderProfilesTable, { isAvailable: false }, eq(riderProfilesTable.id, riderId));
  if (!updated) { res.status(404).json({ success: false, error: "Rider not found", code: "NOT_FOUND" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

// Reinstate a rider (set available)
router.put("/admin/riders/:riderId/reinstate", requireAdmin, async (req, res) => {
  const riderId = parseInt(String(req.params.riderId), 10);
  const updated = await dbUpdateReturning(riderProfilesTable, { isAvailable: true }, eq(riderProfilesTable.id, riderId));
  if (!updated) { res.status(404).json({ success: false, error: "Rider not found", code: "NOT_FOUND" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

// Platform revenue breakdown (gross, commission, payouts)
router.get("/admin/revenue", requireAdmin, async (req, res) => {
  const orders = await db.select().from(ordersTable);
  const delivered = orders.filter(o => o.status === "delivered");
  const grossRevenue = orders.reduce((s, o) => s + o.total, 0);
  const deliveredSubtotal = delivered.reduce((s, o) => s + o.subtotal, 0);
  const deliveryFees = delivered.reduce((s, o) => s + o.deliveryFee, 0);
  const commission = deliveryFees * 0.15;
  const vendorPayouts = deliveredSubtotal;
  const riderPayouts = deliveryFees * 0.85;
  res.json({
    grossRevenue,
    deliveredOrders: delivered.length,
    totalOrders: orders.length,
    commission,
    commissionRate: 0.15,
    vendorPayouts,
    riderPayouts,
  });
});

// Revenue grouped by vendor (for bar/pie charts)
router.get("/admin/analytics/revenue-by-vendor", requireAdmin, async (req, res) => {
  const orders = await db.select().from(ordersTable);
  const vendors = await db.select().from(vendorsTable);
  const nameById = new Map(vendors.map(v => [v.id, v.name]));
  const agg = new Map<number, { revenue: number; orders: number }>();
  for (const o of orders) {
    const cur = agg.get(o.vendorId) ?? { revenue: 0, orders: 0 };
    cur.revenue += o.total;
    cur.orders += 1;
    agg.set(o.vendorId, cur);
  }
  const result = Array.from(agg.entries())
    .map(([vendorId, v]) => ({
      vendorId,
      vendorName: nameById.get(vendorId) ?? `Vendor #${vendorId}`,
      revenue: v.revenue,
      orders: v.orders,
    }))
    .sort((a, b) => b.revenue - a.revenue);
  res.json(result);
});

// Orders + revenue per day over the last N days (for line charts)
router.get("/admin/analytics/orders-over-time", requireAdmin, async (req, res) => {
  const orders = await db.select().from(ordersTable);
  const now = new Date();
  const days: { date: string; orders: number; revenue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dEnd = new Date(dStart.getTime() + 86400000);
    const dayOrders = orders.filter(o => {
      const t = new Date(o.createdAt);
      return t >= dStart && t < dEnd;
    });
    days.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      orders: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
    });
  }
  res.json(days);
});

// Customers with order counts and lifetime spend
router.get("/admin/analytics/customers", requireAdmin, async (req, res) => {
  const customers = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.role, "customer"))
    .orderBy(desc(usersTable.createdAt));
  const orders = await db.select().from(ordersTable);
  const agg = new Map<number, { orders: number; totalSpent: number }>();
  for (const o of orders) {
    const cur = agg.get(o.userId) ?? { orders: 0, totalSpent: 0 };
    cur.orders += 1;
    cur.totalSpent += o.total;
    agg.set(o.userId, cur);
  }
  res.json(customers.map(c => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone ?? "",
    orders: agg.get(c.id)?.orders ?? 0,
    totalSpent: agg.get(c.id)?.totalSpent ?? 0,
    createdAt: c.createdAt.toISOString(),
  })));
});

export default router;
