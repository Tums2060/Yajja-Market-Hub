export function formatKES(amount: number | null | undefined): string {
  const n = Number(amount) || 0;
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}

export const KENYA = {
  currency: "KES",
  city: "Nairobi",
  country: "Kenya",
  timezone: "Africa/Nairobi",
  phonePrefix: "+254",
  phonePlaceholder: "+254 700 000 000",
  addressPlaceholder: "e.g. Argwings Kodhek Rd, Kilimani, Nairobi",
};
