import React, { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useListVendorOrders, getListVendorOrdersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  DollarSign,
  Receipt,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileText
} from "lucide-react";
import { formatKES } from "@/lib/format";

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  manual_review: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const statusLabel: Record<string, string> = {
  pending: "Pending Callback",
  processing: "Processing Payout",
  completed: "Disbursed",
  manual_review: "Action Required",
};

export default function PayoutsPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const vendorOrders = useMemo(() => {
    return (orders as any[] || []).map((o) => {
      const vendorAmount = Math.max(0, o.total - o.deliveryFee);
      return {
        ...o,
        vendorAmount,
      };
    });
  }, [orders]);

  // KPIs
  const stats = useMemo(() => {
    let totalPaid = 0;
    let totalPending = 0;
    let totalFailed = 0;

    vendorOrders.forEach((o) => {
      if (o.disbursementStatus === "completed") {
        totalPaid += o.vendorAmount;
      } else if (o.disbursementStatus === "manual_review") {
        totalFailed += o.vendorAmount;
      } else {
        totalPending += o.vendorAmount;
      }
    });

    return { totalPaid, totalPending, totalFailed };
  }, [vendorOrders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return vendorOrders.filter((o) => {
      const matchesSearch =
        o.orderCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toString().includes(searchTerm) ||
        o.disbursementReceipt?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus =
        statusFilter === "all" || o.disbursementStatus === statusFilter;

      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [vendorOrders, searchTerm, statusFilter]);

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

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
        
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
            <h1 className="text-2xl font-black text-[#1A2340]">Payout Proofs</h1>
            <p className="text-sm text-slate-500">Official records of automated M-Pesa vendor disbursements</p>
          </div>
        </div>

        {/* Informative Alert Banner */}
        <div className="bg-[#1A2340] text-white rounded-2xl p-4 shadow-sm flex items-start gap-3 border border-white/5">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-extrabold text-sm">Automated Split Payout Ledger</p>
            <p className="text-white/80 leading-relaxed">
              When a customer completes payment via STK Push, the platform automatically keeps the platform fee (KES 40) and instantly routes your portion (Total - KES 40) directly to your configured payout method. All records here are fetched in real time directly from the Safaricom Daraja API callbacks.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Disbursed</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{formatKES(stats.totalPaid)}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Processing / Pending</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{formatKES(stats.totalPending)}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Failed / Hold</p>
                <p className="text-2xl font-black text-rose-600 mt-1">{formatKES(stats.totalFailed)}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Order Code or Transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#1A2340] focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              {[
                { label: "All Proofs", value: "all" },
                { label: "Disbursed", value: "completed" },
                { label: "Pending", value: "pending" },
                { label: "Failed/Held", value: "manual_review" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                    statusFilter === tab.value
                      ? "bg-[#1A2340] text-white border-transparent"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-slate-500">Loading payout records...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-20 px-4">
              <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-800">No payout records found</h3>
              <p className="text-sm text-slate-500 mt-1">
                Payout records will display here after customer order payments are settled.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date & Time</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Order Details</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Calculated Split</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">M-Pesa Payout ID</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const status = order.disbursementStatus || "pending";
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="p-4 whitespace-nowrap text-xs text-slate-600 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formatDate(order.createdAt)}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <p className="text-sm font-extrabold text-[#1A2340]">
                            {order.orderCode || `#${order.id}`}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Customer: {order.customerName || "Default User"}
                          </p>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <p className="text-sm font-extrabold text-emerald-600">
                            {formatKES(order.vendorAmount)}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            ({formatKES(order.total)} - KES {order.deliveryFee})
                          </p>
                        </td>
                        <td className="p-4 whitespace-nowrap text-xs font-mono font-bold text-slate-700">
                          {order.disbursementReceipt ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">
                              {order.disbursementReceipt}
                            </span>
                          ) : status === "manual_review" ? (
                            <span className="text-rose-500 font-semibold text-[11px] leading-relaxed block max-w-[180px] truncate">
                              Error: {order.disbursementError || "No receipt"}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Awaiting confirmation</span>
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
