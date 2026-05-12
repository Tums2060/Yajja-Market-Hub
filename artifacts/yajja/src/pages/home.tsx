import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useListMyGroups, useGetLeaderboard } from "@workspace/api-client-react";
import { Users, ChevronRight, Trophy, Search, MapPin, Bell, Menu, ShoppingBag, User } from "lucide-react";
import { formatKES } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const CATEGORIES = [
  {
    id: "food",
    label: "Food & Drinks",
    emoji: "🍔",
    color: "from-amber-400 to-orange-500",
    bgLight: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    href: "/category/food",
  },
  {
    id: "household",
    label: "Convenience",
    emoji: "🛒",
    color: "from-blue-400 to-indigo-500",
    bgLight: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    href: "/category/household",
  },
  {
    id: "liquor",
    label: "Liquor",
    emoji: "🍷",
    color: "from-purple-400 to-violet-600",
    bgLight: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    href: "/category/liquor",
  },
  {
    id: "pharmacy",
    label: "Health",
    emoji: "💊",
    color: "from-emerald-400 to-teal-500",
    bgLight: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    href: "/category/pharmacy",
  },
];

export default function Home() {
  const { user, activeMode, setActiveMode } = useAuth();
  const [, setLocation] = useLocation();
  const [showModeSheet, setShowModeSheet] = useState(false);
  const [search, setSearch] = useState("");

  const { data: groups } = useListMyGroups({ query: { enabled: !!user } });
  const { data: leaderboardRaw } = useGetLeaderboard({ query: { enabled: true } });
  const lb = leaderboardRaw as any;
  const topEntries = lb?.entries?.slice(0, 3) || [];

  const activeGroup = typeof activeMode === "number"
    ? (groups as any[])?.find((g: any) => g.id === activeMode)
    : null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) setLocation(`/shop?search=${encodeURIComponent(search)}`);
  };

  const handleModeSelect = (mode: "individual" | number) => {
    setActiveMode(mode);
    setShowModeSheet(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Teal hero header */}
      <div className="bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white" />
          <div className="absolute top-16 -left-10 w-32 h-32 rounded-full bg-white" />
        </div>
        <div className="relative z-10 px-4 pt-4 pb-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-1.5 text-primary-foreground/70 text-sm mb-0.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>Nairobi, Kenya</span>
              </div>
              <p className="text-white font-semibold text-lg">
                Hey {user?.name?.split(" ")[0]} 👋
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white hover:bg-white/10 h-9 w-9"
              >
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Mode badge */}
          <button
            onClick={() => setShowModeSheet(true)}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors rounded-full px-3 py-1.5 mb-4 text-white/90 text-xs font-medium"
          >
            {activeMode === "individual" ? (
              <>
                <User className="h-3 w-3" />
                Solo Shopping
              </>
            ) : (
              <>
                <Users className="h-3 w-3" />
                Group: {activeGroup?.name || "Unknown"}
              </>
            )}
            <ChevronRight className="h-3 w-3 opacity-60" />
          </button>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search food, drinks, stores..."
              className="pl-10 h-12 rounded-2xl bg-white border-0 shadow-lg text-foreground placeholder:text-muted-foreground/70"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-1 pb-6 space-y-6">
        {/* Category grid */}
        <div>
          <h2 className="text-base font-bold text-foreground mt-5 mb-3">What are you looking for?</h2>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <Link key={cat.id} href={cat.href}>
                <div className={`relative rounded-2xl overflow-hidden aspect-square cursor-pointer shadow-sm border ${cat.border} ${cat.bgLight} hover:shadow-md active:scale-95 transition-all`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-20`} />
                  <div className="relative z-10 flex flex-col items-center justify-center h-full gap-2 p-4">
                    <span className="text-5xl leading-none">{cat.emoji}</span>
                    <span className={`text-sm font-bold ${cat.text} text-center`}>{cat.label}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Group shopping CTA */}
        <div className="rounded-2xl bg-secondary/10 border border-secondary/20 p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground">Shop with your group</p>
            <p className="text-xs text-muted-foreground">Split bills, earn points, and climb the leaderboard together</p>
          </div>
          <Link href="/groups">
            <Button size="sm" variant="secondary" className="shrink-0 rounded-full text-xs">
              {(groups as any[])?.length ? "My Groups" : "Start a Group"}
            </Button>
          </Link>
        </div>

        {/* Mini leaderboard */}
        {topEntries.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="font-bold text-sm">This Week's Top Groups</span>
              </div>
              <Link href="/leaderboard">
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2 gap-1">
                  View all <ChevronRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
              {topEntries.map((entry: any, i: number) => (
                <div key={entry.groupId} className="flex items-center gap-3 px-4 py-3">
                  <span className={`text-base font-extrabold w-6 text-center ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : "text-amber-700"}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                  </span>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{entry.groupName}</p>
                    <p className="text-xs text-muted-foreground">{entry.memberCount} members</p>
                  </div>
                  <span className="text-sm font-bold text-foreground">{formatKES(entry.totalSpent || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Browse all */}
        <Link href="/shop">
          <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 flex items-center gap-3 hover:bg-primary/10 transition-colors cursor-pointer">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">Browse All Stores</p>
              <p className="text-xs text-muted-foreground">All vendors in your area</p>
            </div>
            <ChevronRight className="h-5 w-5 text-primary/50" />
          </div>
        </Link>
      </div>

      {/* Mode selection sheet */}
      {showModeSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModeSheet(false)} />
          <div className="relative z-10 bg-background rounded-t-3xl shadow-2xl px-4 pt-6 pb-10 max-w-lg w-full mx-auto">
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-1">How are you shopping?</h2>
            <p className="text-muted-foreground text-sm mb-5">Choose a mode before browsing</p>

            <div className="space-y-3">
              <button
                onClick={() => handleModeSelect("individual")}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${activeMode === "individual" ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold">Solo Shopping</p>
                  <p className="text-sm text-muted-foreground">Shop for yourself</p>
                </div>
                {activeMode === "individual" && <Badge className="ml-auto">Active</Badge>}
              </button>

              {(groups as any[])?.map((group: any) => (
                <button
                  key={group.id}
                  onClick={() => handleModeSelect(group.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${activeMode === group.id ? "border-secondary bg-secondary/5" : "border-border hover:border-border/80"}`}
                >
                  <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {group.imageUrl ? <img src={group.imageUrl} className="h-full w-full object-cover" alt="" /> : <Users className="h-6 w-6 text-secondary" />}
                  </div>
                  <div>
                    <p className="font-bold">{group.name}</p>
                    <p className="text-sm text-muted-foreground">{group.memberCount} members · Group Shopping</p>
                  </div>
                  {activeMode === group.id && <Badge variant="secondary" className="ml-auto">Active</Badge>}
                </button>
              ))}

              <Link href="/groups/new" onClick={() => setShowModeSheet(false)}>
                <button className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-border hover:border-border/80 transition-all text-left">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-muted-foreground">Create a Group</p>
                    <p className="text-sm text-muted-foreground">Shop together and split bills</p>
                  </div>
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
