import React from "react";
import { useLocation } from "wouter";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  const authPages = new Set([
    "/login",
    "/register",
    "/vendor/login",
    "/vendor/register",
    "/rider/login",
    "/rider/register",
    "/forgot-password",
    "/reset-password",
  ]);
  const isAuthPage = authPages.has(location);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isCustomer = !!user && user.role === "customer";
  const showBottomNav = isCustomer && !isAuthPage;

  return (
    <div className={`min-h-[100dvh] w-full flex flex-col bg-background text-foreground`}>
      {!isAuthPage && <Navbar />}
      <main className={`flex-1 flex flex-col ${showBottomNav ? "pb-16 md:pb-0" : ""}`}>
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}
