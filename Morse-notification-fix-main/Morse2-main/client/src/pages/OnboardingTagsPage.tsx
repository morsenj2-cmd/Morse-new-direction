import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTags, useCurrentUser, useUpdateUser } from "@/lib/api";
import { Check, X, MapPin } from "lucide-react";
import AuthGate from "../AuthGate";

const MIN_TAGS = 5;
const MAX_TAGS = 5;

const INDIAN_CITIES = [
  "Mumbai, Maharashtra", "Delhi, NCR", "Bangalore, Karnataka", "Hyderabad, Telangana", "Chennai, Tamil Nadu",
  "Kolkata, West Bengal", "Pune, Maharashtra", "Ahmedabad, Gujarat", "Jaipur, Rajasthan", "Lucknow, Uttar Pradesh",
  "Kochi, Kerala", "Chandigarh, Punjab", "Indore, Madhya Pradesh", "Coimbatore, Tamil Nadu", "Nagpur, Maharashtra",
  "Surat, Gujarat", "Visakhapatnam, Andhra Pradesh", "Thiruvananthapuram, Kerala", "Gurgaon, Haryana", "Noida, Uttar Pradesh",
  "Bhubaneswar, Odisha", "Vadodara, Gujarat", "Mysore, Karnataka", "Mangalore, Karnataka", "Patna, Bihar"
];

export const OnboardingTagsPage = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: tags = [], isLoading: tagsLoading } = useTags();
  const updateUser = useUpdateUser();

  const uniqueTags = useMemo(() => {
    const seen = new Set<string>();
    return tags.filter((t: any) => {
      const lower = t.name.toLowerCase().trim();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }, [tags]);

  const filteredCities = useMemo(() => {
    if (!citySearch) return INDIAN_CITIES.slice(0, 10);
    return INDIAN_CITIES.filter(city => 
      city.toLowerCase().includes(citySearch.toLowerCase())
    ).slice(0, 10);
  }, [citySearch]);

  useEffect(() => {
    if (currentUser?.tags) {
      setSelectedTagIds(currentUser.tags.map((tag: any) => tag.id));
    }
    if (currentUser?.city) {
      setSelectedCity(currentUser.city);
    }
  }, [currentUser]);

  const isEditMode = currentUser?.onboardingComplete && currentUser?.tags?.length >= MIN_TAGS;

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) return prev.filter(id => id !== tagId);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tagId];
    });
  };

  const handleComplete = async () => {
    if (selectedTagIds.length < MIN_TAGS || !selectedCity) return;
    
    await updateUser.mutateAsync({
      tagIds: selectedTagIds,
      onboardingComplete: true,
      city: selectedCity,
    });
    
    if (isEditMode) {
      setLocation("/profile");
    } else {
      setLocation("/profile", { replace: true });
    }
  };

  if (userLoading || tagsLoading) {
    return (
    <AuthGate> 
     <div className="bg-[#1a1a1a] w-full min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    </AuthGate>
    );
  }

  return (
    <div className="bg-[#1a1a1a] w-full min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-4 sm:px-8 py-3 sm:py-4 border-b border-gray-800">
        <div className="text-white text-2xl sm:text-4xl font-bold" data-testid="link-logo" style={{ fontFamily: "'Arimo', sans-serif" }}>
          .--.
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-white text-2xl sm:text-3xl font-bold mb-3 sm:mb-4" data-testid="text-onboarding-title">
            {isEditMode ? "Edit Your Tags" : "Welcome to Morse!"}
          </h1>
          <p className="text-gray-400 mb-2 text-sm sm:text-base" data-testid="text-onboarding-subtitle">
            {isEditMode 
              ? "Update your tags and location preferences."
              : `Select exactly ${MAX_TAGS} tags that describe your career and interests.`}
          </p>
          {!isEditMode && (
            <p className="text-gray-500 text-sm">
              These tags help us personalize your experience and connect you with like-minded people.
            </p>
          )}
          {isEditMode && (
            <Link href="/profile">
              <Button variant="outline" className="mt-4 border-gray-600 text-gray-400 hover:bg-gray-700" data-testid="button-back-to-profile">
                Back to Profile
              </Button>
            </Link>
          )}
        </div>

        {/* City Selection */}
        <div className="bg-[#2a2a2a] rounded-lg p-4 mb-6 border border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-teal-400" />
            <span className="text-white font-semibold">Your Location</span>
            <span className="text-red-400 text-sm">*required</span>
          </div>
          <div className="relative">
            {selectedCity ? (
              <div className="flex items-center justify-between bg-teal-700 text-white p-3 rounded-lg">
                <span>{selectedCity}</span>
                <button
                  onClick={() => setSelectedCity("")}
                  className="hover:text-teal-200"
                  data-testid="button-clear-city"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Search for your city..."
                  value={citySearch}
                  onChange={(e) => {
                    setCitySearch(e.target.value);
                    setShowCityDropdown(true);
                  }}
                  onFocus={() => setShowCityDropdown(true)}
                  data-testid="input-city-search"
                  className="bg-[#1a1a1a] border-gray-600 text-white"
                />
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
              </>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-2">This helps you receive broadcasts from people in your city</p>
        </div>

        {/* Progress Indicator */}
        <div className="bg-[#2a2a2a] rounded-lg p-4 mb-6 border border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Selected tags</span>
            <span className={`font-semibold ${selectedTagIds.length >= MAX_TAGS ? "text-teal-400" : "text-yellow-400"}`} data-testid="text-tag-count">
              {selectedTagIds.length} / {MAX_TAGS}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${selectedTagIds.length >= MAX_TAGS ? "bg-teal-500" : "bg-yellow-500"}`}
              style={{ width: `${Math.min((selectedTagIds.length / MAX_TAGS) * 100, 100)}%` }}
              data-testid="progress-tags"
            />
          </div>
        </div>

        {/* Tags Grid */}
        {uniqueTags.length === 0 ? (
          <div className="bg-[#2a2a2a] rounded-lg p-8 border border-gray-700 text-center">
            <p className="text-gray-400" data-testid="text-no-tags">No tags available yet. Please check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {uniqueTags.map((tag: any) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  data-testid={`button-tag-${tag.id}`}
                  className={`p-2 sm:p-3 rounded-lg border transition-all duration-200 text-left ${
                    isSelected
                      ? "bg-teal-700 border-teal-500 text-white"
                      : "bg-[#2a2a2a] border-gray-600 text-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-sm sm:text-base truncate">{tag.name}</span>
                    {isSelected ? (
                      <Check className="w-4 h-4 text-teal-300 flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 border border-gray-500 rounded flex-shrink-0" />
                    )}
                  </div>
                  {tag.description && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{tag.description}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Tags Preview */}
        {selectedTagIds.length > 0 && (
          <div className="mt-6 bg-[#2a2a2a] rounded-lg p-4 border border-gray-700">
            <h3 className="text-white font-semibold mb-3">Selected Tags</h3>
            <div className="flex flex-wrap gap-2">
              {selectedTagIds.map(tagId => {
                const tag = tags.find((t: any) => t.id === tagId);
                if (!tag) return null;
                return (
                  <span
                    key={tagId}
                    className="bg-teal-700 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    data-testid={`badge-selected-tag-${tagId}`}
                  >
                    {tag.name}
                    <button
                      onClick={() => toggleTag(tagId)}
                      className="hover:text-teal-200"
                      data-testid={`button-remove-tag-${tagId}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="mt-6 sm:mt-8 text-center pb-4">
          <Button
            onClick={handleComplete}
            disabled={selectedTagIds.length < MIN_TAGS || !selectedCity || updateUser.isPending}
            data-testid="button-complete-onboarding"
            className={`w-full sm:w-auto px-8 sm:px-12 py-3 text-base sm:text-lg ${
              selectedTagIds.length >= MIN_TAGS && selectedCity
                ? "bg-teal-700 hover:bg-teal-600"
                : "bg-gray-600 cursor-not-allowed"
            }`}
          >
            {updateUser.isPending 
              ? "Saving..." 
              : !selectedCity 
                ? "Select your city" 
                : selectedTagIds.length < MIN_TAGS
                  ? `${MIN_TAGS - selectedTagIds.length} more tags needed`
                  : isEditMode 
                    ? "Save Changes" 
                    : "Continue"}
          </Button>
        </div>
      </main>
    </div>
  );
};
