import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ShoppingBag, Lock, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Form, FormControl, FormField, FormItem, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

type TokenState = "checking" | "valid" | "invalid";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tokenState, setTokenState] = useState<TokenState>("checking");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      return;
    }
    fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => setTokenState(data.valid ? "valid" : "invalid"))
      .catch(() => setTokenState("invalid"));
  }, [token]);

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message ?? "Something went wrong");
      }
      setSuccess(true);
      toast({ title: "Password reset!", description: "You can now sign in with your new password." });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: err.message ?? "Could not reset your password. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Teal hero header */}
      <div className="bg-primary relative overflow-hidden flex-shrink-0" style={{ minHeight: "38vh" }}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-8 left-8 w-32 h-32 rounded-full bg-white/30" />
          <div className="absolute top-16 right-4 w-20 h-20 rounded-full bg-white/20" />
          <div className="absolute bottom-4 left-1/3 w-16 h-16 rounded-full bg-white/25" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full pt-12 pb-16 px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4 shadow-lg">
            <ShoppingBag className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Yajja</h1>
          <p className="text-primary-foreground/80 mt-2 text-base">Your neighbourhood, delivered.</p>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col -mt-8 relative z-10">
        <div className="bg-background rounded-t-3xl shadow-2xl flex-1 px-6 pt-8 pb-10 max-w-md w-full mx-auto">

          {/* Checking token */}
          {tokenState === "checking" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Verifying your reset link…</p>
            </div>
          )}

          {/* Invalid / expired token */}
          {tokenState === "invalid" && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Link expired</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                This password reset link is invalid or has already expired.
                Reset links are only valid for <strong>15 minutes</strong>.
              </p>
              <Link href="/forgot-password">
                <Button className="w-full h-12 rounded-xl font-bold">
                  Request a new link
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" className="w-full h-12 rounded-xl mt-2 text-muted-foreground">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          )}

          {/* Success state */}
          {tokenState === "valid" && success && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Password updated!</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                Your password has been reset successfully. Sign in with your new password.
              </p>
              <Button
                className="w-full h-12 rounded-xl font-bold"
                onClick={() => setLocation("/login")}
              >
                Sign In
              </Button>
            </div>
          )}

          {/* Reset form */}
          {tokenState === "valid" && !success && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Set new password</h2>
              <p className="text-muted-foreground text-sm mb-7 leading-relaxed">
                Choose a strong password for your Yajja account. It must be at least 6 characters.
              </p>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="New password"
                            type="password"
                            autoComplete="new-password"
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
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Confirm new password"
                            type="password"
                            autoComplete="new-password"
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
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Reset Password
                  </Button>
                </form>
              </Form>

              <p className="text-xs text-center text-muted-foreground mt-6">
                Remember it now?{" "}
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
