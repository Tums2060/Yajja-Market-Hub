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
    <div className="min-h-screen bg-muted/20 pb-16 pt-8">
      <div className="container max-w-3xl mx-auto px-4 space-y-6">
        {/* Search Header Input */}
        <form onSubmit={submit} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search items by name, tag or category…"
            className="pl-11 h-14 rounded-2xl bg-white border border-secondary/20 shadow-md text-foreground placeholder:text-muted-foreground/60 text-base"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </form>

        {!query ? (
          <div className="text-center py-16 text-muted-foreground bg-white rounded-3xl border border-secondary/10 p-8 shadow-xs">
            <Search className="mx-auto h-12 w-12 opacity-25 text-muted-foreground mb-4" />
            <p className="font-semibold text-foreground text-base">Search across all stores</p>
            <p className="text-sm mt-1 max-w-sm mx-auto">Try typing terms like "chicken", "whiskey", "beauty", or "bread".</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : totalItems === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-white rounded-3xl border border-dashed border-secondary/20 p-8 shadow-xs">
            <SearchX className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p className="font-semibold text-lg text-foreground">No matches found for "{query}"</p>
            <p className="text-sm mt-1">Try check spelling, different keywords, or explore stores directly.</p>
            <Link href="/shop">
              <Button variant="outline" className="mt-4 rounded-xl font-bold text-xs h-10 border-secondary/25 shadow-2xs cursor-pointer hover:bg-secondary/5">Browse All Stores</Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              {totalItems} item{totalItems === 1 ? "" : "s"} found in {groups.length} store{groups.length === 1 ? "" : "s"} for "{query}"
            </p>
            <div className="flex flex-col gap-6">
              {groups.map((group) => (
                <div key={group.vendorId} className="space-y-3">
                  <Link href={`/vendor/${group.vendorId}`}>
                    <div className="flex items-center gap-2.5 group cursor-pointer w-fit">
                      <div className="h-9 w-9 rounded-xl bg-secondary/5 border border-secondary/5 flex items-center justify-center shrink-0">
                        <Store className="h-4 w-4 text-primary" />
                      </div>
                      <h2 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors">{group.vendorName}</h2>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {group.items.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => { setSelectedProduct(product); setModalOpen(true); }}
                        className="text-left group"
                      >
                        <Card className="overflow-hidden flex flex-row justify-between h-28 bg-white border border-secondary/10 shadow-xs hover:shadow-md transition-all rounded-2xl p-3 gap-3">
                          <div className="flex-1 flex flex-col justify-between min-w-0">
                            <div>
                              <h3 className="font-bold text-sm leading-tight truncate text-foreground group-hover:text-primary transition-colors">{product.name}</h3>
                              {product.tags && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {String(product.tags).split(",").map((t: string) => t.trim()).filter(Boolean).slice(0, 2).map((t: string) => (
                                    <Badge key={t} variant="outline" className="text-[9px] font-bold uppercase px-2 py-0 border-secondary/20 bg-secondary/5 text-primary tracking-wide rounded-full">{t}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="font-extrabold text-sm text-foreground">{formatKES(product.price)}</div>
                          </div>

                          <div className="w-20 h-20 bg-secondary/5 rounded-lg shrink-0 relative overflow-hidden self-center border border-secondary/5">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20 text-xl font-bold">
                                {product.name.charAt(0)}
                              </div>
                            )}
                            <div className="absolute bottom-1 right-1">
                              <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-105 transition-all">
                                <Plus className="h-3.5 w-3.5" />
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
      </div>

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
