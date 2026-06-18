import React, { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useListRiderOrders, getListRiderOrdersQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  History,
  Phone
} from "lucide-react";
import { formatKES } from "@/lib/format";

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  manual_review: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const statusLabel: Record<string, string> = {
  pending: "Awaiting Confirmation",
  processing: "Processing Payout",
  completed: "Paid",
  manual_review: "Under Review",
};

export default function RiderEarningsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: riderProfile } = useQuery({
    queryKey: ["rider", "me"],
    queryFn: async () => {
      const token = localStorage.getItem("yajja_token");
      const res = await fetch("/api/riders/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load rider profile");
      return res.json();
    },
  });

  const { data: orders, isLoading } = useListRiderOrders(
    undefined,
    {
      query: {
        queryKey: getListRiderOrdersQueryKey(),
        enabled: !!riderProfile?.id,
        refetchInterval: 5000,
      },
    }
  );

  // Filter only the orders assigned to the logged-in rider and calculate rider amount
  const riderDeliveries = useMemo(() => {
    if (!riderProfile?.id) return [];
    return ((orders as any[]) || [])
      .filter((o) => o.riderId === riderProfile.id)
      .map((o) => {
        // Rider receives 80% of delivery fee
        const riderAmount = Math.max(0, o.deliveryFee * 0.80);
        return {
          ...o,
          riderAmount,
        };
      });
  }, [orders, riderProfile]);

  // KPIs
  const stats = useMemo(() => {
    let totalEarned = 0;
    let completedCount = 0;
    let pendingEarned = 0;

    riderDeliveries.forEach((o) => {
      if (o.status === "delivered") {
        completedCount++;
      }
      if (o.riderDisbursementStatus === "completed") {
        totalEarned += o.riderAmount;
      } else if (o.riderDisbursementStatus === "pending" || o.riderDisbursementStatus === "processing") {
        pendingEarned += o.riderAmount;
      }
    });

    return { totalEarned, completedCount, pendingEarned };
  }, [riderDeliveries]);

  // Apply filters
  const filteredDeliveries = useMemo(() => {
    return riderDeliveries.filter((o) => {
      const matchesSearch =
        o.orderCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toString().includes(searchTerm) ||
        o.riderDisbursementReceipt?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus =
        statusFilter === "all" || o.riderDisbursementStatus === statusFilter;

      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && new Date(o.createdAt) >= new Date(startDate);
      }
      if (endDate) {
        // End date should include the whole day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(o.createdAt) <= end;
      }

      return matchesSearch && matchesStatus && matchesDate;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [riderDeliveries, searchTerm, statusFilter, startDate, endDate]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleString("en-UG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
        
        {/* Header Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-white border shadow-sm shrink-0 hover:bg-slate-50"
            onClick={() => setLocation("/rider-portal")}
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-[#1A2340]">Earnings & Payouts</h1>
            <p className="text-sm text-slate-500">Track your delivery payouts and B2C M-Pesa records</p>
          </div>
        </div>

        {/* Security Banner */}
        <div className="bg-[#1A2340] text-white rounded-2xl p-4 shadow-sm flex items-start gap-3 border border-white/5">
          <ShieldCheck className="h-5 w-5 text-[#22C55E] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-extrabold text-sm">Automated Delivery Payout Release</p>
            <p className="text-white/80 leading-relaxed">
              Upon delivering the order, once the customer confirms receipt on their device, the system automatically triggers a B2C M-Pesa payout to your registered phone number. The delivery fee (KES 50) is split as 80% to you (KES 40) and 20% to the platform.
            </p>
          </div>
        </div>

        {/* KPI Summaries */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Earned</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{formatKES(stats.totalEarned)}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deliveries Completed</p>
                <p className="text-2xl font-black text-[#1A2340] mt-1">{stats.completedCount} trips</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Release</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{formatKES(stats.pendingEarned)}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls */}
        <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Order Code or Payout Receipt..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#1A2340] focus:border-transparent"
                />
              </div>

              {/* Status Filters */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {[
                  { label: "All Logs", value: "all" },
                  { label: "Paid", value: "completed" },
                  { label: "Pending", value: "pending" },
                  { label: "Failed/Review", value: "manual_review" },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                      statusFilter === tab.value
                        ? "bg-[#1A2340] text-white border-transparent"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1A2340] focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1A2340] focus:border-transparent"
                />
              </div>
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-rose-600 hover:bg-rose-50 h-8 rounded-lg"
                  onClick={clearDateFilters}
                >
                  Clear Dates
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Log Ledger */}
        <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-slate-500">Loading earnings history...</p>
            </div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="text-center py-20 px-4">
              <History className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-800">No earnings record</h3>
              <p className="text-sm text-slate-500 mt-1">
                Completed delivery payout receipts will appear in this ledger.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date & Time</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Code</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Payout Amount</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">M-Pesa Phone</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Transaction ID</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeliveries.map((delivery) => {
                    const status = delivery.riderDisbursementStatus || "pending";
                    return (
                      <tr key={delivery.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 whitespace-nowrap text-xs text-slate-600 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formatDate(delivery.createdAt)}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <p className="text-sm font-extrabold text-[#1A2340]">
                            {delivery.orderCode || `#${delivery.id}`}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Store: {delivery.vendorName || "Merchant"}
                          </p>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <p className="text-sm font-extrabold text-emerald-600">
                            {formatKES(delivery.riderAmount)}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold">
                            (80% of {formatKES(delivery.deliveryFee)})
                          </p>
                        </td>
                        <td className="p-4 whitespace-nowrap text-xs font-semibold text-slate-600">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {user?.phone || "—"}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap text-xs font-mono font-bold text-slate-700">
                          {delivery.riderDisbursementReceipt ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">
                              {delivery.riderDisbursementReceipt}
                            </span>
                          ) : status === "manual_review" ? (
                            <span className="text-rose-500 font-semibold text-[11px] block max-w-[150px] truncate" title={delivery.riderDisbursementError}>
                              {delivery.riderDisbursementError || "Payout failed"}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Processing...</span>
                          )}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <Badge
                            className={`text-[10px] font-extrabold border py-0.5 px-2 rounded-full ${statusColor[status] || ""}`}
                            variant="outline"
                          >
                            {statusLabel[status] || status.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
