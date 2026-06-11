import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Store, Package, TrendingUp, Truck, AlertCircle, Loader2, ChevronRight, ShieldCheck } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => customFetch("/api/admin/stats"),
    refetchInterval: 30000,
  });
}

function useOrdersOverTime() {
  return useQuery({
    queryKey: ["admin-orders-over-time"],
    queryFn: () => customFetch("/api/admin/analytics/orders-over-time"),
    refetchInterval: 60000,
  });
}

function useRevenueByVendor() {
  return useQuery({
    queryKey: ["admin-revenue-by-vendor"],
    queryFn: () => customFetch("/api/admin/analytics/revenue-by-vendor"),
    refetchInterval: 60000,
  });
}

const PIE_COLORS = ["#1800AC", "#FFDE59", "#10b981", "#3b82f6", "#ef4444", "#6366f1"];

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
  const { data: ordersOverTime } = useOrdersOverTime();
  const { data: revenueByVendor } = useRevenueByVendor();

  const timeData = (ordersOverTime as any[]) || [];
  const vendorData = ((revenueByVendor as any[]) || [])
    .slice(0, 6)
    .map((v) => ({ ...v, name: v.vendorName ?? v.name ?? `Vendor #${v.vendorId}` }));

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
            <ShieldCheck className="h-6 w-6 text-primary" /> Admin Dashboard
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
        <StatCard title="Total Users" value={s?.totalUsers || 0} sub="Registered accounts" icon={Users} color="bg-secondary" />
        <StatCard title="Vendors" value={s?.totalVendors || 0} sub={`${s?.pendingVendors || 0} pending review`} icon={Store} color="bg-primary" />
        <StatCard title="Orders Today" value={s?.todayOrders || 0} sub={`${s?.pendingOrders || 0} in progress`} icon={Package} color="bg-primary" />
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
              <span className="font-bold">KES {Number(s?.todayRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Platform Revenue</span>
              <span className="font-bold text-lg">KES {Number(s?.totalRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Total Orders</span>
              <span className="font-bold">{s?.totalOrders || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by vendor (pie) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Share by Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            {vendorData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No revenue data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={vendorData}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(e: any) => e.name}
                  >
                    {vendorData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `KES ${Number(v).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Orders (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {timeData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No order data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={timeData} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#1800AC" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            {vendorData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No revenue data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={vendorData} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => `KES ${Number(v).toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="#1800AC" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: "/admin/vendors", label: "Manage Vendors", sub: `${s?.pendingVendors || 0} need review`, icon: Store, badge: s?.pendingVendors },
          { href: "/admin/orders", label: "Monitor Orders", sub: `${s?.pendingOrders || 0} active orders`, icon: Package, badge: s?.pendingOrders },
          { href: "/admin/riders", label: "Manage Riders", sub: `${s?.activeRiders || 0} active now`, icon: Truck, badge: null },
          { href: "/admin/customers", label: "Customers", sub: "Browse & search", icon: Users, badge: null },
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
