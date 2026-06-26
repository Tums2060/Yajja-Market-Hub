import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey,
  useGetMyVendor,
  useListFoodCategories,
  useCreateFoodCategory,
  useDeleteFoodCategory,
  getListFoodCategoriesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Package,
  Pencil,
  Trash2,
  ImagePlus,
} from "lucide-react";
import { formatKES } from "@/lib/format";

const CATEGORIES = [
  { value: "food", label: "Food" },
  { value: "liquor", label: "Liquor" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "household", label: "Household" },
];

type ProductForm = {
  name: string;
  description: string;
  price: string;
  category: string;
  tags: string;
  imageUrl: string;
  isAvailable: boolean;
  foodCategoryIds: number[];
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  category: "food",
  tags: "",
  imageUrl: "",
  isAvailable: true,
  foodCategoryIds: [],
};

export default function VendorProducts() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: vendor } = useGetMyVendor();

  const vendorId = (vendor as any)?.id as number | undefined;

  const { data: products, isLoading } = useListProducts(
    vendorId ? ({ vendorId } as any) : {},
    { query: { enabled: !!vendorId } } as any
  );

  const { data: foodCategories } = useListFoodCategories(vendorId as number, {
    query: { enabled: !!vendorId } as any,
  });
  const categoryList = (foodCategories as any[]) || [];

  const [newCategory, setNewCategory] = useState("");
  const createCategory = useCreateFoodCategory();
  const deleteCategory = useDeleteFoodCategory();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const invalidateCategories = () =>
    queryClient.invalidateQueries({
      queryKey: getListFoodCategoriesQueryKey(vendorId as number),
    });

  const handleAddCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    createCategory.mutate(
      { data: { name } as any },
      {
        onSuccess: () => {
          invalidateCategories();
          setNewCategory("");
          toast({ title: "Category added" });
        },
        onError: () => toast({ variant: "destructive", title: "Failed to add category" }),
      }
    );
  };

  const handleDeleteCategory = (id: number) => {
    if (!window.confirm("Delete this category? Items will be untagged from it.")) return;
    deleteCategory.mutate(
      { categoryId: id },
      {
        onSuccess: () => {
          invalidateCategories();
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(vendorId ? { vendorId } as any : {}) });
          toast({ title: "Category deleted" });
        },
        onError: () => toast({ variant: "destructive", title: "Failed to delete category" }),
      }
    );
  };

  const toggleFormCategory = (id: number) => {
    setForm((f) => ({
      ...f,
      foodCategoryIds: f.foodCategoryIds.includes(id)
        ? f.foodCategoryIds.filter((c) => c !== id)
        : [...f.foodCategoryIds, id],
    }));
  };

  const openNew = () => {
    setEditingProduct(null);
    setForm({ ...emptyForm, category: (vendor as any)?.category || "food" });
    setImageFile(null);
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      category: p.category,
      tags: p.tags || "",
      imageUrl: p.imageUrl || "",
      isAvailable: p.isAvailable ?? true,
      foodCategoryIds: Array.isArray(p.foodCategoryIds) ? p.foodCategoryIds : [],
    });
    setImageFile(null);
    setDialogOpen(true);
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    setIsUploading(true);
    const token = localStorage.getItem("yajja_token");
    const formData = new FormData();
    formData.append("image", imageFile);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
    const res = await fetch(`${baseUrl}/api/uploads/products`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    setIsUploading(false);
    if (!res.ok) throw new Error("Failed to upload image");
    const data = await res.json();
    return data.url as string;
  };

  const handleSave = async () => {
    if (!vendorId) {
      toast({ variant: "destructive", title: "Vendor profile not found" });
      return;
    }
    if (!form.name.trim() || !form.price.trim()) {
      toast({ variant: "destructive", title: "Name and price are required" });
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl = form.imageUrl;
      if (imageFile) {
        const uploaded = await uploadImage();
        imageUrl = uploaded || imageUrl;
      }

      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price) || 0,
        category: form.category,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .join(", "),
        imageUrl,
        isAvailable: form.isAvailable,
        foodCategoryIds: form.foodCategoryIds,
        vendorId,
      };

      if (editingProduct) {
        await updateProduct.mutateAsync({ productId: editingProduct.id, data } as any);
        toast({ title: "Product updated" });
      } else {
        await createProduct.mutateAsync({ data } as any);
        toast({ title: "Product created" });
      }

      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(vendorId ? { vendorId } as any : {}) });
      setDialogOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to save product" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    deleteProduct.mutate({ productId: id } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(vendorId ? { vendorId } as any : {}) });
        toast({ title: "Product deleted" });
      },
      onError: () => toast({ variant: "destructive", title: "Failed to delete" }),
    });
  };

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(form.imageUrl || "");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile, form.imageUrl]);

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/vendor-portal")}>
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-bold flex-1">My Menu</h1>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="font-bold">Menu Categories</p>
            <p className="text-xs text-muted-foreground">
              Group your items so customers can filter your menu.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Burgers, Drinks, Sides"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
            />
            <Button onClick={handleAddCategory} disabled={createCategory.isPending}>
              {createCategory.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          {categoryList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categoryList.map((c: any) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm font-medium"
                >
                  {c.name}
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(c.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No categories yet.</p>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : !(products as any[])?.length ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Package className="mx-auto mb-2 h-10 w-10 opacity-30" />
            <p>No items yet. Tap "Add Item" to list your first product.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(products as any[]).map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="p-4 flex gap-4 items-center">
                <div className="h-16 w-16 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold truncate">{p.name}</p>
                    {p.isAvailable ? (
                      <Badge variant="secondary" className="text-[10px]">In stock</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">Unavailable</Badge>
                    )}
                  </div>
                  <p className="text-sm text-primary font-semibold">{formatKES(p.price)}</p>
                  {p.tags && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {String(p.tags)
                        .split(",")
                        .map((t: string) => t.trim())
                        .filter(Boolean)
                        .slice(0, 4)
                        .map((t: string) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {t}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="icon" variant="outline" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item photo</Label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="h-20 w-20 rounded-xl bg-muted overflow-hidden flex items-center justify-center border border-dashed border-border">
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-muted-foreground/50" />
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {isUploading ? "Uploading…" : "Tap to upload an image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-name">Name</Label>
              <Input
                id="p-name"
                placeholder="e.g. Crispy Chicken Burger"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                placeholder="Short description of the item"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="p-price">Price (KES)</Label>
                <Input
                  id="p-price"
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-tags">Tags</Label>
              <Input
                id="p-tags"
                placeholder="chips, fast food, snacks"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. Customers find your item by searching these tags.
              </p>
            </div>

            {categoryList.length > 0 && (
              <div className="space-y-2">
                <Label>Menu categories</Label>
                <div className="flex flex-wrap gap-2">
                  {categoryList.map((c: any) => {
                    const active = form.foodCategoryIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleFormCategory(c.id)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tap to assign this item to one or more categories.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium">Available</p>
                <p className="text-xs text-muted-foreground">Turn off if this item is out of stock</p>
              </div>
              <Switch
                checked={form.isAvailable}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isAvailable: v }))}
              />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={isSaving || isUploading}>
              {(isSaving || isUploading) && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              {editingProduct ? "Save changes" : "Add item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
