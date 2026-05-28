import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { formatKES } from "@/lib/format";

export default function VendorProducts() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "food",
    imageUrl: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: vendor } = useQuery({
    queryKey: ["vendor", "me"],
    queryFn: async () => {
      const token = localStorage.getItem("yajja_token");

      const res = await fetch("/api/vendors/me", {
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : undefined,
      });

      if (!res.ok) throw new Error("Failed to load vendor profile");
      return res.json();
    },
  });

  const vendorId = (vendor as any)?.id as number | undefined;

  const { data: products, isLoading } = useListProducts(
    vendorId ? ({ vendorId } as any) : {},
    { enabled: !!vendorId } as any
  );

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const openNew = () => {
    setEditingProduct(null);
    setForm({
      name: "",
      description: "",
      price: "",
      category: "food",
      imageUrl: "",
    });
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
      imageUrl: p.imageUrl || "",
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

    const res = await fetch("/api/uploads/products", {
      method: "POST",
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : undefined,
      body: formData,
    });

    setIsUploading(false);

    if (!res.ok) throw new Error("Failed to upload image");

    const data = await res.json();
    return data.url as string;
  };

  const handleSave = async () => {
    if (!vendorId) {
      toast({
        variant: "destructive",
        title: "Vendor profile not found",
      });
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
        ...form,
        imageUrl,
        price: parseFloat(form.price) || 0,
        vendorId,
      };

      if (editingProduct) {
        await updateProduct.mutateAsync({
          productId: editingProduct.id,
          data,
        } as any);

        toast({ title: "Product updated" });
      } else {
        await createProduct.mutateAsync(
          { data } as any
        );

        toast({ title: "Product created" });
      }

      queryClient.invalidateQueries({
        queryKey: getListProductsQueryKey(),
      });

      setDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to save product",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    deleteProduct.mutate(
      { productId: id } as any,
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListProductsQueryKey(),
          });
          toast({ title: "Product deleted" });
        },
        onError: () =>
          toast({
            variant: "destructive",
            title: "Failed to delete",
          }),
      }
    );
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/vendor-portal")}
        >
          <ArrowLeft />
        </Button>

        <h1 className="text-2xl font-bold flex-1">
          My Menu
        </h1>

        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="animate-spin" />
      ) : !(products as any[])?.length ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="mx-auto mb-2" />
            No products yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(products as any[]).map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex justify-between">
                <div>
                  <p className="font-bold">{p.name}</p>
                  <p className="text-sm">{p.description}</p>
                </div>

                <div className="flex gap-2">
                  <Button size="icon" onClick={() => openEdit(p)}>
                    <Pencil />
                  </Button>

                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(p.id)}
                  >
                    <Trash2 />
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
            <DialogTitle>
              {editingProduct ? "Edit" : "Create"} Product
            </DialogTitle>
          </DialogHeader>

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving && (
              <Loader2 className="animate-spin mr-2" />
            )}
            Save
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}