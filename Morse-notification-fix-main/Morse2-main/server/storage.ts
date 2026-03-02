import { 
  users, tags, userTags, posts, postTags, communities, communityTags, 
  communityMembers, follows, likes, comments, launches, launchTags, launchUpvotes,
  conversations, messages, threads, threadComments,
  broadcasts, broadcastTags, broadcastRecipients, blogPosts, notifications,
  type User, type InsertUser, type Tag, type InsertTag, 
  type Post, type InsertPost, type Community, type InsertCommunity,
  type Follow, type InsertFollow, type Launch, type InsertLaunch,
  type Conversation, type Message, type Thread, type ThreadComment,
  type Broadcast, type InsertBroadcast, type BlogPost, type InsertBlogPost
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray, or, sql, gte, lt } from "drizzle-orm";
import { sendEmail } from "./services/emailService";
import { newDMEmail, newFollowRequestEmail } from "./lib/emailTemplates";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByClerkId(clerkId: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  searchUsers(query: string): Promise<User[]>;
  
  // Tags
  getTags(): Promise<Tag[]>;
  getTag(id: string): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  getUserTags(userId: string): Promise<Tag[]>;
  setUserTags(userId: string, tagIds: string[]): Promise<void>;
  
  // Posts
  getPost(id: string): Promise<Post | undefined>;
  getPosts(limit?: number): Promise<(Post & { author: User })[]>;
  getPostsByUser(userId: string): Promise<Post[]>;
  getPostsByTags(tagIds: string[]): Promise<Post[]>;
  getFeedPosts(userId: string): Promise<(Post & { author: User })[]>;
  createPost(post: InsertPost): Promise<Post>;
  setPostTags(postId: string, tagIds: string[]): Promise<void>;
  deletePost(id: string): Promise<void>;
  likePost(postId: string, userId: string): Promise<void>;
  unlikePost(postId: string, userId: string): Promise<void>;
  getUserLikes(userId: string): Promise<any[]>;
  repostPost(postId: string, userId: string): Promise<void>;
  getPostComments(postId: string): Promise<any[]>;
  addPostComment(postId: string, userId: string, content: string): Promise<any>;
  
  // Communities
  getCommunities(): Promise<Community[]>;
  getCommunity(id: string): Promise<Community | undefined>;
  createCommunity(community: InsertCommunity): Promise<Community>;
  getUserCommunities(userId: string): Promise<Community[]>;
  joinCommunity(userId: string, communityId: string): Promise<void>;
  leaveCommunity(userId: string, communityId: string): Promise<void>;
  deleteCommunity(communityId: string, userId: string): Promise<void>;
  setCommunityTags(communityId: string, tagIds: string[]): Promise<void>;
  getCommunityTags(communityId: string): Promise<Tag[]>;
  
  // Follows
  getFollowRequests(userId: string): Promise<(Follow & { follower: User })[]>;
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;
  getFollowStatus(followerId: string, followingId: string): Promise<string | null>;
  createFollow(follow: InsertFollow): Promise<Follow>;
  acceptFollow(id: string): Promise<void>;
  declineFollow(id: string): Promise<void>;
  
  // Launches
  getLaunches(): Promise<(Launch & { creator: User })[]>;
  getTodaysLaunches(): Promise<(Launch & { creator: User })[]>;
  getYesterdaysTopLaunches(): Promise<(Launch & { creator: User })[]>;
  getRecommendedLaunches(userId: string): Promise<(Launch & { creator: User; matchingTags: number })[]>;
  deleteOldLaunches(): Promise<number>;
  createLaunch(launch: InsertLaunch): Promise<Launch>;
  setLaunchTags(launchId: string, tagIds: string[]): Promise<void>;
  upvoteLaunch(launchId: string, userId: string): Promise<{ success: boolean; alreadyUpvoted: boolean }>;
  hasUserUpvoted(launchId: string, userId: string): Promise<boolean>;
  deleteLaunch(launchId: string, userId: string): Promise<void>;
  getLaunchComments(launchId: string): Promise<any[]>;
  addLaunchComment(launchId: string, userId: string, content: string): Promise<any>;
  
  // Activity
  getUserActivity(userId: string): Promise<any[]>;
  getUserActivityById(userId: string): Promise<any[]>;
  
  // Messaging
  getConversation(conversationId: string): Promise<Conversation | undefined>;
  getConversationById(id: string): Promise<Conversation | undefined>;
  getConversations(userId: string): Promise<any[]>;
  getOrCreateConversation(userId1: string, userId2: string): Promise<Conversation>;
  getConversationMessages(conversationId: string): Promise<any[]>;
  sendMessage(conversationId: string, senderId: string, content: string): Promise<Message>;
  isConversationParticipant(conversationId: string, userId: string): Promise<boolean>;
  
  // Threads
  getCommunityThreads(communityId: string): Promise<any[]>;
  getThread(threadId: string): Promise<any | undefined>;
  createThread(communityId: string, authorId: string, title: string, content: string): Promise<Thread>;
  getThreadComments(threadId: string): Promise<any[]>;
  addThreadComment(threadId: string, authorId: string, content: string): Promise<ThreadComment>;
  
  // Broadcasts (sends as DMs to matching recipients)
  sendBroadcast(senderId: string, content: string, tagNames: string[], city?: string): Promise<{ recipientCount: number }>;

  // Blog
  getBlogPosts(): Promise<(BlogPost & { author: User })[]>;
  getBlogPostBySlug(slug: string): Promise<(BlogPost & { author: User }) | undefined>;
  createBlogPost(blogPost: InsertBlogPost): Promise<BlogPost>;
  deleteBlogPost(id: string): Promise<void>;

  // Notifications
  createNotification(data: {
  recipientId: string;
  actorId: string;
  type: string;
  entityId: string;
  }): Promise<void>;

  getUserNotifications(userId: string): Promise<any[]>;

  markNotificationRead(id: string): Promise<void>; 

}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByClerkId(clerkId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

 // Notifications
 async createNotification(data: {
  recipientId: string;
  actorId: string;
  entityId: string;
  type: string;
  title: string;
  body: string;
}): Promise<void> {
  const { recipientId, actorId, entityId } = data;

  if (!recipientId || !actorId || !entityId) {
    console.error("BLOCKED_BAD_NOTIFICATION", data);
    return;
  }

  await db.insert(notifications).values(data);
}

  async getUserNotifications(userId: string): Promise<any[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }

  // Tags
  async getTags(): Promise<Tag[]> {
    return db.select().from(tags);
  }

  async getTag(id: string): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag || undefined;
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const [tag] = await db.insert(tags).values(insertTag).returning();
    return tag;
  }

  async getUserTags(userId: string): Promise<Tag[]> {
    const result = await db
      .select({ tag: tags })
      .from(userTags)
      .innerJoin(tags, eq(userTags.tagId, tags.id))
      .where(eq(userTags.userId, userId));
    return result.map(r => r.tag);
  }

  async setUserTags(userId: string, tagIds: string[]): Promise<void> {
    await db.delete(userTags).where(eq(userTags.userId, userId));
    if (tagIds.length > 0) {
      await db.insert(userTags).values(tagIds.map(tagId => ({ userId, tagId })));
    }
  }

  // Posts
  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async getPosts(limit = 50): Promise<(Post & { author: User })[]> {
    const result = await db
      .select({ post: posts, author: users })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit);
    return result.map(r => ({ ...r.post, author: r.author }));
  }

  async getPostsByUser(userId: string): Promise<Post[]> {
    return db.select().from(posts).where(eq(posts.authorId, userId)).orderBy(desc(posts.createdAt));
  }

  async getPostsByTags(tagIds: string[]): Promise<Post[]> {
    if (tagIds.length === 0) return [];
    const result = await db
      .select({ post: posts })
      .from(postTags)
      .innerJoin(posts, eq(postTags.postId, posts.id))
      .where(inArray(postTags.tagId, tagIds))
      .orderBy(desc(posts.createdAt));
    return result.map(r => r.post);
  }

  async getFeedPosts(userId: string): Promise<(Post & { author: User })[]> {
    const userTagRecords = await db.select().from(userTags).where(eq(userTags.userId, userId));
    const userTagIds = userTagRecords.map(ut => ut.tagId);

    const allPosts = await db
      .select({ post: posts, author: users })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(100);

    if (userTagIds.length === 0) {
      return allPosts.map(r => ({ ...r.post, author: r.author }));
    }

    const postsWithRelevance = await Promise.all(
      allPosts.map(async (r) => {
        const postTagRecords = await db.select().from(postTags).where(eq(postTags.postId, r.post.id));
        const postTagIds = postTagRecords.map(pt => pt.tagId);
        const matchingTags = postTagIds.filter(tagId => userTagIds.includes(tagId)).length;
        return { ...r.post, author: r.author, matchingTags };
      })
    );

    postsWithRelevance.sort((a, b) => b.matchingTags - a.matchingTags || new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    return postsWithRelevance;
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values(insertPost).returning();
    return post;
  }

  async setPostTags(postId: string, tagIds: string[]): Promise<void> {
    await db.delete(postTags).where(eq(postTags.postId, postId));
    if (tagIds.length > 0) {
      await db.insert(postTags).values(tagIds.map(tagId => ({ postId, tagId })));
    }
  }

  async deletePost(id: string): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  // Communities
  async getCommunities(): Promise<Community[]> {
    return db.select().from(communities).orderBy(desc(communities.createdAt));
  }

  async getCommunity(id: string): Promise<Community | undefined> {
    const [community] = await db.select().from(communities).where(eq(communities.id, id));
    return community || undefined;
  }

  async createCommunity(insertCommunity: InsertCommunity): Promise<Community> {
    const [community] = await db.insert(communities).values(insertCommunity).returning();
    return community;
  }

  async getUserCommunities(userId: string): Promise<Community[]> {
    const result = await db
      .selectDistinct({ community: communities })
      .from(communityMembers)
      .innerJoin(communities, eq(communityMembers.communityId, communities.id))
      .where(eq(communityMembers.userId, userId));
    return result.map(r => r.community);
  }

  async joinCommunity(userId: string, communityId: string): Promise<void> {
    // Check if already a member
    const [existing] = await db.select().from(communityMembers).where(
      and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId))
    );
    if (!existing) {
      await db.insert(communityMembers).values({ userId, communityId });
    }
  }

  async leaveCommunity(userId: string, communityId: string): Promise<void> {
    await db.delete(communityMembers).where(
      and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId))
    );
  }

  async deleteCommunity(communityId: string, userId: string): Promise<void> {
    const community = await this.getCommunity(communityId);
    if (!community || community.creatorId !== userId) {
      throw new Error("Only the creator can delete this community");
    }
    await db.delete(communities).where(eq(communities.id, communityId));
  }

  async setCommunityTags(communityId: string, tagIds: string[]): Promise<void> {
    await db.delete(communityTags).where(eq(communityTags.communityId, communityId));
    if (tagIds.length > 0) {
      await db.insert(communityTags).values(
        tagIds.map(tagId => ({ communityId, tagId }))
      );
    }
  }

  async getCommunityTags(communityId: string): Promise<Tag[]> {
    const result = await db
      .select({ tag: tags })
      .from(communityTags)
      .innerJoin(tags, eq(communityTags.tagId, tags.id))
      .where(eq(communityTags.communityId, communityId));
    return result.map(r => r.tag);
  }

  // Follows
  async getFollowRequests(userId: string): Promise<(Follow & { follower: User })[]> {
    const result = await db
      .select({ follow: follows, follower: users })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(and(eq(follows.followingId, userId), eq(follows.status, "pending")));
    return result.map(r => ({ ...r.follow, follower: r.follower }));
  }

  async getFollowers(userId: string): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(and(eq(follows.followingId, userId), eq(follows.status, "accepted")));
    return result.map(r => r.user);
  }

  async getFollowing(userId: string): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(and(eq(follows.followerId, userId), eq(follows.status, "accepted")));
    return result.map(r => r.user);
  }

  async getFollowStatus(followerId: string, followingId: string): Promise<string | null> {
    const [follow] = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return follow ? follow.status : null;
  }

  async createFollow(insertFollow: InsertFollow): Promise<Follow> {
    const [follow] = await db.insert(follows).values(insertFollow).returning();

  if (!insertFollow.followerId) {
  throw new Error("createFollow: followerId missing");
 }

    try {
      const recipient = await this.getUser(insertFollow.followingId);
      const sender = await this.getUser(insertFollow.followerId);
      console.log("FOLLOW_DEBUG_SENDER", sender);
      console.log("FOLLOW_DEBUG_SENDER_ID", sender?.id);
      console.log("FOLLOW_DEBUG_FOLLOWER_ID", insertFollow.followerId);

      if (recipient && sender) {
        await this.createNotification({
        recipientId: recipient.id,
        actorId: sender.id,
        entityId: follow.id,
        type: "follow_request",
        title: "New follow request",
        body: `${sender.username} wants to follow you`,
      });

        if (recipient.email) {
          const email = newFollowRequestEmail(
            recipient.username || "User",
            sender.username || "Someone"
          );

        console.log("EMAIL_TRIGGERED_FOLLOW", recipient.email);

          const emailResult = await sendEmail({
            to: recipient.email,
            subject: email.subject,
            html: email.html,
          });

        console.log("EMAIL_RESULT_FOLLOW", emailResult);
        }
      }
    } catch (err) {
      console.error("Follow notification failed:", err);
    }

    return follow;
  }

  async acceptFollow(id: string): Promise<void> {
    await db.update(follows).set({ status: "accepted" }).where(eq(follows.id, id));
  }

  async declineFollow(id: string): Promise<void> {
    await db.delete(follows).where(eq(follows.id, id));
  }

  // Launches
  async getLaunches(): Promise<(Launch & { creator: User })[]> {
    const result = await db
      .select({ launch: launches, creator: users })
      .from(launches)
      .innerJoin(users, eq(launches.creatorId, users.id))
      .orderBy(desc(launches.upvotesCount), desc(launches.createdAt));
    return result.map(r => ({ ...r.launch, creator: r.creator }));
  }

  async getTodaysLaunches(): Promise<(Launch & { creator: User })[]> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const result = await db
      .select({ launch: launches, creator: users })
      .from(launches)
      .innerJoin(users, eq(launches.creatorId, users.id))
      .where(gte(launches.createdAt, twentyFourHoursAgo))
      .orderBy(desc(launches.upvotesCount), desc(launches.createdAt));
    return result.map(r => ({ ...r.launch, creator: r.creator }));
  }

  async getYesterdaysTopLaunches(): Promise<(Launch & { creator: User })[]> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    const result = await db
      .select({ launch: launches, creator: users })
      .from(launches)
      .innerJoin(users, eq(launches.creatorId, users.id))
      .where(and(
        gte(launches.createdAt, fortyEightHoursAgo),
        lt(launches.createdAt, twentyFourHoursAgo)
      ))
      .orderBy(desc(launches.upvotesCount), desc(launches.createdAt))
      .limit(7);
    return result.map(r => ({ ...r.launch, creator: r.creator }));
  }

  async deleteOldLaunches(): Promise<number> {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    const oldLaunches = await db.select({ id: launches.id }).from(launches)
      .where(lt(launches.createdAt, fortyEightHoursAgo));
    
    if (oldLaunches.length > 0) {
      const ids = oldLaunches.map(l => l.id);
      await db.delete(launches).where(inArray(launches.id, ids));
    }
    
    return oldLaunches.length;
  }

  async getRecommendedLaunches(userId: string): Promise<(Launch & { creator: User; matchingTags: number })[]> {
    // Get user's tag IDs
    const userTagRecords = await db.select().from(userTags).where(eq(userTags.userId, userId));
    const userTagIds = userTagRecords.map(ut => ut.tagId);
    
    if (userTagIds.length === 0) {
      return [];
    }
    
    // Get all launches with their tags
    const allLaunches = await db
      .select({ launch: launches, creator: users })
      .from(launches)
      .innerJoin(users, eq(launches.creatorId, users.id))
      .orderBy(desc(launches.upvotesCount), desc(launches.createdAt));
    
    // For each launch, count matching tags
    const launchesWithMatchCount = await Promise.all(
      allLaunches.map(async (r) => {
        const launchTagRecords = await db.select().from(launchTags).where(eq(launchTags.launchId, r.launch.id));
        const launchTagIds = launchTagRecords.map(lt => lt.tagId);
        const matchingTags = launchTagIds.filter(tagId => userTagIds.includes(tagId)).length;
        return { ...r.launch, creator: r.creator, matchingTags };
      })
    );
    
    // Filter to only those with at least 2 matching tags and sort by matching tags, then upvotes
    return launchesWithMatchCount
      .filter(launch => launch.matchingTags >= 2)
      .sort((a, b) => {
        if (b.matchingTags !== a.matchingTags) return b.matchingTags - a.matchingTags;
        return (b.upvotesCount || 0) - (a.upvotesCount || 0);
      });
  }

  async createLaunch(insertLaunch: InsertLaunch): Promise<Launch> {
    const [launch] = await db.insert(launches).values(insertLaunch).returning();
    return launch;
  }

  async setLaunchTags(launchId: string, tagIds: string[]): Promise<void> {
    await db.delete(launchTags).where(eq(launchTags.launchId, launchId));
    if (tagIds.length > 0) {
      await db.insert(launchTags).values(tagIds.map(tagId => ({ launchId, tagId })));
    }
  }

  async hasUserUpvoted(launchId: string, userId: string): Promise<boolean> {
    const [existing] = await db.select().from(launchUpvotes).where(
      and(eq(launchUpvotes.launchId, launchId), eq(launchUpvotes.userId, userId))
    );
    return !!existing;
  }

  async upvoteLaunch(launchId: string, userId: string): Promise<{ success: boolean; alreadyUpvoted: boolean }> {
    const alreadyUpvoted = await this.hasUserUpvoted(launchId, userId);
    if (alreadyUpvoted) {
      return { success: false, alreadyUpvoted: true };
    }

    const [launch] = await db.select().from(launches).where(eq(launches.id, launchId));
    if (launch) {
      await db.insert(launchUpvotes).values({ launchId, userId });
      await db.update(launches).set({ 
        upvotesCount: (launch.upvotesCount || 0) + 1 
      }).where(eq(launches.id, launchId));
      return { success: true, alreadyUpvoted: false };
    }
    return { success: false, alreadyUpvoted: false };
  }

  async deleteLaunch(launchId: string, userId: string): Promise<void> {
    const [launch] = await db.select().from(launches).where(eq(launches.id, launchId));
    if (launch && launch.creatorId === userId) {
      await db.delete(launches).where(eq(launches.id, launchId));
    }
  }

  async getLaunchComments(launchId: string): Promise<any[]> {
    return [];
  }

  async addLaunchComment(launchId: string, userId: string, content: string): Promise<any> {
    return { id: "temp", launchId, userId, content };
  }

  // Post interactions
  async likePost(postId: string, userId: string): Promise<void> {
    const existing = await db.select().from(likes)
      .where(and(eq(likes.postId, postId), eq(likes.userId, userId)));
    if (existing.length === 0) {
      await db.insert(likes).values({ postId, userId });
      const [post] = await db.select().from(posts).where(eq(posts.id, postId));
      if (post) {
        await db.update(posts).set({ 
          likesCount: (post.likesCount || 0) + 1 
        }).where(eq(posts.id, postId));
      }
    }
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    await db.delete(likes).where(and(eq(likes.postId, postId), eq(likes.userId, userId)));
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (post && (post.likesCount || 0) > 0) {
      await db.update(posts).set({ 
        likesCount: (post.likesCount || 0) - 1 
      }).where(eq(posts.id, postId));
    }
  }

  async getUserLikes(userId: string): Promise<any[]> {
    return db.select().from(likes).where(eq(likes.userId, userId));
  }

  async repostPost(postId: string, userId: string): Promise<void> {
    const [originalPost] = await db.select().from(posts).where(eq(posts.id, postId));
    if (originalPost) {
      await db.insert(posts).values({
        authorId: userId,
        content: `Reposted: ${originalPost.content}`,
        imageUrl: originalPost.imageUrl,
      });
      await db.update(posts).set({ 
        repostsCount: (originalPost.repostsCount || 0) + 1 
      }).where(eq(posts.id, postId));
    }
  }

  async getPostComments(postId: string): Promise<any[]> {
    const result = await db
      .select({ comment: comments, user: users })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));
    return result.map(r => ({ ...r.comment, user: r.user }));
  }

  async addPostComment(postId: string, userId: string, content: string): Promise<any> {
    const [comment] = await db.insert(comments).values({ postId, userId, content }).returning();
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (post) {
      await db.update(posts).set({ 
        commentsCount: (post.commentsCount || 0) + 1 
      }).where(eq(posts.id, postId));
    }
    return comment;
  }

  async searchUsers(query: string): Promise<User[]> {
    const pattern = `%${query}%`;

    const tagMatchedUserIds = await db
      .selectDistinct({ userId: userTags.userId })
      .from(userTags)
      .innerJoin(tags, eq(userTags.tagId, tags.id))
      .where(sql`${tags.name} ILIKE ${pattern}`);

    const tagUserIds = tagMatchedUserIds.map(r => r.userId);

    const nameResults = await db
      .select()
      .from(users)
      .where(
        or(
          sql`${users.username} ILIKE ${pattern}`,
          sql`${users.displayName} ILIKE ${pattern}`,
          tagUserIds.length > 0 ? inArray(users.id, tagUserIds) : sql`false`
        )
      )
      .limit(20);

    return nameResults;
  }

  // User activity
  async getUserActivity(userId: string): Promise<any[]> {
    const userComments = await db
      .select({ comment: comments, post: posts, postAuthor: users })
      .from(comments)
      .innerJoin(posts, eq(comments.postId, posts.id))
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(comments.userId, userId))
      .orderBy(desc(comments.createdAt))
      .limit(10);
    
    const userLikes = await db
      .select({ like: likes, post: posts, postAuthor: users })
      .from(likes)
      .innerJoin(posts, eq(likes.postId, posts.id))
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(likes.userId, userId))
      .orderBy(desc(likes.createdAt))
      .limit(10);
    
    const activity = [
      ...userComments.map(c => ({
        id: c.comment.id,
        type: "comment",
        description: `commented on ${c.postAuthor.displayName || c.postAuthor.username}'s post`,
        createdAt: c.comment.createdAt
      })),
      ...userLikes.map(l => ({
        id: l.like.id,
        type: "like",
        description: `liked ${l.postAuthor.displayName || l.postAuthor.username}'s post`,
        createdAt: l.like.createdAt
      }))
    ];
    
    return activity.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    ).slice(0, 10);
  }

  // Get user activity by ID (for viewing other profiles)
  async getUserActivityById(userId: string): Promise<any[]> {
    return this.getUserActivity(userId);
  }

  // Messaging
  async getConversations(userId: string): Promise<any[]> {
    const allConversations = await db
      .select()
      .from(conversations)
      .where(or(
        eq(conversations.participant1Id, userId),
        eq(conversations.participant2Id, userId)
      ))
      .orderBy(desc(conversations.lastMessageAt));
    
    const result = await Promise.all(allConversations.map(async (conv) => {
      const otherUserId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
      const otherUser = await this.getUser(otherUserId);
      const lastMessage = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);
      
      return {
        ...conv,
        otherUser,
        lastMessage: lastMessage[0] || null
      };
    }));
    
    return result;
  }

  async getConversation(conversationId: string): Promise<Conversation | undefined> {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    return conv;
  }

  async getConversationById(id: string): Promise<Conversation | undefined> {
  return db.query.conversations.findFirst({
    where: eq(conversations.id, id),
    });
  }

  async getOrCreateConversation(userId1: string, userId2: string): Promise<Conversation> {
    const existing = await db
      .select()
      .from(conversations)
      .where(or(
        and(eq(conversations.participant1Id, userId1), eq(conversations.participant2Id, userId2)),
        and(eq(conversations.participant1Id, userId2), eq(conversations.participant2Id, userId1))
      ));
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    const [newConv] = await db
      .insert(conversations)
      .values({
        participant1Id: userId1,
        participant2Id: userId2,
      })
      .returning();
    
    return newConv;
  }

  async getConversationMessages(conversationId: string): Promise<any[]> {
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    
    const result = await Promise.all(msgs.map(async (msg) => {
      const sender = await this.getUser(msg.senderId);
      return { ...msg, sender };
    }));
    
    return result;
  }

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    const [msg] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId,
        content,
      })
      .returning();

    try {
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId)
      });

      if (conversation) {
        const receiverId =
          conversation.participant1Id === senderId
            ? conversation.participant2Id
            : conversation.participant1Id;

        if (receiverId !== senderId) {
          const receiver = await this.getUser(receiverId);
          const sender = await this.getUser(senderId);

          if (receiver && sender) {
            await this.createNotification({
            recipientId: recipient.id,
            actorId: sender.id,
            entityId: follow.id,
            type: "follow_request",
            title: "New follow request",
            body: `${sender.username} wants to follow you`,
          });

            if (receiver.email) {
              const email = newDMEmail(
                receiver.username || "User",
                sender.username || "Someone",
                content.slice(0, 200)
              );

              await sendEmail({
                to: receiver.email,
                subject: email.subject,
                html: email.html
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("DM email failed:", err);
    }

    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));
    
    return msg;
  }

  async isConversationParticipant(conversationId: string, userId: string): Promise<boolean> {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    
    if (!conv) return false;
    return conv.participant1Id === userId || conv.participant2Id === userId;
  }

  // Community threads
  async getCommunityThreads(communityId: string): Promise<any[]> {
    const allThreads = await db
      .select()
      .from(threads)
      .where(eq(threads.communityId, communityId))
      .orderBy(desc(threads.createdAt));
    
    const result = await Promise.all(allThreads.map(async (thread) => {
      const author = await this.getUser(thread.authorId);
      return { ...thread, author };
    }));
    
    return result;
  }

  async getThread(threadId: string): Promise<any | undefined> {
    const [thread] = await db.select().from(threads).where(eq(threads.id, threadId));
    if (!thread) return undefined;
    const author = await this.getUser(thread.authorId);
    const community = await this.getCommunity(thread.communityId);
    return { ...thread, author, community };
  }

  async createThread(communityId: string, authorId: string, title: string, content: string): Promise<Thread> {
    const [thread] = await db
      .insert(threads)
      .values({
        communityId,
        authorId,
        title,
        content,
      })
      .returning();
    
    return thread;
  }

  async getThreadComments(threadId: string): Promise<any[]> {
    const allComments = await db
      .select()
      .from(threadComments)
      .where(eq(threadComments.threadId, threadId))
      .orderBy(threadComments.createdAt);
    
    const result = await Promise.all(allComments.map(async (comment) => {
      const author = await this.getUser(comment.authorId);
      return { ...comment, author };
    }));
    
    return result;
  }

  
  async addThreadComment(threadId: string, authorId: string, content: string): Promise<ThreadComment> {
    const [comment] = await db
      .insert(threadComments)
      .values({
        threadId,
        authorId,
        content,
      })
      .returning();
    
    await db
      .update(threads)
      .set({ commentsCount: sql`COALESCE(${threads.commentsCount}, 0) + 1` })
      .where(eq(threads.id, threadId));

    try {
      const thread = await db.query.threads.findFirst({
        where: eq(threads.id, threadId),
      });

      if (thread && thread.authorId !== authorId) {
        const recipient = await this.getUser(thread.authorId);
        const sender = await this.getUser(authorId);

        if (recipient && sender) {
          await this.createNotification({
          recipientId: recipient.id,
          actorId: sender.id,
          entityId: follow.id,
          type: "follow_request",
          title: "New follow request",
          body: `${sender.username} wants to follow you`,
        });

          if (recipient.email) {
            const email = newDMEmail(
              recipient.username || "User",
              sender.username || "Someone",
              content.slice(0, 200)
            );

            await sendEmail({
              to: recipient.email,
              subject: email.subject,
              html: email.html,
            });
          }
        }
      }
    } catch (err) {
      console.error("Thread comment notification failed:", err);
    }
    
    return comment;
  }

  // Broadcasts - sends as DMs to matching recipients
  async sendBroadcast(senderId: string, content: string, tagNames: string[], city?: string): Promise<{ recipientCount: number }> {
    const allTags = await this.getTags();
    const tagIdMap = new Map(allTags.map(t => [t.name.toLowerCase(), t.id]));
    const matchingTagIds = tagNames
      .map(name => tagIdMap.get(name.toLowerCase()))
      .filter((id): id is string => id !== undefined);

    if (matchingTagIds.length === 0) {
      return { recipientCount: 0 };
    }

    const usersWithMatchingTags = await db
      .select({ userId: userTags.userId, tagId: userTags.tagId, userCity: users.city })
      .from(userTags)
      .innerJoin(users, eq(userTags.userId, users.id))
      .where(inArray(userTags.tagId, matchingTagIds));

    const userTagCounts = new Map<string, { count: number; city: string | null }>();
    for (const row of usersWithMatchingTags) {
      const existing = userTagCounts.get(row.userId);
      if (existing) {
        existing.count += 1;
      } else {
        userTagCounts.set(row.userId, { count: 1, city: row.userCity });
      }
    }

    const eligibleUserIds: string[] = [];
    if (!city) {
      return { recipientCount: 0 };
    }

    const normalizedCity = city.toLowerCase().trim();
    Array.from(userTagCounts.entries()).forEach(([uid, data]) => {
      if (uid === senderId) return;
      if (data.count < 3) return;
      if (!data.city || data.city.toLowerCase().trim() !== normalizedCity) return;
      eligibleUserIds.push(uid);
    });

    for (const recipientId of eligibleUserIds) {
      const conversation = await this.getOrCreateConversation(senderId, recipientId);
      await this.sendMessage(conversation.id, senderId, `[Broadcast] ${content}`);
    }

    return { recipientCount: eligibleUserIds.length };
  }

  async getBlogPosts(): Promise<(BlogPost & { author: User })[]> {
    const results = await db
      .select({ blogPost: blogPosts, author: users })
      .from(blogPosts)
      .innerJoin(users, eq(blogPosts.authorId, users.id))
      .where(eq(blogPosts.published, true))
      .orderBy(desc(blogPosts.createdAt));
    return results.map(r => ({ ...r.blogPost, author: r.author }));
  }

  async getBlogPostBySlug(slug: string): Promise<(BlogPost & { author: User }) | undefined> {
    const [result] = await db
      .select({ blogPost: blogPosts, author: users })
      .from(blogPosts)
      .innerJoin(users, eq(blogPosts.authorId, users.id))
      .where(eq(blogPosts.slug, slug));
    if (!result) return undefined;
    return { ...result.blogPost, author: result.author };
  }

  async createBlogPost(blogPost: InsertBlogPost): Promise<BlogPost> {
    const [post] = await db.insert(blogPosts).values(blogPost).returning();
    return post;
  }

  async deleteBlogPost(id: string): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }
}

export const storage = new DatabaseStorage();

// Default tags for startup/founder platform
const DEFAULT_TAGS = [
  { name: "Startups", description: "Early-stage companies and ventures" },
  { name: "Founders", description: "Startup founders and co-founders" },
  { name: "Engineering", description: "Software engineering and development" },
  { name: "Product", description: "Product management and strategy" },
  { name: "Design", description: "UI/UX and product design" },
  { name: "Marketing", description: "Growth and marketing strategies" },
  { name: "Sales", description: "Sales and business development" },
  { name: "Finance", description: "Finance and accounting" },
  { name: "Legal", description: "Legal and compliance" },
  { name: "HR", description: "Human resources and recruiting" },
  { name: "AI", description: "Artificial intelligence and ML" },
  { name: "Fintech", description: "Financial technology" },
  { name: "SaaS", description: "Software as a Service" },
  { name: "E-commerce", description: "Online retail and commerce" },
  { name: "Healthcare", description: "Health technology" },
  { name: "EdTech", description: "Education technology" },
  { name: "Gaming", description: "Video games and gaming" },
  { name: "Social Media", description: "Social networking platforms" },
  { name: "Productivity", description: "Work and productivity tools" },
  { name: "Developer Tools", description: "Software development tools" },
  { name: "Crypto", description: "Blockchain and cryptocurrency" },
  { name: "Mobile", description: "Mobile app development" },
  { name: "Analytics", description: "Data analytics and insights" },
  { name: "Security", description: "Cybersecurity solutions" },
  { name: "IoT", description: "Internet of Things" },
  { name: "AR/VR", description: "Augmented and virtual reality" },
  { name: "Climate", description: "Climate and sustainability" },
  { name: "Hardware", description: "Physical products and devices" },
  { name: "B2B", description: "Business to business" },
  { name: "B2C", description: "Business to consumer" },
  { name: "Marketplace", description: "Marketplace platforms" },
  { name: "API", description: "API products and services" },
  { name: "Open Source", description: "Open source projects" },
  { name: "Remote Work", description: "Remote and distributed teams" },
  { name: "Enterprise", description: "Enterprise solutions" },
  { name: "Investor", description: "VCs and angel investors" },
  { name: "Data Science", description: "Data science and analysis" },
  { name: "DevOps", description: "DevOps and infrastructure" },
  { name: "Product Manager", description: "Product management" },
  { name: "Designer", description: "Product and UX designers" },
  { name: "Engineer", description: "Software engineers" },
  { name: "Marketer", description: "Growth and marketing pros" },
  { name: "Agritech", description: "Agriculture technology" },
  { name: "Proptech", description: "Property technology" },
  { name: "Insurtech", description: "Insurance technology" },
  { name: "Logistics", description: "Supply chain and logistics" },
  { name: "Food Tech", description: "Food and beverage tech" },
  { name: "Travel", description: "Travel and hospitality" },
  { name: "Media", description: "Media and entertainment" },
  { name: "D2C", description: "Direct to consumer brands" },
  { name: "No-code", description: "No-code and low-code tools" },
  { name: "Web3", description: "Decentralized web" },
  { name: "NFT", description: "Non-fungible tokens" },
  { name: "Venture Capital", description: "VC and fundraising" },
  { name: "Angel Investing", description: "Angel investments" },
  { name: "Bootstrapped", description: "Self-funded startups" },
  { name: "YC", description: "Y Combinator alumni" },
  { name: "India Startups", description: "Indian startup ecosystem" },
  { name: "Memes", description: "Fun memes and humor" },
];

export async function seedTagsIfEmpty(): Promise<void> {
  const existingTags = await db.select().from(tags);
  if (existingTags.length === 0) {
    console.log("Seeding default tags...");
    await db.insert(tags).values(DEFAULT_TAGS);
    console.log(`Seeded ${DEFAULT_TAGS.length} tags`);
  }
}
