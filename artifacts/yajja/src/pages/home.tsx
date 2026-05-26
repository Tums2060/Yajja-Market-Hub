import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ChevronRight, Search, MapPin, Bell, ShoppingBag, ShoppingCart, Store, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeroWatermark } from "@/components/HeroWatermark";

const CATEGORIES = [
  {
    id: "food",
    label: "Food & Drinks",
    Icon: ShoppingBag,
    watermarkIcons: [ShoppingBag, ShoppingBag, ShoppingBag],
    bg: "bg-secondary/25",
    ring: "ring-secondary/40",
    text: "text-primary",
    href: "/category/food",
  },
  {
    id: "household",
    label: "Convenience",
    Icon: ShoppingCart,
    watermarkIcons: [ShoppingCart, ShoppingCart, ShoppingCart],
    bg: "bg-secondary/25",
    ring: "ring-secondary/40",
    text: "text-primary",
    href: "/category/household",
  },
  {
    id: "liquor",
    label: "Liquor",
    Icon: Store,
    watermarkIcons: [Store, Store, Store],
    bg: "bg-secondary/25",
    ring: "ring-secondary/40",
    text: "text-primary",
    href: "/category/liquor",
  },
  {
    id: "pharmacy",
    label: "Health & Beauty",
    Icon: Package,
    watermarkIcons: [Package, Package, Package],
    bg: "bg-secondary/25",
    ring: "ring-secondary/40",
    text: "text-primary",
    href: "/category/pharmacy",
  },
];

function CategoryWatermark({ icons }: { icons: Array<React.ComponentType<{ className?: string }>> }) {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      {icons.map((Icon, i) => {
        const angle = (i / icons.length) * Math.PI * 2;
        const r = 32;
        const top = `${50 + Math.sin(angle) * r}%`;
        const left = `${50 + Math.cos(angle) * r}%`;
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 opacity-20 text-base select-none"
            style={{ top, left }}
          >
            <Icon className="h-4 w-4 text-primary" />
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) setLocation(`/shop?search=${encodeURIComponent(search)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <HeroWatermark />
        <div className="relative z-10 px-4 pt-6 pb-6 max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl px-6 pt-6 pb-5 border border-secondary/40">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5 text-primary/70 text-sm mb-0.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Nairobi, Kenya</span>
                </div>
                <p className="text-primary font-semibold text-lg">
                  Hey {user?.name?.split(" ")[0]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary/70 hover:text-primary hover:bg-secondary/30 h-9 w-9"
                >
                  <Bell className="h-5 w-5" />
                </Button>
              </div>
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

      <div className="max-w-2xl mx-auto px-4 pt-2 pb-6">
        <h2 className="text-base font-bold text-primary mb-4">What are you looking for?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CATEGORIES.map((cat) => (
            <Link key={cat.id} href={cat.href}>
              <div className="flex flex-col items-center gap-2 active:scale-95 transition-transform">
                <div className={`relative aspect-square w-full rounded-full overflow-hidden ${cat.bg} ring-4 ${cat.ring} shadow-lg flex items-center justify-center`}>
                  <CategoryWatermark icons={cat.watermarkIcons} />
                  <cat.Icon className="relative h-8 w-8 text-primary" />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-primary text-center leading-tight">{cat.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8">
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
