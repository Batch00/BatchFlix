"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, Search, Heart, LogOut, Library, BarChart2, List } from "lucide-react";
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
];

type Props = {
  userEmail: string | null;
};

export function TopNav({ userEmail }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { open } = useSearchContext();

  const favHref = "/lists";

  const avatarLetter = userEmail ? userEmail[0].toUpperCase() : "?";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-card">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
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

        <div className="flex items-center gap-2">
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

          <Link
            href={favHref}
            aria-label="Favorites"
            className="hidden items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground md:flex"
          >
            <Heart className="h-4 w-4" />
          </Link>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Profile menu"
                className="hidden h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 md:flex"
              >
                {avatarLetter}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {userEmail && (
                <>
                  <DropdownMenuLabel className="truncate max-w-48">
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

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger
              className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
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
                <Link
                  href={favHref}
                  className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
                >
                  <Heart className="h-4 w-4" />
                  Favorites
                </Link>
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
  );
}

export function TopNavSpacer() {
  return <div className="h-14" />;
}
