import { Header } from "@/components/Header";
import { PublicHeader } from "@/components/PublicHeader";
import { BottomNav } from "@/components/BottomNav";
import { ClerkGuard } from "@/components/ErrorBoundary";
import { useBlogPost } from "@/lib/api";
import { useRoute, Link } from "wouter";
import { useUser } from "@clerk/clerk-react";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { format } from "date-fns";

function AuthAwareHeader() {
  const { isSignedIn } = useUser();
  if (isSignedIn) return null;
  return <Header />;
}

function AdminNav() {
  const { isSignedIn, user } = useUser();
  const isAdmin = user?.primaryEmailAddress?.emailAddress === "prayagbiju78@gmail.com";
  if (!isSignedIn || !isAdmin) return null;
  return <BottomNav activePage="/blog" />;
}

export const BlogDetailPage = (): JSX.Element => {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug || "";
  const { data: post, isLoading } = useBlogPost(slug);

  return (
    <div className="bg-black w-full min-h-screen flex flex-col pb-20">
      <ClerkGuard fallback={<PublicHeader />}>
        <AuthAwareHeader />
      </ClerkGuard>

      <main className="flex-1 relative px-4 sm:px-8 py-8 sm:py-12">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
          <div className="w-[400px] h-[400px] -ml-20">
            <img
              src="/figmaAssets/spiral.png"
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <Link href="/blog">
            <span
              className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 mb-8 transition-all duration-300 text-sm px-4 py-2 rounded-xl cursor-pointer"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </span>
          </Link>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full"></div>
            </div>
          ) : !post || post.message ? (
            <div className="text-center py-20">
              <div
                className="inline-block px-8 py-6 rounded-3xl"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <p className="text-white/50 text-lg">Blog post not found.</p>
              </div>
            </div>
          ) : (
            <article
              className="rounded-3xl p-6 sm:p-10"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              {post.coverImageUrl && (
                <div className="mb-8 rounded-2xl overflow-hidden">
                  <img src={post.coverImageUrl} alt={post.title} className="w-full h-auto object-cover max-h-96" />
                </div>
              )}

              <h1 className="text-white text-3xl sm:text-4xl font-bold mb-6 leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {post.title}
              </h1>

              <div
                className="flex items-center gap-4 text-white/30 text-sm mb-8 pb-6"
                style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}
              >
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {post.author?.displayName || post.author?.username || "Admin"}
                </span>
                {post.createdAt && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(post.createdAt), "MMMM d, yyyy")}
                  </span>
                )}
              </div>

              <div className="text-white/70 text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                {post.content}
              </div>
            </article>
          )}
        </div>
      </main>
      <ClerkGuard>
        <AdminNav />
      </ClerkGuard>
    </div>
  );
};
