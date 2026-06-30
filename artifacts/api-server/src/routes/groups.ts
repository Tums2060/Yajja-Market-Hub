import { Router } from "express";
import { db, dbInsertReturning, dbUpdateReturning, groupsTable, groupMembersTable, groupMessagesTable, invitesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateGroupBody, SendGroupMessageBody, SendInviteBody } from "@workspace/api-zod";
import { requireAuth, getUser } from "../lib/auth";
import { broadcastToGroup } from "../lib/ws";

const router = Router();

async function enrichGroup(group: typeof groupsTable.$inferSelect) {
  const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, group.id));
  const [admin] = await db.select().from(usersTable).where(eq(usersTable.id, group.adminId)).limit(1);
  return {
    ...group,
    adminName: admin?.name || "",
    memberCount: members.length,
    createdAt: group.createdAt.toISOString(),
  };
}

// Groups
router.get("/groups", requireAuth, async (req, res) => {
  const user = getUser(req);
  const memberships = await db.select().from(groupMembersTable).where(eq(groupMembersTable.userId, user.id));
  const groups = await Promise.all(memberships.map(m => db.select().from(groupsTable).where(eq(groupsTable.id, m.groupId)).limit(1).then(r => r[0])));
  const valid = groups.filter(Boolean) as typeof groupsTable.$inferSelect[];
  const enriched = await Promise.all(valid.map(enrichGroup));
  res.json(enriched);
});

router.post("/groups", requireAuth, async (req, res) => {
  const user = getUser(req);
  const parsed = CreateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const group = await dbInsertReturning(groupsTable, { ...parsed.data, adminId: user.id });

  // Add admin as member
  await db.insert(groupMembersTable).values({ groupId: group.id, userId: user.id, isAdmin: true });

  res.status(201).json(await enrichGroup(group));
});

router.get("/groups/:groupId", requireAuth, async (req, res) => {
  const groupId = parseInt(String(req.params.groupId), 10);
  const user = getUser(req);

  // Authz: Only group members or admin can view group details
  if (user.role !== "admin" && user.role !== "super_admin") {
    const [member] = await db.select()
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, user.id)))
      .limit(1);
    if (!member) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
  }

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
  if (!group) {
    res.status(404).json({ message: "Group not found" });
    return;
  }
  res.json(await enrichGroup(group));
});

router.get("/groups/:groupId/members", requireAuth, async (req, res) => {
  const groupId = parseInt(String(req.params.groupId), 10);
  const user = getUser(req);

  // Authz: Only group members or admin can list group members
  if (user.role !== "admin" && user.role !== "super_admin") {
    const [member] = await db.select()
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, user.id)))
      .limit(1);
    if (!member) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
  }

  const members = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, groupId));
  const enriched = await Promise.all(members.map(async (m) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId)).limit(1);
    return {
      ...m,
      userName: user?.name || "",
      userEmail: user?.email || "",
      avatarUrl: user?.avatarUrl,
      joinedAt: m.joinedAt.toISOString(),
    };
  }));
  res.json(enriched);
});

router.delete("/groups/:groupId/members/:userId", requireAuth, async (req, res) => {
  const groupId = parseInt(String(req.params.groupId), 10);
  const userId = parseInt(String(req.params.userId), 10);
  const user = getUser(req);

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
  if (!group) {
    res.status(404).json({ message: "Group not found" });
    return;
  }

  // Authz: Only the group admin, the user leaving themselves, or platform admin can remove a member
  const isGroupAdmin = group.adminId === user.id;
  const isSelf = userId === user.id;
  const isPlatformAdmin = user.role === "admin" || user.role === "super_admin";

  if (!isGroupAdmin && !isSelf && !isPlatformAdmin) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  await db.delete(groupMembersTable).where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)));
  res.json({ message: "Member removed" });
});

// Messages
router.get("/groups/:groupId/messages", requireAuth, async (req, res) => {
  const groupId = parseInt(String(req.params.groupId), 10);
  const user = getUser(req);

  // Authz: Only group members or admin can view group messages
  if (user.role !== "admin" && user.role !== "super_admin") {
    const [member] = await db.select()
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, user.id)))
      .limit(1);
    if (!member) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
  }

  const limit = parseInt((req.query.limit as string) || "50");
  const messages = await db.select().from(groupMessagesTable)
    .where(eq(groupMessagesTable.groupId, groupId))
    .limit(limit);

  const enriched = await Promise.all(messages.map(async (m) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId)).limit(1);
    return {
      ...m,
      userName: user?.name || "Unknown",
      avatarUrl: user?.avatarUrl,
      createdAt: m.createdAt.toISOString(),
    };
  }));
  res.json(enriched);
});

router.post("/groups/:groupId/messages", requireAuth, async (req, res) => {
  const groupId = parseInt(String(req.params.groupId), 10);
  const user = getUser(req);

  // Authz: Only group members or admin can post messages
  if (user.role !== "admin" && user.role !== "super_admin") {
    const [member] = await db.select()
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, user.id)))
      .limit(1);
    if (!member) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
  }

  const parsed = SendGroupMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const message = await dbInsertReturning(groupMessagesTable, { groupId, userId: user.id, content: parsed.data.content });
  broadcastToGroup(groupId, { type: "message:new", groupId, actorUserId: user.id });
  res.status(201).json({
    ...message,
    userName: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: message.createdAt.toISOString(),
  });
});

// Invites
router.get("/invites", requireAuth, async (req, res) => {
  const user = getUser(req);
  const invites = await db.select().from(invitesTable).where(and(eq(invitesTable.toUserId, user.id), eq(invitesTable.status, "pending")));
  const enriched = await Promise.all(invites.map(async (inv) => {
    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, inv.groupId)).limit(1);
    const [fromUser] = await db.select().from(usersTable).where(eq(usersTable.id, inv.fromUserId)).limit(1);
    return {
      ...inv,
      groupName: group?.name || "",
      fromUserName: fromUser?.name || "",
      createdAt: inv.createdAt.toISOString(),
    };
  }));
  res.json(enriched);
});

router.post("/invites", requireAuth, async (req, res) => {
  const user = getUser(req);
  const parsed = SendInviteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const invite = await dbInsertReturning(invitesTable, { groupId: parsed.data.groupId, fromUserId: user.id, toUserId: parsed.data.toUserId, status: "pending" });
  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, invite.groupId)).limit(1);
  res.status(201).json({
    ...invite,
    groupName: group?.name || "",
    fromUserName: user.name,
    createdAt: invite.createdAt.toISOString(),
  });
});

router.post("/invites/:inviteId/accept", requireAuth, async (req, res) => {
  const inviteId = parseInt(String(req.params.inviteId), 10);
  const user = getUser(req);
  const invite = await dbUpdateReturning(invitesTable, { status: "accepted" }, eq(invitesTable.id, inviteId));
  if (!invite) {
    res.status(404).json({ message: "Invite not found" });
    return;
  }

  // Anti-fraud: limit each user to max 5 active groups
  const userMemberships = await db.select().from(groupMembersTable).where(eq(groupMembersTable.userId, user.id));
  if (userMemberships.length >= 5) {
    res.status(400).json({ message: "You can only be in up to 5 groups at a time. Leave a group to join a new one." });
    return;
  }

  // Add to group
  const [existing] = await db.select().from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, invite.groupId), eq(groupMembersTable.userId, user.id))).limit(1);
  if (!existing) {
    await db.insert(groupMembersTable).values({ groupId: invite.groupId, userId: user.id, isAdmin: false });
  }

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, invite.groupId)).limit(1);
  res.json(await enrichGroup(group!));
});

router.post("/invites/:inviteId/decline", requireAuth, async (req, res) => {
  const inviteId = parseInt(String(req.params.inviteId), 10);
  await db.update(invitesTable).set({ status: "declined" }).where(eq(invitesTable.id, inviteId));
  res.json({ message: "Invite declined" });
});

export default router;
