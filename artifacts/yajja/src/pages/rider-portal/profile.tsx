import React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetRiderProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Bike, User, Phone, Mail, MapPin } from "lucide-react";

export default function RiderProfile() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: riderProfile } = useGetRiderProfile({ query: { enabled: true } as any });

  return (
    <div className="container max-w-xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setLocation("/rider-portal")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-extrabold">Rider Profile</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold shrink-0 border-4 border-primary/20">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover rounded-full" />
                : user?.name?.charAt(0)?.toUpperCase() || "R"
              }
            </div>
            <div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <Badge variant="outline" className="mt-1 gap-1">
                <Bike className="h-3 w-3" /> Rider
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Personal Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>
          {user?.phone && (
            <>
              <Separator />
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{user.phone}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {riderProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bike className="h-4 w-4 text-primary" />
              Vehicle Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Bike className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Vehicle Type</p>
                <p className="font-medium capitalize">{(riderProfile as any).vehicleType}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">License Plate</p>
                <p className="font-medium">{(riderProfile as any).licensePlate}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${(riderProfile as any).isAvailable ? "bg-green-500" : "bg-muted"}`} />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium">{(riderProfile as any).isAvailable ? "Available" : "Unavailable"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
