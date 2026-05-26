import React, { useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useGetOrder } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, MapPin, Package } from "lucide-react";

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

const statusSteps = ["pending", "accepted", "preparing", "ready", "picked_up", "delivered"];

export default function OrderDetail() {
  const { orderId } = useParams();
  const [, setLocation] = useLocation();
  const id = parseInt(orderId || "0", 10);
  const { data: order, isLoading } = useGetOrder(id, { query: { enabled: !!id, refetchInterval: 10000 } });

  const orderCode = (order as any)?.orderCode as string | undefined;
  const { data: bundleOrders } = useQuery({
    queryKey: ["orders", "code", orderCode],
    queryFn: async () => {
      const token = localStorage.getItem("yajja_token");
      const res = await fetch(`/api/orders?orderCode=${encodeURIComponent(orderCode || "")}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!res.ok) throw new Error("Failed to load order bundle");
      return res.json();
    },
    enabled: !!orderCode,
    refetchInterval: 10000,
  });

  const orders = ((bundleOrders as any[])?.length ? bundleOrders : order ? [order] : []) as any[];

  const itemsByVendor = useMemo(() => {
    const map = new Map<string, any[]>();
    orders.forEach((o) => {
      const vendorKey = o.vendorName || `Vendor ${o.vendorId}`;
      if (!map.has(vendorKey)) map.set(vendorKey, []);
      (o.items || []).forEach((item: any) => map.get(vendorKey)!.push(item));
    });
    return Array.from(map.entries());
  }, [orders]);

  const deliveryLat = orders[0]?.deliveryLat;
  const deliveryLng = orders[0]?.deliveryLng;
  const riderLocation = orders.find((o) => o.riderLocation)?.riderLocation;

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!order) return (
    <div className="container max-w-2xl mx-auto py-12 px-4 text-center">
      <p className="text-muted-foreground">Order not found.</p>
      <Button className="mt-4" onClick={() => setLocation("/orders")}>Back to Orders</Button>
    </div>
  );

  const currentStep = statusSteps.indexOf((order as any).status);

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setLocation("/orders")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold">Order {orderCode || `#${order.id}`}</h1>
          <p className="text-sm text-muted-foreground">
            {(order as any).createdAt ? new Date((order as any).createdAt).toLocaleString("en-UG") : "—"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status</CardTitle>
            <Badge className={`border ${statusColor[(order as any).status] || ""}`} variant="outline">
              {(order as any).status?.replace(/_/g, " ") || "pending"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!(order as any).status || !["cancelled", "rejected"].includes((order as any).status) && (
            <div className="flex items-center gap-1 mb-4">
              {statusSteps.map((step, i) => (
                <div key={step} className={`flex-1 h-2 rounded-full transition-all ${i <= currentStep ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          )}
          {(order as any).deliveryAddress && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>{(order as any).deliveryAddress}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {itemsByVendor.map(([vendorName, items]) => (
            <div key={vendorName} className="space-y-3">
              <p className="text-sm font-semibold text-primary">{vendorName}</p>
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-muted rounded-lg shrink-0 overflow-hidden">
                    {item.product?.imageUrl
                      ? <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                      : <div className="h-full w-full flex items-center justify-center text-muted-foreground font-bold text-lg">{item.productName?.charAt(0) || "P"}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.productName || item.product?.name}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground italic">Note: {item.notes}</p>
                    )}
                  </div>
                  <p className="font-bold shrink-0">KES {Math.round((item.product?.price || item.unitPrice || 0) * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ))}
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery fee</span>
            <span>KES {Math.round((order as any).deliveryFee || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>KES {Math.round((order as any).total || 0).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {deliveryLat && deliveryLng && riderLocation?.lat && riderLocation?.lng && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Rider Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl overflow-hidden border">
              <iframe
                title="Delivery tracking"
                className="w-full h-64"
                src={`https://maps.google.com/maps?daddr=${deliveryLat},${deliveryLng}&saddr=${riderLocation.lat},${riderLocation.lng}&z=14&output=embed`}
                loading="lazy"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}