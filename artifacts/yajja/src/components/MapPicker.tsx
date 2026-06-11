import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin } from "lucide-react";
import { reverseGeocode, NAIROBI_DEFAULT } from "@/lib/geocode";

const pinIcon = L.divIcon({
  className: "",
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#1800AC" stroke="#fff" stroke-width="1.5" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lat?: number | null;
  lng?: number | null;
  onConfirm: (lat: number, lng: number, address: string) => void;
}

/**
 * Draggable map fallback for picking an exact delivery point. Centers on the
 * provided coordinates when available, otherwise on Nairobi. Works fully
 * offline of any Google key — uses OpenStreetMap tiles and our keyless
 * reverse-geocode helper.
 */
export default function MapPicker({ open, onOpenChange, lat, lng, onConfirm }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [pos, setPos] = useState({
    lat: lat ?? NAIROBI_DEFAULT.lat,
    lng: lng ?? NAIROBI_DEFAULT.lng,
  });
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    const start = { lat: lat ?? NAIROBI_DEFAULT.lat, lng: lng ?? NAIROBI_DEFAULT.lng };
    setPos(start);
    const timer = setTimeout(() => {
      if (!mapEl.current) return;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      const map = L.map(mapEl.current).setView([start.lat, start.lng], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      const marker = L.marker([start.lat, start.lng], { draggable: true, icon: pinIcon }).addTo(map);
      marker.on("dragend", () => {
        const ll = marker.getLatLng();
        setPos({ lat: ll.lat, lng: ll.lng });
      });
      map.on("click", (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        setPos({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      mapRef.current = map;
      markerRef.current = marker;
      setTimeout(() => map.invalidateSize(), 100);
    }, 50);
    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [open]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const address = await reverseGeocode(pos.lat, pos.lng);
      onConfirm(pos.lat, pos.lng, address);
      onOpenChange(false);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Pick location on map
          </DialogTitle>
          <DialogDescription>
            Drag the pin or tap the map to set your exact delivery spot.
          </DialogDescription>
        </DialogHeader>

        <div ref={mapEl} className="h-72 w-full rounded-lg overflow-hidden border" />
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Pinned at {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={confirming}>
            {confirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Use this location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
