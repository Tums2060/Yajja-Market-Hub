import React from "react";
import { Link, useLocation } from "wouter";
import { useListMyGroups } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Loader2, ChevronRight } from "lucide-react";

export default function Groups() {
  const { data: groups, isLoading } = useListMyGroups({ query: { enabled: true } });
  const [, setLocation] = useLocation();

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">My Groups</h1>
        <Button onClick={() => setLocation("/groups/new")} className="gap-2">
          <Plus className="h-4 w-4" /> New Group
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !groups?.length ? (
        <Card className="text-center py-16 border-dashed">
          <Users className="mx-auto h-16 w-16 opacity-20 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No groups yet</h2>
          <p className="text-muted-foreground mb-6">Create or join a group to shop together.</p>
          <Button onClick={() => setLocation("/groups/new")}>Create a Group</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map(group => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-all hover:border-secondary/40">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0 overflow-hidden">
                    {group.imageUrl
                      ? <img src={group.imageUrl} alt={group.name} className="h-full w-full object-cover" />
                      : <Users className="h-6 w-6" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{group.name}</p>
                    <p className="text-sm text-muted-foreground">{group.memberCount} member{group.memberCount !== 1 ? "s" : ""}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}