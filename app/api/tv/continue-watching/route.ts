import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  mediaId: z.string().uuid(),
  tmdbId: z.number().int().positive(),
  seasons: z.array(z.number().int().positive()),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { mediaId, tmdbId, seasons } = parsed.data;

  if (seasons.length === 0) {
    return NextResponse.json({ success: true, message: "No seasons to update" });
  }

  const admin = createAdminClient();

  // Fetch and upsert episodes for each season
  await Promise.all(
    seasons.map(async (seasonNumber) => {
      const res = await fetch(
        `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}`,
        { headers: { Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}` } }
      );
      if (!res.ok) return;

      const data = (await res.json()) as {
        episodes?: Array<{ episode_number: number }>;
      };
      const episodes = data.episodes ?? [];
      if (episodes.length === 0) return;

      const rows = episodes.map((ep) => ({
        user_id: user.id,
        media_id: mediaId,
        season_number: seasonNumber,
        episode_number: ep.episode_number,
        watched: false,
        watched_date: null,
        updated_at: new Date().toISOString(),
      }));

      // ON CONFLICT DO NOTHING -- never overwrites existing watched episodes
      await admin
        .schema("batchflix")
        .from("tv_progress")
        .upsert(rows, {
          onConflict: "user_id,media_id,season_number,episode_number",
          ignoreDuplicates: true,
        });
    })
  );

  // Set status to 'watching'
  await supabase
    .schema("batchflix")
    .from("user_media")
    .update({ status: "watching" })
    .eq("user_id", user.id)
    .eq("media_id", mediaId);

  return NextResponse.json({ success: true, message: "Season tracking updated" });
}
