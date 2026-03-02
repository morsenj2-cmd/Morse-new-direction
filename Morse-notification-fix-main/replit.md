# Morse - Tag-Based Professional Networking Platform

## Overview

Morse is a tag-based professional networking platform targeting founders, startup teams, and professionals in India. It's positioned as a LinkedIn alternative where tags are the foundational data structure driving all discovery, feeds, and recommendations. Users select tags during onboarding, and these tags power content ranking, user discovery, community suggestions, and broadcast targeting. The platform includes social features like posts, communities with threaded discussions, direct messaging, product launches (Product Hunt-style), and broadcasts.

The app follows a monorepo structure with a React frontend (`client/`), Express backend (`server/`), and shared schema (`shared/`). The project name in code is "rest-express" but the product is branded as "Morse" with the logo ".--." (morse code) in Arimo font.

## User Preferences

Preferred communication style: Simple, everyday language.

- **Logo**: ".--." in Arimo font (morse code representation)
- **Theme**: Dark theme (black/dark gray backgrounds) with purple 3D spiral decorative element on public pages
- **Fonts**: DM Sans for headings, Arimo for logo
- **Tags are sacred**: Tags are the core system — every entity (users, posts, communities, broadcasts, launches) MUST have tags. Tags are never visible to other users and never block access; they only influence ranking and relevance. If anything can exist without tags, that is considered a bug.
- **Exactly 5 tags** required during user onboarding (min/max 5)
- **Max 3 tags** for posts, launches, and broadcasts (mandatory)
- **Tag deduplication**: Client-side dedup using useMemo ensures no repeated tags shown
- **India-focused**: Cities list is Indian cities, SEO targets Indian audience
- **Search**: Users can be discovered by name, username, OR tags
- **Messaging limit**: Users cannot message other users until their connection request is accepted, unlimited after
- **Post content policy**: Warning shown in post creation dialog - posts are only for experiences/journeys, not personal branding or memes
- **Feed ranking**: Posts ranked by tag relevance (matching tags with viewer), then recency
- **Broadcast targeting**: Requires min 3 matching tags AND matching city (both mandatory)

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with HMR (uses `@replit/vite-plugin-runtime-error-modal`, cartographer, and dev-banner plugins in development)
- **Routing**: Wouter (lightweight router, not React Router)
- **Styling**: Tailwind CSS with CSS variables for theming (HSL color system via shadcn)
- **UI Components**: shadcn/ui (New York style variant) built on Radix UI primitives
- **State Management**: TanStack React Query for all server state; no Redux or other client state library
- **Authentication UI**: Clerk React SDK (`@clerk/clerk-react`) — uses `SignedIn`, `SignedOut`, `RedirectToSignIn` components for route protection
- **File Uploads**: Uppy with AWS S3 presigned URL flow and Replit Object Storage integration
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript, compiled with `tsx` for dev and `esbuild` for production
- **Module System**: ESM (`"type": "module"`)
- **Authentication**: Clerk Express SDK (`@clerk/express`) — uses `clerkMiddleware()`, `requireAuth()`, and `getAuth()` 
- **File Upload**: Multer for local disk uploads (to `client/public/uploads/`), plus Replit Object Storage integration via Google Cloud Storage client for presigned URL uploads
- **API Pattern**: REST API under `/api/` prefix, all routes registered in `server/routes.ts`
- **Static Files**: Uploaded files served from `/uploads` path; Vite dev server middleware in development, static file serving in production from `dist/public`

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Driver**: `pg` (node-postgres) Pool, also has `@neondatabase/serverless` as a dependency
- **Schema Location**: `shared/schema.ts` — shared between frontend and backend
- **Migrations**: Drizzle Kit with `drizzle-kit push` command (no migration files approach)
- **Validation**: Zod schemas generated from Drizzle schemas via `drizzle-zod`
- **Key Tables**:
  - `users` — linked to Clerk via `clerkId`, includes `city`, `onboardingComplete`
  - `tags` — core tag definitions
  - `user_tags` — many-to-many user↔tag relationship
  - `posts` — user posts with optional images
  - `post_tags` — many-to-many post↔tag
  - `communities` — user-created communities
  - `community_tags` — many-to-many community↔tag
  - `community_members` — membership tracking
  - `follows` — follow/connection system
  - `likes`, `comments` — post engagement
  - `launches`, `launch_tags`, `launch_upvotes` — Product Hunt-style launches
  - `conversations`, `messages` — direct messaging
  - `threads`, `thread_comments` — community discussion threads
  - `broadcasts`, `broadcast_tags`, `broadcast_recipients` — targeted broadcasts
  - `blog_posts` — admin-only blog posts for SEO (restricted to prayagbiju78@gmail.com)

### Tag-Driven Logic (Critical Design Principle)
Tags are not a feature — they are the underlying graph of the platform:
- Every user, post, community, broadcast, launch, and recommendation must reference tags
- Feeds rank content higher when tag overlap with the viewer is higher (no hard filtering)
- Search prioritizes tag relevance over text matching
- Broadcasts target recipients based on tag and city overlap
- Tags are mandatory system metadata, never visible to other users

### Key Pages
- `/` — Landing page (public, dark theme with spiral)
- `/about`, `/pricing` — Public info pages
- `/blog` — Blog listing (public); admin (prayagbiju78@gmail.com) can create/delete posts
- `/blog/:slug` — Individual blog post detail page (public)
- `/onboarding/tags` — Tag selection (min 20) + city selection during onboarding
- `/dashboard` — Main feed with post creation, search, sidebar with communities/launches/follow requests
- `/broadcast` — Send targeted broadcasts by tags and city
- `/messages` — Direct messaging with conversation list
- `/launches` — Product Hunt-style launch listings (today's, yesterday's, recommended)
- `/launches/:id` — Launch detail page
- `/communities` — Browse and create communities
- `/communities/:id` — Community detail with threads
- `/communities/:id/threads/:id` — Thread detail with comments
- `/profile` — Current user profile with posts and activity
- `/user/:id` — Other user profiles with follow/message actions
- `/search` — Search results page

## External Dependencies

### Authentication
- **Clerk**: Full authentication provider. Frontend uses `@clerk/clerk-react`, backend uses `@clerk/express`. Requires `VITE_CLERK_PUBLISHABLE_KEY` (frontend) and `CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY` (backend) environment variables.

### Database
- **PostgreSQL**: Primary database. Requires `DATABASE_URL` environment variable. Uses Drizzle ORM for schema management and queries.

### File Storage
- **Replit Object Storage**: Uses Google Cloud Storage client (`@google-cloud/storage`) connecting to Replit's sidecar endpoint at `http://127.0.0.1:1106` for presigned URL uploads. Controlled by `PUBLIC_OBJECT_SEARCH_PATHS` env var.
- **Local Disk Storage**: Multer-based fallback storing files in `client/public/uploads/`

### Frontend Libraries
- **Uppy** (`@uppy/core`, `@uppy/dashboard`, `@uppy/react`, `@uppy/aws-s3`): File upload UI and S3-compatible upload handling
- **TanStack React Query**: Server state caching and synchronization
- **Radix UI**: Full suite of accessible UI primitives (dialog, dropdown, tabs, toast, etc.)
- **date-fns**: Date formatting
- **embla-carousel-react**: Carousel component
- **recharts**: Chart components
- **cmdk**: Command palette component
- **react-day-picker**: Calendar/date picker

### Build Tools
- **Vite**: Frontend bundler with React plugin
- **esbuild**: Backend bundler for production
- **tsx**: TypeScript execution for development
- **cross-env**: Cross-platform environment variable setting
- **PostCSS + Autoprefixer**: CSS processing for Tailwind

### Analytics
- **Google Analytics**: Tracking ID `G-DSQ2MHXGSS` (referenced in SEO setup)

### Domain
- Production URL: `https://morse.co.in/`