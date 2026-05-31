import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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

  for (let i = 0; i < listIds.length; i++) {
    await supabase
      .schema("batchflix")
      .from("lists")
      .update({ position: i })
      .eq("id", listIds[i])
      .eq("user_id", user.id);
  }

  return NextResponse.json({ success: true });
}
