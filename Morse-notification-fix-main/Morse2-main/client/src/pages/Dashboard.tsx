import { Link, useLocation } from "wouter";
import { Repeat2, Heart, Search, Plus, Users, Rocket, X, Tag, FileText } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useFeed, useFollowRequests, useUserCommunities, useLaunches, useCreatePost, useCurrentUser, useSearchUsers, useLikePost, useUnlikePost, useRepostPost, useTags, useAcceptFollow, useDeclineFollow } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Dashboard = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedPostTags, setSelectedPostTags] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  
  const { data: currentUser } = useCurrentUser();
  const { data: availableTags = [] } = useTags();
  const { data: feed = [], isLoading: feedLoading } = useFeed();
  const { data: followRequests = [] } = useFollowRequests();
  const { data: rawCommunities = [] } = useUserCommunities();
  const { data: launches = [] } = useLaunches();
  
  // Deduplicate communities by ID
  const communities = rawCommunities.filter((community: any, index: number, self: any[]) =>
    index === self.findIndex((c: any) => c.id === community.id)
  );
  const { data: searchResults = [] } = useSearchUsers(searchQuery);
  const createPost = useCreatePost();
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const repostPost = useRepostPost();
  const acceptFollow = useAcceptFollow();
  const declineFollow = useDeclineFollow();

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || selectedPostTags.length === 0) return;
    
    await createPost.mutateAsync({
      content: newPostContent,
      image: selectedImage || undefined,
      tagIds: selectedPostTags,
    });
    
    setNewPostContent("");
    setSelectedImage(null);
    setSelectedPostTags([]);
    setIsPostDialogOpen(false);
  };

  const filteredTags = availableTags.filter((tag: any) =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase()) &&
    !selectedPostTags.includes(tag.id)
  );

  const togglePostTag = (tagId: string) => {
    setSelectedPostTags(prev => {
      if (prev.includes(tagId)) return prev.filter(id => id !== tagId);
      if (prev.length >= 3) return prev;
      return [...prev, tagId];
    });
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (isLiked) {
      await unlikePost.mutateAsync(postId);
    } else {
      await likePost.mutateAsync(postId);
    }
  };

  const handleRepost = async (postId: string) => {
    await repostPost.mutateAsync(postId);
  };

  return (
    <div className="bg-[#1a1a1a] w-full min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-3 border-b border-gray-800">
        <Link href="/dashboard">
          <div className="text-white text-3xl sm:text-4xl font-bold cursor-pointer" data-testid="link-logo" style={{ fontFamily: "'Arimo', sans-serif" }}>
            .--.
          </div>
        </Link>

        <div className="flex-1 max-w-xs sm:max-w-md">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search by name or tag..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && searchQuery.length >= 2) {
                  setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
                }
              }}
              data-testid="input-search"
              className="w-full bg-transparent border border-gray-600 rounded-full px-3 sm:px-4 py-2 text-sm sm:text-base text-white focus:outline-none focus:border-gray-400"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            
            {showSearchResults && searchQuery.length >= 2 && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-[#2a2a2a] border border-gray-600 rounded-lg max-h-64 overflow-y-auto">
                {searchResults.map((user: any) => (
                  <Link key={user.id} href={`/user/${user.id}`}>
                    <div 
                      className="flex items-center gap-3 p-3 hover:bg-gray-700 cursor-pointer"
                      data-testid={`search-result-${user.id}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm">{user.displayName || user.username}</p>
                        <p className="text-gray-400 text-xs">@{user.username}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row pb-20">
        {/* Left Sidebar - Hidden on mobile, shown on large screens */}
        <aside className="hidden lg:block w-64 p-4 space-y-6">
          {/* Follow Requests */}
          <div className="bg-[#2a2a2a] rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3" data-testid="text-follow-requests-title">Follow requests</h3>
            {followRequests.length === 0 ? (
              <p className="text-gray-400 text-sm" data-testid="text-no-requests">No pending requests</p>
            ) : (
              <div className="space-y-3">
                {followRequests.map((request: any) => (
                  <div key={request.id} className="p-2 bg-[#3a3a3a] rounded-lg" data-testid={`card-follow-request-${request.id}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                        {request.follower.avatarUrl ? (
                          <img src={request.follower.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate" data-testid={`text-request-name-${request.id}`}>{request.follower.displayName || request.follower.username}</p>
                        <p className="text-gray-400 text-xs truncate">@{request.follower.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-teal-700 hover:bg-teal-600 text-white"
                        onClick={() => acceptFollow.mutate(request.id)}
                        disabled={acceptFollow.isPending}
                        data-testid={`button-accept-${request.id}`}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-gray-600 text-gray-300"
                        onClick={() => declineFollow.mutate(request.id)}
                        disabled={declineFollow.isPending}
                        data-testid={`button-decline-${request.id}`}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exciting Launches */}
          <div className="bg-[#2a2a2a] rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3" data-testid="text-launches-title">Exciting launches</h3>
            {launches.length === 0 ? (
              <div className="text-center py-4">
                <Rocket className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm" data-testid="text-no-launches">No launches yet</p>
                <p className="text-gray-500 text-xs">Be the first to launch!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {launches.slice(0, 3).map((launch: any) => (
                  <Link key={launch.id} href={`/launches/${launch.id}`}>
                    <div className="flex items-center gap-3 cursor-pointer hover:bg-[#3a3a3a] rounded p-1 -m-1" data-testid={`card-launch-${launch.id}`}>
                      <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                        {launch.logoUrl ? (
                          <img src={launch.logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Rocket className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm" data-testid={`text-launch-name-${launch.id}`}>{launch.name}</p>
                        <p className="text-gray-400 text-xs">{launch.tagline}</p>
                      </div>
                    </div>
                  </Link>
                ))}
                {launches.length > 3 && (
                  <Link href="/launches">
                    <button className="text-gray-400 text-sm hover:text-white" data-testid="button-see-more-launches">See more</button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main Feed */}
        <main className="flex-1 p-3 sm:p-4 order-first lg:order-none">
          {feedLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-400 mt-4" data-testid="text-loading-feed">Loading feed...</p>
            </div>
          ) : feed.length === 0 ? (
            <div className="bg-[#2a2a2a] rounded-lg p-8 text-center border border-gray-700">
              <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h2 className="text-white text-xl font-semibold mb-2" data-testid="text-no-posts-title">No posts yet</h2>
              <p className="text-gray-400 mb-6" data-testid="text-no-posts-subtitle">
                Be the first to share something! Create a post to get started.
              </p>
              <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-teal-700 hover:bg-teal-600 text-white" data-testid="button-create-first-post">
                    <Plus className="w-4 h-4 mr-2" />
                    Create your first post
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#2a2a2a] border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-white" data-testid="text-create-post-title">Create a post</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="What's on your mind?"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      data-testid="textarea-post-content"
                      className="bg-[#1a1a1a] border-gray-600 text-white min-h-[120px]"
                    />
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                        className="text-gray-400 text-sm"
                        data-testid="input-post-image"
                      />
                    </div>
                    {selectedImage && (
                      <p className="text-gray-400 text-sm" data-testid="text-selected-image">Selected: {selectedImage.name}</p>
                    )}
                    
                    <div>
                      <label className="text-gray-300 text-sm mb-2 flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Add tags (required, max 3)
                      </label>
                      {selectedPostTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {selectedPostTags.map((tagId) => {
                            const tag = availableTags.find((t: any) => t.id === tagId);
                            return tag ? (
                              <span
                                key={tagId}
                                className="px-2 py-1 bg-teal-700 text-white text-xs rounded-full flex items-center gap-1"
                                data-testid={`tag-selected-${tagId}`}
                              >
                                {tag.name}
                                <button
                                  type="button"
                                  onClick={() => togglePostTag(tagId)}
                                  className="hover:text-red-300"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                      <div className="relative">
                        <Input
                          placeholder="Search tags..."
                          value={tagSearchQuery}
                          onChange={(e) => setTagSearchQuery(e.target.value)}
                          onFocus={() => setShowTagDropdown(true)}
                          onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
                          data-testid="input-post-tag-search"
                          className="bg-[#1a1a1a] border-gray-600 text-white text-sm"
                        />
                        {showTagDropdown && filteredTags.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-[#1a1a1a] border border-gray-600 rounded-lg max-h-48 overflow-y-auto">
                            {filteredTags.slice(0, 40).map((tag: any) => (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => {
                                  togglePostTag(tag.id);
                                  setTagSearchQuery("");
                                }}
                                className="w-full text-left px-3 py-2 text-gray-300 text-sm hover:bg-gray-700"
                                data-testid={`tag-option-${tag.id}`}
                              >
                                {tag.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleCreatePost}
                      disabled={!newPostContent.trim() || createPost.isPending || selectedPostTags.length === 0}
                      data-testid="button-submit-post"
                      className="w-full bg-teal-700 hover:bg-teal-600"
                    >
                      {createPost.isPending ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              {feed.map((post: any) => (
                <div key={post.id} className="bg-[#2a2a2a] rounded-lg p-6 border border-gray-700" data-testid={`card-post-${post.id}`}>
                  <Link href={`/user/${post.author.id}`}>
                    <div className="flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80">
                      <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                        {post.author.avatarUrl ? (
                          <img src={post.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-semibold" data-testid={`text-post-author-${post.id}`}>{post.author.displayName || post.author.username}</p>
                        <p className="text-gray-400 text-sm">@{post.author.username}</p>
                      </div>
                    </div>
                  </Link>

                  <p className="text-white mb-4" data-testid={`text-post-content-${post.id}`}>{post.content}</p>

                  {post.imageUrl && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <img src={post.imageUrl} alt="" className="w-full object-cover" data-testid={`img-post-${post.id}`} />
                    </div>
                  )}

                  <div className="flex justify-center gap-8 py-4 border-t border-gray-600">
                    <button 
                      onClick={() => handleRepost(post.id)}
                      disabled={repostPost.isPending}
                      className="text-gray-400 hover:text-green-400 flex items-center gap-2 transition-colors disabled:opacity-50" 
                      data-testid={`button-repost-${post.id}`}
                    >
                      <Repeat2 className="w-5 h-5" />
                      <span className="text-sm">{post.repostsCount || 0}</span>
                    </button>
                    <button 
                      onClick={() => handleLike(post.id, post.isLiked)}
                      disabled={likePost.isPending || unlikePost.isPending}
                      className={`flex items-center gap-2 transition-colors disabled:opacity-50 ${post.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                      data-testid={`button-like-${post.id}`}
                    >
                      <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
                      <span className="text-sm">{post.likesCount || 0}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right Sidebar - Hidden on mobile, shown on large screens */}
        <aside className="hidden lg:block w-64 p-4">
          <div className="bg-[#2a2a2a] rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3" data-testid="text-communities-title">Your Communities</h3>
            {communities.length === 0 ? (
              <div className="text-center py-4">
                <Users className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm" data-testid="text-no-communities">No communities joined</p>
                <p className="text-gray-500 text-xs">Join or create a community</p>
              </div>
            ) : (
              <div className="space-y-3">
                {communities.map((community: any) => (
                  <Link key={community.id} href="/communities">
                    <div className="flex items-center gap-3 cursor-pointer hover:bg-[#3a3a3a] rounded p-1 -m-1" data-testid={`card-community-${community.id}`}>
                      <div className="w-10 h-10 rounded-full bg-teal-700 flex items-center justify-center">
                        <Users className="w-5 h-5 text-teal-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm" data-testid={`text-community-name-${community.id}`}>{community.name}</p>
                        <p className="text-gray-400 text-xs">{community.description || "Community"}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Button 
            className="w-full mt-4 bg-teal-700 hover:bg-teal-600 text-white rounded-lg" 
            data-testid="button-make-post"
            onClick={() => setIsPostDialogOpen(true)}
          >
            Make a post
          </Button>
        </aside>
      </div>

      {/* Create Post Dialog (always available) */}
      <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
        <DialogContent className="bg-[#2a2a2a] border-gray-700 max-w-[calc(100vw-2rem)] sm:max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white" data-testid="text-create-post-title">Create a post</DialogTitle>
          </DialogHeader>
          <p className="text-yellow-400/80 text-xs bg-yellow-400/10 rounded px-3 py-2 border border-yellow-400/20">Posts are only for sharing experiences or journeys. Personal branding and memes are not allowed in posts. Communities can be used for that purpose with zero restrictions.</p>
          <div className="space-y-4">
            <Textarea
              placeholder="What's on your mind?"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              data-testid="textarea-post-content"
              className="bg-[#1a1a1a] border-gray-600 text-white min-h-[120px]"
            />
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                className="text-gray-400 text-sm"
                data-testid="input-post-image"
              />
            </div>
            {selectedImage && (
              <p className="text-gray-400 text-sm" data-testid="text-selected-image">Selected: {selectedImage.name}</p>
            )}
            
            <div>
              <label className="text-gray-300 text-sm mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Add tags (required, max 3)
              </label>
              {selectedPostTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedPostTags.map((tagId) => {
                    const tag = availableTags.find((t: any) => t.id === tagId);
                    return tag ? (
                      <span
                        key={tagId}
                        className="px-2 py-1 bg-teal-700 text-white text-xs rounded-full flex items-center gap-1"
                        data-testid={`tag-selected-${tagId}`}
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => togglePostTag(tagId)}
                          className="hover:text-red-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              <div className="relative">
                <Input
                  placeholder="Search tags..."
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  onFocus={() => setShowTagDropdown(true)}
                  onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
                  data-testid="input-post-tag-search"
                  className="bg-[#1a1a1a] border-gray-600 text-white text-sm"
                />
                {showTagDropdown && filteredTags.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-[#1a1a1a] border border-gray-600 rounded-lg max-h-48 overflow-y-auto">
                    {filteredTags.slice(0, 40).map((tag: any) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          togglePostTag(tag.id);
                          setTagSearchQuery("");
                        }}
                        className="w-full text-left px-3 py-2 text-gray-300 text-sm hover:bg-gray-700"
                        data-testid={`tag-option-${tag.id}`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <Button 
              onClick={handleCreatePost}
              disabled={!newPostContent.trim() || createPost.isPending || selectedPostTags.length === 0}
              data-testid="button-submit-post"
              className="w-full bg-teal-700 hover:bg-teal-600"
            >
              {createPost.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button for Mobile */}
      <Button 
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full bg-teal-700 hover:bg-teal-600 text-white shadow-lg z-40" 
        data-testid="button-mobile-post"
        onClick={() => setIsPostDialogOpen(true)}
      >
        <Plus className="w-6 h-6" />
      </Button>

      <BottomNav activePage="/dashboard" />
    </div>
  );
};
