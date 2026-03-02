import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFollowRequests, useAcceptFollow, useDeclineFollow } from "@/lib/api";

export const FollowRequestsPanel = () => {
  const { data: followRequests = [] } = useFollowRequests();
  const acceptFollow = useAcceptFollow();
  const declineFollow = useDeclineFollow();

  return (
    <div className="bg-[#2a2a2a] rounded-lg p-4">
      <h3 className="text-white font-semibold mb-3">Follow requests</h3>

      {followRequests.length === 0 ? (
        <p className="text-gray-400 text-sm">No pending requests</p>
      ) : (
        <div className="space-y-3">
          {followRequests.map((request: any) => (
            <div key={request.id} className="p-2 bg-[#3a3a3a] rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                  {request.follower?.avatarUrl ? (
                    <img
                      src={request.follower.avatarUrl}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">
                    {request.follower?.displayName || request.follower?.username}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    @{request.follower?.username}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-teal-700 hover:bg-teal-600 text-white"
                  onClick={() => acceptFollow.mutate(request.id)}
                >
                  Accept
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300"
                  onClick={() => declineFollow.mutate(request.id)}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
