import { Router } from "express";
import { db, dbInsertReturning, dbUpdateReturning, savedLocationsTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

const CreateLocationBody = z.object({
  label: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(500),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});

const UpdateLocationBody = CreateLocationBody.partial();

function serialize(l: typeof savedLocationsTable.$inferSelect) {
  return {
    ...l,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

function fail(res: any, status: number, error: string, code?: string) {
  res.status(status).json({ success: false, error, ...(code ? { code } : {}) });
}

// List all saved locations for the authenticated customer (default first)
router.get("/customer/locations", requireAuth, async (req, res) => {
  const user = getUser(req);
  const rows = await db
    .select()
    .from(savedLocationsTable)
    .where(eq(savedLocationsTable.customerId, user.id))
    .orderBy(desc(savedLocationsTable.isDefault), desc(savedLocationsTable.createdAt));
  res.json(rows.map(serialize));
});

// Create a saved location
router.post("/customer/locations", requireAuth, async (req, res) => {
  const user = getUser(req);
  const parsed = CreateLocationBody.safeParse(req.body);
  if (!parsed.success) {
    fail(res, 400, "Invalid location data", "VALIDATION_ERROR");
    return;
  }
  const { label, address, latitude, longitude, isDefault } = parsed.data;

  const existingCount = await db
    .select()
    .from(savedLocationsTable)
    .where(eq(savedLocationsTable.customerId, user.id));
  // First location for a customer becomes default automatically.
  const makeDefault = isDefault ?? existingCount.length === 0;

  if (makeDefault) {
    await db
      .update(savedLocationsTable)
      .set({ isDefault: false })
      .where(eq(savedLocationsTable.customerId, user.id));
  }

  const created = await dbInsertReturning(savedLocationsTable, {
    customerId: user.id,
    label,
    address,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    isDefault: makeDefault,
  });
  if (!created) {
    fail(res, 500, "Failed to create location", "DB_ERROR");
    return;
  }
  res.status(201).json(serialize(created));
});

// Update a saved location
router.put("/customer/locations/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    fail(res, 400, "Invalid location id", "VALIDATION_ERROR");
    return;
  }
  const parsed = UpdateLocationBody.safeParse(req.body);
  if (!parsed.success) {
    fail(res, 400, "Invalid location data", "VALIDATION_ERROR");
    return;
  }
  const [existing] = await db
    .select()
    .from(savedLocationsTable)
    .where(and(eq(savedLocationsTable.id, id), eq(savedLocationsTable.customerId, user.id)))
    .limit(1);
  if (!existing) {
    fail(res, 404, "Location not found", "NOT_FOUND");
    return;
  }

  const { label, address, latitude, longitude, isDefault } = parsed.data;
  if (isDefault) {
    await db
      .update(savedLocationsTable)
      .set({ isDefault: false })
      .where(eq(savedLocationsTable.customerId, user.id));
  }
  const updated = await dbUpdateReturning(
    savedLocationsTable,
    {
      ...(label !== undefined ? { label } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
      ...(isDefault !== undefined ? { isDefault } : {}),
      updatedAt: new Date(),
    },
    and(eq(savedLocationsTable.id, id), eq(savedLocationsTable.customerId, user.id))!,
  );
  if (!updated) {
    fail(res, 404, "Location not found", "NOT_FOUND");
    return;
  }
  res.json(serialize(updated));
});

// Set a location as default
router.put("/customer/locations/:id/default", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    fail(res, 400, "Invalid location id", "VALIDATION_ERROR");
    return;
  }
  const [existing] = await db
    .select()
    .from(savedLocationsTable)
    .where(and(eq(savedLocationsTable.id, id), eq(savedLocationsTable.customerId, user.id)))
    .limit(1);
  if (!existing) {
    fail(res, 404, "Location not found", "NOT_FOUND");
    return;
  }
  await db
    .update(savedLocationsTable)
    .set({ isDefault: false })
    .where(eq(savedLocationsTable.customerId, user.id));
  const updated = await dbUpdateReturning(
    savedLocationsTable,
    { isDefault: true, updatedAt: new Date() },
    and(eq(savedLocationsTable.id, id), eq(savedLocationsTable.customerId, user.id))!,
  );
  if (!updated) {
    fail(res, 404, "Location not found", "NOT_FOUND");
    return;
  }
  res.json(serialize(updated));
});

// Delete a saved location
router.delete("/customer/locations/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    fail(res, 400, "Invalid location id", "VALIDATION_ERROR");
    return;
  }
  const [existing] = await db
    .select()
    .from(savedLocationsTable)
    .where(and(eq(savedLocationsTable.id, id), eq(savedLocationsTable.customerId, user.id)))
    .limit(1);
  if (!existing) {
    fail(res, 404, "Location not found", "NOT_FOUND");
    return;
  }
  await db
    .delete(savedLocationsTable)
    .where(and(eq(savedLocationsTable.id, id), eq(savedLocationsTable.customerId, user.id)));
  res.json({ success: true });
});

export default router;
