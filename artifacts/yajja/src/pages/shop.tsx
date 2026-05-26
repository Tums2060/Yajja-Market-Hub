import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useAddToCart,
  useListProducts,
  useListVendors,
  getGetCartQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ShoppingBag, Plus, Store } from "lucide-react";
import { formatKES } from "@/lib/format";

type SearchMode = "food" | "restaurants";

export default function Shop() {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<SearchMode>("food");
  const [notesById, setNotesById] = useState<Record<number, string>>({});

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products, isLoading: productsLoading } = useListProducts(
    mode === "food" && search.trim() ? { search: search.trim() } : {},
    { query: { enabled: mode === "food" } }
  );
  const { data: vendors, isLoading: vendorsLoading } = useListVendors(
    mode === "restaurants" && search.trim() ? ({ search: search.trim() } as any) : {},
    { query: { enabled: mode === "restaurants" } }
  );

  const addToCartMutation = useAddToCart();

  const handleAdd = (productId: number) => {
    const notes = notesById[productId]?.trim();
    addToCartMutation.mutate(
      { data: { productId, quantity: 1, notes: notes || undefined } } as any,
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast({ title: "Added to cart" });
        },
        onError: () => toast({ variant: "destructive", title: "Failed to add" }),
      }
    );
  };

  const productCards = useMemo(() => (products || []) as any[], [products]);
  const vendorCards = useMemo(() => (vendors || []) as any[], [vendors]);

  return (
    <div className="container py-8 px-4 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Browse All Stores</h1>
          <p className="text-muted-foreground mt-1">Discover food across all vendors</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={mode === "food" ? "Search food items..." : "Search restaurants..."}
            className="pl-9 h-11 bg-secondary/20 border-0 shadow-sm text-foreground placeholder:text-foreground/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={mode === "food" ? "default" : "outline"}
          className="gap-2"
          onClick={() => setMode("food")}
        >
          <ShoppingBag className="h-4 w-4" /> Food
        </Button>
        <Button
          variant={mode === "restaurants" ? "default" : "outline"}
          className="gap-2"
          onClick={() => setMode("restaurants")}
        >
          <Store className="h-4 w-4" /> Restaurants
        </Button>
      </div>

      {mode === "food" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productsLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse bg-white border-secondary/40">
                <div className="h-44 bg-muted w-full" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : productCards.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <ShoppingBag className="mx-auto h-12 w-12 opacity-20 mb-4" />
              <p>No food items found.</p>
            </div>
          ) : (
            productCards.map((product) => (
              <Card key={product.id} className="overflow-hidden bg-white border-secondary/40">
                <div className="relative h-44 bg-muted overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/20 text-primary/40">
                      <ShoppingBag className="h-12 w-12" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg truncate">{product.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{product.vendorName || ""}</p>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {product.description || "No description available"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{formatKES(product.price)}</span>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => handleAdd(product.id)}
                      disabled={addToCartMutation.isPending}
                    >
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </div>
                  <Input
                    placeholder="Notes (optional)"
                    className="h-9 bg-secondary/20 border-0 text-foreground placeholder:text-foreground/50"
                    value={notesById[product.id] || ""}
                    onChange={(e) =>
                      setNotesById((prev) => ({ ...prev, [product.id]: e.target.value }))
                    }
                  />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {mode === "restaurants" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendorsLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse bg-white border-secondary/40">
                <div className="h-40 bg-muted w-full" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : vendorCards.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              <Store className="mx-auto h-12 w-12 opacity-20 mb-4" />
              <p>No restaurants found.</p>
            </div>
          ) : (
            vendorCards.map((vendor) => (
              <Link key={vendor.id} href={`/vendor/${vendor.id}`}>
                <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all bg-white border-secondary/40">
                  <div className="relative h-40 bg-muted overflow-hidden">
                    {vendor.imageUrl ? (
                      <img
                        src={vendor.imageUrl}
                        alt={vendor.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary/20 text-primary/40">
                        <Store className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg truncate pr-2">{vendor.name}</h3>
                      <Badge variant="outline" className="capitalize">{vendor.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {vendor.description || "No description available"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
