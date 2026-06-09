import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getYearInReview } from "@/lib/queries/year-in-review";
import { YearInReviewClient } from "@/components/year-in-review/YearInReviewClient";
import { BackButton } from "@/components/ui/BackButton";

type Props = {
  params: Promise<{ year: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return { title: `${year} Year in Review` };
}

export default async function YearInReviewPage({ params }: Props) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  if (isNaN(year) || year < 2000 || year > 2100) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const data = await getYearInReview(supabase, user.id, year);

  if (data.totalItems === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg text-muted-foreground">
          No watch history for {year}
        </p>
        <Link href="/stats" className="text-sm text-[#2563EB] hover:underline">
          View Stats
        </Link>
      </div>
    );
  }

  return (
    <>
      <BackButton />
      <YearInReviewClient data={data} />
    </>
  );
}
