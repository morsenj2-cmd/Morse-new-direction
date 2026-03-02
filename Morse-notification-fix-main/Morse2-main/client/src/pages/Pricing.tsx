import { Header } from "@/components/Header";
import { PublicHeader } from "@/components/PublicHeader";
import { ClerkGuard } from "@/components/ErrorBoundary";

export const Pricing = (): JSX.Element => {
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
              alt="Decorative purple spiral"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="relative z-10 text-center">
          <h1 className="text-white text-5xl md:text-6xl font-bold italic" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Coming soon
          </h1>
        </div>
      </main>
    </div>
  );
};
