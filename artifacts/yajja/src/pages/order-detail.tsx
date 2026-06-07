import React, { useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetOrder } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { LiveTrackingMap } from "@/components/LiveTrackingMap";
import { formatEta } from "@/lib/eta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, MapPin, Package, Check } from "lucide-react";
import {
  ORDER_STATUS_COLORS,
  orderStatusLabel,
  ORDER_STEPS,
  orderStepIndex,
} from "@/lib/order-status";

export default function OrderDetail() {
  const { orderId } = useParams();
  const [, setLocation] = useLocation();
  const id = parseInt(orderId || "0", 10);
  useRealtimeOrders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [cancelling, setCancelling] = useState(false);
  const { data: order, isLoading } = useGetOrder(id, { query: { enabled: !!id, refetchInterval: 8000 } });

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const token = localStorage.getItem("yajja_token");
      const res = await fetch(`/api/orders/${id}/cancel`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to cancel order");
      }
      toast({ title: "Order cancelled", description: "Your order has been cancelled." });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries();
    } catch (e: any) {
      toast({ title: "Could not cancel", description: e.message, variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

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
    refetchInterval: 8000,
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

  const eta = useMemo(() => {
    if (
      deliveryLat == null || deliveryLng == null ||
      riderLocation?.lat == null || riderLocation?.lng == null
    ) return null;
    return formatEta(
      { lat: riderLocation.lat, lng: riderLocation.lng },
      { lat: deliveryLat, lng: deliveryLng }
    );
  }, [deliveryLat, deliveryLng, riderLocation?.lat, riderLocation?.lng]);

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

  const status = (order as any).status as string;
  const currentStep = orderStepIndex(status);
  const isTerminal = ["cancelled", "rejected"].includes(status);

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
            <Badge className={`border ${ORDER_STATUS_COLORS[status] || ""}`} variant="outline">
              {orderStatusLabel(status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isTerminal ? (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm font-medium text-red-700">
              This order was {orderStatusLabel(status).toLowerCase()}.
            </div>
          ) : (
            <ol className="mb-4 space-y-3">
              {ORDER_STEPS.map((step, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <li key={step.key} className="flex items-center gap-3">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        done
                          ? "bg-primary text-primary-foreground"
                          : active
                          ? "bg-primary/20 text-primary ring-2 ring-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span
                      className={`text-sm ${
                        done || active ? "font-semibold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {(order as any).deliveryAddress && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>{(order as any).deliveryAddress}</span>
            </div>
          )}
          {(order as any).status === "pending" && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Cancel order
            </Button>
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

      {deliveryLat != null && deliveryLng != null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Live Rider Tracking
              </span>
              {eta && (
                <Badge className="bg-primary/15 text-primary border-primary/30 font-medium">
                  ETA {eta.label}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LiveTrackingMap
              destination={{ lat: deliveryLat, lng: deliveryLng }}
              rider={riderLocation?.lat != null && riderLocation?.lng != null
                ? { lat: riderLocation.lat, lng: riderLocation.lng }
                : null}
              etaLabel={eta ? `ETA ${eta.label}` : null}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {riderLocation?.lat != null
                ? eta
                  ? `🛵 Your rider is about ${eta.label} — arriving soon.`
                  : "🛵 Your rider is on the move — the map updates in real time."
                : "📍 Delivery location pinned. The rider will appear here once they pick up your order."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}