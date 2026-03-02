import { Link, useLocation } from "wouter";
import { MessageSquare, Users, Edit, Trash2, MapPin, Tag } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useCurrentUser, useFeed, useUpdateUser, useDeletePost, useUserActivity } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const ProfilePage = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: posts = [] } = useFeed();
  const { data: activity = [] } = useUserActivity();
  const updateUser = useUpdateUser();
  const deletePost = useDeletePost();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: "",
    bio: "",
  });

  const userPosts = posts.filter((post: any) => post.author?.id === currentUser?.id);

  const handleEditOpen = () => {
    setEditForm({
      displayName: currentUser?.displayName || "",
      bio: currentUser?.bio || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    await updateUser.mutateAsync({
      displayName: editForm.displayName,
      bio: editForm.bio,
    });
    setIsEditDialogOpen(false);
  };

  const handleDeletePost = async (postId: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      await deletePost.mutateAsync(postId);
    }
  };

  useEffect(() => {
    if (!userLoading && currentUser && !currentUser.onboardingComplete) {
      setLocation("/onboarding/tags");
    }
  }, [currentUser, userLoading, setLocation]);

  if (userLoading) {
    return (
      <div className="bg-[#1a1a1a] w-full min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <div className="bg-[#1a1a1a] w-full min-h-screen"></div>;
  }

  const displayName = currentUser?.displayName || currentUser?.username;

  return (
    <div className="bg-[#1a1a1a] w-full min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between border-b border-gray-800">
        <Link href="/dashboard">
          <div className="text-white text-3xl sm:text-4xl font-bold cursor-pointer" data-testid="link-logo" style={{ fontFamily: "'Arimo', sans-serif" }}>
            .--.
          </div>
        </Link>

        <div className="flex-1 max-w-md mx-2 sm:mx-8"></div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-8 pb-20">
        {/* Profile Header */}
        <div className="bg-[#2a2a2a] rounded-lg p-4 sm:p-6 border border-gray-700 max-w-4xl mx-auto">
          <h2 className="text-white text-lg sm:text-xl font-semibold text-center mb-4 sm:mb-6" data-testid="text-your-profile-title">
            Your profile
          </h2>
          
          <div className="text-center mb-4 sm:mb-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-600 mx-auto mb-4 flex items-center justify-center overflow-hidden">
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" data-testid="img-avatar" />
              ) : (
                <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
              )}
            </div>
            <h1 className="text-white text-xl sm:text-2xl font-bold" data-testid="text-user-name">
              {displayName}
            </h1>
            
            {currentUser?.city && (
              <div className="flex items-center justify-center gap-1 text-gray-400 text-sm mt-2">
                <MapPin className="w-4 h-4" />
                <span data-testid="text-user-city">{currentUser.city}</span>
              </div>
            )}
            
            {currentUser?.bio && (
              <p className="text-gray-400 text-sm mt-2" data-testid="text-user-bio">
                {currentUser.bio}
              </p>
            )}

            <p className="text-gray-400 text-sm mt-2" data-testid="text-followers-count">
              {currentUser?.followersCount || 0} followers
            </p>

            {currentUser?.tags?.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-2">
                  <Tag className="w-4 h-4" />
                  <span data-testid="text-user-tags-count">{currentUser.tags.length} tags</span>
                </div>
                <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                  {currentUser.tags.slice(0, 8).map((tag: any) => (
                    <span
                      key={tag.id}
                      className="bg-teal-700/30 text-teal-300 px-2 py-1 rounded-full text-xs"
                      data-testid={`badge-user-tag-${tag.id}`}
                    >
                      {tag.name}
                    </span>
                  ))}
                  {currentUser.tags.length > 8 && (
                    <span className="text-gray-500 text-xs" data-testid="text-more-tags">
                      +{currentUser.tags.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Edit Profile Button */}
          <div className="flex justify-center">
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-[#1a1a1a] border-gray-600 text-white hover:bg-gray-700" 
                  data-testid="button-edit-profile"
                  onClick={handleEditOpen}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit profile
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#2a2a2a] border-gray-700 max-w-[calc(100vw-2rem)] sm:max-w-lg mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-white" data-testid="text-edit-dialog-title">Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Display Name</label>
                    <Input
                      value={editForm.displayName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                      data-testid="input-edit-display-name"
                      className="bg-[#1a1a1a] border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Bio</label>
                    <Textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                      data-testid="textarea-edit-bio"
                      className="bg-[#1a1a1a] border-gray-600 text-white"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Link href="/onboarding/tags">
                      <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700" data-testid="button-edit-tags">
                        Edit Tags
                      </Button>
                    </Link>
                    <Button 
                      onClick={handleSaveProfile}
                      disabled={updateUser.isPending}
                      data-testid="button-save-profile"
                      className="flex-1 bg-teal-700 hover:bg-teal-600"
                    >
                      {updateUser.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Posts and Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 max-w-4xl mx-auto mt-6 sm:mt-8">
          {/* Your Posts */}
          <div className="bg-[#2a2a2a] rounded-lg p-3 sm:p-4 border border-gray-700">
            <h2 className="text-white text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-center bg-[#3a3a3a] rounded py-2" data-testid="text-posts-title">
              Your Posts
            </h2>
            {userPosts.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400" data-testid="text-no-posts">No posts yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userPosts.slice(0, 3).map((post: any) => (
                  <div key={post.id} className="bg-[#3a3a3a] rounded-lg p-4 relative" data-testid={`card-post-${post.id}`}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      onClick={() => handleDeletePost(post.id)}
                      data-testid={`button-delete-post-${post.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

          {/* Your Activity */}
          <div className="bg-[#2a2a2a] rounded-lg p-3 sm:p-4 border border-gray-700">
            <h2 className="text-white text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-center bg-[#3a3a3a] rounded py-2" data-testid="text-activity-title">
              Your Activity
            </h2>
            {activity.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400" data-testid="text-no-activity">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activity.slice(0, 3).map((item: any, idx: number) => (
                  <div key={item.id || idx} className="bg-[#d4c5b0] rounded-lg p-4 text-center" data-testid={`card-activity-${idx}`}>
                    <p className="text-gray-800 text-sm">{item.description}</p>
                  </div>
                ))}
                {activity.length > 3 && (
                  <button className="text-gray-400 text-sm hover:text-white w-full text-center" data-testid="button-see-more-activity">
                    See more
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav activePage="/profile" />
    </div>
  );
};
