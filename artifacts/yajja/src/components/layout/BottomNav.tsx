import React from "react";
import { Link, useLocation } from "wouter";
import { Home, Search, ShoppingCart, Receipt } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { useGetCart } from "@workspace/api-client-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Explore", icon: Search },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "Orders", icon: Receipt },
];

export default function BottomNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  const { data: cart } = useGetCart({ query: { enabled: !!user && user.role === "customer" } });
  const cartCount = (cart as any)?.items?.length || 0;

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  if (!user || user.role !== "customer") return null;

  return (
    <nav
      className="fixed left-1/2 z-50 flex md:hidden items-center gap-2 -translate-x-1/2 rounded-[32px] bg-[#1A2340] px-3 py-2.5"
      style={{ bottom: "max(24px, env(safe-area-inset-bottom))", boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link key={href} href={href}>
            <button
              aria-label={label}
              className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                active ? "bg-brand-yellow text-brand-yellow-foreground" : "text-white hover:bg-white/10"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
              {label === "Cart" && cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center border-0">
                  {cartCount}
                </Badge>
              )}
            </button>
          </Link>
        );
      })}
    </nav>
  );
}
