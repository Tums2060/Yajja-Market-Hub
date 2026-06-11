import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Loader2 } from "lucide-react";

function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: () => customFetch("/api/admin/users"),
  });
}

const ROLE_STYLE: Record<string, string> = {
  customer: "bg-blue-100 text-blue-700 border-blue-200",
  vendor: "bg-blue-100 text-blue-700 border-blue-200",
  rider: "bg-amber-100 text-amber-700 border-amber-200",
  admin: "bg-red-100 text-red-700 border-red-200",
};

export default function AdminUsers() {
  const { data: users, isLoading } = useAdminUsers();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const list = (users as any[] || []).filter((u: any) => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> User Management
        </h1>
        <p className="text-muted-foreground text-sm">{(users as any[] || []).length} total registered users</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["all", "customer", "vendor", "rider", "admin"].map(r => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 ${
                filterRole === r ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/30"
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((user: any) => (
            <Card key={user.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{user.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_STYLE[user.role] || "bg-muted border-border"}`}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                </div>
                <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
