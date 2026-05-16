import React, { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, ShoppingBag, Zap, Users } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Form, FormControl, FormField, FormItem, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HeroWatermark } from "@/components/HeroWatermark";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { setToken, user, isLoading } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useLogin();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "vendor") setLocation("/vendor-portal");
      else if (user.role === "rider") setLocation("/rider-portal");
      else if (user.role === "admin") setLocation("/admin");
      else setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate({ data: values }, {
      onSuccess: (data) => {
        setToken(data.token);
        toast({ title: "Welcome back! 👋" });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Invalid email or password" });
      },
    });
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Purple hero header */}
      <div className="bg-primary relative overflow-hidden flex-shrink-0" style={{ minHeight: "42vh" }}>
        <HeroWatermark />
        <div className="relative z-10 flex flex-col items-center justify-center h-full pt-12 pb-16 px-8 text-center">
          <Logo size={120} className="drop-shadow-lg mb-2" />
          <p className="text-white text-lg font-semibold mt-2 drop-shadow-sm">Everything in order</p>
        </div>
      </div>

      {/* Form card that overlaps the hero */}
      <div className="flex-1 flex flex-col -mt-8 relative z-10">
        <div className="bg-background rounded-t-3xl shadow-2xl flex-1 px-6 pt-8 pb-10 max-w-md w-full mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-1">Sign in</h2>
          <p className="text-muted-foreground text-sm mb-6">Good to have you back!</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Email address"
                        type="email"
                        className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-primary placeholder:text-muted-foreground/60"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Password"
                        type="password"
                        className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-primary placeholder:text-muted-foreground/60"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-12 text-base font-bold rounded-xl mt-2"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Sign In
              </Button>
              <div className="text-right">
                <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  Forgot Password?
                </Link>
              </div>
            </form>
          </Form>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>New to Yajja?</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <Link href="/register">
              <Button variant="outline" className="w-full h-12 rounded-xl border-primary/30 text-primary font-semibold hover:bg-primary/5">
                Create an Account
              </Button>
            </Link>
          </div>

          {/* Feature hints */}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { icon: ShoppingBag, label: "Fast Delivery" },
              { icon: Users, label: "Group Orders" },
              { icon: Zap, label: "Bill Splitting" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40">
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-[10px] font-medium text-center text-muted-foreground leading-tight">{label}</span>
              </div>
            ))}
          </div>

          {/* Portal links */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground mb-2">Joining as a business or rider?</p>
            <div className="flex gap-2 justify-center">
              <Link href="/vendor-portal">
                <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground">Vendor Portal</Button>
              </Link>
              <span className="text-muted-foreground/30 flex items-center">|</span>
              <Link href="/rider-portal">
                <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground">Rider Portal</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
