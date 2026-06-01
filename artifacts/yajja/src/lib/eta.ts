type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;
const AVG_RIDER_SPEED_KMH = 22;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function estimateEtaMinutes(rider: LatLng, destination: LatLng): number {
  const km = haversineKm(rider, destination);
  const minutes = (km / AVG_RIDER_SPEED_KMH) * 60;
  return Math.max(1, Math.round(minutes));
}

export function formatEta(rider: LatLng, destination: LatLng): {
  minutes: number;
  km: number;
  label: string;
} {
  const km = haversineKm(rider, destination);
  const minutes = Math.max(1, Math.round((km / AVG_RIDER_SPEED_KMH) * 60));
  const distLabel = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  const timeLabel = minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return { minutes, km, label: `${timeLabel} away · ${distLabel}` };
}
