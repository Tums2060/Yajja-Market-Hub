import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  getListProductsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Loader2, Package, Pencil, Trash2 } from "lucide-react";

export default function VendorProducts() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", category: "food", imageUrl: "" });

  const { data: products, isLoading } = useListProducts({}, { query: { enabled: true } });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const openNew = () => {
    setEditingProduct(null);
    setForm({ name: "", description: "", price: "", category: "food", imageUrl: "" });
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingProduct(p);
    setForm({ name: p.name, description: p.description || "", price: String(p.price), category: p.category, imageUrl: p.imageUrl || "" });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const data = { ...form, price: parseFloat(form.price) || 0 };
    if (editingProduct) {
      updateProduct.mutate({ productId: editingProduct.id, data } as any, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          toast({ title: "Product updated" });
          setDialogOpen(false);
        },
        onError: () => toast({ variant: "destructive", title: "Failed to update" })
      });
    } else {
      createProduct.mutate({ data } as any, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          toast({ title: "Product created" });
          setDialogOpen(false);
        },
        onError: () => toast({ variant: "destructive", title: "Failed to create" })
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteProduct.mutate({ productId: id } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        toast({ title: "Product deleted" });
      },
      onError: () => toast({ variant: "destructive", title: "Failed to delete" })
    });
  };

  const isSaving = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setLocation("/vendor-portal")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-extrabold flex-1">Products</h1>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !(products as any[])?.length ? (
        <Card className="text-center py-14 border-dashed">
          <Package className="mx-auto h-14 w-14 opacity-20 mb-3" />
          <p className="text-muted-foreground">No products yet. Add your first product!</p>
          <Button className="mt-4" onClick={openNew}>Add Product</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {(products as any[]).map(p => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-16 w-16 bg-muted rounded-lg shrink-0 overflow-hidden">
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                    : <div className="h-full w-full flex items-center justify-center text-muted-foreground font-bold text-xl">{p.name?.charAt(0)}</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{p.category}</Badge>
                    <span className="font-bold text-sm">${p.price}</span>
                    {!p.isAvailable && <Badge variant="destructive" className="text-xs">Unavailable</Badge>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" />
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Image URL (optional)</Label>
              <Input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingProduct ? "Save Changes" : "Create Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
