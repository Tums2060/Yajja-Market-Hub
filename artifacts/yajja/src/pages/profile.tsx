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
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Saved Locations
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {locationsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : locations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No saved locations yet. Add one for faster checkout.
            </p>
          ) : (
            locations.map((loc) => (
              <div key={loc.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="h-9 w-9 rounded-lg bg-secondary/30 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{loc.label}</p>
                    {loc.isDefault && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Star className="h-3 w-3 fill-current" /> Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{loc.address}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!loc.isDefault && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Set as default" onClick={() => handleSetDefault(loc.id)}>
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => openEdit(loc)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => handleDelete(loc.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <LocationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initial={editing}
        onSubmit={handleSubmit}
        saving={create.isPending || update.isPending}
      />

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
