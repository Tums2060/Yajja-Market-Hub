export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Order Placed",
  paid: "Order Placed",
  accepted: "Vendor Confirmed",
  confirmed: "Vendor Confirmed",
  preparing: "Being Prepared",
  ready: "Ready for Pickup",
  picked_up: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

export function orderStatusLabel(status?: string | null): string {
  if (!status) return "Order Placed";
  return ORDER_STATUS_LABELS[status] || status.replace(/_/g, " ");
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "bg-secondary/30 text-amber-800 border-secondary/50",
  paid: "bg-secondary/30 text-amber-800 border-secondary/50",
  accepted: "bg-primary/15 text-primary border-primary/30",
  confirmed: "bg-primary/15 text-primary border-primary/30",
  preparing: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  ready: "bg-primary/10 text-primary border-primary/20",
  picked_up: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  delivered: "bg-green-500/15 text-green-700 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-700 border-red-500/30",
  rejected: "bg-red-500/15 text-red-700 border-red-500/30",
};

const STEP_ORDER = ["pending", "accepted", "preparing", "ready", "picked_up", "delivered"];

export const ORDER_STEPS: { key: string; label: string }[] = [
  { key: "pending", label: "Order Placed" },
  { key: "accepted", label: "Vendor Confirmed" },
  { key: "preparing", label: "Being Prepared" },
  { key: "ready", label: "Ready for Pickup" },
  { key: "picked_up", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
];

export function orderStepIndex(status?: string | null): number {
  if (!status) return 0;
  if (status === "paid") return 0;
  if (status === "confirmed") return STEP_ORDER.indexOf("accepted");
  return STEP_ORDER.indexOf(status);
}
