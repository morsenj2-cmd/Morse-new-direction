import { Header } from "@/components/Header";
import { PublicHeader } from "@/components/PublicHeader";
import { ClerkGuard } from "@/components/ErrorBoundary";

export const Desktop = (): JSX.Element => {
  return (
    <div className="bg-black w-full min-h-screen flex flex-col">
      <ClerkGuard fallback={<PublicHeader />}>
        <Header />
      </ClerkGuard>

      <main className="flex-1 flex items-center justify-center relative px-8">
        {/* Purple spiral decorative image */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[450px] h-[450px] relative">
            <img
              src="/figmaAssets/spiral.png"
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="relative z-10 text-center max-w-4xl">
          <h1
            className="text-white text-5xl md:text-6xl font-bold leading-tight tracking-wide"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Grow your career and reach new heights with Morse
          </h1>

          <p className="mt-5 text-white/80 text-lg md:text-xl max-w-2xl mx-auto">
            Morse is a professional networking platform to find jobs, build connections, and grow your career in India.
            Discover people and communities using interests and tags.
          </p>

          <div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-3 text-white/85">
            <span className="px-4 py-2 rounded-full border border-white/15">
              Find jobs & opportunities
            </span>
            <span className="px-4 py-2 rounded-full border border-white/15">
              Meet professionals in your field
            </span>
            <span className="px-4 py-2 rounded-full border border-white/15">
              Join communities that match you
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};

