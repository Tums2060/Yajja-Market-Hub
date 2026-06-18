import React, { useEffect, useRef, useState } from "react";
import { useGetMyVendor, useUpdateMyVendor } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Camera, MapPin, CheckCircle2, Store, Star, Clock,
} from "lucide-react";

const CATEGORIES = [
  { value: "food", label: "Food & Drinks" },
  { value: "liquor", label: "Liquor" },
  { value: "pharmacy", label: "Pharmacy & Health" },
  { value: "household", label: "Household & Convenience" },
] as const;

type FormState = {
  name: string;
  ownerName: string;
  category: string;
  description: string;
  address: string;
  deliveryTime: string;
  minOrder: string;
  imageUrl: string;
  isOpen: boolean;
  lat?: number;
  lng?: number;
};

const statusMeta: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pending_review: { label: "Pending review", className: "bg-amber-100 text-amber-700 border-amber-200" },
  rejected: { label: "Rejected", className: "bg-rose-100 text-rose-700 border-rose-200" },
};

export default function VendorProfile() {
  const { toast } = useToast();
  const { data: vendor, isLoading, refetch } = useGetMyVendor();
  const updateVendor = useUpdateMyVendor();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    name: "", ownerName: "", category: "food", description: "",
    address: "", deliveryTime: "", minOrder: "", imageUrl: "", isOpen: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);

  const [isEditingPayout, setIsEditingPayout] = useState(false);
  const [payoutEdit, setPayoutEdit] = useState<{
    type: "till" | "paybill" | "pochi" | "send_money";
    accountNumber: string;
    paybillAccountRef?: string;
  }>({
    type: "till",
    accountNumber: "",
    paybillAccountRef: "",
  });
  const [payoutError, setPayoutError] = useState("");
  const [savingPayout, setSavingPayout] = useState(false);

  useEffect(() => {
    document.title = "Store Profile - Yajja";
  }, []);

  useEffect(() => {
    if (!vendor) return;
    const v = vendor as any;
    setForm({
      name: v.name || "",
      ownerName: v.ownerName || "",
      category: v.category || "food",
      description: v.description || "",
      address: v.address || "",
      deliveryTime: v.deliveryTime || "",
      minOrder: v.minOrder != null ? String(v.minOrder) : "",
      imageUrl: v.imageUrl || "",
      isOpen: v.isOpen ?? true,
      lat: v.lat ?? undefined,
      lng: v.lng ?? undefined,
    });

    if (v.payoutMethod) {
      setPayoutEdit({
        type: v.payoutMethod.type || "till",
        accountNumber: v.payoutMethod.accountNumber || "",
        paybillAccountRef: v.payoutMethod.paybillAccountRef || "",
      });
    } else {
      setPayoutEdit({
        type: "till",
        accountNumber: "",
        paybillAccountRef: "",
      });
    }
  }, [vendor]);

  function cancelPayoutEdit() {
    setIsEditingPayout(false);
    setPayoutError("");
    const val = vendor as any;
    if (val?.payoutMethod) {
      setPayoutEdit({
        type: val.payoutMethod.type || "till",
        accountNumber: val.payoutMethod.accountNumber || "",
        paybillAccountRef: val.payoutMethod.paybillAccountRef || "",
      });
    } else {
      setPayoutEdit({
        type: "till",
        accountNumber: "",
        paybillAccountRef: "",
      });
    }
  }

  async function savePayoutMethod() {
    const type = payoutEdit.type;
    const num = payoutEdit.accountNumber || "";
    const ref = payoutEdit.paybillAccountRef || "";

    if (type === "till") {
      if (!/^\d{6}$/.test(num)) {
        setPayoutError("Till number must be exactly 6 digits");
        return;
      }
    } else if (type === "paybill") {
      if (!/^\d{5,6}$/.test(num)) {
        setPayoutError("Paybill business number must be 5 or 6 digits");
        return;
      }
      if (!ref.trim()) {
        setPayoutError("Account reference is required for Paybill payouts");
        return;
      }
    } else if (type === "pochi" || type === "send_money") {
      if (!/^(07|01)\d{8}$/.test(num)) {
        setPayoutError("Phone number must be a valid Kenyan mobile number starting with 07 or 01 (10 digits total)");
        return;
      }
    }

    setSavingPayout(true);
    try {
      const body: any = {
        name: form.name.trim(),
        category: form.category,
        payoutMethod: {
          type,
          accountNumber: num,
          paybillAccountRef: type === "paybill" ? ref : undefined,
        }
      };
      await updateVendor.mutateAsync({ data: body });
      setIsEditingPayout(false);
      setPayoutError("");
      await refetch();
      toast({ title: "Payout method updated successfully" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update failed", description: e?.message || "Please try again" });
    } finally {
      setSavingPayout(false);
    }
  }

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Location unavailable" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("lat", pos.coords.latitude);
        set("lng", pos.coords.longitude);
        setLocating(false);
        toast({ title: "Location captured", description: "Store location pinned." });
      },
      () => {
        setLocating(false);
        toast({ variant: "destructive", title: "Couldn't get location", description: "Allow location access or enter your address." });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null;
    setUploading(true);
    try {
      const token = localStorage.getItem("yajja_token");
      const fd = new FormData();
      fd.append("image", imageFile);
      const res = await fetch("/api/uploads/products", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      if (!res.ok) throw new Error("Failed to upload image");
      const data = await res.json();
      return data.url as string;
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Store name is required" });
      return;
    }
    try {
      let imageUrl = form.imageUrl;
      if (imageFile) {
        const uploaded = await uploadImage();
        if (uploaded) imageUrl = uploaded;
      }
      const body: any = {
        name: form.name.trim(),
        ownerName: form.ownerName.trim() || undefined,
        category: form.category,
        description: form.description.trim() || undefined,
        address: form.address.trim() || undefined,
        deliveryTime: form.deliveryTime.trim() || undefined,
        isOpen: form.isOpen,
        imageUrl: imageUrl || undefined,
      };
      const min = parseFloat(form.minOrder);
      if (!Number.isNaN(min)) body.minOrder = min;
      if (typeof form.lat === "number") body.lat = form.lat;
      if (typeof form.lng === "number") body.lng = form.lng;

      await updateVendor.mutateAsync({ data: body });
      setImageFile(null);
      await refetch();
      toast({ title: "Store profile updated" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Update failed", description: e?.message || "Please try again" });
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto py-10 px-4 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const v = vendor as any;
  const status = statusMeta[v?.status] || statusMeta.pending_review;
  const displayImage = imagePreview || form.imageUrl;
  const saving = updateVendor.isPending || uploading;

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Store Profile</h1>
          <p className="text-muted-foreground mt-1">Manage how customers see your store.</p>
        </div>
        <Badge variant="outline" className={`${status.className} font-semibold`}>{status.label}</Badge>
      </div>

      <Card className="border-secondary/40">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <div className="relative">
              <div className="h-28 w-28 rounded-2xl overflow-hidden bg-secondary/20 flex items-center justify-center">
                {displayImage ? (
                  <img src={displayImage} alt={form.name} className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90"
                aria-label="Change store photo"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex-1 w-full space-y-2 text-center sm:text-left">
              <h2 className="text-xl font-bold text-foreground">{form.name || "Your store"}</h2>
              <div className="flex flex-wrap gap-3 justify-center sm:justify-start text-sm text-muted-foreground">
                {typeof v?.rating === "number" && (
                  <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 text-secondary fill-secondary" />{v.rating}</span>
                )}
                {form.deliveryTime && (
                  <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" />{form.deliveryTime}</span>
                )}
                {typeof v?.orderCount === "number" && (
                  <span>{v.orderCount} orders</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Tap the camera icon to update your store photo.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-secondary/40">
        <CardHeader>
          <CardTitle className="text-lg">Store details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="name">Store name</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Mama Fua Kitchen" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerName">Owner name</Label>
              <Input id="ownerName" value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} placeholder="Owner full name" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryTime">Delivery time</Label>
              <Input id="deliveryTime" value={form.deliveryTime} onChange={(e) => set("deliveryTime", e.target.value)} placeholder="e.g. 20-30 min" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Tell customers what makes your store special" rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Store location</Label>
            <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="e.g. Argwings Kodhek Rd, Kilimani, Nairobi" />
            <Button
              type="button"
              variant="outline"
              onClick={captureLocation}
              disabled={locating}
              className="mt-1 gap-2 border-secondary/50 text-primary hover:bg-secondary/20"
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" />
                : typeof form.lat === "number" && typeof form.lng === "number"
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  : <MapPin className="h-4 w-4" />}
              {typeof form.lat === "number" && typeof form.lng === "number"
                ? `Location pinned (${form.lat.toFixed(4)}, ${form.lng.toFixed(4)})`
                : "Pin store location (GPS)"}
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 items-end">
            <div className="space-y-2">
              <Label htmlFor="minOrder">Minimum order (KES)</Label>
              <Input id="minOrder" type="number" inputMode="numeric" value={form.minOrder} onChange={(e) => set("minOrder", e.target.value)} placeholder="0" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-secondary/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Store open</p>
                <p className="text-xs text-muted-foreground">Toggle off to pause new orders</p>
              </div>
              <Switch checked={form.isOpen} onCheckedChange={(c) => set("isOpen", c)} />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving} className="min-w-36 font-bold">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-secondary/40">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-secondary/5">
          <CardTitle className="text-lg font-bold">Payout Method</CardTitle>
          {!isEditingPayout ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditingPayout(true)} className="font-semibold">
              Edit Payout Method
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={cancelPayoutEdit} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={savePayoutMethod} disabled={savingPayout} className="text-xs font-bold">
                {savingPayout && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6">
          {!isEditingPayout ? (
            v?.payoutMethod ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm py-1 border-b border-secondary/5">
                  <span className="font-semibold text-muted-foreground">Type</span>
                  <span className="capitalize font-bold text-foreground">
                    {v.payoutMethod.type === "till"
                      ? "Buy Goods (Till)"
                      : v.payoutMethod.type === "paybill"
                      ? "Paybill"
                      : v.payoutMethod.type === "pochi"
                      ? "Pochi La Biashara"
                      : "Send Money"}
                  </span>
                </div>
                <div className="flex justify-between text-sm py-1 border-b border-secondary/5">
                  <span className="font-semibold text-muted-foreground">Account Number</span>
                  <span className="font-bold text-foreground">{v.payoutMethod.accountNumber}</span>
                </div>
                {v.payoutMethod.type === "paybill" && (
                  <div className="flex justify-between text-sm py-1">
                    <span className="font-semibold text-muted-foreground">Account Reference</span>
                    <span className="font-bold text-foreground">{v.payoutMethod.paybillAccountRef}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-600 bg-amber-500/5 border border-dashed border-amber-300 rounded-xl p-4 font-semibold">
                No payout method set. Please add one to receive orders and automatic split-payment payouts.
              </p>
            )
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payoutType" className="text-sm font-bold">Payout Type</Label>
                <select
                  id="payoutType"
                  value={payoutEdit.type}
                  onChange={(e) => {
                    setPayoutEdit(prev => ({
                      ...prev,
                      type: e.target.value as any,
                      accountNumber: "",
                      paybillAccountRef: ""
                    }));
                    setPayoutError("");
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="till">Buy Goods (Till Number)</option>
                  <option value="paybill">Paybill</option>
                  <option value="pochi">Pochi La Biashara</option>
                  <option value="send_money">Send Money (B2C)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payoutAccountNumber" className="text-sm font-bold">
                  {payoutEdit.type === "till"
                    ? "Till Number"
                    : payoutEdit.type === "paybill"
                    ? "Paybill Business Number"
                    : "Phone Number"}
                </Label>
                <Input
                  id="payoutAccountNumber"
                  value={payoutEdit.accountNumber}
                  onChange={(e) => {
                    setPayoutEdit(prev => ({ ...prev, accountNumber: e.target.value }));
                    setPayoutError("");
                  }}
                  placeholder={
                    payoutEdit.type === "till"
                      ? "6 digits exactly"
                      : payoutEdit.type === "paybill"
                      ? "5 to 6 digits"
                      : "Kenyan mobile number starting with 07 or 01, 10 digits"
                  }
                />
              </div>

              {payoutEdit.type === "paybill" && (
                <div className="space-y-2">
                  <Label htmlFor="payoutPaybillAccountRef" className="text-sm font-bold">Account Reference</Label>
                  <Input
                    id="payoutPaybillAccountRef"
                    value={payoutEdit.paybillAccountRef || ""}
                    onChange={(e) => {
                      setPayoutEdit(prev => ({ ...prev, paybillAccountRef: e.target.value }));
                      setPayoutError("");
                    }}
                    placeholder="e.g. business name or billing reference"
                  />
                </div>
              )}

              {payoutError && (
                <p className="text-xs text-rose-600 font-bold leading-none mt-1">{payoutError}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
