import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  useGetCart, useGetGroupCart, useCreateOrder, useCreateGroupOrder,
  useGetBillAssignments, useSubmitBillAssignment,
  getGetCartQueryKey, getGetGroupCartQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Users, CreditCard, MapPin, Loader2 } from "lucide-react";
import { formatKES, KENYA } from "@/lib/format";

export default function Checkout() {
  const { activeMode } = useAuth();
  const isGroupMode = activeMode !== "individual";
  const groupId = isGroupMode ? (activeMode as number) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const { data: individualCart } = useGetCart({ query: { enabled: !isGroupMode } });
  const { data: groupCart } = useGetGroupCart(groupId, { query: { enabled: isGroupMode } });

  const createOrder = useCreateOrder();
  const createGroupOrder = useCreateGroupOrder();

  const cartData = isGroupMode ? groupCart : individualCart;
  const items = (cartData as any)?.items || [];
  const subtotal = (cartData as any)?.subtotal || 0;
  const deliveryFee = 200;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = () => {
    if (!address.trim()) {
      toast({ variant: "destructive", title: "Please enter a delivery address" });
      return;
    }

    if (isGroupMode) {
      createGroupOrder.mutate({ data: { groupId, deliveryAddress: address, notes } } as any, {
        onSuccess: (order: any) => {
          queryClient.invalidateQueries({ queryKey: getGetGroupCartQueryKey(groupId) });
          toast({ title: "Group order placed!", description: "Each member needs to confirm their share." });
          setLocation(`/orders/${order.id}`);
        },
        onError: () => toast({ variant: "destructive", title: "Failed to place order" })
      });
    } else {
      createOrder.mutate({ data: { deliveryAddress: address, notes } } as any, {
        onSuccess: (order: any) => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast({ title: "Order placed successfully!" });
          setLocation(`/orders/${order.id}`);
        },
        onError: () => toast({ variant: "destructive", title: "Failed to place order" })
      });
    }
  };

  const isPlacing = createOrder.isPending || createGroupOrder.isPending;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className={`p-3 rounded-xl ${isGroupMode ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"}`}>
          {isGroupMode ? <Users className="h-6 w-6" /> : <ShoppingCart className="h-6 w-6" />}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{isGroupMode ? "Group Checkout" : "Checkout"}</h1>
          <p className="text-muted-foreground">{items.length} items</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street address</Label>
                <Input
                  id="address"
                  placeholder={KENYA.addressPlaceholder}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Order notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="Any special instructions..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {isGroupMode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-secondary" /> Bill Split Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {((groupCart as any)?.memberSummary || []).map((m: any) => (
                  <div key={m.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary text-xs font-bold">
                        {m.userName?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="font-medium">{m.userName}</span>
                    </div>
                    <Badge variant="outline">{formatKES(m.subtotal)}</Badge>
                  </div>
                ))}
                {(groupCart as any)?.memberSummary?.length === 0 && (
                  <p className="text-sm text-muted-foreground">Each member's individual items will be calculated separately.</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-muted rounded-lg shrink-0 overflow-hidden">
                    {item.product?.imageUrl
                      ? <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                      : <div className="h-full w-full flex items-center justify-center text-muted-foreground font-bold">{item.product?.name?.charAt(0)}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product?.name}</p>
                    {isGroupMode && <p className="text-xs text-secondary">{item.userName}</p>}
                    <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                  </div>
                  <p className="font-bold shrink-0">{formatKES((item.product?.price || 0) * item.quantity)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" /> Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatKES(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery fee</span>
                <span>{formatKES(deliveryFee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatKES(total)}</span>
              </div>
              {isGroupMode && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  Each member pays their own items + share of delivery
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full h-12 text-base"
                onClick={handlePlaceOrder}
                disabled={isPlacing || items.length === 0}
              >
                {isPlacing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {isGroupMode ? "Place Group Order" : "Place Order"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}