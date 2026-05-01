import React, { useState } from "react";
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
  ShoppingBag, ShoppingCart, Users, Trophy, Mail, User,
  LayoutDashboard, Package, Bike, Map, Menu, LogOut, Home
} from "lucide-react";
import { useGetCart, useListMyInvites } from "@workspace/api-client-react";

const customerLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/invites", label: "Invites", icon: Mail },
];

const vendorLinks = [
  { href: "/vendor-portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor-portal/orders", label: "Orders", icon: ShoppingBag },
  { href: "/vendor-portal/products", label: "Products", icon: Package },
];

const riderLinks = [
  { href: "/rider-portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/rider-portal/map", label: "Live Tracking", icon: Map },
  { href: "/rider-portal/profile", label: "Profile", icon: User },
];

export default function Navbar() {
  const { user, logout, activeMode } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const { data: cart } = useGetCart({ query: { enabled: !!user && user.role === "customer" } });
  const { data: invites } = useListMyInvites({ query: { enabled: !!user && user.role === "customer" } });

  const cartCount = (cart as any)?.items?.length || 0;
  const pendingInvites = (invites as any[])?.filter((i: any) => i.status === "pending").length || 0;

  const navLinks = !user ? [] : user.role === "vendor" ? vendorLinks : user.role === "rider" ? riderLinks : customerLinks;

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4 max-w-7xl mx-auto">
        <Link href={user?.role === "vendor" ? "/vendor-portal" : user?.role === "rider" ? "/rider-portal" : "/"} className="mr-6 flex items-center gap-2 shrink-0">
          <span className="font-extrabold text-xl text-primary tracking-tight">Yajja</span>
          {user && activeMode !== "individual" && (
            <Badge variant="secondary" className="text-xs">Group</Badge>
          )}
        </Link>

        {user && (
          <div className="hidden md:flex flex-1 items-center space-x-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant={isActive(href) ? "default" : "ghost"}
                  size="sm"
                  className="gap-2 relative"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {label === "Cart" && cartCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">{cartCount}</Badge>
                  )}
                  {label === "Invites" && pendingInvites > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center bg-destructive">{pendingInvites}</Badge>
                  )}
                </Button>
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {user ? (
            <>
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {navLinks.map(({ href, label, icon: Icon }) => (
                      <DropdownMenuItem key={href} asChild>
                        <Link href={href} className="flex items-center gap-2">
                          <Icon className="h-4 w-4" /> {label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive flex items-center gap-2">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/profile">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold overflow-hidden">
                      {user.avatarUrl
                        ? <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                        : user.name?.charAt(0)?.toUpperCase()
                      }
                    </div>
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
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
