import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserLists } from "@/lib/queries/lists";

const ruleSchema = z.object({
  type: z.string(),
  status: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  color: z.string().optional(),
  isPinned: z.boolean().optional(),
  rules: z.array(ruleSchema).optional(),
  parentListId: z.string().uuid().nullable().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const lists = await getUserLists(supabase, user.id);
    return NextResponse.json(lists);
  } catch {
    return NextResponse.json({ error: "Failed to fetch lists" }, { status: 500 });
  }
}

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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, color, isPinned, rules, parentListId } =
    parsed.data;

  // Validate parent list if provided
  if (parentListId) {
    const { data: parent } = await supabase
      .schema("batchflix")
      .from("lists")
      .select("id, parent_list_id")
      .eq("id", parentListId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!parent) {
      return NextResponse.json(
        { error: "Parent list not found" },
        { status: 400 }
      );
    }
    if ((parent as Record<string, unknown>).parent_list_id) {
      return NextResponse.json(
        { error: "Cannot nest sublists more than one level deep" },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .schema("batchflix")
    .from("lists")
    .insert({
      user_id: user.id,
      name,
      description: description ?? null,
      color: color ?? "#2563EB",
      is_pinned: isPinned ?? false,
      rules: rules ?? [],
      parent_list_id: parentListId ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
