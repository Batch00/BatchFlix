import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoUser, demoGuardResponse } from "@/lib/demo";

const schema = z.object({
  listIds: z.array(z.string().uuid()),
});

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isDemoUser(user.id)) return demoGuardResponse();

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

  const { listIds } = parsed.data;

  // One UPDATE per list, but issued concurrently rather than in series. A
  // single upsert would need every NOT NULL column of lists round-tripped,
  // which risks clobbering concurrent edits for no real gain at this row count.
  const results = await Promise.all(
    listIds.map((listId, i) =>
      supabase
        .schema("batchflix")
        .from("lists")
        .update({ position: i })
        .eq("id", listId)
        .eq("user_id", user.id)
    )
  );

  if (results.some((r) => r.error)) {
    return NextResponse.json({ error: "Failed to update positions" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
