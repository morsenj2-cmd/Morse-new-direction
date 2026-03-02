import { Link, useParams, useLocation } from "wouter";
import { Users, Plus, MessageSquare, ArrowLeft, Trash2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useCommunity, useCommunityThreads, useCreateThread, useCurrentUser, useDeleteCommunity } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";

export const CommunityDetailPage = (): JSX.Element => {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [isCreateThreadDialogOpen, setIsCreateThreadDialogOpen] = useState(false);
  const [newThread, setNewThread] = useState({ title: "", content: "" });

  const { data: currentUser } = useCurrentUser();
  const { data: community, isLoading: communityLoading } = useCommunity(params.id);
  const { data: threads = [], isLoading: threadsLoading } = useCommunityThreads(params.id);
  const createThread = useCreateThread();
  const deleteCommunity = useDeleteCommunity();

  const isCreator = currentUser?.id === community?.creatorId;

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
                <h1 className="text-white text-xl sm:text-2xl font-bold" data-testid="text-community-name">{community.name}</h1>
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

          <h2 className="text-white text-xl font-semibold mb-4" data-testid="text-discussions-title">Discussions</h2>

          {threadsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : threads.length === 0 ? (
            <div className="bg-[#2a2a2a] rounded-lg p-8 border border-gray-700 text-center">
              <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2" data-testid="text-no-threads">No discussions yet</p>
              <p className="text-gray-500 text-sm mb-4">
                Be the first to start a conversation in this community
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
                    className="bg-[#2a2a2a] rounded-lg p-5 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
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
      </div>

      <BottomNav activePage="/communities" />
    </div>
  );
};
