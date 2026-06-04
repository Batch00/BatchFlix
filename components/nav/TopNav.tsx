"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Heart,
  LogOut,
  Library,
  BarChart2,
  List,
  RotateCw,
  House,
  LayoutList,
  Compass,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSearchContext } from "@/components/search/SearchProvider";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinks = [
  { href: "/library", label: "Library" },
  { href: "/lists", label: "Lists" },
  { href: "/stats", label: "Stats" },
  { href: "/favorites", label: "Favorites" },
  { href: "/discover", label: "Discover" },
];

const bottomNavItems = [
  { href: "/library", icon: House, label: "Library" },
  { href: "/lists", icon: LayoutList, label: "Lists" },
  { href: "/favorites", icon: Heart, label: "Favorites" },
  { href: "/stats", icon: BarChart2, label: "Stats" },
  { href: "/discover", icon: Compass, label: "Discover" },
] as const;

type Props = {
  userEmail: string | null;
};

export function TopNav({ userEmail }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { open } = useSearchContext();
  const [refreshing, setRefreshing] = useState(false);

  const avatarLetter = userEmail ? userEmail[0].toUpperCase() : "?";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-border bg-card"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <Link
            href="/library"
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
                  "text-sm transition-colors duration-150",
                  pathname.startsWith(link.href)
                    ? "font-medium text-foreground underline underline-offset-4 decoration-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={open}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
              <span className="hidden text-xs sm:flex">
                <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-sans text-[10px]">
                  K
                </kbd>
              </span>
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              title="Refresh"
              aria-label="Refresh"
              className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
            >
              <RotateCw
                className={cn("h-4 w-4", refreshing && "animate-spin")}
              />
            </button>

            {/* Profile dropdown -- visible on all screen sizes */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Profile menu"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
                >
                  {avatarLetter}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {userEmail && (
                  <>
                    <DropdownMenuLabel className="max-w-48 truncate">
                      {userEmail}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/library" className="flex items-center gap-2">
                    <Library className="h-4 w-4" />
                    Library
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/stats" className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" />
                    Stats
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/lists" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Lists
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile sheet -- trigger hidden (replaced by bottom nav) */}
            <Sheet>
              <SheetTrigger className="hidden" aria-label="Open menu" />
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>BatchFlix</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4 py-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "rounded-md px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-secondary hover:text-foreground",
                        pathname.startsWith(link.href)
                          ? "bg-secondary text-foreground font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={open}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
                  >
                    <RotateCw
                      className={cn("h-4 w-4", refreshing && "animate-spin")}
                    />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm text-destructive transition-colors duration-150 hover:bg-secondary"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </nav>
                {userEmail && (
                  <p className="px-7 text-xs text-muted-foreground">{userEmail}</p>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 block border-t border-[#1f1f1f] bg-[#111111] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="h-16 flex items-center justify-around px-2">
          {bottomNavItems.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5"
              >
                <Icon
                  size={22}
                  className={active ? "text-[#2563EB]" : "text-[#71717a]"}
                />
                <span
                  className={cn(
                    "text-[10px]",
                    active ? "text-[#2563EB]" : "text-[#71717a]"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export function TopNavSpacer() {
  return <div className="h-14" />;
}
