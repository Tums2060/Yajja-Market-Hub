import React from "react";
import {
  useListMyInvites, useAcceptInvite, useDeclineInvite,
  getListMyGroupsQueryKey, getListMyInvitesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Check, X, Loader2, Users } from "lucide-react";

export default function Invites() {
  const { data: invites, isLoading } = useListMyInvites({ query: { enabled: true } });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const accept = useAcceptInvite();
  const decline = useDeclineInvite();

  const handleAccept = (inviteId: number) => {
    accept.mutate({ inviteId } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMyInvitesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListMyGroupsQueryKey() });
        toast({ title: "Invite accepted! You've joined the group." });
      },
      onError: () => toast({ variant: "destructive", title: "Failed to accept invite" })
    });
  };

  const handleDecline = (inviteId: number) => {
    decline.mutate({ inviteId } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMyInvitesQueryKey() });
        toast({ title: "Invite declined." });
      },
      onError: () => toast({ variant: "destructive", title: "Failed to decline invite" })
    });
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Mail className="h-7 w-7 text-primary" />
        <h1 className="text-3xl font-extrabold">Invites</h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !invites?.length ? (
        <Card className="text-center py-16 border-dashed">
          <Mail className="mx-auto h-16 w-16 opacity-20 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No invites</h2>
          <p className="text-muted-foreground">You have no pending group invites.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {invites.map((invite: any) => (
            <Card key={invite.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{invite.groupName || `Group #${invite.groupId}`}</p>
                  <p className="text-sm text-muted-foreground">Invited by {invite.inviterName}</p>
                  <Badge variant="outline" className="mt-1 text-xs">{invite.status}</Badge>
                </div>
                {invite.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 border-destructive/30"
                      onClick={() => handleDecline(invite.id)}
                      disabled={decline.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleAccept(invite.id)}
                      disabled={accept.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}