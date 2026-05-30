"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Clapperboard, Heart } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaCard } from "./MediaCard";
import { MediaRow } from "./MediaRow";
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

const EMPTY_MESSAGES: Record<Status, string> = {
  all: "Your library is empty.",
  watched: "You haven't marked anything as watched yet.",
  watching: "You're not currently watching anything.",
  watchlist: "Your watchlist is empty.",
};

type Props = {
  initialItems: UserMediaRow[];
  status: Status;
  sort: Sort;
  view: View;
  favoritesListId: string | null;
};

export function LibraryContent({ initialItems, status, sort, view, favoritesListId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { open: openSearch } = useSearchContext();
  const [items, setItems] = useState(initialItems);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleRemoved(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const showEmpty = items.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-foreground">Library</h1>
          <span className="text-sm text-muted-foreground">{items.length} items</span>
        </div>
        {favoritesListId && (
          <Link
            href={`/lists/${favoritesListId}`}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Heart className="h-4 w-4" />
            Favorites
          </Link>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => updateParam("status", tab.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
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
                "rounded-l-md p-2 transition-colors",
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
                "rounded-r-md p-2 transition-colors",
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
          <Clapperboard className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-lg font-semibold text-foreground">
            Nothing here yet
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {EMPTY_MESSAGES[status]}
          </p>
          {status === "all" && (
            <button
              type="button"
              onClick={openSearch}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Search for something to add
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
  );
}
