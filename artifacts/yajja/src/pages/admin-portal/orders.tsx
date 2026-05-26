import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, Search, Loader2 } from "lucide-react";

function useAdminOrders() {
  return useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => customFetch("/api/admin/orders").then(r => r.json()),
    refetchInterval: 15000,
  });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  accepted: "bg-blue-100 text-blue-700 border-blue-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  preparing: "bg-violet-100 text-violet-700 border-violet-200",
  ready: "bg-cyan-100 text-cyan-700 border-cyan-200",
  picked_up: "bg-orange-100 text-orange-700 border-orange-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_LIST = ["all", "pending", "accepted", "preparing", "ready", "picked_up", "delivered", "cancelled", "rejected"];

export default function AdminOrders() {
  const { data: orders, isLoading } = useAdminOrders();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const list = (orders as any[] || []).filter((o: any) => {
    const matchSearch = !search || String(o.id).includes(search) || o.deliveryAddress?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const byStatus = (s: string) => (orders as any[] || []).filter((o: any) => o.status === s).length;

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" /> Order Monitoring
        </h1>
        <p className="text-muted-foreground text-sm">Platform-wide order tracking</p>
      </div>

      {/* Status summary chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {STATUS_LIST.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filterStatus === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-foreground hover:border-primary/30"
            }`}
          >
            {s === "all" ? `All (${(orders as any[] || []).length})` : `${s.replace("_", " ")} (${byStatus(s)})`}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by order ID or address..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="mx-auto h-12 w-12 opacity-20 mb-4" />
          <p>No orders found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((order: any) => (
            <Card key={order.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">Order {order.orderCode || `#${order.id}`}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLES[order.status] || "bg-muted text-muted-foreground border-border"}`}>
                      {order.status.replace("_", " ")}
                    </span>
                    {order.riderId && <Badge variant="outline" className="text-xs">Rider #{order.riderId}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {order.deliveryAddress} · {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">KES {Number(order.total).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">User #{order.userId}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
