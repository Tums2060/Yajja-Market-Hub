export function formatOrderCode(orderId: number): string {
  return `YJA-${String(orderId).padStart(6, "0")}`;
}
