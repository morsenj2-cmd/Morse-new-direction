import { Link, useParams } from "wouter";
import { ChevronUp, Heart, User, Rocket, Trash2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useLaunches, useCurrentUser, useUpvoteLaunch, useDeleteLaunch } from "@/lib/api";
import { useLocation } from "wouter";

export const LaunchDetailPage = (): JSX.Element => {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { data: launches = [], isLoading } = useLaunches();
  const { data: currentUser } = useCurrentUser();
  const upvoteLaunch = useUpvoteLaunch();
  const deleteLaunch = useDeleteLaunch();
  
  const launch = launches.find((l: any) => l.id === params.id);
  const isCreator = currentUser?.id === launch?.creatorId;

  const handleUpvote = async () => {
    if (params.id) {
      await upvoteLaunch.mutateAsync(params.id);
    }
  };

  const handleDelete = async () => {
    if (params.id && confirm("Are you sure you want to delete this launch?")) {
      await deleteLaunch.mutateAsync(params.id);
      setLocation("/launches");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#1a1a1a] w-full min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!launch) {
    return (
      <div className="bg-[#1a1a1a] w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Rocket className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg" data-testid="text-launch-not-found">Launch not found</p>
          <Link href="/launches">
            <Button className="mt-4 bg-teal-700 hover:bg-teal-600" data-testid="button-back-to-launches">
              Back to Launches
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] w-full min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full px-8 py-4 flex items-center justify-between border-b border-gray-800">
        <Link href="/dashboard">
          <div className="text-white text-3xl sm:text-4xl font-bold cursor-pointer" data-testid="link-logo" style={{ fontFamily: "'Arimo', sans-serif" }}>
            .--.
          </div>
        </Link>

        <div className="flex-1 max-w-md mx-8"></div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-8 pb-20 flex justify-center">
        <div className="max-w-2xl w-full">
          {/* Upvote Section */}
          <div className="flex justify-between items-start mb-4">
            {isCreator && (
              <Button 
                variant="outline" 
                className="border-red-600 text-red-500 hover:bg-red-600 hover:text-white"
                onClick={handleDelete}
                data-testid="button-delete-launch"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Launch
              </Button>
            )}
            <div className="flex-1" />
            <button
              onClick={handleUpvote}
              disabled={upvoteLaunch.isPending}
              className="flex flex-col items-center text-white border border-gray-600 rounded-lg px-4 py-2 cursor-pointer hover:border-teal-500 transition-colors disabled:opacity-50" 
              data-testid="button-upvote"
            >
              <ChevronUp className="w-6 h-6" />
              <span className="text-lg font-bold" data-testid="text-upvote-count">{launch.upvotesCount || 0}</span>
            </button>
          </div>

          {/* Launch Info */}
          <div className="bg-[#2a2a2a] rounded-lg p-6 border border-gray-700">
            <h1 className="text-white text-2xl font-bold mb-2" data-testid="text-launch-name">{launch.name}</h1>
            
            {/* Action Buttons */}
            <div className="flex gap-4 mb-6">
              <Button 
                variant="outline" 
                className="bg-[#1a1a1a] border-gray-600 text-white hover:bg-gray-700" 
                onClick={handleUpvote}
                disabled={upvoteLaunch.isPending}
                data-testid="button-support"
              >
                <Heart className="w-4 h-4 mr-2" />
                Support
              </Button>

              <Link href={`/profile/${launch.creator?.username}`}>
                <Button variant="outline" className="bg-[#1a1a1a] border-gray-600 text-white hover:bg-gray-700" data-testid="button-view-creator">
                  <User className="w-4 h-4 mr-2" />
                  {launch.creator?.displayName || launch.creator?.username}
                </Button>
              </Link>
            </div>

            {/* Description */}
            <p className="text-gray-300 mb-6" data-testid="text-launch-description">{launch.description || launch.tagline}</p>

            {/* Product Image */}
            {(launch.productImageUrl || launch.logoUrl) ? (
              <div className="rounded-lg overflow-hidden border border-gray-600">
                <img src={launch.productImageUrl || launch.logoUrl} alt={launch.name} className="w-full object-contain" data-testid="img-launch-product" />
              </div>
            ) : (
              <div className="bg-black rounded-lg aspect-video flex items-center justify-center border border-gray-600">
                <p className="text-gray-500">Product Image</p>
              </div>
            )}

            {/* Website Link */}
            {launch.websiteUrl && (
              <div className="mt-4">
                <a 
                  href={launch.websiteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-teal-400 hover:text-teal-300 underline"
                  data-testid="link-website"
                >
                  Visit Website
                </a>
              </div>
            )}

          </div>
        </div>
      </div>

      <BottomNav activePage="/launches" />
    </div>
  );
};
