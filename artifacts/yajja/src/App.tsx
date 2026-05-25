import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import VendorLogin from "@/pages/vendor-login";
import VendorRegister from "@/pages/vendor-register";
import RiderLogin from "@/pages/rider-login";
import RiderRegister from "@/pages/rider-register";
import Home from "@/pages/home";
import Shop from "@/pages/shop";
import CategoryPage from "@/pages/category";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/order-detail";
import Groups from "@/pages/groups";
import GroupDetail from "@/pages/group-detail";
import CreateGroup from "@/pages/create-group";
import Invites from "@/pages/invites";
import Leaderboard from "@/pages/leaderboard";
import Profile from "@/pages/profile";
import VendorDetail from "@/pages/vendor-detail";

import VendorPortal from "@/pages/vendor-portal/dashboard";
import VendorOrders from "@/pages/vendor-portal/orders";
import VendorProducts from "@/pages/vendor-portal/products";

import RiderPortal from "@/pages/rider-portal/dashboard";
import RiderMap from "@/pages/rider-portal/map";
import RiderProfile from "@/pages/rider-portal/profile";

import AdminDashboard from "@/pages/admin-portal/dashboard";
import AdminVendors from "@/pages/admin-portal/vendors";
import AdminOrders from "@/pages/admin-portal/orders";
import AdminRiders from "@/pages/admin-portal/riders";
import AdminUsers from "@/pages/admin-portal/users";

import { useEffect } from "react";

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
      else if (user.role === "admin") setLocation("/admin");
      else setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;

  return <Component {...rest} />;
};

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/vendor/login" component={VendorLogin} />
        <Route path="/vendor/register" component={VendorRegister} />
        <Route path="/rider/login" component={RiderLogin} />
        <Route path="/rider/register" component={RiderRegister} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />

        {/* Customer Routes */}
        <Route path="/"><ProtectedRoute component={Home} allowedRoles={["customer"]} /></Route>
        <Route path="/shop"><ProtectedRoute component={Shop} allowedRoles={["customer"]} /></Route>
        <Route path="/shop/:category"><ProtectedRoute component={Shop} allowedRoles={["customer"]} /></Route>
        <Route path="/category/:category"><ProtectedRoute component={CategoryPage} allowedRoles={["customer"]} /></Route>
        <Route path="/vendor/:vendorId"><ProtectedRoute component={VendorDetail} allowedRoles={["customer"]} /></Route>
        <Route path="/cart"><ProtectedRoute component={Cart} allowedRoles={["customer"]} /></Route>
        <Route path="/checkout"><ProtectedRoute component={Checkout} allowedRoles={["customer"]} /></Route>
        <Route path="/orders"><ProtectedRoute component={Orders} allowedRoles={["customer"]} /></Route>
        <Route path="/orders/:orderId"><ProtectedRoute component={OrderDetail} allowedRoles={["customer"]} /></Route>
        <Route path="/groups"><ProtectedRoute component={Groups} allowedRoles={["customer"]} /></Route>
        <Route path="/groups/new"><ProtectedRoute component={CreateGroup} allowedRoles={["customer"]} /></Route>
        <Route path="/groups/:groupId"><ProtectedRoute component={GroupDetail} allowedRoles={["customer"]} /></Route>
        <Route path="/invites"><ProtectedRoute component={Invites} allowedRoles={["customer"]} /></Route>
        <Route path="/leaderboard"><ProtectedRoute component={Leaderboard} allowedRoles={["customer"]} /></Route>
        <Route path="/profile"><ProtectedRoute component={Profile} allowedRoles={["customer"]} /></Route>

        {/* Vendor Routes */}
        <Route path="/vendor-portal"><ProtectedRoute component={VendorPortal} allowedRoles={["vendor"]} /></Route>
        <Route path="/vendor-portal/orders"><ProtectedRoute component={VendorOrders} allowedRoles={["vendor"]} /></Route>
        <Route path="/vendor-portal/products"><ProtectedRoute component={VendorProducts} allowedRoles={["vendor"]} /></Route>

        {/* Rider Routes */}
        <Route path="/rider-portal"><ProtectedRoute component={RiderPortal} allowedRoles={["rider"]} /></Route>
        <Route path="/rider-portal/map"><ProtectedRoute component={RiderMap} allowedRoles={["rider"]} /></Route>
        <Route path="/rider-portal/profile"><ProtectedRoute component={RiderProfile} allowedRoles={["rider"]} /></Route>

        {/* Admin Routes */}
        <Route path="/admin"><ProtectedRoute component={AdminDashboard} allowedRoles={["admin"]} /></Route>
        <Route path="/admin/vendors"><ProtectedRoute component={AdminVendors} allowedRoles={["admin"]} /></Route>
        <Route path="/admin/orders"><ProtectedRoute component={AdminOrders} allowedRoles={["admin"]} /></Route>
        <Route path="/admin/riders"><ProtectedRoute component={AdminRiders} allowedRoles={["admin"]} /></Route>
        <Route path="/admin/users"><ProtectedRoute component={AdminUsers} allowedRoles={["admin"]} /></Route>

        <Route component={NotFound} />
      </Switch>
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
