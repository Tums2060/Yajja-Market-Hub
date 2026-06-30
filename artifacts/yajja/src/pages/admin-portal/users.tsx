import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Search, Loader2, Plus } from "lucide-react";

function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: () => customFetch("/api/admin/users"),
  });
}

const ROLE_STYLE: Record<string, string> = {
  customer: "bg-blue-100 text-blue-700 border-blue-200",
  vendor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rider: "bg-amber-100 text-amber-700 border-amber-200",
  admin: "bg-red-100 text-red-700 border-red-200",
  super_admin: "bg-purple-100 text-purple-700 border-purple-200 font-bold",
};

export default function AdminUsers() {
  const { data: users, isLoading, refetch } = useAdminUsers();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Dialog State
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const list = (users as any[] || []).filter((u: any) => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast({ variant: "destructive", title: "Error", description: "Name, email, and password are required" });
      return;
    }
    setIsSubmitting(true);
    try {
      await customFetch("/api/admin/users/create-admin", {
        method: "POST",
        body: JSON.stringify({ name, email, password, phone }),
      });
      toast({ title: "Success", description: "Administrator account created successfully" });
      setOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to create admin", description: err.message || "Failed to create administrator" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSuperAdmin = currentUser?.role === "super_admin";

  const filterOptions = ["all", "customer", "vendor", "rider", "admin"];
  if (isSuperAdmin || (users as any[] || []).some(u => u.role === "super_admin")) {
    filterOptions.push("super_admin");
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> User Management
          </h1>
          <p className="text-muted-foreground text-sm">{(users as any[] || []).length} total registered users</p>
        </div>

        {isSuperAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 self-start sm:self-auto rounded-xl">
                <Plus className="h-4 w-4" /> Create Administrator
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Create Administrator</DialogTitle>
                <DialogDescription>
                  Register a new administrator. They will have full access to manage vendors, orders, riders, and customers.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAdmin} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jane Doe" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. jane.doe@yajja.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +254712345678" />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="rounded-xl">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Admin
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {filterOptions.map(r => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 ${
                filterRole === r ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/30"
              }`}
            >
              {r === "super_admin" ? "Super Admin" : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((user: any) => (
            <Card key={user.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{user.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_STYLE[user.role] || "bg-muted border-border"}`}>
                      {user.role === "super_admin" ? "Super Admin" : user.role}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                </div>
                <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
