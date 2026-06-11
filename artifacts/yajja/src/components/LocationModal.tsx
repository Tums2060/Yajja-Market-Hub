import React, { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Navigation, Loader2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentPosition, reverseGeocode, NAIROBI_DEFAULT } from "@/lib/geocode";
import type { SavedLocation, LocationInput } from "@/hooks/use-locations";
import MapPicker from "@/components/MapPicker";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: SavedLocation | null;
  onSubmit: (data: LocationInput) => Promise<void> | void;
  saving?: boolean;
}

export default function LocationModal({ open, onOpenChange, initial, onSubmit, saving }: Props) {
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(initial?.label ?? "");
      setAddress(initial?.address ?? "");
      setLat(initial?.latitude ?? null);
      setLng(initial?.longitude ?? null);
      setIsDefault(initial?.isDefault ?? false);
    }
  }, [open, initial]);

  const handleUseGps = async () => {
    setLocating(true);
    try {
      const { lat: la, lng: ln } = await getCurrentPosition();
      setLat(la);
      setLng(ln);
      const resolved = await reverseGeocode(la, ln);
      if (!address.trim()) setAddress(resolved);
      toast({ title: "Location captured", description: resolved });
    } catch (e: any) {
      // Graceful fallback: drop a default pin the user can correct manually.
      setLat(NAIROBI_DEFAULT.lat);
      setLng(NAIROBI_DEFAULT.lng);
      toast({ variant: "destructive", title: e?.message || "Could not get location" });
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!label.trim() || !address.trim()) {
      toast({ variant: "destructive", title: "Label and address are required" });
      return;
    }
    await onSubmit({
      label: label.trim(),
      address: address.trim(),
      latitude: lat,
      longitude: lng,
      isDefault,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {initial ? "Edit Location" : "Add Location"}
          </DialogTitle>
          <DialogDescription>
            Save a delivery address for faster checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loc-label">Label</Label>
            <Input
              id="loc-label"
              placeholder="Home, Work, Mom's place…"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-address">Address</Label>
            <Input
              id="loc-address"
              placeholder="Street, building, landmark…"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="gap-2 flex-1" onClick={handleUseGps} disabled={locating}>
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              Use my location
            </Button>
            <Button type="button" variant="outline" className="gap-2 flex-1" onClick={() => setMapOpen(true)}>
              <MapPin className="h-4 w-4" />
              Pick on map
            </Button>
          </div>

          <MapPicker
            open={mapOpen}
            onOpenChange={setMapOpen}
            lat={lat}
            lng={lng}
            onConfirm={(la, ln, addr) => {
              setLat(la);
              setLng(ln);
              if (!address.trim()) setAddress(addr);
            }}
          />

          {lat != null && lng != null && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Pinned at {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          )}

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(Boolean(v))} />
            Set as default address
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {initial ? "Save changes" : "Add location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
