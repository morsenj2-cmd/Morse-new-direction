import { Link, useLocation } from "wouter";
import { Search, Users, ArrowLeft } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useSearchUsers } from "@/lib/api";

export const SearchResultsPage = (): JSX.Element => {
  const searchParams = new URLSearchParams(window.location.search);
  const initialQuery = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [, setLocation] = useLocation();
  
  const { data: searchResults = [], isLoading } = useSearchUsers(searchQuery);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.length >= 2) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="bg-[#1a1a1a] w-full min-h-screen flex flex-col">
      <header className="w-full px-8 py-4 flex items-center justify-between border-b border-gray-800">
        <Link href="/dashboard">
          <div className="text-white text-3xl sm:text-4xl font-bold cursor-pointer" data-testid="link-logo" style={{ fontFamily: "'Arimo', sans-serif" }}>
            .--.
          </div>
        </Link>

        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search by name or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearch}
              data-testid="input-search"
              className="w-full bg-transparent border border-gray-600 rounded-full px-4 py-2 text-white focus:outline-none focus:border-gray-400"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>

        <div className="w-32"></div>
      </header>

      <div className="flex-1 p-8 pb-20">
        <div className="max-w-3xl mx-auto">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-gray-400 hover:text-white mb-4" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <h1 className="text-white text-2xl font-bold mb-6" data-testid="text-search-title">
            {searchQuery ? `Search results for "${searchQuery}"` : "Search for users"}
          </h1>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-400 mt-4">Searching...</p>
            </div>
          ) : searchQuery.length < 2 ? (
            <div className="bg-[#2a2a2a] rounded-lg p-8 border border-gray-700 text-center">
              <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2" data-testid="text-search-prompt">Enter at least 2 characters to search</p>
              <p className="text-gray-500 text-sm">
                Search for users by name, username, or tags
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="bg-[#2a2a2a] rounded-lg p-8 border border-gray-700 text-center">
              <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2" data-testid="text-no-results">No users found</p>
              <p className="text-gray-500 text-sm">
                Try a different search term
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((user: any) => (
                <Link key={user.id} href={`/user/${user.id}`}>
                  <div 
                    className="bg-[#2a2a2a] rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                    data-testid={`card-user-${user.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold" data-testid={`text-user-name-${user.id}`}>
                          {user.displayName || user.username}
                        </p>
                        <p className="text-gray-400 text-sm">@{user.username}</p>
                        {user.bio && (
                          <p className="text-gray-500 text-sm mt-1 line-clamp-1">{user.bio}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};
