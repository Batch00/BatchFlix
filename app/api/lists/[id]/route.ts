import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getListById } from "@/lib/queries/lists";

type Params = Promise<{ id: string }>;

const patchSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().nullable().optional(),
  color: z.string().optional(),
  isPinned: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await getListById(supabase, id, user.id);
    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(list);
  } catch {
    return NextResponse.json({ error: "Failed to fetch list" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, color, isPinned } = parsed.data;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (color !== undefined) updates.color = color;
  if (isPinned !== undefined) updates.is_pinned = isPinned;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .schema("batchflix")
    .from("lists")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: list } = await supabase
    .schema("batchflix")
    .from("lists")
    .select("name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (list.name === "Favorites") {
    return NextResponse.json(
      { error: "Cannot delete your Favorites list" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .schema("batchflix")
    .from("lists")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
