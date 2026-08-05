import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeasonStat } from "@/lib/tmdb-episodes";

/**
 * Only the media_items columns the card and row surfaces actually render.
 * Deliberately excludes overview (long text), backdrop_path, runtime, genres
 * and director: fetching those across a whole library is pure wire cost.
 * Queries that do need them (stats, year in review) select them explicitly.
 */
export const MEDIA_ITEM_CARD_COLUMNS =
  "id, tmdb_id, media_type, title, poster_path, release_date, total_episodes";

export type MediaItemRow = {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  release_date: string | null;
  total_episodes: number | null;
};

export type UserMediaRow = {
  id: string;
  media_id: string;
  status: "watched" | "watching" | "watchlist";
  rating: number | null;
  watched_date: string | null;
  created_at: string;
  // Selected only by the single-item queries that need them, not by the
  // full-library list query.
  user_id?: string;
  notes?: string | null;
  is_favorite?: boolean;
  updated_at?: string;
  media_items: MediaItemRow;
  // Aired-episode progress, attached for TV rows only. See episodeProgress.
  watchedEpisodes?: number;
  totalEpisodes?: number;
};

/**
 * Progress through the episodes that have actually aired, so every bar in the
 * library means the same thing. Unaired seasons and the unaired tail of a
 * currently airing season are excluded from both sides.
 *
 * Shows finished before per-episode tracking existed carry no progress rows, so
 * a season that had aired when the user marked the show complete counts as
 * watched. That is the same rule new season detection uses, which keeps the bar
 * and the banner telling one story.
 */
function episodeProgress(
  row: UserMediaRow,
  stats: SeasonStat[] | undefined,
  watchedBySeason: Record<number, number>
): { watchedEpisodes: number; totalEpisodes: number } {
  const trackedTotal = Object.values(watchedBySeason).reduce((a, b) => a + b, 0);

  // No stored season data yet, which means nobody has opened this show's detail
  // page. Fall back to the all-time episode count rather than an empty bar.
  if (!stats || stats.length === 0) {
    return {
      watchedEpisodes: trackedTotal,
      totalEpisodes: row.media_items?.total_episodes ?? 0,
    };
  }

  let watchedEpisodes = 0;
  let totalEpisodes = 0;
  for (const season of stats) {
    totalEpisodes += season.aired_episodes;
    const tracked = watchedBySeason[season.season_number] ?? 0;
    if (tracked > 0) {
      // Clamp: stored counts can lag TMDB removing an episode.
      watchedEpisodes += Math.min(tracked, season.aired_episodes);
    } else if (
      row.status === "watched" &&
      row.watched_date &&
      season.air_date &&
      season.air_date <= row.watched_date
    ) {
      watchedEpisodes += season.aired_episodes;
    }
  }
  return { watchedEpisodes, totalEpisodes };
}

type LibraryFilters = {
  status?: "watched" | "watching" | "watchlist";
  sort?: "date_added" | "watched_date" | "rating" | "title";
  mediaType?: "movie" | "tv";
  limit?: number;
  offset?: number;
};

export async function getUserLibrary(
  supabase: SupabaseClient,
  userId: string,
  filters: LibraryFilters = {}
): Promise<UserMediaRow[]> {
  const { status, sort = "date_added", mediaType, limit, offset } = filters;

  let query = supabase
    .schema("batchflix")
    .from("user_media")
    .select(
      `id, media_id, status, rating, watched_date, created_at, media_items(${MEDIA_ITEM_CARD_COLUMNS})`
    )
    .eq("user_id", userId);

  if (status) {
    query = query.eq("status", status);
  }

  if (sort === "date_added") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "watched_date") {
    query = query.order("watched_date", { ascending: false, nullsFirst: false });
  } else if (sort === "rating") {
    query = query.order("rating", { ascending: false, nullsFirst: false });
  }
  // title sort handled in JS after fetch

  if (limit) query = query.limit(limit);
  if (offset) query = query.range(offset, offset + (limit ?? 50) - 1);

  const { data, error } = await query;
  if (error) throw error;

  // PostgREST types a to-one embed as an array; at runtime it is a single row.
  let rows = (data ?? []) as unknown as UserMediaRow[];

  // Filter by media type in JS -- PostgREST embedded resource filters can
  // return null media_items when the embedded join doesn't match, so we filter
  // after fetch to avoid runtime crashes.
  if (mediaType) {
    rows = rows.filter((row) => row.media_items?.media_type === mediaType);
  }

  if (sort === "title") {
    rows = rows.sort((a, b) =>
      a.media_items.title.localeCompare(b.media_items.title)
    );
  } else if (sort === "rating") {
    // Ensure nulls are last after DB sort (belt-and-suspenders)
    rows = rows.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  }

  // Attach TV episode progress counts
  const tvRows = rows.filter((r) => r.media_items?.media_type === "tv");
  if (tvRows.length > 0) {
    try {
      const mediaIds = tvRows.map((r) => r.media_id);
      // season_stats is fetched here rather than in the main select so its cost
      // falls only on TV rows, and only when there are any.
      const [{ data: progressData }, { data: statsData }] = await Promise.all([
        supabase
          .schema("batchflix")
          .from("tv_progress")
          .select("media_id, season_number")
          .eq("user_id", userId)
          .eq("watched", true)
          .in("media_id", mediaIds),
        supabase
          .schema("batchflix")
          .from("media_items")
          .select("id, season_stats")
          .in("id", mediaIds),
      ]);

      // Per season, so a season the user never tracked is distinguishable from
      // one they tracked and did not finish.
      const progressMap: Record<string, Record<number, number>> = {};
      for (const p of progressData ?? []) {
        const seasons = (progressMap[p.media_id] ??= {});
        seasons[p.season_number] = (seasons[p.season_number] ?? 0) + 1;
      }

      const statsMap: Record<string, SeasonStat[]> = {};
      for (const s of (statsData ?? []) as Array<{
        id: string;
        season_stats: SeasonStat[] | null;
      }>) {
        if (s.season_stats) statsMap[s.id] = s.season_stats;
      }

      rows = rows.map((r) =>
        r.media_items?.media_type === "tv"
          ? {
              ...r,
              ...episodeProgress(
                r,
                statsMap[r.media_id],
                progressMap[r.media_id] ?? {}
              ),
            }
          : r
      );
    } catch {
      // tv_progress table may not exist yet; silently skip
    }
  }

  return rows;
}

export async function getUserMediaItem(
  supabase: SupabaseClient,
  userId: string,
  mediaId: string
): Promise<UserMediaRow | null> {
  const { data, error } = await supabase
    .schema("batchflix")
    .from("user_media")
    .select(
      `id, user_id, media_id, status, rating, watched_date, notes, is_favorite, created_at, updated_at, media_items(${MEDIA_ITEM_CARD_COLUMNS})`
    )
    .eq("user_id", userId)
    .eq("media_id", mediaId)
    .maybeSingle();

  if (error) throw error;
  return data as UserMediaRow | null;
}

export async function getUserMediaByTmdbId(
  supabase: SupabaseClient,
  userId: string,
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<UserMediaRow | null> {
  const { data: mediaItem } = await supabase
    .schema("batchflix")
    .from("media_items")
    .select("id")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .maybeSingle();

  if (!mediaItem) return null;

  return getUserMediaItem(supabase, userId, mediaItem.id);
}
