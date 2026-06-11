import React, { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Form, FormControl, FormField, FormItem, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type AuthRole = "customer" | "vendor" | "rider";

const roleConfig: Record<AuthRole, {
  label: string;
  heading: string;
  subheading: string;
  loginPath: string;
  registerPath: string;
  showCustomerExtras: boolean;
}> = {
  customer: {
    label: "Customer",
    heading: "Sign In as Customer",
    subheading: "Good to have you back!",
    loginPath: "/login",
    registerPath: "/register",
    showCustomerExtras: true,
  },
  vendor: {
    label: "Vendor",
    heading: "Sign In as Vendor",
    subheading: "Access your vendor dashboard.",
    loginPath: "/vendor/login",
    registerPath: "/vendor/register",
    showCustomerExtras: false,
  },
  rider: {
    label: "Rider",
    heading: "Sign In as Rider",
    subheading: "Manage deliveries and tracking.",
    loginPath: "/rider/login",
    registerPath: "/rider/register",
    showCustomerExtras: false,
  },
};

export function AuthLogin({ role }: { role: AuthRole }) {
  const [, setLocation] = useLocation();
  const { setToken, user, isLoading } = useAuth();
  const { toast } = useToast();
  const config = roleConfig[role];

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const loginMutation = useLogin();

  useEffect(() => {
    document.title = `${config.heading} - Yajja`;
  }, [config.heading]);

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
    <div className="min-h-[100dvh] bg-primary-foreground flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 pb-6">
          <img
            src="/yajja-icon1.png"
            alt="Yajja"
            className="h-36 w-56 object-cover shadow-xl ring-2 ring-white/10 rounded-[45%]"
          />
          
        </div>
        <div className="bg-white rounded-3xl shadow-2xl px-6 pt-8 pb-10">
          <div className="flex justify-center pb-3">
            <span className="rounded-full border border-secondary/40 px-3 py-1 text-xs font-semibold text-primary bg-secondary/20">
              {config.label} Account
            </span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1">{config.heading}</h2>
          <p className="text-muted-foreground text-sm mb-6">{config.subheading}</p>

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
                        className="h-12 rounded-xl bg-secondary/20 border-0 focus-visible:ring-secondary placeholder:text-muted-foreground/60"
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
                        className="h-12 rounded-xl bg-secondary/20 border-0 focus-visible:ring-secondary placeholder:text-muted-foreground/60"
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
                {config.heading}
              </Button>
              <div className="text-right">
                <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  Forgot Password?
                </Link>
              </div>
              {role !== "customer" && (
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="w-full h-10 rounded-xl border-secondary/40 text-primary font-semibold hover:bg-secondary/30"
                  >
                    Back to Customer Sign In
                  </Button>
                </Link>
              )}
            </form>
          </Form>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>New to Yajja?</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <Link href={config.registerPath}>
              <Button variant="outline" className="w-full h-12 rounded-xl border-secondary/40 text-primary font-semibold hover:bg-secondary/30">
                {`Sign Up as ${config.label}`}
              </Button>
            </Link>
          </div>

          {config.showCustomerExtras && (
            <>
              <div className="mt-8 text-center">
                <p className="text-xs text-muted-foreground mb-2">Joining as a business or rider?</p>
                <div className="flex gap-2 justify-center">
                  <Link href="/vendor/login">
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground">Vendor Portal</Button>
                  </Link>
                  <span className="text-muted-foreground/30 flex items-center">|</span>
                  <Link href="/rider/login">
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground">Rider Portal</Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return <AuthLogin role="customer" />;
}
