import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { useListVendors } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Store, Star, Clock } from "lucide-react";

export default function Shop() {
  const [search, setSearch] = useState("");

  const { data: vendors, isLoading } = useListVendors(
    search.trim() ? ({ search: search.trim() } as any) : {}
  );

  const vendorCards = useMemo(() => (vendors || []) as any[], [vendors]);

  return (
    <div className="container py-8 px-4 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Explore Stores</h1>
          <p className="text-muted-foreground mt-1">Discover restaurants and stores near you</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stores..."
            className="pl-9 h-11 bg-secondary/20 border-0 shadow-sm text-foreground placeholder:text-foreground/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse bg-white border-secondary/40">
              <div className="h-40 bg-muted w-full" />
              <CardContent className="p-4 space-y-3">
                <div className="h-5 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : vendorCards.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <Store className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p>No stores found.</p>
          </div>
        ) : (
          vendorCards.map((vendor) => (
            <Link key={vendor.id} href={`/vendor/${vendor.id}`}>
              <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 bg-white border-secondary/40">
                <div className="relative h-40 bg-muted overflow-hidden">
                  {vendor.imageUrl ? (
                    <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/20 text-primary/40">
                      <Store className="h-12 w-12" />
                    </div>
                  )}
                  {vendor.isOpen === false && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="secondary">Closed</Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg truncate pr-2">{vendor.name}</h3>
                    <Badge variant="outline" className="capitalize shrink-0">{vendor.category}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-secondary text-secondary" />
                      {(vendor.rating ?? 4.5).toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {vendor.deliveryTime || "25-35 min"}
                    </span>
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
