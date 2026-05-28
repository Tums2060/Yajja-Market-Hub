import { Router, Request } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";

import { db, productsTable, vendorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateProductBody } from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

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
  vendorName?: string
) {
  return {
    ...p,
    vendorName: vendorName || "",
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
          .includes(term)
    );
  }

  res.json(
    filtered.map((r) =>
      serializeProduct(r.product, r.vendorName ?? undefined)
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

    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
    });
  }
);

router.post("/products", requireAuth, async (req, res) => {
  try {
    const user = getUser(req);

    console.log(
      "[PRODUCTS POST] User ID:",
      user.id,
      "Role:",
      user.role
    );

    console.log(
      "[PRODUCTS POST] Request body:",
      req.body
    );

    const [vendor] = await db
      .select()
      .from(vendorsTable)
      .where(eq(vendorsTable.userId, user.id))
      .limit(1);

    console.log(
      "[PRODUCTS POST] Found vendor:",
      vendor
    );

    if (!vendor) {
      console.log(
        "[PRODUCTS POST] No vendor found, returning 403"
      );

      res.status(403).json({
        message: "Vendor profile required",
      });

      return;
    }

    const parsed = CreateProductBody.safeParse(req.body);

    if (!parsed.success) {
      console.log(
        "[PRODUCTS POST] Invalid body:",
        parsed.error
      );

      res.status(400).json({
        message: "Invalid body",
      });

      return;
    }

    console.log(
      "[PRODUCTS POST] Creating product with vendorId:",
      vendor.id
    );

    await db.insert(productsTable).values({
      ...parsed.data,
      vendorId: vendor.id,
    });

    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.name, parsed.data.name))
      .limit(1);

    console.log(
      "[PRODUCTS POST] Created product:",
      product
    );

    res.status(201).json(
      serializeProduct(product)
    );
  } catch (err) {
    console.error(
      "[PRODUCTS POST] ERROR:",
      err
    );

    res.status(500).json({
      message: "Internal server error",
      error: String(err),
    });
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

    res.json(
      serializeProduct(
        row.product,
        row.vendorName ?? undefined
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

    await db
  .update(productsTable)
  .set({
    ...parsed.data,
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

res.json(
  serializeProduct(updatedProduct)
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