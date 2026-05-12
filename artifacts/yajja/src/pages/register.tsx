import React from "react";
import { useLocation, Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { KENYA } from "@/lib/format";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Form, FormControl, FormField, FormItem, FormMessage, FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const registerSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(9, "Phone number is required (e.g. +254 700 000 000)"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "" },
  });

  const registerMutation = useRegister();

  function onSubmit(values: z.infer<typeof registerSchema>) {
    registerMutation.mutate(
      { data: { ...values, role: "customer" } },
      {
        onSuccess: (data) => {
          setToken(data.token);
          toast({ title: "Welcome to Yajja! 🎉" });
          setLocation("/");
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Registration failed",
            description: error?.message || "Email may already be registered",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Teal hero header */}
      <div className="bg-primary relative overflow-hidden flex-shrink-0" style={{ minHeight: "36vh" }}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-8 left-8 w-32 h-32 rounded-full bg-white/30" />
          <div className="absolute top-16 right-4 w-20 h-20 rounded-full bg-white/20" />
        </div>
        <div className="relative z-10 flex flex-col h-full pt-10 pb-14 px-6">
          <Link href="/login">
            <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10 -ml-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 flex flex-col items-center justify-center text-center mt-2">
            <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center mb-3 shadow-xl p-2">
              <Logo size={64} />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Join Yajja</h1>
            <p className="text-primary-foreground/80 mt-1.5 text-sm">Everything in order</p>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="flex-1 flex flex-col -mt-8 relative z-10">
        <div className="bg-background rounded-t-3xl shadow-2xl flex-1 px-6 pt-8 pb-10 max-w-md w-full mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-1">Create Account</h2>
          <p className="text-muted-foreground text-sm mb-6">It only takes a minute!</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Full name"
                        className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder={`Phone number (e.g. ${KENYA.phonePlaceholder})`}
                        type="tel"
                        className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-primary"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground/70">
                      Used to verify your identity and prevent duplicate accounts
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Email address"
                        type="email"
                        className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-primary"
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
                        placeholder="Password (min 6 characters)"
                        type="password"
                        className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-primary"
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
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Create Account
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>

          <p className="text-center text-xs text-muted-foreground/60 mt-4 px-4">
            By creating an account you agree to our Terms of Service and Privacy Policy. One account per phone number is allowed.
          </p>

          {/* Portal access */}
          <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">Want to join as a vendor or rider?</p>
            <div className="flex gap-2">
              <Link href="/vendor-portal" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs h-8">Vendor Portal →</Button>
              </Link>
              <Link href="/rider-portal" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs h-8">Rider Portal →</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
