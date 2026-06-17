import React from "react";
import { useLocation } from "wouter";
import { useListRiderOrders } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Loader2, MapPin, ArrowRight } from "lucide-react";
import { orderStatusLabel, ORDER_STATUS_COLORS } from "@/lib/order-status";
import { formatKES } from "@/lib/format";

export default function RiderDeliveries() {
  const [, setLocation] = useLocation();
  const { data: orders, isLoading } = useListRiderOrders(
    { status: "delivered" } as any,
    { query: { enabled: true, refetchInterval: 15000 } as any }
  );

  const list = (orders as any[]) || [];

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/rider-portal")}>
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-extrabold flex-1">My Deliveries</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <Card className="text-center py-14 border-dashed">
          <Package className="mx-auto h-14 w-14 opacity-20 mb-3" />
          <p className="text-muted-foreground">No completed deliveries yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600 shrink-0">
                  <Package className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">Order {order.orderCode || `#${order.id}`}</p>
                  <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                    {order.vendorName || "Vendor"} <ArrowRight className="h-3 w-3 shrink-0" /> {order.customerName || "Customer"}
                  </p>
                  {order.deliveryAddress && (
                    <div className="flex items-start gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                      <span className="truncate">{order.deliveryAddress}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.createdAt ? new Date(order.createdAt).toLocaleString("en-UG") : "—"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="font-bold text-sm">{formatKES(order.deliveryFee || 0)}</span>
                  <Badge className={`text-xs border ${ORDER_STATUS_COLORS[order.status] || ""}`} variant="outline">
                    {orderStatusLabel(order.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
