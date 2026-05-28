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

const nextStatus: Record<string, string> = {
  pending: "accepted",
  accepted: "preparing",
  confirmed: "preparing",
  preparing: "ready",
};

export default function VendorOrders() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: orders, isLoading } = useListVendorOrders(
    filterStatus !== "all" ? { status: filterStatus } : {},
    { query: { enabled: true, refetchInterval: 5000 } }
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

  const handleReject = (orderId: number) => {
    updateStatus.mutate({ orderId, data: { status: "rejected" } } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorOrdersQueryKey() });
        toast({ title: "Order rejected" });
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
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="picked_up">Picked Up</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
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
                    <p className="font-semibold">Order {order.orderCode || `#${order.id}`}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.customerName || "Customer"} • {order.customerPhone || "No phone"}
                    </p>
                    {order.deliveryAddress && (
                      <p className="text-xs text-muted-foreground mt-1">📍 {order.deliveryAddress}</p>
                    )}
                  </div>
                  <Badge className={`text-xs border ${statusColor[order.status] || ""}`} variant="outline">
                    {order.status?.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {(order.items || []).map((item: any) => (
                    <div key={item.id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-muted-foreground">x{item.quantity}</span>
                      </div>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground italic">Note: {item.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  {order.status === "pending" && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAdvance(order.id, order.status)}
                      disabled={updateStatus.isPending}
                    >
                      Accept Order
                    </Button>
                  )}
                  {order.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-destructive"
                      onClick={() => handleReject(order.id)}
                      disabled={updateStatus.isPending}
                    >
                      Reject
                    </Button>
                  )}
                  {order.status !== "pending" && nextStatus[order.status] && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleAdvance(order.id, order.status)}
                      disabled={updateStatus.isPending}
                    >
                      Mark as {nextStatus[order.status]?.replace(/_/g, " ")}
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
