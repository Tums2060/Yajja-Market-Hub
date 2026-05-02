import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Store, Package, TrendingUp, Clock, Truck, AlertCircle, Loader2, ChevronRight } from "lucide-react";

function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => customFetch("/api/admin/stats").then(r => r.json()),
    refetchInterval: 30000,
  });
}

const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{title}</p>
        <p className="text-xl font-extrabold leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const s = stats as any;

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <span className="text-2xl">🛡️</span> Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Platform overview & management</p>
        </div>
        {s?.pendingVendors > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" /> {s.pendingVendors} pending review
          </Badge>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Total Users" value={s?.totalUsers || 0} sub="Registered accounts" icon={Users} color="bg-blue-500" />
        <StatCard title="Vendors" value={s?.totalVendors || 0} sub={`${s?.pendingVendors || 0} pending review`} icon={Store} color="bg-purple-500" />
        <StatCard title="Orders Today" value={s?.todayOrders || 0} sub={`${s?.pendingOrders || 0} in progress`} icon={Package} color="bg-amber-500" />
        <StatCard title="Active Riders" value={s?.activeRiders || 0} sub="Available now" icon={Truck} color="bg-emerald-500" />
      </div>

      {/* Revenue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Revenue Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Today</span>
              <span className="font-bold">UGX {Number(s?.todayRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Platform Revenue</span>
              <span className="font-bold text-lg">UGX {Number(s?.totalRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Total Orders</span>
              <span className="font-bold">{s?.totalOrders || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* 7-day chart (bar) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Last 7 Days Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {s?.revenueChart && (
              <div className="flex items-end gap-1.5 h-28">
                {s.revenueChart.map((d: any, i: number) => {
                  const maxOrders = Math.max(...s.revenueChart.map((x: any) => x.orders), 1);
                  const pct = (d.orders / maxOrders) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-muted-foreground font-medium">{d.orders}</span>
                      <div
                        className="w-full rounded-t-sm bg-primary/80 min-h-[4px] transition-all"
                        style={{ height: `${Math.max(pct, 5)}%` }}
                      />
                      <span className="text-[9px] text-muted-foreground">{d.date}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: "/admin/vendors", label: "Manage Vendors", sub: `${s?.pendingVendors || 0} need review`, icon: Store, badge: s?.pendingVendors },
          { href: "/admin/orders", label: "Monitor Orders", sub: `${s?.pendingOrders || 0} active orders`, icon: Package, badge: s?.pendingOrders },
          { href: "/admin/riders", label: "Manage Riders", sub: `${s?.activeRiders || 0} active now`, icon: Truck, badge: null },
        ].map(({ href, label, sub, icon: Icon, badge }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{label}</p>
                    {badge > 0 && <Badge className="h-4 px-1 text-[10px]">{badge}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
