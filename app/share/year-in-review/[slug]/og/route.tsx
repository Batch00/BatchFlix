import { createClient } from "@supabase/supabase-js";
import { buildYearInReviewImage } from "@/lib/year-in-review-image";
import type { YearInReview } from "@/lib/queries/year-in-review";

export const runtime = "nodejs";

type Params = { slug: string };

export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: snapshot } = await supabase
    .schema("batchflix")
    .from("year_in_review_snapshots")
    .select("data")
    .eq("slug", slug)
    .maybeSingle();

  if (!snapshot) {
    return new Response("Not found", { status: 404 });
  }

  const data = (snapshot as { data: YearInReview }).data;
  return buildYearInReviewImage(data);
}
