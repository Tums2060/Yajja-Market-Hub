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
import { Trash2, Plus, Minus, Loader2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatKES } from "@/lib/format";

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
    <div className="container max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-secondary/30 text-primary">
          <ShoppingCart className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-primary">Your Cart</h1>
          <p className="text-muted-foreground">{items.length} {items.length === 1 ? "item" : "items"}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="text-center py-16 border-dashed bg-white border-secondary/40">
          <ShoppingCart className="mx-auto h-16 w-16 opacity-20 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Looks like you haven't added anything yet.</p>
          <Button onClick={() => setLocation("/shop")}>Start Shopping</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-white border-secondary/40">
              <CardHeader>
                <CardTitle>Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {items.map((item: any) => {
                  const itemBusy = updatingItemId === item.id;
                  return (
                    <div key={item.id} className="flex gap-4">
                      <div className="h-20 w-20 bg-muted rounded-md shrink-0 overflow-hidden">
                        {item.product?.imageUrl ? (
                          <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-primary/5 text-primary/20 font-bold">
                            {item.product?.name?.charAt(0) || "P"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{item.product?.name}</h3>
                            {item.product?.vendorName && (
                              <p className="text-xs text-muted-foreground">
                                {item.product.vendorName}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                Note: {item.notes}
                              </p>
                            )}
                          </div>
                          <span className="font-bold">{formatKES((item.product?.price || 0) * item.quantity)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-3 bg-secondary/20 rounded-full p-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-full"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              disabled={itemBusy || item.quantity <= 1}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <span className="text-sm font-semibold w-6 text-center">
                              {itemBusy ? <Loader2 className="h-3 w-3 animate-spin inline" /> : item.quantity}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-full"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              disabled={itemBusy}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
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

          <div className="lg:col-span-1">
            <Card className="sticky top-20 bg-white border-secondary/40">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatKES(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span className="font-medium">Calculated at checkout</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatKES(subtotal)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full h-12 text-lg" 
                  onClick={() => setLocation("/checkout")}
                >
                  Proceed to Checkout
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
