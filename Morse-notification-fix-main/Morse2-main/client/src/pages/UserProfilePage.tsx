import { Link, useParams } from "wouter";
import { MessageSquare, Users, UserPlus, Mail, Heart, Activity, Check, Clock } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserProfile, useUserPosts, useCurrentUser, useFollow, useFollowStatus, useUserActivityById, useStartConversation } from "@/lib/api";
import { useLocation } from "wouter";

export const UserProfilePage = (): JSX.Element => {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: currentUser } = useCurrentUser();
  const { data: profileUser, isLoading: userLoading } = useUserProfile(params.id);
  const { data: userPosts = [] } = useUserPosts(params.id);
  const { data: userActivity = [] } = useUserActivityById(params.id);
  const { data: followStatusData } = useFollowStatus(params.id);
  const followUser = useFollow();
  const startConversation = useStartConversation();
  
  const followStatus = followStatusData?.status;

  const handleFollow = async () => {
    if (!profileUser) return;
    await followUser.mutateAsync(profileUser.id);
  };

  const handleMessage = async () => {
    if (!profileUser) return;
    try {
      await startConversation.mutateAsync(profileUser.id);
      setLocation("/messages");
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  if (userLoading) {
    return (
      <div className="bg-[#1a1a1a] w-full min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="bg-[#1a1a1a] w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg" data-testid="text-user-not-found">User not found</p>
          <Link href="/dashboard">
            <Button className="mt-4 bg-teal-700 hover:bg-teal-600" data-testid="button-back-to-dashboard">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profileUser.id;
  const displayName = profileUser.displayName || profileUser.username;

  return (
    <div className="bg-[#1a1a1a] w-full min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-8 py-4 flex items-center justify-between border-b border-gray-800">
        <Link href="/dashboard">
          <div className="text-white text-3xl sm:text-4xl font-bold cursor-pointer" data-testid="link-logo" style={{ fontFamily: "'Arimo', sans-serif" }}>
            .--.
          </div>
        </Link>

        <div className="flex-1 max-w-md mx-8"></div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-8 pb-20">
        {/* Profile Header */}
        <div className="bg-[#2a2a2a] rounded-lg p-6 border border-gray-700 max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gray-600 mx-auto mb-4 flex items-center justify-center overflow-hidden">
              {profileUser.avatarUrl ? (
                <img src={profileUser.avatarUrl} alt="" className="w-full h-full object-cover" data-testid="img-avatar" />
              ) : (
                <Users className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <h1 className="text-white text-2xl font-bold" data-testid="text-user-name">
              {displayName}
            </h1>
            {profileUser.bio && (
              <p className="text-gray-400 text-sm mt-1" data-testid="text-user-bio">
                {profileUser.bio}
              </p>
            )}

            <p className="text-gray-400 text-sm mt-1" data-testid="text-followers-count">
              {profileUser.followersCount || 0} followers
            </p>
          </div>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="flex justify-center gap-4">
              <Button 
                variant="outline" 
                className={`border-gray-600 text-white ${
                  followStatus === "accepted" 
                    ? "bg-teal-700 hover:bg-teal-600" 
                    : followStatus === "pending"
                      ? "bg-yellow-700 hover:bg-yellow-600"
                      : "bg-[#1a1a1a] hover:bg-gray-700"
                }`}
                data-testid="button-follow"
                onClick={handleFollow}
                disabled={followUser.isPending || !!followStatus}
              >
                {followStatus === "accepted" ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : followStatus === "pending" ? (
                  <Clock className="w-4 h-4 mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                {followUser.isPending 
                  ? "Sending..." 
                  : followStatus === "accepted" 
                    ? "Following" 
                    : followStatus === "pending"
                      ? "Request Sent"
                      : "Follow"}
              </Button>
              <Button 
                variant="outline" 
                className="bg-[#1a1a1a] border-gray-600 text-white hover:bg-gray-700" 
                data-testid="button-message"
                onClick={handleMessage}
                disabled={startConversation.isPending}
              >
                <Mail className="w-4 h-4 mr-2" />
                {startConversation.isPending ? "Opening..." : "Message"}
              </Button>
            </div>
          )}
        </div>

        {/* Posts and Activity */}
        <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto mt-8">
          {/* User's Posts */}
          <div className="bg-[#2a2a2a] rounded-lg p-4 border border-gray-700">
            <h2 className="text-white text-lg font-semibold mb-4 text-center bg-[#3a3a3a] rounded py-2" data-testid="text-posts-title">
              {displayName}'s Posts
            </h2>
            {userPosts.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400" data-testid="text-no-posts">No posts yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userPosts.slice(0, 3).map((post: any) => (
                  <div key={post.id} className="bg-[#3a3a3a] rounded-lg p-4" data-testid={`card-post-${post.id}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                        {post.author?.avatarUrl ? (
                          <img src={post.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm">{post.author?.displayName || post.author?.username}</p>
                        <p className="text-gray-400 text-xs">Description</p>
                      </div>
                    </div>
                    <div className="bg-[#d4c5b0] rounded p-3 mb-2">
                      <p className="text-gray-800 text-sm">{post.content}</p>
                    </div>
                    {post.imageUrl && (
                      <div className="bg-black rounded p-4 text-center">
                        <img src={post.imageUrl} alt="" className="max-w-full mx-auto" />
                      </div>
                    )}
                  </div>
                ))}
                {userPosts.length > 3 && (
                  <button className="text-gray-400 text-sm hover:text-white w-full text-center" data-testid="button-see-more-posts">
                    See more
                  </button>
                )}
              </div>
            )}
          </div>

          {/* User's Activity */}
          <div className="bg-[#2a2a2a] rounded-lg p-4 border border-gray-700">
            <h2 className="text-white text-lg font-semibold mb-4 text-center bg-[#3a3a3a] rounded py-2" data-testid="text-activity-title">
              {displayName}'s Activity
            </h2>
            {userActivity.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400" data-testid="text-no-activity">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userActivity.slice(0, 5).map((activity: any, index: number) => (
                  <div key={activity.id} className="bg-[#d4c5b0] rounded-lg p-4 flex items-center gap-3" data-testid={`card-activity-${index}`}>
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                      {activity.type === "like" ? (
                        <Heart className="w-4 h-4 text-red-400" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <p className="text-gray-800 text-sm">{displayName} {activity.description}</p>
                  </div>
                ))}
                {userActivity.length > 5 && (
                  <button className="text-gray-400 text-sm hover:text-white w-full text-center" data-testid="button-see-more-activity">
                    See more
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};
