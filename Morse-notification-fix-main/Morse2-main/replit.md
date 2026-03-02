# Morse - Tag-Based Social Media Platform

## Overview

Morse is a fully functional tag-based social media platform for founders and startup teams. The application features user authentication via Clerk, a tag-based discovery system, communities, post creation with image uploads, and a Product Hunt-style startup launch feature.

## User Preferences

Preferred communication style: Simple, everyday language.
- Logo: ".--." in Arimo font (morse code representation)
- Theme: Dark theme with purple 3D spiral decorative element
- Fonts: DM Sans for headings, Arimo for logo

## Recent Changes

- **2026-01-14**: Implemented comprehensive SEO optimization
  - Meta tags with target keywords (jobs in india, product hunt, startup traction, etc.)
  - Open Graph and Twitter Card meta tags for social sharing
  - JSON-LD structured data (WebSite, Organization, SoftwareApplication, FAQPage)
  - Geo tags for India-specific targeting
  - robots.txt and sitemap.xml files
  - SEO-rich landing page with keyword-focused content
  - Google Analytics integration (G-DSQ2MHXGSS)

- **2026-01-14**: Implemented comprehensive mobile responsiveness
  - All pages use Tailwind responsive breakpoints (sm: 640px, md: 768px, lg: 1024px)
  - Sidebars hidden on mobile (lg:block pattern)
  - Responsive navigation footers with horizontal scrolling
  - Responsive grids (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
  - Mobile-specific UI patterns (floating action buttons, back buttons)
  - Responsive dialogs/modals (max-w-[calc(100vw-2rem)])
  - MessagesPage: Collapsible conversation list with back navigation on mobile

- **2024-01-11**: Implemented full social media functionality
  - Database schema with users, tags, posts, communities, follows, likes, comments, launches
  - Clerk authentication integration
  - API endpoints for all social features
  - Dashboard with proper empty states when no data exists
  - Post creation with optional image upload
  - Real-time feed from database

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with hot module replacement
- **Routing**: Wouter (lightweight React router)
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui component library (New York style variant) built on Radix UI primitives
- **State Management**: TanStack React Query for server state
- **Authentication**: Clerk React SDK

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with tsx for development
- **Build**: esbuild for production bundling
- **API Pattern**: RESTful endpoints prefixed with `/api`
- **Authentication**: Clerk Express middleware
- **File Uploads**: Multer for image uploads

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` - shared between frontend and backend
- **Validation**: Zod schemas generated from Drizzle schemas via drizzle-zod
- **Database**: PostgreSQL

### Database Schema
- **users**: User profiles linked to Clerk IDs
- **tags**: Tag-based discovery system
- **user_tags**: User-selected tags for personalization
- **posts**: User-generated content with optional images
- **post_tags**: Tags applied to posts
- **communities**: Tag-based community groups
- **community_tags**: Tags applied to communities
- **community_members**: Community membership
- **follows**: Follow relationships with pending/accepted status
- **likes**: Post likes
- **comments**: Post comments
- **launches**: Product Hunt-style startup launches

### Project Structure
```
├── client/           # React frontend application
│   ├── src/
│   │   ├── components/   # UI components including Header
│   │   ├── lib/          # API hooks and utilities
│   │   └── pages/        # Page components (Desktop, Dashboard, AboutUs, etc.)
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database storage implementation
│   └── db.ts         # Database connection
├── shared/           # Shared code between client/server
│   └── schema.ts     # Database schema and types
```

### API Endpoints
- `GET/PATCH /api/me` - Current user profile
- `GET/POST /api/tags` - Tag management
- `GET/POST/DELETE /api/posts` - Post CRUD
- `GET /api/feed` - User feed
- `GET/POST /api/communities` - Community management
- `GET/POST /api/follows` - Follow system
- `GET/POST /api/launches` - Startup launches

### Development Workflow
- **Dev Server**: Single command (`npm run dev`) runs both frontend and backend
- **Type Checking**: Strict TypeScript with path aliases
- **Database Sync**: `npm run db:push` to push schema changes to database

## Environment Variables

### Required Secrets
- `CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `DATABASE_URL` - PostgreSQL connection string
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk key for frontend
