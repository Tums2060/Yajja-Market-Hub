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
import { ShoppingCart, CreditCard, MapPin, Loader2, CheckCircle2, Phone, Navigation, Smartphone, Star, ShieldCheck } from "lucide-react";
import { formatKES, KENYA } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { useSavedLocations } from "@/hooks/use-locations";
import { getCurrentPosition, reverseGeocode } from "@/lib/geocode";
import MapPicker from "@/components/MapPicker";

// Checkout Progress indicator component
function CheckoutSteps({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="w-full max-w-xl mx-auto mb-8 bg-white border border-secondary/10 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center justify-between relative">
        <div className="flex-1 flex flex-col items-center z-10">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
            currentStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            1
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-1.5">Your Cart</span>
        </div>
        <div className={`h-0.5 flex-1 -mx-8 relative -top-3.5 transition-colors ${
          currentStep >= 2 ? "bg-primary" : "bg-secondary/10"
        }`} />
        <div className="flex-1 flex flex-col items-center z-10">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
            currentStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            2
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-foreground mt-1.5">Checkout</span>
        </div>
        <div className={`h-0.5 flex-1 -mx-8 relative -top-3.5 transition-colors ${
          currentStep >= 3 ? "bg-primary" : "bg-secondary/10"
        }`} />
        <div className="flex-1 flex flex-col items-center z-10">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
            currentStep >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            3
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-1.5">Payment</span>
        </div>
      </div>
    </div>
  );
}

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
  const [locating, setLocating] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  const { data: savedLocations = [] } = useSavedLocations(!!user);

  // Pre-fill with the customer's default saved location once.
  React.useEffect(() => {
    if (selectedLocationId === null && savedLocations.length > 0 && !address) {
      const def = savedLocations.find((l) => l.isDefault) ?? savedLocations[0];
      if (def) {
        setSelectedLocationId(def.id);
        setAddress(def.address);
        setDeliveryLat(def.latitude);
        setDeliveryLng(def.longitude);
      }
    }
  }, [savedLocations]);

  const pickSaved = (id: number) => {
    const loc = savedLocations.find((l) => l.id === id);
    if (!loc) return;
    setSelectedLocationId(id);
    setAddress(loc.address);
    setDeliveryLat(loc.latitude);
    setDeliveryLng(loc.longitude);
  };
  const [step, setStep] = useState<"form" | "confirm" | "processing" | "success">("form");
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [primaryOrderId, setPrimaryOrderId] = useState<number | null>(null);
  const [pendingOrderIds, setPendingOrderIds] = useState<number[]>([]);

  const { data: cartData } = useGetCart({ query: { queryKey: getGetCartQueryKey(), enabled: true } });

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

      setStep("confirm");
    } catch (err: any) {
      toast({ variant: "destructive", title: err?.message || "Failed to place order" });
      setStep("form");
    }
  };

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

  const handleUseLocation = async () => {
    setLocating(true);
    try {
      const { lat, lng } = await getCurrentPosition();
      setDeliveryLat(lat);
      setDeliveryLng(lng);
      setSelectedLocationId(null);
      const resolved = await reverseGeocode(lat, lng);
      setAddress(resolved);
      toast({ title: "Location captured", description: resolved });
    } catch (e: any) {
      toast({ variant: "destructive", title: e?.message || "Could not get your location" });
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      {/* Header Banner */}
      <div className="bg-background border-b border-secondary/5 py-6 mb-8">
        <div className="container max-w-4xl mx-auto px-4 flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-secondary/10 text-primary">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Checkout</h1>
            <p className="text-muted-foreground text-xs font-semibold uppercase mt-0.5">{items.length} {items.length === 1 ? "item" : "items"} inside cart</p>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4">
        {/* Checkout Steps */}
        <CheckoutSteps currentStep={step === "success" ? 3 : 2} />

        {step === "success" && (
          <Card className="bg-white border border-secondary/15 rounded-3xl shadow-xs mb-6 max-w-xl mx-auto overflow-hidden">
            <CardContent className="p-6 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <div>
                <p className="font-extrabold text-lg text-foreground">Payment Confirmed!</p>
                <p className="text-muted-foreground text-xs font-medium mt-1">Your order has been forwarded to the vendors.</p>
              </div>
              {orderCode && (
                <div className="bg-secondary/10 px-4 py-2 rounded-xl text-sm font-bold text-foreground w-fit mx-auto">
                  Order Code: <span className="text-primary font-extrabold">{orderCode}</span>
                </div>
              )}
              <Button onClick={() => setLocation(primaryOrderId ? `/orders/${primaryOrderId}` : "/orders")}
                className="w-full h-11 font-bold rounded-xl shadow-xs mt-2"
              >
                Track Order Status
              </Button>
            </CardContent>
          </Card>
        )}

        <Dialog open={step === "confirm" || step === "processing"} onOpenChange={(o) => { if (!o && step === "confirm") setStep("form"); }}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground font-extrabold">
                <Smartphone className="h-5 w-5 text-primary" /> Confirm M-Pesa STK Push
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                {step === "processing"
                  ? "Processing payment..."
                  : `Please check your phone for the M-Pesa pin prompt to confirm transaction of ${formatKES(total)}.`}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-2xl bg-secondary/10 p-4 space-y-2.5">
              <div className="flex justify-between text-xs font-bold text-muted-foreground">
                <span>Phone number</span>
                <span className="text-foreground">{phoneNumber}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-muted-foreground">
                <span>Amount</span>
                <span className="text-foreground">{formatKES(total)}</span>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button variant="outline" disabled={isPlacing} onClick={() => setStep("form")} className="rounded-xl font-bold h-11 text-xs">
                Cancel
              </Button>
              <Button onClick={handleConfirmPayment} disabled={isPlacing} className="rounded-xl font-bold h-11 text-xs">
                {isPlacing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Pay {formatKES(total)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Checkout Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery address Card */}
            <Card className="bg-white border border-secondary/10 rounded-2xl shadow-xs overflow-hidden">
              <CardHeader className="bg-background border-b border-secondary/5 py-4 px-6">
                <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Delivery details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                {savedLocations.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-extrabold text-muted-foreground">Saved Locations</Label>
                    <div className="flex flex-wrap gap-2">
                      {savedLocations.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => pickSaved(loc.id)}
                          className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                            selectedLocationId === loc.id
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-secondary/20 hover:bg-secondary/10 bg-white text-foreground"
                          }`}
                        >
                          {loc.isDefault && <Star className="h-3 w-3 fill-current text-amber-400 text-amber-400" />}
                          <MapPin className="h-3.5 w-3.5" />
                          {loc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-xs font-extrabold text-muted-foreground">Street address</Label>
                  <Input
                    id="address"
                    placeholder={KENYA.addressPlaceholder}
                    value={address}
                    onChange={e => { setAddress(e.target.value); setSelectedLocationId(null); }}
                    className="h-12 bg-white border border-secondary/20 rounded-xl text-foreground placeholder:text-muted-foreground/50 shadow-2xs"
                  />
                  {deliveryLat != null && deliveryLng != null && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                      <MapPin className="h-3.5 w-3.5 text-primary" /> Pinned via GPS ({deliveryLat.toFixed(4)}, {deliveryLng.toFixed(4)})
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-extrabold text-muted-foreground">Order notes (optional)</Label>
                  <Input
                    id="notes"
                    placeholder="E.g. Apartment, block, floor number or delivery directions..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="h-12 bg-white border border-secondary/20 rounded-xl text-foreground placeholder:text-muted-foreground/50 shadow-2xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-extrabold text-muted-foreground">M-Pesa phone number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="07xx xxx xxx"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      className="pl-9 h-12 bg-white border border-secondary/20 rounded-xl text-foreground placeholder:text-muted-foreground/50 shadow-2xs"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2.5 pt-2">
                  <Button variant="outline" className="gap-1.5 rounded-xl font-bold text-xs h-10 border-secondary/25 shadow-2xs" onClick={handleUseLocation} disabled={locating}>
                    {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                    Use current location
                  </Button>
                  <Button variant="outline" className="gap-1.5 rounded-xl font-bold text-xs h-10 border-secondary/25 shadow-2xs" onClick={() => setMapOpen(true)}>
                    <MapPin className="h-3.5 w-3.5" />
                    Pick on map
                  </Button>
                </div>
              </CardContent>
            </Card>

            <MapPicker
              open={mapOpen}
              onOpenChange={setMapOpen}
              lat={deliveryLat}
              lng={deliveryLng}
              onConfirm={(la, ln, addr) => {
                setDeliveryLat(la);
                setDeliveryLng(ln);
                setAddress(addr);
                setSelectedLocationId(null);
              }}
            />

            {/* Cart Items Summary */}
            <Card className="bg-white border border-secondary/10 rounded-2xl shadow-xs overflow-hidden">
              <CardHeader className="bg-background border-b border-secondary/5 py-4 px-6">
                <CardTitle className="text-base font-extrabold text-foreground">Order items</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-secondary/5 p-6 py-0">
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 py-4">
                    <div className="h-12 w-12 bg-secondary/5 rounded-xl shrink-0 overflow-hidden border border-secondary/5">
                      {item.product?.imageUrl
                        ? <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                        : <div className="h-full w-full flex items-center justify-center text-primary/20 font-bold bg-primary/5">{item.product?.name?.charAt(0)}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{item.product?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Quantity: x{item.quantity}</p>
                    </div>
                    <p className="font-extrabold text-sm text-foreground shrink-0">{formatKES((item.product?.price || 0) * item.quantity)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar billing breakdown */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20 bg-white border border-secondary/10 rounded-2xl shadow-xs overflow-hidden">
              <CardHeader className="bg-background border-b border-secondary/5 py-4 px-6">
                <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> Payment details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="flex justify-between text-xs font-bold text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="text-foreground">{formatKES(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-muted-foreground">
                  <span>Delivery fee</span>
                  <span className="text-foreground">{formatKES(deliveryFee)}</span>
                </div>
                <Separator className="bg-secondary/5" />
                <div className="flex justify-between font-extrabold text-lg text-foreground pt-1">
                  <span>Total</span>
                  <span>{formatKES(total)}</span>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-3 p-6 pt-0">
                <Button
                  className="w-full h-12 text-sm font-bold rounded-xl shadow-xs"
                  onClick={handlePlaceOrder}
                  disabled={isPlacing || items.length === 0 || step !== "form"}
                >
                  {isPlacing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirm & Place Order
                </Button>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold justify-center">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                  <span>Secure payment via M-Pesa STK Push</span>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}