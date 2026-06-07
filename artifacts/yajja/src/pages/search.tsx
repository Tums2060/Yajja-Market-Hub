import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearch, useLocation } from "wouter";
import {
  useListProducts,
  useAddToCart,
  getGetCartQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Store, Plus, ChevronRight, Loader2, SearchX } from "lucide-react";
import { ProductModal } from "@/components/ProductModal";
import { formatKES } from "@/lib/format";

const categoryLabel: Record<string, string> = {
  food: "Food & Drinks",
  liquor: "Liquor",
  pharmacy: "Health & Beauty",
  household: "Go",
};

type StoreGroup = {
  vendorId: number;
  vendorName: string;
  items: any[];
};

export default function SearchResults() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return (params.get("q") || params.get("search") || "").trim();
  }, [searchString]);

  const [input, setInput] = useState(query);

  useEffect(() => {
    setInput(query);
  }, [query]);

  const { data: products, isLoading } = useListProducts(
    query ? ({ search: query } as any) : ({} as any),
    { query: { enabled: !!query } } as any
  );

  const addToCart = useAddToCart();
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const groups = useMemo<StoreGroup[]>(() => {
    const map = new Map<number, StoreGroup>();
    for (const p of (products as any[]) || []) {
      if (!p.isAvailable) continue;
      const vid = p.vendorId;
      if (!map.has(vid)) {
        map.set(vid, { vendorId: vid, vendorName: p.vendorName || "Store", items: [] });
      }
      map.get(vid)!.items.push(p);
    }
    return Array.from(map.values());
  }, [products]);

  const totalItems = groups.reduce((n, g) => n + g.items.length, 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) setLocation(`/search?q=${encodeURIComponent(input.trim())}`);
  };

  const handleConfirmAddToCart = ({
    productId, quantity, addons, instructions,
  }: {
    productId: number;
    quantity: number;
    addons: { id: string; label: string }[];
    instructions: string;
  }) => {
    const prefs = addons.map((a) => a.label).join(", ");
    const notes = [prefs, instructions.trim()].filter(Boolean).join(" • ") || undefined;
    addToCart.mutate(
      { data: { productId, quantity, notes } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast({ title: "Added to cart" });
          setModalOpen(false);
        },
        onError: () => toast({ variant: "destructive", title: "Failed to add" }),
      }
    );
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 space-y-6">
      <form onSubmit={submit} className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
        <Input
          autoFocus
          placeholder="Search items by name, tag or category…"
          className="pl-10 h-12 rounded-2xl bg-secondary/20 border-0 shadow-sm text-foreground placeholder:text-foreground/50"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </form>

      {!query ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="mx-auto h-10 w-10 opacity-20 mb-3" />
          <p>Search for items across every store — try “chicken”, “whisky” or “painkiller”.</p>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : totalItems === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <SearchX className="mx-auto h-10 w-10 opacity-20 mb-3" />
          <p className="font-medium text-foreground">No items match “{query}”</p>
          <p className="text-sm mt-1">Try a different keyword or browse stores instead.</p>
          <Link href="/shop">
            <Button variant="outline" className="mt-4 border-secondary/50 text-primary hover:bg-secondary/20">Browse all stores</Button>
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {totalItems} item{totalItems === 1 ? "" : "s"} in {groups.length} store{groups.length === 1 ? "" : "s"} for “{query}”
          </p>
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.vendorId} className="space-y-3">
                <Link href={`/vendor/${group.vendorId}`}>
                  <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="h-9 w-9 rounded-xl bg-secondary/25 flex items-center justify-center shrink-0">
                      <Store className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="font-bold text-foreground group-hover:text-primary transition-colors">{group.vendorName}</h2>
                    <ChevronRight className="h-4 w-4 text-primary/40 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.items.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => { setSelectedProduct(product); setModalOpen(true); }}
                      className="text-left"
                    >
                      <Card className="overflow-hidden flex flex-row h-28 hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.99]">
                        <div className="w-24 h-full bg-muted shrink-0">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20 text-2xl font-bold">
                              {product.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <h3 className="font-bold text-sm leading-tight truncate">{product.name}</h3>
                            {product.tags && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {String(product.tags).split(",").map((t: string) => t.trim()).filter(Boolean).slice(0, 2).map((t: string) => (
                                  <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0 border-secondary/50 text-primary/70 capitalize">{t}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="font-bold text-sm text-primary">{formatKES(product.price)}</span>
                            <span className="rounded-full px-2.5 py-1 inline-flex items-center text-xs font-bold bg-primary text-primary-foreground">
                              <Plus className="h-3 w-3 mr-0.5" /> Add
                            </span>
                          </div>
                        </div>
                      </Card>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ProductModal
        open={modalOpen}
        product={selectedProduct}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmAddToCart}
        isSubmitting={addToCart.isPending}
      />
    </div>
  );
}
