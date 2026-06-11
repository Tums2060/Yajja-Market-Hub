import React, { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Package,
  Loader2,
  MapPin,
  Navigation,
  Wallet,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import { formatKES } from "@/lib/format";

interface HistoryOrder {
  id: number;
  customerName: string;
  itemsSummary: string;
  itemsCount: number;
  total: number;
  earnings: number;
  deliveryAddress: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  completedAt: string;
  createdAt: string;
}

interface HistoryResponse {
  data: HistoryOrder[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function navigateUrl(o: HistoryOrder) {
  if (o.deliveryLat != null && o.deliveryLng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${o.deliveryLat},${o.deliveryLng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.deliveryAddress)}`;
}

export default function RiderHistory() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState("");
  const limit = 20;

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["rider-history", page],
    queryFn: () =>
      customFetch<HistoryResponse>(`/api/rider/orders/history?page=${page}&limit=${limit}`),
  });

  const orders = data?.data ?? [];

  const filtered = useMemo(() => {
    if (!dateFilter) return orders;
    return orders.filter((o) => o.completedAt.slice(0, 10) === dateFilter);
  }, [orders, dateFilter]);

  const totalEarnings = filtered.reduce((s, o) => s + o.earnings, 0);
  const totalDeliveries = data?.total ?? 0;

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/rider-portal")}>
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-extrabold flex-1">Delivery History</h1>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center text-foreground shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold leading-none">{totalDeliveries}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Deliveries</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-extrabold leading-none">{formatKES(totalEarnings)}</p>
              <p className="text-xs text-muted-foreground mt-1">Earnings (this page)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        />
        {dateFilter && (
          <Button variant="ghost" size="sm" onClick={() => setDateFilter("")}>
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <Card className="text-center py-14 border-dashed">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive/60 mb-3" />
          <p className="text-muted-foreground mb-4">Couldn't load your delivery history.</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-14 border-dashed">
          <Package className="mx-auto h-14 w-14 opacity-20 mb-3" />
          <p className="text-muted-foreground">
            {dateFilter ? "No deliveries on this date." : "No completed deliveries yet."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600 shrink-0">
                  <Package className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">Order #{o.id}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {o.itemsSummary || `${o.itemsCount} item(s)`} · {o.customerName}
                  </p>
                  {o.deliveryAddress && (
                    <div className="flex items-start gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                      <span className="truncate">{o.deliveryAddress}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(o.completedAt).toLocaleString("en-UG")}
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-2 h-8"
                  >
                    <a href={navigateUrl(o)} target="_blank" rel="noopener noreferrer">
                      <Navigation className="h-3.5 w-3.5 mr-1" /> Navigate
                    </a>
                  </Button>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="font-bold text-sm text-secondary">+{formatKES(o.earnings)}</span>
                  <span className="text-xs text-muted-foreground">{formatKES(o.total)} order</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
