import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Store, Search, CheckCircle, XCircle, Clock, Loader2, Filter, Utensils, Wine, Pill, ShoppingCart } from "lucide-react";

function useAdminVendors() {
  return useQuery({
    queryKey: ["admin-vendors"],
    queryFn: () => customFetch("/api/admin/vendors"),
  });
}

function useVendorAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) =>
      customFetch(`/api/admin/vendors/${id}/${action}`, { method: "PUT" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-vendors"] }),
  });
}

const STATUS_CONFIG: Record<string, { label: string; variant: any; icon: any }> = {
  pending_review: { label: "Pending Review", variant: "outline", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
};

const CATEGORY_ICON: Record<string, any> = {
  food: Utensils, liquor: Wine, pharmacy: Pill, household: ShoppingCart,
};

export default function AdminVendors() {
  const { data: vendors, isLoading } = useAdminVendors();
  const actionMutation = useVendorAction();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const list = (vendors as any[] || []).filter((v: any) => {
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || v.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const pendingCount = (vendors as any[] || []).filter((v: any) => v.status === "pending_review").length;

  const handleAction = (id: number, action: "approve" | "reject") => {
    actionMutation.mutate({ id, action }, {
      onSuccess: () => toast({ title: action === "approve" ? "Vendor approved" : "Vendor rejected" }),
      onError: () => toast({ variant: "destructive", title: "Action failed" }),
    });
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" /> Vendor Management
          </h1>
          <p className="text-muted-foreground text-sm">Approve and manage vendor applications</p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="gap-1 text-sm px-3 py-1">
            <Clock className="h-3.5 w-3.5" /> {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["all", "pending_review", "approved", "rejected"].map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(s)}
              className="capitalize text-xs"
            >
              {s === "all" ? "All" : s === "pending_review" ? "Pending" : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Store className="mx-auto h-12 w-12 opacity-20 mb-4" />
          <p>No vendors found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((vendor: any) => {
            const statusCfg = STATUS_CONFIG[vendor.status] || STATUS_CONFIG.approved;
            const StatusIcon = statusCfg.icon;
            return (
              <Card key={vendor.id} className={vendor.status === "pending_review" ? "border-amber-300 bg-amber-50/50" : ""}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-primary shrink-0 overflow-hidden">
                    {vendor.imageUrl
                      ? <img src={vendor.imageUrl} className="w-full h-full object-cover" alt="" />
                      : React.createElement(CATEGORY_ICON[vendor.category] || Store, { className: "h-6 w-6" })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold truncate">{vendor.name}</h3>
                      <Badge variant="outline" className="text-xs capitalize shrink-0">{vendor.category}</Badge>
                      <Badge variant={statusCfg.variant} className="text-xs gap-1 shrink-0">
                        <StatusIcon className="h-3 w-3" /> {statusCfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {vendor.description || "No description"} · Added {new Date(vendor.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {vendor.status !== "approved" && (
                      <Button
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                        onClick={() => handleAction(vendor.id, "approve")}
                        disabled={actionMutation.isPending}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                    )}
                    {vendor.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-xs"
                        onClick={() => handleAction(vendor.id, "reject")}
                        disabled={actionMutation.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
