"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Film, Tv } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { StatsItem } from "@/lib/queries/stats";

type MediaFilter = "all" | "movie" | "tv";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: StatsItem[];
  timeRangeLabel: string;
};

export function StatsDrawer({ isOpen, onClose, title, items, timeRangeLabel }: Props) {
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");

  const filtered =
    mediaFilter === "all"
      ? items
      : items.filter((item) => item.media_type === mediaFilter);

  return (
    <Sheet open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="flex w-full max-w-lg flex-col gap-0 p-0">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"} -- {timeRangeLabel}
          </p>
        </SheetHeader>

        {/* Media type filter */}
        <div className="flex gap-1.5 border-b border-border px-6 py-3">
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

        {/* Poster grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">No items match</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filtered.map((item, i) => {
                const year = item.release_date
                  ? +item.release_date.slice(0, 4)
                  : null;
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
                      {year && (
                        <p className="text-xs text-white/70">{year}</p>
                      )}
                    </div>

                    {/* Type badge */}
                    <span
                      className={cn(
                        "absolute left-1.5 top-1.5 z-10 rounded px-1 py-0.5 text-[10px] font-medium text-white",
                        item.media_type === "movie"
                          ? "bg-blue-600"
                          : "bg-purple-600"
                      )}
                    >
                      {item.media_type === "movie" ? "Movie" : "TV"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
