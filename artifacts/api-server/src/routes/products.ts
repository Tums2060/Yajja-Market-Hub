import { Router, Request } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";

import { db, dbInsertReturning, productsTable, vendorsTable, foodItemCategoriesTable, foodCategoriesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { CreateProductBody } from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

async function getCategoryIdsForProducts(productIds: number[]): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (productIds.length === 0) return map;
  const rows = await db
    .select()
    .from(foodItemCategoriesTable)
    .where(inArray(foodItemCategoriesTable.foodItemId, productIds));
  for (const r of rows) {
    const arr = map.get(r.foodItemId) ?? [];
    arr.push(r.categoryId);
    map.set(r.foodItemId, arr);
  }
  return map;
}

async function setProductCategories(productId: number, categoryIds: number[], vendorId: number) {
  await db.delete(foodItemCategoriesTable).where(eq(foodItemCategoriesTable.foodItemId, productId));
  if (categoryIds.length > 0) {
    // Only persist categories that actually belong to this vendor — prevents a
    // vendor from attaching another vendor's category IDs to their product.
    const owned = await db
      .select({ id: foodCategoriesTable.id })
      .from(foodCategoriesTable)
      .where(and(eq(foodCategoriesTable.vendorId, vendorId), inArray(foodCategoriesTable.id, categoryIds)));
    const ownedIds = owned.map((o) => o.id);
    if (ownedIds.length > 0) {
      await db.insert(foodItemCategoriesTable).values(
        ownedIds.map((categoryId) => ({ foodItemId: productId, categoryId })),
      );
    }
  }
}

const uploadDir = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      const safeName = `${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}${ext}`;

      cb(null, safeName);
    },
  }),
});

function serializeProduct(
  p: typeof productsTable.$inferSelect,
  vendorName?: string,
  foodCategoryIds: number[] = []
) {
  return {
    ...p,
    vendorName: vendorName || "",
    foodCategoryIds,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/products", async (req, res) => {
  const {
    vendorId,
    category,
    search,
  } = req.query as {
    vendorId?: string;
    category?: string;
    search?: string;
  };

  const rows = await db
    .select({
      product: productsTable,
      vendorName: vendorsTable.name,
    })
    .from(productsTable)
    .leftJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id));

  let filtered = rows;

  if (vendorId) {
    filtered = filtered.filter(
      (r) => r.product.vendorId === parseInt(vendorId)
    );
  }

  if (category) {
    filtered = filtered.filter(
      (r) => r.product.category === category
    );
  }

  if (search) {
    const term = search.toLowerCase();

    filtered = filtered.filter(
      (r) =>
        r.product.name.toLowerCase().includes(term) ||
        (r.product.description || "")
          .toLowerCase()
          .includes(term) ||
        (r.product.tags || "").toLowerCase().includes(term) ||
        (r.product.category || "").toLowerCase().includes(term)
    );
  }

  const catMap = await getCategoryIdsForProducts(filtered.map((r) => r.product.id));

  res.json(
    filtered.map((r) =>
      serializeProduct(r.product, r.vendorName ?? undefined, catMap.get(r.product.id) ?? [])
    )
  );
});

router.post(
  "/uploads/products",
  requireAuth,
  upload.single("image"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({
        message: "No file uploaded",
      });
      return;
    }

    const protocol = req.protocol || "http";
    const host = req.get("host") || "localhost:3000";
    const fullUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    
    res.status(201).json({
      url: fullUrl,
    });
  }
);

router.post("/products", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    const [vendor] = await db
      .select()
      .from(vendorsTable)
      .where(eq(vendorsTable.userId, user.id))
      .limit(1);

    if (!vendor) {
      res.status(403).json({ message: "Vendor profile required" });
      return;
    }

    const parsed = CreateProductBody.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ message: "Invalid body" });
      return;
    }

    const { foodCategoryIds, ...productData } = parsed.data;

    const product = await dbInsertReturning(productsTable, {
      ...productData,
      vendorId: vendor.id,
    });

    const catIds = foodCategoryIds ?? [];
    if (catIds.length > 0) await setProductCategories(product.id, catIds, vendor.id);

    res.status(201).json(serializeProduct(product, vendor.name, catIds));
  } catch (err) {
    req.log.error({ err }, "failed to create product");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get(
  "/products/:productId",
  async (
    req: Request<{ productId: string }>,
    res
  ) => {
    const productId = parseInt(req.params.productId);

    const [row] = await db
      .select({
        product: productsTable,
        vendorName: vendorsTable.name,
      })
      .from(productsTable)
      .leftJoin(
        vendorsTable,
        eq(productsTable.vendorId, vendorsTable.id)
      )
      .where(eq(productsTable.id, productId))
      .limit(1);

    if (!row) {
      res.status(404).json({
        message: "Product not found",
      });

      return;
    }

    const catMap = await getCategoryIdsForProducts([row.product.id]);

    res.json(
      serializeProduct(
        row.product,
        row.vendorName ?? undefined,
        catMap.get(row.product.id) ?? []
      )
    );
  }
);

router.put(
  "/products/:productId",
  requireAuth,
  async (
    req: Request<{ productId: string }>,
    res
  ) => {
    const user = getUser(req);

    const [vendor] = await db
      .select()
      .from(vendorsTable)
      .where(eq(vendorsTable.userId, user.id))
      .limit(1);

    if (!vendor) {
      res.status(403).json({
        message: "Vendor profile required",
      });

      return;
    }

    const productId = parseInt(req.params.productId);

    const [existing] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .limit(1);

    if (!existing || existing.vendorId !== vendor.id) {
      res.status(403).json({
        message: "Not allowed to edit this product",
      });

      return;
    }

    const parsed = CreateProductBody.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid body",
      });

      return;
    }

    const { foodCategoryIds, ...productData } = parsed.data;

    await db
  .update(productsTable)
  .set({
    ...productData,
    vendorId: vendor.id,
  })
  .where(eq(productsTable.id, productId));

const [updatedProduct] = await db
  .select()
  .from(productsTable)
  .where(eq(productsTable.id, productId))
  .limit(1);

if (!updatedProduct) {
  res.status(404).json({
    message: "Product not found",
  });

  return;
}

if (foodCategoryIds !== undefined) {
  await setProductCategories(productId, foodCategoryIds, vendor.id);
}

const catMap = await getCategoryIdsForProducts([productId]);

res.json(
  serializeProduct(updatedProduct, vendor.name, catMap.get(productId) ?? [])
);
  }
);

router.delete(
  "/products/:productId",
  requireAuth,
  async (
    req: Request<{ productId: string }>,
    res
  ) => {
    const user = getUser(req);

    const [vendor] = await db
      .select()
      .from(vendorsTable)
      .where(eq(vendorsTable.userId, user.id))
      .limit(1);

    if (!vendor) {
      res.status(403).json({
        message: "Vendor profile required",
      });

      return;
    }

    const productId = parseInt(req.params.productId);

    const [existing] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .limit(1);

    if (!existing || existing.vendorId !== vendor.id) {
      res.status(403).json({
        message: "Not allowed to delete this product",
      });

      return;
    }

    await db
      .delete(productsTable)
      .where(eq(productsTable.id, productId));

    res.json({
      message: "Product deleted",
    });
  }
);

export default router;