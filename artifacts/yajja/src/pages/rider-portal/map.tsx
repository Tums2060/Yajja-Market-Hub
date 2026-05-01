import React, { useState } from "react";
import { useLocation } from "wouter";
import { useListRiderOrders, useUpdateRiderLocation, getListRiderOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  const { data: orders } = useListRiderOrders({ query: { enabled: true } });
  const activeOrders = (orders as any[])?.filter(o => o.status === "out_for_delivery") || [];

  const updateLocation = useUpdateRiderLocation();
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [isTracking, setIsTracking] = useState(false);

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Geolocation not supported" });
      return;
    }
    setIsTracking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setLat(latitude.toFixed(6));
        setLng(longitude.toFixed(6));
        updateLocation.mutate({ data: { latitude, longitude } } as any, {
          onSuccess: () => {
            toast({ title: "Location updated!" });
            setIsTracking(false);
          },
          onError: () => {
            toast({ variant: "destructive", title: "Failed to update location" });
            setIsTracking(false);
          }
        });
      },
      () => {
        toast({ variant: "destructive", title: "Could not get your location" });
        setIsTracking(false);
      }
    );
  };

  const handleManualUpdate = () => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      toast({ variant: "destructive", title: "Invalid coordinates" });
      return;
    }
    updateLocation.mutate({ data: { latitude, longitude } } as any, {
      onSuccess: () => toast({ title: "Location updated!" }),
      onError: () => toast({ variant: "destructive", title: "Failed to update" })
    });
  };

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
            onClick={handleShareLocation}
            disabled={isTracking || updateLocation.isPending}
          >
            {isTracking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            Use Device GPS
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
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Order #{order.id}</p>
                    <p className="text-sm text-muted-foreground">{order.customerName}</p>
                    {order.deliveryAddress && (
                      <p className="text-xs text-muted-foreground mt-1">📍 {order.deliveryAddress}</p>
                    )}
                  </div>
                  <Badge className="bg-purple-500/15 text-purple-700 border-purple-500/30 text-xs" variant="outline">
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
