import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/notifications", requireAuth, async (req, res) => {
  const user = getUser(req);
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.id))
    .limit(50);
  const items = rows.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }));
  const unreadCount = items.filter((n) => !n.read).length;
  res.json({ items, unreadCount });
});

router.post("/notifications/:id/read", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = parseInt(String(req.params.id), 10);
  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)));
  res.json({ ok: true });
});

router.post("/notifications/read-all", requireAuth, async (req, res) => {
  const user = getUser(req);
  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.userId, user.id));
  res.json({ ok: true });
});

export default router;
