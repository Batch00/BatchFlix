"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, CalendarClock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/lib/toast";
import type { TMDBSeason } from "@/lib/tmdb";

type SeasonWithNewEpisodes = {
  season_number: number;
  newEpisodeCount: number;
};

type Props = {
  availableSeasons: TMDBSeason[];
  seasonsWithNewEpisodes: SeasonWithNewEpisodes[];
  upcomingSeasons: TMDBSeason[];
  tmdbId: number;
  mediaId: string;
};

/** Parse as a local date so the day never shifts across timezones. */
function formatAirDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return format(new Date(+y, +m - 1, +d), "MMM d, yyyy");
}

function formatSeasonList(seasons: TMDBSeason[]): string {
  if (seasons.length === 0) return "";
  if (seasons.length === 1) return `Season ${seasons[0].season_number}`;
  if (seasons.length === 2)
    return `Seasons ${seasons[0].season_number} and ${seasons[1].season_number}`;
  const last = seasons[seasons.length - 1].season_number;
  const rest = seasons.slice(0, -1).map((s) => s.season_number).join(", ");
  return `Seasons ${rest}, and ${last}`;
}

export function NewSeasonBanner({
  availableSeasons,
  seasonsWithNewEpisodes,
  upcomingSeasons,
  tmdbId,
  mediaId,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Only aired seasons can be continued. Upcoming ones are announcement only.
  const hasWatchableContent =
    availableSeasons.length > 0 || seasonsWithNewEpisodes.length > 0;

  if (!hasWatchableContent && upcomingSeasons.length === 0) return null;

  const allSeasonNumbers = [
    ...availableSeasons.map((s) => s.season_number),
    ...seasonsWithNewEpisodes.map((s) => s.season_number),
  ];

  async function handleContinue() {
    setLoading(true);
    try {
      const res = await fetch("/api/tv/continue-watching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId, tmdbId, seasons: allSeasonNumbers }),
      });
      if (!res.ok) throw new Error();
      const firstNew = availableSeasons[0] ?? seasonsWithNewEpisodes[0];
      toast.success(
        `Ready to continue -- Season ${firstNew.season_number} added to your progress`
      );
      router.refresh();
    } catch {
      toast.error("Could not update progress");
    } finally {
      setLoading(false);
    }
  }

  // Nothing to watch yet, so the banner is an announcement rather than a prompt
  if (!hasWatchableContent) {
    return (
      <div className="mt-6 rounded-xl border border-yellow-500/40 bg-[#2a2313] p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">
            <CalendarClock className="h-5 w-5 text-yellow-400" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Coming soon</p>
            <div className="mt-1 flex flex-col gap-0.5">
              {upcomingSeasons.map((s) =>
                s.air_date ? (
                  <p key={s.season_number} className="text-sm text-muted-foreground">
                    Season {s.season_number} arrives {formatAirDate(s.air_date)}
                  </p>
                ) : null
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-[#2563EB]/40 bg-[#1a2332] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <Sparkles className="h-5 w-5 text-[#2563EB]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            New content available
          </p>
          <div className="mt-1 flex flex-col gap-0.5">
            {availableSeasons.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {formatSeasonList(availableSeasons)}{" "}
                {availableSeasons.length === 1 ? "is" : "are"} now available
              </p>
            )}
            {seasonsWithNewEpisodes.map((s) => (
              <p key={s.season_number} className="text-sm text-muted-foreground">
                Season {s.season_number} has {s.newEpisodeCount} new{" "}
                {s.newEpisodeCount === 1 ? "episode" : "episodes"}
              </p>
            ))}
            {upcomingSeasons.map((s) =>
              s.air_date ? (
                <p
                  key={s.season_number}
                  className="text-xs text-muted-foreground/60"
                >
                  Season {s.season_number} arrives {formatAirDate(s.air_date)}
                </p>
              ) : null
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleContinue()}
          disabled={loading}
          className="flex-shrink-0 rounded-lg bg-[#2563EB] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Continue Watching"
          )}
        </button>
      </div>
    </div>
  );
}
