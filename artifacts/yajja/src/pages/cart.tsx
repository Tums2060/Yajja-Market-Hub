import React from "react";
import { useLocation } from "wouter";
import { 
  useGetCart, 
  useUpdateCartItem, 
  useRemoveCartItem,
  getGetCartQueryKey
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Minus, Loader2, ShoppingCart, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatKES } from "@/lib/format";

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
          <span className="text-[10px] sm:text-xs font-bold text-foreground mt-1.5">Your Cart</span>
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
          <span className="text-[10px] sm:text-xs font-bold text-muted-foreground mt-1.5">Checkout</span>
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

export default function Cart() {
  useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: cartData, isLoading } = useGetCart();

  const updateItemMutation = useUpdateCartItem();
  const removeItemMutation = useRemoveCartItem();
  const items = (cartData as any)?.items || [];
  const subtotal = (cartData as any)?.subtotal || 0;

  const invalidateCart = () => {
    queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
  };

  const handleUpdateQuantity = (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(cartItemId);
      return;
    }

    updateItemMutation.mutate(
      { cartItemId, data: { quantity: newQuantity } },
      {
        onSuccess: () => invalidateCart(),
        onError: () => toast({ variant: "destructive", title: "Could not update quantity" }),
      }
    );
  };

  const handleRemoveItem = (cartItemId: number) => {
    removeItemMutation.mutate(
      { cartItemId },
      {
        onSuccess: () => {
          invalidateCart();
          toast({ title: "Item removed" });
        },
        onError: () => toast({ variant: "destructive", title: "Could not remove item" }),
      }
    );
  };

  const updatingItemId =
    (updateItemMutation.isPending && (updateItemMutation.variables as any)?.cartItemId) ||
    (removeItemMutation.isPending && (removeItemMutation.variables as any)?.cartItemId) ||
    null;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      {/* Header Banner */}
      <div className="bg-background border-b border-secondary/5 py-6 mb-8">
        <div className="container max-w-4xl mx-auto px-4 flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-secondary/10 text-primary">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Your Cart</h1>
            <p className="text-muted-foreground text-xs font-semibold uppercase mt-0.5">{items.length} {items.length === 1 ? "item" : "items"} selected</p>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4">
        {/* Checkout Steps */}
        {items.length > 0 && <CheckoutSteps currentStep={1} />}

        {items.length === 0 ? (
          <Card className="text-center py-16 bg-white border border-secondary/15 rounded-3xl shadow-xs max-w-xl mx-auto p-6 space-y-4">
            <ShoppingCart className="mx-auto h-16 w-16 opacity-25 text-muted-foreground" />
            <div>
              <h2 className="text-xl font-extrabold text-foreground mb-1">Your cart is empty</h2>
              <p className="text-muted-foreground text-sm">Looks like you haven't added anything yet. Browse restaurants nearby to start ordering!</p>
            </div>
            <Button onClick={() => setLocation("/shop")} className="h-11 rounded-xl font-bold shadow-xs px-6">
              Start Shopping
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items list */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-white border-secondary/10 rounded-2xl shadow-xs overflow-hidden">
                <CardHeader className="bg-background border-b border-secondary/5 py-4 px-6">
                  <CardTitle className="text-base font-extrabold text-foreground">Items in your cart</CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-secondary/5 px-6 py-0">
                  {items.map((item: any) => {
                    const itemBusy = updatingItemId === item.id;
                    return (
                      <div key={item.id} className="flex gap-4 py-5 items-stretch">
                        {/* Thumbnail */}
                        <div className="h-20 w-20 bg-secondary/5 rounded-xl shrink-0 overflow-hidden border border-secondary/5">
                          {item.product?.imageUrl ? (
                            <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-primary/5 text-primary/20 font-bold">
                              {item.product?.name?.charAt(0) || "P"}
                            </div>
                          )}
                        </div>

                        {/* Item Info & Actions */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="flex justify-between items-start gap-4">
                            <div className="min-w-0">
                              <h3 className="font-bold text-sm text-foreground truncate">{item.product?.name}</h3>
                              {item.product?.vendorName && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  from {item.product.vendorName}
                                </p>
                              )}
                              {item.notes && (
                                <span className="inline-block text-[10px] text-primary bg-secondary/10 px-2 py-0.5 rounded-full font-bold mt-1.5 max-w-full truncate">
                                  Note: {item.notes}
                                </span>
                              )}
                            </div>
                            <span className="font-extrabold text-sm text-foreground shrink-0">{formatKES((item.product?.price || 0) * item.quantity)}</span>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2.5 bg-secondary/10 rounded-full p-0.5 border border-secondary/5 shadow-2xs">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-full text-foreground hover:bg-white active:scale-90"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={itemBusy || item.quantity <= 1}
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-xs font-bold w-5 text-center text-foreground">
                                {itemBusy ? <Loader2 className="h-3 w-3 animate-spin inline text-primary" /> : item.quantity}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-full text-foreground hover:bg-white active:scale-90"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={itemBusy}
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={itemBusy}
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Summary details panel */}
            <div className="lg:col-span-1">
              <Card className="sticky top-20 bg-white border-secondary/10 rounded-2xl shadow-xs overflow-hidden">
                <CardHeader className="bg-background border-b border-secondary/5 py-4 px-6">
                  <CardTitle className="text-base font-extrabold text-foreground">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="flex justify-between text-xs font-bold text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="text-foreground">{formatKES(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-muted-foreground">
                    <span>Delivery Fee</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <Separator className="bg-secondary/5" />
                  <div className="flex justify-between text-lg font-extrabold text-foreground pt-1">
                    <span>Total</span>
                    <span>{formatKES(subtotal)}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-3 p-6 pt-0">
                  <Button 
                    className="w-full h-12 text-sm font-bold rounded-xl shadow-xs" 
                    onClick={() => setLocation("/checkout")}
                  >
                    Proceed to Checkout
                  </Button>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold justify-center">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Secure checkout powered by M-Pesa</span>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
