"use client";

import { useState } from "react";
import Image from "next/image";
import type { StatsItem } from "@/lib/queries/stats";

/**
 * The only interactive part of the year in review card: it needs state to fall
 * back to an initial when the TMDB image fails. Kept in its own client module
 * so the surrounding card can render entirely on the server.
 */
export function PosterThumbnail({
  item,
  width,
  height,
}: {
  item: StatsItem;
  width: number;
  height: number;
}) {
  const [imgError, setImgError] = useState(false);

  if (!item.poster_path || imgError) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-md bg-[#1f1f1f] text-sm font-bold text-muted-foreground"
        style={{ width, height }}
      >
        {item.title[0]}
      </div>
    );
  }

  return (
    <Image
      src={`https://image.tmdb.org/t/p/w185${item.poster_path}`}
      alt={item.title}
      width={width}
      height={height}
      unoptimized
      className="shrink-0 rounded-md object-cover"
      onError={() => setImgError(true)}
    />
  );
}
