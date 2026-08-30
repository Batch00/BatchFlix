import * as path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { buildSeasonStats, todayLocalDate } from "@/lib/tmdb-episodes";

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

interface TvRow {
  id: string;
  tmdb_id: number;
  title: string;
}

interface TmdbSeason {
  season_number: number;
  air_date: string | null;
  episode_count: number;
}

async function fetchSeasons(tmdbId: number): Promise<TmdbSeason[] | null> {
  const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}`, {
    headers: { Authorization: `Bearer ${TMDB_BEARER}` },
  });
  if (!res.ok) return null;

  const data = await res.json();
  return (data.seasons ?? []) as TmdbSeason[];
}

async function main() {
  const { data, error } = await supabase
    .schema("batchflix")
    .from("media_items")
    .select("id, tmdb_id, title")
    .eq("media_type", "tv")
    .order("title");

  if (error) {
    console.error(`Could not read media_items: ${error.message}`);
    process.exit(1);
  }

  const rows = (data ?? []) as TvRow[];
  const today = todayLocalDate();
  console.log(`Backfilling season_stats for ${rows.length} TV shows (today: ${today})`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    console.log(`Processing ${i + 1}/${rows.length}: ${row.title}`);

    try {
      await sleep(250);
      const seasons = await fetchSeasons(row.tmdb_id);

      if (!seasons) {
        console.log(`  SKIPPED -- TMDB lookup failed for id ${row.tmdb_id}`);
        skipped++;
        continue;
      }

      // buildSeasonStats spends one more TMDB call on the latest aired season.
      const stats = await buildSeasonStats(row.tmdb_id, seasons, today);

      if (stats.length === 0) {
        console.log(`  SKIPPED -- no numbered seasons`);
        skipped++;
        continue;
      }

      const { error: writeError } = await supabase
        .schema("batchflix")
        .from("media_items")
        .update({ season_stats: stats })
        .eq("id", row.id);

      if (writeError) {
        console.error(`  ERROR: ${writeError.message}`);
        errors++;
        continue;
      }

      const aired = stats.reduce((sum, s) => sum + s.aired_episodes, 0);
      console.log(`  ${stats.length} seasons, ${aired} aired episodes`);
      updated++;
    } catch (err) {
      console.error(`  ERROR: ${err instanceof Error ? err.message : String(err)}`);
      errors++;
    }
  }

  console.log(`\n--- Backfill Summary ---`);
  console.log(`Total TV shows: ${rows.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
