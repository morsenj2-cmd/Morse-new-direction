import { Link, useLocation } from "wouter";
import { Users, Plus, X, Check } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useCommunities, useUserCommunities, useJoinCommunity, useCreateCommunity, useTags } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export const CommunitiesPage = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCommunity, setNewCommunity] = useState({ name: "", description: "" });
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  
  const { data: allCommunities = [], isLoading } = useCommunities();
  const { data: rawUserCommunities = [] } = useUserCommunities();
  const { data: tags = [] } = useTags();
  const joinCommunity = useJoinCommunity();
  const createCommunity = useCreateCommunity();

  // Deduplicate user communities by ID
  const userCommunities = rawUserCommunities.filter((community: any, index: number, self: any[]) =>
    index === self.findIndex((c: any) => c.id === community.id)
  );

  const userCommunityIds = userCommunities.map((c: any) => c.id);

  const filteredTags = tags.filter((tag: any) => 
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : prev.length >= 5 ? prev : [...prev, tagId]
    );
  };

  const handleCreateCommunity = async () => {
    if (!newCommunity.name) return;
    
    await createCommunity.mutateAsync({
      ...newCommunity,
      tagIds: selectedTagIds,
    });
    setNewCommunity({ name: "", description: "" });
    setSelectedTagIds([]);
    setTagSearch("");
    setIsCreateDialogOpen(false);
  };

  const handleJoinCommunity = async (communityId: string) => {
    await joinCommunity.mutateAsync(communityId);
    setLocation(`/communities/${communityId}`);
  };

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

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-700 hover:bg-teal-600 text-white text-xs sm:text-sm px-2 sm:px-4" data-testid="button-create-community">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Community</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#2a2a2a] border-gray-700 max-w-[calc(100vw-2rem)] sm:max-w-lg mx-auto">
            <DialogHeader>
              <DialogTitle className="text-white" data-testid="text-create-community-title">Create a Community</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Community name"
                value={newCommunity.name}
                onChange={(e) => setNewCommunity(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-community-name"
                className="bg-[#1a1a1a] border-gray-600 text-white"
              />
              <Textarea
                placeholder="Description"
                value={newCommunity.description}
                onChange={(e) => setNewCommunity(prev => ({ ...prev, description: e.target.value }))}
                data-testid="textarea-community-description"
                className="bg-[#1a1a1a] border-gray-600 text-white"
              />
              
              {/* Tag Selection */}
              <div>
                <label className="text-white text-sm font-medium mb-2 block">
                  Tags ({selectedTagIds.length}/5) <span className="text-red-400">*required</span>
                </label>
                <Input
                  placeholder="Search tags..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  data-testid="input-tag-search"
                  className="bg-[#1a1a1a] border-gray-600 text-white mb-2"
                />
                
                {/* Selected Tags */}
                {selectedTagIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedTagIds.map(tagId => {
                      const tag = tags.find((t: any) => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <span
                          key={tagId}
                          className="bg-teal-700 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1"
                          data-testid={`badge-selected-tag-${tagId}`}
                        >
                          {tag.name}
                          <button onClick={() => toggleTag(tagId)} className="hover:text-teal-200">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                
                {/* Tag List */}
                <ScrollArea className="h-48 border border-gray-600 rounded-lg">
                  <div className="p-2 space-y-1">
                    {filteredTags.slice(0, 40).map((tag: any) => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          data-testid={`button-tag-${tag.id}`}
                          className={`w-full text-left px-2 py-1 rounded text-sm flex items-center justify-between ${
                            isSelected
                              ? "bg-teal-700 text-white"
                              : "text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          <span>{tag.name}</span>
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
              
              <Button 
                onClick={handleCreateCommunity}
                disabled={!newCommunity.name || selectedTagIds.length === 0 || createCommunity.isPending}
                data-testid="button-submit-community"
                className="w-full bg-teal-700 hover:bg-teal-600"
              >
                {createCommunity.isPending ? "Creating..." : "Create Community"}
              </Button>
              {selectedTagIds.length === 0 && (
                <p className="text-red-400 text-sm text-center">Please select at least one tag (max 5)</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-8 pb-20">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-400 mt-4" data-testid="text-loading">Loading communities...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* Your Communities */}
            <div>
              <h2 className="text-white text-xl font-semibold mb-4" data-testid="text-your-communities-title">Your Communities</h2>
              {userCommunities.length === 0 ? (
                <div className="bg-[#2a2a2a] rounded-lg p-8 border border-gray-700 text-center">
                  <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2" data-testid="text-no-user-communities">You haven't joined any communities yet</p>
                  <p className="text-gray-500 text-sm">
                    Join communities to connect with like-minded people
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userCommunities.map((community: any) => (
                    <Link key={community.id} href={`/communities/${community.id}`}>
                      <div className="bg-[#2a2a2a] rounded-lg p-4 border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors" data-testid={`card-user-community-${community.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-teal-700 flex items-center justify-center">
                            <Users className="w-6 h-6 text-teal-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-semibold" data-testid={`text-user-community-name-${community.id}`}>{community.name}</p>
                            <p className="text-gray-400 text-sm">{community.description || "No description"}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Discover Communities */}
            <div>
              <h2 className="text-white text-xl font-semibold mb-4" data-testid="text-discover-communities-title">Discover Communities</h2>
              {allCommunities.filter((c: any) => !userCommunityIds.includes(c.id)).length === 0 ? (
                <div className="bg-[#2a2a2a] rounded-lg p-8 border border-gray-700 text-center">
                  <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2" data-testid="text-no-discover-communities">No communities to discover</p>
                  <p className="text-gray-500 text-sm">
                    Be the first to create a community!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allCommunities
                    .filter((c: any) => !userCommunityIds.includes(c.id))
                    .sort((a: any, b: any) => (b.tagOverlapCount || 0) - (a.tagOverlapCount || 0))
                    .map((community: any) => (
                      <div key={community.id} className="bg-[#2a2a2a] rounded-lg p-4 border border-gray-700" data-testid={`card-discover-community-${community.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                            <Users className="w-6 h-6 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-semibold" data-testid={`text-discover-community-name-${community.id}`}>{community.name}</p>
                            <p className="text-gray-400 text-sm">{community.description || "No description"}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleJoinCommunity(community.id)}
                            disabled={joinCommunity.isPending}
                            data-testid={`button-join-community-${community.id}`}
                            className="bg-teal-700 hover:bg-teal-600"
                          >
                            Join
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNav activePage="/communities" />
    </div>
  );
};
