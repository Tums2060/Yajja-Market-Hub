import React, { useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetOrder, useAddToCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { LiveTrackingMap } from "@/components/LiveTrackingMap";
import { formatEta } from "@/lib/eta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, MapPin, Package, Check, Bike, AlertCircle, RotateCcw, ReceiptText } from "lucide-react";
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
  const [reordering, setReordering] = useState(false);
  const addToCart = useAddToCart();
  const { data: order, isLoading } = useGetOrder(id, { query: { enabled: !!id, refetchInterval: 8000 } as any });

  const handleReorder = async () => {
    setReordering(true);
    try {
      const items = (order?.items || []) as any[];
      if (!items.length) throw new Error("No items to reorder");
      for (const item of items) {
        await addToCart.mutateAsync({
          data: {
            productId: item.productId,
            quantity: item.quantity || 1,
            notes: item.notes || undefined,
          },
        } as any);
      }
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast({ title: "Added to cart", description: "All items from this order are back in the cart." });
      setLocation("/cart");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not reorder", description: err.message });
    } finally {
      setReordering(false);
    }
  };

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
      <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
      <p className="text-muted-foreground text-sm font-semibold">Order not found.</p>
      <Button className="mt-4" onClick={() => setLocation("/orders")}>Back to Orders</Button>
    </div>
  );

  const status = (order as any).status as string;
  const currentStep = orderStepIndex(status);
  const isTerminal = ["cancelled", "rejected"].includes(status);
  const isCompleted = ["delivered", "cancelled", "rejected"].includes(status);

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-muted/20 pb-16">
        {/* Header Banner */}
        <div className="bg-background border-b border-secondary/5 py-6 mb-8">
          <div className="container max-w-2xl mx-auto px-4 flex items-center gap-3">
            <Button variant="outline" size="icon" className="rounded-full border-secondary/20 h-10 w-10 bg-white" onClick={() => setLocation("/orders")}>
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </Button>
            <div>
              <h1 className="text-xl font-extrabold text-foreground tracking-tight">Order {orderCode || `#${order.id}`}</h1>
              <p className="text-muted-foreground text-xs font-semibold mt-0.5">
                {(order as any).createdAt ? new Date((order as any).createdAt).toLocaleString("en-UG") : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="container max-w-2xl mx-auto px-4 space-y-6">
          <Card className="bg-white border border-secondary/10 rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="bg-background border-b border-secondary/5 py-4 px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <ReceiptText className="h-5 w-5 text-primary" /> Receipt Summary
                </CardTitle>
                <Badge className={`text-[10px] font-bold border rounded-full py-0.5 px-2.5 ${ORDER_STATUS_COLORS[status] || ""}`} variant="outline">
                  {orderStatusLabel(status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Itemized List */}
              <div className="divide-y divide-secondary/5">
                {itemsByVendor.map(([vendorName, items]) => (
                  <div key={vendorName} className="py-4 first:pt-0 space-y-3">
                    <p className="text-xs font-extrabold text-primary uppercase tracking-wider">{vendorName}</p>
                    {items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-secondary/5 rounded-xl shrink-0 overflow-hidden border border-secondary/5">
                          {item.product?.imageUrl
                            ? <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                            : <div className="h-full w-full flex items-center justify-center text-primary/20 font-bold bg-primary/5 text-lg">{item.productName?.charAt(0) || "P"}</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">{item.productName || item.product?.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Quantity: x{item.quantity}</p>
                          {item.notes && (
                            <span className="inline-block text-[10px] text-primary bg-secondary/10 px-2 py-0.5 rounded-full font-bold mt-1 max-w-full truncate">Note: {item.notes}</span>
                          )}
                        </div>
                        <p className="font-extrabold text-sm text-foreground shrink-0">KES {Math.round((item.product?.price || item.unitPrice || 0) * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <Separator className="bg-secondary/5" />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="text-foreground">KES {Math.round((order as any).subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-muted-foreground">
                  <span>Delivery fee</span>
                  <span className="text-foreground">KES {Math.round((order as any).deliveryFee || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-extrabold text-base text-foreground pt-1 border-t border-secondary/5">
                  <span>Total Paid</span>
                  <span>KES {Math.round((order as any).total || 0).toLocaleString()}</span>
                </div>
              </div>

              <Separator className="bg-secondary/5" />

              {/* Delivery Address */}
              <div className="space-y-1.5">
                <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">Delivery Address</p>
                <div className="flex items-start gap-2 text-sm text-foreground font-semibold">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{(order as any).deliveryAddress}</span>
                </div>
              </div>

              {/* Reorder Button */}
              <Button
                onClick={handleReorder}
                disabled={reordering}
                className="w-full h-12 text-sm font-bold rounded-xl shadow-xs mt-4 flex items-center justify-center gap-2"
              >
                {reordering ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Reorder Items
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      {/* Header Banner */}
      <div className="bg-background border-b border-secondary/5 py-6 mb-8">
        <div className="container max-w-2xl mx-auto px-4 flex items-center gap-3">
          <Button variant="outline" size="icon" className="rounded-full border-secondary/20 h-10 w-10 bg-white" onClick={() => setLocation("/orders")}>
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Button>
          <div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">Order {orderCode || `#${order.id}`}</h1>
            <p className="text-muted-foreground text-xs font-semibold mt-0.5">
              {(order as any).createdAt ? new Date((order as any).createdAt).toLocaleString("en-UG") : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 space-y-6">
        {/* Status Stepper Card */}
        <Card className="bg-white border border-secondary/10 rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="bg-background border-b border-secondary/5 py-4 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-extrabold text-foreground">Delivery Status</CardTitle>
              <Badge className={`text-[10px] font-bold border rounded-full py-0.5 px-2.5 ${ORDER_STATUS_COLORS[status] || ""}`} variant="outline">
                {orderStatusLabel(status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isTerminal ? (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/15 p-4 text-xs font-bold text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>This order was {orderStatusLabel(status).toLowerCase()}.</span>
              </div>
            ) : (
              <div className="relative pl-6 border-l border-secondary/15 space-y-6 mb-6 ml-3">
                {ORDER_STEPS.map((step, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={step.key} className="relative flex items-center gap-3">
                      {/* Step Indicator Dot */}
                      <div
                        className={`absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all shadow-2xs border ${
                          done
                            ? "bg-primary text-primary-foreground border-primary"
                            : active
                            ? "bg-primary/10 text-primary border-primary ring-4 ring-primary/10"
                            : "bg-white text-muted-foreground border-secondary/25"
                        }`}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </div>
                      <span
                        className={`text-sm ${
                          done || active ? "font-extrabold text-foreground" : "font-medium text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Delivery address details */}
            {(order as any).deliveryAddress && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground pt-4 border-t border-secondary/5 font-semibold">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{(order as any).deliveryAddress}</span>
              </div>
            )}

            {(order as any).status === "pending" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-red-600 border-red-200 hover:bg-red-50 rounded-xl font-bold text-xs h-9 cursor-pointer"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin text-red-600" /> : null}
                Cancel Order
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Live Rider tracking map */}
        {deliveryLat != null && deliveryLng != null && (
          <Card className="bg-white border border-secondary/10 rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="bg-background border-b border-secondary/5 py-4 px-6">
              <CardTitle className="text-base font-extrabold text-foreground flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Live Rider Tracking
                </span>
                {eta && (
                  <Badge className="bg-primary/15 text-primary border-primary/25 font-bold text-[10px]">
                    ETA {eta.label}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="rounded-xl overflow-hidden border border-secondary/10 shadow-2xs">
                <LiveTrackingMap
                  destination={{ lat: deliveryLat, lng: deliveryLng }}
                  rider={riderLocation?.lat != null && riderLocation?.lng != null
                    ? { lat: riderLocation.lat, lng: riderLocation.lng }
                    : null}
                  etaLabel={eta ? `ETA ${eta.label}` : null}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5 font-semibold leading-tight">
                {riderLocation?.lat != null
                  ? <Bike className="h-4 w-4 shrink-0 text-primary" />
                  : <MapPin className="h-4 w-4 shrink-0 text-primary" />}
                <span>
                  {riderLocation?.lat != null
                    ? eta
                      ? `Your rider is about ${eta.label} away — arriving soon.`
                      : "Your rider is on the move — the map updates in real time."
                    : "Delivery location pinned. The rider will appear here once they pick up your order."}
                </span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order Items list details card */}
        <Card className="bg-white border border-secondary/10 rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="bg-background border-b border-secondary/5 py-4 px-6">
            <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Items Ordered
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-secondary/5 p-6 py-0">
            {itemsByVendor.map(([vendorName, items]) => (
              <div key={vendorName} className="py-4 space-y-3">
                <p className="text-xs font-extrabold text-primary uppercase tracking-wider">{vendorName}</p>
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-secondary/5 rounded-xl shrink-0 overflow-hidden border border-secondary/5">
                      {item.product?.imageUrl
                        ? <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                        : <div className="h-full w-full flex items-center justify-center text-primary/20 font-bold bg-primary/5 text-lg">{item.productName?.charAt(0) || "P"}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{item.productName || item.product?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Quantity: x{item.quantity}</p>
                      {item.notes && (
                        <span className="inline-block text-[10px] text-primary bg-secondary/10 px-2 py-0.5 rounded-full font-bold mt-1 max-w-full truncate">Note: {item.notes}</span>
                      )}
                    </div>
                    <p className="font-extrabold text-sm text-foreground shrink-0">KES {Math.round((item.product?.price || item.unitPrice || 0) * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ))}
            <div className="py-4 space-y-2">
              <div className="flex justify-between text-xs font-bold text-muted-foreground">
                <span>Delivery fee</span>
                <span className="text-foreground">KES {Math.round((order as any).deliveryFee || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-extrabold text-base text-foreground pt-1">
                <span>Total</span>
                <span>KES {Math.round((order as any).total || 0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}