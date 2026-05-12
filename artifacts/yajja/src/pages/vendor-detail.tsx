import React, { useState } from "react";
import { useParams } from "wouter";
import {
  useGetVendor,
  useListProducts,
  useAddToCart,
  useAddToGroupCart,
  getGetCartQueryKey,
  getGetGroupCartQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Clock, Info, Plus, Loader2, ArrowLeft } from "lucide-react";
import { ProductModal } from "@/components/ProductModal";
import { formatKES } from "@/lib/format";

export default function VendorDetail() {
  const { vendorId } = useParams();
  const { activeMode } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const id = parseInt(vendorId || "0", 10);

  const { data: vendor, isLoading: vendorLoading } = useGetVendor(id, {
    query: { enabled: !!id },
  });

  const { data: products, isLoading: productsLoading } = useListProducts(
    { vendorId: id },
    { query: { enabled: !!id } }
  );

  const addToCartMutation = useAddToCart();
  const addToGroupCartMutation = useAddToGroupCart();

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openProduct = (product: any) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleConfirmAddToCart = ({
    productId,
    quantity,
  }: {
    productId: number;
    quantity: number;
    addons: { id: string; label: string }[];
    instructions: string;
  }) => {
    // Note: cart_items table has no notes/addons column today. Preferences and
    // special instructions are collected here for the checkout step (orders.notes).
    const onSuccess = () => {
      if (activeMode === "individual") {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      } else {
        queryClient.invalidateQueries({ queryKey: getGetGroupCartQueryKey(activeMode as number) });
      }
      toast({ title: activeMode === "individual" ? "Added to cart" : "Added to group cart" });
      setModalOpen(false);
    };
    const onError = () => toast({ variant: "destructive", title: "Failed to add" });

    if (activeMode === "individual") {
      addToCartMutation.mutate({ data: { productId, quantity } }, { onSuccess, onError });
    } else {
      addToGroupCartMutation.mutate(
        { groupId: activeMode as number, data: { productId, quantity } } as any,
        { onSuccess, onError },
      );
    }
  };

  if (vendorLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vendor) {
    return <div className="p-8 text-center">Vendor not found.</div>;
  }

  const isAdding = addToCartMutation.isPending || addToGroupCartMutation.isPending;

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      {/* Header Image */}
      <div className="h-64 md:h-80 w-full bg-muted relative">
        {vendor.imageUrl ? (
          <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            <span className="text-4xl text-primary/30 font-bold">{vendor.name}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

        <div className="absolute top-4 left-4">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-background/80 hover:bg-background backdrop-blur-sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="absolute bottom-6 left-4 md:left-8 right-4">
          <div className="flex flex-col gap-2 text-white">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary hover:bg-primary/90">{vendor.category}</Badge>
              {!vendor.isOpen && <Badge variant="destructive">Closed</Badge>}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">{vendor.name}</h1>
            <div className="flex items-center gap-4 text-sm md:text-base font-medium opacity-90">
              <span className="flex items-center">
                <Star className="h-4 w-4 mr-1 fill-amber-400 text-amber-400" />{" "}
                {vendor.rating?.toFixed(1) || "New"}
              </span>
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1" /> {vendor.deliveryTime || "30-45 min"}
              </span>
              <span className="flex items-center">
                <Info className="h-4 w-4 mr-1" /> Min {formatKES(vendor.minOrder || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        {vendor.description && (
          <div className="mb-8 bg-card border rounded-xl p-4 text-muted-foreground shadow-sm">
            {vendor.description}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Products</h2>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 flex gap-4">
                  <div className="h-24 w-24 bg-muted rounded-md shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products?.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed">
            <p className="text-muted-foreground">No products available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products?.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => product.isAvailable && vendor.isOpen && openProduct(product)}
                className="text-left disabled:cursor-not-allowed"
                disabled={!product.isAvailable || !vendor.isOpen}
              >
                <Card
                  className={`overflow-hidden flex flex-row h-36 hover:shadow-md transition-all active:scale-[0.99] ${
                    !product.isAvailable ? "opacity-60" : ""
                  }`}
                >
                  <div className="w-32 h-full bg-muted shrink-0 relative">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20 text-2xl font-bold">
                        {product.name.charAt(0)}
                      </div>
                    )}
                    {!product.isAvailable && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                        <span className="text-xs font-bold px-2 py-1 bg-background/80 rounded">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="font-bold leading-tight truncate mb-1">{product.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-base text-primary">
                        {formatKES(product.price)}
                      </span>
                      <span className="rounded-full px-3 py-1.5 inline-flex items-center text-xs font-bold bg-primary text-primary-foreground">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add
                      </span>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      <ProductModal
        open={modalOpen}
        product={selectedProduct}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmAddToCart}
        isSubmitting={isAdding}
      />
    </div>
  );
}
