import React, { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useListMyGroups } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, activeMode, setActiveMode } = useAuth();
  const [, setLocation] = useLocation();

  const { data: groups, isLoading } = useListMyGroups({
    query: {
      enabled: !!user,
    }
  });

  const selectMode = (mode: "individual" | number) => {
    setActiveMode(mode);
    setLocation("/shop");
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-12 px-4 space-y-8 mx-auto animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-lg text-muted-foreground">
          How are you shopping today?
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card 
          className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${activeMode === "individual" ? "ring-2 ring-primary border-transparent" : ""}`}
          onClick={() => selectMode("individual")}
        >
          <CardHeader className="space-y-1 pb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
              <User className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Solo Shopping</CardTitle>
            <CardDescription className="text-base">Shop for yourself. Quick and easy.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant={activeMode === "individual" ? "default" : "outline"} className="w-full">
              {activeMode === "individual" ? "Continue Solo" : "Select Solo"}
            </Button>
          </CardContent>
        </Card>

        {groups?.map(group => (
          <Card 
            key={group.id}
            className={`cursor-pointer transition-all hover:border-secondary/50 hover:shadow-md ${activeMode === group.id ? "ring-2 ring-secondary border-transparent" : ""}`}
            onClick={() => selectMode(group.id)}
          >
            <CardHeader className="space-y-1 pb-4">
              <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-2 overflow-hidden">
                {group.imageUrl ? (
                  <img src={group.imageUrl} alt={group.name} className="h-full w-full object-cover" />
                ) : (
                  <Users className="h-6 w-6" />
                )}
              </div>
              <CardTitle className="text-2xl">{group.name}</CardTitle>
              <CardDescription className="text-base">{group.memberCount} members • Shared Cart</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant={activeMode === group.id ? "secondary" : "outline"} className="w-full">
                {activeMode === group.id ? "Continue with Group" : "Select Group"}
              </Button>
            </CardContent>
          </Card>
        ))}

        <Card 
          className="cursor-pointer transition-all border-dashed hover:border-border/80 bg-muted/30"
          onClick={() => setLocation("/groups/new")}
        >
          <CardHeader className="space-y-1 pb-4 flex flex-col items-center justify-center h-full min-h-[200px] text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-2">
              <Users className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">Create a Group</CardTitle>
            <CardDescription>Shop together with friends, family, or roommates.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
