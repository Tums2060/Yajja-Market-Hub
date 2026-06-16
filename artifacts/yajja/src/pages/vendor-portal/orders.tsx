import React, { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useListVendorOrders, useUpdateOrderStatus, getListVendorOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ShoppingBag,
  Loader2,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Package,
} from "lucide-react";

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  accepted: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  preparing: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  ready: "bg-green-500/10 text-green-600 border-green-500/20",
  picked_up: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  delivered: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  rejected: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const statusBorder: Record<string, string> = {
  pending: "border-amber-500/40 ring-1 ring-amber-500/20",
  accepted: "border-blue-500/30",
  confirmed: "border-blue-500/30",
  preparing: "border-orange-500/30",
  ready: "border-green-500/30",
  picked_up: "border-purple-500/20",
};

const nextStatus: Record<string, string> = {
  pending: "accepted",
  accepted: "preparing",
  confirmed: "preparing",
  preparing: "ready",
};

const nextStatusAction: Record<string, string> = {
  pending: "Accept Order",
  accepted: "Start Preparing",
  confirmed: "Start Preparing",
  preparing: "Mark as Ready",
};

export default function VendorOrders() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [activeSubFilter, setActiveSubFilter] = useState<string>("all");
  const [completedSubFilter, setCompletedSubFilter] = useState<string>("all");

  useRealtimeOrders();

  // Fetch all vendor orders
  const { data: orders, isLoading } = useListVendorOrders(
    {},
    {
      query: {
        queryKey: getListVendorOrdersQueryKey(),
        enabled: true,
        refetchInterval: 5000,
      },
    }
  );

  const updateStatus = useUpdateOrderStatus();

  const handleAdvance = (orderId: number, currentStatus: string) => {
    const next = nextStatus[currentStatus];
    if (!next) return;
    updateStatus.mutate({ orderId, data: { status: next } } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorOrdersQueryKey() });
        toast({ title: `Order is now ${next.replace(/_/g, " ")}` });
      },
      onError: () => toast({ variant: "destructive", title: "Failed to update status" }),
    });
  };

  const handleReject = (orderId: number) => {
    updateStatus.mutate({ orderId, data: { status: "rejected" } } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorOrdersQueryKey() });
        toast({ title: "Order rejected" });
      },
      onError: () => toast({ variant: "destructive", title: "Failed to reject order" }),
    });
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  // Segregate active vs completed orders
  const allActiveOrders = useMemo(() => {
    return (orders as any[] || []).filter((o) =>
      ["pending", "accepted", "confirmed", "preparing", "ready", "picked_up"].includes(o.status)
    );
  }, [orders]);

  const allCompletedOrders = useMemo(() => {
    return (orders as any[] || []).filter((o) =>
      ["delivered", "cancelled", "rejected"].includes(o.status)
    );
  }, [orders]);

  // Apply sub-filters and sorting to Active Orders
  const filteredActiveOrders = useMemo(() => {
    let list = [...allActiveOrders];
    if (activeSubFilter !== "all") {
      list = list.filter((o) => o.status === activeSubFilter);
    }
    
    // Sort logic: pending first, then accepted, then preparing, then ready/picked_up.
    // If same status, newest first.
    const priority: Record<string, number> = {
      pending: 0,
      accepted: 1,
      confirmed: 2,
      preparing: 3,
      ready: 4,
      picked_up: 5,
    };

    return list.sort((a, b) => {
      const pA = priority[a.status] ?? 99;
      const pB = priority[b.status] ?? 99;
      if (pA !== pB) return pA - pB;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [allActiveOrders, activeSubFilter]);

  // Apply sub-filters and sorting to Completed Orders
  const filteredCompletedOrders = useMemo(() => {
    let list = [...allCompletedOrders];
    if (completedSubFilter !== "all") {
      list = list.filter((o) => o.status === completedSubFilter);
    }
    // Newest completed first
    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [allCompletedOrders, completedSubFilter]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
        
        {/* Header Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-white border shadow-sm shrink-0 hover:bg-slate-50"
            onClick={() => setLocation("/vendor-portal")}
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-[#1A2340]">Orders Dashboard</h1>
            <p className="text-sm text-slate-500">Manage your active orders and track history</p>
          </div>
        </div>

        {/* Tab System */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-2 p-1.5 bg-white border border-slate-100 rounded-2xl shadow-sm h-14">
            <TabsTrigger
              value="active"
              className="rounded-xl font-bold text-sm transition-all py-2.5 data-[state=active]:bg-[#1A2340] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              Active Orders
              {allActiveOrders.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full font-extrabold animate-pulse">
                  {allActiveOrders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="rounded-xl font-bold text-sm transition-all py-2.5 data-[state=active]:bg-[#1A2340] data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              Completed History
              {allCompletedOrders.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-slate-200 text-slate-700 rounded-full font-bold">
                  {allCompletedOrders.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Active Orders Content */}
          <TabsContent value="active" className="space-y-4 outline-none">
            {/* Active Sub-Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { label: "All Active", value: "all" },
                { label: "Incoming", value: "pending" },
                { label: "Accepted", value: "accepted" },
                { label: "Preparing", value: "preparing" },
                { label: "Ready", value: "ready" },
                { label: "In Transit", value: "picked_up" },
              ].map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => setActiveSubFilter(pill.value)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                    activeSubFilter === pill.value
                      ? "bg-[#1A2340] text-white border-transparent"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-slate-500">Loading orders...</p>
              </div>
            ) : filteredActiveOrders.length === 0 ? (
              <Card className="text-center py-16 border-dashed bg-white shadow-sm rounded-2xl">
                <ShoppingBag className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <h3 className="font-bold text-slate-800">No active orders</h3>
                <p className="text-sm text-slate-500 mt-1">Orders waiting to be processed will appear here.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredActiveOrders.map((order) => {
                  const isNew = order.status === "pending";
                  return (
                    <Card
                      key={order.id}
                      className={`overflow-hidden transition-all duration-300 bg-white border ${
                        statusBorder[order.status] || "border-slate-200"
                      } rounded-2xl shadow-sm hover:shadow-md`}
                    >
                      {isNew && (
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 flex items-center justify-between text-xs font-extrabold animate-pulse">
                          <span className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            NEW ORDER RECEIVED
                          </span>
                          <span>ACTION REQUIRED</span>
                        </div>
                      )}
                      
                      <CardContent className="p-5 space-y-4">
                        {/* Order Identity & Status */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-[#1A2340] text-lg">
                                Order {order.orderCode || `#${order.id}`}
                              </h3>
                              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {formatTimeAgo(order.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 font-semibold mt-1">
                              {order.customerName || "Customer"} • {order.customerPhone || "No phone"}
                            </p>
                          </div>
                          <Badge className={`text-xs px-2.5 py-1 font-bold border ${statusColor[order.status] || ""}`} variant="outline">
                            {order.status?.replace(/_/g, " ").toUpperCase()}
                          </Badge>
                        </div>

                        {/* Delivery Address */}
                        {order.deliveryAddress && (
                          <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2.5">
                            <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                            <div className="text-xs text-slate-600">
                              <p className="font-bold text-slate-700">Delivery Address</p>
                              <p className="mt-0.5">{order.deliveryAddress}</p>
                            </div>
                          </div>
                        )}

                        {/* Items Checklist */}
                        <div className="border border-slate-100 rounded-xl p-4 space-y-3 bg-white">
                          <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">Order Items</p>
                          <div className="divide-y divide-slate-50">
                            {(order.items || []).map((item: any) => (
                              <div key={item.id} className="py-2 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                                <div className="space-y-0.5">
                                  <p className="text-sm font-bold text-[#1A2340]">{item.productName}</p>
                                  {item.notes && (
                                    <p className="text-xs text-amber-600 font-medium italic flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3 shrink-0" /> Note: {item.notes}
                                    </p>
                                  )}
                                </div>
                                <span className="text-sm font-black bg-slate-100 text-[#1A2340] px-2.5 py-0.5 rounded-lg shrink-0">
                                  qty: {item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions Block */}
                        <div className="flex gap-3 pt-2">
                          {isNew ? (
                            <>
                              <Button
                                size="lg"
                                className="flex-1 rounded-xl bg-[#1A2340] text-white font-extrabold hover:bg-slate-800 shadow-sm"
                                onClick={() => handleAdvance(order.id, order.status)}
                                disabled={updateStatus.isPending}
                              >
                                Accept Order
                              </Button>
                              <Button
                                size="lg"
                                variant="outline"
                                className="flex-1 rounded-xl border-rose-200 text-rose-600 font-bold hover:bg-rose-50/50"
                                onClick={() => handleReject(order.id)}
                                disabled={updateStatus.isPending}
                              >
                                Reject
                              </Button>
                            </>
                          ) : (
                            nextStatus[order.status] && (
                              <Button
                                size="lg"
                                className="w-full rounded-xl bg-[#1A2340] text-white font-extrabold hover:bg-slate-800 shadow-sm"
                                onClick={() => handleAdvance(order.id, order.status)}
                                disabled={updateStatus.isPending}
                              >
                                {nextStatusAction[order.status] || `Mark as ${nextStatus[order.status]?.replace(/_/g, " ")}`}
                              </Button>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Completed History Content */}
          <TabsContent value="completed" className="space-y-4 outline-none">
            {/* Completed Sub-Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { label: "All Completed", value: "all" },
                { label: "Delivered", value: "delivered" },
                { label: "Cancelled", value: "cancelled" },
                { label: "Rejected", value: "rejected" },
              ].map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => setCompletedSubFilter(pill.value)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                    completedSubFilter === pill.value
                      ? "bg-[#1A2340] text-white border-transparent"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-slate-500">Loading history...</p>
              </div>
            ) : filteredCompletedOrders.length === 0 ? (
              <Card className="text-center py-16 border-dashed bg-white shadow-sm rounded-2xl">
                <ShoppingBag className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <h3 className="font-bold text-slate-800">No completed orders</h3>
                <p className="text-sm text-slate-500 mt-1">Your delivered or cancelled orders will be archived here.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredCompletedOrders.map((order) => (
                  <Card key={order.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-slate-200 transition-colors">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-extrabold text-[#1A2340]">Order {order.orderCode || `#${order.id}`}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {order.customerName || "Customer"} • {formatTimeAgo(order.createdAt)}
                          </p>
                        </div>
                        <Badge className={`text-xs px-2.5 py-0.5 font-bold border ${statusColor[order.status] || ""}`} variant="outline">
                          {order.status?.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="bg-slate-50/50 rounded-xl p-2.5 text-xs text-slate-600 space-y-1">
                        {(order.items || []).map((item: any) => (
                          <div key={item.id} className="flex justify-between font-medium">
                            <span>{item.productName}</span>
                            <span className="text-slate-400">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold pt-1 text-slate-500 border-t border-slate-50">
                        <span>Total Paid</span>
                        <span className="text-emerald-600 font-extrabold">KES {order.total?.toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
