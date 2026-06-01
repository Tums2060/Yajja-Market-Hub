import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

const destIcon = L.divIcon({
  className: "",
  html: `<div style="font-size:30px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))">📍</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const riderIcon = L.divIcon({
  className: "",
  html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))">🛵</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export function LiveTrackingMap({
  destination,
  rider,
  className,
}: {
  destination: LatLng;
  rider?: LatLng | null;
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
      const pts: L.LatLngExpression[] = [
        [rider.lat, rider.lng],
        [destination.lat, destination.lng],
      ];
      if (!lineRef.current) {
        lineRef.current = L.polyline(pts, {
          color: "#7c3aed",
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
  }, [rider?.lat, rider?.lng, destination.lat, destination.lng]);

  return (
    <div
      ref={containerRef}
      className={className || "w-full h-64 rounded-xl overflow-hidden border z-0"}
    />
  );
}
