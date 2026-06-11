import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

const destIcon = L.divIcon({
  className: "",
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#1800AC" stroke="#fff" stroke-width="1.5" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const riderIcon = L.divIcon({
  className: "",
  html: `<div style="background:#1800AC;border-radius:9999px;padding:5px;display:flex;box-shadow:0 2px 4px rgba(0,0,0,.3)"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFDE59" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export function LiveTrackingMap({
  destination,
  rider,
  etaLabel,
  className,
}: {
  destination: LatLng;
  rider?: LatLng | null;
  etaLabel?: string | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([destination.lat, destination.lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
    L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      riderMarkerRef.current = null;
      lineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const hasRider = !!rider && typeof rider.lat === "number" && typeof rider.lng === "number";

    if (hasRider && rider) {
      if (!riderMarkerRef.current) {
        riderMarkerRef.current = L.marker([rider.lat, rider.lng], { icon: riderIcon }).addTo(map);
      } else {
        riderMarkerRef.current.setLatLng([rider.lat, rider.lng]);
      }
      if (etaLabel) {
        riderMarkerRef.current
          .bindTooltip(etaLabel, { direction: "top", offset: [0, -24], opacity: 0.95 })
          .openTooltip();
      } else {
        riderMarkerRef.current.unbindTooltip();
      }
      const pts: L.LatLngExpression[] = [
        [rider.lat, rider.lng],
        [destination.lat, destination.lng],
      ];
      if (!lineRef.current) {
        lineRef.current = L.polyline(pts, {
          color: "#1800AC",
          weight: 3,
          dashArray: "6 8",
        }).addTo(map);
      } else {
        lineRef.current.setLatLngs(pts);
      }
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
    } else {
      map.setView([destination.lat, destination.lng], 14);
    }
  }, [rider?.lat, rider?.lng, destination.lat, destination.lng, etaLabel]);

  return (
    <div
      ref={containerRef}
      className={className || "w-full h-64 rounded-xl overflow-hidden border z-0"}
    />
  );
}
