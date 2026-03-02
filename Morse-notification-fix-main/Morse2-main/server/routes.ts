import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { clerkClient, clerkMiddleware, requireAuth, getAuth } from "@clerk/express";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = "client/public/uploads";
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed"));
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use((req: Request, res: Response, next: NextFunction) => {
    try {
      clerkMiddleware()(req, res, next);
    } catch (err) {
      console.error("Clerk middleware error:", err);
      next();
    }
  });
  
  // Register object storage routes for file uploads
  

  // Auth bootstrap - sync Clerk user to database
  app.get("/api/me", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let user = await storage.getUserByClerkId(userId);
      
      if (!user) {
        const clerkUser = await clerkClient.users.getUser(userId);
        const username = clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress?.split("@")[0] || `user_${Date.now()}`;
        
        user = await storage.createUser({
          clerkId: userId,
          username,
          displayName: clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim() : username,
          avatarUrl: clerkUser.imageUrl,
          onboardingComplete: false,
        });
      }

      const userTags = await storage.getUserTags(user.id);
      const followers = await storage.getFollowers(user.id);
      const following = await storage.getFollowing(user.id);
      res.json({ ...user, tags: userTags, followersCount: followers.length, followingCount: following.length });
    } catch (error: any) {
      console.error("Error in /api/me:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Update user profile
  app.patch("/api/me", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { displayName, bio, tagIds, onboardingComplete, city } = req.body;
      
      const updated = await storage.updateUser(user.id, {
        displayName: displayName !== undefined ? displayName : user.displayName,
        bio: bio !== undefined ? bio : user.bio,
        onboardingComplete: onboardingComplete !== undefined ? onboardingComplete : user.onboardingComplete,
        city: city !== undefined ? city : user.city,
      });

      if (tagIds && Array.isArray(tagIds)) {
        await storage.setUserTags(user.id, tagIds);
      }

      const userTags = await storage.getUserTags(user.id);
      res.json({ ...updated, tags: userTags });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Tags
  app.get("/api/tags", async (req: Request, res: Response) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tags", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;
      const tag = await storage.createTag({ name, description });
      res.json(tag);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Posts
  app.get("/api/posts", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getPosts();
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/feed", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const feedPosts = await storage.getFeedPosts(user.id);
      const userLikes = await storage.getUserLikes(user.id);
      const likedPostIds = new Set(userLikes.map((l: any) => l.postId));
      const postsWithLikeStatus = feedPosts.map((post: any) => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
      }));
      res.json(postsWithLikeStatus);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/posts", requireAuth(), upload.single("image"), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { content, communityId, tagIds } = req.body;
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const post = await storage.createPost({
        authorId: user.id,
        content,
        imageUrl,
        communityId: communityId || null,
      });

      if (tagIds) {
        const parsedTagIds = typeof tagIds === 'string' ? JSON.parse(tagIds) : tagIds;
        if (Array.isArray(parsedTagIds) && parsedTagIds.length > 0) {
          await storage.setPostTags(post.id, parsedTagIds);
        }
      }

      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/posts/:id", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const post = await storage.getPost(req.params.id);
      if (!post) return res.status(404).json({ message: "Post not found" });
      
      if (post.authorId !== user.id) {
        return res.status(403).json({ message: "You can only delete your own posts" });
      }

      await storage.deletePost(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Communities
  app.get("/api/communities", async (req: Request, res: Response) => {
    try {
      const allCommunities = await storage.getCommunities();

      let userTagIds: string[] = [];
      try {
        const { userId } = getAuth(req);
        if (userId) {
          const user = await storage.getUserByClerkId(userId);
          if (user) {
            const uTags = await storage.getUserTags(user.id);
            userTagIds = uTags.map((t: any) => t.id);
          }
        }
      } catch {}

      if (userTagIds.length === 0) {
        return res.json(allCommunities);
      }

      const communitiesWithOverlap = await Promise.all(
        allCommunities.map(async (community: any) => {
          const cTags = await storage.getCommunityTags(community.id);
          const cTagIds = cTags.map((t: any) => t.id);
          const overlapCount = cTagIds.filter((id: string) => userTagIds.includes(id)).length;
          return { ...community, tagOverlapCount: overlapCount };
        })
      );

      res.json(communitiesWithOverlap);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // This must come before /api/communities/:id to avoid matching "me" as an ID
  app.get("/api/communities/me", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const communities = await storage.getUserCommunities(user.id);
      res.json(communities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/communities/:id", async (req: Request, res: Response) => {
    try {
      const community = await storage.getCommunity(req.params.id);
      if (!community) return res.status(404).json({ message: "Community not found" });
      res.json(community);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/communities", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { name, description, tagIds } = req.body;

      if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
        return res.status(400).json({ message: "At least one tag is required" });
      }
      if (tagIds.length > 5) {
        return res.status(400).json({ message: "Communities can have a maximum of 5 tags" });
      }

      const community = await storage.createCommunity({
        name,
        description,
        creatorId: user.id,
      });

      await storage.setCommunityTags(community.id, tagIds);

      await storage.joinCommunity(user.id, community.id);
      
      // Return community with tags
      const communityTags = await storage.getCommunityTags(community.id);
      res.json({ ...community, tags: communityTags });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/communities/:id", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      await storage.deleteCommunity(req.params.id, user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/communities/:id/join", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      await storage.joinCommunity(user.id, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/communities/:id/leave", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      await storage.leaveCommunity(user.id, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Follow requests
  app.get("/api/follows/requests", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const requests = await storage.getFollowRequests(user.id);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/follows", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { followingId } = req.body;
      const follow = await storage.createFollow({
        followerId: user.id,
        followingId,
        status: "pending",
      });
      res.json(follow);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/follows/:id/accept", requireAuth(), async (req: Request, res: Response) => {
    try {
      await storage.acceptFollow(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/follows/:id/decline", requireAuth(), async (req: Request, res: Response) => {
    try {
      await storage.declineFollow(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Check follow status between current user and another user
  app.get("/api/follows/status/:userId", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const targetUserId = req.params.userId;
      const status = await storage.getFollowStatus(user.id, targetUserId);
      res.json({ status });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User search (must be before /api/users/:id to prevent "search" matching as an id)
  app.get("/api/users/search", requireAuth(), async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }
      const users = await storage.searchUsers(query);
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User profiles
  app.get("/api/users/:id", requireAuth(), async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      
      const userTags = await storage.getUserTags(user.id);
      const followers = await storage.getFollowers(user.id);
      const following = await storage.getFollowing(user.id);
      
      res.json({ 
        ...user, 
        tags: userTags,
        followersCount: followers.length,
        followingCount: following.length
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/users/:id/posts", requireAuth(), async (req: Request, res: Response) => {
    try {
      const userPosts = await storage.getPostsByUser(req.params.id);
      const user = await storage.getUser(req.params.id);
      
      const postsWithAuthor = userPosts.map(post => ({
        ...post,
        author: user
      }));
      
      res.json(postsWithAuthor);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Launches
  app.get("/api/launches", async (req: Request, res: Response) => {
    try {
      // Clean up old launches on each request
      await storage.deleteOldLaunches();
      const launches = await storage.getLaunches();
      res.json(launches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/launches/today", async (req: Request, res: Response) => {
    try {
      await storage.deleteOldLaunches();
      const launches = await storage.getTodaysLaunches();
      res.json(launches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/launches/yesterday", async (req: Request, res: Response) => {
    try {
      await storage.deleteOldLaunches();
      const launches = await storage.getYesterdaysTopLaunches();
      res.json(launches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/launches/recommended", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const recommended = await storage.getRecommendedLaunches(user.id);
      res.json(recommended);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/launches", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { name, tagline, description, websiteUrl, tagIds, logoUrl, productImageUrl } = req.body;
      
      if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
        return res.status(400).json({ message: "At least one tag is required" });
      }
      
      if (!websiteUrl || !websiteUrl.trim()) {
        return res.status(400).json({ message: "Website link is required" });
      }

      const launch = await storage.createLaunch({
        creatorId: user.id,
        name,
        tagline,
        description,
        websiteUrl,
        logoUrl: logoUrl || null,
        productImageUrl: productImageUrl || null,
      });

      // Set the tags for the launch
      await storage.setLaunchTags(launch.id, tagIds);
      
      res.json(launch);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Launch upvote
  app.post("/api/launches/:id/upvote", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const result = await storage.upvoteLaunch(req.params.id, user.id);
      if (result.alreadyUpvoted) {
        return res.status(400).json({ message: "You have already upvoted this launch", alreadyUpvoted: true });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Check if user has upvoted a launch
  app.get("/api/launches/:id/upvote-status", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const hasUpvoted = await storage.hasUserUpvoted(req.params.id, user.id);
      res.json({ hasUpvoted });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete launch
  app.delete("/api/launches/:id", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      await storage.deleteLaunch(req.params.id, user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Launch comments
  app.get("/api/launches/:id/comments", async (req: Request, res: Response) => {
    try {
      const comments = await storage.getLaunchComments(req.params.id);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/launches/:id/comments", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { content } = req.body;
      const comment = await storage.addLaunchComment(req.params.id, user.id, content);

      // Get launch owner
      const launch = await storage.getLaunch(req.params.id);

      if (launch && launch.authorId !== user.id) {
      await storage.createNotification({
      recipientId: launch.authorId,
      actorId: user.id,
      type: "comment",
      entityId: launch.id,
    });
  }

      res.json(comment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Post interactions
  app.post("/api/posts/:id/like", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      await storage.likePost(req.params.id, user.id);

      console.log("LIKE ROUTE HIT");

  // Get the post
  const post = await storage.getPost(req.params.id);
    if (post && post.authorId !== user.id) {
    await storage.createNotification({
    recipientId: post.authorId,
    actorId: user.id,
    type: "like",
    entityId: post.id,
   });
 }


      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/posts/:id/unlike", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      await storage.unlikePost(req.params.id, user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/posts/:id/repost", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      await storage.repostPost(req.params.id, user.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Post comments
  app.get("/api/posts/:id/comments", async (req: Request, res: Response) => {
    try {
      const comments = await storage.getPostComments(req.params.id);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/posts/:id/comments", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { content } = req.body;
      const comment = await storage.addPostComment(req.params.id, user.id, content);

   // Get the post to know who owns it
    const post = await storage.getPost(req.params.id);
 
    if (post && post.authorId !== user.id) {
     await storage.createNotification({
     recipientId: post.authorId,
     actorId: user.id,
     type: "comment",
     entityId: post.id,
   });
 }

     res.json(comment);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User activity
  app.get("/api/me/activity", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const activity = await storage.getUserActivity(user.id);
      res.json(activity);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Seed tags if none exist
  app.post("/api/seed-tags", async (req: Request, res: Response) => {
    try {
      const existingTags = await storage.getTags();
      if (existingTags.length > 0) {
        return res.json({ message: "Tags already exist", count: existingTags.length });
      }

      const defaultTags = [
        { name: "AI", description: "Artificial Intelligence" },
        { name: "Fintech", description: "Financial Technology" },
        { name: "SaaS", description: "Software as a Service" },
        { name: "E-commerce", description: "Online Retail" },
        { name: "Healthcare", description: "Health Technology" },
        { name: "EdTech", description: "Education Technology" },
        { name: "Gaming", description: "Video Games" },
        { name: "Social Media", description: "Social Networking" },
        { name: "Productivity", description: "Work & Productivity Tools" },
        { name: "Developer Tools", description: "Software Development" },
        { name: "Marketing", description: "Marketing & Growth" },
        { name: "Design", description: "Design & Creative" },
        { name: "Crypto", description: "Cryptocurrency & Blockchain" },
        { name: "Mobile", description: "Mobile Applications" },
        { name: "Analytics", description: "Data & Analytics" },
        { name: "Security", description: "Cybersecurity" },
        { name: "IoT", description: "Internet of Things" },
        { name: "AR/VR", description: "Augmented & Virtual Reality" },
        { name: "Climate", description: "Climate & Sustainability" },
        { name: "Hardware", description: "Physical Products" },
        { name: "Founder", description: "Startup Founders" },
        { name: "Engineer", description: "Software Engineers" },
        { name: "Designer", description: "Product Designers" },
        { name: "Marketer", description: "Growth & Marketing" },
        { name: "Product Manager", description: "Product Management" },
        { name: "Investor", description: "VCs & Angels" },
        { name: "Data Science", description: "Data Scientists" },
        { name: "DevOps", description: "DevOps Engineers" },
        { name: "Sales", description: "Sales & BD" },
        { name: "HR", description: "Human Resources" },
        { name: "Legal", description: "Legal & Compliance" },
        { name: "Finance", description: "Finance & Accounting" },
        { name: "Remote Work", description: "Remote-First Teams" },
        { name: "Startups", description: "Early Stage Companies" },
        { name: "Enterprise", description: "Enterprise Solutions" },
        { name: "B2B", description: "Business to Business" },
        { name: "B2C", description: "Business to Consumer" },
        { name: "Marketplace", description: "Marketplace Platforms" },
        { name: "API", description: "API Products" },
        { name: "Open Source", description: "Open Source Projects" },
      ];

      for (const tag of defaultTags) {
        await storage.createTag(tag);
      }

      res.json({ message: "Tags seeded successfully", count: defaultTags.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // User activity by ID (for viewing other user profiles)
  app.get("/api/users/:id/activity", requireAuth(), async (req: Request, res: Response) => {
    try {
      const activity = await storage.getUserActivityById(req.params.id);
      res.json(activity);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Messaging endpoints
  app.get("/api/conversations", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const conversations = await storage.getConversations(user.id);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/conversations", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { participantId } = req.body;
      if (!participantId) return res.status(400).json({ message: "Participant ID required" });

      const conversation = await storage.getOrCreateConversation(user.id, participantId);
      res.json(conversation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/conversations/:id", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const isParticipant = await storage.isConversationParticipant(req.params.id, user.id);
      if (!isParticipant) return res.status(403).json({ message: "Access denied" });

      const messages = await storage.getConversationMessages(req.params.id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/conversations/:id/messages", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const isParticipant = await storage.isConversationParticipant(req.params.id, user.id);
      if (!isParticipant) return res.status(403).json({ message: "Access denied" });

      const { content } = req.body;
      if (!content) return res.status(400).json({ message: "Content required" });

      const conv = await storage.getConversation(req.params.id);
      if (conv) {
        const otherUserId = conv.participant1Id === user.id ? conv.participant2Id : conv.participant1Id;
        const followStatus1 = await storage.getFollowStatus(user.id, otherUserId);
        const followStatus2 = await storage.getFollowStatus(otherUserId, user.id);
        const areFriends = followStatus1 === "accepted" || followStatus2 === "accepted";

        if (!areFriends) {
          return res.status(403).json({ message: "You can only message users after your connection request is accepted." });
        }
      }

      const conversationId = req.params.id;

const message = await storage.sendMessage(conversationId, user.id, content);

// Get conversation
const conversation = await storage.getConversationById(conversationId);

// Determine recipient
const recipientId =
  conversation.participant1Id === user.id
    ? conversation.participant2Id
    : conversation.participant1Id;

if (recipientId !== user.id) {
  await storage.createNotification({
    recipientId,
    actorId: user.id,
    type: "message",
    entityId: conversationId,
  });
}

res.json(message);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Community threads endpoints
  app.get("/api/communities/:id/threads", requireAuth(), async (req: Request, res: Response) => {
    try {
      const threads = await storage.getCommunityThreads(req.params.id);
      res.json(threads);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/communities/:id/threads", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { title, content } = req.body;
      if (!title || !content) return res.status(400).json({ message: "Title and content required" });

      const thread = await storage.createThread(req.params.id, user.id, title, content);
      res.json(thread);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Thread detail endpoints
  app.get("/api/threads/:id", requireAuth(), async (req: Request, res: Response) => {
    try {
      const thread = await storage.getThread(req.params.id);
      if (!thread) return res.status(404).json({ message: "Thread not found" });
      res.json(thread);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/threads/:id/comments", requireAuth(), async (req: Request, res: Response) => {
    try {
      const comments = await storage.getThreadComments(req.params.id);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/threads/:id/comments", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { content } = req.body;
      if (!content) return res.status(400).json({ message: "Content required" });

      const comment = await storage.addThreadComment(req.params.id, user.id, content);
      const author = await storage.getUser(user.id);
      res.json({ ...comment, author });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Broadcast endpoint - sends messages as DMs to matching recipients
  app.post("/api/broadcasts", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUserByClerkId(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { content, tags, city } = req.body;
      if (!content) return res.status(400).json({ message: "Content required" });
      if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return res.status(400).json({ message: "At least one tag is required" });
      }

      const result = await storage.sendBroadcast(user.id, content, tags, city);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const ADMIN_EMAIL = "prayagbiju78@gmail.com";

  app.get("/api/blog", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getBlogPosts();
      res.json(Array.isArray(posts) ? posts : []);
    } catch (error: any) {
      console.error("Blog API error:", error);
      res.json([]);
    }
  });

  app.get("/api/blog/check-admin", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const clerkUser = await clerkClient.users.getUser(userId);
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;
      res.json({ isAdmin: email === ADMIN_EMAIL });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/blog/:slug", async (req: Request, res: Response) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post) return res.status(404).json({ message: "Blog post not found" });
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/blog", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const clerkUser = await clerkClient.users.getUser(userId);
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;
      if (email !== ADMIN_EMAIL) {
        return res.status(403).json({ message: "Only the admin can create blog posts" });
      }

      let user = await storage.getUserByClerkId(userId);
      if (!user) {
        const firstName = clerkUser.firstName || "";
        const lastName = clerkUser.lastName || "";
        const displayName = `${firstName} ${lastName}`.trim() || email?.split("@")[0] || "Admin";
        const username = clerkUser.username || email?.split("@")[0] || `user_${Date.now()}`;
        user = await storage.createUser({
          clerkId: userId,
          displayName,
          username,
          onboardingComplete: true,
        });
      }

      const { title, content, excerpt, coverImageUrl } = req.body;
      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        + "-" + Date.now().toString(36);

      const post = await storage.createBlogPost({
        authorId: user.id,
        title,
        slug,
        content,
        excerpt: excerpt || content.substring(0, 200),
        coverImageUrl: coverImageUrl || null,
        published: true,
      });

      res.json(post);
    } catch (error: any) {
      console.error("Blog create error:", error);
      res.status(500).json({ message: "Failed to create blog post: " + error.message });
    }
  });

  app.delete("/api/blog/:id", requireAuth(), async (req: Request, res: Response) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const clerkUser = await clerkClient.users.getUser(userId);
      const email = clerkUser.emailAddresses?.[0]?.emailAddress;
      if (email !== ADMIN_EMAIL) {
        return res.status(403).json({ message: "Only the admin can delete blog posts" });
      }

      await storage.deleteBlogPost(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
