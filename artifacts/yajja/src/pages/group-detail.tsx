import React, { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetGroup, useListGroupMembers, useListGroupMessages,
  useSendGroupMessage, useGetGroupCart, useSendInvite,
  getListGroupMessagesQueryKey
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, MessageCircle, ShoppingCart, Send, Loader2, UserPlus } from "lucide-react";

export default function GroupDetail() {
  const { groupId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const id = parseInt(groupId || "0", 10);

  const { data: group, isLoading: groupLoading } = useGetGroup(id, { query: { enabled: !!id } });
  const { data: members } = useListGroupMembers(id, { query: { enabled: !!id } });
  const { data: messages, isLoading: messagesLoading } = useListGroupMessages(id, { query: { enabled: !!id, refetchInterval: 5000 } });
  const { data: cart } = useGetGroupCart(id, { query: { enabled: !!id } });

  const sendMessage = useSendGroupMessage();
  const sendInvite = useSendInvite();

  const [messageText, setMessageText] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMessage.mutate({ groupId: id, data: { content: messageText } } as any, {
      onSuccess: () => {
        setMessageText("");
        queryClient.invalidateQueries({ queryKey: getListGroupMessagesQueryKey(id) });
      }
    });
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    sendInvite.mutate({ data: { groupId: id, email: inviteEmail } } as any, {
      onSuccess: () => {
        toast({ title: "Invite sent!" });
        setInviteEmail("");
        setShowInvite(false);
      },
      onError: () => toast({ variant: "destructive", title: "Failed to send invite" })
    });
  };

  if (groupLoading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!group) return (
    <div className="container max-w-2xl mx-auto py-12 px-4 text-center">
      <p className="text-muted-foreground">Group not found.</p>
    </div>
  );

  return (
    <div className="container max-w-3xl mx-auto py-6 px-4 space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setLocation("/groups")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold">{group.name}</h1>
          <p className="text-sm text-muted-foreground">{group.memberCount} members</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowInvite(!showInvite)}>
          <UserPlus className="h-4 w-4" /> Invite
        </Button>
        <Button size="sm" className="gap-1" onClick={() => { localStorage.setItem("yajja_active_mode", id.toString()); setLocation("/shop"); }}>
          <ShoppingCart className="h-4 w-4" /> Shop
        </Button>
      </div>

      {showInvite && (
        <Card>
          <CardContent className="pt-4 flex gap-2">
            <Input placeholder="Enter email to invite..." value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            <Button onClick={handleInvite} disabled={sendInvite.isPending}>
              {sendInvite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="chat">
        <TabsList className="w-full">
          <TabsTrigger value="chat" className="flex-1 gap-2"><MessageCircle className="h-4 w-4" /> Chat</TabsTrigger>
          <TabsTrigger value="members" className="flex-1 gap-2"><Users className="h-4 w-4" /> Members</TabsTrigger>
          <TabsTrigger value="cart" className="flex-1 gap-2"><ShoppingCart className="h-4 w-4" /> Cart {cart?.items?.length ? <Badge className="h-5 w-5 text-xs p-0 flex items-center justify-center">{cart.items.length}</Badge> : null}</TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <Card>
            <CardContent className="p-0 flex flex-col h-[420px]">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !messages?.length ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageCircle className="h-10 w-10 opacity-20 mb-2" />
                    <p className="text-sm">No messages yet. Say hi!</p>
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isMe = msg.userId === user?.id;
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                          {msg.userName?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                          {!isMe && <p className="text-xs text-muted-foreground px-1">{msg.userName}</p>}
                          <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                            {msg.content}
                          </div>
                          <p className="text-xs text-muted-foreground px-1">
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="border-t p-3 flex gap-2">
                <Input
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={sendMessage.isPending || !messageText.trim()}>
                  {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardContent className="p-4 space-y-3">
              {(members || []).map((m: any) => (
                <div key={m.userId} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    {m.userName?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{m.userName}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  {m.role === "admin" && <Badge variant="outline">Admin</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cart">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Group Cart</CardTitle>
            </CardHeader>
            <CardContent>
              {!cart?.items?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 mx-auto opacity-20 mb-2" />
                  <p className="text-sm">Cart is empty. Start shopping!</p>
                  <Button className="mt-4" size="sm" onClick={() => setLocation("/shop")}>Shop Now</Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {cart.items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-muted rounded-lg shrink-0 overflow-hidden">
                          {item.product?.imageUrl
                            ? <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                            : <div className="h-full w-full flex items-center justify-center text-muted-foreground font-bold">{item.product?.name?.charAt(0)}</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.product?.name}</p>
                          <p className="text-xs text-muted-foreground">by {item.userName} • qty {item.quantity}</p>
                        </div>
                        <p className="font-bold shrink-0">KES {Math.round((item.product?.price || 0) * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold">
                    <span>Total</span>
                    <span>KES {Math.round(cart.subtotal || 0).toLocaleString()}</span>
                  </div>
                  <Button className="w-full mt-3" onClick={() => setLocation("/checkout")}>Proceed to Checkout</Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}