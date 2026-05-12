import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import {
  Form, FormControl, FormField, FormItem, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: FormData) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Something went wrong");
      }
      setSubmitted(true);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message ?? "Could not send reset email. Please try again.",
      });
    } finally {
      setIsLoading(false);
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
          <Logo size={120} className="drop-shadow-lg mb-2" />
          <p className="text-white text-lg font-semibold mt-2 drop-shadow-sm">Everything in order</p>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col -mt-8 relative z-10">
        <div className="bg-background rounded-t-3xl shadow-2xl flex-1 px-6 pt-8 pb-10 max-w-md w-full mx-auto">

          {submitted ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Check your inbox</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                If an account with that email exists, we've sent a password reset link.
                It expires in <strong>15 minutes</strong>.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Didn't receive it? Check your spam folder or try again.
              </p>
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl border-primary/30 text-primary font-semibold"
                onClick={() => setSubmitted(false)}
              >
                Try a different email
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full h-12 rounded-xl mt-2 text-muted-foreground">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login">
                <button className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5 hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </button>
              </Link>

              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">Forgot password?</h2>
              <p className="text-muted-foreground text-sm mb-7 leading-relaxed">
                Enter the email address linked to your Yajja account and we'll send you a reset link.
              </p>

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
                            autoComplete="email"
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
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Send Reset Link
                  </Button>
                </form>
              </Form>

              <p className="text-xs text-center text-muted-foreground mt-6">
                Remember your password?{" "}
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
