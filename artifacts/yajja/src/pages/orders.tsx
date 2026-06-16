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
import { formatKES } from "@/lib/format";

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
    <div className="min-h-screen bg-muted/20 pb-16">
      {/* Header Banner */}
      <div className="bg-background border-b border-secondary/5 py-6 mb-8">
        <div className="container max-w-2xl mx-auto px-4 flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-secondary/10 text-primary">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">My Orders</h1>
            <p className="text-muted-foreground text-xs font-semibold uppercase mt-0.5">Your order delivery history</p>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !orders?.length ? (
          <Card className="text-center py-16 border border-dashed border-secondary/20 bg-white rounded-3xl p-6 shadow-xs max-w-md mx-auto space-y-4">
            <ShoppingBag className="mx-auto h-16 w-16 opacity-25 text-muted-foreground" />
            <div>
              <h2 className="text-xl font-extrabold text-foreground mb-1">No orders yet</h2>
              <p className="text-muted-foreground text-sm">Your order history will appear here once you place your first order.</p>
            </div>
            <Button asChild className="h-11 rounded-xl font-bold px-6 shadow-xs">
              <Link href="/shop">Start Shopping</Link>
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order: any) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="group cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-200 bg-white border border-secondary/10 rounded-2xl shadow-xs overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Icon */}
                    <div className="h-12 w-12 rounded-xl bg-secondary/5 flex items-center justify-center text-primary shrink-0 border border-secondary/5">
                      <ShoppingBag className="h-6 w-6" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        Order {order.orderCode || `#${order.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate font-medium">
                        {order.vendorName || "Your order"} • {order.itemCount || 0} items
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 text-muted-foreground font-semibold text-[10px]">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Meta/Price/Status */}
                    <div className="flex flex-col items-end gap-2.5 shrink-0">
                      <p className="font-extrabold text-sm text-foreground">{formatKES(order.total || 0)}</p>
                      <Badge className={`text-[10px] font-bold border py-0.5 px-2.5 rounded-full ${ORDER_STATUS_COLORS[order.status] || ""}`} variant="outline">
                        {orderStatusLabel(order.status)}
                      </Badge>
                      {["delivered", "cancelled", "rejected"].includes(order.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] font-bold border-secondary/20 shadow-2xs rounded-lg px-2.5 cursor-pointer hover:bg-secondary/5"
                          onClick={(e) => handleReorder(e, order.id)}
                          disabled={reorderingId === order.id}
                        >
                          {reorderingId === order.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin text-primary" />
                          ) : (
                            <RotateCcw className="h-3 w-3 mr-1" />
                          )}
                          Reorder
                        </Button>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
