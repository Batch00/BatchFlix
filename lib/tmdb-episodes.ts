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
