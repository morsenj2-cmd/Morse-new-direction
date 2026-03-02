import { UserButton, useUser } from "@clerk/clerk-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";

const ADMIN_EMAIL = "prayagbiju78@gmail.com";

interface BottomNavProps {
  activePage?: string;
}

export const BottomNav = ({ activePage }: BottomNavProps): JSX.Element => {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();

  const isAdmin = user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL;

  const hamburgerItems = useMemo(() => {
    const items = [
      { name: "Broadcast", path: "/broadcast" },
      { name: "New launches", path: "/launches" },
    ];
    if (isAdmin) {
      items.push({ name: "Blog", path: "/blog" });
    }
    return items;
  }, [isAdmin]);

  const desktopItems = useMemo(() => {
    const items = [
      { name: "Broadcast", path: "/broadcast" },
      { name: "Messages", path: "/messages" },
      { name: "Home", path: "/dashboard" },
      { name: "New launches", path: "/launches" },
      { name: "Communities", path: "/communities" },
    ];
    if (isAdmin) {
      items.push({ name: "Blog", path: "/blog" });
    }
    return items;
  }, [isAdmin]);

  const isActive = (path: string) => {
    return activePage === path || location === path;
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const isHamburgerActive = hamburgerItems.some((item) => isActive(item.path));

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a1a] w-full border-t border-gray-800">
        {/* Mobile bottom nav */}
        <div className="sm:hidden flex items-center justify-around px-1 py-2 relative">
          {/* Hamburger */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                isHamburgerActive ? "text-teal-400" : "text-gray-300"
              }`}
            >
              {menuOpen ? <X className="w-5 h-5 mx-auto" /> : <Menu className="w-5 h-5 mx-auto" />}
            </button>

            {menuOpen && (
              <div
                className="absolute bottom-full mb-2 left-0 rounded-xl border border-white/15 px-4 py-3 flex flex-col gap-2 min-w-[160px] shadow-lg"
                style={{
                  background: "rgba(30, 30, 30, 0.7)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                }}
              >
                {hamburgerItems.map((item) => (
                  <Link key={item.name} href={item.path}>
                    <div
                      className={`px-3 py-2 rounded-lg transition-colors cursor-pointer text-sm ${
                        isActive(item.path) ? "text-teal-400 bg-white/10" : "text-white hover:bg-white/5"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.name}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/dashboard">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive("/dashboard") ? "text-teal-400" : "text-gray-300"
            }`}>Home</span>
          </Link>

          <Link href="/messages">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive("/messages") ? "text-teal-400" : "text-gray-300"
            }`}>Messages</span>
          </Link>
        
          <Link href="/requests">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              isActive("/requests") ? "text-teal-400" : "text-gray-300"
            }`}>
            Requests
             </span>
          </Link>

          <Link href="/communities">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive("/communities") ? "text-teal-400" : "text-gray-300"
            }`}>Groups</span>
          </Link>

          <Link href="/profile">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive("/profile") ? "text-teal-400" : "text-gray-300"
            }`}>Profile</span>
          </Link>

          <div className="px-1">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        {/* Desktop bottom nav */}
        <div className="hidden sm:flex items-center justify-center px-8 py-4 gap-4">
          {desktopItems.map((tab) => (
            <Link key={tab.name} href={tab.path}>
              <Button
                variant="outline"
                className={`${
                  isActive(tab.path) ? "bg-teal-700 border-teal-600" : "bg-[#3a3a3a] border-gray-600"
                } text-white hover:bg-gray-600 rounded-lg px-6 py-2 text-sm whitespace-nowrap`}
                data-testid={`button-nav-${tab.name.toLowerCase().replace(/\s/g, "-")}`}
              >
                {tab.name}
              </Button>
            </Link>
          ))}
          <Link href="/profile">
            <span
              className={`text-white cursor-pointer hover:text-gray-300 text-sm whitespace-nowrap ${
                isActive("/profile") ? "border-b-2 border-teal-500 pb-1" : ""
              }`}
              data-testid="link-profile"
            >
              Profile
            </span>
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </footer>

      {/* Spacer for fixed footer */}
      <div className="h-14 sm:h-20"></div>
    </>
  );
};
