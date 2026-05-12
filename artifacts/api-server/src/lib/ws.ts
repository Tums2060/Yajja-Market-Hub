import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer, IncomingMessage } from "http";
import { db, groupMembersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { verifyToken } from "./auth";
import { logger } from "./logger";

type Client = WebSocket & { userId?: number; groupId?: number };

const rooms = new Map<number, Set<Client>>();

export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", async (ws: Client, req: IncomingMessage) => {
    try {
      const url = new URL(req.url || "", "http://localhost");
      const token = url.searchParams.get("token");
      const groupId = parseInt(url.searchParams.get("groupId") || "0", 10);

      if (!token || !groupId) {
        ws.close(1008, "Missing token or groupId");
        return;
      }

      const { userId } = verifyToken(token);

      // Authz: caller must be a member of the requested group
      const [membership] = await db.select().from(groupMembersTable)
        .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)))
        .limit(1);
      if (!membership) {
        logger.warn({ userId, groupId }, "ws membership denied");
        ws.close(1008, "Forbidden");
        return;
      }

      ws.userId = userId;
      ws.groupId = groupId;

      if (!rooms.has(groupId)) rooms.set(groupId, new Set());
      rooms.get(groupId)!.add(ws);

      ws.on("close", () => {
        rooms.get(groupId)?.delete(ws);
        if (rooms.get(groupId)?.size === 0) rooms.delete(groupId);
      });
      ws.on("error", (err) => logger.warn({ err }, "ws client error"));

      ws.send(JSON.stringify({ type: "connected", groupId }));
      logger.info({ userId, groupId }, "ws client connected");
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
