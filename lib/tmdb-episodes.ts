import { createAdminClient } from "@/lib/supabase/admin";

/** Today as a local YYYY-MM-DD string, comparable against TMDB air_date values. */
export function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** An air_date has aired when it is present and not in the future. */
export function hasAired(airDate: string | null | undefined, today: string): boolean {
  return !!airDate && airDate <= today;
}

/**
 * Count the episodes of a season that have actually aired. A season's
 * episode_count includes episodes still to come, so a mid-flight season needs
 * the per-episode dates. Returns null when the season cannot be read, letting
 * callers decline to surface it rather than guess.
 */
export async function countAiredEpisodes(
  tmdbId: number,
  seasonNumber: number,
  today: string
): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}`,
      {
        headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      episodes?: Array<{ air_date: string | null }>;
    };
    if (!data.episodes) return null;
    return data.episodes.filter((ep) => hasAired(ep.air_date, today)).length;
  } catch {
    return null;
  }
}

export type SeasonStat = {
  season_number: number;
  air_date: string | null;
  aired_episodes: number;
  /**
   * TMDB's total for the season, including episodes still to come. A season
   * with fewer aired than total is still releasing weekly. Optional because
   * rows written before this field existed do not carry it: absent means
   * unknown, never zero.
   */
  episode_count?: number;
};

/**
 * Per-season aired episode counts, stored on media_items so surfaces that must
 * not call TMDB (the library grid) can still measure progress against episodes
 * that exist. Only the most recent aired season can be mid-flight, so it is the
 * only one worth spending a per-episode fetch on.
 */
export async function buildSeasonStats(
  tmdbId: number,
  seasons: Array<{
    season_number: number;
    air_date: string | null;
    episode_count: number;
  }>,
  today: string
): Promise<SeasonStat[]> {
  const numbered = seasons.filter((s) => s.season_number > 0);
  const latestAired = numbered
    .filter((s) => hasAired(s.air_date, today))
    .reduce<number | null>(
      (max, s) => (max === null || s.season_number > max ? s.season_number : max),
      null
    );

  const latestAiredCount =
    latestAired === null
      ? null
      : await countAiredEpisodes(tmdbId, latestAired, today);

  return numbered.map((s) => {
    if (!hasAired(s.air_date, today)) {
      return {
        season_number: s.season_number,
        air_date: s.air_date,
        aired_episodes: 0,
        episode_count: s.episode_count,
      };
    }
    return {
      season_number: s.season_number,
      air_date: s.air_date,
      aired_episodes:
        s.season_number === latestAired && latestAiredCount !== null
          ? Math.min(latestAiredCount, s.episode_count)
          : s.episode_count,
      episode_count: s.episode_count,
    };
  });
}

export async function markAllEpisodesWatched(
  userId: string,
  mediaId: string,
  tmdbId: number,
  watchedDate: string | null
): Promise<void> {
  console.log("[markAllEpisodesWatched] called", { userId, mediaId, tmdbId });
  const today = todayLocalDate();
  const dateStr = watchedDate ?? today;

  const showRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}`, {
    headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` },
  });
  if (!showRes.ok) return;

  const show = (await showRes.json()) as {
    seasons?: Array<{ season_number: number; air_date: string | null }>;
  };
  // Skip specials and any season that has not aired yet -- unaired episodes must
  // never be marked watched, otherwise new season detection is suppressed.
  const seasons = (show.seasons ?? []).filter(
    (s) => s.season_number > 0 && hasAired(s.air_date, today)
  );
  if (seasons.length === 0) return;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  await Promise.all(
    seasons.map(async (season) => {
      const epRes = await fetch(
        `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season.season_number}`,
        { headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` } }
      );
      if (!epRes.ok) return;

      const epData = (await epRes.json()) as {
        episodes?: Array<{ episode_number: number; air_date: string | null }>;
      };
      // Within an aired season, individual episodes may still be unaired.
      const episodes = (epData.episodes ?? []).filter((ep) =>
        hasAired(ep.air_date, today)
      );
      if (episodes.length === 0) return;

      const rows = episodes.map((ep) => ({
        user_id: userId,
        media_id: mediaId,
        season_number: season.season_number,
        episode_number: ep.episode_number,
        watched: true,
        watched_date: dateStr,
        updated_at: now,
      }));

      await admin
        .schema("batchflix")
        .from("tv_progress")
        .upsert(rows, {
          onConflict: "user_id,media_id,season_number,episode_number",
        });
    })
  );
}

/**
 * Delete tv_progress rows belonging to seasons that have not aired yet.
 * Repairs data written before the air-date guard existed. Returns rows removed.
 */
export async function purgeUnairedProgress(
  userId: string,
  mediaId: string,
  unairedSeasonNumbers: number[]
): Promise<number> {
  if (unairedSeasonNumbers.length === 0) return 0;

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("batchflix")
    .from("tv_progress")
    .delete()
    .eq("user_id", userId)
    .eq("media_id", mediaId)
    .in("season_number", unairedSeasonNumbers)
    .select("id");

  if (error) return 0;
  return data?.length ?? 0;
}

/**
 * Delete watched rows for a season that first aired after the user marked the
 * show complete. The season did not exist when they finished the show, so the
 * rows can only be bulk-mark artifacts. Air date alone cannot tell them apart
 * from real history any more, now that the season has aired. Returns rows removed.
 */
export async function purgeProgressAiredAfterWatched(
  userId: string,
  mediaId: string,
  seasonNumber: number
): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("batchflix")
    .from("tv_progress")
    .delete()
    .eq("user_id", userId)
    .eq("media_id", mediaId)
    .eq("season_number", seasonNumber)
    .eq("watched", true)
    .select("id");

  if (error) return 0;
  return data?.length ?? 0;
}
