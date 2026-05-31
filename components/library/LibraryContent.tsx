"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  List,
  Clapperboard,
  Eye,
  Play,
  Bookmark,
  Search,
  X,
  Loader2,
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
type MediaType = "all" | "movie" | "tv";
type View = "grid" | "list";

const VIEW_PREF_KEY = "batchflix_view_preference";

const FILTER_TABS: { value: Status; label: string }[] = [
  { value: "all", label: "All" },
  { value: "watched", label: "Watched" },
  { value: "watching", label: "Watching" },
  { value: "watchlist", label: "Watchlist" },
];

const MEDIA_TYPE_TABS: { value: MediaType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV Shows" },
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
  mediaType: MediaType;
};

export function LibraryContent({
  initialItems,
  status,
  sort,
  mediaType,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { open: openSearch } = useSearchContext();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<View>("grid");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [titleQuery, setTitleQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Sync items when server re-fetches with new filters
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Debounce title search 150ms
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(titleQuery), 150);
    return () => clearTimeout(id);
  }, [titleQuery]);

  // Load view preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(VIEW_PREF_KEY);
    if (stored === "grid" || stored === "list") {
      setView(stored);
    }
  }, []);

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
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  // When switching status tabs, clear the sort param so the server applies
  // the contextual default (watched/watching → watch date, else → date added)
  function handleStatusChange(newStatus: Status) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("status", newStatus);
    params.delete("sort");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function handleViewChange(newView: View) {
    setView(newView);
    localStorage.setItem(VIEW_PREF_KEY, newView);
  }

  function handleRemoved(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const filteredItems = debouncedQuery
    ? items.filter((item) =>
        item.media_items.title.toLowerCase().includes(debouncedQuery.toLowerCase())
      )
    : items;

  const showEmpty = filteredItems.length === 0;
  const empty: EmptyState = debouncedQuery
    ? { icon: Search, heading: "No results", subtext: `No items match "${debouncedQuery}".` }
    : EMPTY_STATES[status];
  const EmptyIcon = empty.icon;

  return (
    <>
      <OnboardingModal show={showOnboarding} />

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-foreground">Library</h1>
            <span className="text-sm text-muted-foreground">
              {filteredItems.length} items
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-2">
          {/* Row 1: status + sort + view toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleStatusChange(tab.value)}
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
                  onClick={() => handleViewChange("grid")}
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
                  onClick={() => handleViewChange("list")}
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

          {/* Row 2: media type filter */}
          <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MEDIA_TYPE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => updateParam("mediaType", tab.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors duration-150",
                  mediaType === tab.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Row 3: title search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={titleQuery}
              onChange={(e) => setTitleQuery(e.target.value)}
              placeholder="Search your library..."
              className="w-full rounded-lg border border-[#1f1f1f] bg-[#111111] py-1.5 pl-8 pr-8 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-[#2563EB]"
            />
            {titleQuery && (
              <button
                type="button"
                onClick={() => setTitleQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
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
          <div className="relative">
            {isPending && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-[#0a0a0a]/50">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6", isPending && "pointer-events-none")}>
              {filteredItems.map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredItems.map((item) => (
              <MediaRow key={item.id} item={item} onRemoved={handleRemoved} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
