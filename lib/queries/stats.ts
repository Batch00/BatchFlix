import type { SupabaseClient } from "@supabase/supabase-js";
import { parseISO } from "date-fns";

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const GENRE_NORMALIZE: Record<string, string> = {
  "Science Fiction": "Sci-Fi",
  "Sci-Fi & Fantasy": "Sci-Fi",
  "Action & Adventure": "Action",
  "War & Politics": "War",
};

export function normalizeGenre(name: string): string {
  return GENRE_NORMALIZE[name] ?? name;
}

function parseGenres(raw: unknown): Array<{ id: number; name: string }> {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw as Array<{ id: number; name: string }>;
}

export type TimeRange =
  | { type: "lifetime" }
  | { type: "year"; year: number }
  | { type: "last12months" };

export type GenreCount = { name: string; count: number };
export type DecadeCount = { decade: number; count: number };
export type RatingCount = { rating: number; count: number };
export type MonthlyCount = { year: number; month: number; count: number };

export type StatsItem = {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  release_date: string | null;
  rating: number | null;
  watched_date: string | null;
  genres: Array<{ id: number; name: string }>;
  status: string;
};

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
  allItems: StatsItem[];
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
  const to = localDateStr(now);
  const fromDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  return { from: localDateStr(fromDate), to };
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

  const rows = (data ?? []) as unknown as RawRow[];

  const totalCount = rows.length;
  const watchedCount = rows.filter((r) => r.status === "watched").length;

  const totalMinutes = rows
    .filter((r) => r.status === "watched")
    .reduce((sum, r) => sum + (r.media_items?.runtime ?? 0), 0);

  const ratedItems = rows.filter((r) => r.rating !== null);
  const avgRating =
    ratedItems.length > 0
      ? ratedItems.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
        ratedItems.length
      : null;

  // Genre aggregation
  const genreMap = new Map<string, number>();
  for (const row of rows) {
    const genres = parseGenres(row.media_items?.genres);
    for (const g of genres) {
      if (!g.name) continue;
      const name = normalizeGenre(g.name);
      genreMap.set(name, (genreMap.get(name) ?? 0) + 1);
    }
  }
  const genreCounts = Array.from(genreMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Decade aggregation (movies only)
  const decadeMap = new Map<number, number>();
  for (const row of rows) {
    if (row.media_items?.media_type !== "movie") continue;
    const releaseDate = row.media_items?.release_date;
    if (!releaseDate) continue;
    const year = +releaseDate.slice(0, 4);
    if (isNaN(year)) continue;
    const decade = Math.floor(year / 10) * 10;
    decadeMap.set(decade, (decadeMap.get(decade) ?? 0) + 1);
  }
  const decadeCounts = Array.from(decadeMap.entries())
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => a.decade - b.decade);

  // Rating distribution (1-10 stored in DB)
  const ratingMap = new Map<number, number>();
  for (const row of rows) {
    if (row.rating !== null) {
      ratingMap.set(row.rating, (ratingMap.get(row.rating) ?? 0) + 1);
    }
  }
  const ratingDistribution = Array.from(ratingMap.entries())
    .map(([rating, count]) => ({ rating, count }))
    .sort((a, b) => a.rating - b.rating);

  // Monthly watched heatmap
  const monthMap = new Map<string, { year: number; month: number; count: number }>();
  for (const row of rows) {
    if (row.status !== "watched" || !row.watched_date) continue;
    const d = parseISO(row.watched_date);
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
  const topRated = rows
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

  const allItems: StatsItem[] = rows.map((r) => ({
    tmdb_id: r.media_items.tmdb_id,
    media_type: r.media_items.media_type,
    title: r.media_items.title,
    poster_path: r.media_items.poster_path,
    release_date: r.media_items.release_date,
    rating: r.rating,
    watched_date: r.watched_date,
    genres: parseGenres(r.media_items?.genres),
    status: r.status,
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
    allItems,
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
