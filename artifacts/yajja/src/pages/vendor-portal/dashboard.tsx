import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetVendorStats, useListVendorOrders } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Package, TrendingUp, Star, LogOut, ChevronRight } from "lucide-react";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  confirmed: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  preparing: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  out_for_delivery: "bg-purple-500/15 text-purple-700 border-purple-500/30",
  delivered: "bg-green-500/15 text-green-700 border-green-500/30",
};

export default function VendorPortal() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const { data: orders } = useListVendorOrders({ status: "pending" }, { query: { enabled: true } });
  const pendingOrders = (orders || []).slice(0, 5);

  const handleLogout = () => { logout(); setLocation("/login"); };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Vendor Portal</h1>
          <p className="text-muted-foreground">{user?.name}</p>
        </div>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-600">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Pending Orders</p>
            </div>
            <p className="text-4xl font-extrabold">{(orders || []).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Star className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Rating</p>
            </div>
            <p className="text-4xl font-extrabold">4.8</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button asChild className="h-14 text-base" variant="outline">
          <Link href="/vendor-portal/orders">
            <ShoppingBag className="mr-2 h-5 w-5" /> All Orders
          </Link>
        </Button>
        <Button asChild className="h-14 text-base">
          <Link href="/vendor-portal/products">
            <Package className="mr-2 h-5 w-5" /> Products
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">Recent Pending Orders</h2>
        {!pendingOrders.length ? (
          <Card className="text-center py-10 border-dashed">
            <ShoppingBag className="mx-auto h-10 w-10 opacity-20 mb-2" />
            <p className="text-muted-foreground">No pending orders</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {pendingOrders.map((order: any) => (
              <Link key={order.id} href={`/vendor-portal/orders`}>
                <Card className="cursor-pointer hover:border-primary/30 transition-all">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">Order #{order.id}</p>
                      <p className="text-xs text-muted-foreground">{order.customerName} • {order.itemCount} items</p>
                    </div>
                    <Badge className={`text-xs border ${statusColor[order.status] || ""}`} variant="outline">
                      {order.status?.replace(/_/g, " ")}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
