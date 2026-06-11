import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Search, Loader2, ShoppingBag } from "lucide-react";
import { formatKES } from "@/lib/format";

function useAdminCustomers() {
  return useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => customFetch("/api/admin/analytics/customers"),
  });
}

export default function AdminCustomers() {
  const { data: customers, isLoading } = useAdminCustomers();
  const [search, setSearch] = useState("");

  const all = (customers as any[]) || [];
  const list = all.filter((c: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Customers
        </h1>
        <p className="text-muted-foreground text-sm">{all.length} registered customers</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email or phone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <Card className="text-center py-14 border-dashed">
          <Users className="mx-auto h-14 w-14 opacity-20 mb-3" />
          <p className="text-muted-foreground">No customers found.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                  {c.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">{formatKES(c.totalSpent || 0)}</p>
                  <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                    <ShoppingBag className="h-3 w-3" /> {c.orders || 0} orders
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
