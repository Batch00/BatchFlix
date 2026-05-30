"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  List,
  Clapperboard,
  Eye,
  Play,
  Bookmark,
  Heart,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaCard } from "./MediaCard";
import { MediaRow } from "./MediaRow";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useSearchContext } from "@/components/search/SearchProvider";
import { cn } from "@/lib/utils";
import type { UserMediaRow } from "@/lib/queries/library";

type Status = "all" | "watched" | "watching" | "watchlist";
type Sort = "date_added" | "watched_date" | "rating" | "title";
type View = "grid" | "list";

const FILTER_TABS: { value: Status; label: string }[] = [
  { value: "all", label: "All" },
  { value: "watched", label: "Watched" },
  { value: "watching", label: "Watching" },
  { value: "watchlist", label: "Watchlist" },
];

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "date_added", label: "Date added" },
  { value: "watched_date", label: "Watch date" },
  { value: "rating", label: "Rating" },
  { value: "title", label: "Title" },
];

type EmptyState = {
  icon: React.ElementType;
  heading: string;
  subtext: string;
  cta?: string;
};

const EMPTY_STATES: Record<Status, EmptyState> = {
  all: {
    icon: Clapperboard,
    heading: "Your library is empty",
    subtext: "Search for movies and shows to start tracking.",
    cta: "Search for something",
  },
  watched: {
    icon: Eye,
    heading: "Nothing watched yet",
    subtext: "Mark something as watched to see it here.",
  },
  watching: {
    icon: Play,
    heading: "Not watching anything",
    subtext: "Add something you are currently watching.",
  },
  watchlist: {
    icon: Bookmark,
    heading: "Watchlist is empty",
    subtext: "Save things you want to watch later.",
  },
};

type Props = {
  initialItems: UserMediaRow[];
  status: Status;
  sort: Sort;
  view: View;
  favoritesListId: string | null;
};

export function LibraryContent({
  initialItems,
  status,
  sort,
  view,
  favoritesListId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { open: openSearch } = useSearchContext();
  const [items, setItems] = useState(initialItems);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const hasItems = initialItems.length > 0;

  useEffect(() => {
    if (!hasItems && typeof window !== "undefined") {
      const done = localStorage.getItem("batchflix_onboarding_complete");
      if (!done) {
        const id = setTimeout(() => setShowOnboarding(true), 0);
        return () => clearTimeout(id);
      }
    }
  }, [hasItems]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleRemoved(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const showEmpty = items.length === 0;
  const empty = EMPTY_STATES[status];
  const EmptyIcon = empty.icon;

  return (
    <>
      <OnboardingModal show={showOnboarding} />

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-foreground">Library</h1>
            <span className="text-sm text-muted-foreground">
              {items.length} items
            </span>
          </div>
          {favoritesListId && (
            <Link
              href={`/lists/${favoritesListId}`}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
            >
              <Heart className="h-4 w-4" />
              Favorites
            </Link>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => updateParam("status", tab.value)}
                className={cn(
                  "flex-shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors duration-150",
                  status === tab.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Select value={sort} onValueChange={(v) => updateParam("sort", v)}>
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center rounded-md border border-border">
              <button
                type="button"
                onClick={() => updateParam("view", "grid")}
                className={cn(
                  "rounded-l-md p-2 transition-colors duration-150",
                  view === "grid"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => updateParam("view", "list")}
                className={cn(
                  "rounded-r-md p-2 transition-colors duration-150",
                  view === "list"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {showEmpty ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <EmptyIcon className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold text-foreground">
              {empty.heading}
            </h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              {empty.subtext}
            </p>
            {empty.cta && (
              <button
                type="button"
                onClick={openSearch}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
              >
                {empty.cta}
              </button>
            )}
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <MediaRow key={item.id} item={item} onRemoved={handleRemoved} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
