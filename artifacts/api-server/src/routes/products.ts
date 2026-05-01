import { Router } from "express";
import { db, productsTable, vendorsTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import { CreateProductBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router = Router();

function serializeProduct(p: typeof productsTable.$inferSelect, vendorName?: string) {
  return { ...p, vendorName: vendorName || "", createdAt: p.createdAt.toISOString() };
}

router.get("/products", async (req, res) => {
  const { vendorId, category, search } = req.query as { vendorId?: string; category?: string; search?: string };
  const rows = await db.select({
    product: productsTable,
    vendorName: vendorsTable.name,
  }).from(productsTable).leftJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id));

  let filtered = rows;
  if (vendorId) filtered = filtered.filter(r => r.product.vendorId === parseInt(vendorId));
  if (category) filtered = filtered.filter(r => r.product.category === category);
  if (search) filtered = filtered.filter(r => r.product.name.toLowerCase().includes(search.toLowerCase()));

  res.json(filtered.map(r => serializeProduct(r.product, r.vendorName ?? undefined)));
});

router.post("/products", requireAuth, async (req, res) => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const [product] = await db.insert(productsTable).values(parsed.data).returning();
  res.status(201).json(serializeProduct(product));
});

router.get("/products/:productId", async (req, res) => {
  const productId = parseInt(req.params.productId);
  const [row] = await db.select({ product: productsTable, vendorName: vendorsTable.name })
    .from(productsTable)
    .leftJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(eq(productsTable.id, productId))
    .limit(1);
  if (!row) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  res.json(serializeProduct(row.product, row.vendorName ?? undefined));
});

router.put("/products/:productId", requireAuth, async (req, res) => {
  const productId = parseInt(req.params.productId);
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const [product] = await db.update(productsTable).set(parsed.data).where(eq(productsTable.id, productId)).returning();
  if (!product) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  res.json(serializeProduct(product));
});

router.delete("/products/:productId", requireAuth, async (req, res) => {
  const productId = parseInt(req.params.productId);
  await db.delete(productsTable).where(eq(productsTable.id, productId));
  res.json({ message: "Product deleted" });
});

export default router;
