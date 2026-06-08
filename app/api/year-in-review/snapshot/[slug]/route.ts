import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { slug: string };

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .schema("batchflix")
    .from("year_in_review_snapshots")
    .delete()
    .eq("slug", slug)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
