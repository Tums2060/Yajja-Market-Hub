import { Router } from "express";
import { db, vendorsTable, ordersTable } from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { CreateVendorBody, UpdateVendorBody } from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";
import { z } from "zod";

const router = Router();

export const payoutMethodSchema = z.object({
  type: z.enum(["till", "paybill", "pochi", "send_money"]),
  accountNumber: z.string(),
  paybillAccountRef: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.type === "till") {
    if (!/^\d{6}$/.test(data.accountNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Till number must be exactly 6 digits",
        path: ["accountNumber"],
      });
    }
  } else if (data.type === "paybill") {
    if (!/^\d{5,6}$/.test(data.accountNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Paybill business number must be 5 or 6 digits",
        path: ["accountNumber"],
      });
    }
    if (!data.paybillAccountRef || data.paybillAccountRef.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Account reference is required for Paybill payouts",
        path: ["paybillAccountRef"],
      });
    }
  } else if (data.type === "pochi" || data.type === "send_money") {
    if (!/^(07|01)\d{8}$/.test(data.accountNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone number must be a valid Kenyan mobile number (starts with 07 or 01, 10 digits total)",
        path: ["accountNumber"],
      });
    }
  }
});

function serializeVendor(v: typeof vendorsTable.$inferSelect) {
  return {
    ...v,
    createdAt: v.createdAt.toISOString(),
  };
}

router.get("/vendors", async (req, res) => {
  const {
    category,
    search,
  } = req.query as {
    category?: string;
    search?: string;
  };

  let query = db.select().from(vendorsTable).$dynamic();

  const conditions = [];

  if (category) {
    conditions.push(eq(vendorsTable.category, category as any));
  }

  if (search) {
    conditions.push(
      ilike(vendorsTable.name, `%${search}%`)
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const vendors = await query;

  res.json(vendors.map(serializeVendor));
});

router.get("/vendors/popular", async (req, res) => {
  const limit = parseInt(String(req.query.limit ?? "")) || 10;

  const counts = await db
    .select({ vendorId: ordersTable.vendorId, count: sql<number>`count(*)` })
    .from(ordersTable)
    .groupBy(ordersTable.vendorId);

  const countMap = new Map(counts.map((c) => [c.vendorId, Number(c.count)]));

  const vendors = await db.select().from(vendorsTable);

  const withCounts = vendors
    .map((v) => ({ ...serializeVendor(v), orderCount: countMap.get(v.id) ?? 0 }))
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, limit);

  res.json(withCounts);
});

router.put("/vendors/me", requireAuth, async (req, res) => {
  const parsed = UpdateVendorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }

  if (parsed.data.payoutMethod) {
    const payoutResult = payoutMethodSchema.safeParse(parsed.data.payoutMethod);
    if (!payoutResult.success) {
      res.status(400).json({ message: "Invalid payout method details", errors: payoutResult.error.format() });
      return;
    }
  }

  const user = getUser(req);
  const [existing] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.userId, user.id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ message: "Vendor profile not found" });
    return;
  }

  const { category, ...rest } = parsed.data;
  await db
    .update(vendorsTable)
    .set({ ...rest, ...(category ? { category: category as any } : {}) })
    .where(eq(vendorsTable.id, existing.id));

  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.id, existing.id))
    .limit(1);

  res.json(serializeVendor(vendor));
});

router.get("/vendors/me", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    let [vendor] = await db
      .select()
      .from(vendorsTable)
      .where(eq(vendorsTable.userId, user.id))
      .limit(1);

    if (!vendor) {
      if (user.role === "vendor") {
        await db.insert(vendorsTable).values({
          userId: user.id,
          name: user.name,
          category: "food",
        });

        [vendor] = await db
          .select()
          .from(vendorsTable)
          .where(eq(vendorsTable.userId, user.id))
          .limit(1);
      } else {
        res.status(404).json({
          message: "Vendor profile not found",
        });
        return;
      }
    }

    res.json(serializeVendor(vendor));
  } catch (err) {
    res.status(500).json({
      message: "Internal server error",
      error: String(err),
    });
  }
});

router.post("/vendors", requireAuth, async (req, res) => {
  const parsed = CreateVendorBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid body",
    });
    return;
  }

  if (parsed.data.payoutMethod) {
    const payoutResult = payoutMethodSchema.safeParse(parsed.data.payoutMethod);
    if (!payoutResult.success) {
      res.status(400).json({ message: "Invalid payout method details", errors: payoutResult.error.format() });
      return;
    }
  }

  const user = getUser(req);

  await db.insert(vendorsTable).values({
    ...parsed.data,
    userId: user.id,
    category: parsed.data.category as any,
  });

  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.userId, user.id))
    .limit(1);

  res.status(201).json(serializeVendor(vendor));
});

router.get("/vendors/:vendorId", async (req, res) => {
  const vendorId = parseInt(req.params.vendorId);

  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId))
    .limit(1);

  if (!vendor) {
    res.status(404).json({
      message: "Vendor not found",
    });
    return;
  }

  res.json(serializeVendor(vendor));
});

router.put("/vendors/:vendorId", requireAuth, async (req, res) => {
  const user = getUser(req);
  const vendorId = parseInt(String(req.params.vendorId), 10);

  const parsed = UpdateVendorBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid body",
    });
    return;
  }

  if (parsed.data.payoutMethod) {
    const payoutResult = payoutMethodSchema.safeParse(parsed.data.payoutMethod);
    if (!payoutResult.success) {
      res.status(400).json({ message: "Invalid payout method details", errors: payoutResult.error.format() });
      return;
    }
  }

  const [existing] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId))
    .limit(1);

  if (!existing) {
    res.status(404).json({
      message: "Vendor not found",
    });
    return;
  }

  // Authorization check: Only the vendor owner or admin can update details
  if (existing.userId !== user.id && user.role !== "admin" && user.role !== "super_admin") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  await db
    .update(vendorsTable)
    .set(parsed.data)
    .where(eq(vendorsTable.id, vendorId));

  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId))
    .limit(1);

  res.json(serializeVendor(vendor));
});

router.get("/vendors/:vendorId/stats", requireAuth, async (req, res) => {
  const user = getUser(req);
  const vendorId = parseInt(String(req.params.vendorId), 10);

  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId))
    .limit(1);

  if (!vendor) {
    res.status(404).json({ message: "Vendor not found" });
    return;
  }

  // Authorization check: Only the vendor owner or admin can view stats
  if (vendor.userId !== user.id && user.role !== "admin" && user.role !== "super_admin") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const allOrders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.vendorId, vendorId));

  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());

  const todayOrders = allOrders.filter(
    (o) => new Date(o.createdAt) >= todayStart
  );

  const weekOrders = allOrders.filter(
    (o) => new Date(o.createdAt) >= weekStart
  );

  const pendingOrders = allOrders.filter(
    (o) =>
      o.status === "pending" ||
      o.status === "accepted" ||
      o.status === "confirmed" ||
      o.status === "preparing" ||
      o.status === "ready"
  );

  const todayRevenue = todayOrders.reduce(
    (s, o) => s + o.total,
    0
  );

  const weekRevenue = weekOrders.reduce(
    (s, o) => s + o.total,
    0
  );

  const totalRevenue = allOrders.reduce(
    (s, o) => s + o.total,
    0
  );

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const ordersThisWeek = dayNames.map((day, i) => {
    const dayOrders = weekOrders.filter(
      (o) => new Date(o.createdAt).getDay() === i
    );

    return {
      day,
      count: dayOrders.length,
      revenue: dayOrders.reduce(
        (s, o) => s + o.total,
        0
      ),
    };
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