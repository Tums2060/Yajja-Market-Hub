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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ShoppingCart, CreditCard, MapPin, Loader2, CheckCircle2, Phone, Navigation, Smartphone } from "lucide-react";
import { formatKES, KENYA } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [step, setStep] = useState<"form" | "confirm" | "processing" | "success">("form");
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [primaryOrderId, setPrimaryOrderId] = useState<number | null>(null);
  const [pendingOrderIds, setPendingOrderIds] = useState<number[]>([]);

  const { data: cartData } = useGetCart({ query: { queryKey: getGetCartQueryKey(), enabled: true } });

  const createOrder = useCreateOrder();
  const items = (cartData as any)?.items || [];
  const subtotal = (cartData as any)?.subtotal || 0;
  const deliveryFee = 200;
  const total = subtotal + deliveryFee;

  const authHeaders = () => {
    const token = localStorage.getItem("yajja_token");
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  // Step 1 — create the order(s) from the cart, then open the payment modal.
  const handlePlaceOrder = async () => {
    if (!address.trim()) {
      toast({ variant: "destructive", title: "Please enter a delivery address" });
      return;
    }
    if (!phoneNumber.trim()) {
      toast({ variant: "destructive", title: "Please enter your phone number" });
      return;
    }

    setStep("processing");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          deliveryAddress: address,
          notes,
          phoneNumber,
          customerName: user?.name,
          deliveryLat: deliveryLat ?? undefined,
          deliveryLng: deliveryLng ?? undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to place order");
      }

      const payload = await res.json();
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      setOrderCode(payload?.orderCode || null);
      setPrimaryOrderId(payload?.primaryOrderId || null);

      const orderIds: number[] = (payload?.orders || [])
        .map((o: any) => o?.id)
        .filter((id: any) => typeof id === "number");
      setPendingOrderIds(orderIds);

      // Open the mock "Confirm Payment" modal.
      setStep("confirm");
    } catch (err: any) {
      toast({ variant: "destructive", title: err?.message || "Failed to place order" });
      setStep("form");
    }
  };

  // Step 2 — mock-confirm payment for the created order(s).
  const handleConfirmPayment = async () => {
    setStep("processing");
    try {
      for (const id of pendingOrderIds) {
        const r = await fetch(`/api/orders/${id}/mock-payment-confirm`, {
          method: "POST",
          headers: authHeaders(),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.message || "Payment failed");
        }
      }
      queryClient.invalidateQueries({ predicate: (q) => JSON.stringify(q.queryKey).toLowerCase().includes("order") });
      toast({ title: "Payment confirmed", description: "Your order has been sent to the vendor." });
      setStep("success");
    } catch (err: any) {
      toast({ variant: "destructive", title: err?.message || "Payment failed" });
      setStep("confirm");
    }
  };

  const isPlacing = step === "processing";

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Geolocation not supported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeliveryLat(pos.coords.latitude);
        setDeliveryLng(pos.coords.longitude);
        toast({ title: "Location captured" });
      },
      () => toast({ variant: "destructive", title: "Could not get your location" })
    );
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-secondary/30 text-primary">
          <ShoppingCart className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-primary">Checkout</h1>
          <p className="text-muted-foreground">{items.length} items</p>
        </div>
      </div>

      {step === "success" && (
        <Card className="bg-white border-secondary/40 mb-6">
          <CardContent className="p-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
            <p className="font-semibold text-lg">Payment confirmed</p>
            {orderCode && (
              <p className="text-sm">Order code: <span className="font-bold">{orderCode}</span></p>
            )}
            <Button onClick={() => setLocation(primaryOrderId ? `/orders/${primaryOrderId}` : "/orders")}
              className="w-full"
            >
              Track Order
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={step === "confirm" || step === "processing"} onOpenChange={(o) => { if (!o && step === "confirm") setStep("form"); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" /> Confirm Payment
            </DialogTitle>
            <DialogDescription>
              {step === "processing"
                ? "Processing your payment..."
                : `Pay ${formatKES(total)} to confirm your order${orderCode ? ` (${orderCode})` : ""}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-secondary/20 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">{phoneNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold">{formatKES(total)}</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" disabled={isPlacing} onClick={() => setStep("form")}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayment} disabled={isPlacing}>
              {isPlacing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pay {formatKES(total)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border-secondary/40">
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
                  className="bg-secondary/20 border-0 shadow-sm text-foreground placeholder:text-foreground/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Order notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="Any special instructions..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="bg-secondary/20 border-0 shadow-sm text-foreground placeholder:text-foreground/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">M-Pesa phone number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="07xx xxx xxx"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="pl-9 bg-secondary/20 border-0 shadow-sm text-foreground placeholder:text-foreground/50"
                  />
                </div>
              </div>
              <Button variant="outline" className="gap-2" onClick={handleUseLocation}>
                <Navigation className="h-4 w-4" /> Use Current Location
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white border-secondary/40">
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
                    <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                  </div>
                  <p className="font-bold shrink-0">{formatKES((item.product?.price || 0) * item.quantity)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-20 bg-white border-secondary/40">
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
            </CardContent>
            <CardFooter>
              <Button
                className="w-full h-12 text-base"
                onClick={handlePlaceOrder}
                disabled={isPlacing || items.length === 0 || step !== "form"}
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