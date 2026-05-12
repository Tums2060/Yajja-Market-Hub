import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetGroupCartQueryKey,
  getListGroupMessagesQueryKey,
} from "@workspace/api-client-react";

type GroupCartEvent =
  | { type: "connected"; groupId: number }
  | { type: "cart:update"; groupId: number; actorUserId: number }
  | { type: "message:new"; groupId: number; actorUserId: number };

export function useGroupCartSocket(groupId: number | null, token: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!groupId || !token) return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/api/ws?token=${encodeURIComponent(token)}&groupId=${groupId}`;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let attempt = 0;

    const connect = () => {
      if (stopped) return;
      ws = new WebSocket(url);

      ws.onopen = () => { attempt = 0; };

      ws.onmessage = (ev) => {
        let evt: GroupCartEvent;
        try { evt = JSON.parse(ev.data); } catch { return; }
        if ("groupId" in evt && evt.groupId !== groupId) return;
        if (evt.type === "cart:update") {
          qc.invalidateQueries({ queryKey: getGetGroupCartQueryKey(groupId) });
        } else if (evt.type === "message:new") {
          qc.invalidateQueries({ queryKey: getListGroupMessagesQueryKey(groupId) });
        }
      };

      ws.onclose = () => {
        if (stopped) return;
        attempt += 1;
        const delay = Math.min(1000 * 2 ** attempt, 15000);
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        try { ws?.close(); } catch {}
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { ws?.close(); } catch {}
    };
  }, [groupId, token, qc]);
}
