import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoUser, demoGuardResponse } from "@/lib/demo";

type Params = Promise<{ id: string }>;

const schema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    })
  ),
});

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isDemoUser(user.id)) return demoGuardResponse();

  const { data: list } = await supabase
    .schema("batchflix")
    .from("lists")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Reordering a large list used to issue one UPDATE per item in series --
  // 400 sequential round trips for a 400 item list. Read the rows once, then
  // write every new position in a single upsert.
  const positions = new Map(parsed.data.items.map((i) => [i.id, i.position]));

  const { data: existing, error: readError } = await supabase
    .schema("batchflix")
    .from("list_items")
    .select("id, list_id, media_id")
    .eq("list_id", id)
    .in("id", [...positions.keys()]);

  if (readError) {
    return NextResponse.json({ error: "Failed to read list items" }, { status: 500 });
  }

  const rows = (existing ?? []).map((row) => ({
    id: row.id as string,
    list_id: row.list_id as string,
    media_id: row.media_id as string,
    position: positions.get(row.id as string) ?? 0,
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .schema("batchflix")
      .from("list_items")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      return NextResponse.json({ error: "Failed to update positions" }, { status: 500 });
    }
  }

  revalidatePath(`/lists/${id}`);
  return NextResponse.json({ success: true });
}
