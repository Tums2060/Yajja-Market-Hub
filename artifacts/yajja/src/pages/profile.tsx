import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User, Mail, Phone, MapPin, LogOut, ShoppingBag, Shield,
  Plus, Pencil, Trash2, Star, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LocationModal from "@/components/LocationModal";
import {
  useSavedLocations, useLocationMutations, type SavedLocation, type LocationInput,
} from "@/hooks/use-locations";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: locations = [], isLoading: locationsLoading } = useSavedLocations(!!user);
  const { create, update, setDefault, remove } = useLocationMutations();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SavedLocation | null>(null);

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (loc: SavedLocation) => { setEditing(loc); setModalOpen(true); };

  const handleSubmit = async (data: LocationInput) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: data });
        toast({ title: "Location updated" });
      } else {
        await create.mutateAsync(data);
        toast({ title: "Location added" });
      }
      setModalOpen(false);
    } catch {
      toast({ variant: "destructive", title: "Could not save location" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove.mutateAsync(id);
      toast({ title: "Location removed" });
    } catch {
      toast({ variant: "destructive", title: "Could not remove location" });
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await setDefault.mutateAsync(id);
    } catch {
      toast({ variant: "destructive", title: "Could not set default" });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      {/* Header Banner */}
      <div className="bg-background border-b border-secondary/5 py-6 mb-8">
        <div className="container max-w-2xl mx-auto px-4 flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-secondary/10 flex items-center justify-center text-primary text-2xl font-bold shrink-0 overflow-hidden border-2 border-secondary/15">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              user.name?.charAt(0)?.toUpperCase() || "U"
            )}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">{user.name}</h1>
            <Badge variant="outline" className="mt-0.5 capitalize text-[10px] font-bold tracking-wide border-secondary/25">{user.role} Account</Badge>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 space-y-6">
        {/* Account Details */}
        <Card className="bg-white border border-secondary/10 rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="bg-background border-b border-secondary/5 py-4 px-6">
            <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Account details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-secondary/5 flex items-center justify-center shrink-0 border border-secondary/5">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email address</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{user.email}</p>
              </div>
            </div>
            {user.phone && (
              <>
                <Separator className="bg-secondary/5" />
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-secondary/5 flex items-center justify-center shrink-0 border border-secondary/5">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone number</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{user.phone}</p>
                  </div>
                </div>
              </>
            )}
            {user.address && (
              <>
                <Separator className="bg-secondary/5" />
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-secondary/5 flex items-center justify-center shrink-0 border border-secondary/5">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Default address</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{user.address}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Saved Locations */}
        <Card className="bg-white border border-secondary/10 rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="bg-background border-b border-secondary/5 py-4 px-6 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Saved Locations
            </CardTitle>
            <Button size="sm" variant="outline" className="gap-1 rounded-lg font-bold text-xs h-8 border-secondary/20 bg-white" onClick={openAdd}>
              <Plus className="h-3.5 w-3.5" /> Add New
            </Button>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {locationsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : locations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 font-medium">
                No saved locations yet. Add one for a faster checkout.
              </p>
            ) : (
              locations.map((loc) => (
                <div key={loc.id} className="flex items-center gap-3 rounded-xl border border-secondary/10 p-3 bg-white">
                  <div className="h-9 w-9 rounded-lg bg-secondary/5 border border-secondary/5 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground truncate">{loc.label}</p>
                      {loc.isDefault && (
                        <Badge variant="secondary" className="gap-1 text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 border-amber-500/20 py-0 px-2 rounded-full">
                          <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5 font-medium">{loc.address}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {!loc.isDefault && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-secondary/10" title="Set as default" onClick={() => handleSetDefault(loc.id)}>
                        <Star className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-secondary/10" title="Edit" onClick={() => openEdit(loc)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full" title="Delete" onClick={() => handleDelete(loc.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="bg-white border border-secondary/10 rounded-2xl shadow-xs overflow-hidden">
          <CardHeader className="bg-background border-b border-secondary/5 py-4 px-6">
            <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Button variant="ghost" className="w-full justify-between items-center h-14 rounded-none px-6 text-sm font-bold text-foreground border-b border-secondary/5" onClick={() => setLocation("/orders")}>
              <span className="flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                <span>My Order History</span>
              </span>
              <span className="text-muted-foreground font-semibold text-xs">View</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-between items-center h-14 rounded-none px-6 text-sm font-bold text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <span className="flex items-center gap-3">
                <LogOut className="h-5 w-5" />
                <span>Sign Out Account</span>
              </span>
            </Button>
          </CardContent>
        </Card>

        <LocationModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          initial={editing}
          onSubmit={handleSubmit}
          saving={create.isPending || update.isPending}
        />

        <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
          Member since {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-UG", { month: "long", year: "numeric" }) : "—"}
        </p>
      </div>
    </div>
  );
}
