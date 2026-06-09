"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, Clapperboard } from "lucide-react";
import type { YearInReview } from "@/lib/queries/year-in-review";
import type { StatsItem } from "@/lib/queries/stats";

const MONTH_ABBREV = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function PosterThumbnail({
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
      src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
      alt={item.title}
      width={width}
      height={height}
      className="shrink-0 rounded-md object-cover"
      onError={() => setImgError(true)}
    />
  );
}

type Props = {
  data: YearInReview;
};

export function YearInReviewCard({ data }: Props) {
  const maxMonthCount = Math.max(
    ...data.monthlyBreakdown.map((m) => m.count),
    1
  );
  const bestMonthName = data.bestMonth?.month ?? null;
  const topGenreMax = data.topGenres[0]?.count ?? 1;

  return (
    <div className="relative mx-auto max-w-lg rounded-2xl border border-[#1f1f1f] bg-[#111111] p-4 md:max-w-2xl md:p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="text-6xl font-black tracking-tight text-[#2563EB] md:text-8xl">
          {data.year}
        </div>
        <div className="mt-1 text-lg font-light uppercase tracking-widest text-white md:text-2xl">
          Year in Review
        </div>
      </div>

      {/* Big numbers row */}
      <div className="mb-8 grid grid-cols-3 divide-x divide-[#1f1f1f]">
        <div className="px-2 text-center sm:px-4">
          <div className="text-4xl font-black text-white md:text-5xl">
            {data.totalItems}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            films &amp; shows
          </div>
        </div>
        <div className="px-2 text-center sm:px-4">
          <div className="text-4xl font-black text-[#2563EB] md:text-5xl">
            {data.totalHours}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            hours
          </div>
        </div>
        <div className="px-2 text-center sm:px-4">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-black text-white md:text-5xl">
              {data.avgRating !== null ? data.avgRating.toFixed(1) : "--"}
            </span>
            {data.avgRating !== null && (
              <span className="text-2xl font-black text-white md:text-3xl">
                ★
              </span>
            )}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
            avg rating
          </div>
        </div>
      </div>

      {/* Highlight row: top genre + best month */}
      <div className="mb-8 grid grid-cols-2 gap-4">
        {/* Top genre */}
        <div className="rounded-xl bg-[#0a0a0a] p-4">
          <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
            most watched genre
          </div>
          <div className="mb-3 text-xl font-bold leading-tight text-white md:text-3xl">
            {data.topGenre ?? "--"}
          </div>
          <div className="space-y-2">
            {data.topGenres.slice(0, 3).map((g, i) => (
              <div key={g.name} className="flex items-center gap-2">
                <div className="flex-1">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${(g.count / topGenreMax) * 100}%`,
                      backgroundColor: i === 0 ? "#2563EB" : "#374151",
                    }}
                  />
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {g.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Best month */}
        <div className="rounded-xl bg-[#0a0a0a] p-4">
          <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
            best month
          </div>
          <div className="mb-1 text-xl font-bold leading-tight text-white md:text-3xl">
            {data.bestMonth?.month ?? "--"}
          </div>
          {data.bestMonth && (
            <div className="mb-3 text-xs text-muted-foreground">
              {data.bestMonth.count} films &amp; shows
            </div>
          )}
          {/* Mini sparkline */}
          <div className="flex h-10 items-end gap-0.5">
            {data.monthlyBreakdown.map((m) => {
              const pct =
                maxMonthCount > 0 && m.count > 0
                  ? Math.max((m.count / maxMonthCount) * 100, 8)
                  : 0;
              const isPeak = m.month === bestMonthName;
              return (
                <div
                  key={m.month}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${pct}%`,
                    backgroundColor: isPeak
                      ? "#2563EB"
                      : m.count > 0
                        ? "#374151"
                        : "#1f1f1f",
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Highest rated */}
      {data.highestRated.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Star className="h-3 w-3" />
            Highest Rated
          </div>
          <div className="flex gap-3">
            {data.highestRated.map((item) => (
              <div
                key={`${item.tmdb_id}-${item.media_type}`}
                className="flex flex-col items-center gap-1"
              >
                <PosterThumbnail item={item} width={60} height={90} />
                <span className="text-xs text-[#2563EB]">
                  {item.rating !== null
                    ? `${(item.rating / 2).toFixed(1)}★`
                    : ""}
                </span>
                <span className="w-full break-words text-center text-[10px] leading-tight line-clamp-2 text-muted-foreground">
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Director spotlight */}
      {data.mostWatchedDirector && (
        <div className="mb-8 rounded-xl bg-[#0a0a0a] p-4">
          <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Director of the Year
          </div>
          <div className="text-2xl font-bold text-white">
            {data.mostWatchedDirector.name}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {data.mostWatchedDirector.count} films watched
          </div>
        </div>
      )}

      {/* Monthly heatmap */}
      <div className="mb-8">
        <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
          Watch Activity
        </div>
        <div className="grid grid-cols-6 gap-2">
          {data.monthlyBreakdown.map((m, i) => {
            const isPeak = m.month === bestMonthName;
            const opacity =
              maxMonthCount > 0 && m.count > 0
                ? 0.2 + (m.count / maxMonthCount) * 0.8
                : 0;
            return (
              <div
                key={m.month}
                className="flex min-h-[40px] flex-col items-center justify-center rounded-md py-2 text-center"
                style={{
                  backgroundColor: isPeak
                    ? "#2563EB"
                    : m.count > 0
                      ? `rgba(37, 99, 235, ${opacity})`
                      : "#1f1f1f",
                }}
              >
                <span className="text-[10px] text-muted-foreground">
                  {MONTH_ABBREV[i]}
                </span>
                <span className="text-sm font-bold text-white">{m.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* First and last watch */}
      {(data.firstWatch || data.lastWatch) && (
        <div className="mb-8 grid grid-cols-2 gap-4">
          {data.firstWatch && (
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                First Watch of {data.year}
              </div>
              <div className="flex items-center gap-3">
                <PosterThumbnail
                  item={data.firstWatch}
                  width={40}
                  height={60}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">
                    {data.firstWatch.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {data.firstWatch.watched_date
                      ? new Date(
                          data.firstWatch.watched_date + "T00:00:00"
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </div>
                </div>
              </div>
            </div>
          )}
          {data.lastWatch && (
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Last Watch of {data.year}
              </div>
              <div className="flex items-center gap-3">
                <PosterThumbnail
                  item={data.lastWatch}
                  width={40}
                  height={60}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">
                    {data.lastWatch.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {data.lastWatch.watched_date
                      ? new Date(
                          data.lastWatch.watched_date + "T00:00:00"
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Card footer */}
      <div className="mt-6 border-t border-[#1f1f1f] pt-4">
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Clapperboard className="h-3 w-3 text-[#2563EB]" />
          Tracked on BatchFlix &middot; batchflix.batch-apps.com
        </div>
      </div>

      {/* Watermark */}
      <div className="absolute bottom-3 right-4 text-xs text-muted-foreground/30">
        BatchFlix
      </div>
    </div>
  );
}
