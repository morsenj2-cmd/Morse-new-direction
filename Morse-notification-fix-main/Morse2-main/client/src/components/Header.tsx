import { SignInButton, useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { Menu, X } from "lucide-react";

export const Header = (): JSX.Element => {
  const [location, setLocation] = useLocation();
  const { isSignedIn } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const navLinks = [
    { label: "about us", href: "/about" },
    { label: "pricing", href: "/pricing" },
    { label: "blog", href: "/blog" },
  ];

  useEffect(() => {
    if (isSignedIn) {
      setLocation("/dashboard", { replace: true });
    }
  }, [isSignedIn, setLocation]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  if (isSignedIn) {
    return <></>;
  }

  return (
    <header className="w-full px-4 sm:px-8 py-4 sm:py-6 relative z-50">
      <div className="flex items-center justify-between">
        <Link href="/">
          <div className="text-white text-4xl sm:text-5xl font-bold cursor-pointer" style={{ fontFamily: "'Arimo', sans-serif" }}>
            .--.
          </div>
        </Link>

        <nav className="hidden sm:flex items-center gap-12">
          {navLinks.map((link, index) => (
            <Link key={index} href={link.href}>
              <span
                className={`text-white text-base font-normal hover:opacity-80 transition-opacity cursor-pointer ${
                  location === link.href ? "underline underline-offset-4" : ""
                }`}
              >
                {link.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <SignInButton mode="modal">
            <Button
              variant="outline"
              className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 rounded-full px-4 sm:px-6 h-auto py-2 text-sm sm:text-base"
            >
              log in/sign up
            </Button>
          </SignInButton>

          <button
            className="sm:hidden text-white p-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          ref={menuRef}
          className="sm:hidden absolute right-4 top-full mt-1 rounded-xl border border-white/15 px-6 py-4 flex flex-col gap-4 min-w-[160px] shadow-lg"
          style={{
            background: "rgba(30, 30, 30, 0.7)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {navLinks.map((link, index) => (
            <Link key={index} href={link.href}>
              <span
                className={`text-white text-base font-normal hover:opacity-80 transition-opacity cursor-pointer ${
                  location === link.href ? "underline underline-offset-4" : ""
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </span>
            </Link>
          ))}
        </div>
      )}
    </header>
  );
};
