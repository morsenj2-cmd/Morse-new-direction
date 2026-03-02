import { RequestsPage } from "@/pages/RequestsPage";
import { Switch, Route, Redirect } from "wouter";
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { SignedIn, SignedOut, RedirectToSignIn, ClerkLoaded } from "@clerk/clerk-react";
import { SignIn } from "@clerk/clerk-react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary, ClerkGuard } from "@/components/ErrorBoundary";
import { PublicHeader } from "@/components/PublicHeader";
import NotFound from "@/pages/not-found";
import { useCurrentUser } from "@/lib/api";

import { Desktop } from "@/pages/Desktop";
import { AboutUs } from "@/pages/AboutUs";
import { Pricing } from "@/pages/Pricing";
import { Blog } from "@/pages/Blog";
import { BlogDetailPage } from "@/pages/BlogDetailPage";
import { Dashboard } from "@/pages/Dashboard";
import { BroadcastPage } from "@/pages/BroadcastPage";
import { LaunchesPage } from "@/pages/LaunchesPage";
import { LaunchDetailPage } from "@/pages/LaunchDetailPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { UserProfilePage } from "@/pages/UserProfilePage";
import { MessagesPage } from "@/pages/MessagesPage";
import { CommunitiesPage } from "@/pages/CommunitiesPage";
import { CommunityDetailPage } from "@/pages/CommunityDetailPage";
import { ThreadDetailPage } from "@/pages/ThreadDetailPage";
import { OnboardingTagsPage } from "@/pages/OnboardingTagsPage";
import { SearchResultsPage } from "@/pages/SearchResultsPage";

function ClerkUnavailableFallback() {
  return (
    <div className="bg-black w-full min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center px-8">
        <div className="text-center max-w-md">
          <h2 className="text-white text-2xl font-bold mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Sign in unavailable
          </h2>
          <p className="text-white/50 text-base">
            Please visit <a href="https://morse.co.in" className="text-white/70 underline">morse.co.in</a> to sign in.
          </p>
        </div>
      </main>
    </div>
  );
}

function OnboardingGuard({ component: Component }: { component: React.ComponentType }) {
  const { data: currentUser, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="bg-[#1a1a1a] w-full min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (currentUser && !currentUser.onboardingComplete) {
    return <Redirect to="/onboarding/tags" />;
  }

  return <Component />;
}

function ProtectedRoute({ component: Component, skipOnboardingCheck }: { component: React.ComponentType; skipOnboardingCheck?: boolean }) {
  return (
    <>
      <SignedIn>
        {skipOnboardingCheck ? <Component /> : <OnboardingGuard component={Component} />}
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
function Router() {
  return (
    <Switch>
      <Route path="/requests" component={RequestsPage} />
      <Route path="/" component={Desktop} />
      <Route path="/sso-callback" component={AuthenticateWithRedirectCallback} />
      <Route path="/sign-in" component={SignIn} />
      <Route path="/about" component={AboutUs} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:slug" component={BlogDetailPage} />
      <Route path="/onboarding/tags">
        <ProtectedRoute component={OnboardingTagsPage} skipOnboardingCheck />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/broadcast">
        <ProtectedRoute component={BroadcastPage} />
      </Route>
      <Route path="/launches">
        <ProtectedRoute component={LaunchesPage} />
      </Route>
      <Route path="/launches/:id">
        <ProtectedRoute component={LaunchDetailPage} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={ProfilePage} />
      </Route>
      <Route path="/user/:id">
        <ProtectedRoute component={UserProfilePage} />
      </Route>
      <Route path="/messages">
        <ProtectedRoute component={MessagesPage} />
      </Route>
      <Route path="/communities">
        <ProtectedRoute component={CommunitiesPage} />
      </Route>
      <Route path="/communities/:id">
        <ProtectedRoute component={CommunityDetailPage} />
      </Route>
      <Route path="/threads/:id">
        <ProtectedRoute component={ThreadDetailPage} />
      </Route>
      <Route path="/search">
        <ProtectedRoute component={SearchResultsPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
