import { Header } from "@/components/Header";
import { PublicHeader } from "@/components/PublicHeader";
import { ClerkGuard } from "@/components/ErrorBoundary";

export const AboutUs = (): JSX.Element => {
  return (
    <div className="bg-black w-full min-h-screen flex flex-col">
      <ClerkGuard fallback={<PublicHeader />}>
        <Header />
      </ClerkGuard>

      <main className="flex-1 relative px-8 py-12">
        {/* Purple spiral positioned to the left */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-80">
          <div className="w-[400px] h-[400px] -ml-20">
            <img
              src="/figmaAssets/spiral.png"
              alt="Decorative purple spiral"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="text-white text-5xl font-bold mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            About us
          </h1>
          
          <div className="text-white text-base leading-relaxed space-y-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <p>
              Seeking jobs and building Startups already take all your energy. Networking shouldn't waste what's left. We built this platform for founders and startup teams who want a focused place to meet the right people, join the right communities, and share real startup updates—without memes, noise, or endless scrolling.
            </p>
            <p>
              Everything runs on tags. You pick your tags at signup, and they power your experience: which communities you get invited to, who you discover, and how search works. Communities are like startup "subs", you can create one by naming it and adding tags, and it'll be recommended to people who actually care about that topic (though you can still join any community you want).
            </p>
            <p>
              You can view unlimited profiles, send connection requests, and once both sides accept, you can message and create group chats (invite-only). When you need to reach more people, broadcasts let you send a message to a targeted audience using private tags, so it stays relevant and doesn't turn into spam.
            </p>
            <p>
              You can also launch your startup here—Product Hunt style, get feedback, attention, and early supporters from people building too.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
