import React from "react";
import { Link } from "wouter";
import { useListOrders } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Loader2, ChevronRight, Clock } from "lucide-react";

const statusColor: Record<string, string> = {
  pending: "bg-secondary/30 text-amber-800 border-secondary/50",
  accepted: "bg-primary/15 text-primary border-primary/30",
  confirmed: "bg-primary/15 text-primary border-primary/30",
  preparing: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  ready: "bg-primary/10 text-primary border-primary/20",
  picked_up: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  delivered: "bg-green-500/15 text-green-700 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-700 border-red-500/30",
  rejected: "bg-red-500/15 text-red-700 border-red-500/30",
};

export default function Orders() {
  const { data: orders, isLoading } = useListOrders({ query: { enabled: true, refetchInterval: 5000 } });

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-extrabold tracking-tight text-primary">My Orders</h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !orders?.length ? (
        <Card className="text-center py-16 border-dashed bg-white border-secondary/40">
          <ShoppingBag className="mx-auto h-16 w-16 opacity-20 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
          <p className="text-muted-foreground mb-6">Your order history will appear here.</p>
          <Button asChild><Link href="/shop">Start Shopping</Link></Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-all bg-white border-secondary/40">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-secondary/30 flex items-center justify-center text-primary shrink-0">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Order {order.orderCode || `#${order.id}`}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {order.vendorName || "Your order"} • {order.itemCount || 0} items
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="font-bold">KES {Math.round(order.total || 0).toLocaleString()}</p>
                    <Badge className={`text-xs border ${statusColor[order.status] || ""}`} variant="outline">
                      {order.status?.replace(/_/g, " ") || "pending"}
                    </Badge>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
