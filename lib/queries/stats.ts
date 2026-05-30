import type { SupabaseClient } from "@supabase/supabase-js";

export type TimeRange =
  | { type: "lifetime" }
  | { type: "year"; year: number }
  | { type: "last12months" };

export type GenreCount = { name: string; count: number };
export type DecadeCount = { decade: number; count: number };
export type RatingCount = { rating: number; count: number };
export type MonthlyCount = { year: number; month: number; count: number };

export type TopRatedItem = {
  id: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  rating: number;
  mediaType: "movie" | "tv";
};

export type StatsData = {
  totalCount: number;
  watchedCount: number;
  totalMinutes: number;
  avgRating: number | null;
  genreCounts: GenreCount[];
  decadeCounts: DecadeCount[];
  ratingDistribution: RatingCount[];
  monthlyWatched: MonthlyCount[];
  topRated: TopRatedItem[];
};

function getDateRange(
  range: TimeRange
): { from?: string; to?: string } {
  if (range.type === "lifetime") return {};

  if (range.type === "year") {
    return {
      from: `${range.year}-01-01`,
      to: `${range.year}-12-31`,
    };
  }

  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const fromDate = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate()
  );
  return { from: fromDate.toISOString().slice(0, 10), to };
}

type RawRow = {
  id: string;
  status: "watched" | "watching" | "watchlist";
  rating: number | null;
  watched_date: string | null;
  media_items: {
    tmdb_id: number;
    title: string;
    poster_path: string | null;
    release_date: string | null;
    runtime: number | null;
    genres: Array<{ id: number; name: string }>;
    media_type: "movie" | "tv";
  };
};

export async function getStatsData(
  supabase: SupabaseClient,
  userId: string,
  range: TimeRange
): Promise<StatsData> {
  let query = supabase
    .schema("batchflix")
    .from("user_media")
    .select(
      "id, status, rating, watched_date, media_items(tmdb_id, title, poster_path, release_date, runtime, genres, media_type)"
    )
    .eq("user_id", userId);

  const { from, to } = getDateRange(range);
  if (from) query = query.gte("watched_date", from);
  if (to) query = query.lte("watched_date", to);

  const { data, error } = await query;
  if (error) throw error;

  const allItems = (data ?? []) as unknown as RawRow[];

  const totalCount = allItems.length;
  const watchedCount = allItems.filter((r) => r.status === "watched").length;

  const totalMinutes = allItems
    .filter((r) => r.status === "watched")
    .reduce((sum, r) => sum + (r.media_items?.runtime ?? 0), 0);

  const ratedItems = allItems.filter((r) => r.rating !== null);
  const avgRating =
    ratedItems.length > 0
      ? ratedItems.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
        ratedItems.length
      : null;

  // Genre aggregation
  const genreMap = new Map<string, number>();
  for (const row of allItems) {
    const genres = row.media_items?.genres ?? [];
    for (const g of genres) {
      genreMap.set(g.name, (genreMap.get(g.name) ?? 0) + 1);
    }
  }
  const genreCounts = Array.from(genreMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Decade aggregation
  const decadeMap = new Map<number, number>();
  for (const row of allItems) {
    const releaseDate = row.media_items?.release_date;
    if (!releaseDate) continue;
    const year = new Date(releaseDate).getFullYear();
    if (isNaN(year)) continue;
    const decade = Math.floor(year / 10) * 10;
    decadeMap.set(decade, (decadeMap.get(decade) ?? 0) + 1);
  }
  const decadeCounts = Array.from(decadeMap.entries())
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => a.decade - b.decade);

  // Rating distribution (1-10 stored in DB)
  const ratingMap = new Map<number, number>();
  for (const row of allItems) {
    if (row.rating !== null) {
      ratingMap.set(row.rating, (ratingMap.get(row.rating) ?? 0) + 1);
    }
  }
  const ratingDistribution = Array.from(ratingMap.entries())
    .map(([rating, count]) => ({ rating, count }))
    .sort((a, b) => a.rating - b.rating);

  // Monthly watched heatmap
  const monthMap = new Map<string, { year: number; month: number; count: number }>();
  for (const row of allItems) {
    if (row.status !== "watched" || !row.watched_date) continue;
    const d = new Date(row.watched_date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${month}`;
    const existing = monthMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      monthMap.set(key, { year, month, count: 1 });
    }
  }
  const monthlyWatched = Array.from(monthMap.values()).sort(
    (a, b) => a.year * 100 + a.month - (b.year * 100 + b.month)
  );

  // Top rated
  const topRated = allItems
    .filter((r) => r.rating !== null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      tmdbId: r.media_items.tmdb_id,
      title: r.media_items.title,
      posterPath: r.media_items.poster_path,
      releaseDate: r.media_items.release_date,
      rating: r.rating!,
      mediaType: r.media_items.media_type,
    }));

  return {
    totalCount,
    watchedCount,
    totalMinutes,
    avgRating,
    genreCounts,
    decadeCounts,
    ratingDistribution,
    monthlyWatched,
    topRated,
  };
}

export function parseTimeRange(range: string | undefined): TimeRange {
  if (!range || range === "lifetime") return { type: "lifetime" };
  if (range === "last12") return { type: "last12months" };
  const year = parseInt(range, 10);
  if (!isNaN(year) && year >= 1900 && year <= 2100)
    return { type: "year", year };
  return { type: "lifetime" };
}
