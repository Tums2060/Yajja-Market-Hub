import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

/**
 * Subscribes to the server WebSocket and invalidates order/rider related
 * React Query caches whenever a realtime order event arrives. Falls back
 * silently to the existing polling intervals when the socket is unavailable.
 */
export function useRealtimeOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("yajja_token");
    if (!token) return;

    let closed = false;
    let reconnectTimer: number | undefined;

    const invalidate = () => {
      queryClient.invalidateQueries({
        predicate: (q) => {
          const k = JSON.stringify(q.queryKey).toLowerCase();
          return k.includes("order") || k.includes("rider");
        },
      });
    };

    const connect = () => {
      if (closed) return;
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      let ws: WebSocket;
      try {
        ws = new WebSocket(`${proto}://${window.location.host}/api/ws?token=${encodeURIComponent(token)}`);
      } catch {
        reconnectTimer = window.setTimeout(connect, 4000);
        return;
      }
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (!msg?.type || msg.type === "connected") return;
          if (msg.type === "notification") {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            const n = msg.notification;
            if (n?.title) {
              toast({ title: n.title, description: n.body });
            }
          }
          invalidate();
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onclose = () => {
        if (closed) return;
        reconnectTimer = window.setTimeout(connect, 4000);
      };
      ws.onerror = () => {
        try { ws.close(); } catch {}
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      try { wsRef.current?.close(); } catch {}
    };
  }, [queryClient, toast]);
}
