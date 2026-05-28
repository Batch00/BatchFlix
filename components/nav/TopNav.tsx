"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/library", label: "Library" },
  { href: "/lists", label: "Lists" },
  { href: "/stats", label: "Stats" },
];

export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="h-14 border-b border-border bg-card">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="text-base font-bold tracking-tight text-foreground"
        >
          BatchFlix
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm transition-colors hover:text-foreground",
                pathname.startsWith(link.href)
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-secondary md:flex">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>

          <button
            className="flex items-center justify-center md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5 text-foreground" />
            ) : (
              <Menu className="h-5 w-5 text-foreground" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-b border-border bg-card px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary hover:text-foreground",
                  pathname.startsWith(link.href)
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

export function TopNavSpacer() {
  return <div className="h-14" />;
}
