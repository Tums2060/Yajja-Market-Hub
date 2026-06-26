import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  ChevronRight, Search, MapPin, Bell, Star, Clock, RotateCcw, User, ReceiptText,
  ShoppingCart, Store, Wine, Cross, UtensilsCrossed, Flame, Compass, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useListPopularVendors, useListOrders, useAddToCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { formatKES, KENYA } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ProductModal } from "@/components/ProductModal";

const CATEGORY_STYLES: Record<string, {
  bg: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
  descColor: string;
  ctaBg: string;
  ctaText: string;
  ctaLabel: string;
}> = {
  food: {
    bg: "bg-gradient-to-br from-[#1800AC] to-[#3F2BBE] text-white",
    iconBg: "bg-white/10 backdrop-blur-md",
    iconColor: "text-[#FFDE59]",
    textColor: "text-white font-extrabold",
    descColor: "text-white/80",
    ctaBg: "bg-[#FFDE59] hover:bg-[#FFDE59]/90 text-[#1800AC]",
    ctaText: "text-[#1800AC] font-black",
    ctaLabel: "Order Food"
  },
  liquor: {
    bg: "bg-gradient-to-br from-[#FFDE59] to-[#E2C035] text-[#1800AC]",
    iconBg: "bg-[#1800AC]/10",
    iconColor: "text-[#1800AC]",
    textColor: "text-[#1800AC] font-extrabold",
    descColor: "text-[#1800AC]/80",
    ctaBg: "bg-[#1800AC] hover:bg-[#1800AC]/90 text-white",
    ctaText: "text-white font-black",
    ctaLabel: "Shop Drinks"
  },
  pharmacy: {
    bg: "bg-gradient-to-br from-[#0F766E] to-[#115E59] text-white",
    iconBg: "bg-white/10 backdrop-blur-md",
    iconColor: "text-[#FFDE59]",
    textColor: "text-white font-extrabold",
    descColor: "text-teal-100/80",
    ctaBg: "bg-[#FFDE59] hover:bg-[#FFDE59]/90 text-[#0F766E]",
    ctaText: "text-[#0F766E] font-black",
    ctaLabel: "Get Medicine"
  },
  household: {
    bg: "bg-gradient-to-br from-[#4F46E5] to-[#312E81] text-white",
    iconBg: "bg-white/10 backdrop-blur-md",
    iconColor: "text-[#FFDE59]",
    textColor: "text-white font-extrabold",
    descColor: "text-indigo-100/80",
    ctaBg: "bg-[#FFDE59] hover:bg-[#FFDE59]/90 text-[#312E81]",
    ctaText: "text-[#312E81] font-black",
    ctaLabel: "Shop Essentials"
  }
};

const CATEGORIES = [
  { id: "food", label: "Food & Drinks", Icon: UtensilsCrossed, href: "/category/food", desc: "Local & fast foods" },
  { id: "liquor", label: "Liquor", Icon: Wine, href: "/category/liquor", desc: "Beers, wines & spirits" },
  { id: "pharmacy", label: "Health", Icon: Cross, href: "/category/pharmacy", desc: "Medicines & wellness" },
  { id: "household", label: "Go", Icon: ShoppingCart, href: "/category/household", desc: "Daily essentials" },
];

const categoryLabel: Record<string, string> = {
  food: "Food & Drinks",
  liquor: "Liquor",
  pharmacy: "Health & Beauty",
  household: "Go",
};

// Premium Restaurant Discovery Card
function RestaurantCard({ vendor }: { vendor: any }) {
  return (
    <Link href={`/vendor/${vendor.id}`}>
      <div className="group rounded-2xl bg-white border border-secondary/10 overflow-hidden shadow-xs hover:shadow-md hover:border-primary/20 transition-all duration-200 active:scale-[0.99] cursor-pointer flex flex-col h-full">
        {/* Cover Image */}
        <div className="h-44 w-full bg-secondary/5 relative overflow-hidden shrink-0">
          {vendor.imageUrl ? (
            <img
              src={vendor.imageUrl}
              alt={vendor.name}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-secondary/5 to-secondary/15">
              <Store className="h-10 w-10 text-primary/30" />
            </div>
          )}
          {/* Badge overlays */}
          <div className="absolute top-3 right-3 flex gap-1.5">
            {!vendor.isOpen && (
              <Badge variant="destructive" className="font-bold">Closed</Badge>
            )}
            {vendor.isOpen && (
              <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">Open</span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
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
              {vendor.description || "Fresh items delivered fast to your doorstep"}
            </p>
          </div>

          <div className="pt-2 border-t border-secondary/5 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{vendor.deliveryTime || "25-35 min"}</span>
            </span>
            <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
            <span>KES 60 delivery</span>
            <span className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
            <span className="capitalize font-semibold text-primary/95 text-[11px] bg-secondary/10 px-2 py-0.5 rounded-full">
              {categoryLabel[vendor.category] || vendor.category}
            </span>
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
    { href: "/orders/track", label: "Track Orders", Icon: Clock },
    { href: "/profile", label: "Account", Icon: User },
  ];
  return (
    <div className="hidden md:flex fixed right-5 top-1/2 -translate-y-1/2 z-30 flex-col gap-3">
      {actions.map(({ href, label, Icon }) => (
        <Link key={href} href={href}>
          <div className="group flex items-center gap-2 justify-end cursor-pointer">
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

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const addToCartMutation = useAddToCart();

  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [initialQuantity, setInitialQuantity] = useState(1);
  const [initialInstructions, setInitialInstructions] = useState("");
  const [initialAddonIds, setInitialAddonIds] = useState<string[]>([]);

  const { data: popularVendors, isLoading: loadingPopular } = useListPopularVendors(
    { limit: 6 } as any
  );
  const { data: orders } = useListOrders({} as any);

  const liveOrders = React.useMemo(() => {
    return ((orders as any[]) || []).filter(
      (o) => !["delivered", "cancelled", "rejected"].includes(o.status)
    );
  }, [orders]);

  const recentOrders = [...((orders as any[]) || [])]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 3);

  const handleReorderClick = (order: any) => {
    const firstItem = order.items?.[0];
    if (!firstItem) return;

    const product = firstItem.product || {
      id: firstItem.productId,
      name: firstItem.productName,
      price: firstItem.unitPrice,
      isAvailable: true,
    };

    let addonIds: string[] = [];
    let instructions = "";
    if (firstItem.notes) {
      const parts = firstItem.notes.split(" • ");
      const possibleAddonsPart = parts[0] || "";
      const possibleInstructionsPart = parts[1] || "";

      const DEFAULT_ADDONS_LIST = [
        { id: "extra-cheese", label: "Extra cheese" },
        { id: "extra-sauce", label: "Extra sauce" },
        { id: "no-onions", label: "No onions" },
        { id: "spicy", label: "Make it spicy" },
      ];

      const labels = possibleAddonsPart.split(", ").map((s: string) => s.trim().toLowerCase());
      const matched = DEFAULT_ADDONS_LIST.filter((a) => labels.includes(a.label.toLowerCase())).map((a) => a.id);

      if (matched.length > 0) {
        addonIds = matched;
        instructions = possibleInstructionsPart;
      } else {
        instructions = firstItem.notes;
      }
    }

    setSelectedProduct(product);
    setInitialQuantity(firstItem.quantity || 1);
    setInitialInstructions(instructions);
    setInitialAddonIds(addonIds);
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
    const notes = [prefs, trimmedInstructions].filter(Boolean).join(" • ") || undefined;

    addToCartMutation.mutate(
      { data: { productId, quantity, notes } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast({ title: "Added to cart", description: "Item added to your cart successfully." });
          setModalOpen(false);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to add to cart" });
        },
      }
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) setLocation(`/search?q=${encodeURIComponent(search)}`);
  };

  const popular = (popularVendors as any[]) || [];

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      <FloatingDock />

      {/* Hero Header Section */}
      <div className="relative overflow-hidden bg-background border-b border-secondary/5">
        <div className="px-4 pt-6 pb-6 max-w-4xl mx-auto space-y-6">
          {/* Greeting & Location */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Delivering To</p>
              <div className="flex items-center gap-1 text-foreground font-bold text-base mt-0.5 cursor-pointer hover:text-primary transition-colors">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{KENYA.city}, {KENYA.country}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground">Welcome back,</p>
                <p className="text-sm font-extrabold text-foreground">{user?.name?.split(" ")[0]}</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full border-secondary/20 shadow-xs relative bg-white"
              >
                <Bell className="h-5 w-5 text-foreground" />
                <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-primary" />
              </Button>
            </div>
          </div>

          {/* Search Header */}
          <div className="max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-4">
              Hello Boss <br />
              <span className="text-muted-foreground font-medium text-2xl">Any cravings today?</span>
            </h1>
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search food, drinks, pharmacies, stores..."
                className="pl-11 h-14 rounded-2xl bg-white border border-secondary/20 shadow-md text-foreground placeholder:text-muted-foreground/60 text-base"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
          </div>

          {/* Promotional Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-primary to-[#2C386C] p-6 text-white relative overflow-hidden shadow-lg border border-white/5">
            <div className="relative z-10 max-w-[65%] space-y-2">
              <span className="inline-flex items-center gap-1 bg-white/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-xs">
                <Sparkles className="h-3 w-3 text-amber-400" /> Promo Code: YAJJAFREE
              </span>
              <h3 className="text-2xl font-extrabold leading-tight">Free Delivery on your first order!</h3>
              <p className="text-xs text-white/80">Satisfy your cravings from Yajja's best local food and drinks.</p>
              <Button
                onClick={() => setLocation("/shop")}
                size="sm"
                className="bg-brand-yellow hover:bg-brand-yellow/90 text-[#1A2340] font-bold rounded-xl text-xs px-5 py-2.5 mt-2"
              >
                Explore Deals
              </Button>
            </div>
            <div className="absolute right-2 -bottom-2 w-48 h-48 opacity-20 bg-[radial-gradient(circle,_#ffffff_10%,_transparent_60%)] rounded-full" />
            <div className="absolute right-6 bottom-4 text-white/10 pointer-events-none">
              <UtensilsCrossed className="h-32 w-32 rotate-12" />
            </div>
          </div>
        </div>
      </div>

      {/* Live Order Tracking Banner */}
      {liveOrders.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <Link href="/orders/track">
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-emerald-500/15 transition-all">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                  <Clock className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-foreground">
                    You have active orders!
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Track the live status of your {liveOrders.length === 1 ? "delivery" : `${liveOrders.length} deliveries`}.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-primary flex items-center gap-0.5">
                Track Live <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* Categories Section */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-lg font-extrabold text-foreground mb-4 flex items-center gap-1.5">
          <Compass className="h-5 w-5 text-primary" /> What should we get you?
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => {
            const style = CATEGORY_STYLES[cat.id];
            return (
              <Link key={cat.id} href={cat.href}>
                <div className={`w-full aspect-[3/4] flex flex-col items-center justify-between p-5 rounded-3xl cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 shadow-md border border-white/10 ${style.bg}`}>
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${style.iconBg} ${style.iconColor}`}>
                    <cat.Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center my-3 min-w-0">
                    <p className={`text-sm font-extrabold leading-snug tracking-tight text-center ${style.textColor}`}>{cat.label}</p>
                    <p className={`text-[10px] mt-1 text-center line-clamp-2 leading-normal px-2 ${style.descColor}`}>{cat.desc}</p>
                  </div>
                  <div className={`w-full py-2 rounded-xl text-center text-xs font-black shadow-xs tracking-wide uppercase ${style.ctaBg} ${style.ctaText}`}>
                    {style.ctaLabel}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Same as last time (Recent Orders) */}
      {recentOrders.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-foreground flex items-center gap-1.5">
              <RotateCcw className="h-5 w-5 text-primary" /> The usual?
            </h2>
            <Link href="/orders" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5">
              All orders <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentOrders.map((order: any) => {
              const displayLabel = order.items && order.items.length > 0
                ? order.items.map((it: any) => `${it.productName} x${it.quantity}`).join(", ")
                : "Your order";
              return (
                <div
                  key={order.id}
                  onClick={() => handleReorderClick(order)}
                  className="rounded-2xl bg-white border border-secondary/10 p-4 flex items-center gap-3 hover:border-primary/25 hover:shadow-xs transition-all cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <RotateCcw className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm text-foreground truncate">{displayLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.vendorName || "Store"} • {formatKES(order.total)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-primary inline-flex items-center gap-0.5 shrink-0 hover:underline">
                    Reorder <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Product Customization Modal for Reorder */}
      <ProductModal
        open={modalOpen}
        product={selectedProduct}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmAddToCart}
        isSubmitting={addToCartMutation.isPending}
        initialQuantity={initialQuantity}
        initialInstructions={initialInstructions}
        initialSelectedAddonIds={initialAddonIds}
      />

      {/* Popular Restaurants / Stores */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-1.5">
            <Flame className="h-5 w-5 text-amber-500" /> Popular Near You
          </h2>
          <Link href="/shop" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5">
            See all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loadingPopular ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-secondary/10 overflow-hidden animate-pulse">
                <div className="h-44 bg-muted" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : popular.length === 0 ? (
          <div className="rounded-2xl bg-white border border-dashed border-secondary/20 p-8 text-center shadow-xs">
            <Store className="mx-auto h-10 w-10 text-muted-foreground opacity-30 mb-2" />
            <p className="text-sm text-muted-foreground font-medium">No stores available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popular.map((v) => <RestaurantCard key={v.id} vendor={v} />)}
          </div>
        )}
      </div>
    </div>
  );
}
