import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListVendorOrders, useUpdateOrderStatus, getListVendorOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ShoppingBag, Loader2, ChevronRight } from "lucide-react";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  confirmed: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  preparing: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  out_for_delivery: "bg-purple-500/15 text-purple-700 border-purple-500/30",
  delivered: "bg-green-500/15 text-green-700 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-700 border-red-500/30",
};

const nextStatus: Record<string, string> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "out_for_delivery",
};

export default function VendorOrders() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: orders, isLoading } = useListVendorOrders(
    filterStatus !== "all" ? { status: filterStatus } : {},
    { query: { enabled: true } }
  );

  const updateStatus = useUpdateOrderStatus();

  const handleAdvance = (orderId: number, currentStatus: string) => {
    const next = nextStatus[currentStatus];
    if (!next) return;
    updateStatus.mutate({ orderId, data: { status: next } } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorOrdersQueryKey() });
        toast({ title: `Order marked as ${next.replace(/_/g, " ")}` });
      },
      onError: () => toast({ variant: "destructive", title: "Failed to update status" })
    });
  };

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setLocation("/vendor-portal")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-extrabold flex-1">Orders</h1>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !orders?.length ? (
        <Card className="text-center py-14 border-dashed">
          <ShoppingBag className="mx-auto h-14 w-14 opacity-20 mb-3" />
          <p className="text-muted-foreground">No orders found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {(orders as any[]).map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-semibold">Order #{order.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customerName} • {order.itemCount} items • ${order.totalAmount?.toFixed(0)}
                    </p>
                    {order.deliveryAddress && (
                      <p className="text-xs text-muted-foreground mt-1">📍 {order.deliveryAddress}</p>
                    )}
                  </div>
                  <Badge className={`text-xs border ${statusColor[order.status] || ""}`} variant="outline">
                    {order.status?.replace(/_/g, " ")}
                  </Badge>
                </div>
                {nextStatus[order.status] && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleAdvance(order.id, order.status)}
                    disabled={updateStatus.isPending}
                  >
                    Mark as {nextStatus[order.status]?.replace(/_/g, " ")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
