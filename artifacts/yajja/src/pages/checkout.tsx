import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetCart, useCreateOrder,
  getGetCartQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, CreditCard, MapPin, Loader2 } from "lucide-react";
import { formatKES, KENYA } from "@/lib/format";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const { data: cartData } = useGetCart({ query: { enabled: true } });

  const createOrder = useCreateOrder();
  const items = (cartData as any)?.items || [];
  const subtotal = (cartData as any)?.subtotal || 0;
  const deliveryFee = 200;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = () => {
    if (!address.trim()) {
      toast({ variant: "destructive", title: "Please enter a delivery address" });
      return;
    }
    createOrder.mutate({ data: { deliveryAddress: address, notes } } as any, {
      onSuccess: (order: any) => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        toast({ title: "Order placed successfully!" });
        setLocation(`/orders/${order.id}`);
      },
      onError: () => toast({ variant: "destructive", title: "Failed to place order" })
    });
  };

  const isPlacing = createOrder.isPending;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-[#FFF1B8] text-[#2E2A7B]">
          <ShoppingCart className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[#2E2A7B]">Checkout</h1>
          <p className="text-[#2E2A7B]/60">{items.length} items</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border-[#F2D98B]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#2E2A7B]" /> Delivery Address
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
                  className="bg-[#FFF7DA] border-0 shadow-sm text-[#2E2A7B] placeholder:text-[#2E2A7B]/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Order notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="Any special instructions..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="bg-[#FFF7DA] border-0 shadow-sm text-[#2E2A7B] placeholder:text-[#2E2A7B]/50"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#F2D98B]">
            <CardHeader>
              <CardTitle className="text-base">Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-muted rounded-lg shrink-0 overflow-hidden">
                    {item.product?.imageUrl
                      ? <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                      : <div className="h-full w-full flex items-center justify-center text-[#2E2A7B]/50 font-bold">{item.product?.name?.charAt(0)}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product?.name}</p>
                    <p className="text-xs text-[#2E2A7B]/60">x{item.quantity}</p>
                  </div>
                  <p className="font-bold shrink-0">{formatKES((item.product?.price || 0) * item.quantity)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-20 bg-white border-[#F2D98B]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#2E2A7B]" /> Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#2E2A7B]/60">Subtotal</span>
                <span>{formatKES(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#2E2A7B]/60">Delivery fee</span>
                <span>{formatKES(deliveryFee)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatKES(total)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full h-12 text-base bg-[#F8D84E] text-[#2E2A7B] hover:bg-[#F2D98B]"
                onClick={handlePlaceOrder}
                disabled={isPlacing || items.length === 0}
              >
                {isPlacing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Place Order
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}