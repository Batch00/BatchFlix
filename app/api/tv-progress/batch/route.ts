import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoUser, demoGuardResponse } from "@/lib/demo";
import { todayLocalDate } from "@/lib/tmdb-episodes";

const schema = z.object({
  mediaId: z.string().uuid(),
  seasonNumber: z.number().int().positive(),
  episodes: z.array(z.number().int().positive()),
  watched: z.boolean(),
  watchedDate: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isDemoUser(user.id)) return demoGuardResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { mediaId, seasonNumber, episodes, watched, watchedDate } = parsed.data;
  const now = new Date().toISOString();

  const rows = episodes.map((ep) => ({
    user_id: user.id,
    media_id: mediaId,
    season_number: seasonNumber,
    episode_number: ep,
    watched,
    watched_date: watchedDate ?? null,
    updated_at: now,
  }));

  const { error } = await supabase
    .schema("batchflix")
    .from("tv_progress")
    .upsert(rows, { onConflict: "user_id,media_id,season_number,episode_number" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-update show status based on tracked progress only.
  // Never compare against media_items.total_episodes -- new TMDB episodes shouldn't
  // affect status until the user interacts with them.
  const [{ data: allProgress }, { data: currentMedia }] = await Promise.all([
    supabase
      .schema("batchflix")
      .from("tv_progress")
      .select("watched")
      .eq("user_id", user.id)
      .eq("media_id", mediaId),
    supabase
      .schema("batchflix")
      .from("user_media")
      .select("status")
      .eq("user_id", user.id)
      .eq("media_id", mediaId)
      .maybeSingle(),
  ]);

  if (allProgress && allProgress.length > 0) {
    const totalTracked = allProgress.length;
    const watchedCount = allProgress.filter((r) => r.watched).length;
    const currentStatus = (currentMedia as { status?: string } | null)?.status;

    let newStatus: string | null = null;

    if (watchedCount === totalTracked) {
      newStatus = "watched";
    } else if (watchedCount > 0) {
      newStatus = "watching";
    }
    // watchedCount === 0: leave status alone, the user may have set it deliberately

    if (newStatus !== null && newStatus !== currentStatus) {
      // Finishing via progress refreshes the show's watched date. A date left
      // over from an earlier completion predates any season aired since, and
      // the detail page cleanup would read that season's rows as artifacts.
      const updates: Record<string, unknown> = { status: newStatus, updated_at: now };
      if (newStatus === "watched") updates.watched_date = watchedDate ?? todayLocalDate();
      await supabase
        .schema("batchflix")
        .from("user_media")
        .update(updates)
        .eq("user_id", user.id)
        .eq("media_id", mediaId);
    }
  }

  return NextResponse.json({ ok: true });
}
