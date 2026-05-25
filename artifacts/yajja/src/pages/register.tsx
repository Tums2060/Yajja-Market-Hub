import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
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
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
    mode: "onChange",
  });

  const registerMutation = useRegister();

  const pw = form.watch("password");
  const cpw = form.watch("confirmPassword");
  const passwordsMatch = pw.length > 0 && pw === cpw;

  function onSubmit(values: z.infer<typeof registerSchema>) {
    const { confirmPassword: _omit, ...payload } = values;
    void _omit;
    registerMutation.mutate(
      { data: { ...payload, role: "customer" } },
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
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-md">
        <Link href="/login">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-0 text-[#2E2A7B] hover:bg-black/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="bg-white rounded-3xl shadow-2xl px-6 pt-12 pb-10">
          <div className="flex justify-center pb-4">
            <img
              src="/yajja-icon2.jpeg"
              alt="Yajja"
              className="h-16 w-16 rounded-2xl object-cover"
            />
          </div>
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
                        autoComplete="name"
                        className="h-12 rounded-xl bg-[#FFF7DA] border-0 focus-visible:ring-[#F8D84E]"
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
                        autoComplete="tel"
                        className="h-12 rounded-xl bg-[#FFF7DA] border-0 focus-visible:ring-[#F8D84E]"
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
                        autoComplete="email"
                        className="h-12 rounded-xl bg-[#FFF7DA] border-0 focus-visible:ring-[#F8D84E]"
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
                      <div className="relative">
                        <Input
                          placeholder="Password (min 6 characters)"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          className="h-12 rounded-xl bg-[#FFF7DA] border-0 focus-visible:ring-[#F8D84E] pr-11"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(s => !s)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          aria-pressed={showPassword}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F8D84E]"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Confirm password"
                          type={showConfirm ? "text" : "password"}
                          autoComplete="new-password"
                          className="h-12 rounded-xl bg-[#FFF7DA] border-0 focus-visible:ring-[#F8D84E] pr-11"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(s => !s)}
                          aria-label={showConfirm ? "Hide password" : "Show password"}
                          aria-pressed={showConfirm}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F8D84E]"
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    {cpw.length > 0 && passwordsMatch && (
                      <p className="text-xs text-emerald-600 font-medium">Passwords match ✓</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 text-base font-bold rounded-xl mt-2 bg-[#F8D84E] text-[#2E2A7B] hover:bg-[#F6D236] disabled:opacity-100 disabled:bg-[#F8D84E] disabled:text-[#2E2A7B]"
                disabled={registerMutation.isPending || !passwordsMatch || !form.formState.isValid}
              >
                {registerMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Create Account
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-[#2E2A7B] font-semibold hover:underline">Sign in</Link>
          </p>

          <p className="text-center text-xs text-muted-foreground/60 mt-4 px-4">
            By creating an account you agree to our Terms of Service and Privacy Policy. One account per phone number is allowed.
          </p>

          {/* Portal access */}
          <div className="mt-6 p-4 rounded-xl bg-[#FFF7DA] border border-[#F2D98B]">
            <p className="text-xs font-medium text-muted-foreground mb-2">Want to join as a vendor or rider?</p>
            <div className="flex gap-2">
              <Link href="/vendor-portal" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs h-8 border-[#F2D98B] text-[#2E2A7B] hover:bg-[#F8D84E]/30">Vendor Portal →</Button>
              </Link>
              <Link href="/rider-portal" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs h-8 border-[#F2D98B] text-[#2E2A7B] hover:bg-[#F8D84E]/30">Rider Portal →</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
