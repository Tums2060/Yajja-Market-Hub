import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useListRiderOrders, useUpdateRiderLocation } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Navigation, MapPin, Loader2 } from "lucide-react";

export default function RiderMap() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: orders } = useListRiderOrders({ query: { enabled: true } });
  const activeOrders = (orders as any[])?.filter(o => o.status === "picked_up") || [];

  const updateLocation = useUpdateRiderLocation();
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Geolocation not supported" });
      return;
    }
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
  };

  const handleManualUpdate = () => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      toast({ variant: "destructive", title: "Invalid coordinates" });
      return;
    }
    updateLocation.mutate({ data: { lat: latitude, lng: longitude } } as any, {
      onSuccess: () => toast({ title: "Location updated!" }),
      onError: () => toast({ variant: "destructive", title: "Failed to update" })
    });
  };

  useEffect(() => {
    if (!isTracking) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        lastCoordsRef.current = { lat: latitude, lng: longitude };
        setLat(latitude.toFixed(6));
        setLng(longitude.toFixed(6));
      },
      () => {
        toast({ variant: "destructive", title: "Could not get your location" });
        stopTracking();
      },
      { enableHighAccuracy: true }
    );

    intervalRef.current = window.setInterval(() => {
      const coords = lastCoordsRef.current;
      if (!coords) return;
      updateLocation.mutate({ data: { lat: coords.lat, lng: coords.lng } } as any, {
        onError: () => toast({ variant: "destructive", title: "Failed to update location" }),
      });
    }, 12000);

    return () => stopTracking();
  }, [isTracking, toast, updateLocation]);

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setLocation("/rider-portal")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-extrabold">Live Tracking</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            Share Your Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full gap-2"
            onClick={isTracking ? stopTracking : handleShareLocation}
            disabled={updateLocation.isPending}
          >
            {isTracking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            {isTracking ? "Sharing Location..." : "Start GPS Sharing"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or enter manually</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Latitude</Label>
              <Input value={lat} onChange={e => setLat(e.target.value)} placeholder="0.3476" />
            </div>
            <div className="space-y-1">
              <Label>Longitude</Label>
              <Input value={lng} onChange={e => setLng(e.target.value)} placeholder="32.5825" />
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleManualUpdate} disabled={updateLocation.isPending}>
            {updateLocation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update Location
          </Button>
          {lat && lng && (
            <p className="text-center text-xs text-muted-foreground">
              Current: {lat}, {lng}
            </p>
          )}
        </CardContent>
      </Card>

      {activeOrders.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3">Active Deliveries</h2>
          <div className="space-y-3">
            {activeOrders.map((order: any) => (
              <Card key={order.id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Order #{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.customerName}</p>
                    {order.deliveryAddress && (
                      <p className="text-xs text-muted-foreground mt-1">📍 {order.deliveryAddress}</p>
                    )}
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/30 text-xs" variant="outline">
                    In Transit
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
