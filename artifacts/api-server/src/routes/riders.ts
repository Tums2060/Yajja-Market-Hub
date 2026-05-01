import { Router } from "express";
import { db, riderProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterRiderBody, UpdateRiderLocationBody } from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

function serializeRider(r: typeof riderProfilesTable.$inferSelect) {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

router.post("/riders/register", requireAuth, async (req, res) => {
  const user = getUser(req);
  const parsed = RegisterRiderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const [existing] = await db.select().from(riderProfilesTable).where(eq(riderProfilesTable.userId, user.id)).limit(1);
  if (existing) {
    res.status(409).json({ message: "Rider profile already exists" });
    return;
  }
  const [rider] = await db.insert(riderProfilesTable).values({ userId: user.id, ...parsed.data }).returning();
  res.status(201).json(serializeRider(rider));
});

router.get("/riders/me", requireAuth, async (req, res) => {
  const user = getUser(req);
  const [rider] = await db.select().from(riderProfilesTable).where(eq(riderProfilesTable.userId, user.id)).limit(1);
  if (!rider) {
    res.status(404).json({ message: "Rider profile not found" });
    return;
  }
  res.json(serializeRider(rider));
});

router.put("/riders/me", requireAuth, async (req, res) => {
  const user = getUser(req);
  const parsed = UpdateRiderLocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const updateData: Partial<typeof riderProfilesTable.$inferInsert> = { currentLat: parsed.data.lat, currentLng: parsed.data.lng };
  if (parsed.data.isAvailable !== undefined) updateData.isAvailable = parsed.data.isAvailable;
  const [rider] = await db.update(riderProfilesTable).set(updateData)
    .where(eq(riderProfilesTable.userId, user.id)).returning();
  if (!rider) {
    res.status(404).json({ message: "Rider profile not found" });
    return;
  }
  res.json(serializeRider(rider));
});

export default router;
