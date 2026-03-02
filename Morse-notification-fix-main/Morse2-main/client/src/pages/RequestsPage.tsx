import { Link } from "wouter";
import { FollowRequestsPanel } from "@/components/FollowRequestsPanel";

export const RequestsPage = () => {
  return (
    <div className="bg-[#1a1a1a] min-h-screen text-white">
      <header className="px-4 py-4 border-b border-gray-800">
        <Link href="/dashboard">
          <div className="text-3xl font-bold">.--.</div>
        </Link>
      </header>

      <div className="p-4">
        <FollowRequestsPanel />
      </div>
    </div>
  );
};
