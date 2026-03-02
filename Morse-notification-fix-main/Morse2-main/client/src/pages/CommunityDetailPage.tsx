import { Link, useParams, useLocation } from "wouter";
import { Users, Plus, MessageSquare, ArrowLeft, Trash2, ChevronDown, ChevronRight, Briefcase, Wrench, Rocket } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState } from "react";
import { useCommunity, useCommunityThreads, useCreateThread, useCurrentUser, useDeleteCommunity, useLaunches, useOpportunityRadar } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";

export const CommunityDetailPage = (): JSX.Element => {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [isCreateThreadDialogOpen, setIsCreateThreadDialogOpen] = useState(false);
  const [isDiscussionOpen, setIsDiscussionOpen] = useState(false);
  const [newThread, setNewThread] = useState({ title: "", content: "" });

  const { data: currentUser } = useCurrentUser();
  const { data: community, isLoading: communityLoading } = useCommunity(params.id);
  const { data: threads = [], isLoading: threadsLoading } = useCommunityThreads(params.id);
  const { data: launches = [] } = useLaunches();
  const { data: opportunityRadar } = useOpportunityRadar();
  const createThread = useCreateThread();
  const deleteCommunity = useDeleteCommunity();

  const isCreator = currentUser?.id === community?.creatorId;

  const communityTagIds = useMemo(() => new Set((community?.tags || []).map((tag: any) => tag.id)), [community]);

  const launchesInDomain = useMemo(() => {
    if (!community || communityTagIds.size === 0) return launches;
    return launches.filter((launch: any) => Array.isArray(launch.tags) && launch.tags.some((tag: any) => communityTagIds.has(tag.id)));
  }, [community, communityTagIds, launches]);

  const relevantOpportunities = useMemo(() => {
    const radarItems = opportunityRadar?.topMatches || [];
    if (communityTagIds.size === 0) return radarItems.slice(0, 6);

    const filtered = radarItems.filter((item: any) =>
      Array.isArray(item.tagIds) && item.tagIds.some((id: string) => communityTagIds.has(id))
    );

    return (filtered.length ? filtered : radarItems).slice(0, 6);
  }, [opportunityRadar, communityTagIds]);

  const topToolsRepos = useMemo(() => {
    const source = launchesInDomain.length ? launchesInDomain : launches;
    return source.filter((launch: any) => String(launch.websiteUrl || "").includes("github.com")).slice(0, 6);
  }, [launchesInDomain, launches]);

  const recentLaunches = useMemo(() => {
    const source = launchesInDomain.length ? launchesInDomain : launches;
    return [...source]
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 6);
  }, [launchesInDomain, launches]);

  const handleDeleteCommunity = async () => {
    await deleteCommunity.mutateAsync(params.id);
    setLocation("/communities", { replace: true });
  };

  const handleCreateThread = async () => {
    if (!newThread.title || !newThread.content) return;

    await createThread.mutateAsync({
      communityId: params.id,
      title: newThread.title,
      content: newThread.content,
    });
    setNewThread({ title: "", content: "" });
    setIsCreateThreadDialogOpen(false);
  };

  if (communityLoading) {
    return (
      <div className="bg-[#1a1a1a] w-full min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="bg-[#1a1a1a] w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg" data-testid="text-community-not-found">Community not found</p>
          <Link href="/communities">
            <Button className="mt-4 bg-teal-700 hover:bg-teal-600" data-testid="button-back-to-communities">
              Back to Communities
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] w-full min-h-screen flex flex-col">
      <header className="w-full px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-2 border-b border-gray-800">
        <Link href="/dashboard">
          <div className="text-white text-3xl sm:text-4xl font-bold cursor-pointer" data-testid="link-logo" style={{ fontFamily: "'Arimo', sans-serif" }}>
            .--.
          </div>
        </Link>

        <div className="flex-1 max-w-md mx-2 sm:mx-8"></div>

        <Dialog open={isCreateThreadDialogOpen} onOpenChange={setIsCreateThreadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-700 hover:bg-teal-600 text-white text-xs sm:text-sm px-2 sm:px-4" data-testid="button-create-thread">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">New Thread</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#2a2a2a] border-gray-700 max-w-[calc(100vw-2rem)] sm:max-w-lg mx-auto">
            <DialogHeader>
              <DialogTitle className="text-white" data-testid="text-create-thread-title">Start a Discussion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Thread title"
                value={newThread.title}
                onChange={(e) => setNewThread(prev => ({ ...prev, title: e.target.value }))}
                data-testid="input-thread-title"
                className="bg-[#1a1a1a] border-gray-600 text-white"
              />
              <Textarea
                placeholder="What do you want to discuss?"
                value={newThread.content}
                onChange={(e) => setNewThread(prev => ({ ...prev, content: e.target.value }))}
                data-testid="textarea-thread-content"
                className="bg-[#1a1a1a] border-gray-600 text-white min-h-32"
              />
              <Button
                onClick={handleCreateThread}
                disabled={!newThread.title || !newThread.content || createThread.isPending}
                data-testid="button-submit-thread"
                className="w-full bg-teal-700 hover:bg-teal-600"
              >
                {createThread.isPending ? "Creating..." : "Post Thread"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex-1 p-4 sm:p-8 pb-20">
        <div className="max-w-4xl mx-auto">
          <Link href="/communities">
            <Button variant="ghost" className="text-gray-400 hover:text-white mb-4 text-sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>

          <div className="bg-[#2a2a2a] rounded-lg p-4 sm:p-6 border border-gray-700 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-teal-700 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-white text-xl sm:text-2xl font-bold" data-testid="text-community-name">Knowledge Hub: {community.name}</h1>
                <p className="text-gray-400 text-sm sm:text-base" data-testid="text-community-description">{community.description || "No description"}</p>
              </div>

              {isCreator && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-600 text-red-400 hover:bg-red-900/20"
                      data-testid="button-delete-community"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-[#2a2a2a] border-gray-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Delete Community?</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        This action cannot be undone. All threads and discussions in this community will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteCommunity}
                        className="bg-red-600 hover:bg-red-700"
                        data-testid="button-confirm-delete"
                      >
                        {deleteCommunity.isPending ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          <div className="space-y-6 mb-6">
            <section className="bg-[#2a2a2a] rounded-lg p-5 border border-gray-700">
              <h2 className="text-white text-lg font-semibold mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Relevant Opportunities</h2>
              <div className="space-y-3">
                {(relevantOpportunities.length ? relevantOpportunities : launches.slice(0, 6)).map((item: any) => (
                  <Link key={`hub-opportunity-${item.id}`} href={`/launches/${item.id}`}>
                    <div className="p-3 rounded border border-gray-700 hover:border-gray-500 cursor-pointer">
                      <p className="text-white">{item.name}</p>
                      <p className="text-gray-400 text-sm">{item.tagline}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="bg-[#2a2a2a] rounded-lg p-5 border border-gray-700">
              <h2 className="text-white text-lg font-semibold mb-4 flex items-center gap-2"><Wrench className="w-4 h-4" /> Top Tools / Repos</h2>
              <div className="space-y-3">
                {(topToolsRepos.length ? topToolsRepos : launches.slice(0, 6)).map((item: any) => (
                  <a key={`hub-tool-${item.id}`} href={item.websiteUrl || "#"} target="_blank" rel="noreferrer" className="block p-3 rounded border border-gray-700 hover:border-gray-500">
                    <p className="text-white">{item.name}</p>
                    <p className="text-gray-400 text-sm truncate">{item.websiteUrl || "No tool link"}</p>
                  </a>
                ))}
              </div>
            </section>

            <section className="bg-[#2a2a2a] rounded-lg p-5 border border-gray-700">
              <h2 className="text-white text-lg font-semibold mb-4 flex items-center gap-2"><Rocket className="w-4 h-4" /> Recent Launches</h2>
              <div className="space-y-3">
                {(recentLaunches.length ? recentLaunches : launches.slice(0, 6)).map((item: any) => (
                  <Link key={`hub-launch-${item.id}`} href={`/launches/${item.id}`}>
                    <div className="p-3 rounded border border-gray-700 hover:border-gray-500 cursor-pointer">
                      <p className="text-white">{item.name}</p>
                      <p className="text-gray-400 text-sm">{item.tagline}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <section className="bg-[#2a2a2a] rounded-lg p-5 border border-gray-700">
            <button className="w-full flex items-center justify-between" onClick={() => setIsDiscussionOpen((v) => !v)}>
              <h2 className="text-white text-xl font-semibold flex items-center gap-2" data-testid="text-discussions-title">
                <MessageSquare className="w-4 h-4" /> Discussions (optional)
              </h2>
              {isDiscussionOpen ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
            </button>

            {isDiscussionOpen && (
              <div className="mt-4">
                {threadsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
                  </div>
                ) : threads.length === 0 ? (
                  <div className="rounded-lg p-8 border border-gray-700 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2" data-testid="text-no-threads">No discussions yet</p>
                    <p className="text-gray-500 text-sm mb-4">
                      Be the first to start a conversation in this hub
                    </p>
                    <Button
                      onClick={() => setIsCreateThreadDialogOpen(true)}
                      className="bg-teal-700 hover:bg-teal-600"
                      data-testid="button-start-first-thread"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Start a Discussion
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {threads.map((thread: any) => (
                      <Link key={thread.id} href={`/threads/${thread.id}`}>
                        <div
                          className="rounded-lg p-5 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                          data-testid={`card-thread-${thread.id}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {thread.author?.avatarUrl ? (
                                <img src={thread.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-semibold text-lg" data-testid={`text-thread-title-${thread.id}`}>
                                {thread.title}
                              </h3>
                              <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                                {thread.content}
                              </p>
                              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                <span data-testid={`text-thread-author-${thread.id}`}>
                                  by {thread.author?.displayName || thread.author?.username}
                                </span>
                                <span>
                                  {thread.createdAt && formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-4 h-4" />
                                  {thread.commentsCount || 0} comments
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <BottomNav activePage="/communities" />
    </div>
  );
};
