import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListOrders,
  useAddToCart,
  getGetCartQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Loader2, ChevronRight, Clock, RotateCcw } from "lucide-react";
import { orderStatusLabel, ORDER_STATUS_COLORS } from "@/lib/order-status";

export default function Orders() {
  const { data: orders, isLoading } = useListOrders({ query: { enabled: true, refetchInterval: 8000 } });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const addToCart = useAddToCart();
  const [reorderingId, setReorderingId] = useState<number | null>(null);

  const handleReorder = async (e: React.MouseEvent, orderId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setReorderingId(orderId);
    try {
      const token = localStorage.getItem("yajja_token");
      const res = await fetch(`/api/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load order");
      const detail = await res.json();
      const items = (detail.items || []) as any[];
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
      toast({ title: "Added to cart", description: "Items from your order are back in the cart." });
      setLocation("/cart");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not reorder", description: err.message });
    } finally {
      setReorderingId(null);
    }
  };

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
                    <Badge className={`text-xs border ${ORDER_STATUS_COLORS[order.status] || ""}`} variant="outline">
                      {orderStatusLabel(order.status)}
                    </Badge>
                    {["delivered", "cancelled", "rejected"].includes(order.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={(e) => handleReorder(e, order.id)}
                        disabled={reorderingId === order.id}
                      >
                        {reorderingId === order.id ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3 mr-1" />
                        )}
                        Reorder
                      </Button>
                    )}
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
