import React, { useState, useEffect } from "react";
import { Plus, Minus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { formatKES } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type Addon = {
  id: string;
  label: string;
};

type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
};

type Props = {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (args: {
    productId: number;
    quantity: number;
    addons: Addon[];
    instructions: string;
  }) => void;
  isSubmitting?: boolean;
  addons?: Addon[];
};

const DEFAULT_ADDONS: Addon[] = [
  { id: "extra-cheese", label: "Extra cheese" },
  { id: "extra-sauce", label: "Extra sauce" },
  { id: "no-onions", label: "No onions" },
  { id: "spicy", label: "Make it spicy" },
];

export function ProductModal({
  product,
  open,
  onClose,
  onConfirm,
  isSubmitting,
  addons = DEFAULT_ADDONS,
}: Props) {
  const [quantity, setQuantity] = useState(1);
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSelectedAddonIds(new Set());
      setInstructions("");
    }
  }, [open, product?.id]);

  if (!product) return null;

  const selectedAddons = addons.filter((a) => selectedAddonIds.has(a.id));
  const lineTotal = product.price * quantity;

  const toggleAddon = (id: string) => {
    setSelectedAddonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm({
      productId: product.id,
      quantity,
      addons: selectedAddons,
      instructions: instructions.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="p-0 max-w-lg w-full overflow-hidden rounded-2xl border-0 shadow-2xl gap-0 max-h-[92dvh] flex flex-col"
      >
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <DialogDescription className="sr-only">
          {product.description || `Add ${product.name} to your cart`}
        </DialogDescription>
        {/* Image header */}
        <div className="relative h-56 sm:h-64 bg-muted shrink-0">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
              <span className="text-7xl font-extrabold text-primary/30">
                {product.name.charAt(0)}
              </span>
            </div>
          )}
          <DialogClose className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/90 hover:bg-background text-foreground flex items-center justify-center shadow-md backdrop-blur transition-all">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h2 className="text-xl font-extrabold leading-tight">
              {product.name}
            </h2>
            <span className="text-lg font-extrabold text-primary whitespace-nowrap">
              {formatKES(product.price)}
            </span>
          </div>

          {product.description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              {product.description}
            </p>
          )}

          {/* Preferences */}
          {addons.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-bold mb-2">Preferences</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Tell the kitchen what you'd like
              </p>
              <div className="space-y-2">
                {addons.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedAddonIds.has(a.id)}
                      onCheckedChange={() => toggleAddon(a.id)}
                    />
                    <span className="text-sm font-medium truncate flex-1">
                      {a.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Special instructions */}
          <div className="mb-5">
            <h3 className="text-sm font-bold mb-2">Special instructions</h3>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Anything we should know? (e.g. allergies, preparation notes)"
              maxLength={200}
              rows={3}
              className="resize-none rounded-xl"
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">
              {instructions.length}/200
            </p>
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold">Quantity</h3>
            <div className="flex items-center gap-3 bg-muted rounded-full p-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-bold w-6 text-center text-base">{quantity}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                disabled={quantity >= 99}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="border-t bg-background p-4 shrink-0">
          <Button
            type="button"
            className="w-full h-12 text-base font-bold rounded-xl"
            disabled={!product.isAvailable || isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : null}
            Add to cart · {formatKES(lineTotal)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
