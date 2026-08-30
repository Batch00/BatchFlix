import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildSeasonStats,
  todayLocalDate,
  type SeasonStat,
} from "@/lib/tmdb-episodes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** How far either side of today a season air date counts as recently changed. */
const WINDOW_DAYS = 7;

/** Milliseconds between shows, so a long candidate list stays inside TMDB limits. */
const TMDB_DELAY_MS = 300;

/** Local YYYY-MM-DD, offset by whole days, comparable against TMDB air dates. */
function localDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Candidate = {
  id: string;
  tmdb_id: number;
  title: string;
  season_stats: SeasonStat[] | null;
};

/**
 * A season worth re-reading tonight. Either it changed state around now, or it
 * is part way through a weekly release and gains episodes every week, which
 * keeps it a candidate until it finishes.
 *
 * A season with no stored episode_count predates the field. That is unknown,
 * not zero, so it fails the mid-flight test rather than asserting the season is
 * complete. It picks the field up the next time anything refreshes the show.
 */
function needsRefresh(
  season: SeasonStat,
  today: string,
  windowStart: string,
  windowEnd: string
): boolean {
  if (!season.air_date) return false;
  if (season.air_date >= windowStart && season.air_date <= windowEnd) {
    return true;
  }
  if (season.episode_count === undefined) return false;
  return season.air_date <= today && season.aired_episodes < season.episode_count;
}

/**
 * season_stats is written when a media detail page loads, so a show nobody has
 * opened since its new season aired still describes the pre-air state and the
 * library sees no new episodes. This refreshes the shows that could plausibly
 * have changed state: one whose next season is months out has nothing to update.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = todayLocalDate();
  const windowStart = localDate(-WINDOW_DAYS);
  const windowEnd = localDate(WINDOW_DAYS);

  const { data, error } = await admin
    .schema("batchflix")
    .from("media_items")
    .select("id, tmdb_id, title, season_stats")
    .eq("media_type", "tv")
    .not("season_stats", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The season test cannot be pushed into PostgREST: it inspects each element
  // of a jsonb array, which needs a SQL function. The preceding filters keep
  // the set small enough to finish the job here.
  const candidates = ((data ?? []) as Candidate[]).filter((row) =>
    (row.season_stats ?? []).some((s) =>
      needsRefresh(s, today, windowStart, windowEnd)
    )
  );

  let refreshed = 0;
  let skipped = 0;
  const errors: Array<{ title: string; reason: string }> = [];

  for (const [i, show] of candidates.entries()) {
    if (i > 0) await sleep(TMDB_DELAY_MS);

    try {
      // no-store rather than the usual revalidate: a job that exists to notice
      // a change must not be served the response from before that change.
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/${show.tmdb_id}`,
        {
          headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` },
          cache: "no-store",
        }
      );
      if (!res.ok) {
        errors.push({ title: show.title, reason: `TMDB ${res.status}` });
        continue;
      }

      const detail = (await res.json()) as {
        seasons?: Array<{
          season_number: number;
          air_date: string | null;
          episode_count: number;
        }>;
      };
      const stats = await buildSeasonStats(
        show.tmdb_id,
        detail.seasons ?? [],
        today
      );

      if (JSON.stringify(stats) === JSON.stringify(show.season_stats)) {
        skipped += 1;
        continue;
      }

      const { error: writeError } = await admin
        .schema("batchflix")
        .from("media_items")
        .update({ season_stats: stats })
        .eq("id", show.id);

      if (writeError) {
        errors.push({ title: show.title, reason: writeError.message });
        continue;
      }
      refreshed += 1;
    } catch (e) {
      errors.push({
        title: show.title,
        reason: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    window: { start: windowStart, end: windowEnd },
    candidates: candidates.length,
    refreshed,
    skipped,
    errors: errors.length,
    errorDetail: errors,
  });
}
