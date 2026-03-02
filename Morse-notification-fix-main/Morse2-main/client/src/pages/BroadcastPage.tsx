import { Link } from "wouter";
import { Users, Send, X } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useFollowRequests, useUserCommunities, useLaunches, useTags, useSendBroadcast } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export const BroadcastPage = (): JSX.Element => {
  const [message, setMessage] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  
  const { data: followRequests = [] } = useFollowRequests();
  const { data: communities = [] } = useUserCommunities();
  const { data: launches = [] } = useLaunches();
  const { data: tags = [] } = useTags();
  const sendBroadcast = useSendBroadcast();
  const { toast } = useToast();

  const handleSendBroadcast = () => {
    if (!message.trim()) {
      toast({ title: "Error", description: "Please enter a message", variant: "destructive" });
      return;
    }
    if (selectedTags.length < 1) {
      toast({ title: "Error", description: "Please select at least one tag", variant: "destructive" });
      return;
    }
    
    sendBroadcast.mutate(
      { content: message, tags: selectedTags, city: selectedCity || undefined },
      {
        onSuccess: (data: any) => {
          const count = data?.recipientCount || 0;
          if (count > 0) {
            toast({ title: "Success", description: `Broadcast sent to ${count} ${count === 1 ? 'person' : 'people'}!` });
          } else {
            toast({ title: "No recipients", description: "No users match the selected tags and city criteria.", variant: "destructive" });
          }
          setMessage("");
          setSelectedTags([]);
          setSelectedCity("");
          setSelectedFollowers([]);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to send broadcast", variant: "destructive" });
        },
      }
    );
  };

  const cities = [
    "Mumbai, Maharashtra", "Delhi, NCR", "Bangalore, Karnataka", "Hyderabad, Telangana", "Chennai, Tamil Nadu",
    "Kolkata, West Bengal", "Pune, Maharashtra", "Ahmedabad, Gujarat", "Jaipur, Rajasthan", "Lucknow, Uttar Pradesh",
    "Kochi, Kerala", "Chandigarh, Punjab", "Indore, Madhya Pradesh", "Coimbatore, Tamil Nadu", "Nagpur, Maharashtra",
    "Surat, Gujarat", "Visakhapatnam, Andhra Pradesh", "Thiruvananthapuram, Kerala", "Gurgaon, Haryana", "Noida, Uttar Pradesh",
    "Bhubaneswar, Odisha", "Vadodara, Gujarat", "Mysore, Karnataka", "Mangalore, Karnataka", "Patna, Bihar"
  ];

  const filteredCities = useMemo(() => {
    if (!citySearch) return cities.slice(0, 10);
    return cities.filter(city => 
      city.toLowerCase().includes(citySearch.toLowerCase())
    ).slice(0, 10);
  }, [citySearch]);

  const filteredTags = useMemo(() => {
    const filtered = tags.filter((tag: any) => 
      tag.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
      !selectedTags.includes(tag.name)
    );
    return filtered;
  }, [tagSearch, tags, selectedTags]);

  const toggleFollowerDegree = (degree: string) => {
    if (selectedFollowers.includes(degree)) {
      setSelectedFollowers(prev => prev.filter(d => d !== degree));
    } else if (selectedFollowers.length < 2) {
      setSelectedFollowers(prev => [...prev, degree]);
    }
  };

  const addTag = (tagName: string) => {
    if (!selectedTags.includes(tagName) && selectedTags.length < 3) {
      setSelectedTags(prev => [...prev, tagName]);
    }
    setTagSearch("");
    setShowTagDropdown(false);
  };

  const removeTag = (tagName: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tagName));
  };

  return (
    <div className="bg-[#1a1a1a] w-full min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between border-b border-gray-800">
        <Link href="/dashboard">
          <div className="text-white text-3xl sm:text-4xl font-bold cursor-pointer" data-testid="link-logo" style={{ fontFamily: "'Arimo', sans-serif" }}>
            .--.
          </div>
        </Link>

        <div className="flex-1 max-w-md mx-2 sm:mx-8"></div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row pb-20">
        {/* Left Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block w-64 p-4 space-y-6">
          <div className="bg-[#2a2a2a] rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3" data-testid="text-follow-requests-title">Follow requests</h3>
            {followRequests.length === 0 ? (
              <p className="text-gray-400 text-sm" data-testid="text-no-requests">No pending requests</p>
            ) : (
              <div className="space-y-3">
                {followRequests.slice(0, 3).map((request: any) => (
                  <div key={request.id} className="flex items-center gap-3" data-testid={`card-follow-request-${request.id}`}>
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                      {request.follower.avatarUrl ? (
                        <img src={request.follower.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm" data-testid={`text-request-name-${request.id}`}>{request.follower.displayName || request.follower.username}</p>
                      <p className="text-gray-400 text-xs">@{request.follower.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#2a2a2a] rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3" data-testid="text-launches-title">Exciting launches</h3>
            {launches.length === 0 ? (
              <p className="text-gray-400 text-sm" data-testid="text-no-launches">No launches yet</p>
            ) : (
              <div className="space-y-3">
                {launches.slice(0, 3).map((launch: any) => (
                  <div key={launch.id} className="flex items-center gap-3" data-testid={`card-launch-${launch.id}`}>
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm" data-testid={`text-launch-name-${launch.id}`}>{launch.name}</p>
                      <p className="text-gray-400 text-xs">{launch.tagline}</p>
                    </div>
                  </div>
                ))}
                <button className="text-gray-400 text-sm hover:text-white" data-testid="button-see-more-launches">See more</button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Broadcast Form */}
        <main className="flex-1 p-3 sm:p-4">
          <div className="bg-[#2a2a2a] rounded-lg p-4 sm:p-6 border border-gray-700">
            <h2 className="text-white text-xl font-semibold mb-6 text-center" data-testid="text-broadcast-title">Broadcast</h2>
            
            <div className="space-y-6">
              <div>
                <label className="text-white text-sm mb-2 block">Post description</label>
                <Textarea
                  placeholder="Enter your message here"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  data-testid="textarea-broadcast-message"
                  className="bg-[#1a1a1a] border-gray-600 text-white min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Select your city</label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Type to search cities..."
                      value={citySearch}
                      onChange={(e) => {
                        setCitySearch(e.target.value);
                        setShowCityDropdown(true);
                      }}
                      onFocus={() => setShowCityDropdown(true)}
                      data-testid="input-city-search"
                      className="bg-[#1a1a1a] border-gray-600 text-white"
                    />
                    {selectedCity && (
                      <div className="mt-2">
                        <Badge className="bg-teal-700 text-white">
                          {selectedCity}
                          <X 
                            className="w-3 h-3 ml-1 cursor-pointer" 
                            onClick={() => setSelectedCity("")}
                          />
                        </Badge>
                      </div>
                    )}
                    {showCityDropdown && filteredCities.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-[#2a2a2a] border border-gray-600 rounded-lg max-h-48 overflow-y-auto">
                        {filteredCities.map((city) => (
                          <div
                            key={city}
                            className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-white text-sm"
                            onClick={() => {
                              setSelectedCity(city);
                              setCitySearch("");
                              setShowCityDropdown(false);
                            }}
                            data-testid={`option-city-${city.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
                          >
                            {city}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Target audience tags (max 3)</label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Type to add tags..."
                      value={tagSearch}
                      onChange={(e) => {
                        setTagSearch(e.target.value);
                        setShowTagDropdown(true);
                      }}
                      onFocus={() => setShowTagDropdown(true)}
                      data-testid="input-tag-search"
                      className="bg-[#1a1a1a] border-gray-600 text-white"
                    />
                    {showTagDropdown && filteredTags.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-[#2a2a2a] border border-gray-600 rounded-lg max-h-64 overflow-y-auto">
                        {filteredTags.slice(0, 40).map((tag: any) => (
                          <div
                            key={tag.id}
                            className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-white text-sm"
                            onClick={() => addTag(tag.name)}
                            data-testid={`option-tag-${tag.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
                          >
                            {tag.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedTags.map((tag) => (
                        <Badge key={tag} className="bg-teal-700 text-white">
                          {tag}
                          <X 
                            className="w-3 h-3 ml-1 cursor-pointer" 
                            onClick={() => removeTag(tag)}
                            data-testid={`button-remove-tag-${tag.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-gray-500 text-xs mt-1">{selectedTags.length}/3 tags selected</p>
                </div>
              </div>

              <div>
                <label className="text-white text-sm mb-3 block text-center">Choose any two:</label>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
                  {[
                    { label: "1st degree followers", color: "bg-teal-600 border-teal-500 text-white" },
                    { label: "2nd degree followers", color: "bg-purple-600 border-purple-500 text-white" },
                    { label: "3rd degree followers", color: "bg-orange-600 border-orange-500 text-white" }
                  ].map((degree, idx) => (
                    <Button
                      key={degree.label}
                      variant="outline"
                      className={`${
                        selectedFollowers.includes(degree.label) 
                          ? degree.color 
                          : "bg-[#3a3a3a] border-gray-500 text-gray-200 hover:bg-gray-600"
                      } font-medium transition-all text-xs sm:text-sm px-3 sm:px-4`}
                      onClick={() => toggleFollowerDegree(degree.label)}
                      disabled={!selectedFollowers.includes(degree.label) && selectedFollowers.length >= 2}
                      data-testid={`button-follower-degree-${idx + 1}`}
                    >
                      {degree.label}
                    </Button>
                  ))}
                </div>
                {selectedFollowers.length < 2 && (
                  <p className="text-gray-400 text-xs text-center mt-2">Select {2 - selectedFollowers.length} more</p>
                )}
              </div>

              <p className="text-yellow-500 text-sm text-center" data-testid="text-broadcast-limit">
                You're only allowed to send 15 broadcasts a month!
              </p>

              <Button 
                className="w-full bg-teal-700 hover:bg-teal-600 text-white" 
                data-testid="button-send-broadcast"
                disabled={sendBroadcast.isPending || selectedTags.length < 1 || !message.trim() || !selectedCity}
                onClick={handleSendBroadcast}
              >
                <Send className="w-4 h-4 mr-2" />
                {sendBroadcast.isPending ? "Sending..." : "Broadcast"}
              </Button>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block w-64 p-4">
          <div className="bg-[#2a2a2a] rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3" data-testid="text-community-title">Community</h3>
            {communities.length === 0 ? (
              <div className="text-center py-4">
                <Users className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm" data-testid="text-no-communities">No communities joined</p>
              </div>
            ) : (
              <div className="space-y-3">
                {communities.slice(0, 4).map((community: any) => (
                  <div key={community.id} className="flex items-center gap-3" data-testid={`card-community-${community.id}`}>
                    <div className="w-10 h-10 rounded-full bg-teal-700 flex items-center justify-center">
                      <Users className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm" data-testid={`text-community-name-${community.id}`}>{community.name}</p>
                      <p className="text-gray-400 text-xs">{community.description || "Description"}</p>
                    </div>
                  </div>
                ))}
                <button className="text-gray-400 text-sm hover:text-white" data-testid="button-see-more-communities">See more</button>
              </div>
            )}
          </div>

          <Link href="/dashboard">
            <Button className="w-full mt-4 bg-teal-700 hover:bg-teal-600 text-white rounded-lg" data-testid="button-make-post">
              Make a post
            </Button>
          </Link>
        </aside>
      </div>

      <BottomNav activePage="/broadcast" />
    </div>
  );
};
