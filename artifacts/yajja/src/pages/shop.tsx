import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useListVendors, Category } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, Search, ShoppingBag } from "lucide-react";

export default function Shop() {
  const [search, setSearch] = useState("");
  const { data: vendors, isLoading } = useListVendors({ query: { enabled: true } });
  
  const categories = [
    { id: "all", name: "All", icon: "🏪" },
    { id: "food", name: "Food", icon: "🍔" },
    { id: "liquor", name: "Liquor", icon: "🍷" },
    { id: "pharmacy", name: "Pharmacy", icon: "💊" },
    { id: "household", name: "Household", icon: "🧻" },
  ];
  
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredVendors = vendors?.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || 
                          (v.description && v.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = activeCategory === "all" || v.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container py-8 px-4 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Explore Neighborhood</h1>
          <p className="text-muted-foreground mt-1">Discover local favorites and essentials</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search stores..." 
            className="pl-9 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex flex-col items-center justify-center min-w-[100px] p-3 rounded-xl border transition-all ${
              activeCategory === cat.id 
                ? "border-primary bg-primary/10 text-primary shadow-sm" 
                : "border-border bg-card hover:bg-accent/50 text-foreground"
            }`}
          >
            <span className="text-3xl mb-2">{cat.icon}</span>
            <span className="text-sm font-semibold">{cat.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="h-48 bg-muted w-full" />
              <CardContent className="p-4 space-y-3">
                <div className="h-5 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : filteredVendors?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <ShoppingBag className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p>No stores found matching your criteria</p>
          </div>
        ) : (
          filteredVendors?.map(vendor => (
            <Link key={vendor.id} href={`/vendor/${vendor.id}`}>
              <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group">
                <div className="relative h-48 bg-muted overflow-hidden">
                  {vendor.imageUrl ? (
                    <img 
                      src={vendor.imageUrl} 
                      alt={vendor.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                      <ShoppingBag className="h-16 w-16" />
                    </div>
                  )}
                  {!vendor.isOpen && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                      <Badge variant="destructive" className="text-sm px-3 py-1">Closed</Badge>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    <Badge className="bg-background/90 text-foreground backdrop-blur-sm border-none shadow-sm flex items-center gap-1 font-semibold">
                      <Star className="h-3 w-3 fill-primary text-primary" /> {vendor.rating?.toFixed(1) || "New"}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg leading-tight truncate pr-2">{vendor.name}</h3>
                    <Badge variant="outline" className="capitalize shrink-0">{vendor.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                    {vendor.description || "No description available"}
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground font-medium">
                    <Clock className="h-4 w-4 mr-1 text-primary/70" />
                    <span>{vendor.deliveryTime || "30-45 min"}</span>
                    <span className="mx-2">•</span>
                    <span>Min ${vendor.minOrder || 0}</span>
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
