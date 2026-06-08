import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { YearInReviewCard } from "@/components/year-in-review/YearInReviewCard";
import type { YearInReview } from "@/lib/queries/year-in-review";

type Props = { params: Promise<{ slug: string }> };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type SnapshotRow = { data: YearInReview; year: number } | null;

async function getSnapshot(slug: string): Promise<SnapshotRow> {
  const { data } = await anonClient()
    .schema("batchflix")
    .from("year_in_review_snapshots")
    .select("data, year")
    .eq("slug", slug)
    .maybeSingle();

  return data as SnapshotRow;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const snapshot = await getSnapshot(slug);
  if (!snapshot) return { title: "Year in Review | BatchFlix" };

  const d = snapshot.data;
  return {
    title: `${d.year} Year in Review on BatchFlix`,
    description: `${d.totalItems} films and shows watched in ${d.year}. ${d.totalHours} hours. Top genre: ${d.topGenre ?? "N/A"}.`,
    openGraph: {
      title: `My ${d.year} in Film on BatchFlix`,
      description: `${d.totalItems} films and shows. ${d.totalHours} hours. Top genre: ${d.topGenre ?? "N/A"}.`,
      images: [{ url: `${APP_URL}/share/year-in-review/${slug}/og` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `My ${d.year} in Film on BatchFlix`,
      description: `${d.totalItems} films and shows. ${d.totalHours} hours.`,
      images: [`${APP_URL}/share/year-in-review/${slug}/og`],
    },
  };
}

export default async function PublicYearInReviewPage({ params }: Props) {
  const { slug } = await params;
  const snapshot = await getSnapshot(slug);

  if (!snapshot) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0a0a] p-8 text-center">
        <p className="text-lg text-white">
          This year-in-review is not available.
        </p>
        <Link
          href="https://batchflix.batch-apps.com"
          className="text-sm text-[#2563EB] hover:underline"
        >
          batchflix.batch-apps.com
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-12">
      <YearInReviewCard data={snapshot.data} />

      <div className="mx-auto mt-8 flex max-w-2xl flex-col items-center gap-3">
        <Link
          href="https://batchflix.batch-apps.com"
          className="rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Track your own watchlist
        </Link>
        <p className="text-xs text-muted-foreground">
          Made with{" "}
          <Link
            href="https://batchflix.batch-apps.com"
            className="text-[#2563EB] hover:underline"
          >
            BatchFlix
          </Link>
        </p>
      </div>
    </div>
  );
}
