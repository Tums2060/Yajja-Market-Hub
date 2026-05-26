import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  useAssignRider,
  useListRiderOrders,
  usePickupOrder,
  useDeliverOrder,
  getListRiderOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bike, LogOut, MapPin, Package, Loader2 } from "lucide-react";

const statusColor: Record<string, string> = {
  accepted: "bg-primary/15 text-primary border-primary/30",
  preparing: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  ready: "bg-primary/10 text-primary border-primary/20",
  picked_up: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  delivered: "bg-green-500/15 text-green-700 border-green-500/30",
};

export default function RiderPortal() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeCode, setActiveCode] = useState<string | null>(null);

  const { data: orders, isLoading } = useListRiderOrders({ query: { enabled: true } });
  const assignRider = useAssignRider();
  const pickup = usePickupOrder();
  const deliver = useDeliverOrder();

  const { data: riderProfile } = useQuery({
    queryKey: ["rider", "me"],
    queryFn: async () => {
      const token = localStorage.getItem("yajja_token");
      const res = await fetch("/api/riders/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load rider profile");
      return res.json();
    },
  });

  const bundles = useMemo(() => {
    const items = (orders as any[]) || [];
    const map = new Map<string, any[]>();
    items.forEach((order) => {
      const code = order.orderCode || String(order.id);
      if (!map.has(code)) map.set(code, []);
      map.get(code)!.push(order);
    });
    return Array.from(map.entries()).map(([code, bundleOrders]) => {
      const vendors = bundleOrders.map((o) => o.vendorName).filter(Boolean);
      const status = bundleOrders.some((o) => o.status === "picked_up") ? "picked_up" : bundleOrders[0]?.status;
      return {
        code,
        orders: bundleOrders,
        vendors,
        status,
        customerName: bundleOrders[0]?.customerName,
        customerPhone: bundleOrders[0]?.customerPhone,
        deliveryAddress: bundleOrders[0]?.deliveryAddress,
      };
    });
  }, [orders]);

  const activeBundle = bundles.find((b) => b.code === activeCode) || null;
  const allPickedUp = activeBundle?.orders.every((o: any) => o.status === "picked_up") || false;

  const handleAccept = (bundleCode: string, orderList: any[]) => {
    if (!riderProfile?.id) {
      toast({ variant: "destructive", title: "Rider profile missing" });
      return;
    }
    orderList.forEach((order) => {
      assignRider.mutate({ orderId: order.id, data: { riderId: riderProfile.id } } as any, {
        onError: () => toast({ variant: "destructive", title: "Failed to accept order" }),
      });
    });
    setActiveCode(bundleCode);
    queryClient.invalidateQueries({ queryKey: getListRiderOrdersQueryKey() });
    toast({ title: "Order accepted" });
  };

  const handlePickup = (orderId: number) => {
    pickup.mutate({ orderId } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRiderOrdersQueryKey() });
        toast({ title: "Pickup confirmed" });
      },
      onError: () => toast({ variant: "destructive", title: "Failed to confirm pickup" })
    });
  };

  const handleDeliverAll = (orderIds: number[]) => {
    orderIds.forEach((orderId) => {
      deliver.mutate({ orderId } as any, {
        onError: () => toast({ variant: "destructive", title: "Failed to mark delivered" })
      });
    });
    queryClient.invalidateQueries({ queryKey: getListRiderOrdersQueryKey() });
    toast({ title: "Delivery completed" });
    setActiveCode(null);
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Bike className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Rider Portal</h1>
            <p className="text-sm text-muted-foreground">{user?.name}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => { logout(); setLocation("/rider/login"); }}>
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>

      {activeBundle ? (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <p className="font-semibold">Order {activeBundle.code}</p>
              <p className="text-sm text-muted-foreground">{activeBundle.customerName} • {activeBundle.customerPhone}</p>
              {activeBundle.deliveryAddress && (
                <div className="flex items-start gap-1 mt-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                  {activeBundle.deliveryAddress}
                </div>
              )}
            </div>
            <div className="space-y-3">
              {activeBundle.orders.map((order: any, index: number) => (
                <div key={order.id} className="border rounded-lg p-3">
                  <p className="font-medium">Stop {index + 1}: {order.vendorName}</p>
                  <Button
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => handlePickup(order.id)}
                    disabled={order.status === "picked_up" || pickup.isPending}
                  >
                    {order.status === "picked_up" ? "Picked Up" : `Picked up from ${order.vendorName}`}
                  </Button>
                </div>
              ))}
            </div>
            <Button
              className="w-full"
              onClick={() => handleDeliverAll(activeBundle.orders.map((o: any) => o.id))}
              disabled={deliver.isPending || !allPickedUp}
            >
              Deliver to Customer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <h2 className="text-lg font-bold">Available Orders</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : bundles.length === 0 ? (
            <Card className="text-center py-14 border-dashed">
              <Package className="mx-auto h-14 w-14 opacity-20 mb-3" />
              <p className="text-muted-foreground">No orders available</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {bundles.map((bundle) => (
                <Card key={bundle.code}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Order {bundle.code}</p>
                        <p className="text-sm text-muted-foreground">
                          Pickup from: {bundle.vendors.join(" + ")}
                        </p>
                        {bundle.deliveryAddress && (
                          <div className="flex items-start gap-1 mt-1 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                            {bundle.deliveryAddress}
                          </div>
                        )}
                      </div>
                      <Badge className={`text-xs border ${statusColor[bundle.status] || ""}`} variant="outline">
                        {bundle.status?.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1" size="sm" onClick={() => handleAccept(bundle.code, bundle.orders)}>
                        Accept Job
                      </Button>
                      <Button className="flex-1" size="sm" variant="outline">
                        Skip
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
