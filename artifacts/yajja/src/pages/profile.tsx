import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, MapPin, LogOut, ShoppingBag, Shield } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  if (!user) return null;

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-extrabold tracking-tight text-primary">My Profile</h1>

      <Card className="bg-white border-secondary/40">
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-full bg-secondary/30 flex items-center justify-center text-primary text-3xl font-bold shrink-0 overflow-hidden border-4 border-secondary/50">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                user.name?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold truncate">{user.name}</h2>
              <Badge variant="outline" className="mt-1 capitalize">{user.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-secondary/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
          </div>
          {user.phone && (
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
          {user.address && (
            <>
              <Separator />
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Default Address</p>
                  <p className="font-medium">{user.address}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border-secondary/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Quick Links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3 h-12" onClick={() => setLocation("/orders")}>
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            My Orders
          </Button>
          <Separator />
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-UG", { month: "long", year: "numeric" }) : "—"}
      </p>
    </div>
  );
}
