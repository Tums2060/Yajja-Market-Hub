import React, { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetVendor,
  useListProducts,
  useListFoodCategories,
  useAddToCart,
  getGetCartQueryKey,
  useGetCart,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Clock, Info, Plus, Loader2, ArrowLeft, ShoppingCart } from "lucide-react";
import { ProductModal } from "@/components/ProductModal";
import { formatKES } from "@/lib/format";

export default function VendorDetail() {
  const { vendorId } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const id = parseInt(vendorId || "0", 10);

  const { data: vendor, isLoading: vendorLoading } = useGetVendor(id, {
    query: { enabled: !!id } as any,
  });

  const { data: products, isLoading: productsLoading } = useListProducts(
    { vendorId: id },
    { query: { enabled: !!id } as any }
  );

  const { data: foodCategories } = useListFoodCategories(id, {
    query: { enabled: !!id } as any,
  });

  const { data: cartData } = useGetCart();
  const addToCartMutation = useAddToCart();
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTag, setActiveTag] = useState<string>("all");
  const [activeCategory, setActiveCategory] = useState<number | "all">("all");

  const categoryList = (foodCategories as any[]) || [];
  const hasCategories = categoryList.length > 0;
  const cartCount = (cartData as any)?.items?.length || 0;

  const tagList = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of (products as any[]) || []) {
      String((p as any).tags || "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .forEach((t) => set.add(t));
    }
    return Array.from(set);
  }, [products]);

  const displayedProducts = React.useMemo(() => {
    const list = (products as any[]) || [];
    if (hasCategories) {
      if (activeCategory === "all") return list;
      return list.filter((p) =>
        Array.isArray((p as any).foodCategoryIds) &&
        (p as any).foodCategoryIds.includes(activeCategory)
      );
    }
    if (activeTag === "all") return list;
    return list.filter((p) =>
      String((p as any).tags || "")
        .toLowerCase()
        .split(",")
        .map((t) => t.trim())
        .includes(activeTag)
    );
  }, [products, activeTag, activeCategory, hasCategories]);

  const openProduct = (product: any) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleConfirmAddToCart = ({
    productId,
    quantity,
    addons,
    instructions,
  }: {
    productId: number;
    quantity: number;
    addons: { id: string; label: string }[];
    instructions: string;
  }) => {
    const prefs = addons.map((a) => a.label).join(", ");
    const trimmedInstructions = instructions.trim();
    const notes =
      [prefs, trimmedInstructions].filter(Boolean).join(" • ") || undefined;

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast({ title: "Added to cart" });
      setModalOpen(false);
    };
    const onError = () => toast({ variant: "destructive", title: "Failed to add" });

    addToCartMutation.mutate({ data: { productId, quantity, notes } }, { onSuccess, onError });
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

  const isAdding = addToCartMutation.isPending;

  return (
    <div className="min-h-screen bg-muted/20 pb-24 relative">
      {/* Header Image Cover */}
      <div className="h-64 md:h-80 w-full bg-secondary/15 relative overflow-hidden">
        {vendor.imageUrl ? (
          <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1A2340] to-[#252F5A] flex items-center justify-center">
            <span className="text-4xl text-white/10 font-extrabold tracking-tight">{vendor.name}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

        <div className="absolute top-4 left-4">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-background/85 hover:bg-background backdrop-blur-sm shadow-sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Button>
        </div>

        <div className="absolute bottom-6 left-4 md:left-8 right-4">
          <div className="flex flex-col gap-2.5 text-white">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary border border-white/10 hover:bg-primary/90 text-[10px] font-bold uppercase tracking-wider">{vendor.category}</Badge>
              {!vendor.isOpen && <Badge variant="destructive" className="text-[10px] font-bold uppercase tracking-wider">Closed</Badge>}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white shadow-sm">{vendor.name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm font-bold opacity-95 text-white/95">
              <span className="flex items-center bg-white/15 px-2 py-0.5 rounded-md backdrop-blur-xs">
                <Star className="h-3.5 w-3.5 mr-1 fill-amber-400 text-amber-400" />{" "}
                {vendor.rating?.toFixed(1) || "New"}
              </span>
              <span className="flex items-center bg-white/15 px-2 py-0.5 rounded-md backdrop-blur-xs">
                <Clock className="h-3.5 w-3.5 mr-1" /> {vendor.deliveryTime || "30-45 min"}
              </span>
              <span className="flex items-center bg-white/15 px-2 py-0.5 rounded-md backdrop-blur-xs">
                <Info className="h-3.5 w-3.5 mr-1" /> Min {formatKES(vendor.minOrder || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        {vendor.description && (
          <div className="mb-8 bg-white border border-secondary/15 rounded-2xl p-4 text-muted-foreground shadow-xs text-sm">
            {vendor.description}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">Products Menu</h2>
        </div>

        {hasCategories ? (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-4 sticky top-16 bg-muted/20 z-10">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-white text-foreground border-secondary/15 hover:bg-secondary/10"
              }`}
            >
              All Menu
            </button>
            {categoryList.map((cat: any) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-white text-foreground border-secondary/15 hover:bg-secondary/10"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        ) : tagList.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-4 sticky top-16 bg-muted/20 z-10">
            <button
              type="button"
              onClick={() => setActiveTag("all")}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                activeTag === "all"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-white text-foreground border-secondary/15 hover:bg-secondary/10"
              }`}
            >
              All Menu
            </button>
            {tagList.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold capitalize border transition-colors cursor-pointer ${
                  activeTag === tag
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-white text-foreground border-secondary/15 hover:bg-secondary/10"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        ) : null}

        {productsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse bg-white border border-secondary/10 rounded-2xl shadow-xs">
                <CardContent className="p-4 flex gap-4">
                  <div className="h-24 w-24 bg-muted rounded-xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-secondary/20 p-8 shadow-xs">
            <p className="text-muted-foreground text-sm font-medium">
              {hasCategories
                ? (activeCategory === "all" ? "No menu items available right now." : "No items listed in this section.")
                : (activeTag === "all" ? "No menu items available right now." : `No items tagged "${activeTag}".`)}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => product.isAvailable && vendor.isOpen && openProduct(product)}
                className="text-left disabled:cursor-not-allowed group"
                disabled={!product.isAvailable || !vendor.isOpen}
              >
                <Card
                  className={`overflow-hidden flex flex-row justify-between h-36 bg-white border border-secondary/10 shadow-xs hover:shadow-md transition-all rounded-2xl p-4 gap-4 ${
                    !product.isAvailable ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="font-extrabold text-base leading-tight truncate text-foreground group-hover:text-primary transition-colors">{product.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {product.description || "Satisfying portion made with fresh ingredients"}
                      </p>
                    </div>
                    <div className="font-extrabold text-base text-foreground">
                      {formatKES(product.price)}
                    </div>
                  </div>

                  <div className="w-24 h-24 bg-secondary/5 rounded-xl shrink-0 relative overflow-hidden self-center border border-secondary/5">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20 text-xl font-bold">
                        {product.name.charAt(0)}
                      </div>
                    )}
                    {!product.isAvailable && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-black/45 text-white rounded">
                          Sold Out
                        </span>
                      </div>
                    )}
                    {product.isAvailable && vendor.isOpen && (
                      <div className="absolute bottom-1 right-1">
                        <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-105 transition-all">
                          <Plus className="h-4 w-4" />
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating View Cart Action Indicator */}
      {cartCount > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-md animate-in slide-in-from-bottom duration-300">
          <Link href="/cart">
            <div className="bg-[#1A2340] text-white px-5 py-3.5 rounded-2xl flex items-center justify-between shadow-2xl cursor-pointer hover:bg-[#1A2340]/95 transition-all ring-1 ring-white/10">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <span className="font-extrabold text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{cartCount}</span>
                <span className="font-extrabold text-sm tracking-wide">View Cart</span>
              </div>
              <span className="font-extrabold text-sm">{formatKES((cartData as any).subtotal || 0)}</span>
            </div>
          </Link>
        </div>
      )}

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
