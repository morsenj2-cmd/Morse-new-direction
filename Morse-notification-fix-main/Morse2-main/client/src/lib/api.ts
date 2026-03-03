import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api";

// For authenticated endpoints
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

// Handle expired or missing session immediately
 if (response.status === 401) {
  // prevent infinite redirect loop
  if (!window.location.pathname.includes("/sign-in")) {
    window.location.href = "/sign-in";
  }
  return;
}

// Only parse JSON when it is actually JSON
const contentType = response.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    const data = await response.json();

    if (!response.ok) {
      const msg = data?.message || response.statusText || "Server error";
      throw new Error(msg);
    }

    return data;
  }

// Fallback for non-JSON responses
if (!response.ok) {
 throw new Error(response.statusText || "Server error");
  }

  return response;
}

// For public endpoints that don't require auth
async function fetchPublic(url: string) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return response.json();
}

// User hooks
export function useCurrentUser() {
  const isOnAuthPage =
    typeof window !== "undefined" &&
    window.location.pathname.includes("/sign-in");

  return useQuery({
    queryKey: ["currentUser"],
    queryFn: () => fetchWithAuth(`${API_BASE}/me`),
    retry: false,
    enabled: !isOnAuthPage,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => fetchWithAuth(`${API_BASE}/me`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}

// Tags hooks (public endpoint - no auth required)
export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => fetchPublic(`${API_BASE}/tags`),
  });
}

// Posts hooks
export function useFeed() {
  return useQuery({
    queryKey: ["feed"],
    queryFn: () => fetchWithAuth(`${API_BASE}/feed`),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { content: string; image?: File; communityId?: string; tagIds?: string[] }) => {
      const formData = new FormData();
      formData.append("content", data.content);
      if (data.image) formData.append("image", data.image);
      if (data.communityId) formData.append("communityId", data.communityId);
      if (data.tagIds && data.tagIds.length > 0) {
        formData.append("tagIds", JSON.stringify(data.tagIds));
      }
      
      const response = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Failed to create post");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

// Communities hooks
export function useCommunities() {
  return useQuery({
    queryKey: ["communities"],
    queryFn: () => fetchWithAuth(`${API_BASE}/communities`),
  });
}

export function useCommunity(communityId: string) {
  return useQuery({
    queryKey: ["community", communityId],
    queryFn: () => fetchWithAuth(`${API_BASE}/communities/${communityId}`),
    enabled: !!communityId,
  });
}

export function useUserCommunities() {
  return useQuery({
    queryKey: ["userCommunities"],
    queryFn: () => fetchWithAuth(`${API_BASE}/communities/me`),
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; tagIds?: string[] }) => 
      fetchWithAuth(`${API_BASE}/communities`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.invalidateQueries({ queryKey: ["userCommunities"] });
    },
  });
}

export function useDeleteCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (communityId: string) => 
      fetchWithAuth(`${API_BASE}/communities/${communityId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.invalidateQueries({ queryKey: ["userCommunities"] });
    },
  });
}

export function useJoinCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (communityId: string) => 
      fetchWithAuth(`${API_BASE}/communities/${communityId}/join`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userCommunities"] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  });
}

// Follows hooks
export function useFollowRequests() {
  return useQuery({
    queryKey: ["followRequests"],
    queryFn: () => fetchWithAuth(`${API_BASE}/follows/requests`),
  });
}

export function useAcceptFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchWithAuth(`${API_BASE}/follows/${id}/accept`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followRequests"] });
    },
  });
}

export function useDeclineFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchWithAuth(`${API_BASE}/follows/${id}/decline`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followRequests"] });
    },
  });
}

// User profile hooks
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => fetchWithAuth(`${API_BASE}/users/${userId}`),
    enabled: !!userId,
  });
}

export function useUserPosts(userId: string) {
  return useQuery({
    queryKey: ["userPosts", userId],
    queryFn: () => fetchWithAuth(`${API_BASE}/users/${userId}/posts`),
    enabled: !!userId,
  });
}

export function useFollowStatus(userId: string) {
  return useQuery({
    queryKey: ["followStatus", userId],
    queryFn: () => fetchWithAuth(`${API_BASE}/follows/status/${userId}`),
    enabled: !!userId,
  });
}

export function useFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (followingId: string) => 
      fetchWithAuth(`${API_BASE}/follows`, {
        method: "POST",
        body: JSON.stringify({ followingId }),
      }),
    onSuccess: (_, followingId) => {
      queryClient.invalidateQueries({ queryKey: ["followRequests"] });
      queryClient.invalidateQueries({ queryKey: ["followStatus", followingId] });
    },
  });
}

// Launches hooks
export function useLaunches() {
  return useQuery({
    queryKey: ["launches"],
    queryFn: () => fetchWithAuth(`${API_BASE}/launches`),
  });
}

export function useTodaysLaunches() {
  return useQuery({
    queryKey: ["launches", "today"],
    queryFn: () => fetchWithAuth(`${API_BASE}/launches/today`),
  });
}

export function useYesterdaysLaunches() {
  return useQuery({
    queryKey: ["launches", "yesterday"],
    queryFn: () => fetchWithAuth(`${API_BASE}/launches/yesterday`),
  });
}

export function useRecommendedLaunches() {
  return useQuery({
    queryKey: ["launches", "recommended"],
    queryFn: () => fetchWithAuth(`${API_BASE}/launches/recommended`),
  });
}

export function useCreateLaunch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; tagline: string; description?: string; websiteUrl?: string; logo?: File; productImage?: File; tagIds: string[] }) => {
      // Upload images to object storage first
      let logoUrl: string | undefined;
      let productImageUrl: string | undefined;
      
      // Create launch with object paths
      const response = await fetch(`${API_BASE}/launches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          tagline: data.tagline,
          description: data.description,
          websiteUrl: data.websiteUrl,
          logoUrl,
          productImageUrl,
          tagIds: data.tagIds,
        }),
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to create launch");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["launches"] });
    },
  });
}

export function useUpvoteLaunch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (launchId: string) => 
      fetchWithAuth(`${API_BASE}/launches/${launchId}/upvote`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["launches"] });
    },
  });
}

export function useDeleteLaunch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (launchId: string) => 
      fetchWithAuth(`${API_BASE}/launches/${launchId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["launches"] });
    },
  });
}

export function useLaunchComments(launchId: string) {
  return useQuery({
    queryKey: ["launchComments", launchId],
    queryFn: () => fetchWithAuth(`${API_BASE}/launches/${launchId}/comments`),
    enabled: !!launchId,
  });
}

export function useAddLaunchComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { launchId: string; content: string }) => 
      fetchWithAuth(`${API_BASE}/launches/${data.launchId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: data.content }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["launchComments", variables.launchId] });
    },
  });
}

// Post interactions
export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => 
      fetchWithAuth(`${API_BASE}/posts/${postId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => 
      fetchWithAuth(`${API_BASE}/posts/${postId}/like`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useUnlikePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => 
      fetchWithAuth(`${API_BASE}/posts/${postId}/unlike`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useRepostPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => 
      fetchWithAuth(`${API_BASE}/posts/${postId}/repost`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function usePostComments(postId: string) {
  return useQuery({
    queryKey: ["postComments", postId],
    queryFn: () => fetchWithAuth(`${API_BASE}/posts/${postId}/comments`),
    enabled: !!postId,
  });
}

export function useAddPostComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { postId: string; content: string }) => 
      fetchWithAuth(`${API_BASE}/posts/${data.postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: data.content }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["postComments", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

// User activity
export function useUserActivity() {
  return useQuery({
    queryKey: ["userActivity"],
    queryFn: () => fetchWithAuth(`${API_BASE}/me/activity`),
  });
}

// User search
export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ["searchUsers", query],
    queryFn: () => fetchWithAuth(`${API_BASE}/users/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
}

// User activity by ID (for viewing other user profiles)
export function useUserActivityById(userId: string) {
  return useQuery({
    queryKey: ["userActivity", userId],
    queryFn: () => fetchWithAuth(`${API_BASE}/users/${userId}/activity`),
    enabled: !!userId,
  });
}

// Messaging
export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => fetchWithAuth(`${API_BASE}/conversations`),
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });
}

export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => fetchWithAuth(`${API_BASE}/conversations/${conversationId}`),
    enabled: !!conversationId,
    refetchInterval: 3000, // Refresh every 3 seconds for real-time messages
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) => 
      fetchWithAuth(`${API_BASE}/conversations`, {
        method: "POST",
        body: JSON.stringify({ participantId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { conversationId: string; content: string }) => 
      fetchWithAuth(`${API_BASE}/conversations/${data.conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: data.content }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// Community threads
export function useCommunityThreads(communityId: string) {
  return useQuery({
    queryKey: ["threads", communityId],
    queryFn: () => fetchWithAuth(`${API_BASE}/communities/${communityId}/threads`),
    enabled: !!communityId,
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { communityId: string; title: string; content: string }) => 
      fetchWithAuth(`${API_BASE}/communities/${data.communityId}/threads`, {
        method: "POST",
        body: JSON.stringify({ title: data.title, content: data.content }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["threads", variables.communityId] });
    },
  });
}

// Thread detail and comments
export function useThread(threadId: string) {
  return useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => fetchWithAuth(`${API_BASE}/threads/${threadId}`),
    enabled: !!threadId,
  });
}

export function useThreadComments(threadId: string) {
  return useQuery({
    queryKey: ["threadComments", threadId],
    queryFn: () => fetchWithAuth(`${API_BASE}/threads/${threadId}/comments`),
    enabled: !!threadId,
    refetchInterval: 5000,
  });
}

export function useAddThreadComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { threadId: string; content: string }) => 
      fetchWithAuth(`${API_BASE}/threads/${data.threadId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: data.content }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["threadComments", variables.threadId] });
      queryClient.invalidateQueries({ queryKey: ["thread", variables.threadId] });
    },
  });
}

// Blog
export function useBlogPosts() {
  return useQuery({
    queryKey: ["blog"],
    queryFn: () => fetchPublic(`${API_BASE}/blog`),
  });
}

export function useBlogPost(slug: string) {
  return useQuery({
    queryKey: ["blog", slug],
    queryFn: () => fetchPublic(`${API_BASE}/blog/${slug}`),
    enabled: !!slug,
  });
}

export function useCheckBlogAdmin() {
  return useQuery({
    queryKey: ["blog-admin"],
    queryFn: () => fetchWithAuth(`${API_BASE}/blog/check-admin`),
  });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; content: string; excerpt?: string; coverImageUrl?: string }) =>
      fetchWithAuth(`${API_BASE}/blog`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog"] });
    },
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchWithAuth(`${API_BASE}/blog/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog"] });
    },
  });
}

// Broadcasts - sends messages as DMs to matching recipients
export function useSendBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; tags: string[]; city?: string }) => 
      fetchWithAuth(`${API_BASE}/broadcasts`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
