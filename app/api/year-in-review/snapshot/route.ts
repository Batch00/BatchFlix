import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoUser, demoGuardResponse } from "@/lib/demo";
import { getYearInReview } from "@/lib/queries/year-in-review";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function baseSlug(email: string, year: number): string {
  const username = email
    .split("@")[0]
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
  return `${username}-${year}`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = parseInt(
    request.nextUrl.searchParams.get("year") ?? "",
    10
  );
  if (isNaN(year))
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });

  const { data } = await supabase
    .schema("batchflix")
    .from("year_in_review_snapshots")
    .select("slug")
    .eq("user_id", user.id)
    .eq("year", year)
    .maybeSingle();

  if (data) {
    return NextResponse.json({
      exists: true,
      slug: (data as { slug: string }).slug,
      url: `${APP_URL}/share/year-in-review/${(data as { slug: string }).slug}`,
    });
  }

  return NextResponse.json({ exists: false });
}

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

  const year = (body as { year?: number }).year;
  if (!year || isNaN(year) || year < 2000 || year > 2100)
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });

  let slug = baseSlug(user.email ?? user.id, year);

  // If slug is taken by a different user, add a short random suffix
  const { data: conflict } = await supabase
    .schema("batchflix")
    .from("year_in_review_snapshots")
    .select("user_id")
    .eq("slug", slug)
    .maybeSingle();

  if (conflict && (conflict as { user_id: string }).user_id !== user.id) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const yearData = await getYearInReview(supabase, user.id, year);

  const { error } = await supabase
    .schema("batchflix")
    .from("year_in_review_snapshots")
    .upsert(
      {
        user_id: user.id,
        year,
        slug,
        data: yearData as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,year" }
    );

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    slug,
    url: `${APP_URL}/share/year-in-review/${slug}`,
  });
}
