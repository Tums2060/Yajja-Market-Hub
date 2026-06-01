import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer, IncomingMessage } from "http";
import { db, groupMembersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { verifyToken } from "./auth";
import { logger } from "./logger";

type Client = WebSocket & { userId?: number; groupId?: number };

// Group chat rooms keyed by groupId
const rooms = new Map<number, Set<Client>>();
// Per-user channel keyed by userId (used for realtime order events)
const userClients = new Map<number, Set<Client>>();

export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", async (ws: Client, req: IncomingMessage) => {
    try {
      const url = new URL(req.url || "", "http://localhost");
      const token = url.searchParams.get("token");
      const groupId = parseInt(url.searchParams.get("groupId") || "0", 10);

      if (!token) {
        ws.close(1008, "Missing token");
        return;
      }

      const { userId } = verifyToken(token);
      ws.userId = userId;

      // Attach cleanup BEFORE any await so a disconnect mid-handshake can't
      // leave a stale entry in the registries.
      ws.on("close", () => {
        userClients.get(userId)?.delete(ws);
        if (userClients.get(userId)?.size === 0) userClients.delete(userId);
        if (ws.groupId) {
          rooms.get(ws.groupId)?.delete(ws);
          if (rooms.get(ws.groupId)?.size === 0) rooms.delete(ws.groupId);
        }
      });
      ws.on("error", (err) => logger.warn({ err }, "ws client error"));

      // Always register the per-user channel
      if (!userClients.has(userId)) userClients.set(userId, new Set());
      userClients.get(userId)!.add(ws);

      // Optionally join a group chat room (membership enforced)
      if (groupId) {
        const [membership] = await db.select().from(groupMembersTable)
          .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)))
          .limit(1);
        if (membership) {
          ws.groupId = groupId;
          if (!rooms.has(groupId)) rooms.set(groupId, new Set());
          rooms.get(groupId)!.add(ws);
        } else {
          logger.warn({ userId, groupId }, "ws membership denied");
        }
      }

      ws.send(JSON.stringify({ type: "connected", groupId: ws.groupId ?? null }));
      logger.info({ userId, groupId: ws.groupId ?? null }, "ws client connected");
    } catch (err) {
      logger.warn({ err }, "ws auth failed");
      try { ws.close(1008, "Invalid token"); } catch {}
    }
  });

  logger.info("WebSocket server attached at /api/ws");
}

export function broadcastToGroup(groupId: number, payload: object): void {
  const room = rooms.get(groupId);
  if (!room) return;
  const msg = JSON.stringify(payload);
  for (const ws of room) {
    if (ws.readyState === ws.OPEN) {
      try { ws.send(msg); } catch {}
    }
  }
}

export function broadcastToUser(userId: number, payload: object): void {
  const set = userClients.get(userId);
  if (!set) return;
  const msg = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) {
      try { ws.send(msg); } catch {}
    }
  }
}

export function broadcastToUsers(userIds: number[], payload: object): void {
  const seen = new Set<number>();
  for (const id of userIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    broadcastToUser(id, payload);
  }
}

export function broadcastAll(payload: object): void {
  const msg = JSON.stringify(payload);
  for (const set of userClients.values()) {
    for (const ws of set) {
      if (ws.readyState === ws.OPEN) {
        try { ws.send(msg); } catch {}
      }
    }
  }
}
