import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Truck, Star, Package, ToggleLeft, ToggleRight, Loader2, User } from "lucide-react";

function useAdminRiders() {
  return useQuery({
    queryKey: ["admin-riders"],
    queryFn: () => customFetch("/api/admin/riders").then(r => r.json()),
  });
}

function useToggleRider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (riderId: number) =>
      customFetch(`/api/admin/riders/${riderId}/toggle`, { method: "PUT" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-riders"] }),
  });
}

export default function AdminRiders() {
  const { data: riders, isLoading } = useAdminRiders();
  const toggleMutation = useToggleRider();
  const { toast } = useToast();

  const list = riders as any[] || [];
  const activeCount = list.filter((r: any) => r.isAvailable).length;

  const handleToggle = (rider: any) => {
    toggleMutation.mutate(rider.id, {
      onSuccess: () => toast({ title: rider.isAvailable ? "Rider marked unavailable" : "Rider marked available" }),
      onError: () => toast({ variant: "destructive", title: "Failed to update rider" }),
    });
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Rider Management
          </h1>
          <p className="text-muted-foreground text-sm">{activeCount} of {list.length} riders currently active</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">
            {activeCount} Active
          </Badge>
          <Badge variant="outline">
            {list.length - activeCount} Inactive
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Truck className="mx-auto h-12 w-12 opacity-20 mb-4" />
          <p>No riders registered yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((rider: any) => (
            <Card key={rider.id} className={rider.isAvailable ? "border-emerald-200 bg-emerald-50/30" : "opacity-75"}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold">{rider.user?.name || `Rider #${rider.id}`}</p>
                      <Badge
                        variant={rider.isAvailable ? "default" : "outline"}
                        className={`text-xs ${rider.isAvailable ? "bg-emerald-500 border-emerald-500" : ""}`}
                      >
                        {rider.isAvailable ? "Available" : "Offline"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{rider.user?.email}</p>
                    {rider.user?.phone && <p className="text-xs text-muted-foreground">{rider.user.phone}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-sm font-bold">{rider.totalDeliveries}</p>
                    <p className="text-[10px] text-muted-foreground">Deliveries</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-sm font-bold flex items-center justify-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {rider.rating?.toFixed(1) || "5.0"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Rating</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-sm font-bold capitalize">{rider.vehicleType || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Vehicle</p>
                  </div>
                </div>

                {rider.licensePlate && (
                  <p className="text-xs text-muted-foreground text-center">🚗 {rider.licensePlate}</p>
                )}

                <Button
                  variant={rider.isAvailable ? "outline" : "default"}
                  size="sm"
                  className="w-full text-xs gap-2"
                  onClick={() => handleToggle(rider)}
                  disabled={toggleMutation.isPending}
                >
                  {rider.isAvailable
                    ? <><ToggleRight className="h-4 w-4 text-emerald-500" /> Mark Unavailable</>
                    : <><ToggleLeft className="h-4 w-4" /> Mark Available</>
                  }
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
