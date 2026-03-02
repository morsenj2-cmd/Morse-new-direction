import { Link } from "wouter";
import { Rocket, ChevronUp, Plus, X } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useTodaysLaunches, useYesterdaysLaunches, useRecommendedLaunches, useCreateLaunch, useTags } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export const LaunchesPage = (): JSX.Element => {
  const [isLaunchDialogOpen, setIsLaunchDialogOpen] = useState(false);
  const [launchForm, setLaunchForm] = useState({
    name: "",
    tagline: "",
    description: "",
    websiteUrl: "",
  });
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  
  const { data: todaysLaunches = [], isLoading } = useTodaysLaunches();
  const { data: yesterdaysLaunches = [] } = useYesterdaysLaunches();
  const { data: recommendedLaunches = [] } = useRecommendedLaunches();
  const { data: allTags = [] } = useTags();
  const createLaunch = useCreateLaunch();

  const filteredTags = allTags.filter((tag: any) => 
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase()) &&
    !selectedTagIds.includes(tag.id)
  );

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) return prev.filter(id => id !== tagId);
      if (prev.length >= 3) return prev;
      return [...prev, tagId];
    });
  };

  const handleCreateLaunch = async () => {
    if (!launchForm.name || !launchForm.tagline || selectedTagIds.length === 0) return;
    
    await createLaunch.mutateAsync({
      name: launchForm.name,
      tagline: launchForm.tagline,
      description: launchForm.description,
      websiteUrl: launchForm.websiteUrl,
      logo: logoFile || undefined,
      productImage: productImageFile || undefined,
      tagIds: selectedTagIds,
    });
    
    setLaunchForm({ name: "", tagline: "", description: "", websiteUrl: "" });
    setSelectedTagIds([]);
    setTagSearchQuery("");
    setLogoFile(null);
    setProductImageFile(null);
    setIsLaunchDialogOpen(false);
  };

  const LaunchCard = ({ launch, showUpvotes = false }: { launch: any; showUpvotes?: boolean }) => (
    <Link href={`/launches/${launch.id}`}>
      <div className="flex items-center gap-3 p-3 bg-[#2a2a2a] rounded-lg border border-gray-700 hover:border-gray-500 cursor-pointer transition-colors" data-testid={`card-launch-${launch.id}`}>
        <div className="w-12 h-12 rounded-lg bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
          {launch.logoUrl ? (
            <img src={launch.logoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Rocket className="w-6 h-6 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold truncate" data-testid={`text-launch-name-${launch.id}`}>{launch.name}</p>
          <p className="text-gray-400 text-sm truncate">{launch.tagline}</p>
        </div>
        {showUpvotes && (
          <div className="flex flex-col items-center text-gray-400 border border-gray-600 rounded px-2 py-1">
            <ChevronUp className="w-4 h-4" />
            <span className="text-sm" data-testid={`text-upvotes-${launch.id}`}>{launch.upvotesCount ?? 0}</span>
          </div>
        )}
      </div>
    </Link>
  );

  return (
    <div className="bg-[#1a1a1a] w-full min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-2 border-b border-gray-800">
        <Link href="/dashboard">
          <div className="text-white text-3xl sm:text-4xl font-bold cursor-pointer" data-testid="link-logo" style={{ fontFamily: "'Arimo', sans-serif" }}>
            .--.
          </div>
        </Link>

        <div className="flex-1 max-w-md mx-2 sm:mx-8"></div>

        <Dialog open={isLaunchDialogOpen} onOpenChange={setIsLaunchDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-700 hover:bg-teal-600 text-white text-xs sm:text-sm px-2 sm:px-4" data-testid="button-launch-yours">
              <span className="sm:hidden">Launch</span>
              <span className="hidden sm:inline">Launch yours</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#2a2a2a] border-gray-700 max-w-[calc(100vw-2rem)] sm:max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-center" data-testid="text-launch-dialog-title">Launch your product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="flex gap-4">
                <label className="w-20 h-20 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 relative overflow-hidden" data-testid="button-upload-logo">
                  {logoFile ? (
                    <img src={URL.createObjectURL(logoFile)} alt="Logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 text-xs text-center">Upload Logo</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    data-testid="input-logo-file"
                  />
                </label>
                <div className="flex-1">
                  <Input
                    placeholder="Describe your product in 2 sentences"
                    value={launchForm.tagline}
                    onChange={(e) => setLaunchForm(prev => ({ ...prev, tagline: e.target.value }))}
                    data-testid="input-launch-tagline"
                    className="bg-[#1a1a1a] border-gray-600 text-white mb-2"
                  />
                  <Input
                    placeholder="Product name"
                    value={launchForm.name}
                    onChange={(e) => setLaunchForm(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="input-launch-name"
                    className="bg-[#1a1a1a] border-gray-600 text-white"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">Select at least one tag for your product:</p>
                
                {selectedTagIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-[#1a1a1a] rounded border border-gray-600">
                    {selectedTagIds.map(tagId => {
                      const tag = allTags.find((t: any) => t.id === tagId);
                      return tag ? (
                        <Badge 
                          key={tagId} 
                          className="bg-teal-700 text-white cursor-pointer"
                          onClick={() => toggleTag(tagId)}
                          data-testid={`badge-selected-tag-${tagId}`}
                        >
                          {tag.name}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}

                <Input
                  placeholder="Search tags..."
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  data-testid="input-tag-search"
                  className="bg-[#1a1a1a] border-gray-600 text-white"
                />
                
                <ScrollArea className="h-32 border border-gray-600 rounded bg-[#1a1a1a] p-2">
                  <div className="flex flex-wrap gap-2">
                    {filteredTags.slice(0, 30).map((tag: any) => (
                      <Badge 
                        key={tag.id}
                        variant="outline"
                        className="border-gray-500 text-gray-300 cursor-pointer hover:bg-gray-700"
                        onClick={() => toggleTag(tag.id)}
                        data-testid={`badge-tag-${tag.id}`}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              
              <label className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 block relative" data-testid="button-upload-product-image">
                {productImageFile ? (
                  <div>
                    <img src={URL.createObjectURL(productImageFile)} alt="Product preview" className="max-h-32 mx-auto mb-2" />
                    <span className="text-teal-400 text-sm">{productImageFile.name}</span>
                  </div>
                ) : (
                  <span className="text-gray-400">Upload Product Image here (mandatory)</span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProductImageFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  data-testid="input-product-image-file"
                />
              </label>
              
              <Input
                placeholder="Website link"
                value={launchForm.websiteUrl}
                onChange={(e) => setLaunchForm(prev => ({ ...prev, websiteUrl: e.target.value }))}
                data-testid="input-launch-website"
                className="bg-[#1a1a1a] border-gray-600 text-white"
              />
              
              <Button 
                onClick={handleCreateLaunch}
                disabled={!launchForm.name || !launchForm.tagline || !launchForm.websiteUrl || selectedTagIds.length === 0 || createLaunch.isPending}
                data-testid="button-submit-launch"
                className="w-full bg-teal-700 hover:bg-teal-600"
              >
                {createLaunch.isPending ? "Launching..." : !launchForm.websiteUrl ? "Website link required" : selectedTagIds.length === 0 ? "Select at least 1 tag" : "Launch!"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-8 pb-20">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-400 mt-4" data-testid="text-loading">Loading launches...</p>
          </div>
        ) : todaysLaunches.length === 0 && yesterdaysLaunches.length === 0 ? (
          <div className="text-center py-12">
            <Rocket className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-white text-xl sm:text-2xl font-semibold mb-2" data-testid="text-no-launches-title">No launches yet</h2>
            <p className="text-gray-400 mb-6 text-sm sm:text-base" data-testid="text-no-launches-subtitle">Be the first to launch your product!</p>
            <Button 
              onClick={() => setIsLaunchDialogOpen(true)}
              data-testid="button-launch-first"
              className="bg-teal-700 hover:bg-teal-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Launch your product
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {/* Recommended for you (based on 2+ matching tags) */}
            <div>
              <h2 className="text-white text-lg font-semibold mb-4" data-testid="text-recommended-title">Recommended for you</h2>
              <div className="space-y-3">
                {recommendedLaunches.length > 0 ? (
                  <>
                    {recommendedLaunches.slice(0, 4).map((launch: any) => (
                      <LaunchCard key={`recommended-${launch.id}`} launch={launch} />
                    ))}
                    {recommendedLaunches.length > 4 && (
                      <button className="text-gray-400 text-sm hover:text-white" data-testid="button-see-more-recommended">See more</button>
                    )}
                  </>
                ) : (
                  <p className="text-gray-400 text-sm" data-testid="text-no-recommendations">No recommendations yet. Launches with 2+ matching tags will appear here.</p>
                )}
              </div>
            </div>

            {/* Today's highest performers */}
            <div>
              <h2 className="text-white text-lg font-semibold mb-4" data-testid="text-today-highest-title">Today's highest performers</h2>
              <div className="space-y-3">
                {todaysLaunches.length > 0 ? (
                  todaysLaunches.slice(0, 6).map((launch: any) => (
                    <LaunchCard key={`today-${launch.id}`} launch={launch} showUpvotes />
                  ))
                ) : (
                  <p className="text-gray-400 text-sm" data-testid="text-no-today">No launches in the last 24 hours.</p>
                )}
              </div>
            </div>

            {/* Yesterday's highest performers */}
            <div>
              <h2 className="text-white text-lg font-semibold mb-4" data-testid="text-yesterday-highest-title">Yesterday's highest performers</h2>
              <div className="space-y-3">
                {yesterdaysLaunches.length > 0 ? (
                  yesterdaysLaunches.map((launch: any) => (
                    <LaunchCard key={`yesterday-${launch.id}`} launch={launch} showUpvotes />
                  ))
                ) : (
                  <p className="text-gray-400 text-sm" data-testid="text-no-yesterday">No launches from yesterday.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav activePage="/launches" />
    </div>
  );
};
