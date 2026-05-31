import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  userMediaId: z.string().uuid(),
  status: z.enum(["watched", "watching", "watchlist"]).optional(),
  rating: z.number().int().min(1).max(10).nullable().optional(),
  watchedDate: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  isFavorite: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
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

  const { userMediaId, status, rating, watchedDate, notes, isFavorite } =
    parsed.data;

  // Fetch current row to detect status change
  const { data: existing } = await supabase
    .schema("batchflix")
    .from("user_media")
    .select("status, media_id")
    .eq("id", userMediaId)
    .eq("user_id", user.id)
    .maybeSingle();

  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (rating !== undefined) updates.rating = rating;
  if (watchedDate !== undefined) updates.watched_date = watchedDate;
  if (notes !== undefined) updates.notes = notes;
  if (isFavorite !== undefined) updates.is_favorite = isFavorite;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .schema("batchflix")
    .from("user_media")
    .update(updates)
    .eq("id", userMediaId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const removedFromLists: string[] = [];

  // Enforce auto-remove rules when status changed
  if (
    status !== undefined &&
    existing?.status !== status &&
    existing?.media_id
  ) {
    const mediaId = existing.media_id as string;

    // Find all lists containing this media item
    const { data: listItems } = await supabase
      .schema("batchflix")
      .from("list_items")
      .select("list_id, id")
      .eq("media_id", mediaId);

    if (listItems && listItems.length > 0) {
      const listIds = listItems.map((li) => li.list_id as string);

      // Fetch those lists to check rules
      const { data: lists } = await supabase
        .schema("batchflix")
        .from("lists")
        .select("id, rules")
        .eq("user_id", user.id)
        .in("id", listIds);

      if (lists) {
        for (const list of lists) {
          const rules = (list.rules as Array<{ type: string; status?: string }> | null) ?? [];
          const matches = rules.some(
            (r) => r.type === "auto_remove_on_status" && r.status === status
          );
          if (matches) {
            await supabase
              .schema("batchflix")
              .from("list_items")
              .delete()
              .eq("list_id", list.id as string)
              .eq("media_id", mediaId);
            removedFromLists.push(list.id as string);
          }
        }
      }
    }
  }

  return NextResponse.json({ ...data, removedFromLists });
}
