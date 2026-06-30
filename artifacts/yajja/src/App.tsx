import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";

const NotFound = lazy(() => import("@/pages/not-found"));

const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const VendorLogin = lazy(() => import("@/pages/vendor-login"));
const VendorRegister = lazy(() => import("@/pages/vendor-register"));
const RiderLogin = lazy(() => import("@/pages/rider-login"));
const RiderRegister = lazy(() => import("@/pages/rider-register"));
const AdminLogin = lazy(() => import("@/pages/admin-login"));
const Landing = lazy(() => import("@/pages/landing"));
const Home = lazy(() => import("@/pages/home"));
const Shop = lazy(() => import("@/pages/shop"));
const CategoryPage = lazy(() => import("@/pages/category"));
const Cart = lazy(() => import("@/pages/cart"));
const Checkout = lazy(() => import("@/pages/checkout"));
const Orders = lazy(() => import("@/pages/orders"));
const OrderDetail = lazy(() => import("@/pages/order-detail"));
const TrackOrders = lazy(() => import("@/pages/track-orders"));
const Profile = lazy(() => import("@/pages/profile"));
const VendorDetail = lazy(() => import("@/pages/vendor-detail"));
const SearchResults = lazy(() => import("@/pages/search"));

const VendorPortal = lazy(() => import("@/pages/vendor-portal/dashboard"));
const VendorOrders = lazy(() => import("@/pages/vendor-portal/orders"));
const VendorProducts = lazy(() => import("@/pages/vendor-portal/products"));
const VendorProfile = lazy(() => import("@/pages/vendor-portal/profile"));
const VendorPayouts = lazy(() => import("@/pages/vendor-portal/payouts"));

const RiderPortal = lazy(() => import("@/pages/rider-portal/dashboard"));
const RiderMap = lazy(() => import("@/pages/rider-portal/map"));
const RiderProfile = lazy(() => import("@/pages/rider-portal/profile"));
const RiderDeliveries = lazy(() => import("@/pages/rider-portal/deliveries"));
const RiderHistory = lazy(() => import("@/pages/rider-portal/history"));
const RiderEarnings = lazy(() => import("@/pages/rider-portal/earnings"));

const AdminDashboard = lazy(() => import("@/pages/admin-portal/dashboard"));
const AdminVendors = lazy(() => import("@/pages/admin-portal/vendors"));
const AdminOrders = lazy(() => import("@/pages/admin-portal/orders"));
const AdminRiders = lazy(() => import("@/pages/admin-portal/riders"));
const AdminUsers = lazy(() => import("@/pages/admin-portal/users"));
const AdminCustomers = lazy(() => import("@/pages/admin-portal/customers"));

const queryClient = new QueryClient();

const ProtectedRoute = ({ component: Component, allowedRoles, ...rest }: any) => {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      if (allowedRoles?.includes("vendor")) setLocation("/vendor/login");
      else if (allowedRoles?.includes("rider")) setLocation("/rider/login");
      else setLocation("/login");
    } else if (!isLoading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      // Redirect to their portal
      if (user.role === "vendor") setLocation("/vendor-portal");
      else if (user.role === "rider") setLocation("/rider-portal");
      else if (user.role === "admin" || user.role === "super_admin") setLocation("/admin");
      else setLocation("/home");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;

  return <Component {...rest} />;
};

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function SubdomainRedirect() {
  useEffect(() => {
    const hostname = window.location.hostname;
    const subdomain = hostname.split(".")[0];
    const path = window.location.pathname;

    if (path !== "/") return;

    switch (subdomain) {
      case "customer":
        window.location.replace("/login");
        break;
      case "vendor":
        window.location.replace("/vendor/login");
        break;
      case "rider":
        window.location.replace("/rider/login");
        break;
      case "admin":
        window.location.replace("/admin/login");
        break;
    }
  }, []);

  return null;
}

function Router() {
  return (
    <Layout>
      <SubdomainRedirect />
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/vendor/login" component={VendorLogin} />
            <Route path="/vendor/register" component={VendorRegister} />
            <Route path="/rider/login" component={RiderLogin} />
            <Route path="/rider/register" component={RiderRegister} />
            <Route path="/admin/login" component={AdminLogin} />
            <Route path="/login/admin" component={AdminLogin} />
            <Route path="/forgot-password" component={ForgotPassword} />
            <Route path="/reset-password" component={ResetPassword} />

            {/* Customer Routes */}
            <Route path="/" component={Landing} />
            <Route path="/home"><ProtectedRoute component={Home} allowedRoles={["customer"]} /></Route>
            <Route path="/shop"><ProtectedRoute component={Shop} allowedRoles={["customer"]} /></Route>
            <Route path="/shop/:category"><ProtectedRoute component={Shop} allowedRoles={["customer"]} /></Route>
            <Route path="/category/:category"><ProtectedRoute component={CategoryPage} allowedRoles={["customer"]} /></Route>
            <Route path="/search"><ProtectedRoute component={SearchResults} allowedRoles={["customer"]} /></Route>
            <Route path="/vendor/:vendorId"><ProtectedRoute component={VendorDetail} allowedRoles={["customer"]} /></Route>
            <Route path="/cart"><ProtectedRoute component={Cart} allowedRoles={["customer"]} /></Route>
            <Route path="/checkout"><ProtectedRoute component={Checkout} allowedRoles={["customer"]} /></Route>
            <Route path="/orders"><ProtectedRoute component={Orders} allowedRoles={["customer"]} /></Route>
            <Route path="/orders/track"><ProtectedRoute component={TrackOrders} allowedRoles={["customer"]} /></Route>
            <Route path="/orders/:orderId"><ProtectedRoute component={OrderDetail} allowedRoles={["customer"]} /></Route>
            <Route path="/profile"><ProtectedRoute component={Profile} allowedRoles={["customer"]} /></Route>

            {/* Vendor Routes */}
            <Route path="/vendor-portal"><ProtectedRoute component={VendorPortal} allowedRoles={["vendor"]} /></Route>
            <Route path="/vendor-portal/orders"><ProtectedRoute component={VendorOrders} allowedRoles={["vendor"]} /></Route>
            <Route path="/vendor-portal/products"><ProtectedRoute component={VendorProducts} allowedRoles={["vendor"]} /></Route>
            <Route path="/vendor-portal/profile"><ProtectedRoute component={VendorProfile} allowedRoles={["vendor"]} /></Route>
            <Route path="/vendor-portal/payouts"><ProtectedRoute component={VendorPayouts} allowedRoles={["vendor"]} /></Route>

            {/* Rider Routes */}
            <Route path="/rider-portal"><ProtectedRoute component={RiderPortal} allowedRoles={["rider"]} /></Route>
            <Route path="/rider-portal/map"><ProtectedRoute component={RiderMap} allowedRoles={["rider"]} /></Route>
            <Route path="/rider-portal/deliveries"><ProtectedRoute component={RiderDeliveries} allowedRoles={["rider"]} /></Route>
            <Route path="/rider-portal/history"><ProtectedRoute component={RiderHistory} allowedRoles={["rider"]} /></Route>
            <Route path="/rider-portal/profile"><ProtectedRoute component={RiderProfile} allowedRoles={["rider"]} /></Route>
            <Route path="/rider-portal/earnings"><ProtectedRoute component={RiderEarnings} allowedRoles={["rider"]} /></Route>

            {/* Admin Routes */}
            <Route path="/admin"><ProtectedRoute component={AdminDashboard} allowedRoles={["admin", "super_admin"]} /></Route>
            <Route path="/admin/vendors"><ProtectedRoute component={AdminVendors} allowedRoles={["admin", "super_admin"]} /></Route>
            <Route path="/admin/orders"><ProtectedRoute component={AdminOrders} allowedRoles={["admin", "super_admin"]} /></Route>
            <Route path="/admin/riders"><ProtectedRoute component={AdminRiders} allowedRoles={["admin", "super_admin"]} /></Route>
            <Route path="/admin/users"><ProtectedRoute component={AdminUsers} allowedRoles={["admin", "super_admin"]} /></Route>
            <Route path="/admin/customers"><ProtectedRoute component={AdminCustomers} allowedRoles={["admin", "super_admin"]} /></Route>

            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </ErrorBoundary>
    </Layout>

  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
