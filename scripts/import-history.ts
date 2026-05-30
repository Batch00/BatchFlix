import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse/sync";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const TMDB_BEARER = process.env.TMDB_BEARER_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TMDB_BEARER || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing required env vars: TMDB_BEARER_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function detectRatingScale(values: number[]): "5" | "10" {
  const max = Math.max(...values.filter((v) => !isNaN(v)));
  return max > 5 ? "10" : "5";
}

function normalizeRating(
  raw: string | number,
  scale: "5" | "10"
): number | null {
  const n = parseFloat(String(raw));
  if (isNaN(n) || n <= 0) return null;
  return scale === "5" ? Math.round(n * 2) : Math.round(n);
}

interface CsvRow {
  title?: string;
  year?: string;
  type?: string;
  rating?: string;
  watched_date?: string;
  notes?: string;
  [key: string]: string | undefined;
}

interface TmdbResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  popularity: number;
  media_type: "movie" | "tv";
}

async function searchTMDB(
  title: string,
  year?: string
): Promise<TmdbResult | null> {
  const params = new URLSearchParams({
    query: title,
    include_adult: "false",
    language: "en-US",
    page: "1",
  });
  if (year) params.set("year", year);

  const res = await fetch(
    `https://api.themoviedb.org/3/search/multi?${params}`,
    {
      headers: { Authorization: `Bearer ${TMDB_BEARER}` },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const results = (data.results as TmdbResult[]).filter(
    (r) => r.media_type === "movie" || r.media_type === "tv"
  );

  if (results.length === 0) return null;

  const titleLower = title.toLowerCase();

  // Prefer exact title match
  const exact = results.find((r) => {
    const t = (r.title ?? r.name ?? "").toLowerCase();
    return t === titleLower;
  });
  if (exact) return exact;

  // Prefer closest year if provided
  if (year) {
    const yearNum = parseInt(year, 10);
    const byYear = results
      .map((r) => {
        const dateStr = r.release_date ?? r.first_air_date ?? "";
        const rYear = dateStr ? new Date(dateStr).getFullYear() : 0;
        return { r, diff: Math.abs(rYear - yearNum) };
      })
      .sort((a, b) => a.diff - b.diff);
    if (byYear[0].diff <= 1) return byYear[0].r;
  }

  // Fall back to highest popularity
  results.sort((a, b) => b.popularity - a.popularity);
  return results[0];
}

async function upsertMediaItem(
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<string | null> {
  const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TMDB_BEARER}` },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const title =
    mediaType === "movie" ? data.title : (data.name ?? data.title ?? "");
  const releaseDate =
    mediaType === "movie" ? data.release_date : data.first_air_date;
  const runtime =
    mediaType === "movie"
      ? data.runtime
      : (data.episode_run_time?.[0] ?? null);
  const genres =
    data.genres?.map((g: { name: string }) => g.name).slice(0, 5) ?? [];

  const normalized = {
    tmdb_id: tmdbId,
    media_type: mediaType,
    title,
    overview: data.overview ?? null,
    poster_path: data.poster_path ?? null,
    backdrop_path: data.backdrop_path ?? null,
    release_date: releaseDate ?? null,
    runtime: runtime ?? null,
    genres,
  };

  const { data: item, error } = await supabase
    .schema("batchflix")
    .from("media_items")
    .upsert(normalized, { onConflict: "tmdb_id,media_type" })
    .select("id")
    .single();

  if (error) {
    console.error(`  Supabase error upserting media item: ${error.message}`);
    return null;
  }
  return item.id;
}

async function upsertUserMedia(
  userId: string,
  mediaItemId: string,
  rating: number | null,
  watchedDate: string | null,
  notes: string | null
) {
  const { error } = await supabase
    .schema("batchflix")
    .from("user_media")
    .upsert(
      {
        user_id: userId,
        media_id: mediaItemId,
        status: "watched",
        rating,
        watched_date: watchedDate || null,
        notes: notes || null,
      },
      { onConflict: "user_id,media_id" }
    );
  if (error) throw error;
}

async function main() {
  const csvPath = path.join(__dirname, "import-data.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at ${csvPath}`);
    console.error("Create scripts/import-data.csv before running this script.");
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const rows: CsvRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Detect user -- import as first user in the system
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError || !users?.users?.length) {
    console.error("Could not fetch users. Make sure SERVICE_ROLE_KEY is set.");
    process.exit(1);
  }
  const userId = users.users[0].id;
  console.log(`Importing for user: ${userId}`);

  // Detect rating scale
  const ratingValues = rows
    .map((r) => parseFloat(r.rating ?? ""))
    .filter((n) => !isNaN(n));
  const ratingScale = ratingValues.length ? detectRatingScale(ratingValues) : "10";
  console.log(`Detected rating scale: /${ratingScale}`);

  const skippedLog: string[] = [];
  let matched = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const title = row.title?.trim();
    if (!title) {
      skipped++;
      skippedLog.push(`Row ${i + 1}: no title`);
      continue;
    }

    const year = row.year?.trim();
    const mediaTypeHint = row.type?.trim().toLowerCase();
    console.log(`Processing ${i + 1}/${rows.length}: ${title}`);

    try {
      await sleep(200);
      const tmdbResult = await searchTMDB(title, year);

      if (!tmdbResult) {
        console.log(`  SKIPPED -- no TMDB match`);
        skipped++;
        skippedLog.push(`${title} (${year ?? "?"}): no TMDB match`);
        continue;
      }

      // If type hint doesn't match, still proceed but warn
      if (
        mediaTypeHint &&
        mediaTypeHint !== tmdbResult.media_type &&
        mediaTypeHint !== "movie" &&
        mediaTypeHint !== "tv"
      ) {
        console.log(`  Warning: type hint "${mediaTypeHint}" ignored`);
      }

      const resultTitle = tmdbResult.title ?? tmdbResult.name ?? title;
      console.log(
        `  matched: ${resultTitle} (${tmdbResult.media_type}, id: ${tmdbResult.id})`
      );

      await sleep(200);
      const mediaItemId = await upsertMediaItem(
        tmdbResult.id,
        tmdbResult.media_type
      );

      if (!mediaItemId) {
        console.log(`  SKIPPED -- could not upsert media item`);
        skipped++;
        skippedLog.push(`${title}: media item upsert failed`);
        continue;
      }

      const rating = normalizeRating(row.rating ?? "", ratingScale);
      const watchedDate = row.watched_date?.trim() || null;
      const notes = row.notes?.trim() || null;

      await upsertUserMedia(userId, mediaItemId, rating, watchedDate, notes);
      matched++;
    } catch (err) {
      console.error(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
      errors++;
    }
  }

  // Write skipped log
  if (skippedLog.length > 0) {
    const logPath = path.join(__dirname, "skipped.log");
    fs.writeFileSync(logPath, skippedLog.join("\n") + "\n");
    console.log(`\nSkipped items written to ${logPath}`);
  }

  console.log(`\n--- Import Summary ---`);
  console.log(`Total processed: ${rows.length}`);
  console.log(`Matched + imported: ${matched}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
