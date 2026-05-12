import React from "react";
import { useParams, useLocation } from "wouter";
import { useGetOrder } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, MapPin, Package } from "lucide-react";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  confirmed: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  preparing: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  out_for_delivery: "bg-purple-500/15 text-purple-700 border-purple-500/30",
  delivered: "bg-green-500/15 text-green-700 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-700 border-red-500/30",
};

const statusSteps = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"];

export default function OrderDetail() {
  const { orderId } = useParams();
  const [, setLocation] = useLocation();
  const id = parseInt(orderId || "0", 10);
  const { data: order, isLoading } = useGetOrder(id, { query: { enabled: !!id } });

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

  const currentStep = statusSteps.indexOf((order as any).status);

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setLocation("/orders")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-extrabold">Order #{order.id}</h1>
          <p className="text-sm text-muted-foreground">
            {(order as any).createdAt ? new Date((order as any).createdAt).toLocaleString("en-UG") : "—"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status</CardTitle>
            <Badge className={`border ${statusColor[(order as any).status] || ""}`} variant="outline">
              {(order as any).status?.replace(/_/g, " ") || "pending"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {(order as any).status !== "cancelled" && (
            <div className="flex items-center gap-1 mb-4">
              {statusSteps.map((step, i) => (
                <div key={step} className={`flex-1 h-2 rounded-full transition-all ${i <= currentStep ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          )}
          {(order as any).deliveryAddress && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>{(order as any).deliveryAddress}</span>
            </div>
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
          {((order as any).items || []).map((item: any) => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="h-14 w-14 bg-muted rounded-lg shrink-0 overflow-hidden">
                {item.product?.imageUrl
                  ? <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                  : <div className="h-full w-full flex items-center justify-center text-muted-foreground font-bold text-lg">{item.product?.name?.charAt(0) || "P"}</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.product?.name}</p>
                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
              </div>
              <p className="font-bold shrink-0">KES {Math.round((item.product?.price || item.unitPrice || 0) * item.quantity).toLocaleString()}</p>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery fee</span>
            <span>KES {Math.round((order as any).deliveryFee || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>KES {Math.round((order as any).totalAmount || 0).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}