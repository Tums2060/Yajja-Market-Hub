import React, { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useListVendors } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Star, Clock, ShoppingBag } from "lucide-react";

const CATEGORY_META: Record<string, {
  label: string; emoji: string; color: string;
  subcategories: { id: string; label: string; icon: string }[];
}> = {
  food: {
    label: "Food & Drinks",
    emoji: "🍔",
    color: "from-amber-400 to-orange-500",
    subcategories: [
      { id: "all", label: "All", icon: "🍽️" },
      { id: "local", label: "Local Dishes", icon: "🍲" },
      { id: "fast-food", label: "Fast Food", icon: "🍟" },
      { id: "breakfast", label: "Breakfast", icon: "🍳" },
      { id: "grills", label: "Grills", icon: "🍖" },
      { id: "seafood", label: "Seafood", icon: "🐟" },
      { id: "bakery", label: "Bakery", icon: "🥐" },
      { id: "drinks", label: "Drinks", icon: "🥤" },
      { id: "desserts", label: "Desserts", icon: "🍦" },
    ],
  },
  liquor: {
    label: "Liquor",
    emoji: "🍷",
    color: "from-purple-400 to-violet-600",
    subcategories: [
      { id: "all", label: "All", icon: "🍾" },
      { id: "beer", label: "Beer", icon: "🍺" },
      { id: "wine", label: "Wine", icon: "🍷" },
      { id: "whiskey", label: "Whiskey", icon: "🥃" },
      { id: "vodka", label: "Vodka", icon: "🫙" },
      { id: "gin", label: "Gin", icon: "🍸" },
      { id: "rum", label: "Rum", icon: "🍹" },
      { id: "non-alcoholic", label: "Non-Alcoholic", icon: "🧃" },
    ],
  },
  pharmacy: {
    label: "Health & Wellness",
    emoji: "💊",
    color: "from-emerald-400 to-teal-500",
    subcategories: [
      { id: "all", label: "All", icon: "🏥" },
      { id: "otc", label: "OTC Medicines", icon: "💊" },
      { id: "vitamins", label: "Vitamins", icon: "🌿" },
      { id: "skincare", label: "Skincare", icon: "🧴" },
      { id: "baby", label: "Baby Care", icon: "👶" },
      { id: "first-aid", label: "First Aid", icon: "🩹" },
      { id: "wellness", label: "Wellness", icon: "🧘" },
    ],
  },
  household: {
    label: "Convenience",
    emoji: "🛒",
    color: "from-blue-400 to-indigo-500",
    subcategories: [
      { id: "all", label: "All", icon: "🏠" },
      { id: "cleaning", label: "Cleaning", icon: "🧹" },
      { id: "kitchen", label: "Kitchen", icon: "🍳" },
      { id: "laundry", label: "Laundry", icon: "🧺" },
      { id: "stationery", label: "Stationery", icon: "📄" },
      { id: "electronics", label: "Electronics", icon: "🔌" },
      { id: "personal-care", label: "Personal Care", icon: "🪥" },
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
      <div className={`bg-gradient-to-br ${meta.color} relative overflow-hidden`} style={{ minHeight: "200px" }}>
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className="absolute -top-4 -right-4 w-40 h-40 rounded-full bg-white" />
          <div className="absolute bottom-0 left-10 w-24 h-24 rounded-full bg-white" />
        </div>
        <div className="relative z-10 px-4 pt-4 pb-6 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/80 hover:text-white hover:bg-white/15 mb-3 -ml-1"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-5xl">{meta.emoji}</span>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{meta.label}</h1>
              <p className="text-white/70 text-sm">{filtered.length} stores nearby</p>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${meta.label.toLowerCase()}...`}
              className="pl-10 h-11 rounded-xl bg-white border-0 shadow-md"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Scrollable subcategory tabs */}
      <div className="sticky top-14 z-20 bg-background border-b border-border shadow-sm">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 max-w-2xl mx-auto">
          {meta.subcategories.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveSub(sub.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium border transition-all shrink-0 ${
                activeSub === sub.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-foreground border-border hover:border-primary/30"
              }`}
            >
              <span className="text-base leading-none">{sub.icon}</span>
              {sub.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vendor list */}
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
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
              <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.99] border-border">
                <CardContent className="p-0 flex">
                  <div className="h-28 w-28 bg-muted shrink-0 relative overflow-hidden">
                    {vendor.imageUrl ? (
                      <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5 text-4xl">
                        {meta.emoji}
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
                        <span>Min UGX {Number(vendor.minOrder).toLocaleString()}</span>
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
