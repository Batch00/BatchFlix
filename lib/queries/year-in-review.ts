import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeGenre, type StatsItem } from "./stats";

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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface YearInReview {
  year: number;
  totalItems: number;
  totalMovies: number;
  totalShows: number;
  totalHours: number;
  totalMinutes: number;
  avgRating: number | null;
  topGenre: string | null;
  topGenres: { name: string; count: number }[];
  bestMonth: { month: string; count: number } | null;
  monthlyBreakdown: { month: string; count: number }[];
  highestRated: StatsItem[];
  mostWatchedDirector: { name: string; count: number } | null;
  topDecade: string | null;
  firstWatch: StatsItem | null;
  lastWatch: StatsItem | null;
  ratingDistribution: { label: string; count: number }[];
}

type RawRow = {
  status: string;
  rating: number | null;
  watched_date: string | null;
  media_items: {
    tmdb_id: number;
    title: string;
    poster_path: string | null;
    release_date: string | null;
    runtime: number | null;
    genres: unknown;
    media_type: "movie" | "tv";
    director: string | null;
  };
};

export async function getYearInReview(
  supabase: SupabaseClient,
  userId: string,
  year: number
): Promise<YearInReview> {
  const { data, error } = await supabase
    .schema("batchflix")
    .from("user_media")
    .select(
      "status, rating, watched_date, media_items(tmdb_id, title, poster_path, release_date, runtime, genres, media_type, director)"
    )
    .eq("user_id", userId)
    .eq("status", "watched")
    .gte("watched_date", `${year}-01-01`)
    .lte("watched_date", `${year}-12-31`);

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawRow[];

  const totalItems = rows.length;
  const totalMovies = rows.filter((r) => r.media_items?.media_type === "movie").length;
  const totalShows = rows.filter((r) => r.media_items?.media_type === "tv").length;

  const totalMinutes = rows.reduce((sum, r) => sum + (r.media_items?.runtime ?? 0), 0);
  const totalHours = Math.round(totalMinutes / 60);

  const ratedItems = rows.filter((r) => r.rating !== null);
  const avgRating =
    ratedItems.length > 0
      ? Math.round(
          (ratedItems.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
            ratedItems.length /
            2) *
            10
        ) / 10
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
  const topGenres = Array.from(genreMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const topGenre = topGenres[0]?.name ?? null;

  // Monthly breakdown (all 12 months, 0-filled)
  const monthMap = new Map<number, number>();
  for (let i = 1; i <= 12; i++) monthMap.set(i, 0);
  for (const row of rows) {
    if (!row.watched_date) continue;
    const month = +row.watched_date.split("T")[0].split("-")[1];
    if (month >= 1 && month <= 12) {
      monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
    }
  }
  const monthlyBreakdown = Array.from(monthMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([m, count]) => ({ month: MONTH_NAMES[m - 1], count }));

  const bestMonth =
    monthlyBreakdown.reduce<{ month: string; count: number } | null>(
      (best, cur) => (cur.count > (best?.count ?? -1) ? cur : best),
      null
    ) ?? null;
  const bestMonthResult =
    bestMonth && bestMonth.count > 0 ? bestMonth : null;

  // Highest rated (top 5)
  const toStatsItem = (r: RawRow): StatsItem => ({
    tmdb_id: r.media_items.tmdb_id,
    media_type: r.media_items.media_type,
    title: r.media_items.title,
    poster_path: r.media_items.poster_path,
    release_date: r.media_items.release_date,
    rating: r.rating,
    watched_date: r.watched_date,
    genres: parseGenres(r.media_items?.genres),
    status: "watched",
  });

  const highestRated = rows
    .filter((r) => r.rating !== null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5)
    .map(toStatsItem);

  // Most watched director
  const directorMap = new Map<string, number>();
  for (const row of rows) {
    const dir = row.media_items?.director;
    if (dir) directorMap.set(dir, (directorMap.get(dir) ?? 0) + 1);
  }
  const topDirector = Array.from(directorMap.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const mostWatchedDirector =
    topDirector && topDirector[1] >= 2
      ? { name: topDirector[0], count: topDirector[1] }
      : null;

  // Top decade
  const decadeMap = new Map<number, number>();
  for (const row of rows) {
    const rd = row.media_items?.release_date;
    if (!rd) continue;
    const y = +rd.slice(0, 4);
    if (isNaN(y)) continue;
    const decade = Math.floor(y / 10) * 10;
    decadeMap.set(decade, (decadeMap.get(decade) ?? 0) + 1);
  }
  const topDecadeEntry = Array.from(decadeMap.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const topDecade = topDecadeEntry ? `${topDecadeEntry[0]}s` : null;

  // First and last watch
  const sortedByDate = [...rows]
    .filter((r) => r.watched_date)
    .sort((a, b) => (a.watched_date! < b.watched_date! ? -1 : 1));

  const firstWatch =
    sortedByDate.length > 0 ? toStatsItem(sortedByDate[0]) : null;
  const lastWatch =
    sortedByDate.length > 1
      ? toStatsItem(sortedByDate[sortedByDate.length - 1])
      : null;

  // Rating distribution (DB stores 1-10, display as 0.5-5.0)
  const ratingDistMap = new Map<number, number>();
  for (const row of rows) {
    if (row.rating !== null)
      ratingDistMap.set(row.rating, (ratingDistMap.get(row.rating) ?? 0) + 1);
  }
  const ratingDistribution = Array.from(ratingDistMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([rating, count]) => ({ label: `${rating / 2}★`, count }));

  return {
    year,
    totalItems,
    totalMovies,
    totalShows,
    totalHours,
    totalMinutes,
    avgRating,
    topGenre,
    topGenres,
    bestMonth: bestMonthResult,
    monthlyBreakdown,
    highestRated,
    mostWatchedDirector,
    topDecade,
    firstWatch,
    lastWatch,
    ratingDistribution,
  };
}

export async function getWatchedYears(
  supabase: SupabaseClient,
  userId: string
): Promise<number[]> {
  const { data } = await supabase
    .schema("batchflix")
    .from("user_media")
    .select("watched_date")
    .eq("user_id", userId)
    .eq("status", "watched")
    .not("watched_date", "is", null);

  if (!data) return [];

  const yearSet = new Set<number>();
  for (const row of data as { watched_date: string | null }[]) {
    if (!row.watched_date) continue;
    const y = +row.watched_date.slice(0, 4);
    if (!isNaN(y)) yearSet.add(y);
  }

  return Array.from(yearSet).sort((a, b) => a - b);
}
