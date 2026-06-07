import { Router, Request } from "express";
import { db, dbInsertReturning, foodCategoriesTable, foodItemCategoriesTable, vendorsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateFoodCategoryBody } from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

function serialize(c: typeof foodCategoriesTable.$inferSelect) {
  return { ...c, createdAt: c.createdAt.toISOString() };
}

async function getVendorForUser(userId: number) {
  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.userId, userId))
    .limit(1);
  return vendor;
}

router.get(
  "/vendors/:vendorId/food-categories",
  async (req: Request<{ vendorId: string }>, res) => {
    const vendorId = parseInt(req.params.vendorId);
    const rows = await db
      .select()
      .from(foodCategoriesTable)
      .where(eq(foodCategoriesTable.vendorId, vendorId));
    res.json(rows.map(serialize));
  }
);

router.post("/vendor/food-categories", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);
    const vendor = await getVendorForUser(user.id);
    if (!vendor) {
      res.status(403).json({ message: "Vendor profile required" });
      return;
    }

    const parsed = CreateFoodCategoryBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid body" });
      return;
    }

    const created = await dbInsertReturning(foodCategoriesTable, {
      vendorId: vendor.id,
      name: parsed.data.name.trim(),
    });

    res.status(201).json(serialize(created));
  } catch (err) {
    req.log.error({ err }, "failed to create food category");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete(
  "/vendor/food-categories/:categoryId",
  requireAuth,
  async (req: Request<{ categoryId: string }>, res) => {
    try {
      const user = getUser(req);
      const vendor = await getVendorForUser(user.id);
      if (!vendor) {
        res.status(403).json({ message: "Vendor profile required" });
        return;
      }

      const categoryId = parseInt(req.params.categoryId);
      const [existing] = await db
        .select()
        .from(foodCategoriesTable)
        .where(eq(foodCategoriesTable.id, categoryId))
        .limit(1);

      if (!existing || existing.vendorId !== vendor.id) {
        res.status(403).json({ message: "Not allowed to delete this category" });
        return;
      }

      await db
        .delete(foodItemCategoriesTable)
        .where(eq(foodItemCategoriesTable.categoryId, categoryId));
      await db
        .delete(foodCategoriesTable)
        .where(eq(foodCategoriesTable.id, categoryId));

      res.json({ message: "Category deleted" });
    } catch (err) {
      req.log.error({ err }, "failed to delete food category");
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
