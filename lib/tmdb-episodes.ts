import { createAdminClient } from "@/lib/supabase/admin";

export async function markAllEpisodesWatched(
  userId: string,
  mediaId: string,
  tmdbId: number,
  watchedDate: string | null
): Promise<void> {
  console.log("[markAllEpisodesWatched] called", { userId, mediaId, tmdbId });
  const dateStr = watchedDate ?? new Date().toISOString().slice(0, 10);

  const showRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}`, {
    headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` },
  });
  if (!showRes.ok) return;

  const show = (await showRes.json()) as {
    seasons?: Array<{ season_number: number }>;
  };
  const seasons = (show.seasons ?? []).filter((s) => s.season_number > 0);
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
        episodes?: Array<{ episode_number: number }>;
      };
      const episodes = epData.episodes ?? [];
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
