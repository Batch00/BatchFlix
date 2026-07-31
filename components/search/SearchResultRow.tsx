"use client";

import Image from "next/image";
import { Film, Tv, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TMDBSearchMultiResult } from "@/lib/tmdb";

type Props = {
  result: TMDBSearchMultiResult;
  inLibrary: boolean;
  highlighted: boolean;
  onClick: () => void;
};

export function SearchResultRow({
  result,
  inLibrary,
  highlighted,
  onClick,
}: Props) {
  const title = result.title ?? result.name ?? "Untitled";
  const dateStr = result.release_date ?? result.first_air_date ?? "";
  const year = dateStr ? +dateStr.slice(0, 4) : null;
  const isMovie = result.media_type === "movie";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
        highlighted ? "bg-[#1a1a1a]" : "hover:bg-[#1a1a1a]"
      )}
    >
      <div className="relative h-[60px] w-10 flex-shrink-0 overflow-hidden rounded bg-[#1f1f1f]">
        {result.poster_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w185${result.poster_path}`}
            alt={title}
            fill
            unoptimized
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            {isMovie ? (
              <Film className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Tv className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          {year && (
            <span className="text-xs text-muted-foreground">{year}</span>
          )}
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            {isMovie ? "Movie" : "TV"}
          </span>
        </div>
      </div>

      {inLibrary && (
        <Check className="h-4 w-4 flex-shrink-0 text-primary" />
      )}
    </button>
  );
}
