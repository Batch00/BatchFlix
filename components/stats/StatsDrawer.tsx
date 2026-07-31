"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Film, Tv, LayoutGrid, List } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CardBadges } from "@/components/media/CardBadges";
import type { StatsItem } from "@/lib/queries/stats";

type MediaFilter = "all" | "movie" | "tv";
type ViewMode = "grid" | "list";
type SortOption = "default" | "title" | "rating" | "watch_date" | "release_year";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "title", label: "Title A-Z" },
  { value: "rating", label: "Rating" },
  { value: "watch_date", label: "Watch Date" },
  { value: "release_year", label: "Release Year" },
];

function sortStatsItems(items: StatsItem[], sort: SortOption): StatsItem[] {
  if (sort === "default") return items;
  const copy = [...items];
  switch (sort) {
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "rating":
      return copy.sort((a, b) => {
        if (a.rating === null) return b.rating === null ? 0 : 1;
        if (b.rating === null) return -1;
        return b.rating - a.rating;
      });
    case "watch_date":
      return copy.sort((a, b) =>
        (b.watched_date ?? "").localeCompare(a.watched_date ?? "")
      );
    case "release_year":
      return copy.sort((a, b) =>
        (b.release_date ?? "").localeCompare(a.release_date ?? "")
      );
  }
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  watched: { bg: "bg-blue-900/80", text: "text-blue-200", label: "Watched" },
  watching: { bg: "bg-yellow-900/80", text: "text-yellow-200", label: "Watching" },
  watchlist: { bg: "bg-zinc-800/80", text: "text-zinc-300", label: "Watchlist" },
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: StatsItem[];
  timeRangeLabel: string;
};

export function StatsDrawer({ isOpen, onClose, title, items, timeRangeLabel }: Props) {
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("default");

  const filtered =
    mediaFilter === "all"
      ? items
      : items.filter((item) => item.media_type === mediaFilter);

  const sorted = useMemo(
    () => sortStatsItems(filtered, sortBy),
    [filtered, sortBy]
  );

  return (
    <Sheet open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="flex w-full max-w-lg flex-col gap-0 p-0">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"} -- {timeRangeLabel}
          </p>
        </SheetHeader>

        {/* Filter + view toggle row */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-3">
          <div className="flex gap-1.5">
            {(
              [
                { value: "all", label: "All" },
                { value: "movie", label: "Movies" },
                { value: "tv", label: "TV Shows" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMediaFilter(opt.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  mediaFilter === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOption)}
            >
              <SelectTrigger
                size="sm"
                className="w-auto border-[#1f1f1f] bg-transparent text-sm"
              >
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

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  viewMode === "grid"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  viewMode === "list"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {sorted.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">No items match</p>
            </div>
          ) : viewMode === "grid" ? (
            <GridView items={sorted} onClose={onClose} />
          ) : (
            <ListView items={sorted} onClose={onClose} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function GridView({ items, onClose }: { items: StatsItem[]; onClose: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item, i) => {
        const year = item.release_date ? +item.release_date.slice(0, 4) : null;
        const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.watchlist;

        return (
          <Link
            key={`${item.media_type}-${item.tmdb_id}-${i}`}
            href={`/media/${item.media_type}/${item.tmdb_id}`}
            onClick={onClose}
            className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-secondary"
          >
            {item.poster_path ? (
              <Image
                src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
                alt={item.title}
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                {item.media_type === "movie" ? (
                  <Film className="h-8 w-8 text-muted-foreground/40" />
                ) : (
                  <Tv className="h-8 w-8 text-muted-foreground/40" />
                )}
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <p className="line-clamp-2 text-xs font-medium text-white">
                {item.title}
              </p>
              {year && <p className="text-xs text-white/70">{year}</p>}
            </div>

            {/* Type badge */}
            <span
              className={cn(
                "absolute left-1.5 top-1.5 z-10 rounded px-1 py-0.5 text-[10px] font-medium text-white",
                item.media_type === "movie" ? "bg-blue-600" : "bg-purple-600"
              )}
            >
              {item.media_type === "movie" ? "Movie" : "TV"}
            </span>

            <CardBadges releaseDate={item.release_date} />

            {/* Status badge */}
            <span
              className={cn(
                "absolute bottom-0 left-0 right-0 z-10 rounded-b-lg py-0.5 text-center text-[10px] font-medium",
                badge.bg,
                badge.text
              )}
            >
              {badge.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function ListView({ items, onClose }: { items: StatsItem[]; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      {items.map((item, i) => {
        const year = item.release_date ? +item.release_date.slice(0, 4) : null;
        const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.watchlist;

        return (
          <Link
            key={`${item.media_type}-${item.tmdb_id}-${i}`}
            href={`/media/${item.media_type}/${item.tmdb_id}`}
            onClick={onClose}
            className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50"
          >
            <div className="relative h-[60px] w-10 flex-shrink-0 overflow-hidden rounded bg-[#1f1f1f]">
              {item.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                  alt={item.title}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="40px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary">
                  {item.media_type === "movie" ? (
                    <Film className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <Tv className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {year && (
                  <span className="text-xs text-muted-foreground">{year}</span>
                )}
                <span
                  className={cn(
                    "rounded px-1 py-0.5 text-[10px] font-medium text-white",
                    item.media_type === "movie" ? "bg-blue-600" : "bg-purple-600"
                  )}
                >
                  {item.media_type === "movie" ? "Movie" : "TV"}
                </span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    badge.bg,
                    badge.text
                  )}
                >
                  {badge.label}
                </span>
                <CardBadges variant="inline" releaseDate={item.release_date} />
              </div>
              {item.rating !== null && (
                <div className="mt-0.5 flex items-center gap-0.5">
                  <span className="text-xs text-yellow-400">&#9733;</span>
                  <span className="text-xs text-muted-foreground">
                    {(item.rating / 2).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
