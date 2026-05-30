import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mediaId = request.nextUrl.searchParams.get("mediaId");
  if (!mediaId) {
    return NextResponse.json({ error: "mediaId required" }, { status: 400 });
  }

  // Get all list_items for this media where the list belongs to the user
  const { data, error } = await supabase
    .schema("batchflix")
    .from("list_items")
    .select("list_id, lists!inner(user_id)")
    .eq("media_id", mediaId)
    .eq("lists.user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data ?? []).map((row) => ({ list_id: row.list_id }))
  );
}
