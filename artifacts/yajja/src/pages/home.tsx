import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  ChevronRight, Search, MapPin, Bell, ShoppingBag, ShoppingCart,
  Store, Package, Star, Clock, RotateCcw, User, ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeroWatermark } from "@/components/HeroWatermark";
import { useListPopularVendors, useListOrders } from "@workspace/api-client-react";
import { formatKES, KENYA } from "@/lib/format";

const CATEGORIES = [
  { id: "food", label: " Yajja Food & Drinks", Icon: ShoppingBag, href: "/category/food" },
  { id: "liquor", label: "Yajja Liquor", Icon: Store, href: "/category/liquor" },
  { id: "pharmacy", label: "Yajja Health & Beauty", Icon: Package, href: "/category/pharmacy" },
  { id: "household", label: "Yajja Convenience", Icon: ShoppingCart, href: "/category/household" },
];

const categoryLabel: Record<string, string> = {
  food: "Food & Drinks",
  liquor: "Liquor",
  pharmacy: "Health & Beauty",
  household: "Convenience",
};

function StoreCard({ vendor }: { vendor: any }) {
  return (
    <Link href={`/vendor/${vendor.id}`}>
      <div className="w-44 shrink-0 rounded-2xl bg-white border border-secondary/40 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98]">
        <div className="h-24 bg-secondary/20 flex items-center justify-center overflow-hidden">
          {vendor.imageUrl ? (
            <img src={vendor.imageUrl} alt={vendor.name} className="h-full w-full object-cover" />
          ) : (
            <Store className="h-8 w-8 text-primary/40" />
          )}
        </div>
        <div className="p-3 space-y-1">
          <p className="font-bold text-sm text-foreground truncate">{vendor.name}</p>
          <p className="text-[11px] text-muted-foreground capitalize">{categoryLabel[vendor.category] || vendor.category}</p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
            {typeof vendor.rating === "number" && (
              <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-secondary fill-secondary" />{vendor.rating}</span>
            )}
            {vendor.deliveryTime && (
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{vendor.deliveryTime}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function FloatingDock() {
  const actions = [
    { href: "/cart", label: "Cart", Icon: ShoppingCart },
    { href: "/orders", label: "Orders", Icon: ReceiptText },
    { href: "/profile", label: "Account", Icon: User },
  ];
  return (
    <div className="hidden md:flex fixed right-5 top-1/2 -translate-y-1/2 z-30 flex-col gap-3">
      {actions.map(({ href, label, Icon }) => (
        <Link key={href} href={href}>
          <div className="group flex items-center gap-2 justify-end">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-xs font-semibold px-2 py-1 rounded-lg shadow">
              {label}
            </span>
            <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 transition-transform">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data: popularVendors, isLoading: loadingPopular } = useListPopularVendors(
    { limit: 6 } as any
  );
  const { data: orders } = useListOrders({} as any);

  const recentOrders = [...((orders as any[]) || [])]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 3);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) setLocation(`/search?q=${encodeURIComponent(search)}`);
  };

  const popular = (popularVendors as any[]) || [];

  return (
    <div className="min-h-screen bg-background">
      <FloatingDock />

      {/* Header */}
      <div className="relative overflow-hidden">
        <HeroWatermark />
        <div className="relative z-10 px-4 pt-6 pb-6 max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl px-6 pt-6 pb-5 border border-secondary/40">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5 text-primary/70 text-sm mb-0.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{KENYA.city}, {KENYA.country}</span>
                </div>
                <p className="text-primary font-semibold text-lg">
                  Hey {user?.name?.split(" ")[0]}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary/70 hover:text-primary hover:bg-secondary/30 h-9 w-9"
              >
                <Bell className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
              <Input
                placeholder="Search food, drinks, stores..."
                className="pl-10 h-12 rounded-2xl bg-secondary/20 border-0 shadow-lg text-foreground placeholder:text-foreground/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
          </div>
        </div>
      </div>

      {/* Category tab bar */}
      <div className="max-w-2xl mx-auto px-4 pt-2 pb-6">
        <h2 className="text-base font-bold text-primary mb-4">What are you looking for?</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 py-2 sm:mx-0 sm:px-0 sm:py-0 sm:grid sm:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <Link key={cat.id} href={cat.href}>
              <div className="flex flex-col items-center gap-2 active:scale-95 transition-transform w-20 sm:w-auto shrink-0">
                <div className="relative aspect-square w-16 sm:w-full rounded-full overflow-hidden bg-secondary/25 ring-4 ring-secondary/40 shadow-lg flex items-center justify-center">
                  <cat.Icon className="relative h-7 w-7 text-primary" />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-primary text-center leading-tight">{cat.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Most Popular Stores */}
      <div className="max-w-2xl mx-auto px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-primary">Most Popular Stores</h2>
          <Link href="/shop" className="text-xs font-semibold text-primary/70 hover:text-primary inline-flex items-center gap-0.5">
            Explore more <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {loadingPopular ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-44 shrink-0 rounded-2xl bg-white border border-secondary/40 overflow-hidden animate-pulse">
                <div className="h-24 bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : popular.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-secondary/50 p-6 text-center">
            <Store className="mx-auto h-8 w-8 text-primary/30 mb-2" />
            <p className="text-sm text-muted-foreground">No stores yet. Check back soon!</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {popular.map((v) => <StoreCard key={v.id} vendor={v} />)}
          </div>
        )}
      </div>

      {/* Recently Ordered */}
      {recentOrders.length > 0 && (
        <div className="max-w-2xl mx-auto px-4 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-primary">Same as last time?</h2>
            <Link href="/orders" className="text-xs font-semibold text-primary/70 hover:text-primary inline-flex items-center gap-0.5">
              All orders <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentOrders.map((order: any) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="rounded-2xl bg-white border border-secondary/40 p-4 flex items-center gap-3 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
                  <div className="h-10 w-10 rounded-xl bg-secondary/25 flex items-center justify-center shrink-0">
                    <RotateCcw className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{order.vendorName || "Your order"}</p>
                    <p className="text-xs text-muted-foreground">
                      {(order.items?.length ?? order.itemCount ?? 0)} items • {formatKES(order.total)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary inline-flex items-center gap-0.5 shrink-0">
                    Reorder <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Browse all */}
      <div className="max-w-2xl mx-auto px-4 pb-10">
        <Link href="/shop">
          <div className="rounded-2xl bg-white border border-secondary/40 p-4 flex items-center gap-3 hover:bg-secondary/20 transition-colors cursor-pointer shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-secondary/25 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-primary">Browse All Stores</p>
              <p className="text-xs text-primary/60">All vendors in your area</p>
            </div>
            <ChevronRight className="h-5 w-5 text-primary/40" />
          </div>
        </Link>
      </div>
    </div>
  );
}
