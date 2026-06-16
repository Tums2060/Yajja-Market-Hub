import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { useListVendors } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Store, Star, Clock, ShoppingCart, Cross, Wine, UtensilsCrossed, Compass } from "lucide-react";

const CATEGORIES = [
  { id: "food", label: "Yajja Food & Drinks", Icon: UtensilsCrossed, href: "/category/food" },
  { id: "liquor", label: "Yajja Liquor", Icon: Wine, href: "/category/liquor" },
  { id: "pharmacy", label: "Yajja Health", Icon: Cross, href: "/category/pharmacy" },
  { id: "household", label: "Yajja Go", Icon: ShoppingCart, href: "/category/household" },
];

const categoryLabel: Record<string, string> = {
  food: "Food & Drinks",
  liquor: "Liquor",
  pharmacy: "Health & Beauty",
  household: "Go",
};

export default function Shop() {
  const [search, setSearch] = useState("");

  const { data: vendors, isLoading } = useListVendors(
    search.trim() ? ({ search: search.trim() } as any) : {}
  );

  const vendorCards = useMemo(() => (vendors || []) as any[], [vendors]);

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      {/* Explore Header */}
      <div className="bg-background border-b border-secondary/5 py-8">
        <div className="container px-4 max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <Compass className="h-8 w-8 text-primary" /> Explore Stores
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Discover the best local restaurants and delivery stores near you</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search stores, restaurants, pharmacy..."
              className="pl-11 h-12 rounded-2xl bg-white border border-secondary/20 shadow-sm text-foreground placeholder:text-muted-foreground/60 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="container py-8 px-4 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        {/* Sliding Horizontal Navigation Menu */}
        <div className="w-full overflow-x-auto scrollbar-hide -mx-4 px-4 py-2">
          <div className="flex gap-3 whitespace-nowrap min-w-max pb-1">
            {CATEGORIES.map((cat) => (
              <Link key={cat.id} href={cat.href}>
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white border border-secondary/15 shadow-2xs hover:shadow-sm hover:border-primary/30 transition-all active:scale-[0.97] cursor-pointer">
                  <div className="h-6 w-6 rounded-full bg-secondary/10 flex items-center justify-center text-primary shrink-0">
                    <cat.Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold text-foreground tracking-wide">
                    {cat.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Vendor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse bg-white border-secondary/10 rounded-2xl shadow-xs">
                <div className="h-44 bg-muted w-full" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </Card>
            ))
          ) : vendorCards.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-foreground bg-white rounded-3xl border border-dashed border-secondary/20 p-8 shadow-xs">
              <Store className="mx-auto h-12 w-12 opacity-20 mb-4 text-muted-foreground" />
              <p className="font-semibold text-lg">No stores found</p>
              <p className="text-sm mt-1">Try a different search term or category filter</p>
            </div>
          ) : (
            vendorCards.map((vendor) => (
              <Link key={vendor.id} href={`/vendor/${vendor.id}`}>
                <Card className="group overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-200 bg-white border-secondary/10 rounded-2xl flex flex-col h-full shadow-xs">
                  {/* Store Banner */}
                  <div className="relative h-44 bg-secondary/5 overflow-hidden">
                    {vendor.imageUrl ? (
                      <img 
                        src={vendor.imageUrl} 
                        alt={vendor.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary/5 to-secondary/15">
                        <Store className="h-10 w-10 text-primary/30" />
                      </div>
                    )}
                    {vendor.isOpen === false && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Badge variant="secondary" className="font-bold text-xs uppercase tracking-wider px-3 py-1">Closed</Badge>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
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
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {vendor.description || "Fresh products delivered directly to you"}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-secondary/5 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{vendor.deliveryTime || "25-35 min"}</span>
                      </span>
                      <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
                      <span>KES 200 delivery</span>
                      <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
                      <span className="capitalize font-semibold text-primary/95 text-[10px] bg-secondary/10 px-2 py-0.5 rounded-full">
                        {categoryLabel[vendor.category] || vendor.category}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
