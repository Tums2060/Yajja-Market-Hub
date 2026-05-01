import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...out } = user;
  return { ...out, createdAt: out.createdAt.toISOString() };
}

router.get("/users", requireAuth, async (req, res) => {
  const search = req.query.search as string | undefined;
  let users;
  if (search) {
    users = await db.select().from(usersTable).where(
      or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`))
    ).limit(20);
  } else {
    users = await db.select().from(usersTable).limit(50);
  }
  res.json(users.map(sanitizeUser));
});

router.get("/users/:userId", requireAuth, async (req, res) => {
  const userId = parseInt(req.params.userId);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  res.json(sanitizeUser(user));
});

export default router;
