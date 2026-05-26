import React from "react";
import { ShoppingBag, ShoppingCart, Store, Package } from "lucide-react";

const ICONS = [ShoppingBag, ShoppingCart, Store, Package];

export function HeroWatermark({ density = 1 }: { density?: number }) {
  const count = Math.round(28 * density);
  const items = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const seed = (i * 9301 + 49297) % 233280;
      const r = seed / 233280;
      const r2 = ((i * 53) % 97) / 97;
      const r3 = ((i * 73 + 17) % 89) / 89;
      return {
        Icon: ICONS[i % ICONS.length],
        top: `${(r * 100).toFixed(1)}%`,
        left: `${(r2 * 100).toFixed(1)}%`,
        size: `${(1.1 + r3 * 1.8).toFixed(2)}rem`,
        rotate: `${Math.round((r3 - 0.5) * 50)}deg`,
      };
    });
  }, [count]);

  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      {items.map((it, i) => (
        <span
          key={i}
          className="absolute opacity-[0.13] select-none"
          style={{
            top: it.top,
            left: it.left,
            fontSize: it.size,
            transform: `rotate(${it.rotate})`,
            filter: "grayscale(1) brightness(2)",
          }}
        >
          <it.Icon className="h-full w-full text-primary" />
        </span>
      ))}
    </div>
  );
}
