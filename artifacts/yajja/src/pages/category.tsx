import React, { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useListVendors } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Star, Clock, ShoppingBag, Store, Package, ShoppingCart, Home } from "lucide-react";
import { formatKES } from "@/lib/format";

const CATEGORY_META: Record<string, {
  label: string; Icon: React.ComponentType<{ className?: string }>; 
  subcategories: { id: string; label: string; Icon: React.ComponentType<{ className?: string }> }[];
}> = {
  food: {
    label: "Food & Drinks",
    Icon: ShoppingBag,
    subcategories: [
      { id: "all", label: "All", Icon: Store },
      { id: "local", label: "Local Dishes", Icon: ShoppingBag },
      { id: "fast-food", label: "Fast Food", Icon: ShoppingBag },
      { id: "breakfast", label: "Breakfast", Icon: ShoppingBag },
      { id: "grills", label: "Grills", Icon: ShoppingBag },
      { id: "seafood", label: "Seafood", Icon: ShoppingBag },
      { id: "bakery", label: "Bakery", Icon: ShoppingBag },
      { id: "drinks", label: "Drinks", Icon: ShoppingBag },
      { id: "desserts", label: "Desserts", Icon: ShoppingBag },
    ],
  },
  liquor: {
    label: "Liquor Store",
    Icon: Store,
    subcategories: [
      { id: "all", label: "All", Icon: Store },
      { id: "beer", label: "Beer", Icon: Store },
      { id: "wine", label: "Wine", Icon: Store },
      { id: "whiskey", label: "Whiskey", Icon: Store },
      { id: "vodka", label: "Vodka", Icon: Store },
      { id: "gin", label: "Gin", Icon: Store },
      { id: "rum", label: "Rum", Icon: Store },
      { id: "non-alcoholic", label: "Non-Alcoholic", Icon: Store },
    ],
  },
  pharmacy: {
    label: "Health & Wellness",
    Icon: Package,
    subcategories: [
      { id: "all", label: "All", Icon: Store },
      { id: "otc", label: "OTC Medicines", Icon: Package },
      { id: "vitamins", label: "Vitamins", Icon: Package },
      { id: "skincare", label: "Skincare", Icon: Package },
      { id: "baby", label: "Baby Care", Icon: Package },
      { id: "first-aid", label: "First Aid", Icon: Package },
      { id: "wellness", label: "Wellness", Icon: Package },
    ],
  },
  household: {
    label: "Yajja Go",
    Icon: ShoppingCart,
    subcategories: [
      { id: "all", label: "All", Icon: Home },
      { id: "cleaning", label: "Cleaning", Icon: ShoppingCart },
      { id: "kitchen", label: "Kitchen", Icon: ShoppingCart },
      { id: "laundry", label: "Laundry", Icon: ShoppingCart },
      { id: "stationery", label: "Stationery", Icon: ShoppingCart },
      { id: "electronics", label: "Electronics", Icon: ShoppingCart },
      { id: "personal-care", label: "Personal Care", Icon: ShoppingCart },
    ],
  },
};

export default function CategoryPage() {
  const params = useParams();
  const categoryId = (params as any).category || "food";
  const [, setLocation] = useLocation();
  const [activeSub, setActiveSub] = useState("all");
  const [search, setSearch] = useState("");

  const meta = CATEGORY_META[categoryId] || CATEGORY_META.food;

  const { data: vendors, isLoading } = useListVendors(
    { category: categoryId as any },
    { query: { enabled: true } as any }
  );

  const filtered = (vendors as any[])?.filter((v: any) => {
    const matchesSearch = !search || v.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = v.status !== "rejected";
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      {/* Category Hero Header */}
      <div className="bg-background border-b border-secondary/5 py-6">
        <div className="container px-4 max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full border-secondary/20 bg-white"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-secondary/10 flex items-center justify-center">
                <meta.Icon className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-xl font-extrabold text-foreground tracking-tight">{meta.label}</h1>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{filtered.length} stores nearby</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder={`Search ${meta.label.toLowerCase()}...`}
              className="pl-11 h-12 rounded-xl bg-white border border-secondary/20 shadow-xs text-foreground placeholder:text-muted-foreground/60 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Sticky subcategory tabs */}
      <div className="sticky top-16 z-20 bg-background border-b border-secondary/5 shadow-2xs">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 max-w-2xl mx-auto">
          {meta.subcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveSub(sub.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                activeSub === sub.id
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-white text-foreground border-secondary/15 hover:border-secondary/35"
              }`}
            >
              <sub.Icon className="h-3.5 w-3.5" />
              {sub.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vendor List */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse bg-white border-secondary/10 rounded-2xl shadow-xs">
              <div className="p-0 flex">
                <div className="h-32 w-32 bg-muted shrink-0" />
                <div className="p-4 space-y-2 flex-1">
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </div>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-white rounded-3xl border border-dashed border-secondary/20 p-8 shadow-xs">
            <ShoppingBag className="mx-auto h-12 w-12 opacity-20 mb-4 text-muted-foreground" />
            <p className="font-semibold text-lg text-foreground">No stores found</p>
            <p className="text-sm mt-1">Try a different search or subcategory filter</p>
          </div>
        ) : (
          filtered.map((vendor: any) => (
            <Link key={vendor.id} href={`/vendor/${vendor.id}`}>
              <Card className="group overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 bg-white border-secondary/10 rounded-2xl shadow-xs">
                <CardContent className="p-0 flex">
                  {/* Image */}
                  <div className="h-32 w-32 bg-secondary/5 shrink-0 relative overflow-hidden">
                    {vendor.imageUrl ? (
                      <img 
                        src={vendor.imageUrl} 
                        alt={vendor.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary/5 to-secondary/15">
                        <meta.Icon className="h-6 w-6 text-primary/30" />
                      </div>
                    )}
                    {!vendor.isOpen && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-black/35 rounded-md">Closed</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                          {vendor.name}
                        </h3>
                        <div className="flex items-center gap-1 bg-amber-500/10 text-amber-700 text-xs font-extrabold px-1.5 py-0.5 rounded shrink-0">
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          <span>{(vendor.rating ?? 4.5).toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {vendor.description || "Fresh & ready to deliver"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-secondary/5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{vendor.deliveryTime || "25-35 min"}</span>
                      </span>
                      <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
                      <span>KES 60 delivery</span>
                      {vendor.minOrder > 0 && (
                        <>
                          <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
                          <span>Min {formatKES(vendor.minOrder)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
