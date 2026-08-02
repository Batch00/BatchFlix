"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import type { TMDBSeason } from "@/lib/tmdb";

type SeasonWithNewEpisodes = {
  season_number: number;
  newEpisodeCount: number;
};

type Props = {
  availableSeasons: TMDBSeason[];
  seasonsWithNewEpisodes: SeasonWithNewEpisodes[];
  showTitle: string;
  tmdbId: number;
  mediaId: string;
};

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
  tmdbId,
  mediaId,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (availableSeasons.length === 0 && seasonsWithNewEpisodes.length === 0) return null;

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
