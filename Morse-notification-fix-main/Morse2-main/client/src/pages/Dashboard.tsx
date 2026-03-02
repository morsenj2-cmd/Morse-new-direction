import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Search, Users, Rocket, Briefcase, Sparkles, Clock3, TrendingUp, FileText, Heart, Repeat2, Plus, X, Tag, Inbox, Shapes } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  useAcceptFollow,
  useCreatePost,
  useDeclineFollow,
  useFeed,
  useFollowRequests,
  useLaunches,
  useLikePost,
  useOpportunityRadar,
  useRepostPost,
  useSearchUsers,
  useTags,
  useUnlikePost,
} from "@/lib/api";

const ENABLE_LEGACY_FEED = import.meta.env.VITE_ENABLE_LEGACY_FEED === "true";
const DASHBOARD_LAST_VISIT_KEY = "morse.dashboard.lastVisitAt";
const DISMISS_FOLLOW_REQUESTS_KEY = "dismiss_follow_requests";

type RadarItem = {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  createdAt?: string;
};

function DashboardSectionSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#222] p-5 sm:p-6">
      <div className="space-y-3">
        <Skeleton className="h-5 w-52 bg-white/10" />
        <Skeleton className="h-4 w-72 bg-white/10" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3">
        <Skeleton className="h-20 w-full rounded-xl bg-white/10" />
        <Skeleton className="h-20 w-full rounded-xl bg-white/10" />
        <Skeleton className="h-20 w-full rounded-xl bg-white/10" />
      </div>
    </div>
  );
}

function OpportunityCard({ item }: { item: RadarItem }) {
  return (
    <Link href={`/launches/${item.id}`}>
      <article className="group rounded-xl border border-white/10 bg-[#1e1e1e] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-[#242424] cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
            {item.logoUrl ? (
              <img src={item.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Rocket className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-white text-sm sm:text-base font-semibold truncate">{item.name}</h3>
            <p className="text-gray-300 text-xs sm:text-sm truncate">{item.tagline || "No tagline yet"}</p>
            {item.description && <p className="text-gray-400 text-xs line-clamp-2">{item.description}</p>}
          </div>
        </div>
      </article>
    </Link>
  );
}

function RadarSection({
  title,
  subtitle,
  icon,
  items,
  isLoading,
  emptyText,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: RadarItem[];
  isLoading: boolean;
  emptyText: string;
}) {
  if (isLoading) return <DashboardSectionSkeleton />;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#222] p-5 sm:p-6 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-white text-lg sm:text-xl font-semibold leading-tight">{title}</h2>
          </div>
          <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-white/10 p-8 text-center bg-[#1f1f1f]">
          <Inbox className="w-10 h-10 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-300 text-sm">{emptyText}</p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3">
          {items.slice(0, 6).map((item) => (
            <OpportunityCard key={`${title}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}


function FollowRequestsCard({
  followRequests,
  onAccept,
  onDecline,
}: {
  followRequests: any[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_FOLLOW_REQUESTS_KEY) === "1");
  }, []);

  const onDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_FOLLOW_REQUESTS_KEY, "1");
  };

  if (followRequests.length === 0 || dismissed) return null;

  return (
    <div className="rounded-xl bg-[#222] border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Follow requests</h3>
        <button type="button" onClick={onDismiss} className="text-gray-400 hover:text-white" aria-label="Dismiss follow requests panel">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3">
        {followRequests.slice(0, 3).map((request: any) => (
          <div key={request.id} className="p-3 rounded-lg bg-[#2c2c2c] border border-white/10">
            <p className="text-white text-sm truncate">{request.follower?.displayName || request.follower?.username}</p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" className="flex-1 bg-teal-700 hover:bg-teal-600" onClick={() => onAccept(request.id)}>Accept</Button>
              <Button size="sm" variant="outline" className="flex-1 border-white/20 text-gray-300" onClick={() => onDecline(request.id)}>Decline</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export const Dashboard = (): JSX.Element => {
  const [, setLocation] = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [newPostContent, setNewPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [selectedPostTags, setSelectedPostTags] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const [lastVisitAt, setLastVisitAt] = useState<Date | null>(null);

  const { data: radar, isLoading: radarLoading } = useOpportunityRadar();
  const { data: launches = [], isLoading: launchesLoading } = useLaunches();
  const { data: searchResults = [] } = useSearchUsers(searchQuery);

  const { data: feed = [], isLoading: feedLoading } = useFeed();
  const { data: availableTags = [] } = useTags();
  const { data: followRequests = [] } = useFollowRequests();
  const createPost = useCreatePost();
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const repostPost = useRepostPost();
  const acceptFollow = useAcceptFollow();
  const declineFollow = useDeclineFollow();

  useEffect(() => {
    const saved = localStorage.getItem(DASHBOARD_LAST_VISIT_KEY);
    setLastVisitAt(saved ? new Date(saved) : null);
    localStorage.setItem(DASHBOARD_LAST_VISIT_KEY, new Date().toISOString());
  }, []);

  const newSinceLastVisit = useMemo(() => {
    if (!Array.isArray(launches)) return [];

    if (!lastVisitAt) {
      return [...launches]
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 6);
    }

    return launches
      .filter((launch: any) => {
        if (!launch?.createdAt) return false;
        const created = new Date(launch.createdAt);
        return !Number.isNaN(created.getTime()) && created > lastVisitAt;
      })
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 6);
  }, [launches, lastVisitAt]);

  const fallbackTrending = useMemo(
    () => [...launches].sort((a: any, b: any) => (b.upvotesCount || 0) - (a.upvotesCount || 0)).slice(0, 6),
    [launches]
  );

  const filteredTags = availableTags.filter(
    (tag: any) => tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase()) && !selectedPostTags.includes(tag.id)
  );

  const togglePostTag = (tagId: string) => {
    setSelectedPostTags((prev) => {
      if (prev.includes(tagId)) return prev.filter((id) => id !== tagId);
      if (prev.length >= 3) return prev;
      return [...prev, tagId];
    });
  };

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

  return (
    <div className="bg-[#171717] w-full min-h-screen flex flex-col">
      <header className="w-full px-4 sm:px-8 py-4 flex items-center justify-between gap-4 border-b border-white/10">
        <Link href="/dashboard">
          <div className="text-white text-3xl sm:text-4xl font-bold cursor-pointer" style={{ fontFamily: "'Arimo', sans-serif" }}>
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
              className="w-full bg-[#202020] border-white/10 rounded-full px-4 py-2 text-sm sm:text-base text-white placeholder:text-gray-500"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />

            {showSearchResults && searchQuery.length >= 2 && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-[#232323] border border-white/10 rounded-xl max-h-64 overflow-y-auto shadow-2xl">
                {searchResults.map((user: any) => (
                  <Link key={user.id} href={`/user/${user.id}`}>
                    <div className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer">
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

      <main className="flex-1 px-3 sm:px-6 lg:px-8 py-6 pb-24 max-w-6xl w-full mx-auto space-y-5 sm:space-y-6">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#222] to-[#1d1d1d] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Shapes className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h1 className="text-white text-xl sm:text-2xl font-semibold">Opportunity Radar</h1>
              <p className="text-gray-400 text-sm mt-1">Personalized market signals, launches, and tools in one focused view.</p>
            </div>
          </div>
        </section>

        <RadarSection
          title="Market Opportunities For You"
          subtitle="Best opportunities based on your profile tags and behavior"
          icon={<Sparkles className="w-5 h-5 text-teal-400" />}
          items={(radar?.topMatches || fallbackTrending) as RadarItem[]}
          isLoading={radarLoading && launchesLoading}

          emptyText=""

          emptyText="No top matches yet. Add profile tags to improve recommendations."
        />

        <RadarSection
          title="New Since Your Last Visit"
          subtitle="Fresh opportunities posted since you were last here"
          icon={<Clock3 className="w-5 h-5 text-sky-400" />}
          items={(newSinceLastVisit.length ? newSinceLastVisit : fallbackTrending) as RadarItem[]}
          isLoading={launchesLoading}
          emptyText="Nothing new yet — check back soon for fresh opportunities."
        />

        <RadarSection
          title="Emerging Startups In Your Field"
          subtitle="Early signals and newly launched startups aligned with your interests"
          icon={<Briefcase className="w-5 h-5 text-amber-400" />}
          items={(radar?.emergingStartups || fallbackTrending) as RadarItem[]}
          isLoading={radarLoading && launchesLoading}
          emptyText="No emerging startup signals yet for your tags."
        />

        <RadarSection
          title="Trending In Your Stack"
          subtitle="What is gaining traction in the technologies you follow"
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          items={(radar?.trendingInYourStack || fallbackTrending) as RadarItem[]}
          isLoading={radarLoading && launchesLoading}
          emptyText="No stack-specific trends yet. Add tags in Profile to personalize this section."
        />

        {ENABLE_LEGACY_FEED && (
          <section className="rounded-2xl border border-white/10 bg-[#222] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-semibold">Legacy Social Feed</h2>
              <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-teal-700 hover:bg-teal-600 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Post
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>

            {feedLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full bg-white/10" />
                <Skeleton className="h-24 w-full bg-white/10" />
              </div>
            ) : feed.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center bg-[#1f1f1f]">
                <FileText className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-300">No posts yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feed.map((post: any) => (
                  <div key={post.id} className="rounded-xl border border-white/10 bg-[#1f1f1f] p-4">
                    <p className="text-white text-sm whitespace-pre-wrap">{post.content}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="border-white/20 text-gray-300" onClick={() => (post.isLiked ? unlikePost.mutate(post.id) : likePost.mutate(post.id))}>
                        <Heart className="w-4 h-4 mr-1" />
                        {post.likesCount || 0}
                      </Button>
                      <Button size="sm" variant="outline" className="border-white/20 text-gray-300" onClick={() => repostPost.mutate(post.id)}>
                        <Repeat2 className="w-4 h-4 mr-1" />
                        Repost
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <aside className="hidden xl:block fixed right-6 top-24 w-72">
        
       {followRequests.length > 0 && (
          <FollowRequestsCard
            followRequests={followRequests}
            onAccept={(id) => acceptFollow.mutate(id)}
            onDecline={(id) => declineFollow.mutate(id)}
          />
        )}

        <div className="rounded-xl bg-[#222] border border-white/10 p-4">
          <h3 className="text-white font-semibold mb-3">Follow requests</h3>
          {followRequests.length === 0 ? (
            <p className="text-gray-400 text-sm">No pending requests</p>
          ) : (
            <div className="space-y-3">
              {followRequests.slice(0, 3).map((request: any) => (
                <div key={request.id} className="p-3 rounded-lg bg-[#2c2c2c] border border-white/10">
                  <p className="text-white text-sm truncate">{request.follower?.displayName || request.follower?.username}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="flex-1 bg-teal-700 hover:bg-teal-600" onClick={() => acceptFollow.mutate(request.id)}>Accept</Button>
                    <Button size="sm" variant="outline" className="flex-1 border-white/20 text-gray-300" onClick={() => declineFollow.mutate(request.id)}>Decline</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
        <DialogContent className="bg-[#2a2a2a] border-gray-700 max-w-[calc(100vw-2rem)] sm:max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Create a post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="What's on your mind?"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="bg-[#1a1a1a] border-gray-600 text-white min-h-[120px]"
            />
            <input type="file" accept="image/*" onChange={(e) => setSelectedImage(e.target.files?.[0] || null)} className="text-gray-400 text-sm" />

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
                      <span key={tagId} className="px-2 py-1 bg-teal-700 text-white text-xs rounded-full flex items-center gap-1">
                        {tag.name}
                        <button type="button" onClick={() => togglePostTag(tagId)}>
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
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button className="w-full bg-teal-700 hover:bg-teal-600 text-white" onClick={handleCreatePost} disabled={createPost.isPending || !newPostContent.trim() || selectedPostTags.length === 0}>
              {createPost.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};
