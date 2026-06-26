import React from "react";
import { Link, useLocation } from "wouter";
import { useListOrders } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, ChevronRight, ShoppingBag, MapPin, Compass } from "lucide-react";
import { orderStatusLabel, ORDER_STATUS_COLORS } from "@/lib/order-status";
import { formatKES } from "@/lib/format";

export default function TrackOrders() {
  const { data: orders, isLoading } = useListOrders(undefined, {
    query: { enabled: true, refetchInterval: 5000 } as any,
  });
  const [, setLocation] = useLocation();

  // Live orders are those that are not in a final/terminal state
  const liveOrders = React.useMemo(() => {
    return ((orders as any[]) || []).filter(
      (o) => !["delivered", "cancelled", "rejected"].includes(o.status)
    );
  }, [orders]);

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      {/* Header Banner */}
      <div className="bg-background border-b border-secondary/5 py-6 mb-8">
        <div className="container max-w-2xl mx-auto px-4 flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Track Live Orders</h1>
            <p className="text-muted-foreground text-xs font-semibold uppercase mt-0.5">Real-time status of your active deliveries</p>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : liveOrders.length === 0 ? (
          <Card className="text-center py-16 border border-dashed border-secondary/20 bg-white rounded-3xl p-6 shadow-xs max-w-md mx-auto space-y-4">
            <Compass className="mx-auto h-16 w-16 opacity-25 text-muted-foreground" />
            <div>
              <h2 className="text-xl font-extrabold text-foreground mb-1">No active orders</h2>
              <p className="text-muted-foreground text-sm">You have no current live orders at the moment.</p>
            </div>
            <Button asChild className="h-11 rounded-xl font-bold px-6 shadow-xs">
              <Link href="/shop">Browse Stores</Link>
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {liveOrders.map((order: any) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="group cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-200 bg-white border border-secondary/10 rounded-2xl shadow-xs overflow-hidden">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-secondary/5">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors">
                            Order {order.orderCode || `#${order.id}`}
                          </h3>
                          <p className="text-xs text-muted-foreground font-medium">
                            From: {order.vendorName || "Merchant"}
                          </p>
                        </div>
                      </div>
                      <Badge className={`text-[10px] font-bold border py-0.5 px-2.5 rounded-full ${ORDER_STATUS_COLORS[order.status] || ""}`} variant="outline">
                        {orderStatusLabel(order.status)}
                      </Badge>
                    </div>

                    {/* Progress Bar / Visual Status */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                        <span>Placed</span>
                        <span>Preparing</span>
                        <span>On the Way</span>
                        <span>Delivered</span>
                      </div>
                      <div className="h-2 w-full bg-secondary/15 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{
                            width:
                              order.status === "pending"
                                ? "15%"
                                : ["accepted", "confirmed"].includes(order.status)
                                ? "40%"
                                : ["preparing", "ready"].includes(order.status)
                                ? "70%"
                                : order.status === "picked_up"
                                ? "90%"
                                : "100%",
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-secondary/5 text-xs">
                      <div className="text-muted-foreground font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Placed at {new Date(order.createdAt).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className="flex items-center gap-1 font-extrabold text-primary group-hover:translate-x-0.5 transition-transform">
                        <span>Track Status</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
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
