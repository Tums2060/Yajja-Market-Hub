import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/Layout";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Register from "@/pages/register";
import Home from "@/pages/home";
import Shop from "@/pages/shop";
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
import { useEffect } from "react";

const queryClient = new QueryClient();

// Protected Route Wrapper
const ProtectedRoute = ({ component: Component, ...rest }: any) => {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user) return null;

  return <Component {...rest} />;
};

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        
        {/* Customer Routes */}
        <Route path="/"><ProtectedRoute component={Home} /></Route>
        <Route path="/shop"><ProtectedRoute component={Shop} /></Route>
        <Route path="/shop/:category"><ProtectedRoute component={Shop} /></Route>
        <Route path="/vendor/:vendorId"><ProtectedRoute component={VendorDetail} /></Route>
        <Route path="/cart"><ProtectedRoute component={Cart} /></Route>
        <Route path="/checkout"><ProtectedRoute component={Checkout} /></Route>
        <Route path="/orders"><ProtectedRoute component={Orders} /></Route>
        <Route path="/orders/:orderId"><ProtectedRoute component={OrderDetail} /></Route>
        <Route path="/groups"><ProtectedRoute component={Groups} /></Route>
        <Route path="/groups/new"><ProtectedRoute component={CreateGroup} /></Route>
        <Route path="/groups/:groupId"><ProtectedRoute component={GroupDetail} /></Route>
        <Route path="/invites"><ProtectedRoute component={Invites} /></Route>
        <Route path="/leaderboard"><ProtectedRoute component={Leaderboard} /></Route>
        <Route path="/profile"><ProtectedRoute component={Profile} /></Route>

        {/* Vendor Routes */}
        <Route path="/vendor-portal"><ProtectedRoute component={VendorPortal} /></Route>
        <Route path="/vendor-portal/orders"><ProtectedRoute component={VendorOrders} /></Route>
        <Route path="/vendor-portal/products"><ProtectedRoute component={VendorProducts} /></Route>

        {/* Rider Routes */}
        <Route path="/rider-portal"><ProtectedRoute component={RiderPortal} /></Route>
        <Route path="/rider-portal/map"><ProtectedRoute component={RiderMap} /></Route>
        <Route path="/rider-portal/profile"><ProtectedRoute component={RiderProfile} /></Route>

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
