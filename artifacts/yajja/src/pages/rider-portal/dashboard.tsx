import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useListRiderOrders, usePickupOrder, useDeliverOrder, getListRiderOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bike, LogOut, MapPin, Package, Loader2, CheckCircle } from "lucide-react";

const statusColor: Record<string, string> = {
  confirmed: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  preparing: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  out_for_delivery: "bg-purple-500/15 text-purple-700 border-purple-500/30",
  delivered: "bg-green-500/15 text-green-700 border-green-500/30",
};

export default function RiderPortal() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useListRiderOrders({ query: { enabled: true } });

  const pickup = usePickupOrder();
  const deliver = useDeliverOrder();

  const handlePickup = (orderId: number) => {
    pickup.mutate({ orderId } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRiderOrdersQueryKey() });
        toast({ title: "Order picked up! Head to the customer." });
      },
      onError: () => toast({ variant: "destructive", title: "Failed to pick up" })
    });
  };

  const handleDeliver = (orderId: number) => {
    deliver.mutate({ orderId } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRiderOrdersQueryKey() });
        toast({ title: "Order delivered! Great job." });
      },
      onError: () => toast({ variant: "destructive", title: "Failed to mark delivered" })
    });
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
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => { logout(); setLocation("/login"); }}>
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground font-medium mb-1">Active Orders</p>
            <p className="text-4xl font-extrabold">
              {(orders as any[])?.filter(o => o.status === "out_for_delivery").length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground font-medium mb-1">Delivered Today</p>
            <p className="text-4xl font-extrabold">
              {(orders as any[])?.filter(o => o.status === "delivered").length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-bold">Assigned Orders</h2>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !(orders as any[])?.length ? (
        <Card className="text-center py-14 border-dashed">
          <Package className="mx-auto h-14 w-14 opacity-20 mb-3" />
          <p className="text-muted-foreground">No assigned orders yet</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {(orders as any[]).map(order => (
            <Card key={order.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Order #{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.customerName} • KES {Math.round(order.totalAmount || 0).toLocaleString()}</p>
                    {order.deliveryAddress && (
                      <div className="flex items-start gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                        {order.deliveryAddress}
                      </div>
                    )}
                  </div>
                  <Badge className={`text-xs border ${statusColor[order.status] || ""}`} variant="outline">
                    {order.status?.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {order.status === "preparing" && (
                    <Button className="flex-1" size="sm" onClick={() => handlePickup(order.id)} disabled={pickup.isPending}>
                      <Package className="mr-2 h-4 w-4" /> Pick Up Order
                    </Button>
                  )}
                  {order.status === "out_for_delivery" && (
                    <Button className="flex-1 bg-green-600 hover:bg-green-700" size="sm" onClick={() => handleDeliver(order.id)} disabled={deliver.isPending}>
                      <CheckCircle className="mr-2 h-4 w-4" /> Mark Delivered
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
