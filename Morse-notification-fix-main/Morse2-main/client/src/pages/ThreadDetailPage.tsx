import { Link, useParams } from "wouter";
import { Users, MessageSquare, ArrowLeft, Send } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useThread, useThreadComments, useAddThreadComment, useCurrentUser } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const ThreadDetailPage = (): JSX.Element => {
  const params = useParams<{ id: string }>();
  const [newComment, setNewComment] = useState("");

  const { data: currentUser } = useCurrentUser();
  const { data: thread, isLoading: threadLoading } = useThread(params.id);
  const { data: comments = [], isLoading: commentsLoading } = useThreadComments(params.id);
  const addComment = useAddThreadComment();

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    await addComment.mutateAsync({
      threadId: params.id,
      content: newComment,
    });
    setNewComment("");
  };

  if (threadLoading) {
    return (
      <div className="bg-[#1a1a1a] w-full min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="bg-[#1a1a1a] w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg" data-testid="text-thread-not-found">Thread not found</p>
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
      <header className="w-full px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between border-b border-gray-800">
        <Link href="/dashboard">
          <div className="text-white text-3xl sm:text-4xl font-bold cursor-pointer" data-testid="link-logo" style={{ fontFamily: "'Arimo', sans-serif" }}>
            .--.
          </div>
        </Link>
        <div className="flex-1"></div>
      </header>

      <div className="flex-1 p-4 sm:p-8 pb-20 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <Link href={`/communities/${thread.communityId}`}>
            <Button variant="ghost" className="text-gray-400 hover:text-white mb-4 text-sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>

          {/* Thread Content */}
          <div className="bg-[#2a2a2a] rounded-lg p-4 sm:p-6 border border-gray-700 mb-6">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                <AvatarImage src={thread.author?.avatarUrl} />
                <AvatarFallback className="bg-gray-600">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-white text-xl sm:text-2xl font-bold mb-2" data-testid="text-thread-title">
                  {thread.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-400 mb-4">
                  <span data-testid="text-thread-author">
                    by {thread.author?.displayName || thread.author?.username}
                  </span>
                  <span>•</span>
                  <span>
                    {thread.createdAt && formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                  </span>
                  {thread.community && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">in {thread.community.name}</span>
                    </>
                  )}
                </div>
                <p className="text-gray-300 whitespace-pre-wrap text-sm sm:text-base" data-testid="text-thread-content">
                  {thread.content}
                </p>
              </div>
            </div>
          </div>

          {/* Comment Input */}
          <div className="bg-[#2a2a2a] rounded-lg p-3 sm:p-4 border border-gray-700 mb-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                <AvatarImage src={currentUser?.avatarUrl} />
                <AvatarFallback className="bg-gray-600">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  data-testid="textarea-comment"
                  className="bg-[#1a1a1a] border-gray-600 text-white min-h-20 resize-none text-sm sm:text-base"
                />
                <div className="flex justify-end mt-2">
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addComment.isPending}
                    data-testid="button-submit-comment"
                    className="bg-teal-700 hover:bg-teal-600 text-sm"
                  >
                    <Send className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">{addComment.isPending ? "Posting..." : "Reply"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div>
            <h2 className="text-white text-base sm:text-lg font-semibold mb-4 flex items-center gap-2" data-testid="text-comments-title">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              {comments.length} {comments.length === 1 ? "Reply" : "Replies"}
            </h2>

            {commentsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : comments.length === 0 ? (
              <div className="bg-[#2a2a2a] rounded-lg p-6 sm:p-8 border border-gray-700 text-center">
                <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 text-sm sm:text-base" data-testid="text-no-comments">No replies yet</p>
                <p className="text-gray-500 text-xs sm:text-sm">Be the first to respond to this discussion</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {comments.map((comment: any) => (
                  <div 
                    key={comment.id} 
                    className="bg-[#2a2a2a] rounded-lg p-3 sm:p-4 border border-gray-700"
                    data-testid={`card-comment-${comment.id}`}
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                        <AvatarImage src={comment.author?.avatarUrl} />
                        <AvatarFallback className="bg-gray-600">
                          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-white font-medium text-sm sm:text-base" data-testid={`text-comment-author-${comment.id}`}>
                            {comment.author?.displayName || comment.author?.username}
                          </span>
                          <span className="text-gray-500 text-xs sm:text-sm">
                            {comment.createdAt && formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-gray-300 whitespace-pre-wrap text-sm sm:text-base" data-testid={`text-comment-content-${comment.id}`}>
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav activePage="/communities" />
    </div>
  );
};
