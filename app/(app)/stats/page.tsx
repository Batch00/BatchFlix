import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStatsData, parseTimeRange } from "@/lib/queries/stats";
import { getWatchedYears } from "@/lib/queries/year-in-review";
import { TimeRangeSelector } from "@/components/stats/TimeRangeSelector";
import { StatsPageClient } from "@/components/stats/StatsPageClient";
import { StatsSkeleton } from "@/components/skeletons/StatsSkeleton";

export const metadata: Metadata = { title: "Stats" };

type SearchParams = Promise<{ range?: string }>;

function getRangeLabel(rangeKey: string): string {
  if (rangeKey === "lifetime") return "All Time";
  if (rangeKey === "last12") return "Last 12 Months";
  return rangeKey;
}

async function StatsData({
  userId,
  rangeKey,
}: {
  userId: string;
  rangeKey: string;
}) {
  const supabase = await createClient();
  const range = parseTimeRange(rangeKey === "lifetime" ? undefined : rangeKey);
  const stats = await getStatsData(supabase, userId, range);
  const rangeLabel = getRangeLabel(rangeKey);

  return (
    <StatsPageClient stats={stats} range={range} rangeLabel={rangeLabel} />
  );
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { range: rawRange } = await searchParams;
  const rangeKey = rawRange ?? "lifetime";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const watchedYears = await getWatchedYears(supabase, user.id);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-0 pb-8 md:px-6">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-foreground">Stats</h1>
        <TimeRangeSelector current={rangeKey} />

        {watchedYears.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-[#2563EB]" />
              Year in Review:
            </div>
            {watchedYears.map((y) => (
              <Link
                key={y}
                href={`/year-in-review/${y}`}
                className="rounded-full border border-[#1f1f1f] px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-[#2563EB]/60 hover:text-white"
              >
                {y}
              </Link>
            ))}
          </div>
        )}

        <Suspense fallback={<StatsSkeleton />}>
          <StatsData userId={user.id} rangeKey={rangeKey} />
        </Suspense>
      </div>
    </div>
  );
}
