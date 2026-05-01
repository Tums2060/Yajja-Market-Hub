import React from "react";
import { Link, useLocation } from "wouter";
import Navbar from "./Navbar";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  const isAuthPage = location === "/login" || location === "/register";

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background text-foreground">
      {!isAuthPage && <Navbar />}
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
