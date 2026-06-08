import { createClient } from "@/lib/supabase/server";
import { getYearInReview } from "@/lib/queries/year-in-review";
import { buildYearInReviewImage } from "@/lib/year-in-review-image";

export const runtime = "nodejs";

type Params = { year: string };

export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  if (isNaN(year) || year < 2000 || year > 2100) {
    return new Response("Invalid year", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const data = await getYearInReview(supabase, user.id, year);

  if (data.totalItems === 0) {
    return new Response("No data for this year", { status: 404 });
  }

  return buildYearInReviewImage(data);
}
