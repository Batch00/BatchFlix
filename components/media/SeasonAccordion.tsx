"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/library/StarRating";
import { toast } from "@/lib/toast";
import type { TMDBSeason, TMDBEpisode } from "@/lib/tmdb";

type ProgressState = {
  watched: boolean;
  watched_date: string | null;
  rating: number | null;
};

type InitialProgressRow = {
  season_number: number;
  episode_number: number;
  watched: boolean;
  watched_date: string | null;
  rating: number | null;
};

type Props = {
  tmdbId: number;
  mediaId: string;
  seasons: TMDBSeason[];
  initialProgress: InitialProgressRow[];
  userId: string | null;
  isShowWatched: boolean;
};

function progressKey(season: number, episode: number) {
  return `${season}-${episode}`;
}

function formatEpCode(season: number, episode: number) {
  return `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
}

function formatAirDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return format(new Date(+y, +m - 1, +d), "MMM d, yyyy");
}

export function SeasonAccordion({
  tmdbId,
  mediaId,
  seasons,
  initialProgress,
  userId,
  isShowWatched,
}: Props) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [episodeCache, setEpisodeCache] = useState<Record<number, TMDBEpisode[]>>({});
  const [loadingSeasons, setLoadingSeasons] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<Record<string, ProgressState>>(() => {
    const map: Record<string, ProgressState> = {};
    for (const row of initialProgress) {
      map[progressKey(row.season_number, row.episode_number)] = {
        watched: row.watched,
        watched_date: row.watched_date,
        rating: row.rating,
      };
    }
    return map;
  });

  async function fetchSeason(seasonNumber: number) {
    if (episodeCache[seasonNumber] || loadingSeasons.has(seasonNumber)) return;
    setLoadingSeasons((prev) => new Set(prev).add(seasonNumber));
    try {
      const res = await fetch(`/api/tmdb/tv/${tmdbId}/season/${seasonNumber}`);
      if (res.ok) {
        const data = await res.json() as { episodes?: TMDBEpisode[] };
        setEpisodeCache((prev) => ({
          ...prev,
          [seasonNumber]: data.episodes ?? [],
        }));
      }
    } finally {
      setLoadingSeasons((prev) => {
        const next = new Set(prev);
        next.delete(seasonNumber);
        return next;
      });
    }
  }

  function handleToggleSeason(seasonNumber: number) {
    if (expandedSeason === seasonNumber) {
      setExpandedSeason(null);
    } else {
      setExpandedSeason(seasonNumber);
      void fetchSeason(seasonNumber);
    }
  }

  const handleToggleEpisode = useCallback(
    async (seasonNumber: number, episodeNumber: number, watched: boolean) => {
      if (!userId) return;
      const key = progressKey(seasonNumber, episodeNumber);
      const prev = progress[key];
      setProgress((p) => ({
        ...p,
        [key]: { watched, watched_date: prev?.watched_date ?? null, rating: prev?.rating ?? null },
      }));
      try {
        const res = await fetch("/api/tv-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId, seasonNumber, episodeNumber, watched }),
        });
        if (!res.ok) throw new Error();
      } catch {
        setProgress((p) => ({ ...p, [key]: prev ?? { watched: !watched, watched_date: null, rating: null } }));
        toast.error("Could not save progress");
      }
    },
    [mediaId, progress, userId]
  );

  const handleRateEpisode = useCallback(
    async (seasonNumber: number, episodeNumber: number, rating: number) => {
      if (!userId) return;
      const key = progressKey(seasonNumber, episodeNumber);
      const prev = progress[key];
      setProgress((p) => ({
        ...p,
        [key]: { ...(prev ?? { watched: true, watched_date: null }), rating },
      }));
      try {
        await fetch("/api/tv-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId, seasonNumber, episodeNumber, watched: true, rating }),
        });
      } catch {
        setProgress((p) => ({ ...p, [key]: prev ?? { watched: true, watched_date: null, rating: null } }));
      }
    },
    [mediaId, progress, userId]
  );

  async function handleMarkAllSeason(season: TMDBSeason, watched: boolean) {
    if (!userId) return;
    const episodes = episodeCache[season.season_number];
    if (!episodes) return;
    const epNumbers = episodes.map((e) => e.episode_number);

    // Optimistic update
    setProgress((p) => {
      const next = { ...p };
      for (const ep of epNumbers) {
        const key = progressKey(season.season_number, ep);
        next[key] = {
          watched,
          watched_date: p[key]?.watched_date ?? null,
          rating: p[key]?.rating ?? null,
        };
      }
      return next;
    });

    try {
      const res = await fetch("/api/tv-progress/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId,
          seasonNumber: season.season_number,
          episodes: epNumbers,
          watched,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(watched ? `Season ${season.season_number} marked watched` : `Season ${season.season_number} unmarked`);
    } catch {
      // Revert optimistic update
      setProgress((p) => {
        const next = { ...p };
        for (const ep of epNumbers) {
          const key = progressKey(season.season_number, ep);
          next[key] = { watched: !watched, watched_date: null, rating: null };
        }
        return next;
      });
      toast.error("Could not update season");
    }
  }

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        Seasons &amp; Episodes
      </h2>
      <div className="flex flex-col gap-2">
        {seasons.map((season) => {
          const isExpanded = expandedSeason === season.season_number;
          const episodes = episodeCache[season.season_number] ?? [];
          const isLoading = loadingSeasons.has(season.season_number);
          const watchedCount = Array.from(
            { length: season.episode_count },
            (_, i) => i + 1
          ).filter((ep) => {
            const epProg = progress[progressKey(season.season_number, ep)];
            return epProg ? epProg.watched : isShowWatched;
          }).length;
          const total = season.episode_count;
          const pct = total > 0 ? (watchedCount / total) * 100 : 0;
          const seasonIsUpcoming = !!season.air_date && season.air_date > todayStr;

          return (
            <div
              key={season.season_number}
              className="rounded-lg border border-border bg-card"
            >
              {/* Season header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleToggleSeason(season.season_number)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground text-sm">
                        {season.name}
                      </span>
                      <span className="flex-shrink-0 text-xs text-muted-foreground">
                        {watchedCount} / {total} ep
                      </span>
                    </div>
                    {season.air_date && (
                      <p className="text-xs text-muted-foreground/60">
                        {seasonIsUpcoming ? "Premieres" : "Premiered"} {formatAirDate(season.air_date)}
                      </p>
                    )}
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-[#2563EB] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  )}
                </button>

                {userId && isExpanded && episodes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleMarkAllSeason(season, watchedCount < total)}
                    title={watchedCount < total ? "Mark all watched" : "Mark all unwatched"}
                    className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Episodes */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-2">
                  {isLoading ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Loading episodes...
                    </p>
                  ) : episodes.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No episodes found
                    </p>
                  ) : (
                    <div className="flex flex-col divide-y divide-border/50">
                      {episodes.map((ep) => {
                        const key = progressKey(season.season_number, ep.episode_number);
                        const epProgress = progress[key];
                        const isWatched = epProgress ? epProgress.watched : isShowWatched;
                        const isUpcoming = !!ep.air_date && ep.air_date > todayStr;

                        return (
                          <div
                            key={ep.episode_number}
                            className="flex items-start gap-3 py-2.5"
                          >
                            <input
                              type="checkbox"
                              checked={isWatched}
                              disabled={!userId || isUpcoming}
                              onChange={(e) =>
                                void handleToggleEpisode(
                                  season.season_number,
                                  ep.episode_number,
                                  e.target.checked
                                )
                              }
                              className={cn(
                                "mt-0.5 h-4 w-4 flex-shrink-0 rounded border-border accent-[#2563EB]",
                                isUpcoming && "cursor-not-allowed opacity-30"
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {formatEpCode(season.season_number, ep.episode_number)}
                                  </span>
                                  <span className={cn("ml-2 text-sm", isWatched && !isUpcoming ? "text-foreground" : "text-muted-foreground")}>
                                    {ep.name}
                                  </span>
                                </div>
                                {isWatched && !isUpcoming && (
                                  <div className="flex-shrink-0">
                                    <StarRating
                                      interactive
                                      rating={epProgress?.rating ?? 0}
                                      onChange={(val) =>
                                        void handleRateEpisode(
                                          season.season_number,
                                          ep.episode_number,
                                          val
                                        )
                                      }
                                      size={12}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                {ep.air_date ? (
                                  <>
                                    <span className="text-xs text-muted-foreground/60">
                                      {formatAirDate(ep.air_date)}
                                    </span>
                                    {isUpcoming && (
                                      <span className="rounded px-1 py-0.5 text-[10px] bg-yellow-900/60 text-yellow-300">
                                        Upcoming
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground/60">TBA</span>
                                )}
                                {ep.runtime && ep.runtime > 0 && (
                                  <span className="text-xs text-muted-foreground/60">
                                    {ep.runtime}m
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
