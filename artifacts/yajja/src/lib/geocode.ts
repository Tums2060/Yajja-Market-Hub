export const NAIROBI_DEFAULT = { lat: -1.286389, lng: 36.817223 };

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export function hasMapsKey(): boolean {
  return Boolean(GOOGLE_KEY);
}

/**
 * Capture the device's current position at high accuracy.
 * Rejects with a human-readable message on failure.
 */
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported on this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const messages: Record<number, string> = {
          1: "Location permission denied. Please allow access or enter your address manually.",
          2: "Your location is unavailable right now. Try again or enter it manually.",
          3: "Getting your location timed out. Try again.",
        };
        reject(new Error(messages[err.code] || "Could not get your location"));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

/**
 * Reverse-geocode coordinates to a human address. Uses Google when a key is
 * configured; otherwise degrades gracefully to a coordinate string so the flow
 * still works keyless.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  if (!GOOGLE_KEY) return fallback;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}`
    );
    if (!res.ok) return fallback;
    const data = await res.json();
    return data?.results?.[0]?.formatted_address || fallback;
  } catch {
    return fallback;
  }
}
