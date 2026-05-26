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
    label: "Liquor",
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
    label: "Convenience",
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
    { query: { enabled: true } }
  );

  const filtered = (vendors as any[])?.filter((v: any) => {
    const matchesSearch = !search || v.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = v.status !== "rejected";
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="relative overflow-hidden" style={{ minHeight: "200px" }}>
        <div className="relative z-10 px-4 pt-4 pb-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl px-6 pt-5 pb-6 border border-secondary/40">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary/70 hover:text-primary hover:bg-secondary/30 mb-3 -ml-1"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-2xl bg-secondary/30 flex items-center justify-center">
                <meta.Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                  <h1 className="text-2xl font-extrabold text-primary tracking-tight">{meta.label}</h1>
                  <p className="text-muted-foreground text-sm">{filtered.length} stores nearby</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${meta.label.toLowerCase()}...`}
                  className="pl-10 h-11 rounded-xl bg-secondary/20 border-0 shadow-md text-foreground placeholder:text-foreground/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable subcategory tabs */}
      <div className="sticky top-14 z-20 bg-background border-b border-secondary/40 shadow-sm">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 max-w-2xl mx-auto">
          {meta.subcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveSub(sub.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium border transition-all shrink-0 ${
                activeSub === sub.id
                    ? "bg-secondary/60 text-primary border-secondary/60 shadow-sm"
                    : "bg-white text-primary border-secondary/40 hover:border-secondary/70"
              }`}
            >
              <sub.Icon className="h-4 w-4" />
              {sub.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vendor list */}
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse bg-white border-secondary/40">
              <CardContent className="p-0 flex gap-4">
                <div className="h-28 w-28 bg-muted shrink-0" />
                <div className="p-4 space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingBag className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p className="font-medium">No stores found</p>
            <p className="text-sm mt-1">Try a different search or subcategory</p>
          </div>
        ) : (
          filtered.map((vendor: any) => (
            <Link key={vendor.id} href={`/vendor/${vendor.id}`}>
              <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.99] bg-white border-secondary/40">
                <CardContent className="p-0 flex">
                  <div className="h-28 w-28 bg-muted shrink-0 relative overflow-hidden">
                    {vendor.imageUrl ? (
                      <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                          <meta.Icon className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    {!vendor.isOpen && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">Closed</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="font-bold text-base leading-tight truncate">{vendor.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {vendor.description || "Fresh & ready to deliver"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {vendor.rating?.toFixed(1) || "4.5"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {vendor.deliveryTime || "25-35 min"}
                      </span>
                      {vendor.minOrder > 0 && (
                        <span>Min {formatKES(vendor.minOrder)}</span>
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
