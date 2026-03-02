import { Link, useParams } from "wouter";
import { useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Rocket, Wrench, Briefcase, MessageSquare } from "lucide-react";
import { useCommunities, useCommunityThreads, useLaunches, useTags } from "@/lib/api";

const normalize = (value: string) => value.toLowerCase().trim();

export const HubPage = (): JSX.Element => {
  const params = useParams<{ tagName: string }>();
  const [discussionOpen, setDiscussionOpen] = useState(false);

  const tagName = normalize(params.tagName || "");
  const { data: tags = [] } = useTags();
  const { data: communities = [] } = useCommunities();
  const { data: launches = [] } = useLaunches();

  const primaryTag = tags.find((tag: any) => normalize(tag.name) === tagName);

  const mappedCommunity = useMemo(() => {
    if (!primaryTag) return undefined;
    return communities.find((community: any) =>
      Array.isArray(community.tags) && community.tags.some((tag: any) => tag.id === primaryTag.id)
    );
  }, [communities, primaryTag]);

  const { data: threads = [], isLoading: threadsLoading } = useCommunityThreads(mappedCommunity?.id || "");

  const tagFilteredLaunches = useMemo(() => {
    if (!primaryTag) return launches;
    return launches.filter((launch: any) =>
      Array.isArray(launch.tags) && launch.tags.some((tag: any) => tag.id === primaryTag.id)
    );
  }, [launches, primaryTag]);

  const relevantOpportunities = tagFilteredLaunches.slice(0, 6);
  const recentLaunches = [...tagFilteredLaunches]
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 6);
  const topToolsRepos = tagFilteredLaunches
    .filter((launch: any) => String(launch.websiteUrl || "").includes("github.com"))
    .slice(0, 6);

  const fallbackLaunches = launches.slice(0, 6);

  return (
    <div className="bg-[#1a1a1a] w-full min-h-screen flex flex-col">
      <header className="w-full px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between border-b border-gray-800">
        <Link href="/dashboard">
          <div className="text-white text-3xl sm:text-4xl font-bold cursor-pointer" style={{ fontFamily: "'Arimo', sans-serif" }}>
            .--.
          </div>
        </Link>
      </header>

      <div className="flex-1 p-4 sm:p-8 pb-20">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-[#2a2a2a] border border-gray-700 rounded-lg p-5">
            <h1 className="text-white text-2xl font-semibold">Knowledge Hub: {primaryTag?.name || params.tagName}</h1>
            <p className="text-gray-400 mt-2">Data-driven insights for the {primaryTag?.name || params.tagName} domain.</p>
          </div>

          <section className="bg-[#2a2a2a] border border-gray-700 rounded-lg p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Relevant Opportunities</h2>
            <div className="space-y-3">
              {(relevantOpportunities.length > 0 ? relevantOpportunities : fallbackLaunches).map((item: any) => (
                <Link key={`opp-${item.id}`} href={`/launches/${item.id}`}>
                  <div className="p-3 rounded border border-gray-700 hover:border-gray-500 cursor-pointer">
                    <p className="text-white">{item.name}</p>
                    <p className="text-gray-400 text-sm">{item.tagline}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="bg-[#2a2a2a] border border-gray-700 rounded-lg p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Wrench className="w-4 h-4" /> Top Tools / Repos</h2>
            <div className="space-y-3">
              {(topToolsRepos.length > 0 ? topToolsRepos : fallbackLaunches.filter((i: any) => String(i.websiteUrl || "").includes("github.com"))).slice(0, 6).map((item: any) => (
                <a key={`tool-${item.id}`} href={item.websiteUrl || "#"} target="_blank" rel="noreferrer" className="block p-3 rounded border border-gray-700 hover:border-gray-500">
                  <p className="text-white">{item.name}</p>
                  <p className="text-gray-400 text-sm">{item.websiteUrl || "No repository link"}</p>
                </a>
              ))}
            </div>
          </section>

          <section className="bg-[#2a2a2a] border border-gray-700 rounded-lg p-5">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Rocket className="w-4 h-4" /> Recent Launches</h2>
            <div className="space-y-3">
              {(recentLaunches.length > 0 ? recentLaunches : fallbackLaunches).map((item: any) => (
                <Link key={`recent-${item.id}`} href={`/launches/${item.id}`}>
                  <div className="p-3 rounded border border-gray-700 hover:border-gray-500 cursor-pointer">
                    <p className="text-white">{item.name}</p>
                    <p className="text-gray-400 text-sm">{item.tagline}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="bg-[#2a2a2a] border border-gray-700 rounded-lg p-5">
            <button className="w-full flex items-center justify-between text-left" onClick={() => setDiscussionOpen((v) => !v)}>
              <span className="text-white font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Discussion (optional)</span>
              {discussionOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>

            {discussionOpen && (
              <div className="mt-4 space-y-3">
                {threadsLoading ? (
                  <p className="text-gray-400 text-sm">Loading discussions...</p>
                ) : threads.length > 0 ? (
                  threads.slice(0, 6).map((thread: any) => (
                    <Link key={thread.id} href={`/threads/${thread.id}`}>
                      <div className="p-3 rounded border border-gray-700 hover:border-gray-500 cursor-pointer">
                        <p className="text-white">{thread.title}</p>
                        <p className="text-gray-400 text-sm line-clamp-2">{thread.content}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">No discussion yet for this hub.</p>
                )}
              </div>
            )}
          </section>

          <div>
            <Link href="/communities">
              <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700">Explore all communities</Button>
            </Link>
          </div>
        </div>
      </div>

      <BottomNav activePage="/communities" />
    </div>
  );
};
