import React from "react";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Loader2, Users } from "lucide-react";

const rankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-6 w-6 text-slate-400" />;
  if (rank === 3) return <Award className="h-6 w-6 text-amber-600" />;
  return <span className="text-muted-foreground font-bold text-lg w-6 text-center inline-block">{rank}</span>;
};

const rankBg = (rank: number) => {
  if (rank === 1) return "bg-yellow-500/10 border-yellow-500/30";
  if (rank === 2) return "bg-slate-400/10 border-slate-400/30";
  if (rank === 3) return "bg-amber-600/10 border-amber-600/30";
  return "";
};

export default function Leaderboard() {
  const { data, isLoading } = useGetLeaderboard({ query: { enabled: true } });
  const lb = data as any;
  const entries = lb?.entries || [];

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-extrabold tracking-tight">Weekly Leaderboard</h1>
        </div>
        {lb?.weekLabel && (
          <p className="text-muted-foreground">{lb.weekLabel} · Top groups by total spend</p>
        )}
      </div>

      {lb?.myGroupRank && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Your Group: {lb.myGroupRank.groupName}</p>
              <p className="text-xs text-muted-foreground">Rank #{lb.myGroupRank.rank} • KES {Math.round(lb.myGroupRank.totalSpent || 0).toLocaleString()} spent</p>
            </div>
            <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">
              #{lb.myGroupRank.rank}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Group Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !entries.length ? (
            <div className="text-center py-12 text-muted-foreground px-4">
              <Trophy className="h-12 w-12 mx-auto opacity-20 mb-4" />
              <p>No group activity this week.</p>
              <p className="text-sm mt-1">Start a group order to appear on the leaderboard!</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {entries.map((entry: any) => (
                <li
                  key={entry.groupId}
                  className={`flex items-center gap-4 px-6 py-4 ${rankBg(entry.rank)}`}
                >
                  <div className="flex items-center justify-center w-8 shrink-0">
                    {rankIcon(entry.rank)}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center font-bold text-secondary shrink-0 overflow-hidden">
                    {entry.imageUrl
                      ? <img src={entry.imageUrl} alt={entry.groupName} className="h-full w-full object-cover" />
                      : <Users className="h-5 w-5" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{entry.groupName}</p>
                    <p className="text-xs text-muted-foreground">{entry.memberCount} members • {entry.orderCount} orders</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg">KES {Math.round(entry.totalSpent || 0).toLocaleString()}</p>
                    {entry.rank <= 3 && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {entry.rank === 1 ? "🥇 Gold" : entry.rank === 2 ? "🥈 Silver" : "🥉 Bronze"}
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">Resets every Monday. Keep shopping to climb!</p>
    </div>
  );
}
