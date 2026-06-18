import React, { useMemo, useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  useAssignRider,
  useListRiderOrders,
  usePickupOrder,
  useDeliverOrder,
  getListRiderOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bike,
  LogOut,
  MapPin,
  Package,
  Loader2,
  Phone,
  Navigation,
  CheckCircle,
  Clock,
  Unlock,
  Signature,
  FileText,
  AlertTriangle,
  Play,
  RotateCcw,
  DollarSign,
  User,
} from "lucide-react";

const statusColor: Record<string, string> = {
  accepted: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  preparing: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  ready: "bg-green-500/10 text-green-600 border-green-500/20",
  picked_up: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  delivered: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

export default function RiderPortal() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeCode, setActiveCode] = useState<string | null>(null);
  
  // Custom Flow States
  const [verifiedItems, setVerifiedItems] = useState<Record<number, boolean>>({});
  const [arrivedAtCustomer, setArrivedAtCustomer] = useState(false);
  const [handoffMethod, setHandoffMethod] = useState<"pin" | "signature">("pin");
  const [enteredPin, setEnteredPin] = useState("");
  const [isPinApproved, setIsPinApproved] = useState(false);
  
  // Signature Drawing States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [isSignatureApproved, setIsSignatureApproved] = useState(false);

  useRealtimeOrders();

  const { data: orders, isLoading } = useListRiderOrders(
    undefined,
    {
      query: {
        queryKey: getListRiderOrdersQueryKey(),
        enabled: true,
        refetchInterval: 5000,
      },
    }
  );
  const assignRider = useAssignRider();
  const pickup = usePickupOrder();
  const deliver = useDeliverOrder();

  const { data: riderProfile } = useQuery({
    queryKey: ["rider", "me"],
    queryFn: async () => {
      const token = localStorage.getItem("yajja_token");
      const res = await fetch("/api/riders/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load rider profile");
      return res.json();
    },
  });

  const bundles = useMemo(() => {
    const items = (orders as any[]) || [];
    const map = new Map<string, any[]>();
    items.forEach((order) => {
      const code = order.orderCode || String(order.id);
      if (!map.has(code)) map.set(code, []);
      map.get(code)!.push(order);
    });
    return Array.from(map.entries()).map(([code, bundleOrders]) => {
      const vendors = bundleOrders.map((o) => o.vendorName).filter(Boolean);
      const status = bundleOrders.some((o) => o.status === "picked_up") ? "picked_up" : bundleOrders[0]?.status;
      return {
        code,
        orders: bundleOrders,
        vendors,
        status,
        customerName: bundleOrders[0]?.customerName,
        customerPhone: bundleOrders[0]?.customerPhone,
        deliveryAddress: bundleOrders[0]?.deliveryAddress,
      };
    });
  }, [orders]);

  // Auto-recover active code if a bundle is already assigned to this rider on mount/update
  useEffect(() => {
    if (bundles.length > 0 && !activeCode && riderProfile?.id) {
      const assigned = bundles.find((b) =>
        b.orders.some((o) => o.riderId === riderProfile.id)
      );
      if (assigned) {
        setActiveCode(assigned.code);
      }
    }
  }, [bundles, activeCode, riderProfile]);

  const activeBundle = useMemo(() => {
    return bundles.find((b) => b.code === activeCode) || null;
  }, [bundles, activeCode]);

  const allPickedUp = useMemo(() => {
    return activeBundle?.orders.every((o: any) => o.status === "picked_up") || false;
  }, [activeBundle]);

  // PIN Verification Validation
  const expectedPin = useMemo(() => {
    const phone = activeBundle?.customerPhone || "";
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 4 ? digits.slice(-4) : "1234";
  }, [activeBundle]);

  useEffect(() => {
    if (enteredPin === expectedPin) {
      setIsPinApproved(true);
      toast({ title: "PIN verified successfully" });
    } else {
      setIsPinApproved(false);
    }
  }, [enteredPin, expectedPin, toast]);

  // Setup signature canvas line properties
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1A2340";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
  }, [canvasRef.current, handoffMethod, arrivedAtCustomer]);

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    setIsSignatureApproved(false);
  };

  const confirmSignature = () => {
    if (hasSigned) {
      setIsSignatureApproved(true);
      toast({ title: "Signature saved successfully" });
    }
  };

  // Safe accepting mutation with Promise.all
  const handleAccept = async (bundleCode: string, orderList: any[]) => {
    if (!riderProfile?.id) {
      toast({ variant: "destructive", title: "Rider profile missing" });
      return;
    }
    try {
      toast({ title: "Accepting job..." });
      await Promise.all(
        orderList.map((order) =>
          assignRider.mutateAsync({ orderId: order.id, data: { riderId: riderProfile.id } } as any)
        )
      );
      await queryClient.invalidateQueries({ queryKey: getListRiderOrdersQueryKey() });
      setActiveCode(bundleCode);
      toast({ title: "Order accepted successfully" });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to accept order" });
    }
  };

  // Safe pickup mutation
  const handlePickup = (orderId: number) => {
    pickup.mutate({ orderId } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRiderOrdersQueryKey() });
        toast({ title: "Pickup confirmed" });
      },
      onError: () => toast({ variant: "destructive", title: "Failed to confirm pickup" }),
    });
  };

  // Safe deliver mutation with Promise.all (fixes persistent job bug)
  const handleDeliverAll = async (orderIds: number[]) => {
    try {
      toast({ title: "Completing delivery..." });
      await Promise.all(
        orderIds.map((orderId) => deliver.mutateAsync({ orderId } as any))
      );
      await queryClient.invalidateQueries({ queryKey: getListRiderOrdersQueryKey() });
      toast({ title: "Delivery completed successfully!" });
      
      // Reset local states
      setActiveCode(null);
      setArrivedAtCustomer(false);
      setVerifiedItems({});
      setEnteredPin("");
      setIsPinApproved(false);
      setHasSigned(false);
      setIsSignatureApproved(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to mark orders as delivered" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
        
        {/* Top Header */}
        <div className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-[#1A2340] flex items-center justify-center text-white">
              <Bike className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#1A2340]">Dasher Portal</h1>
              <p className="text-xs text-slate-500">{user?.name} • Active Rider</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50"
            onClick={() => {
              logout();
              setLocation("/rider/login");
            }}
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>

        {/* Quick Navigation Panel */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            onClick={() => setLocation("/rider-portal")}
            className="h-12 text-xs font-extrabold rounded-2xl flex items-center justify-center gap-1.5 shadow-sm border border-slate-100 bg-white text-slate-700 hover:bg-slate-50"
            variant="ghost"
          >
            <Bike className="h-4 w-4 text-[#1A2340]" /> Active Jobs
          </Button>
          <Button
            onClick={() => setLocation("/rider-portal/earnings")}
            className="h-12 text-xs font-extrabold rounded-2xl flex items-center justify-center gap-1.5 shadow-sm border border-slate-100 bg-white text-slate-700 hover:bg-slate-50"
            variant="ghost"
          >
            <DollarSign className="h-4 w-4 text-[#1A2340]" /> My Earnings
          </Button>
          <Button
            onClick={() => setLocation("/rider-portal/profile")}
            className="h-12 text-xs font-extrabold rounded-2xl flex items-center justify-center gap-1.5 shadow-sm border border-slate-100 bg-white text-slate-700 hover:bg-slate-50"
            variant="ghost"
          >
            <User className="h-4 w-4 text-[#1A2340]" /> Profile
          </Button>
        </div>

        {activeBundle ? (
          <div className="space-y-6">
            
            {/* active order stepper */}
            <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
              <div className="bg-[#1A2340] text-white p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-slate-300">ACTIVE DELIVERY JOB</p>
                  <h2 className="text-lg font-black mt-0.5">Order Bundle {activeBundle.code}</h2>
                </div>
                <Badge className="bg-amber-500 text-white font-extrabold text-xs">
                  {allPickedUp ? "IN TRANSIT TO CUSTOMER" : "PICKING UP FROM MERCHANTS"}
                </Badge>
              </div>
              <CardContent className="p-5">
                
                {/* Stepper Steps UI */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-5 text-xs font-extrabold">
                  <div className="flex items-center gap-1.5 text-[#1A2340]">
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-white ${allPickedUp ? "bg-emerald-500" : "bg-[#1A2340]"}`}>
                      {allPickedUp ? "✓" : "1"}
                    </span>
                    <span>Merchant Pickups</span>
                  </div>
                  <div className="h-0.5 bg-slate-100 flex-1 mx-3" />
                  <div className={`flex items-center gap-1.5 ${allPickedUp && !arrivedAtCustomer ? "text-[#1A2340]" : arrivedAtCustomer ? "text-emerald-500" : "text-slate-400"}`}>
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-white ${arrivedAtCustomer ? "bg-emerald-500" : allPickedUp ? "bg-[#1A2340]" : "bg-slate-200"}`}>
                      {arrivedAtCustomer ? "✓" : "2"}
                    </span>
                    <span>Transit</span>
                  </div>
                  <div className="h-0.5 bg-slate-100 flex-1 mx-3" />
                  <div className={`flex items-center gap-1.5 ${arrivedAtCustomer ? "text-[#1A2340]" : "text-slate-400"}`}>
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-white ${arrivedAtCustomer ? "bg-[#1A2340]" : "bg-slate-200"}`}>
                      3
                    </span>
                    <span>Handoff Verification</span>
                  </div>
                </div>

                {/* Stepper Content */}
                {!allPickedUp ? (
                  // STEP 1: MERCHANT PICKUPS
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-extrabold text-[#1A2340]">MERCHANT COLLECTION STOPS</h3>
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Pick up as soon as possible
                      </span>
                    </div>

                    <div className="space-y-4">
                      {activeBundle.orders.map((order: any, idx: number) => {
                        const isPickedUp = order.status === "picked_up";
                        
                        // Items check for this order
                        const orderItems = order.items || [];
                        const allItemsChecked = orderItems.every((item: any) => verifiedItems[item.id]);

                        return (
                          <div
                            key={order.id}
                            className={`border rounded-2xl p-4 transition-all ${
                              isPickedUp
                                ? "bg-slate-50/50 border-slate-100 opacity-70"
                                : "bg-white border-blue-500/20 shadow-sm"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-4 mb-3">
                              <div>
                                <span className="text-xs font-bold text-slate-400">STOP {idx + 1}</span>
                                <h4 className="font-extrabold text-[#1A2340] text-md">{order.vendorName}</h4>
                                {order.deliveryAddress && (
                                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /> Merchant Address
                                  </p>
                                )}
                              </div>
                              <Badge className={isPickedUp ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}>
                                {isPickedUp ? "COLLECTED" : order.status.toUpperCase()}
                              </Badge>
                            </div>

                            {/* Verification Checklist */}
                            {!isPickedUp && (
                              <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-2.5">
                                <p className="text-xs font-extrabold text-[#1A2340] tracking-wider uppercase flex items-center gap-1.5">
                                  <FileText className="h-3.5 w-3.5 text-slate-500" /> Verify Items In Bag
                                </p>
                                <div className="space-y-2">
                                  {orderItems.map((item: any) => (
                                    <label
                                      key={item.id}
                                      className="flex items-start gap-3 cursor-pointer text-xs font-semibold text-slate-700 bg-white p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                                    >
                                      <Checkbox
                                        checked={!!verifiedItems[item.id]}
                                        onCheckedChange={(checked) => {
                                          setVerifiedItems((prev) => ({
                                            ...prev,
                                            [item.id]: !!checked,
                                          }));
                                        }}
                                        className="mt-0.5 rounded-sm"
                                      />
                                      <div className="flex-1 flex justify-between">
                                        <span>{item.productName}</span>
                                        <span className="font-extrabold bg-slate-100 px-1.5 rounded">x{item.quantity}</span>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}

                            {!isPickedUp ? (
                              <div className="flex gap-2.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 rounded-xl text-xs gap-1.5 font-bold"
                                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.vendorName)}`)}
                                >
                                  <Navigation className="h-3.5 w-3.5" /> Navigate
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1 rounded-xl text-xs font-extrabold bg-[#1A2340] text-white hover:bg-slate-800"
                                  onClick={() => handlePickup(order.id)}
                                  disabled={!allItemsChecked || pickup.isPending}
                                >
                                  {pickup.isPending ? "Confirming..." : "Confirm Pickup"}
                                </Button>
                              </div>
                            ) : (
                              <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" /> Picked up successfully!
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : !arrivedAtCustomer ? (
                  // STEP 2: TRANSIT TO CUSTOMER
                  <div className="space-y-5">
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-slate-400">CUSTOMER DESTINATION</span>
                          <h3 className="font-black text-[#1A2340] text-lg mt-0.5">{activeBundle.customerName}</h3>
                        </div>
                        <a
                          href={`tel:${activeBundle.customerPhone}`}
                          className="h-10 w-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-[#1A2340] shadow-sm hover:bg-slate-50 transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      </div>

                      <div className="flex items-start gap-2.5 text-slate-600 text-sm">
                        <MapPin className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-slate-700">Delivery Address</p>
                          <p className="text-xs mt-0.5">{activeBundle.deliveryAddress}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 rounded-xl text-xs gap-1.5 font-bold bg-white"
                          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeBundle.deliveryAddress || "")}`)}
                        >
                          <Navigation className="h-4 w-4 text-slate-500" /> Start Navigation
                        </Button>
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-2xl p-4 space-y-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collected Bundle Checklist</p>
                      <div className="space-y-1.5">
                        {activeBundle.orders.map((o: any) =>
                          (o.items || []).map((item: any) => (
                            <div key={item.id} className="flex justify-between text-xs font-semibold text-slate-700">
                              <span>{item.productName} ({o.vendorName})</span>
                              <span>x{item.quantity}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="w-full rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 shadow-sm gap-2"
                      onClick={() => setArrivedAtCustomer(true)}
                    >
                      <CheckCircle className="h-5 w-5" /> I Have Arrived at Location
                    </Button>
                  </div>
                ) : (
                  // STEP 3: HANDOFF & VERIFICATION
                  <div className="space-y-5">
                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-4">
                      <h3 className="font-extrabold text-[#1A2340] text-sm">COMPLETE HANDOFF VERIFICATION</h3>
                      
                      <div className="flex gap-3 bg-white p-1 rounded-xl border border-slate-100">
                        <Button
                          variant="ghost"
                          className={`flex-1 rounded-lg text-xs gap-1.5 font-extrabold h-9 ${
                            handoffMethod === "pin"
                              ? "bg-[#1A2340] text-white hover:bg-slate-800"
                              : "text-slate-500 hover:bg-slate-50"
                          }`}
                          onClick={() => setHandoffMethod("pin")}
                        >
                          <Unlock className="h-3.5 w-3.5" /> PIN Verification
                        </Button>
                        <Button
                          variant="ghost"
                          className={`flex-1 rounded-lg text-xs gap-1.5 font-extrabold h-9 ${
                            handoffMethod === "signature"
                              ? "bg-[#1A2340] text-white hover:bg-slate-800"
                              : "text-slate-500 hover:bg-slate-50"
                          }`}
                          onClick={() => setHandoffMethod("signature")}
                        >
                          <Signature className="h-3.5 w-3.5" /> Client Signature
                        </Button>
                      </div>

                      {handoffMethod === "pin" ? (
                        <div className="space-y-3 p-1">
                          <div className="text-xs text-slate-500 leading-relaxed bg-white border rounded-xl p-3 space-y-1">
                            <p className="font-bold text-[#1A2340] flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-amber-500" /> Verification Security PIN</p>
                            <p>Ask customer for their 4-digit code. In this simulation, use the last 4 digits of customer's phone: <span className="font-extrabold text-[#1A2340] bg-slate-100 px-1 rounded">{expectedPin}</span></p>
                          </div>
                          <Input
                            placeholder="Enter 4-digit verification PIN"
                            value={enteredPin}
                            onChange={(e) => setEnteredPin(e.target.value)}
                            maxLength={4}
                            className="rounded-xl border-slate-200 text-center font-black tracking-widest text-lg h-12"
                          />
                          {isPinApproved && (
                            <p className="text-xs text-emerald-600 font-extrabold flex items-center gap-1">
                              ✓ PIN Verified! Drop-off security checks cleared.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 p-1">
                          <div className="text-xs text-slate-500 leading-relaxed bg-white border rounded-xl p-3">
                            <p className="font-bold text-[#1A2340] flex items-center gap-1.5"><Signature className="h-4 w-4 text-blue-500" /> Digital Signature Canvas</p>
                            <p className="mt-1">Have the customer sign inside the box below to authorize receipt of items.</p>
                          </div>
                          
                          <div className="border border-slate-200 rounded-xl bg-white overflow-hidden relative shadow-inner">
                            <canvas
                              ref={canvasRef}
                              width={480}
                              height={160}
                              onMouseDown={startDrawing}
                              onMouseMove={draw}
                              onMouseUp={stopDrawing}
                              onMouseLeave={stopDrawing}
                              onTouchStart={startDrawing}
                              onTouchMove={draw}
                              onTouchEnd={stopDrawing}
                              className="w-full cursor-crosshair h-36"
                            />
                            {!hasSigned && (
                              <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 text-xs font-bold gap-1.5">
                                <Signature className="h-4 w-4" /> Sign Here
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-xl text-xs gap-1.5 font-bold"
                              onClick={clearSignature}
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Clear
                            </Button>
                            <Button
                              size="sm"
                              className={`flex-1 rounded-xl text-xs font-extrabold ${
                                isSignatureApproved
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-[#1A2340] hover:bg-slate-800 text-white"
                              }`}
                              onClick={confirmSignature}
                              disabled={!hasSigned}
                            >
                              {isSignatureApproved ? "✓ Signature Saved" : "Confirm Signature"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      size="lg"
                      className="w-full rounded-xl bg-emerald-600 text-white font-extrabold hover:bg-emerald-700 shadow-sm gap-2"
                      onClick={() => handleDeliverAll(activeBundle.orders.map((o: any) => o.id))}
                      disabled={deliver.isPending || (handoffMethod === "pin" ? !isPinApproved : !isSignatureApproved)}
                    >
                      {deliver.isPending ? "Finalizing..." : "Complete Delivery & End Job"}
                    </Button>
                  </div>
                )}

              </CardContent>
            </Card>

          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Available Orders Section */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-[#1A2340]">Available Delivery Jobs</h2>
              <span className="text-xs text-slate-400 font-bold bg-white px-2.5 py-1 rounded-full border border-slate-100">
                {bundles.length} jobs near you
              </span>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white border rounded-2xl shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-slate-500">Scanning for new delivery jobs...</p>
              </div>
            ) : bundles.length === 0 ? (
              <Card className="text-center py-16 border-dashed bg-white shadow-sm rounded-2xl">
                <Package className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <h3 className="font-bold text-slate-800">Looking for new orders</h3>
                <p className="text-sm text-slate-500 mt-1">Available jobs in your region will be listed here automatically.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {bundles.map((bundle) => (
                  <Card key={bundle.code} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-5 space-y-4">
                      
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="font-extrabold text-[#1A2340] text-md">Job Offer {bundle.code}</p>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Pickup at: <span className="font-extrabold text-slate-700">{bundle.vendors.join(" + ")}</span>
                          </p>
                        </div>
                        <Badge className={`text-xs px-2 py-0.5 font-bold border ${statusColor[bundle.status] || ""}`} variant="outline">
                          {bundle.status?.toUpperCase()}
                        </Badge>
                      </div>

                      {bundle.deliveryAddress && (
                        <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2 text-xs text-slate-600">
                          <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-slate-700">Delivery Location</p>
                            <p className="mt-0.5">{bundle.deliveryAddress}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-1">
                        <Button
                          className="flex-1 rounded-xl bg-[#1A2340] text-white font-extrabold hover:bg-slate-800 shadow-sm"
                          onClick={() => handleAccept(bundle.code, bundle.orders)}
                          disabled={assignRider.isPending}
                        >
                          {assignRider.isPending ? "Accepting..." : "Accept Job"}
                        </Button>
                        <Button
                          className="flex-1 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50"
                          variant="ghost"
                        >
                          Skip
                        </Button>
                      </div>

                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
