import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
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
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl px-6 pt-12 pb-10">
          <div className="flex justify-center pb-4">
            <img
              src="/yajja-icon2.jpeg"
              alt="Yajja"
              className="h-20 w-20 rounded-2xl object-cover"
            />
          </div>

          {submitted ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-full bg-[#FFF7DA] flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-[#2E2A7B]" />
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
                className="w-full h-12 rounded-xl border-[#F2D98B] text-[#2E2A7B] font-semibold hover:bg-[#F8D84E]/30"
                onClick={() => setSubmitted(false)}
              >
                Try a different email
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full h-12 rounded-xl mt-2 text-[#2E2A7B] hover:bg-black/5">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login">
                <button className="flex items-center gap-1.5 text-sm text-[#2E2A7B] mb-5 hover:text-[#1F1C63] transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </button>
              </Link>

              <div className="w-12 h-12 rounded-2xl bg-[#FFF7DA] flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-[#2E2A7B]" />
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
                            className="h-12 rounded-xl bg-[#FFF7DA] border-0 focus-visible:ring-[#F8D84E] placeholder:text-muted-foreground/60"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-bold rounded-xl mt-2 bg-[#F8D84E] text-[#2E2A7B] hover:bg-[#F6D236] disabled:opacity-100 disabled:bg-[#F8D84E] disabled:text-[#2E2A7B]"
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Send Reset Link
                  </Button>
                </form>
              </Form>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
