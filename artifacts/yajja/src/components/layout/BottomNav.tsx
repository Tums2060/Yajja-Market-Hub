import React from "react";
import { Link, useLocation } from "wouter";
import { Home, ShoppingBag, Search, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { useGetCart } from "@workspace/api-client-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Explore", icon: Search },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex md:hidden h-16 safe-area-pb">
      {tabs.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="flex-1">
          <button
            className="w-full h-full flex flex-col items-center justify-center gap-0.5 transition-colors text-foreground"
          >
            <div className="relative">
              <Icon
                className={`h-5 w-5 ${
                  isActive(href) ? "text-primary stroke-[2.5]" : "text-foreground stroke-[1.5]"
                }`}
              />
              {label === "Cart" && cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 text-[9px] flex items-center justify-center bg-primary text-primary-foreground border-0">
                  {cartCount}
                </Badge>
              )}
            </div>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors ${
                isActive(href) ? "bg-primary text-primary-foreground" : "text-foreground"
              }`}
            >
              {label}
            </span>
          </button>
        </Link>
      ))}
    </nav>
  );
}
