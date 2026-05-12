import React from "react";
import { useLocation } from "wouter";
import { 
  useGetCart, 
  useGetGroupCart, 
  useUpdateCartItem, 
  useRemoveCartItem, 
  useRemoveGroupCartItem,
  getGetCartQueryKey,
  getGetGroupCartQueryKey
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Minus, Loader2, ShoppingCart, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatKES } from "@/lib/format";

export default function Cart() {
  const { activeMode } = useAuth();
  const isGroupMode = activeMode !== "individual";
  const groupId = isGroupMode ? (activeMode as number) : 0;
  
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: individualCart, isLoading: loadingIndividual } = useGetCart({
    query: { enabled: !isGroupMode }
  });

  const { data: groupCart, isLoading: loadingGroup } = useGetGroupCart(groupId, {
    query: { enabled: isGroupMode }
  });

  const updateItemMutation = useUpdateCartItem();
  const removeItemMutation = useRemoveCartItem();
  const removeGroupItemMutation = useRemoveGroupCartItem();

  const isLoading = isGroupMode ? loadingGroup : loadingIndividual;
  const cartData = isGroupMode ? groupCart : individualCart;
  const items = (cartData as any)?.items || [];
  const subtotal = (cartData as any)?.subtotal || 0;

  const invalidateCart = () => {
    if (isGroupMode) {
      queryClient.invalidateQueries({ queryKey: getGetGroupCartQueryKey(groupId) });
    } else {
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
    }
  };

  const handleUpdateQuantity = (cartItemId: number, newQuantity: number) => {
    if (isGroupMode) return; // Group cart items are owned by the user who added them

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
    if (isGroupMode) {
      removeGroupItemMutation.mutate(
        { groupId, cartItemId },
        {
          onSuccess: () => {
            invalidateCart();
            toast({ title: "Item removed" });
          },
          onError: () => toast({ variant: "destructive", title: "Could not remove item" }),
        }
      );
    } else {
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
    }
  };

  const updatingItemId =
    (updateItemMutation.isPending && (updateItemMutation.variables as any)?.cartItemId) ||
    (removeItemMutation.isPending && (removeItemMutation.variables as any)?.cartItemId) ||
    (removeGroupItemMutation.isPending && (removeGroupItemMutation.variables as any)?.cartItemId) ||
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
        <div className={`p-3 rounded-xl ${isGroupMode ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
          {isGroupMode ? <Users className="h-6 w-6" /> : <ShoppingCart className="h-6 w-6" />}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{isGroupMode ? "Group Cart" : "Your Cart"}</h1>
          <p className="text-muted-foreground">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="text-center py-16 border-dashed">
          <ShoppingCart className="mx-auto h-16 w-16 opacity-20 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Looks like you haven't added anything yet.</p>
          <Button onClick={() => setLocation("/shop")}>Start Shopping</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {isGroupMode && groupCart && "memberSummary" in (groupCart as any) && (
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {(groupCart as any).memberSummary.map((m: any) => (
                  <div key={m.userId} className="bg-card border rounded-full px-4 py-2 flex items-center gap-2 whitespace-nowrap shadow-sm">
                    <span className="font-semibold text-sm">{m.userName}</span>
                    <span className="text-muted-foreground text-xs">• {formatKES(m.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}
            
            <Card>
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
                            {isGroupMode && (
                              <p className="text-xs text-secondary mt-1 font-medium bg-secondary/10 inline-block px-2 py-0.5 rounded-full">
                                Added by {item.userName}
                              </p>
                            )}
                          </div>
                          <span className="font-bold">{formatKES((item.product?.price || 0) * item.quantity)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          {!isGroupMode ? (
                            <div className="flex items-center gap-3 bg-muted rounded-full p-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 rounded-full"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={itemBusy}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium w-4 text-center">
                                {itemBusy ? <Loader2 className="h-3 w-3 animate-spin inline" /> : item.quantity}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 rounded-full"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={itemBusy}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-muted-foreground">Qty: {item.quantity}</span>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={itemBusy}
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
            <Card className="sticky top-20">
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
