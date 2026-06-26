import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingBag, ShoppingCart, Users, User,
  LayoutDashboard, Package, Map, Menu, LogOut, Home,
  Store, Truck, Receipt, History, DollarSign, Clock
} from "lucide-react";
import { useGetCart } from "@workspace/api-client-react";
import NotificationBell from "./NotificationBell";

const customerLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Explore", icon: ShoppingBag },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "Orders", icon: Receipt },
  { href: "/orders/track", label: "Track Orders", icon: Clock },
];

const vendorLinks = [
  { href: "/vendor-portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor-portal/orders", label: "Orders", icon: Receipt },
  { href: "/vendor-portal/products", label: "My Menu", icon: Package },
  { href: "/vendor-portal/payouts", label: "Payout Proofs", icon: History },
];

const riderLinks = [
  { href: "/rider-portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rider-portal/map", label: "Live Tracking", icon: Map },
  { href: "/rider-portal/earnings", label: "Earnings", icon: DollarSign },
  { href: "/rider-portal/history", label: "History", icon: History },
  { href: "/rider-portal/profile", label: "Profile", icon: User },
];

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vendors", label: "Vendors", icon: Store },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/riders", label: "Riders", icon: Truck },
  { href: "/admin/users", label: "Users", icon: Users },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    if (user?.role === "vendor") setLocation("/vendor/login");
    else if (user?.role === "rider") setLocation("/rider/login");
    else setLocation("/login");
  };

  const { data: cart } = useGetCart({ query: { enabled: !!user && user.role === "customer" } as any });
  const cartCount = (cart as any)?.items?.length || 0;

  const navLinks = !user ? [] :
    user.role === "vendor" ? vendorLinks :
    user.role === "rider" ? riderLinks :
    user.role === "admin" ? adminLinks :
    customerLinks;

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const portalLabel = user?.role === "vendor" ? "Vendor Portal" :
    user?.role === "rider" ? "Rider Portal" :
    user?.role === "admin" ? "Admin Portal" : null;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#1800AC] text-white">
      <div className="container flex h-20 items-center px-4 max-w-7xl mx-auto">
        <Link
          href={user?.role === "vendor" ? "/vendor-portal" : user?.role === "rider" ? "/rider-portal" : user?.role === "admin" ? "/admin" : "/"}
          className="mr-6 flex items-center gap-2 shrink-0"
        >
          <img src="/yajja-icon3.png" alt="Yajja" className="h-16 w-26 object-cover shadow-xl ring-2 ring-white/10 rounded-[45%]" />
          {portalLabel && (
            <Badge variant="outline" className="text-xs hidden sm:inline-flex border-white/30 text-white bg-white/5">
              {portalLabel}
            </Badge>
          )}
        </Link>

        {user && (
          <div className="hidden md:flex flex-1 items-center space-x-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant={isActive(href) ? "default" : "ghost"}
                  size="sm"
                  className={`gap-2 relative ${
                    isActive(href) ? "" : "text-white/85 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {label === "Cart" && cartCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">{cartCount}</Badge>
                  )}
                </Button>
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {user ? (
            <>
              <NotificationBell />
              {/* Mobile hamburger — all nav links */}
              <div className={user.role === "customer" ? "md:hidden" : ""}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white">
                      <Menu className="h-6 w-6" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {user.role === "customer" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/cart" className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" /> Cart
                            {cartCount > 0 && <Badge className="ml-auto h-4 px-1 text-[10px]">{cartCount}</Badge>}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/orders" className="flex items-center gap-2">
                            <Receipt className="h-4 w-4" /> Orders
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/orders/track" className="flex items-center gap-2">
                            <Clock className="h-4 w-4" /> Track Orders
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {user.role !== "customer" && navLinks.map(({ href, label, icon: Icon }) => (
                      <DropdownMenuItem key={href} asChild>
                        <Link href={href} className="flex items-center gap-2">
                          <Icon className="h-4 w-4" /> {label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={user.role === "vendor" ? "/vendor-portal/profile" : user.role === "rider" ? "/rider-portal/profile" : "/profile"} className="flex items-center gap-2">
                        <User className="h-4 w-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive flex items-center gap-2">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Desktop avatar */}
              <div className="hidden md:flex items-center gap-2">
                {user.role === "customer" && cartCount > 0 && (
                  <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/10 hover:text-white" asChild>
                    <Link href="/cart">
                      <ShoppingCart className="h-5 w-5" />
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">{cartCount}</Badge>
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" asChild>
                  <Link href={user.role === "vendor" ? "/vendor-portal" : user.role === "rider" ? "/rider-portal/profile" : user.role === "admin" ? "/admin" : "/profile"}>
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                      {user.avatarUrl
                        ? <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                        : user.name?.charAt(0)?.toUpperCase()
                      }
                    </div>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white/80 gap-1.5 hover:bg-white/10 hover:text-white">
                  <LogOut className="h-4 w-4" /> Sign Out
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
