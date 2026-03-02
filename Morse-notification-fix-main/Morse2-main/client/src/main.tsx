import { createRoot } from "react-dom/client";
import { useState, useEffect, useCallback } from "react";
import { ClerkProvider } from "@clerk/clerk-react";
import { ErrorBoundary, RecoverableErrorBoundary } from "@/components/ErrorBoundary";
import { ClerkAvailableContext } from "@/lib/clerk-context";
import App from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function canUseClerk(): boolean {
  if (!PUBLISHABLE_KEY) return false;

  try {
    const parts = PUBLISHABLE_KEY.split("_");
    const base64 = parts.slice(2).join("_");
    const decoded = atob(base64).replace(/\$$/, "");
    const appDomain = decoded.replace(/^clerk\./, "");

    const hostname = window.location.hostname;

    if (hostname === appDomain || hostname.endsWith("." + appDomain))
      return true;

    if (hostname === "localhost" || hostname === "127.0.0.1") return true;

    if (
      hostname.includes(".replit.") ||
      hostname.includes(".repl.co") ||
      hostname.includes(".kirk.") ||
      hostname.includes(".picard.") ||
      hostname.includes(".pike.")
    )
      return true;

    return false;
  } catch {
    return true;
  }
}

function Root() {
  const [clerkEnabled, setClerkEnabled] = useState(canUseClerk);

  const disableClerk = useCallback(() => {
    console.warn("Clerk disabled. Running without authentication.");
    setClerkEnabled(false);
  }, []);

  useEffect(() => {
    if (!clerkEnabled) return;

    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = String(e.reason?.message || e.reason || "");
      if (
        msg.includes("Clerk") ||
        msg.includes("clerk") ||
        msg.includes("Production Keys") ||
        msg.includes("HTTP Origin header")
      ) {
        e.preventDefault();
        disableClerk();
      }
    };

    const handleError = (e: ErrorEvent) => {
      const msg = String(e.message || "");
      if (
        msg.includes("Clerk") ||
        msg.includes("clerk") ||
        msg.includes("Production Keys")
      ) {
        e.preventDefault();
        disableClerk();
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, [clerkEnabled, disableClerk]);

  if (clerkEnabled && PUBLISHABLE_KEY) {
    return (
      <ClerkAvailableContext.Provider value={true}>
        <RecoverableErrorBoundary onRecover={disableClerk}>
          <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
            <App />
          </ClerkProvider>
        </RecoverableErrorBoundary>
      </ClerkAvailableContext.Provider>
    );
  }

  return (
    <ClerkAvailableContext.Provider value={false}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ClerkAvailableContext.Provider>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
