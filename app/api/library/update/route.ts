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

  return NextResponse.json(data);
}
