import React, { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, ArrowLeft, Eye, EyeOff, MapPin, CheckCircle2, Check, ArrowRight } from "lucide-react";
import { KENYA } from "@/lib/format";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Form, FormControl, FormField, FormItem, FormMessage, FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type AuthRole = "customer" | "vendor" | "rider";

const VENDOR_CATEGORIES = [
  { value: "food", label: "Food & Drinks" },
  { value: "liquor", label: "Liquor" },
  { value: "pharmacy", label: "Pharmacy & Health" },
  { value: "household", label: "Household & Convenience" },
] as const;

function makeSchema(role: AuthRole) {
  const base = {
    name: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(9, "Phone number is required (e.g. +254 700 000 000)"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    businessName: z.string().optional(),
    category: z.enum(["food", "liquor", "pharmacy", "household"]).optional(),
    address: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  };

  if (role === "vendor") {
    base.businessName = z.string().min(2, "Business name is required") as any;
    base.category = z.enum(["food", "liquor", "pharmacy", "household"], {
      message: "Please choose a category",
    }) as any;
  }

  return z.object(base).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
}

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
    heading: "Sign Up as Customer",
    subheading: "It only takes a minute!",
    loginPath: "/login",
    registerPath: "/register",
    showCustomerExtras: true,
  },
  vendor: {
    label: "Vendor",
    heading: "Sign Up as Vendor",
    subheading: "Set up your store and start selling on Yajja.",
    loginPath: "/vendor/login",
    registerPath: "/vendor/register",
    showCustomerExtras: false,
  },
  rider: {
    label: "Rider",
    heading: "Sign Up as Rider",
    subheading: "Create a rider account to start deliveries.",
    loginPath: "/rider/login",
    registerPath: "/rider/register",
    showCustomerExtras: false,
  },
};

export function AuthRegister({ role }: { role: AuthRole }) {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [locating, setLocating] = useState(false);
  const config = roleConfig[role];
  const isVendor = role === "vendor";

  useEffect(() => {
    document.title = `${config.heading} - Yajja`;
  }, [config.heading]);

  const schema = useMemo(() => makeSchema(role), [role]);

  const form = useForm<z.infer<ReturnType<typeof makeSchema>>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", email: "", phone: "", password: "", confirmPassword: "",
      businessName: "", category: undefined, address: "",
      latitude: undefined, longitude: undefined,
    },
    mode: "onChange",
  });

  const registerMutation = useRegister();

  const pw = form.watch("password");
  const cpw = form.watch("confirmPassword");
  const lat = form.watch("latitude");
  const lng = form.watch("longitude");
  const category = form.watch("category");
  const passwordsMatch = pw.length > 0 && pw === cpw;

  function captureLocation() {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Location unavailable", description: "Your browser does not support geolocation." });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setValue("latitude", pos.coords.latitude, { shouldValidate: true });
        form.setValue("longitude", pos.coords.longitude, { shouldValidate: true });
        setLocating(false);
        toast({ title: "Location captured", description: "Your store location has been pinned." });
      },
      () => {
        setLocating(false);
        toast({ variant: "destructive", title: "Couldn't get location", description: "Please allow location access or enter your address." });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function onSubmit(values: z.infer<ReturnType<typeof makeSchema>>) {
    const { confirmPassword: _omit, businessName, category, address, latitude, longitude, ...rest } = values;
    void _omit;
    const payload: any = { ...rest, role };
    if (isVendor) {
      payload.businessName = businessName;
      payload.category = category;
      if (address) payload.address = address;
      if (typeof latitude === "number") payload.latitude = latitude;
      if (typeof longitude === "number") payload.longitude = longitude;
    }
    registerMutation.mutate(
      { data: payload },
      {
        onSuccess: (data) => {
          setToken(data.token);
          toast({ title: "Welcome to Yajja!" });
          setLocation(isVendor ? "/vendor-portal" : "/");
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

  const inputClass = "h-12 rounded-xl bg-secondary/20 border-0 focus-visible:ring-secondary";

  return (
  <div className="relative min-h-[100dvh] overflow-hidden">

    {/* Background Video */}
    <video
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 h-full w-full object-cover"
    >
      <source src="/background-video.mp4" type="video/mp4" />
    </video>

    {/* Dark Overlay */}
    {/* <div className="absolute inset-0 bg-black/50"></div> */}
    <div className="relative z-10 min-h-[100dvh] flex items-center justify-center px-4 py-10">

      
      <div className="relative w-full max-w-md">
        <Link href={config.loginPath}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-0 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex flex-col items-center gap-3 pb-6">
          <img
            src="/yajja-icon1.png"
            alt="Yajja"
            className="h-36 w-56 object-cover shadow-xl ring-2 ring-white/10 rounded-[45%]"
          />
          
        </div>
        <div className="bg-white rounded-3xl shadow-2xl px-6 pt-8 pb-10">
          <div className="flex justify-center pb-3">
            <span className="rounded-full border border-secondary/40 px-3 py-1 text-xs font-semibold !text-black bg-secondary/20">
              {config.label} Account
            </span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1">{config.heading}</h2>
          <p className="text-muted-foreground text-sm mb-6">{config.subheading}</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              {isVendor && (
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Business / store name"
                          autoComplete="organization"
                          className={inputClass}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder={isVendor ? "Owner full name" : "Full name"}
                        autoComplete="name"
                        className={inputClass}
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
                        className={inputClass}
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
                        className={inputClass}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isVendor && (
                <>
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <select
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value || undefined)}
                            className={`${inputClass} w-full px-3 text-sm ${category ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            <option value="" disabled>Select store category</option>
                            {VENDOR_CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder={`Store location (${KENYA.addressPlaceholder})`}
                            autoComplete="street-address"
                            className={inputClass}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={captureLocation}
                    disabled={locating}
                    className="w-full h-11 rounded-xl border-secondary/50 text-primary hover:bg-secondary/20 justify-center gap-2"
                  >
                    {locating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : typeof lat === "number" && typeof lng === "number" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                    {typeof lat === "number" && typeof lng === "number"
                      ? `Location pinned (${lat.toFixed(4)}, ${lng.toFixed(4)})`
                      : "Pin my store location (GPS)"}
                  </Button>
                </>
              )}

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
                          className={`${inputClass} pr-11`}
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
                          className={`${inputClass} pr-11`}
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
                      <p className="text-xs text-emerald-600 font-medium flex items-center gap-1"><Check className="h-3 w-3" /> Passwords match</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 text-base font-bold rounded-xl mt-2 disabled:opacity-100"
                disabled={registerMutation.isPending || !passwordsMatch || !form.formState.isValid}
              >
                {registerMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {config.heading}
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href={config.loginPath} className="text-primary font-semibold hover:underline">
              {`Sign in as ${config.label}`}
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground/60 mt-4 px-4">
            By creating an account you agree to our Terms of Service and Privacy Policy. One account per phone number is allowed.
          </p>

          {config.showCustomerExtras && (
            <div className="mt-6 p-4 rounded-xl bg-secondary/20 border border-secondary/40">
              <p className="text-xs font-medium text-muted-foreground mb-2">Want to join as a vendor or rider?</p>
              <div className="flex gap-2">
                <Link href="/vendor/login" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs h-8 border-secondary/40 text-primary hover:bg-secondary/30 gap-1">Vendor Portal <ArrowRight className="h-3 w-3" /></Button>
                </Link>
                <Link href="/rider/login" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs h-8 border-secondary/40 text-primary hover:bg-secondary/30 gap-1">Rider Portal <ArrowRight className="h-3 w-3" /></Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

export default function Register() {
  return <AuthRegister role="customer" />;
}
