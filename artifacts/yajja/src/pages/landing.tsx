import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  ShoppingBag,
  Users,
  Truck,
  Utensils,
  Wine,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  MapPin
} from "lucide-react";

export default function Landing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // If already logged in, redirect customer to home, vendor to vendor-portal, etc.
  React.useEffect(() => {
    if (user) {
      if (user.role === "admin" || user.role === "super_admin") {
        setLocation("/admin");
      } else if (user.role === "vendor") {
        setLocation("/vendor-portal");
      } else if (user.role === "rider") {
        setLocation("/rider-portal");
      } else {
        setLocation("/home");
      }
    }
  }, [user, setLocation]);

  const categories = [
    {
      title: "Yajja Food",
      desc: "Order from top local restaurants and kitchens.",
      icon: Utensils,
      color: "from-orange-500/20 to-orange-500/10 text-orange-400",
    },
    {
      title: "Yajja Liquor",
      desc: "Premium beers, wines, and spirits delivered cold.",
      icon: Wine,
      color: "from-red-500/20 to-red-500/10 text-red-400",
    },
    {
      title: "Yajja Pharmacy",
      desc: "Over-the-counter medicine and wellness supplies.",
      icon: ShieldCheck,
      color: "from-green-500/20 to-green-500/10 text-green-400",
    },
    {
      title: "Yajja Go",
      desc: "Household essentials and daily convenience items.",
      icon: ShoppingBag,
      color: "from-blue-500/20 to-blue-500/10 text-blue-400",
    },
  ];

  const features = [

    {
      title: "Rapid Last-Mile Delivery",
      desc: "Our dedicated network of riders ensures your package arrives safely and fresh in under 35 minutes.",
      icon: Truck,
    },
    {
      title: "Escrow & Secure Payments",
      desc: "Pay securely via M-Pesa. Funds are held in escrow and only released to the vendor and rider upon successful delivery.",
      icon: MapPin,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b032d] text-white overflow-hidden relative selection:bg-[#5c3fb5] selection:text-white">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#1800AC]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#5c3fb5]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <section className="container max-w-6xl mx-auto px-4 pt-16 pb-20 md:pt-28 md:pb-32 flex flex-col items-center text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#5c3fb5]/40 bg-[#5c3fb5]/10 text-xs font-semibold tracking-wide text-[#a58bff] mb-6 backdrop-blur-sm"
        >
          <TrendingUp className="h-3.5 w-3.5" /> Madaraka's Premier Multi-Category Delivery Platform
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-purple-200 leading-[1.1] max-w-4xl"
        >
          Everything you need, delivered in <span className="text-[#a58bff]">minutes</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mt-6 text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl font-light leading-relaxed px-2"
        >
          Get food, drinks, pharmacy items, and household essentials. Shop together with group orders, split bills seamlessly, and enjoy safe escrow-protected delivery.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4"
        >
          <Button
            size="lg"
            className="bg-[#5c3fb5] hover:bg-[#4a3196] text-white font-semibold rounded-xl px-8 shadow-xl shadow-purple-950/40 text-base"
            asChild
          >
            <Link href="/register">
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/20 hover:bg-white/5 text-white font-medium rounded-xl px-8 text-base"
            asChild
          >
            <Link href="/login">Login to Account</Link>
          </Button>
        </motion.div>
      </section>

      {/* Categories Showcase */}
      <section className="container max-w-6xl mx-auto px-4 py-16 relative z-10 border-t border-white/5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Card className="bg-[#120a3d]/60 border-white/10 hover:border-[#5c3fb5]/50 transition-all duration-300 hover:translate-y-[-4px] overflow-hidden group">
                  <CardContent className="p-6 flex flex-col items-start">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${cat.color} mb-4`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#a58bff] transition-colors">
                      {cat.title}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {cat.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Features Detail */}
      <section className="container max-w-6xl mx-auto px-4 py-20 relative z-10 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Built for modern urban convenience
          </h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto text-sm md:text-base">
            Yajja redefines the delivery experience by introducing co-buying and secure transactions out of the box.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="flex flex-col items-center text-center p-6 bg-[#120a3d]/30 rounded-2xl border border-white/5 backdrop-blur-sm"
              >
                <div className="p-4 rounded-full bg-[#1800AC]/20 text-[#a58bff] mb-5 ring-1 ring-[#5c3fb5]/20">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">
                  {feat.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {feat.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Footer Info */}
      <footer className="container max-w-6xl mx-auto px-4 py-10 relative z-10 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-xs sm:text-sm">
        <div>© 2026 Yajja. All rights reserved. Nairobi, Kenya.</div>
        <div className="flex gap-4">
          <Link href="/vendor/login" className="hover:text-white transition-colors">Vendor Login</Link>
          <Link href="/rider/login" className="hover:text-white transition-colors">Rider Login</Link>
          <Link href="/admin/login" className="hover:text-white transition-colors">Admin Login</Link>
        </div>
      </footer>
    </div>
  );
}
