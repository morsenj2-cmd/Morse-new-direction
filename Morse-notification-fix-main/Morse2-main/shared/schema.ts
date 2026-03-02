import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users - linked to Clerk authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clerkId: varchar("clerk_id").notNull().unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  city: text("city"),
  onboardingComplete: boolean("onboarding_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tags - the core of the tag-based system
export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User-Tag relationship (tags users select during onboarding)
export const userTags = pgTable("user_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
});

// Communities
export const communities = pgTable("communities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Community-Tag relationship
export const communityTags = pgTable("community_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communityId: varchar("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
});

// Community Members
export const communityMembers = pgTable("community_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communityId: varchar("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Posts
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  communityId: varchar("community_id").references(() => communities.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  repostsCount: integer("reposts_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Post-Tag relationship
export const postTags = pgTable("post_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
});

// Follows
export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Likes
export const likes = pgTable("likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comments
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Launches (Product Hunt style)
export const launches = pgTable("launches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  productImageUrl: text("product_image_url"),
  websiteUrl: text("website_url"),
  upvotesCount: integer("upvotes_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Launch Tags - tags applied to launches
export const launchTags = pgTable("launch_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  launchId: varchar("launch_id").notNull().references(() => launches.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
});

// Launch Upvotes - track which users have upvoted which launches
export const launchUpvotes = pgTable("launch_upvotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  launchId: varchar("launch_id").notNull().references(() => launches.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations for messaging
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participant1Id: varchar("participant1_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  participant2Id: varchar("participant2_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Community threads (Reddit-style discussions)
export const threads = pgTable("threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  communityId: varchar("community_id").notNull().references(() => communities.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Thread comments
export const threadComments = pgTable("thread_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Blog posts - admin-only content for SEO
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  coverImageUrl: text("cover_image_url"),
  published: boolean("published").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Broadcasts - messages sent to users with matching tags
export const broadcasts = pgTable("broadcasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  city: text("city"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Broadcast tags - the tags targeted by this broadcast
export const broadcastTags = pgTable("broadcast_tags", {
  broadcastId: varchar("broadcast_id").notNull().references(() => broadcasts.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
});

// Broadcast recipients - users who received this broadcast (matched by tags)
export const broadcastRecipients = pgTable("broadcast_recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  broadcastId: varchar("broadcast_id").notNull().references(() => broadcasts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations - defined after all tables are declared
export const usersRelations = relations(users, ({ many }) => ({
  userTags: many(userTags),
  posts: many(posts),
  followersReceived: many(follows, { relationName: "following" }),
  followersGiven: many(follows, { relationName: "follower" }),
  communityMemberships: many(communityMembers),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  userTags: many(userTags),
  postTags: many(postTags),
  communityTags: many(communityTags),
}));

export const userTagsRelations = relations(userTags, ({ one }) => ({
  user: one(users, { fields: [userTags.userId], references: [users.id] }),
  tag: one(tags, { fields: [userTags.tagId], references: [tags.id] }),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  creator: one(users, { fields: [communities.creatorId], references: [users.id] }),
  communityTags: many(communityTags),
  members: many(communityMembers),
  posts: many(posts),
}));

export const communityTagsRelations = relations(communityTags, ({ one }) => ({
  community: one(communities, { fields: [communityTags.communityId], references: [communities.id] }),
  tag: one(tags, { fields: [communityTags.tagId], references: [tags.id] }),
}));

export const communityMembersRelations = relations(communityMembers, ({ one }) => ({
  community: one(communities, { fields: [communityMembers.communityId], references: [communities.id] }),
  user: one(users, { fields: [communityMembers.userId], references: [users.id] }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  community: one(communities, { fields: [posts.communityId], references: [communities.id] }),
  postTags: many(postTags),
  likes: many(likes),
  comments: many(comments),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, { fields: [postTags.postId], references: [posts.id] }),
  tag: one(tags, { fields: [postTags.tagId], references: [tags.id] }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, { fields: [follows.followerId], references: [users.id], relationName: "follower" }),
  following: one(users, { fields: [follows.followingId], references: [users.id], relationName: "following" }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, { fields: [likes.userId], references: [users.id] }),
  post: one(posts, { fields: [likes.postId], references: [posts.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
}));

export const launchesRelations = relations(launches, ({ one, many }) => ({
  creator: one(users, { fields: [launches.creatorId], references: [users.id] }),
  launchTags: many(launchTags),
  launchUpvotes: many(launchUpvotes),
}));

export const launchTagsRelations = relations(launchTags, ({ one }) => ({
  launch: one(launches, { fields: [launchTags.launchId], references: [launches.id] }),
  tag: one(tags, { fields: [launchTags.tagId], references: [tags.id] }),
}));

export const launchUpvotesRelations = relations(launchUpvotes, ({ one }) => ({
  launch: one(launches, { fields: [launchUpvotes.launchId], references: [launches.id] }),
  user: one(users, { fields: [launchUpvotes.userId], references: [users.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  participant1: one(users, { fields: [conversations.participant1Id], references: [users.id], relationName: "participant1" }),
  participant2: one(users, { fields: [conversations.participant2Id], references: [users.id], relationName: "participant2" }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  community: one(communities, { fields: [threads.communityId], references: [communities.id] }),
  author: one(users, { fields: [threads.authorId], references: [users.id] }),
  comments: many(threadComments),
}));

export const threadCommentsRelations = relations(threadComments, ({ one }) => ({
  thread: one(threads, { fields: [threadComments.threadId], references: [threads.id] }),
  author: one(users, { fields: [threadComments.authorId], references: [users.id] }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  author: one(users, { fields: [blogPosts.authorId], references: [users.id] }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTagSchema = createInsertSchema(tags).omit({ id: true, createdAt: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, likesCount: true, commentsCount: true, repostsCount: true });
export const insertCommunitySchema = createInsertSchema(communities).omit({ id: true, createdAt: true });
export const insertFollowSchema = createInsertSchema(follows).omit({ id: true, createdAt: true });
export const insertLaunchSchema = createInsertSchema(launches).omit({ id: true, createdAt: true, upvotesCount: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, lastMessageAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, read: true });
export const insertThreadSchema = createInsertSchema(threads).omit({ id: true, createdAt: true, commentsCount: true });
export const insertThreadCommentSchema = createInsertSchema(threadComments).omit({ id: true, createdAt: true });
export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBroadcastSchema = createInsertSchema(broadcasts).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Community = typeof communities.$inferSelect;
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Follow = typeof follows.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type Launch = typeof launches.$inferSelect;
export type InsertLaunch = z.infer<typeof insertLaunchSchema>;
export type Like = typeof likes.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Thread = typeof threads.$inferSelect;
export type InsertThread = z.infer<typeof insertThreadSchema>;
export type ThreadComment = typeof threadComments.$inferSelect;
export type InsertThreadComment = z.infer<typeof insertThreadCommentSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type Broadcast = typeof broadcasts.$inferSelect;
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;

 // Notifications
 export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  recipientId: varchar("recipient_id")
    .notNull()
    .references(() => users.id),

  actorId: varchar("actor_id")
    .notNull()
    .references(() => users.id),

  type: text("type").notNull(),

  entityId: varchar("entity_id").notNull(),

  read: boolean("read").default(false),

  createdAt: timestamp("created_at").defaultNow(),
});
